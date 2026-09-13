import {env} from 'cloudflare:workers';
import {applyD1Migrations} from 'cloudflare:test';
import {beforeAll,afterEach,expect,it,vi} from 'vitest';
import worker,{type Env} from '../src/index';
import {conceptBundle,sendConcept,registerSemester,runConceptSchedule} from '../src/concepts';
const bindings=env as unknown as Env & {TEST_MIGRATIONS:Parameters<typeof applyD1Migrations>[1]};
const webhook='https://discord.com/api/webhooks/123/fixture_token';
const first=conceptBundle.lessons[0];
beforeAll(async()=>applyD1Migrations(bindings.DB,bindings.TEST_MIGRATIONS));
afterEach(async()=>{vi.unstubAllGlobals();await bindings.DB.exec('DELETE FROM concept_deliveries; DELETE FROM concept_slots; DELETE FROM concept_semesters;');});
it('requires authentication and leaves test sending disabled by default',async()=>{
 const url='https://fixture.test/concepts/test/'+first.id;
 expect((await worker.fetch(new Request(url,{method:'POST'}),bindings)).status).toBe(401);
 expect((await worker.fetch(new Request(url,{method:'POST',headers:{Authorization:`Bearer ${bindings.ADMIN_TOKEN}`}}),bindings)).status).toBe(403);
});
it('previews the actual compiled Markdown without external calls or model credentials',async()=>{
 const fetch=vi.fn(()=>{throw new Error('unexpected network');});vi.stubGlobal('fetch',fetch);
 const result=await worker.fetch(new Request('https://fixture.test/concepts/preview/'+first.id,{headers:{Authorization:`Bearer ${bindings.ADMIN_TOKEN}`}}),bindings);
 expect(result.status).toBe(200);expect(await result.json()).toEqual(first.payload);expect(fetch).not.toHaveBeenCalled();
});
it('reserves before delivery and prevents concurrent and repeated test posts',async()=>{
 const fetch=vi.fn(async()=>Response.json({id:'12345',channel_id:'67890'}));vi.stubGlobal('fetch',fetch);
 await Promise.all([sendConcept(bindings.DB,'test:one',first,webhook),sendConcept(bindings.DB,'test:one',first,webhook)]);
 expect(fetch).toHaveBeenCalledTimes(1);
 expect(await sendConcept(bindings.DB,'test:one',first,webhook)).toMatchObject({duplicate:true,status:'sent',message_id:'12345'});
 expect(await bindings.DB.prepare('SELECT lesson_id,lesson_version,content_hash FROM concept_deliveries').first()).toEqual({lesson_id:first.id,lesson_version:first.version,content_hash:first.hash});
});
it('never retries an ambiguous Discord result automatically',async()=>{
 const fetch=vi.fn(async()=>{throw new Error('lost response');});vi.stubGlobal('fetch',fetch);
 await expect(sendConcept(bindings.DB,'test:lost',first,webhook)).rejects.toThrow('discord_result_unknown');
 expect(await sendConcept(bindings.DB,'test:lost',first,webhook)).toMatchObject({duplicate:true,status:'unknown'});
 expect(fetch).toHaveBeenCalledTimes(1);
});
it('blocks semester creation with an incomplete or draft release',async()=>{
 await expect(registerSemester(bindings.DB,{id:'term-1',release_hash:conceptBundle.release_hash,slots:[]})).rejects.toThrow('course_not_ready');
});
function fixture(id='term-1'){
 const bundle={release_hash:'fixture-release',production_ready:true,curriculum_version:1,lessons:Array.from({length:36},(_,i)=>({...first,id:`lesson-${i+1}`,order:i+1,status:'approved'}))};
 const input={id,release_hash:bundle.release_hash,slots:bundle.lessons.map((l,i)=>({sequence:i+1,lesson_id:l.id,scheduled_at:new Date(Date.UTC(2026,8,14+i,0)).toISOString()}))};
 return {bundle,input};
}
it('freezes all slots transactionally and rejects changing an existing semester',async()=>{
 const {bundle,input}=fixture();await registerSemester(bindings.DB,input,bundle);
 expect(await registerSemester(bindings.DB,input,bundle)).toMatchObject({duplicate:true});
 expect(await bindings.DB.prepare('SELECT COUNT(*) n FROM concept_slots').first()).toEqual({n:36});
 const changed=structuredClone(input);changed.slots[35].scheduled_at='2026-12-31T00:00:00.000Z';
 await expect(registerSemester(bindings.DB,changed,bundle)).rejects.toThrow('semester_already_frozen');
 expect((await bindings.DB.prepare('SELECT status FROM concept_semesters').first())?.status).toBe('paused');
});
it('uses the frozen payload, allows semester rotation, and blocks late catch-up floods',async()=>{
 const {bundle,input}=fixture();await registerSemester(bindings.DB,input,bundle);
 const enabled={DB:bindings.DB,CONCEPT_SCHEDULE_ENABLED:'true',CONCEPT_WEBHOOK_URL:webhook};
 expect(await runConceptSchedule(enabled,new Date(input.slots[0].scheduled_at))).toEqual({status:'nothing_due'});
 await bindings.DB.prepare("UPDATE concept_semesters SET status='active'").run();
 expect(await runConceptSchedule(enabled,new Date('2026-09-14T07:00:00Z'))).toMatchObject({status:'missed_slot'});
 const fetch=vi.fn(async()=>Response.json({id:'12345',channel_id:'67890'}));vi.stubGlobal('fetch',fetch);
 await runConceptSchedule(enabled,new Date(input.slots[0].scheduled_at));
 await runConceptSchedule(enabled,new Date(input.slots[0].scheduled_at));
 expect(fetch).toHaveBeenCalledTimes(1);
 const next=fixture('term-2');await registerSemester(bindings.DB,next.input,next.bundle);
 await bindings.DB.prepare("UPDATE concept_semesters SET status='active' WHERE id='term-2'").run();
 await runConceptSchedule(enabled,new Date(input.slots[0].scheduled_at));
 expect(fetch).toHaveBeenCalledTimes(2);
});
it('never falls back to the news webhook and scopes test deduplication to the dedicated webhook',async()=>{
 const fetch=vi.fn(async()=>Response.json({id:'12345',channel_id:'67890'}));vi.stubGlobal('fetch',fetch);
 const request=()=>new Request('https://fixture.test/concepts/test/'+first.id,{method:'POST',headers:{Authorization:`Bearer ${bindings.ADMIN_TOKEN}`}});
 const enabled={...bindings,CONCEPT_TEST_ENABLED:'true',CONCEPT_WEBHOOK_URL:undefined,DISCORD_WEBHOOK_URL:webhook};
 const missing=await worker.fetch(request(),enabled);
 expect(missing.status).toBe(409);expect(await missing.json()).toEqual({error:'concept_webhook_missing'});
 expect(fetch).not.toHaveBeenCalled();
 const conceptWebhook='https://discord.com/api/webhooks/456/concept_fixture';
 await worker.fetch(request(),{...enabled,CONCEPT_WEBHOOK_URL:conceptWebhook});
 await worker.fetch(request(),{...enabled,CONCEPT_WEBHOOK_URL:conceptWebhook});
 expect(fetch).toHaveBeenCalledTimes(1);
 expect(new URL(fetch.mock.calls[0][0] as string).pathname).toBe('/api/webhooks/456/concept_fixture');
 await worker.fetch(request(),{...enabled,CONCEPT_WEBHOOK_URL:'https://discord.com/api/webhooks/789/another_fixture'});
 expect(fetch).toHaveBeenCalledTimes(2);
 await expect(runConceptSchedule({...enabled,CONCEPT_SCHEDULE_ENABLED:'true'},new Date())).rejects.toThrow('concept_webhook_missing');
});
