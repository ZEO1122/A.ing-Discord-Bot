import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { beforeAll, beforeEach, afterEach, expect, it, vi } from "vitest";
import { deliverEdition, renderEdition, webhookUrl, editionLabel } from "../src/delivery";
import type {Edition} from "../src/weekly";
import type {Env} from "../src/index";
const bindings=env as unknown as Env & {TEST_MIGRATIONS:Parameters<typeof applyD1Migrations>[1]};
const edition:Edition={week:"2026-W37",fetched_at:"2026-09-13T00:00:00Z",model:"fixture",ranking_url:"https://huggingface.co/papers/week/2026-W37",api_url:"https://huggingface.co/api/daily_papers",papers:[1,2,3].map(rank=>({rank,paper_id:`2609.1000${rank}`,title:`Paper ${rank}`,upvotes:10,job_id:`job-${rank}`,hf_url:`https://huggingface.co/papers/2609.1000${rank}`}))};
const webhook="https://discord.com/api/webhooks/123/test_only_no_real_secret";
beforeAll(async()=>applyD1Migrations(bindings.DB,bindings.TEST_MIGRATIONS));
beforeEach(async()=>{
 await bindings.DB.prepare("INSERT INTO weekly_editions(week,snapshot_json) VALUES(?,?)").bind(edition.week,JSON.stringify(edition)).run();
 for(const p of edition.papers)await bindings.DB.prepare("INSERT INTO probe_jobs(id,request_json,status) VALUES(?,'{}','blocked')").bind(p.job_id).run();
});
afterEach(async()=>{vi.unstubAllGlobals();await bindings.DB.exec("DELETE FROM weekly_deliveries; DELETE FROM weekly_editions; DELETE FROM probe_calls; DELETE FROM probe_sources; DELETE FROM probe_jobs;");});
it("preserves all ranks when summaries fail and disables mentions",async()=>{
 const payload=await renderEdition(bindings.DB,edition);
 expect(payload.embeds.map(e=>e.title)).toEqual([1,2,3].map(rank=>`9월 2주차 AI 뉴스: ${rank}위 · Paper ${rank}`));
 expect(payload).not.toHaveProperty("content");
 expect(payload.embeds[0].fields.map(f=>f.name)).toEqual(["한줄 소개","핵심 아이디어","기존 방법과의 차이","입문자 사전 개념","한계","출처"]);
 expect(payload.embeds[0].fields.every(f=>f.inline===false)).toBe(true);
 expect(payload.allowed_mentions.parse).toEqual([]);
});
it("does not publish while a paper is running",async()=>{
 await bindings.DB.prepare("UPDATE probe_jobs SET status='running' WHERE id='job-2'").run();
 await expect(renderEdition(bindings.DB,edition)).rejects.toThrow("edition_not_ready");
});
it("stores Discord message mapping and prevents concurrent duplicate sending",async()=>{
 const send=vi.fn(async()=>Response.json({id:"123456",channel_id:"654321"}));vi.stubGlobal("fetch",send);
 await Promise.all([deliverEdition(bindings.DB,edition,webhook),deliverEdition(bindings.DB,edition,webhook)]);
 expect(send).toHaveBeenCalledTimes(1);
 expect(send.mock.calls[0][0]).toContain("wait=true");
 expect(await bindings.DB.prepare("SELECT status,message_id,channel_id FROM weekly_deliveries").first()).toEqual({status:"sent",message_id:"123456",channel_id:"654321"});
});
it("never automatically resends after an uncertain response",async()=>{
 const send=vi.fn(async()=>{throw new Error("network lost");});vi.stubGlobal("fetch",send);
 await expect(deliverEdition(bindings.DB,edition,webhook)).rejects.toThrow("discord_result_unknown");
 expect(await deliverEdition(bindings.DB,edition,webhook)).toMatchObject({duplicate:true,status:"unknown"});
 expect(send).toHaveBeenCalledTimes(1);
});
it("rejects lookalike webhook hosts",()=>{
 expect(()=>webhookUrl("https://discord.com.attacker.test/api/webhooks/123/token")).toThrow("invalid_webhook");
});

