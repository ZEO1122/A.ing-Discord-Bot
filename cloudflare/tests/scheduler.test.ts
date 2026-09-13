import { env } from "cloudflare:workers";
import { applyD1Migrations,introspectWorkflowInstance } from "cloudflare:test";
import {beforeAll,beforeEach,afterEach,expect,it,vi} from "vitest";
import {startWeekly} from "../src/scheduler";
import worker,{type Env} from "../src/index";
const bindings=env as unknown as Env & {TEST_MIGRATIONS:Parameters<typeof applyD1Migrations>[1]};
const week="2026-W30";
beforeAll(async()=>applyD1Migrations(bindings.DB,bindings.TEST_MIGRATIONS));
beforeEach(async()=>{
 const papers=[1,2,3].map(rank=>({rank,job_id:`scheduler-${rank}`,paper_id:`2609.1000${rank}`,title:"Fixture",hf_url:`https://huggingface.co/papers/2609.1000${rank}`,upvotes:10}));
 const edition={week,model:bindings.OPENAI_MODEL,fetched_at:"2026-09-13T00:00:00Z",papers,ranking_url:`https://huggingface.co/papers/week/${week}`,api_url:"https://huggingface.co/api/daily_papers"};
 await bindings.DB.prepare("INSERT INTO weekly_editions(week,snapshot_json) VALUES(?,?)").bind(week,JSON.stringify(edition)).run();
 for(const p of papers)await bindings.DB.prepare("INSERT INTO probe_jobs(id,request_json,status) VALUES(?,'{}','blocked')").bind(p.job_id).run();
});
afterEach(async()=>{vi.unstubAllGlobals();await bindings.DB.exec("DELETE FROM weekly_deliveries;DELETE FROM weekly_runs;DELETE FROM weekly_editions;DELETE FROM probe_jobs;");});
it("runs the real weekly Workflow and posts terminal failures in their original ranks",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({id:"123456",channel_id:"987654"})));
 await using instance=await introspectWorkflowInstance(bindings.WEEKLY!,`weekly-${week}`);
 await startWeekly(bindings,week);
 await instance.waitForStatus("complete");
 expect(await bindings.DB.prepare("SELECT status FROM weekly_runs WHERE week=?").bind(week).first()).toEqual({status:"complete"});
 expect(await startWeekly(bindings,week)).toEqual({week,duplicate:true});
 expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not mark a weekly run complete when previous delivery is uncertain",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("must not send");}));
 await bindings.DB.prepare("INSERT INTO weekly_deliveries(week,status,payload_json) VALUES(?,'unknown','{}')").bind(week).run();
 await using instance=await introspectWorkflowInstance(bindings.WEEKLY!,`weekly-${week}`);
 await startWeekly(bindings,week);
 await instance.waitForStatus("errored");
 expect(await bindings.DB.prepare("SELECT status,error_code FROM weekly_runs WHERE week=?").bind(week).first()).toEqual({status:"blocked",error_code:"discord_result_unknown"});
 expect(fetch).not.toHaveBeenCalled();
});
it("keeps scheduled triggers inert until explicitly enabled",async()=>{
 await worker.scheduled({scheduledTime:Date.now()} as ScheduledController,{...bindings,SCHEDULE_ENABLED:"false"});
 expect((await bindings.DB.prepare("SELECT COUNT(*) n FROM weekly_runs").first())?.n).toBe(0);
});
