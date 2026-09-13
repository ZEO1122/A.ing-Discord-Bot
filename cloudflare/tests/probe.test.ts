import { env } from "cloudflare:workers";
import { applyD1Migrations, introspectWorkflowInstance } from "cloudflare:test";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";
import { jobId, MODEL, parseRequest, validateBrief, type Source } from "../src/domain";
import { readBounded } from "../src/network";
import { cachedCall, reserveCall } from "../src/repository";

// Explicit allowlist: an unmocked request fails instead of reaching a real API.
const pending: { url: string; method: string; status: number; body: string; headers: Record<string, string> }[] = [];
const fetchMock = {
  activate() {
    vi.stubGlobal("fetch", vi.fn(async (input: string | Request, init?: RequestInit) => {
      // Exercise workerd's Request option validation even though transport is mocked.
      new Request(input, init);
      const url = typeof input === "string" ? input : input.url;
      const method = init?.method ?? "GET";
      const index = pending.findIndex(p => p.url === url && p.method === method);
      if (index < 0) throw new Error("Unexpected test network request");
      const item = pending.splice(index, 1)[0];
      return new Response(item.body, { status: item.status, headers: item.headers });
    }));
  },
  disableNetConnect() {},
  deactivate() { vi.unstubAllGlobals(); pending.length = 0; },
  get(origin: string) {
    return { intercept({ path, method = "GET" }: { path: string; method?: string }) {
      return { reply(status: number, body: string, options?: { headers: Record<string, string> }) {
        pending.push({ url: origin + path, method, status, body, headers: options?.headers ?? {} });
      } };
    } };
  },
  assertNoPendingInterceptors() { expect(pending).toHaveLength(0); },
};
const bindings = env as unknown as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };
const auth = { Authorization: `Bearer ${bindings.ADMIN_TOKEN}`, "Content-Type": "application/json" };
const paperId = "2609.09143";
const paragraph = "This study compares image representations in a controlled setting. The reported measurements depend on the selected datasets and evaluation protocol. ";
const source: Source = {
  paper_id: paperId, title: "Fixture paper", published_at: "2026-09-08T00:00:00Z",
  metadata_url: `https://huggingface.co/api/papers/${paperId}`,
  body_url: `https://arxiv.org/html/${paperId}`, fetched_at: "2026-09-13T00:00:00Z",
  coverage: "body_excerpt", body_bytes: 1400,
  paragraphs: [{ id: "p1", text: paragraph.repeat(4) }, { id: "p2", text: paragraph.repeat(4) }, { id: "p3", text: paragraph.repeat(4) }],
};
const brief = {
  schema_version: 3 as const,
  background: "기존 표현 방식의 차이를 비교할 필요가 있습니다.",
  results: [],
  prerequisites: [{term:"표현",explanation:"데이터를 수치로 나타내는 방식입니다."},{term:"평가",explanation:"같은 조건에서 결과를 비교하는 과정입니다."}],
  summary: "이미지 표현을 비교합니다.\n통제된 조건을 사용합니다.\n평가 방법을 살펴봅니다.",
  claims: [{ text: "통제된 조건에서 표현을 비교합니다.", evidence_id: "p1", quote: "This study compares image representations in a controlled setting." }],
  limitations: "전체 실험과 일반화 성능은 이 발췌만으로 확인할 수 없습니다.",
};
async function post(ids: string[] = [paperId]) {
  return worker.fetch(new Request("https://probe.test/probes", { method: "POST", headers: auth, body: JSON.stringify({ paper_ids: ids }) }), bindings);
}
function mockSources() {
  fetchMock.get("https://huggingface.co").intercept({ path: `/api/papers/${paperId}` }).reply(200, JSON.stringify({ id: paperId, title: source.title, publishedAt: source.published_at }));
  fetchMock.get("https://arxiv.org").intercept({ path: `/html/${paperId}` }).reply(200, `<article>${source.paragraphs.map(p => `<p class="ltx_p">${p.text}</p>`).join("")}</article>`, { headers: { "content-type": "text/html" } });
}
beforeAll(async () => { await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS); });
beforeEach(() => { fetchMock.activate(); fetchMock.disableNetConnect(); });
afterEach(async () => {
  fetchMock.deactivate();
  await bindings.DB.exec("DELETE FROM probe_calls; DELETE FROM probe_sources; DELETE FROM probe_jobs;");
});

