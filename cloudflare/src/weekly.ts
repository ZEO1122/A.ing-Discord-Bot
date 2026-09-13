import { jobId, MODEL, REVISION, PAPER_ID, ProbeError } from "./domain";
import { fetchSource, readBounded } from "./network";
import type { Env } from "./index";

export interface RankedPaper {
  rank: number; paper_id: string; title: string; upvotes: number;
  hf_url: string; job_id: string;
}
export interface Edition {
  week: string; fetched_at: string; ranking_url: string; api_url: string;
  model: string; pipeline_revision?: string; papers: RankedPaper[];
}
export function validateWeek(week: string): string {
  if (!/^20\d{2}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(week)) throw new ProbeError("invalid_week");
  return week;
}
export async function readEdition(db: D1Database, week: string): Promise<Edition | null> {
  const row = await db.prepare("SELECT snapshot_json FROM weekly_editions WHERE week=?").bind(validateWeek(week)).first<{snapshot_json: string}>();
  return row ? JSON.parse(row.snapshot_json) : null;
}
export async function captureEdition(db: D1Database, week: string, model = MODEL): Promise<Edition> {
  validateWeek(week);
  const existing = await readEdition(db, week);
  if (existing) return existing;
  // Default ordering matches the weekly page; trending is a different feed.
  const apiUrl = `https://huggingface.co/api/daily_papers?week=${week}&limit=3`;
  const raw: unknown = JSON.parse(new TextDecoder().decode(await readBounded(await fetchSource(apiUrl), 512000)));
  if (!Array.isArray(raw) || raw.length !== 3) throw new ProbeError("weekly_incomplete");
  const papers: RankedPaper[] = [];
  for (const [index, item] of raw.entries()) {
    const paper = item?.paper;
    const title = item?.title ?? paper?.title;
    if (!paper || typeof paper.id !== "string" || !PAPER_ID.test(paper.id) ||
        typeof title !== "string" || !title.trim() || title.length > 1000 ||
        !Number.isInteger(paper.upvotes) || paper.upvotes < 0 || papers.some(p => p.paper_id === paper.id)) {
      throw new ProbeError("invalid_weekly_metadata");
    }
    papers.push({ rank: index + 1, paper_id: paper.id, title, upvotes: paper.upvotes,
      hf_url: `https://huggingface.co/papers/${paper.id}`, job_id: await jobId({ paper_ids: [paper.id] }, model) });
  }
  const edition: Edition = { week, fetched_at: new Date().toISOString(),
    ranking_url: `https://huggingface.co/papers/week/${week}`, api_url: apiUrl, model, pipeline_revision: REVISION, papers };
  // Concurrent captures may see different votes. Only the first complete snapshot wins.
  await db.prepare("INSERT OR IGNORE INTO weekly_editions(week,snapshot_json) VALUES(?,?)").bind(week, JSON.stringify(edition)).run();
  return (await readEdition(db, week))!;
}
export async function generateEdition(env: Env, edition: Edition) {
  if (env.LIVE_ENABLED !== "true") throw new ProbeError("live_disabled");
  if (edition.model !== (env.OPENAI_MODEL || MODEL)) throw new ProbeError("edition_model_changed");
  const results = [];
  for (const paper of edition.papers) {
    const params = { paper_ids: [paper.paper_id] };
    const inserted = await env.DB.prepare("INSERT OR IGNORE INTO probe_jobs(id,request_json,status) VALUES(?,?,'queued')").bind(paper.job_id, JSON.stringify(params)).run();
    if (inserted.meta.changes === 0) { results.push({ rank: paper.rank, id: paper.job_id, duplicate: true }); continue; }
    if (paper.job_id !== await jobId(params, edition.model)) {
      await env.DB.prepare("UPDATE probe_jobs SET status='blocked',error_code='edition_revision_changed' WHERE id=?").bind(paper.job_id).run();
      results.push({rank:paper.rank,id:paper.job_id,error:"edition_revision_changed"});
      continue;
    }
    try {
      await env.PROBE.create({ id: paper.job_id, params });
      results.push({ rank: paper.rank, id: paper.job_id, duplicate: false });
    } catch {
      await env.DB.prepare("UPDATE probe_jobs SET status='dispatch_unknown',error_code='dispatch_unknown' WHERE id=?").bind(paper.job_id).run();
      results.push({ rank: paper.rank, id: paper.job_id, error: "dispatch_unknown" });
    }
  }
  return results;
}
export async function editionStatus(db: D1Database, edition: Edition) {
  const papers = [];
  for (const paper of edition.papers) {
    const job = await db.prepare("SELECT status,error_code FROM probe_jobs WHERE id=?").bind(paper.job_id).first();
    papers.push({ ...paper, job: job ?? { status: "not_started" } });
  }
  const delivery = await db.prepare("SELECT status,message_id,channel_id,error_code FROM weekly_deliveries WHERE week=?").bind(edition.week).first();
  const run = await db.prepare("SELECT status,error_code FROM weekly_runs WHERE week=?").bind(edition.week).first();
  return { ...edition, papers, delivery, run };
}
