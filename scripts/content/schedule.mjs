const DAY=86400000;
function check(ok,message){if(!ok)throw new Error(message);}
function date(value){check(/^\d{4}-\d{2}-\d{2}$/.test(value??''),'invalid_date');const t=Date.parse(value+'T00:00:00Z');check(Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value,'invalid_date');return t;}
export function createSchedule(config,catalog){
 check(config&&/^[a-z0-9][a-z0-9-]{1,60}$/.test(config.id??''),'invalid_semester_id');
 check(config.timezone==='Asia/Seoul','unsupported_timezone');
 check(config.curriculum==='dl-foundations'&&config.curriculum_version===catalog.version,'curriculum_version_mismatch');
 check(Array.isArray(config.weekdays)&&config.weekdays.length===3&&new Set(config.weekdays).size===3&&config.weekdays.every(d=>Number.isInteger(d)&&d>=0&&d<=6),'three_distinct_weekdays_required');
 check(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(config.time??''),'invalid_time');
 check(Array.isArray(config.breaks),'invalid_breaks');
 const pauses=config.breaks.map(b=>{const start=date(b.start),end=date(b.end);check(end>=start,'invalid_break_range');return {start,end};});
 let cursor=date(config.start_date);const first=cursor;
 const [hours,minutes]=config.time.split(':').map(Number);
 const slots=[];
 while(slots.length<catalog.lessons.length){
   check(cursor-first<730*DAY,'schedule_exceeds_two_years');
   if(config.weekdays.includes(new Date(cursor).getUTCDay())&&!pauses.some(b=>cursor>=b.start&&cursor<=b.end)){
     const lesson=catalog.lessons[slots.length];
     slots.push({sequence:slots.length+1,lesson_id:lesson.id,local_date:new Date(cursor).toISOString().slice(0,10),
       scheduled_at:new Date(cursor+(hours-9)*3600000+minutes*60000).toISOString()});
   }
   cursor+=DAY;
 }
 return {id:config.id,curriculum:config.curriculum,curriculum_version:config.curriculum_version,timezone:config.timezone,time:config.time,weekdays:config.weekdays,start_date:config.start_date,breaks:config.breaks,slots};
}
