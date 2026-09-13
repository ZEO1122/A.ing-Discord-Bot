import { expect, it, vi, afterEach } from "vitest";
import { extractParagraphs, collectSource, stripInlineMarkup, omitMath } from "../src/sources";
import { attachEvidence, evidenceCandidates } from "../src/evidence";
import type {Source} from "../src/domain";
afterEach(()=>vi.unstubAllGlobals());
it("omits MathML without exposing formulas and preserves surrounding prose",()=>{
  expect(omitMath("Before <math><mi>x</mi></math> after <MATH>y</MATH>."))
    .toBe("Before  [formula omitted]  after  [formula omitted] .");
  expect(omitMath("Before <math>unclosed formula"))
    .toBe("Before  [formula omitted] ");
  expect(omitMath("Plain prose")).toBe("Plain prose");
});
it("selects evidence from original sentences and ignores model-supplied quote text",()=>{
  const source={paragraphs:[{id:"p1",text:"This is a complete original sentence. A second original sentence follows."}]} as Source;
  const result=attachEvidence({claims:[{text:"주장",evidence_id:"p1.s1",quote:"fabricated"}]},source);
  expect(result.claims[0].quote).toBe("This is a complete original sentence.");
  expect(()=>attachEvidence({claims:[{text:"주장",evidence_id:"missing"}]},source)).toThrow("evidence_mismatch");
  expect(evidenceCandidates(source)).toHaveLength(2);
});
it("samples across sections instead of filling the budget from the introduction",async()=>{
  const p=(text:string)=>`<p class="ltx_p">${text}</p>`;
  const html=`<article><h2 class="ltx_title">Introduction</h2>${Array(8).fill(p("Introduction sentence. ".repeat(80))).join("")}<h2 class="ltx_title">Limitations</h2>${p("The limitations are important to understanding the evaluation. ".repeat(20))}</article>`;
  const paragraphs=await extractParagraphs(new TextEncoder().encode(html));
  expect(paragraphs.some(p=>p.text.startsWith("The limitations"))).toBe(true);
  expect(paragraphs.reduce((n,p)=>n+p.text.length,0)).toBeLessThanOrEqual(12000);
});
it("marks oversized-body fallback as abstract without pretending to read full text",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(Response.json({id:"2609.10001",title:"Fixture",publishedAt:"2026-09-10",summary:"The abstract provides a limited description of the method and evaluation. ".repeat(3)})).mockResolvedValueOnce(new Response("oversized",{headers:{"content-type":"text/html","content-length":"2000000"}})));
  const source=await collectSource("2609.10001");
  expect(source.coverage).toBe("abstract");
  expect(source.fallback_reason).toBe("response_too_large");
  expect(source.body_bytes).toBe(0);
});
it("does not use omitted formula text as quotation evidence",()=>{
 const source={paragraphs:[{id:"p1",text:"The result is [formula omitted] under these conditions. A separate original sentence remains available."}]} as Source;
 const candidates=evidenceCandidates(source);
 expect(candidates).toHaveLength(1);
 expect(candidates[0].quote).toBe("A separate original sentence remains available.");
});

it("preserves escaped text and handles quoted tag attributes when stripping inline markup",()=>{
 expect(stripInlineMarkup('A <span title="a > b">study &amp; result</span><!-- hidden -->.')).toBe("A study &amp; result.");
});

it("keeps decimal evaluation scores inside complete evidence sentences",()=>{
 const source={paragraphs:[{id:"p1",text:"The evaluation improved from 58.94 to 64.87 points. A second sentence describes the comparison."}]} as Source;
 const candidates=evidenceCandidates(source);
 expect(candidates[0].quote).toBe("The evaluation improved from 58.94 to 64.87 points.");
 expect(candidates).toHaveLength(2);
});
it("samples late paragraphs of a section instead of keeping only its first five",async()=>{
 const html='<article><h2 class="ltx_title">Method</h2>'+Array.from({length:10},(_,i)=>`<p class="ltx_p">${i===9?'Final correction mechanism. ':'Early background explanation. '}${'A complete descriptive sentence about this method. '.repeat(5)}</p>`).join('')+'</article>';
 const paragraphs=await extractParagraphs(new TextEncoder().encode(html));
 expect(paragraphs.some(p=>p.text.startsWith('Final correction mechanism.'))).toBe(true);
});
