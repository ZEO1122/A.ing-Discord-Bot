import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadCourse,yaml} from './compiler.mjs';
import {createSchedule} from './schedule.mjs';
const action=process.argv[2]??'validate';
try {
 const course=await loadCourse('content/dl-foundations',{production:process.argv.includes('--production')});
 if(action==='validate')console.log(JSON.stringify({lessons:course.lessons.length,total:36,missing:course.missing,production_ready:course.production_ready,release_hash:course.release_hash},null,2));
 else if(action==='build'){
   await mkdir('cloudflare/src/generated',{recursive:true});
   // Only already-rendered payloads enter the runtime; no YAML/Markdown parser in Workers.
   const bundle={release_hash:course.release_hash,production_ready:course.production_ready,curriculum_version:course.catalog.version,
    lessons:course.lessons.map(l=>({id:l.id,order:l.order,version:l.version,status:l.status,hash:l.hash,payload:l.payload}))};
   await writeFile('cloudflare/src/generated/concepts.json',JSON.stringify(bundle,null,2)+'\n');
   console.log(JSON.stringify({built:bundle.lessons.length,production_ready:bundle.production_ready,release_hash:bundle.release_hash}));
 }else if(action==='preview'){
   await mkdir('artifacts/concepts',{recursive:true});
   const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
   const cards=course.lessons.map(l=>`<article id="${l.id}"><div class="status">${l.status} · ${l.id} · v${l.version}</div><h2>${esc(l.payload.embeds[0].title)}</h2>${l.payload.embeds[0].fields.map(f=>`<h3>${esc(f.name)}</h3><pre>${esc(f.value)}</pre>`).join('')}</article>`).join('');
   await writeFile('artifacts/concepts/preview.html',`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>딥러닝 개념 알림 미리보기</title><style>body{background:#202127;color:#eee;font:16px/1.7 system-ui;margin:0 auto;padding:24px;max-width:850px}article{border-left:4px solid #737c99;border-radius:6px;background:#2b2d33;padding:24px;margin:24px 0}h1{font-size:24px}h2{color:#83b5ff;font-size:20px}h3{font-size:16px;margin-bottom:4px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin-top:0}.status{color:#b9bfcc;font-size:12px}</style><h1>딥러닝 기초 · 36회 과정</h1><p>${course.lessons.length}편 작성 / 36편. Markdown 텍스트와 줄바꿈 검토용이며 Discord 실제 렌더링과 다를 수 있습니다.</p>${cards}</html>`);
   for(const l of course.lessons)await writeFile(`artifacts/concepts/${l.id}.json`,JSON.stringify(l.payload,null,2));
   console.log(resolve('artifacts/concepts/preview.html'));
 }else if(action==='schedule'){
   const path=process.argv[3];if(!path||path.startsWith('--'))throw new Error('semester_path_required');
   const plan=createSchedule(yaml(await readFile(path,'utf8')),course.catalog);
   await mkdir('artifacts/concepts',{recursive:true});
   await writeFile(`artifacts/concepts/${plan.id}-schedule.json`,JSON.stringify(plan,null,2));
   console.log(JSON.stringify(plan,null,2));
 }else throw new Error('unknown_action');
}catch(e){console.error(e.message);process.exitCode=1;}
