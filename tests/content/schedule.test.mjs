import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {yaml} from '../../scripts/content/compiler.mjs';
import {createSchedule} from '../../scripts/content/schedule.mjs';
const catalog=yaml(await readFile('content/dl-foundations/curriculum.yaml','utf8'));
const config=yaml(await readFile('config/semesters/example.yaml','utf8'));
test('generates 36 Monday/Wednesday/Friday 09:00 KST slots',()=>{
 const schedule=createSchedule(config,catalog);assert.equal(schedule.slots.length,36);
 assert.equal(schedule.slots[0].scheduled_at,'2026-09-14T00:00:00.000Z');
 assert.equal(schedule.slots[35].local_date,'2026-12-04');
 assert.ok(schedule.slots.every(s=>[1,3,5].includes(new Date(s.scheduled_at).getUTCDay())));
});
test('postpones rather than skips lessons over inclusive exam breaks and overlapping breaks',()=>{
 const plan=createSchedule({...config,breaks:[{start:'2026-09-14',end:'2026-09-20'},{start:'2026-09-18',end:'2026-09-20'}]},catalog);
 assert.equal(plan.slots[0].local_date,'2026-09-21');assert.equal(plan.slots[0].lesson_id,'dl-foundations-01');
 assert.equal(plan.slots[35].local_date,'2026-12-11');
});
test('converts KST midnight across UTC date and year boundary',()=>{
 const plan=createSchedule({...config,start_date:'2027-01-01',time:'00:30'},catalog);
 assert.equal(plan.slots[0].scheduled_at,'2026-12-31T15:30:00.000Z');
});
test('rejects invalid dates, timezones and duplicate weekdays',()=>{
 assert.throws(()=>createSchedule({...config,start_date:'2026-02-30'},catalog));
 assert.throws(()=>createSchedule({...config,weekdays:[1,1,5]},catalog));
 assert.throws(()=>createSchedule({...config,time:'25:00'},catalog));
 assert.throws(()=>createSchedule({...config,timezone:'UTC'},catalog));
});
