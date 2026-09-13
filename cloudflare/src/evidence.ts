import type { Source } from "./domain";
import { normalized, ProbeError } from "./domain";

// The model selects an existing source sentence; it never writes the quoted text.
export function evidenceCandidates(source: Source) {
  return source.paragraphs.flatMap(p => {
    const sentences = normalized(p.text).split(/(?<=[.!?])\s+(?=[A-Z(])/u);
    return sentences.map(s => s.trim()).filter(s => s.length >= 12 && s.length <= 500 && !s.includes("[formula omitted]"))
      .slice(0, 3).map((quote, index) => ({id:`${p.id}.s${index+1}`, paragraph_id:p.id, quote}));
  }).slice(0, 60);
}
export function attachEvidence(raw: unknown, source: Source) {
  const value = raw as {summary:string;limitations:string;claims:{text:string;evidence_id:string}[];results?:{text:string;evidence_id:string}[];differences?:{text:string;evidence_id:string}[]};
  if(!value || !Array.isArray(value.claims)) throw new ProbeError("invalid_brief");
  const candidates=evidenceCandidates(source);
  const attach = (claims:{text:string;evidence_id:string}[]) => claims.map(claim=>{
    const evidence=candidates.find(c=>c.id===claim.evidence_id);
    if(!evidence)throw new ProbeError("evidence_mismatch");
    return {text:claim.text,evidence_id:evidence.paragraph_id,quote:evidence.quote};
  });
  if (value.differences !== undefined && !Array.isArray(value.differences)) throw new ProbeError("invalid_brief");
  if (value.results !== undefined && !Array.isArray(value.results)) throw new ProbeError("invalid_brief");
  return {...value, claims:attach(value.claims), ...(value.results !== undefined ? {results:attach(value.results)} : {}), ...(value.differences !== undefined ? {differences:attach(value.differences)} : {})};
}
