import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: "./cloudflare/wrangler.jsonc" },
    miniflare: { bindings: {
      ADMIN_TOKEN: "test-only-admin-token-never-deployed",
      OPENAI_API_KEY: "test-only-no-real-api-key",
      LIVE_ENABLED: "true",
      DELIVERY_ENABLED: "true",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/test_only_no_real_secret",
      TEST_MIGRATIONS: await readD1Migrations("./cloudflare/migrations"),
    } },
  })],
  test: { include: ["cloudflare/tests/**/*.test.ts"], testTimeout: 30000 },
});
