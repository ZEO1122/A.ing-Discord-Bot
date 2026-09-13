import compiled from './generated/concepts.json';
import {webhookUrl} from './delivery';
import {readBounded} from './network';

interface Payload { embeds: {title:string;fields:{name:string;value:string;inline:boolean}[]}[]; allowed_mentions:{parse:string[]} }
export interface ConceptLesson {id:string;order:number;version:number;status:string;hash:string;payload:Payload}
interface Bundle {release_hash:string;production_ready:boolean;curriculum_version:number;lessons:ConceptLesson[]}
export const conceptBundle = compiled as Bundle;
export interface ConceptEnv {
  DB:D1Database;
  CONCEPT_TEST_ENABLED?:string;
  CONCEPT_SCHEDULE_ENABLED?:string;
  CONCEPT_WEBHOOK_URL?:string;
  DISCORD_WEBHOOK_URL?:string;
}
export async function sendConcept(db:D1Database,key:string,lesson:ConceptLesson,webhook:string){
  const destination=webhookUrl(webhook);
  const previous=await db.prepare('SELECT status,message_id,channel_id FROM concept_deliveries WHERE delivery_key=?').bind(key).first();
  if(previous)return {duplicate:true,...previous};
  const reservation=await db.prepare("INSERT OR IGNORE INTO concept_deliveries(delivery_key,lesson_id,lesson_version,content_hash,status,payload_json) VALUES(?,?,?,?,'in_flight',?)")
    .bind(key,lesson.id,lesson.version,lesson.hash,JSON.stringify(lesson.payload)).run();
  if(reservation.meta.changes!==1)return {duplicate:true,status:'in_flight'};
  try{
    const response=await fetch(destination.toString(),{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(lesson.payload),signal:AbortSignal.timeout(30000)});
    if(!response.ok){await response.body?.cancel();throw new Error('discord_failed');}
    const message=JSON.parse(new TextDecoder().decode(await readBounded(response,64000))) as {id:string;channel_id:string};
    if(!/^\d+$/.test(message.id)||!/^\d+$/.test(message.channel_id))throw new Error('invalid_discord_result');
    await db.prepare("UPDATE concept_deliveries SET status='sent',message_id=?,channel_id=? WHERE delivery_key=?").bind(message.id,message.channel_id,key).run();
    return {status:'sent',message_id:message.id,channel_id:message.channel_id,duplicate:false};
  }catch{
    await db.prepare("UPDATE concept_deliveries SET status='unknown',error_code='discord_result_unknown' WHERE delivery_key=?").bind(key).run();
    throw new Error('discord_result_unknown');
  }
}
interface SemesterRequest {id:string;release_hash:string;slots:{sequence:number;lesson_id:string;scheduled_at:string}[]}
export async function registerSemester(db:D1Database,input:SemesterRequest,bundle:Bundle=conceptBundle){
  if(!bundle.production_ready||bundle.lessons.length!==36||bundle.lessons.some(l=>l.status!=='approved'))throw new Error('course_not_ready');
  if(!input||!/^[a-z0-9][a-z0-9-]{1,60}$/.test(input.id)||input.release_hash!==bundle.release_hash||!Array.isArray(input.slots)||input.slots.length!==36)throw new Error('invalid_semester');
  let previous='';
  const slots=input.slots.map((s,index)=>{
    const lesson=bundle.lessons.find(l=>l.order===index+1);
    if(!lesson||s.sequence!==index+1||s.lesson_id!==lesson.id||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(s.scheduled_at)||
      !Number.isFinite(Date.parse(s.scheduled_at))||new Date(s.scheduled_at).toISOString()!==s.scheduled_at||s.scheduled_at<=previous)throw new Error('invalid_semester');
    previous=s.scheduled_at;return {slot:s,lesson};
  });
  const existing=await db.prepare('SELECT release_hash,schedule_json FROM concept_semesters WHERE id=?').bind(input.id).first<{release_hash:string;schedule_json:string}>();
  const schedule=JSON.stringify(input.slots);
  if(existing){if(existing.release_hash!==input.release_hash||existing.schedule_json!==schedule)throw new Error('semester_already_frozen');return {id:input.id,duplicate:true};}
  // D1 batch is transactional: registration either includes every slot or rolls back.
  await db.batch([
    db.prepare('INSERT INTO concept_semesters(id,release_hash,curriculum_version,schedule_json) VALUES(?,?,?,?)').bind(input.id,bundle.release_hash,bundle.curriculum_version,schedule),
    ...slots.map(({slot,lesson})=>db.prepare('INSERT INTO concept_slots(semester_id,sequence,lesson_id,lesson_version,content_hash,scheduled_at,payload_json) VALUES(?,?,?,?,?,?,?)')
      .bind(input.id,slot.sequence,lesson.id,lesson.version,lesson.hash,slot.scheduled_at,JSON.stringify(lesson.payload)))
  ]);
  return {id:input.id,duplicate:false,status:'paused'};
}
export async function runConceptSchedule(env:ConceptEnv,now:Date){
  if(env.CONCEPT_SCHEDULE_ENABLED!=='true')return {status:'disabled'};
  if(!env.CONCEPT_WEBHOOK_URL)throw new Error('concept_webhook_missing');
  // Only the earliest outstanding slot is eligible. Old/unknown slots block catch-up floods.
  const row=await env.DB.prepare(`SELECT s.*, d.status AS delivery_status FROM concept_slots s
    JOIN concept_semesters c ON c.id=s.semester_id AND c.status='active'
    LEFT JOIN concept_deliveries d ON d.delivery_key='semester:'||s.semester_id||':'||s.sequence
    WHERE (d.status IS NULL OR d.status!='sent') AND s.scheduled_at<=?
    ORDER BY s.scheduled_at,s.semester_id,s.sequence LIMIT 1`).bind(now.toISOString()).first<{
      semester_id:string;sequence:number;lesson_id:string;lesson_version:number;content_hash:string;scheduled_at:string;payload_json:string;delivery_status:string|null}>();
  if(!row)return {status:'nothing_due'};
  if(row.delivery_status)return {status:'needs_review',semester:row.semester_id,sequence:row.sequence};
  if(now.getTime()-Date.parse(row.scheduled_at)>6*3600000)return {status:'missed_slot',semester:row.semester_id,sequence:row.sequence};
  return sendConcept(env.DB,`semester:${row.semester_id}:${row.sequence}`,{id:row.lesson_id,order:row.sequence,version:row.lesson_version,hash:row.content_hash,status:'approved',payload:JSON.parse(row.payload_json)},env.CONCEPT_WEBHOOK_URL);
}
// Caller must enforce admin authentication before calling this router.
export async function conceptRoute(request:Request,env:ConceptEnv):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/concepts'))return null;
  const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
  try{
    if(path==='/concepts'&&request.method==='GET')return json({release_hash:conceptBundle.release_hash,production_ready:conceptBundle.production_ready,
      lessons:conceptBundle.lessons.map(({payload,...l})=>({...l,title:payload.embeds[0].title}))});
    const match=/^\/concepts\/(preview|test)\/(dl-foundations-\d{2})$/.exec(path);
    if(match){
      const lesson=conceptBundle.lessons.find(l=>l.id===match[2]);if(!lesson)return json({error:'not_found'},404);
      if(match[1]==='preview'&&request.method==='GET')return json(lesson.payload);
      if(match[1]==='test'&&request.method==='POST'){
        const testWebhook=env.CONCEPT_WEBHOOK_URL??env.DISCORD_WEBHOOK_URL;
        if(env.CONCEPT_TEST_ENABLED!=='true'||!testWebhook)return json({error:'concept_test_disabled'},403);
        return json(await sendConcept(env.DB,`test:${lesson.hash}`,lesson,testWebhook));
      }
    }
    if(path==='/concepts/semesters'&&request.method==='POST'){
      const bytes=await readBounded(new Response(request.body),32000);
      return json(await registerSemester(env.DB,JSON.parse(new TextDecoder().decode(bytes))),201);
    }
    const semester=/^\/concepts\/semesters\/([a-z0-9-]+)$/.exec(path);
    if(semester&&request.method==='GET'){
      const value=await env.DB.prepare('SELECT * FROM concept_semesters WHERE id=?').bind(semester[1]).first();
      if(!value)return json({error:'not_found'},404);
      const slots=await env.DB.prepare(`SELECT s.sequence,s.lesson_id,s.scheduled_at,d.status,d.message_id FROM concept_slots s
        LEFT JOIN concept_deliveries d ON d.delivery_key='semester:'||s.semester_id||':'||s.sequence WHERE s.semester_id=? ORDER BY s.sequence`).bind(semester[1]).all();
      return json({semester:value,slots:slots.results});
    }
    return json({error:'not_found'},404);
  }catch(e){const code=e instanceof Error?e.message:'';return json({error:['course_not_ready','invalid_semester','semester_already_frozen','discord_result_unknown'].includes(code)?code:'concept_operation_failed'},409);}
}
