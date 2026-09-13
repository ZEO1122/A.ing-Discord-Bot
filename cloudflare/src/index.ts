import {conceptRoute, runConceptSchedule} from "./concepts";
import { startWeekly } from "./scheduler";
import { lastClosedHfWeek } from "./calendar";
export { WeeklyPipeline } from "./scheduler";
import { renderEdition, deliverEdition } from "./delivery";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { errorCode, jobId, MODEL, parseRequest, ProbeError, type ProbeRequest } from "./domain";
import { captureEdition, readEdition, generateEdition, editionStatus } from "./weekly";
import { evidenceCandidates } from "./evidence";
import { readBounded, fetchSource } from "./network";
import { summarize } from "./openai";
import { cachedCall, reserveCall, setJob } from "./repository";
import { collectSource } from "./sources";

export interface Env {
  DB: D1Database;
  CONCEPT_TEST_ENABLED?: string;
  CONCEPT_SCHEDULE_ENABLED?: string;
  CONCEPT_WEBHOOK_URL?: string;
  PROBE: Workflow<ProbeRequest>;
  ADMIN_TOKEN: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  LIVE_ENABLED: string;
  DELIVERY_ENABLED?: string;
  SCHEDULE_ENABLED?: string;
  WEEKLY?: Workflow<{week:string}>;
  DISCORD_WEBHOOK_URL?: string;
}
export class PaperProbe extends WorkflowEntrypoint<Env, ProbeRequest> {
  async run(event: WorkflowEvent<ProbeRequest>, step: WorkflowStep) {
    const id = event.instanceId;
    try {
      await step.do("start", () => setJob(this.env.DB, id, "running"));
      for (const paperId of event.payload.paper_ids) {
        const source = await step.do(`source-${paperId}`, { retries: { limit: 2, delay: "5 seconds", backoff: "exponential" } }, async () => {
          const value = await collectSource(paperId);
          await this.env.DB.prepare("INSERT OR REPLACE INTO probe_sources(job_id,paper_id,source_json) VALUES(?,?,?)").bind(id, paperId, JSON.stringify(value)).run();
          return value;
        });
        await step.do(`summary-${paperId}`, { retries: { limit: 0, delay: "1 second" }, timeout: "2 minutes" }, async () => {
          const cached = await cachedCall(this.env.DB, id, paperId);
          if (cached) return { cached: true };
          if (this.env.LIVE_ENABLED !== "true" || !this.env.OPENAI_API_KEY) throw new ProbeError("live_disabled");
          if (!evidenceCandidates(source).length) throw new ProbeError("body_unavailable");
          if (!await reserveCall(this.env.DB, id, paperId)) throw new ProbeError("call_budget_or_duplicate");
          try {
            const result = await summarize(source, this.env.OPENAI_API_KEY, this.env.OPENAI_MODEL || MODEL);
            await this.env.DB.prepare("UPDATE probe_calls SET status=?,result_json=? WHERE job_id=? AND paper_id=?").bind(result.validation_error ? "rejected" : "complete", JSON.stringify(result), id, paperId).run();
            if (result.validation_error) throw new ProbeError(result.validation_error);
          } catch (error) {
            await this.env.DB.prepare("UPDATE probe_calls SET status='unknown' WHERE job_id=? AND paper_id=? AND status='in_flight'").bind(id, paperId).run();
            throw error;
          }
          return { stored: true };
        });
      }
      await step.do("complete", () => setJob(this.env.DB, id, "complete"));
      return { id, status: "complete", needs_review: true, discord_posted: false };
    } catch (error) {
      const code = errorCode(error);
      await step.do("record-failure", () => setJob(this.env.DB, id, "blocked", code));
      throw new NonRetryableError(code);
    }
  }
}

