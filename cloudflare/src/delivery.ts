import type { Edition } from "./weekly";
import { ProbeError, type Brief, type Source } from "./domain";
import { readBounded } from "./network";

function plain(value: string, length: number) {
  const escaped = value.replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|[\uFE0F\u200D\u20E3]/gu, "").replace(/[\\`*_\[\]<>]/g,"\\$&");
  if (escaped.length <= length) return escaped;
  return escaped.slice(0,length-1).replace(/\\$/, "") + "…";
}
export function editionLabel(week: string): string {
  const match = /^(20\d{2})-W(\d{2})$/.exec(week);
  if (!match) throw new ProbeError("invalid_weekly_metadata");
  const jan1 = new Date(Date.UTC(Number(match[1]),0,1));
  const end = new Date(jan1.getTime() + ((Number(match[2])-1)*7 + 6-jan1.getUTCDay())*86400000);
  if (Number(match[2]) < 1 || end.getUTCFullYear() !== Number(match[1])) throw new ProbeError("invalid_weekly_metadata");
  return `${end.getUTCMonth()+1}월 ${Math.ceil(end.getUTCDate()/7)}주차 AI 뉴스`;
}
export async function renderEdition(db: D1Database, edition: Edition) {
  const embeds = [];
  const label = editionLabel(edition.week);
  for (const paper of edition.papers) {
    const job=await db.prepare("SELECT status FROM probe_jobs WHERE id=?").bind(paper.job_id).first<{status:string}>();
    if(!job || !["complete","blocked","dispatch_unknown"].includes(job.status)) throw new ProbeError("edition_not_ready");
    let brief: Brief | undefined;
    let source: Source | undefined;
    if(job.status === "complete") {
      const call=await db.prepare("SELECT result_json FROM probe_calls WHERE job_id=? AND paper_id=? AND status='complete'").bind(paper.job_id,paper.paper_id).first<{result_json:string}>();
      const row=await db.prepare("SELECT source_json FROM probe_sources WHERE job_id=? AND paper_id=?").bind(paper.job_id,paper.paper_id).first<{source_json:string}>();
      if(!call || !row)throw new ProbeError("edition_not_ready");
      const result=JSON.parse(call.result_json) as {brief:Brief;validation_error:string|null};
      source=JSON.parse(row.source_json) as Source;
      if(!result.brief || result.validation_error)throw new ProbeError("edition_not_ready");
      brief=result.brief;
    }
    const missing = "요약을 준비하지 못했습니다. 출처에서 원문을 확인해 주세요.";
    const fields = brief?.schema_version === 3 ? [
      {name:"세 줄 요약",value:plain(brief.summary,220),inline:false},
      {name:"배경과 기존 방식",value:plain(brief.background!,230),inline:false},
      {name:"핵심 방법",value:plain(brief.claims.map(c=>c.text).join("\n\n"),610),inline:false},
      ...(brief.results?.length ? [{name:"실험 결과",value:plain(brief.results.map(c=>c.text).join("\n\n"),370),inline:false}] : []),
      {name:"이 논문의 핵심 개념",value:plain(brief.prerequisites!.map(p=>`• ${p.term}: ${p.explanation}`).join("\n"),360),inline:false},
      ...(brief.limitations.trim() ? [{name:"연구의 한계",value:plain(brief.limitations,150),inline:false}] : []),
      {name:"출처",value:`[논문 원문](https://arxiv.org/abs/${paper.paper_id}) · [Hugging Face](${paper.hf_url})`,inline:false},
    ] : [
      {name:"한줄 소개",value:plain(brief?.summary ?? missing,120),inline:false},
      {name:"핵심 아이디어",value:plain(brief?.claims.map(c=>`• ${c.text}`).join("\n") ?? missing,380),inline:false},
      {name:"기존 방법과의 차이",value:plain(brief?.differences?.length ? brief.differences.map(c=>`• ${c.text}`).join("\n") : brief?.schema_version === 2 ? "수집한 자료에서 비교 근거를 확인하지 못했습니다." : brief ? "기존 저장 결과에는 비교 설명이 없습니다." : missing,260),inline:false},
      {name:"입문자 사전 개념",value:plain(brief?.prerequisites?.map(p=>`• ${p.term}: ${p.explanation}`).join("\n") ?? (brief ? "기존 저장 결과에는 사전 개념 설명이 없습니다." : missing),440),inline:false},
      {name:"한계",value:plain(brief?.limitations ?? "요약 생성에 실패하여 한계를 확인하지 못했습니다.",250),inline:false},
      {name:"출처",value:`[논문 원문](https://arxiv.org/abs/${paper.paper_id}) · [Hugging Face](${paper.hf_url})`,inline:false},
    ];
    const prefix = `${label}: ${paper.rank}위 · `;
    embeds.push({title:prefix+plain(paper.title,256-prefix.length),url:paper.hf_url,fields});
  }
  const payload={embeds,allowed_mentions:{parse:[]}};
  const count=embeds.reduce((n,e)=>n+e.title.length+e.fields.reduce((m,f)=>m+f.name.length+f.value.length,0),0);
  if(count>6000 || embeds.some(e=>e.title.length>256 || e.fields.some(f=>f.value.length>1024 || !f.value)))throw new ProbeError("discord_payload_too_large");
  return payload;
}
export function webhookUrl(value: string) {
  const url=new URL(value);
  if(url.protocol!=="https:" || url.hostname!=="discord.com" || !/^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname) || url.username || url.password || url.hash || url.search)throw new ProbeError("invalid_webhook");
  url.searchParams.set("wait","true");
  return url;
}
export async function deliverEdition(db:D1Database,edition:Edition,webhook:string,prepared?:Awaited<ReturnType<typeof renderEdition>>) {
  const url=webhookUrl(webhook);
  const existing=await db.prepare("SELECT status,message_id FROM weekly_deliveries WHERE week=?").bind(edition.week).first();
  if(existing)return {duplicate:true,...existing};
  const payload=prepared ?? await renderEdition(db,edition);
  const reserved=await db.prepare("INSERT OR IGNORE INTO weekly_deliveries(week,status,payload_json) VALUES(?,'in_flight',?)").bind(edition.week,JSON.stringify(payload)).run();
  if(reserved.meta.changes!==1)return {duplicate:true,status:"reserved"};
  try {
    const response=await fetch(url.toString(),{method:"POST",redirect:"manual",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
    if(!response.ok){await response.body?.cancel();throw new ProbeError(`discord_http_${response.status}`);}
    const message=JSON.parse(new TextDecoder().decode(await readBounded(response,64000))) as {id:string;channel_id:string};
    if(!/^\d+$/.test(message.id) || !/^\d+$/.test(message.channel_id))throw new ProbeError("discord_result_unknown");
    await db.prepare("UPDATE weekly_deliveries SET status='sent',message_id=?,channel_id=? WHERE week=?").bind(message.id,message.channel_id,edition.week).run();
    return {status:"sent",message_id:message.id};
  } catch {
    // A lost response or DB write does not prove that Discord rejected the message.
    await db.prepare("UPDATE weekly_deliveries SET status='unknown',error_code='discord_result_unknown' WHERE week=?").bind(edition.week).run();
    throw new ProbeError("discord_result_unknown");
  }
}
