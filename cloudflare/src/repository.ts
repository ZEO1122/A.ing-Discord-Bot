import { MAX_DAILY_CALLS, ProbeError } from "./domain";

export async function reserveCall(db: D1Database, job: string, paper: string): Promise<boolean> {
  // One SQL statement serializes the reservation and account-local daily limit.
  const result = await db.prepare(`INSERT INTO probe_calls(job_id,paper_id,status)
    SELECT ?,?,'in_flight' WHERE
    (SELECT COUNT(*) FROM probe_calls WHERE created_at >= strftime('%Y-%m-%dT00:00:00.000Z','now')) < ?
    ON CONFLICT(job_id,paper_id) DO NOTHING`).bind(job, paper, MAX_DAILY_CALLS).run();
  return result.meta.changes === 1;
}
export async function cachedCall(db: D1Database, job: string, paper: string) {
  const row = await db.prepare("SELECT status,result_json FROM probe_calls WHERE job_id=? AND paper_id=?").bind(job, paper).first<{status: string; result_json: string | null}>();
  if (!row) return null;
  if (row.status !== "complete" || !row.result_json) throw new ProbeError("api_replay_requires_review");
  return JSON.parse(row.result_json);
}
export async function setJob(db: D1Database, id: string, status: string, code: string | null = null) {
  await db.prepare("UPDATE probe_jobs SET status=?,error_code=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(status, code, id).run();
}