describe("probe invariants", () => {
  it("normalizes duplicate IDs but rejects URLs and oversized batches", async () => {
    expect(parseRequest({ paper_ids: [paperId, paperId] })).toEqual({ paper_ids: [paperId] });
    expect(() => parseRequest({ paper_ids: ["https://private.test"] })).toThrow();
    expect(() => parseRequest({ paper_ids: Array(4).fill(paperId) })).toThrow();
    expect(await jobId(parseRequest({ paper_ids: [paperId] }), MODEL)).toMatch(/^probe-[a-f0-9]{32}$/);
  });
  it("rejects fabricated citations even if valid JSON", () => {
    expect(validateBrief(brief, source)).toEqual(brief);
    expect(() => validateBrief({ ...brief, claims: [{ ...brief.claims[0], quote: "A completely invented measurement." }] }, source)).toThrow("evidence_mismatch");
    expect(() => validateBrief({ ...brief, claims: [{ ...brief.claims[0], evidence_id: "p99" }] }, source)).toThrow("evidence_mismatch");
  });
  it("bounds chunked responses without relying on content-length", async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(8)); c.enqueue(new Uint8Array(8)); c.close(); } });
    await expect(readBounded(new Response(stream), 12)).rejects.toThrow("response_too_large");
  });
  it("requires authentication before exposing any endpoint", async () => {
    const response = await worker.fetch(new Request("https://probe.test/probes", { method: "POST" }), bindings);
    expect(response.status).toBe(401);
    expect((await bindings.DB.prepare("SELECT COUNT(*) n FROM probe_jobs").first()).n).toBe(0);
  });
  it("reserves at most six calls and blocks unknown call replay", async () => {
    await bindings.DB.prepare("INSERT INTO probe_jobs(id,request_json,status) VALUES('budget','{}','running')").run();
    const reservations = await Promise.all(Array.from({ length: 10 }, (_, i) => reserveCall(bindings.DB, "budget", `paper-${i}`)));
    expect(reservations.filter(Boolean)).toHaveLength(6);
    await expect(cachedCall(bindings.DB, "budget", "paper-0")).rejects.toThrow("api_replay_requires_review");
  });
  it("executes actual Workflow + D1 and does not repeat the API on duplicate submission", async () => {
    const id = await jobId({ paper_ids: [paperId] }, MODEL);
    await using instance = await introspectWorkflowInstance(bindings.PROBE, id);
    await instance.modify(async m => { await m.disableRetryDelays(); });
    mockSources();
    fetchMock.get("https://api.openai.com").intercept({ path: "/v1/responses", method: "POST" }).reply(200, JSON.stringify({
      id: "response-fixture", status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...brief, claims: brief.claims.map(c => ({ text:c.text, evidence_id:"p1.s1" })) }) }] }],
      usage: { input_tokens: 800, output_tokens: 100, total_tokens: 900 },
    }));
    expect((await post()).status).toBe(202);
    await instance.waitForStatus("complete");
    expect(await (await post()).json()).toEqual({ id, duplicate: true });
    expect(await bindings.DB.prepare("SELECT status FROM probe_jobs WHERE id=?").bind(id).first()).toEqual({ status: "complete" });
    const cached = await cachedCall(bindings.DB, id, paperId);
    expect(cached.needs_review).toBe(true);
    expect(cached.usage.total_tokens).toBe(900);
    fetchMock.assertNoPendingInterceptors();
  });
  it("does not retry a failed billable call and records the blocked job", async () => {
    const id = await jobId({ paper_ids: [paperId] }, MODEL);
    await using instance = await introspectWorkflowInstance(bindings.PROBE, id);
    await instance.modify(async m => { await m.disableRetryDelays(); });
    mockSources();
    fetchMock.get("https://api.openai.com").intercept({ path: "/v1/responses", method: "POST" }).reply(503, "unavailable");
    await post();
    await instance.waitForStatus("errored");
    expect((await bindings.DB.prepare("SELECT status FROM probe_jobs WHERE id=?").bind(id).first()).status).toBe("blocked");
    expect((await bindings.DB.prepare("SELECT COUNT(*) n FROM probe_calls").first()).n).toBe(1);
    await expect(cachedCall(bindings.DB, id, paperId)).rejects.toThrow("api_replay_requires_review");
    fetchMock.assertNoPendingInterceptors();
  });
  it("retains usage for rejected evidence and refuses billable-job recovery", async () => {
    const id = await jobId({ paper_ids: [paperId] }, MODEL);
    await using instance = await introspectWorkflowInstance(bindings.PROBE, id);
    mockSources();
    const invalid = { ...brief, claims: [{ ...brief.claims[0], evidence_id: "p99.s1" }] };
    fetchMock.get("https://api.openai.com").intercept({ path: "/v1/responses", method: "POST" }).reply(200, JSON.stringify({
      id: "rejected-fixture", status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(invalid) }] }],
      usage: { input_tokens: 800, output_tokens: 100, total_tokens: 900 },
    }));
    await post();
    await instance.waitForStatus("errored");
    const call = await bindings.DB.prepare("SELECT status,result_json FROM probe_calls WHERE job_id=?").bind(id).first();
    expect(call.status).toBe("rejected");
    expect(JSON.parse(call.result_json as string)).toMatchObject({ brief: null, validation_error: "evidence_mismatch", usage: { total_tokens: 900 } });
    const retry = await worker.fetch(new Request(`https://probe.test/probes/${id}/retry-sources`, { method: "POST", headers: auth }), bindings);
    expect(retry.status).toBe(409);
    expect(await (await post()).json()).toEqual({ id, duplicate: true });
    fetchMock.assertNoPendingInterceptors();
  });
  it("disables new work without hiding existing authenticated results", async () => {
    const id = "probe-" + "a".repeat(32);
    await bindings.DB.prepare("INSERT INTO probe_jobs(id,request_json,status) VALUES(?,'{}','blocked')").bind(id).run();
    const disabled = { ...bindings, LIVE_ENABLED: "false" };
    const start = await worker.fetch(new Request("https://probe.test/probes", { method: "POST", headers: auth }), disabled);
    expect(start.status).toBe(403);
    const read = await worker.fetch(new Request(`https://probe.test/probes/${id}`, { headers: auth }), disabled);
    expect(read.status).toBe(200);
  });
  it("recovers a transient source failure before making a single API reservation", async () => {
    const id = await jobId({ paper_ids: [paperId] }, MODEL);
    await using instance = await introspectWorkflowInstance(bindings.PROBE, id);
    await instance.modify(async m => { await m.disableRetryDelays(); });
    fetchMock.get("https://huggingface.co").intercept({ path: `/api/papers/${paperId}` }).reply(503, "retry later");
    mockSources();
    fetchMock.get("https://api.openai.com").intercept({ path: "/v1/responses", method: "POST" }).reply(200, JSON.stringify({
      id: "retry-fixture", status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...brief, claims: brief.claims.map(c => ({ text:c.text, evidence_id:"p1.s1" })) }) }] }],
    }));
    await post();
    await instance.waitForStatus("complete");
    expect((await bindings.DB.prepare("SELECT COUNT(*) n FROM probe_calls").first()).n).toBe(1);
    fetchMock.assertNoPendingInterceptors();
  });
});

it("requires the new schema for fresh generation and validates comparison provenance",()=>{
 expect(()=>validateBrief({...brief,schema_version:undefined},source,true)).toThrow("invalid_brief");
 expect(()=>validateBrief({...brief,results:[{...brief.claims[0],quote:"Invented comparison not in the source."}]},source,true)).toThrow("evidence_mismatch");
 expect(()=>validateBrief({...brief,prerequisites:[]},source,true)).toThrow("invalid_brief");
});

it("blocks non-Korean or incomplete explanatory output before publishing",()=>{
 expect(()=>validateBrief({...brief,background:"An English paragraph that ends abruptly"},source,true)).toThrow("invalid_brief");
 expect(()=>validateBrief({...brief,summary:"한 줄만 있는 설명입니다."},source,true)).toThrow("invalid_brief");
});
