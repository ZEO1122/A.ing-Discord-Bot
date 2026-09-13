import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { beforeAll, afterEach, expect, it, vi } from "vitest";
import { captureEdition, generateEdition, readEdition } from "../src/weekly";
import type { Env } from "../src/index";
const bindings = env as unknown as Env & {TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1]};
const feed = ["2609.10003", "2609.10001", "2609.10002"].map((id, i) => ({paper:{id,title:`Paper ${i}`,upvotes:30-i}}));
beforeAll(async () => applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS));
afterEach(async () => { vi.unstubAllGlobals(); await bindings.DB.exec("DELETE FROM weekly_editions; DELETE FROM probe_calls; DELETE FROM probe_sources; DELETE FROM probe_jobs;"); });
it("preserves API ranking and freezes the first snapshot without refetching", async () => {
  const fetcher = vi.fn(async (url: string) => {
    expect(url).toBe("https://huggingface.co/api/daily_papers?week=2026-W37&limit=3");
    return Response.json(feed);
  });
  vi.stubGlobal("fetch", fetcher);
  const edition = await captureEdition(bindings.DB, "2026-W37");
  expect(edition.papers.map(p => p.paper_id)).toEqual(feed.map(p => p.paper.id));
  expect(await captureEdition(bindings.DB, "2026-W37")).toEqual(edition);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not freeze incomplete or duplicate rankings", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(feed.slice(0, 2))));
  await expect(captureEdition(bindings.DB,"2026-W37")).rejects.toThrow("weekly_incomplete");
  expect(await readEdition(bindings.DB,"2026-W37")).toBeNull();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json([feed[0],feed[0],feed[2]])));
  await expect(captureEdition(bindings.DB,"2026-W37")).rejects.toThrow("invalid_weekly_metadata");
});
it("isolates dispatch failures and never redispatches uncertain or existing jobs", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(feed)));
  const edition=await captureEdition(bindings.DB,"2026-W37");
  const create=vi.fn().mockRejectedValueOnce(new Error("connection lost")).mockResolvedValue({});
  const testEnv={...bindings, PROBE:{create} as unknown as Env["PROBE"]};
  const first=await generateEdition(testEnv,edition);
  expect(first[0].error).toBe("dispatch_unknown");
  expect(create).toHaveBeenCalledTimes(3);
  const second=await generateEdition(testEnv,edition);
  expect(second.every(p=>p.duplicate)).toBe(true);
  expect(create).toHaveBeenCalledTimes(3);
});
it("concurrent capture returns one winning snapshot", async () => {
  let n=0;
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json(feed.map(p=>({paper:{...p.paper,upvotes:++n}})))));
  const results=await Promise.all([captureEdition(bindings.DB,"2026-W37"),captureEdition(bindings.DB,"2026-W37")]);
  expect(results[0]).toEqual(results[1]);
});
it("blocks a pending job if its captured pipeline revision no longer matches",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json(feed)));
 const edition=await captureEdition(bindings.DB,"2026-W37");
 edition.papers[0].job_id="probe-old-revision";
 const create=vi.fn().mockResolvedValue({});
 const results=await generateEdition({...bindings,PROBE:{create} as unknown as Env["PROBE"]},edition);
 expect(results[0].error).toBe("edition_revision_changed");
 expect(create).toHaveBeenCalledTimes(2);
 expect(await bindings.DB.prepare("SELECT status,error_code FROM probe_jobs WHERE id='probe-old-revision'").first()).toEqual({status:"blocked",error_code:"edition_revision_changed"});
});
