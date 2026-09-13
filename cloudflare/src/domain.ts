export const PAPER_ID = /^\d{4}\.\d{4,5}(v\d+)?$/;
export const MAX_INPUT_CHARS = 12000;
export const MAX_OUTPUT_TOKENS = 2600;
export const MAX_DAILY_CALLS = 6;
export const MODEL = "gpt-4.1-mini-2025-04-14";
export const REVISION = "probe-v12";

export class ProbeError extends Error {
  constructor(public readonly code: string) { super(code); }
}
export interface ProbeRequest { paper_ids: string[] }
export interface Paragraph { id: string; text: string }
export interface Source {
  paper_id: string;
  title: string;
  published_at: string;
  metadata_url: string;
  body_url: string;
  fetched_at: string;
  coverage: "body_excerpt" | "abstract";
  fallback_reason?: string;
  body_bytes: number;
  paragraphs: Paragraph[];
}
export interface Brief {
  schema_version?: 2 | 3;
  background?: string;
  results?: { text: string; evidence_id: string; quote: string }[];
  differences?: { text: string; evidence_id: string; quote: string }[];
  prerequisites?: { term: string; explanation: string }[];
  summary: string;
  claims: { text: string; evidence_id: string; quote: string }[];
  limitations: string;
}
export function parseRequest(raw: unknown): ProbeRequest {
  const ids = (raw as Partial<ProbeRequest> | null)?.paper_ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 ||
      ids.some(id => typeof id !== "string" || !PAPER_ID.test(id))) {
    throw new ProbeError("invalid_paper_ids");
  }
  return { paper_ids: [...new Set(ids)].sort() };
}
export async function jobId(request: ProbeRequest, model: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([REVISION, model, request.paper_ids]));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "probe-" + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
export function normalized(value: string): string { return value.replace(/\s+/g, " ").trim(); }
export function validateBrief(raw: unknown, source: Source, requireCurrent = false): Brief {
  const value = raw as Brief;
  if (!value || typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > 1000 ||
      typeof value.limitations !== "string" || (value.schema_version !== 3 && !value.limitations.trim()) || value.limitations.length > 800 ||
      !Array.isArray(value.claims) || value.claims.length < 1 || value.claims.length > 3) {
    throw new ProbeError("invalid_brief");
  }
  if (requireCurrent && value.schema_version !== 3) throw new ProbeError("invalid_brief");
  if (value.schema_version === 3) {
    if (value.summary.length > 220 || typeof value.background !== "string" || !value.background.trim() || value.background.length > 230 ||
      value.limitations.length > 150 || !Array.isArray(value.results) || value.results.length > 2 ||
      value.results.some(c => !c || typeof c.text !== "string" || c.text.length > 180) ||
      value.claims.some(c => !c || typeof c.text !== "string" || c.text.length > 200) ||
      !Array.isArray(value.prerequisites) || value.prerequisites.length < 2 || value.prerequisites.length > 3 ||
      value.prerequisites.some(p => !p || typeof p.term !== "string" || !p.term.trim() || p.term.length > 60 ||
        typeof p.explanation !== "string" || !p.explanation.trim() || p.explanation.length > 55)) throw new ProbeError("invalid_brief");
  } else if (value.schema_version !== undefined) {
    if (value.schema_version !== 2 || value.summary.length > 120 || value.limitations.length > 250 ||
        !Array.isArray(value.differences) || value.differences.length > 2 ||
        !Array.isArray(value.prerequisites) || value.prerequisites.length < 2 || value.prerequisites.length > 3 ||
        value.claims.some(c => typeof c.text !== "string" || c.text.length > 120) ||
        value.differences.some(c => typeof c.text !== "string" || c.text.length > 120) ||
        value.prerequisites.some(p => !p || typeof p.term !== "string" || !p.term.trim() || p.term.length > 40 ||
          typeof p.explanation !== "string" || !p.explanation.trim() || p.explanation.length > 100)) throw new ProbeError("invalid_brief");
  }
  if (value.schema_version === 3) {
    const texts = [value.summary, value.background!, ...value.claims.map(c=>c.text),
      ...value.results!.map(c=>c.text), ...value.prerequisites!.map(p=>p.explanation),
      ...(value.limitations ? [value.limitations] : [])];
    if (value.summary.split("\n").filter(line=>line.trim()).length !== 3 || texts.some(text=>{
      const letters = text.match(/[A-Za-z가-힣]/g)?.length ?? 0;
      const korean = text.match(/[가-힣]/g)?.length ?? 0;
      return !letters || korean/letters < 0.3 || !/[.!?]$/.test(text.trim());
    })) throw new ProbeError("invalid_brief");
  }
  for (const claim of [...value.claims, ...(value.schema_version === 2 ? value.differences! : []), ...(value.schema_version === 3 ? value.results! : [])]) {
    if (!claim || typeof claim.text !== "string" || !claim.text.trim() || claim.text.length > 500 ||
        typeof claim.quote !== "string" || normalized(claim.quote).length < 12 || claim.quote.length > 500) {
      throw new ProbeError("invalid_claim");
    }
    const paragraph = source.paragraphs.find(p => p.id === claim.evidence_id);
    if (!paragraph || !normalized(paragraph.text).includes(normalized(claim.quote))) {
      throw new ProbeError("evidence_mismatch");
    }
  }
  // Exact quotations establish provenance, not scientific correctness. Always review.
  return { summary: value.summary, claims: value.claims, limitations: value.limitations, ...(value.schema_version === 2 ? {schema_version: 2 as const, differences: value.differences, prerequisites: value.prerequisites} : value.schema_version === 3 ? {schema_version:3 as const, background:value.background, results:value.results, prerequisites:value.prerequisites} : {}) };
}
export function errorCode(error: unknown): string {
  if (error instanceof ProbeError) return error.code;
  // Workflow RPC serializes custom Error subclasses; recover only our safe codes.
  if (error instanceof Error && /^(edition_not_ready|delivery_disabled|discord_result_unknown|weekly_incomplete|invalid_weekly_metadata|edition_model_changed|dispatch_unknown|api_http_\d{3}|source_http_\d{3}|api_result_unknown|api_replay_requires_review|api_incomplete|source_network_error|body_unavailable|body_not_html|invalid_source_metadata|invalid_brief|invalid_claim|evidence_mismatch|response_too_large|empty_response|live_disabled|call_budget_or_duplicate)$/.test(error.message)) return error.message;
  return "internal_error";
}
