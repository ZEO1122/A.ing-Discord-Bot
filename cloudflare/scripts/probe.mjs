// Runs the SAME Worker/Workflow against local persistent D1, or an authenticated
// remote Worker. Secrets are read into memory, never copied into build artifacts.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const { values } = parseArgs({ options: {
  ids: { type: "string" }, remote: { type: "string" }, resume: { type: "boolean", default: false },
}, strict: true });
try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const paperIds = values.ids?.split(",").map(s => s.trim());
if (!paperIds?.length || paperIds.length > 3 || paperIds.some(s => !/^\d{4}\.\d{4,5}(v\d+)?$/.test(s))) {
  console.error("사용법: npm run cf:probe -- --ids 2609.09143,2609.10745,2609.10445 [--remote https://...workers.dev]");
  process.exit(1);
}
let runtime;
try {
  let send;
  if (values.remote) {
    const url = new URL(values.remote);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".workers.dev") || url.username || url.password || url.search || url.hash) throw new Error("invalid_remote_url");
    const adminToken = process.env.PROBE_ADMIN_TOKEN || (await readFile("cloudflare/.wrangler/admin-token", "utf8")).trim();
    if (adminToken.length < 24) throw new Error("missing_PROBE_ADMIN_TOKEN");
    send = (path, init = {}) => fetch(new URL(path, url), { ...init, redirect: "error", signal: AbortSignal.timeout(30000), headers: { ...init.headers, Authorization: `Bearer ${adminToken}` } });
  } else {
    if (!process.env.OPENAI_API_KEY) throw new Error("missing_OPENAI_API_KEY");
    await build({ entryPoints: ["cloudflare/src/index.ts"], outfile: "cloudflare/dist/worker.mjs", bundle: true, format: "esm", platform: "neutral", external: ["cloudflare:*"] });
    const token = randomBytes(32).toString("hex");
    runtime = new Miniflare(convertV4MiniflareOptions({
      cf: false, name: "discord-study-probe", modules: true, scriptPath: "cloudflare/dist/worker.mjs", compatibilityDate: "2026-09-13",
      compatibilityFlags: ["nodejs_compat"],
      bindings: { ADMIN_TOKEN: token, OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1-mini-2025-04-14", LIVE_ENABLED: "true" },
      d1Databases: ["DB"], resourcePersistencePath: "cloudflare/.wrangler/probe-state",
      workflows: { PROBE: { name: "discord-study-probe", className: "PaperProbe" } },
    }));
    const db = await runtime.getD1Database("DB");
    const sql = await readFile("cloudflare/migrations/0001_probe.sql", "utf8");
    for (const statement of sql.replace(/^--.*$/gm, "").split(";").filter(s => s.trim())) await db.prepare(statement).run();
    send = (path, init = {}) => runtime.dispatchFetch(`http://probe.local${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  }
  const response = await send("/probes", { method: "POST", body: JSON.stringify({ paper_ids: paperIds }), headers: { "Content-Type": "application/json" } });
  const start = await response.json();
  if (!response.ok || !start.id) throw new Error(`probe_start_${response.status}`);
  console.log(JSON.stringify({ id: start.id, duplicate: start.duplicate, runtime: values.remote ? "cloudflare" : "local-workerd", discord_posted: false }));
  if (values.resume && start.duplicate) {
    const retry = await send(`/probes/${start.id}/retry-sources`, { method: "POST" });
    if (!retry.ok) throw new Error(`probe_start_${retry.status}`);
    console.log(JSON.stringify({ id: start.id, source_only_retry: true }));
  }
  let report;
  for (let attempt = 0; attempt < 120; attempt++) {
    const status = await send(`/probes/${start.id}`);
    if (!status.ok) throw new Error(`probe_status_${status.status}`);
    report = await status.json();
    if (["complete", "blocked", "dispatch_unknown"].includes(report.job.status)) break;
    await new Promise(r => setTimeout(r, 2000));
  }
  await mkdir("artifacts/cloudflare", { recursive: true });
  const destination = resolve(`artifacts/cloudflare/${values.remote ? "remote" : "local"}-${start.id}.json`);
  await writeFile(destination, JSON.stringify({ runtime: values.remote ? "cloudflare" : "local-workerd", cpu_limit_verified: false, measured_at: new Date().toISOString(), ...report }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ status: report.job.status, error_code: report.job.error_code, calls: report.calls.map(c => ({ paper_id: c.paper_id, status: c.status, usage: c.result_json ? JSON.parse(c.result_json).usage : null })), report: destination }));
  if (report.job.status !== "complete") process.exitCode = 1;
} catch (error) {
  // Do not print raw API response bodies, headers, request objects, or stack traces.
  console.error(JSON.stringify({ error: "probe_runner_failed", kind: error?.constructor?.name ?? "Error", code: /^(probe_start_\d{3}|probe_status_\d{3}|missing_OPENAI_API_KEY|missing_PROBE_ADMIN_TOKEN|invalid_remote_url)$/.test(error?.message) ? error.message : "internal_error" }));
  process.exitCode = 1;
} finally { await runtime?.dispose(); }
