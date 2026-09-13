// No secrets or external API calls. Restart the runtime and verify D1 retention.
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { randomUUID } from "node:crypto";
const marker = randomUUID();
for (let iteration = 0; iteration < 2; iteration++) {
  const runtime = new Miniflare(convertV4MiniflareOptions({
    cf: false, name: "probe-persistence-check", modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    compatibilityDate: "2026-09-13", d1Databases: ["DB"],
    resourcePersistencePath: "cloudflare/.wrangler/persistence-check",
  }));
  try {
    const db = await runtime.getD1Database("DB");
    await db.prepare("CREATE TABLE IF NOT EXISTS persistence_checks(id TEXT PRIMARY KEY)").run();
    if (iteration === 0) await db.prepare("INSERT INTO persistence_checks VALUES(?)").bind(marker).run();
    if (!await db.prepare("SELECT id FROM persistence_checks WHERE id=?").bind(marker).first()) throw new Error("D1 state lost after restart");
    if (iteration === 1) await db.prepare("DELETE FROM persistence_checks WHERE id=?").bind(marker).run();
  } finally { await runtime.dispose(); }
}
console.log("D1 persistence across runtime restart: passed (no API calls)");
