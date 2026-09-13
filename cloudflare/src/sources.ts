import { decodeHTML } from "entities";
import { MAX_INPUT_CHARS, normalized, PAPER_ID, ProbeError, type Paragraph, type Source } from "./domain";
import { fetchSource, readBounded } from "./network";

// Strip markup from already bounded paragraph fragments; preserve entity escapes for
// the entity decoder to decode. Quoted '>' attributes and comments are handled explicitly.
export function stripInlineMarkup(raw: string): string {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < raw.length) {
    const start = raw.indexOf("<", cursor);
    if (start < 0) { parts.push(raw.slice(cursor)); break; }
    parts.push(raw.slice(cursor, start));
    if (raw.startsWith("<!--", start)) {
      const end = raw.indexOf("-->", start + 4);
      if (end < 0) break;
      cursor = end + 3; continue;
    }
    let quote = "", end = start + 1;
    for (; end < raw.length; end++) {
      const c = raw[end];
      if (quote) { if (c === quote) quote = ""; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (end === raw.length) break;
    cursor = end + 1;
  }
  return parts.join("");
}
export function omitMath(raw: string): string {
  const lower = raw.toLowerCase();
  const opening = /<math\b/gi;
  const parts: string[] = [];
  let cursor = 0, match: RegExpExecArray | null;
  while ((match = opening.exec(raw))) {
    parts.push(raw.slice(cursor, match.index), " [formula omitted] ");
    const end = lower.indexOf("</math>", opening.lastIndex);
    if (end < 0) { cursor = raw.length; break; }
    cursor = end + 7;
    opening.lastIndex = cursor;
  }
  if (!parts.length) return raw;
  parts.push(raw.slice(cursor));
  return parts.join("");
}
export async function extractParagraphs(html: Uint8Array): Promise<Paragraph[]> {
  const original = new TextDecoder().decode(html);
  // MathML is excluded explicitly; its omission marker is never quotation evidence.
  const prose = omitMath(original);
  const lower = prose.toLowerCase();
  const articleStart = lower.indexOf("<article");
  const articleEnd = lower.indexOf("</article>", articleStart);
  if (articleStart < 0 || articleEnd < 0) throw new ProbeError("body_unavailable");
  const sections = new Map<string, string[]>([["overview", []]]);
  let section = "overview";
  const tags = /<(p|h[1-6])\b([^>]*)>/gi;
  tags.lastIndex = articleStart;
  let match: RegExpExecArray | null;
  // Select complete paragraph fragments with native string operations before invoking
  // the entity decoder. Advancing past each closing tag avoids repeated suffix scanning.
  while ((match = tags.exec(prose)) && match.index < articleEnd) {
    const closing = `</${match[1].toLowerCase()}>`;
    const end = lower.indexOf(closing, tags.lastIndex);
    if (end < 0 || end > articleEnd) break;
    const raw = prose.slice(tags.lastIndex, end);
    tags.lastIndex = end + closing.length;
    if (match[1].toLowerCase() !== "p") {
      if (match[2].includes("ltx_title") && sections.size < 12) {
        section = `section-${sections.size}`;
        sections.set(section, []);
      }
    } else if (match[2].includes("ltx_p") && raw.length <= 12000) {
      const bucket = sections.get(section)!;
      if (bucket.length < 40) bucket.push(raw);
    }
  }
  const selected: string[] = [];
  let rawSize = 0;
  for (let offset = 0; offset < 5; offset++) {
    for (const bucket of sections.values()) {
      const raw = bucket.length <= 5 ? bucket[offset] : bucket[Math.round(offset * (bucket.length - 1) / 4)];
      if (raw && rawSize + raw.length <= 36000 && selected.length < 30) {
        selected.push(raw); rawSize += raw.length;
      }
    }
  }
  const paragraphs: Paragraph[] = [];
  let total = 0;
  for (const raw of selected) {
    const value = normalized(decodeHTML(stripInlineMarkup(raw)));
    if (value.length >= 80 && value.length <= 4000 && total + value.length <= MAX_INPUT_CHARS) {
      paragraphs.push({id:`p${paragraphs.length+1}`,text:value}); total += value.length;
    }
  }
  if (paragraphs.length < 3 || total < 1000) throw new ProbeError("body_unavailable");
  return paragraphs;
}
export async function collectSource(paperId: string): Promise<Source> {
  if (!PAPER_ID.test(paperId)) throw new ProbeError("invalid_paper_ids");
  const metadataUrl = `https://huggingface.co/api/papers/${paperId.replace(/v\d+$/, "")}`;
  const metadata = JSON.parse(new TextDecoder().decode(await readBounded(await fetchSource(metadataUrl), 128000))) as Record<string, unknown>;
  if (metadata.id !== paperId.replace(/v\d+$/, "") || typeof metadata.title !== "string" || !metadata.title.trim() || metadata.title.length > 1000 ||
      typeof metadata.publishedAt !== "string" || !Number.isFinite(Date.parse(metadata.publishedAt))) {
    throw new ProbeError("invalid_source_metadata");
  }
  const bodyUrl = `https://arxiv.org/html/${paperId}`;
  const base = {
    paper_id: paperId, title: metadata.title, published_at: metadata.publishedAt,
    metadata_url: metadataUrl, body_url: bodyUrl, fetched_at: new Date().toISOString(),
  };
  try {
    const response = await fetchSource(bodyUrl);
    if (!response.headers.get("content-type")?.includes("text/html")) {
      await response.body?.cancel();
      throw new ProbeError("body_not_html");
    }
    const html = await readBounded(response, 1500000);
    return { ...base, coverage: "body_excerpt", body_bytes: html.byteLength, paragraphs: await extractParagraphs(html) };
  } catch (error) {
    // Only known unavailable/unsupported body cases can fall back. Transient failures retry.
    const code = error instanceof ProbeError ? error.code : "internal_error";
    if (!["response_too_large", "body_unavailable", "body_not_html", "source_http_404"].includes(code)) throw error;
    if (typeof metadata.summary !== "string" || metadata.summary.trim().length < 100) throw error;
    return { ...base, coverage: "abstract", fallback_reason: code, body_bytes: 0,
      paragraphs: [{ id: "abstract", text: normalized(metadata.summary).slice(0, MAX_INPUT_CHARS) }] };
  }
}
