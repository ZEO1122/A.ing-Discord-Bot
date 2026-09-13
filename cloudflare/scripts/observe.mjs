// Filter tail events in memory. Never print/store request headers, URLs or logs.
import {spawn} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail','discord-study-probe','--config','cloudflare/wrangler.jsonc','--format','json'],{stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
child.stderr.resume();
let depth=0,quoted=false,escaped=false,buffer='';
const events=[];
child.stdout.on('data',chunk=>{
 for(const ch of chunk.toString()){
  if(!depth){if(ch!=='{')continue;buffer='';quoted=false;escaped=false;}
  buffer+=ch;
  if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}
  else if(ch==='"')quoted=true;
  else if(ch==='{')depth++;
  else if(ch==='}')depth--;
  if(!depth){try{const e=JSON.parse(buffer);let eventPhase;
try { const part = new URL(e.event?.request?.url).searchParams.get("phase"); if (["metadata","download","all"].includes(part)) eventPhase=part; } catch {}
const safe={phase:eventPhase,cpu_ms:e.cpuTime,wall_ms:e.wallTime,outcome:e.outcome,event_timestamp:e.eventTimestamp};if(safe.outcome){events.push(safe);console.log(JSON.stringify(safe));}}catch{}buffer='';}
 }
});
const paper=process.argv[2];
const phase=["metadata","download","compare"].includes(process.argv[3])?process.argv[3]:"all";
let trigger;
if(paper && /^\d{4}\.\d{4,5}$/.test(paper))trigger=setTimeout(async()=>{
 try {
  const token=(await readFile('cloudflare/.wrangler/admin-token','utf8')).trim();
  for (const part of phase === 'compare' ? ['metadata','download','all'] : [phase]) {
  const response=await fetch(`https://discord-study-probe.chris011122.workers.dev/diagnostics/sources/${paper}?phase=${part}`,{method:'POST',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  console.log(JSON.stringify({phase:part,diagnostic_status:response.status,result:await response.json()}));
  }
 }catch{console.log('source_diagnostic_failed');}
},20000);
const timer=setTimeout(()=>child.kill('SIGTERM'),55000);
await new Promise(resolve=>child.on('exit',resolve));
clearTimeout(timer);clearTimeout(trigger);
await writeFile(`artifacts/cloudflare/tail-metrics${paper?'-'+paper:''}-${phase}-${Date.now()}.json`,JSON.stringify(events,null,2));
