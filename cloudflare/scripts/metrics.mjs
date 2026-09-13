// Read-only metrics using Wrangler's existing OAuth session; never print tokens.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

try {
  const configPath = process.platform === "darwin"
    ? join(homedir(), "Library/Preferences/.wrangler/config/default.toml")
    : join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), ".wrangler/config/default.toml");
  const config = await readFile(configPath, "utf8");
  const token = /^oauth_token\s*=\s*"([^"\r\n]+)"/m.exec(config)?.[1];
  if (!token) throw new Error("missing_login");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const accountsResponse = await fetch("https://api.cloudflare.com/client/v4/accounts", { headers });
  const accounts = await accountsResponse.json();
  if (!accounts.success || accounts.result.length !== 1) throw new Error("account_selection_required");
  const account = accounts.result[0].id;
  const plansResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/subscriptions`, { headers });
  const plans = await plansResponse.json();
  const query = `query($accountTag: string, $start: string, $end: string) {
    viewer { accounts(filter: {accountTag: $accountTag}) {
      workersInvocationsAdaptive(limit: 100, filter: {scriptName: "discord-study-probe", datetime_geq: $start, datetime_leq: $end}) {
        sum { requests errors } quantiles { cpuTimeP50 cpuTimeP99 } dimensions { scriptName status }
      }
      workflowsAdaptiveGroups(limit: 100, filter: {workflowName: "discord-study-probe", datetimeHour_geq: $start, datetimeHour_leq: $end}) {
        count sum { cpuTime wallTime stepCount } dimensions { instanceId eventType }
      }
    }}
  }`;
  const now = new Date();
  const metricsResponse = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST", headers, body: JSON.stringify({ query, variables: { accountTag: account,
      start: new Date(now.getTime() - 7200000).toISOString(), end: now.toISOString() } }),
  });
  const metrics = await metricsResponse.json();
  const report = {
    observed_at: now.toISOString(),
    plans_available: plans.success === true,
    plans: plans.success ? plans.result.map(p => ({ name: p.rate_plan?.public_name ?? p.rate_plan?.id ?? "unknown", price: p.price })) : [],
    metrics_available: !metrics.errors,
    metrics: metrics.errors ? null : metrics.data,
    metric_errors: metrics.errors?.map(e => String(e.message).slice(0, 200)) ?? [],
    note: "Sampled worker metrics; do not equate aggregate HTTP CPU metrics with every Workflow step.",
  };
  await mkdir("artifacts/cloudflare", { recursive: true });
  await writeFile("artifacts/cloudflare/metrics.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch { console.error("Metrics unavailable; inspect Cloudflare dashboard. No credentials printed."); process.exitCode = 1; }