export default {
  async scheduled(event: ScheduledController, env: Env): Promise<void> {
    await runConceptSchedule(env, new Date(event.scheduledTime));
    if (env.SCHEDULE_ENABLED !== "true") return;
    await startWeekly(env, lastClosedHfWeek(new Date(event.scheduledTime)));
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    // All routes are private, including status and source excerpts.
    if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24 || request.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const concept = await conceptRoute(request, env);
    if (concept) return concept;
    const url = new URL(request.url);
    try {
      const sourceProbe = /^\/diagnostics\/sources\/(\d{4}\.\d{4,5}(?:v\d+)?)$/.exec(url.pathname);
      if (sourceProbe && request.method === "POST") {
        const phase = url.searchParams.get("phase");
        if (phase === "metadata" || phase === "download") {
          const target = phase === "metadata" ? `https://huggingface.co/api/papers/${sourceProbe[1]}` : `https://arxiv.org/html/${sourceProbe[1]}`;
          const bytes = await readBounded(await fetchSource(target), phase === "metadata" ? 128000 : 1500000);
          if (phase === "metadata") JSON.parse(new TextDecoder().decode(bytes));
          return Response.json({phase,bytes:bytes.byteLength});
        }
        const source = await collectSource(sourceProbe[1]);
        return Response.json({paper_id:source.paper_id,coverage:source.coverage,body_bytes:source.body_bytes,
          paragraph_count:source.paragraphs.length,input_chars:source.paragraphs.reduce((n,p)=>n+p.text.length,0)});
      }
      const delivery = /^\/weeks\/(20\d{2}-W\d{2})\/(preview|publish)$/.exec(url.pathname);
      if (delivery) {
        const edition = await readEdition(env.DB, delivery[1]);
        if (!edition) return Response.json({error:"not_found"},{status:404});
        if (delivery[2] === "preview" && request.method === "GET") return Response.json(await renderEdition(env.DB, edition));
        if (delivery[2] === "publish" && request.method === "POST") {
          if (env.DELIVERY_ENABLED !== "true" || !env.DISCORD_WEBHOOK_URL) return Response.json({error:"delivery_disabled"},{status:403});
          return Response.json(await deliverEdition(env.DB, edition, env.DISCORD_WEBHOOK_URL));
        }
        return Response.json({error:"not_found"},{status:404});
      }
      const weekly = /^\/weeks\/(20\d{2}-W\d{2})(\/generate)?$/.exec(url.pathname);
      if (weekly) {
        const week = weekly[1];
        if (request.method === "GET" && !weekly[2]) {
          const edition = await readEdition(env.DB, week);
          return edition ? Response.json(await editionStatus(env.DB, edition)) : Response.json({error:"not_found"}, {status:404});
        }
        if (request.method === "POST") {
          if (weekly[2] && env.LIVE_ENABLED !== "true") return Response.json({error:"live_disabled"}, {status:403});
          const edition = await captureEdition(env.DB, week, env.OPENAI_MODEL || MODEL);
          return Response.json(weekly[2] ? {edition, jobs:await generateEdition(env, edition)} : edition);
        }
      }
      if (request.method === "POST" && /^\/probes\/probe-[a-f0-9]{32}\/retry-sources$/.test(url.pathname)) {
        if (env.LIVE_ENABLED !== "true") return Response.json({ error: "live_disabled" }, { status: 403 });
        const id = url.pathname.split("/")[2];
        const result = await env.DB.prepare(`UPDATE probe_jobs SET status='queued',error_code=NULL
          WHERE id=? AND status='blocked'
          AND NOT EXISTS(SELECT 1 FROM probe_calls WHERE job_id=?)`).bind(id, id).run();
        if (result.meta.changes !== 1) return Response.json({ error: "retry_requires_review" }, { status: 409 });
        try { await (await env.PROBE.get(id)).restart(); }
        catch {
          await setJob(env.DB, id, "dispatch_unknown", "dispatch_unknown");
          return Response.json({ error: "dispatch_unknown" }, { status: 503 });
        }
        return Response.json({ id, restarted: true }, { status: 202 });
      }
      if (request.method === "GET" && /^\/probes\/probe-[a-f0-9]{32}$/.test(url.pathname)) {
        const id = url.pathname.split("/")[2];
        const job = await env.DB.prepare("SELECT * FROM probe_jobs WHERE id=?").bind(id).first();
        if (!job) return Response.json({ error: "not_found" }, { status: 404 });
        const sources = await env.DB.prepare("SELECT paper_id,source_json FROM probe_sources WHERE job_id=?").bind(id).all();
        const calls = await env.DB.prepare("SELECT paper_id,status,result_json FROM probe_calls WHERE job_id=?").bind(id).all();
        return Response.json({ job, sources: sources.results, calls: calls.results });
      }
      if (request.method !== "POST" || url.pathname !== "/probes") return Response.json({ error: "not_found" }, { status: 404 });
      if (env.LIVE_ENABLED !== "true") return Response.json({ error: "live_disabled" }, { status: 403 });
      const payload = parseRequest(JSON.parse(new TextDecoder().decode(await readBounded(new Response(request.body), 2048))));
      const id = await jobId(payload, env.OPENAI_MODEL || MODEL);
      const inserted = await env.DB.prepare("INSERT OR IGNORE INTO probe_jobs(id,request_json,status) VALUES(?,?,'queued')").bind(id, JSON.stringify(payload)).run();
      if (inserted.meta.changes === 0) return Response.json({ id, duplicate: true }, { status: 200 });
      try { await env.PROBE.create({ id, params: payload }); }
      catch {
        await setJob(env.DB, id, "dispatch_unknown", "dispatch_unknown");
        return Response.json({ id, error: "dispatch_unknown" }, { status: 503 });
      }
      return Response.json({ id, duplicate: false }, { status: 202 });
    } catch (error) {
      const code = error instanceof SyntaxError ? "invalid_json" : errorCode(error);
      return Response.json({ error: code }, { status: code === "internal_error" ? 500 : 400 });
    }
  },
} satisfies ExportedHandler<Env>;
