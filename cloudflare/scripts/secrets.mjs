// Send secret values only over stdin; never pass them as command arguments.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

try {
  process.loadEnvFile(".env");
  const discordOnly = process.argv.includes("--discord");
  const conceptOnly = process.argv.includes("--concept");
  if (discordOnly && conceptOnly) throw new Error("choose_one_destination");
  if (conceptOnly && !process.env.CONCEPT_WEBHOOK_URL) throw new Error("missing_concept_webhook");
  if (discordOnly && !process.env.DISCORD_WEBHOOK_URL) throw new Error("missing_webhook");
  if (!discordOnly && !conceptOnly && !process.env.OPENAI_API_KEY) throw new Error("missing_key");
  await mkdir("cloudflare/.wrangler", { recursive: true });
  const path = "cloudflare/.wrangler/admin-token";
  let token;
  try { token = (await readFile(path, "utf8")).trim(); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    token = randomBytes(32).toString("hex");
    await writeFile(path, token, { mode: 0o600, flag: "wx" });
  }
  if (token.length < 24) throw new Error("invalid_admin_token");
  const child = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "secret", "bulk", "--config", "cloudflare/wrangler.jsonc"], {
    stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, WRANGLER_LOG: "error", WRANGLER_SEND_METRICS: "false" },
  });
  // Even CLI diagnostics are not echoed: errors may include request data.
  child.stdout.resume(); child.stderr.resume();
  child.stdin.on("error", () => {});
  child.stdin.end(JSON.stringify(conceptOnly ? {CONCEPT_WEBHOOK_URL: process.env.CONCEPT_WEBHOOK_URL} : discordOnly ? {DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL} : { OPENAI_API_KEY: process.env.OPENAI_API_KEY, ADMIN_TOKEN: token }));
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  if (code !== 0) throw new Error("upload_failed");
  console.log(conceptOnly ? "Cloudflare Secrets configured: CONCEPT_WEBHOOK_URL (value hidden)" : discordOnly ? "Cloudflare Secrets configured: DISCORD_WEBHOOK_URL (value hidden)" : "Cloudflare Secrets configured: OPENAI_API_KEY, ADMIN_TOKEN (values hidden)");
} catch {
  console.error("Secret setup failed; no secret values were printed.");
  process.exitCode = 1;
}
