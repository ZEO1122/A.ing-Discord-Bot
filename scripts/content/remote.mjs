import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{lesson:{type:'string'},send:{type:'boolean',default:false}}});
try{
 const id=values.lesson;if(!/^dl-foundations-\d{2}$/.test(id??''))throw new Error('invalid_lesson');
 const token=(await readFile('cloudflare/.wrangler/admin-token','utf8')).trim();
 const response=await fetch(`https://discord-study-probe.chris011122.workers.dev/concepts/${values.send?'test':'preview'}/${id}`,{
   method:values.send?'POST':'GET',headers:{Authorization:`Bearer ${token}`},redirect:'manual',signal:AbortSignal.timeout(30000)});
 const result=await response.json();
 if(!response.ok)throw new Error(`concept_http_${response.status}`);
 await mkdir('artifacts/concepts',{recursive:true});
 await writeFile(`artifacts/concepts/remote-${id}-${values.send?'send':'preview'}.json`,JSON.stringify(result,null,2),{mode:0o600});
 console.log(JSON.stringify(values.send?{lesson:id,...result}:{lesson:id,title:result.embeds[0].title,fields:result.embeds[0].fields.length}));
}catch(e){console.error(/^(invalid_lesson|concept_http_\d{3})$/.test(e.message)?e.message:'concept_remote_failed');process.exitCode=1;}
