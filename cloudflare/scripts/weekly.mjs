// Only the explicit --generate action can initiate paid model calls.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{week:{type:'string'},remote:{type:'string'},generate:{type:'boolean'},status:{type:'boolean'},preview:{type:'boolean'},publish:{type:'boolean'}}});
try {
  if([values.generate,values.status,values.preview,values.publish].filter(Boolean).length>1)throw new Error("conflicting_actions");
  if(!/^20\d{2}-W\d{2}$/.test(values.week??'')) throw new Error('invalid_week');
  const root=new URL(values.remote??'https://discord-study-probe.chris011122.workers.dev');
  if(root.protocol!=='https:'||!root.hostname.endsWith('.workers.dev')||root.username||root.password)throw new Error('invalid_remote');
  const token=(await readFile('cloudflare/.wrangler/admin-token','utf8')).trim();
  const response=await fetch(new URL(`/weeks/${values.week}${values.generate?'/generate':values.preview?'/preview':values.publish?'/publish':''}`,root),{method:values.status||values.preview?'GET':'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`weekly_http_${response.status}`);
  const result=await response.json();
  await mkdir('artifacts/cloudflare',{recursive:true});
  await writeFile(`artifacts/cloudflare/weekly-${values.week}${values.preview?"-preview":values.publish?"-publish":values.generate?"-generate":""}.json`,JSON.stringify(result,null,2),{mode:0o600});
  console.log(JSON.stringify(result,null,2));
} catch(error){console.error(/^(conflicting_actions|invalid_week|invalid_remote|weekly_http_\d{3})$/.test(error.message)?error.message:'weekly_command_failed');process.exitCode=1;}
