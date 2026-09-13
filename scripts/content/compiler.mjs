import {readFile,readdir,realpath} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {parseDocument} from 'yaml';

export const SECTIONS=['오늘의 핵심','왜 필요한가?','작동 원리','작은 예제로 확인하기','자주 하는 오해','복습 질문'];
export const sha256=text=>createHash('sha256').update(text).digest('hex');
export function yaml(text) {
  const doc=parseDocument(text,{uniqueKeys:true});
  if(doc.errors.length)throw new Error('invalid_yaml');
  return doc.toJS({maxAliasCount:0});
}
function check(ok,message){if(!ok)throw new Error(message);}
function text(value,max=200){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
const emoji=/\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
export function parseLesson(markdown,entry) {
  const normalized=markdown.replace(/\r\n/g,'\n');
  const match=/^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalized);
  check(match,'missing_frontmatter');
  const meta=yaml(match[1]);
  check(meta&&Object.getPrototypeOf(meta)===Object.prototype,'invalid_metadata');
  const allowed=['id','title','order','version','status','prerequisites','sources','objective'];
  check(Object.keys(meta).every(k=>allowed.includes(k)),'unknown_metadata');
  check(meta.id===entry.id&&meta.order===entry.order&&meta.title===entry.title,'catalog_mismatch');
  check(text(meta.title,180)&&text(meta.objective,220),'invalid_title_or_objective');
  check(Number.isInteger(meta.version)&&meta.version>=1,'invalid_version');
  check(['draft','approved'].includes(meta.status),'invalid_status');
  check(Array.isArray(meta.prerequisites)&&JSON.stringify(meta.prerequisites)===JSON.stringify(entry.prerequisites),'prerequisite_mismatch');
  check(Array.isArray(meta.sources)&&meta.sources.length>=1&&meta.sources.length<=3,'missing_sources');
  for(const source of meta.sources){
    check(source&&Object.keys(source).sort().join(',')==='book,chapter,url','invalid_source');
    check(['d2l','deep-learning','deep-learning-from-scratch'].includes(source.book)&&text(source.chapter,150),'invalid_source');
    let url;try{url=new URL(source.url);}catch{throw new Error('invalid_source_url');}
    const host=source.book==='d2l'?'d2l.ai':source.book==='deep-learning'?'www.deeplearningbook.org':'github.com';
    check(url.protocol==='https:'&&url.hostname===host&&!url.username&&!url.password&&!url.search,'invalid_source_url');
    if(source.book==='deep-learning-from-scratch')check(url.pathname.startsWith('/kchcoo/WegraLee-deep-learning-from-scratch/'),'invalid_source_url');
  }
  const body=match[2].trim();
  check(!emoji.test(meta.title+meta.objective+body),'emoji_not_allowed');
  check(!/(answer_key|accepted_keywords|grading_logic)/i.test(body),'private_grading_data');
  check(!/<\/?[A-Za-z][^>]*>|@everyone|@here|<@|!\[|\$\$|\\\[/.test(body),'unsupported_markdown');
  const sections=[];let current;let fence=false;
  for(const line of body.split('\n')){
    if(line.startsWith('```')){check(/^```(?:python|text)?$/.test(line),'unsupported_code_fence');fence=!fence;}
    if(!fence&&line.startsWith('## ')){
      const name=line.slice(3).trim();check(SECTIONS[sections.length]===name,'invalid_section_order');
      current={name,value:''};sections.push(current);
    }else{check(current||!line.trim(),'text_before_section');if(current)current.value+=line+'\n';}
  }
  check(!fence,'unclosed_code_fence');check(sections.length===SECTIONS.length,'missing_section');
  for(const section of sections){section.value=section.value.trim();check(text(section.value,1024),'section_empty_or_too_long');}
  const hash=sha256(normalized);
  const lesson={...meta,sections,hash};
  renderLesson(lesson);
  return lesson;
}
const books={'d2l':'Dive into Deep Learning','deep-learning':'Deep Learning','deep-learning-from-scratch':'밑바닥부터 시작하는 딥러닝'};
function label(s){return s.replace(/[\\`*_\[\]<>]/g,'\\$&');}
export function renderLesson(lesson) {
  const title=`딥러닝 기초 ${String(lesson.order).padStart(2,'0')}/36 · ${lesson.title}`;
  const fields=[{name:'학습 목표',value:lesson.objective,inline:false},...lesson.sections.map(s=>({...s,inline:false})),
    {name:'참고 자료',value:lesson.sources.map(s=>`[${label(books[s.book])} · ${label(s.chapter)}](${s.url})`).join('\n'),inline:false}];
  const length=title.length+fields.reduce((n,f)=>n+f.name.length+f.value.length,0);
  check(title.length<=256&&length<=6000&&fields.every(f=>f.value.length<=1024),'discord_payload_too_large');
  return {embeds:[{title,fields}],allowed_mentions:{parse:[]}};
}
export function validateCatalog(catalog) {
  check(catalog?.id==='dl-foundations'&&Number.isInteger(catalog.version)&&catalog.version>=1&&catalog.weeks===12&&catalog.per_week===3,'invalid_curriculum');
  check(Array.isArray(catalog.lessons)&&catalog.lessons.length===36,'expected_36_lessons');
  const seen=new Set();const files=new Set();
  catalog.lessons.forEach((entry,index)=>{
    check(entry.order===index+1&&entry.id===`dl-foundations-${String(index+1).padStart(2,'0')}`,'invalid_order_or_id');
    check(text(entry.title,180)&&/^lessons\/\d{2}-[a-z0-9-]+\.md$/.test(entry.file)&&!files.has(entry.file),'invalid_lesson_file');
    check(Array.isArray(entry.prerequisites)&&new Set(entry.prerequisites).size===entry.prerequisites.length&&entry.prerequisites.every(id=>seen.has(id)),'forward_or_missing_prerequisite');
    seen.add(entry.id);files.add(entry.file);
  });
  return catalog;
}
export async function loadCourse(directory,{production=false}={}) {
  const catalog=validateCatalog(yaml(await readFile(resolve(directory,'curriculum.yaml'),'utf8')));
  const reviews=yaml(await readFile(resolve(directory,'reviews.yaml'),'utf8'));
  const actual=(await readdir(resolve(directory,'lessons'))).filter(p=>p.endsWith('.md'));
  check(actual.every(p=>catalog.lessons.some(e=>e.file===`lessons/${p}`)),'uncatalogued_lesson');
  const lessons=[];const missing=[];
  const root=await realpath(directory);
  for(const entry of catalog.lessons){
    if(!actual.includes(entry.file.split('/')[1])){missing.push(entry.id);continue;}
    const file=await realpath(resolve(directory,entry.file));
    check(!relative(root,file).startsWith('..'),'lesson_outside_course');
    const lesson=parseLesson(await readFile(file,'utf8'),entry);
    const review=reviews?.[lesson.id];
    const reviewed=review?.sha256===lesson.hash&&text(review.reviewer)&&/^\d{4}-\d{2}-\d{2}$/.test(review.date??'');
    if(lesson.status==='approved')check(reviewed,`stale_review:${lesson.id}`);
    lessons.push({...lesson,payload:renderLesson(lesson)});
  }
  const productionReady=missing.length===0&&lessons.every(l=>l.status==='approved');
  if(production)check(productionReady,'course_not_ready:all_36_reviewed_lessons_required');
  const content={catalog,lessons,missing,production_ready:productionReady};
  return {...content,release_hash:sha256(JSON.stringify(content))};
}
