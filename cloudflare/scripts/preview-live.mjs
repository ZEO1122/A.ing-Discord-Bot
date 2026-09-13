// Explicit one-off preview: three new calls at most, one Discord message.
// Uses production summary/validation/rendering code and a separate durable local ledger.
import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root='artifacts/cloudflare/preview-v4-W37';
await mkdir(root,{recursive:true});
let lock;
try {
 lock=await open(`${root}/lock`,'wx',0o600);
 process.loadEnvFile('.env');
 if(!process.env.OPENAI_API_KEY || !process.env.DISCORD_WEBHOOK_URL)throw new Error('missing_credentials');
 await build({stdin:{contents:'export {collectSource} from "./cloudflare/src/sources.ts"; export {summarize} from "./cloudflare/src/openai.ts"; export {renderEdition,webhookUrl} from "./cloudflare/src/delivery.ts";',resolveDir:process.cwd()},outfile:`${root}/runtime.mjs`,bundle:true,format:'esm',platform:'node'});
 const {collectSource,summarize,renderEdition,webhookUrl}=await import(pathToFileURL(resolve(`${root}/runtime.mjs`)));
 const token=(await readFile('cloudflare/.wrangler/admin-token','utf8')).trim();
 const response=await fetch('https://discord-study-probe.chris011122.workers.dev/weeks/2026-W37',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('edition_read_failed');
 const status=await response.json();
 await writeFile(`${root}/edition-response.json`,JSON.stringify(status,null,2),{mode:0o600});
 const edition=status;
 if(!edition?.papers || edition.papers.length!==3)throw new Error('invalid_edition');
 const rows=new Map();
 for(const paper of edition.papers){
  const sourcePath=`${root}/${paper.paper_id}.source.json`;
  let source;
  try {source=JSON.parse(await readFile(sourcePath,'utf8'));} catch(error) {
   if(error.code!=='ENOENT')throw error;
   source=await collectSource(paper.paper_id);
   await writeFile(sourcePath,JSON.stringify(source,null,2),{mode:0o600});
  }
  const path=`${root}/${paper.paper_id}.json`;
  let saved;
  try{saved=JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!saved){
   await writeFile(path,JSON.stringify({status:'in_flight',created_at:new Date().toISOString()}),{flag:'wx',mode:0o600});
   const result=await summarize(source,process.env.OPENAI_API_KEY,edition.model);
   saved={status:result.validation_error?'rejected':'complete',result};
   await writeFile(path,JSON.stringify(saved,null,2),{mode:0o600});
  }
  if(saved.status!=='complete')throw new Error('generation_not_complete');
  rows.set(paper.job_id,{source_json:JSON.stringify(source),result_json:JSON.stringify(saved.result)});
  console.log(JSON.stringify({paper_id:paper.paper_id,status:saved.status,usage:saved.result.usage}));
 }
 const db={prepare(sql){return {bind(id){return {async first(){if(sql.includes('probe_jobs'))return {status:'complete'};return rows.get(id);}};}};}};
 const payload=await renderEdition(db,edition);
 await writeFile(`${root}/payload.json`,JSON.stringify(payload,null,2),{mode:0o600});
 if (!process.argv.includes("--publish-reviewed")) { console.log(JSON.stringify({status:"preview_ready",path:`${root}/payload.json`})); process.exitCode=0; } else {
 // Never repeat a send whose response may have been lost.
 const sendPath=`${root}/delivery.json`;
 try{await readFile(sendPath);throw new Error('delivery_already_reserved');}catch(error){if(error.code!=='ENOENT')throw error;}
 await writeFile(sendPath,JSON.stringify({status:'in_flight',created_at:new Date().toISOString()}),{flag:'wx',mode:0o600});
 const delivered=await fetch(webhookUrl(process.env.DISCORD_WEBHOOK_URL),{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
 if(!delivered.ok)throw new Error('delivery_unknown');
 const message=await delivered.json();
 if(!/^\d+$/.test(message.id)||!/^\d+$/.test(message.channel_id))throw new Error('delivery_unknown');
 const record={status:'sent',message_id:message.id,channel_id:message.channel_id};
 await writeFile(sendPath,JSON.stringify(record,null,2),{mode:0o600});
 console.log(JSON.stringify(record));
 }
} catch(error){
 console.error(JSON.stringify({error:['missing_credentials','edition_read_failed','invalid_edition','generation_not_complete','delivery_already_reserved','delivery_unknown'].includes(error.message)?error.message:error.code==='EEXIST'?'already_locked':'preview_failed'}));process.exitCode=1;
} finally {
 if(lock){await lock.close();const {unlink}=await import('node:fs/promises');await unlink(`${root}/lock`);}
}
