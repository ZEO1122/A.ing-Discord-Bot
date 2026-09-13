import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { captureEdition, generateEdition, editionStatus } from "./weekly";
import { deliverEdition, renderEdition } from "./delivery";
import { errorCode, ProbeError } from "./domain";
import type {Env} from "./index";
export async function startWeekly(env:Env,week:string) {
  if(env.LIVE_ENABLED!=="true" || !env.WEEKLY)throw new ProbeError("live_disabled");
  const reserved=await env.DB.prepare("INSERT OR IGNORE INTO weekly_runs(week,status) VALUES(?,'queued')").bind(week).run();
  if(reserved.meta.changes!==1)return {week,duplicate:true};
  try {await env.WEEKLY.create({id:`weekly-${week}`,params:{week}});}
  catch {await env.DB.prepare("UPDATE weekly_runs SET status='dispatch_unknown',error_code='dispatch_unknown' WHERE week=?").bind(week).run();throw new ProbeError("dispatch_unknown");}
  return {week,duplicate:false};
}
export class WeeklyPipeline extends WorkflowEntrypoint<Env,{week:string}> {
  async run(event:WorkflowEvent<{week:string}>,step:WorkflowStep) {
    const week=event.payload.week;
    try {
      await step.do("start",async()=>{await this.env.DB.prepare("UPDATE weekly_runs SET status='running' WHERE week=?").bind(week).run();});
      const edition=await step.do("capture",{retries:{limit:2,delay:"10 seconds",backoff:"exponential"}},()=>captureEdition(this.env.DB,week,this.env.OPENAI_MODEL));
      await step.do("dispatch-papers",()=>generateEdition(this.env,edition));
      let ready=false;
      for(let attempt=0;attempt<60;attempt++) {
        ready=await step.do(`check-${attempt}`,async()=>{
          const status=await editionStatus(this.env.DB,edition);
          return status.papers.every(p=>["complete","blocked","dispatch_unknown"].includes(String(p.job.status)));
        });
        if(ready)break;
        await step.sleep(`wait-${attempt}`,"10 seconds");
      }
      if(!ready)throw new ProbeError("edition_not_ready");
      if(this.env.DELIVERY_ENABLED!=="true" || !this.env.DISCORD_WEBHOOK_URL)throw new ProbeError("delivery_disabled");
      const payload=await step.do("render",()=>renderEdition(this.env.DB,edition));
      await step.do("publish",{retries:{limit:0,delay:"1 second"}},async()=>{const result=await deliverEdition(this.env.DB,edition,this.env.DISCORD_WEBHOOK_URL!,payload);if(result.status!=="sent")throw new ProbeError("discord_result_unknown");return {status:"sent"};});
      await step.do("complete",async()=>{await this.env.DB.prepare("UPDATE weekly_runs SET status='complete' WHERE week=?").bind(week).run();});
    } catch(error) {
      const code=errorCode(error);
      await step.do("record-failure",async()=>{await this.env.DB.prepare("UPDATE weekly_runs SET status='blocked',error_code=? WHERE week=?").bind(code,week).run();});
      throw new NonRetryableError(code);
    }
  }
}
