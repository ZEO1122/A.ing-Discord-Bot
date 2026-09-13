const DAY = 86400000;
function sunday(timestamp:number):number {
  const d=new Date(timestamp); d.setUTCHours(0,0,0,0);
  return d.getTime()-d.getUTCDay()*DAY;
}
// HF's page metadata uses Sunday-start weeks with Jan 1 in week 1.
// Verified against 2021-W01, 2025-W01 and 2026-W37. Use UTC for a stable cutoff.
export function lastClosedHfWeek(now:Date):string {
  if(!Number.isFinite(now.getTime()))throw new Error("invalid_date");
  const start=sunday(now.getTime())-7*DAY;
  const year=new Date(start+6*DAY).getUTCFullYear();
  const first=sunday(Date.UTC(year,0,1));
  return `${year}-W${String(Math.round((start-first)/(7*DAY))+1).padStart(2,"0")}`;
}
