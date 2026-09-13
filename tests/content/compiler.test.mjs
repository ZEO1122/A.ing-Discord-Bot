import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseLesson,loadCourse,yaml,validateCatalog,sha256} from '../../scripts/content/compiler.mjs';
const dir='content/dl-foundations';
const catalog=yaml(await readFile(`${dir}/curriculum.yaml`,'utf8'));
const markdown=await readFile(`${dir}/${catalog.lessons[0].file}`,'utf8');
test('validates the actual 36-lesson dependency graph and 36 complete draft payloads',async()=>{
 const course=await loadCourse(dir);assert.equal(course.lessons.length,36);assert.equal(course.missing.length,0);
 assert.equal(course.production_ready,false);assert.equal(course.lessons[0].payload.embeds[0].fields.length,8);
 assert.equal(course.lessons[0].payload.content,undefined);assert.deepEqual(course.lessons[0].payload.allowed_mentions,{parse:[]});
});
test('blocks production when the semester is not fully authored and reviewed',async()=>{
 await assert.rejects(loadCourse(dir,{production:true}),/course_not_ready/);
});
test('rejects duplicate YAML keys and aliases',()=>{
 assert.throws(()=>yaml('a: 1\na: 2'),/invalid_yaml/);
 assert.throws(()=>yaml('a: &a [1]\nb: *a'));
});
test('rejects missing, reordered, duplicate, or oversized sections',()=>{
 assert.throws(()=>parseLesson(markdown.replace('## 복습 질문','## 없는 제목'),catalog.lessons[0]),/section/);
 assert.throws(()=>parseLesson(markdown.replace('## 왜 필요한가?','## 오늘의 핵심'),catalog.lessons[0]),/section/);
 assert.throws(()=>parseLesson(markdown.replace('## 복습 질문','## 복습 질문\n'+'x'.repeat(1025)),catalog.lessons[0]),/too_long/);
});
test('rejects wrong sources, mentions, unsupported HTML and private grading data',()=>{
 for(const [before,after] of [['https://d2l.ai/','https://evil.test/'],['## 오늘의 핵심','## 오늘의 핵심\n@everyone'],['## 오늘의 핵심','## 오늘의 핵심\n<script>'],['## 오늘의 핵심','## 오늘의 핵심\nanswer_key: secret']]){
   assert.throws(()=>parseLesson(markdown.replace(before,after),catalog.lessons[0]));
 }
});
test('rejects unknown and forward prerequisites in the catalog',()=>{
 const copy=structuredClone(catalog);copy.lessons[0].prerequisites=['dl-foundations-02'];
 assert.throws(()=>validateCatalog(copy),/prerequisite/);
 const missing=structuredClone(catalog);missing.lessons.pop();assert.throws(()=>validateCatalog(missing),/36/);
});
test('preserves headings inside code blocks as text and rejects unclosed fences',()=>{
 const changed=markdown.replace('## 오늘의 핵심', '## 오늘의 핵심\n```python\n## 코드 안의 주석\nprint(1)\n```');
 assert.equal(parseLesson(changed,catalog.lessons[0]).sections.length,6);
 assert.throws(()=>parseLesson(changed.replace('```python','```javascript'),catalog.lessons[0]),/code_fence/);
});
test('invalidates approved content after any unreviewed modification',async()=>{
 const copy=await mkdtemp(join(tmpdir(),'concept-review-'));
 try{
   await cp(dir,copy,{recursive:true});
   const approved=markdown.replace('status: draft','status: approved');
   await writeFile(join(copy,catalog.lessons[0].file),approved);
   await writeFile(join(copy,'reviews.yaml'),JSON.stringify({'dl-foundations-01':{sha256:sha256(approved),reviewer:'test reviewer',date:'2026-09-13'}}));
   await loadCourse(copy);
   await writeFile(join(copy,catalog.lessons[0].file),approved+'\n');
   await assert.rejects(loadCourse(copy),/stale_review/);
 }finally{await rm(copy,{recursive:true,force:true});}
});