it("labels the closing date of HF weeks across month and year boundaries",()=>{
 expect(editionLabel("2026-W37")).toBe("9월 2주차 AI 뉴스");
 expect(editionLabel("2025-W01")).toBe("1월 1주차 AI 뉴스");
 expect(editionLabel("2026-W36")).toBe("9월 1주차 AI 뉴스");
});

it("renders current and legacy stored summaries without inventing missing concepts",async()=>{
 for (const paper of edition.papers) {
  await bindings.DB.prepare("UPDATE probe_jobs SET status='complete' WHERE id=?").bind(paper.job_id).run();
  const brief={summary:"문제를 쉽게 소개합니다.",claims:[{text:"핵심 방법입니다."}],limitations:"추가 평가가 필요합니다.",...(paper.rank===1 ? {schema_version:2,differences:[{text:"기존 방식과 비교합니다."}],prerequisites:[{term:"학습",explanation:"예시에서 규칙을 찾는 과정"}]} : {})};
  await bindings.DB.prepare("INSERT INTO probe_calls(job_id,paper_id,status,result_json) VALUES(?,?,'complete',?)").bind(paper.job_id,paper.paper_id,JSON.stringify({brief,validation_error:null})).run();
  await bindings.DB.prepare("INSERT INTO probe_sources(job_id,paper_id,source_json) VALUES(?,?,?)").bind(paper.job_id,paper.paper_id,JSON.stringify({coverage:paper.rank===1 ? "body_excerpt" : "abstract"})).run();
 }
 const payload=await renderEdition(bindings.DB,edition);
 expect(payload.embeds[0].fields[2].value).toContain("기존 방식과 비교합니다.");
 expect(payload.embeds[0].fields[3].value).toContain("학습: 예시에서 규칙을 찾는 과정");
 expect(payload.embeds[1].fields[3].value).toContain("기존 저장 결과");
 expect(payload.embeds[1].fields[5].value).not.toContain("초록");
 expect(payload.embeds[1].fields[5].value).not.toContain("발췌");
 expect(payload.embeds[0]).not.toHaveProperty("footer");
});
it("bounds escaped long titles and total fields for all three embeds",async()=>{
 const payload=await renderEdition(bindings.DB,{...edition,papers:edition.papers.map(p=>({...p,title:"*".repeat(1000)}))});
 expect(payload.embeds.every(e=>e.title.length<=256 && e.title.endsWith("…"))).toBe(true);
});

it("renders longer explanations without coverage notices or invented limitation placeholders",async()=>{
 const paper=edition.papers[0];
 await bindings.DB.prepare("UPDATE probe_jobs SET status='complete' WHERE id=?").bind(paper.job_id).run();
 const brief={schema_version:3,summary:"문제입니다.\n방법입니다.\n의미입니다.",background:"배경을 설명합니다.",claims:[{text:"작동 과정을 설명합니다."}],results:[],prerequisites:[{term:"학습",explanation:"예시에서 규칙을 찾습니다."}],limitations:""};
 await bindings.DB.prepare("INSERT INTO probe_calls(job_id,paper_id,status,result_json) VALUES(?,?,'complete',?)").bind(paper.job_id,paper.paper_id,JSON.stringify({brief,validation_error:null})).run();
 await bindings.DB.prepare("INSERT INTO probe_sources(job_id,paper_id,source_json) VALUES(?,?,?)").bind(paper.job_id,paper.paper_id,JSON.stringify({coverage:"abstract"})).run();
 const payload=await renderEdition(bindings.DB,edition);
 expect(payload.embeds[0].fields.map(f=>f.name)).toEqual(["세 줄 요약","배경과 기존 방식","핵심 방법","이 논문의 핵심 개념","출처"]);
 expect(JSON.stringify(payload)).not.toMatch(/초록 기반|본문 발췌 기반/);
});

it("removes generated emoji while preserving English AI terminology",async()=>{
 const payload=await renderEdition(bindings.DB,{...edition,papers:edition.papers.map(p=>({...p,title:"🚀 World Model"}))});
 expect(payload.embeds[0].title).toContain("World Model");
 expect(JSON.stringify(payload)).not.toMatch(/\p{Extended_Pictographic}/u);
});
