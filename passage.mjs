// Exact-passage matching that tolerates formatting only: Unicode compatibility forms,
// typographic quotes and dashes, and whitespace runs (PDF text is joined with spaces).
// Wording, punctuation otherwise and letter case must still match.
export function normalizePassage(value){
 return String(value??'').normalize('NFKC')
  .replace(/[‘’‚‛′]/g,"'")
  .replace(/[“”„‟″]/g,'"')
  .replace(/[‐-―−]/g,'-')
  .replace(/­/g,'')
  .replace(/\s+/g,' ').trim();
}
// Extracted web pages keep markdown link and image code; readers (and models) quote the visible text.
export function stripLinkMarkup(text){
 return String(text??'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1');
}
// A quote matches when it is one verbatim passage, or verbatim excerpts joined with "..." / "…" that each
// have at least 12 characters and appear in the source in the same order. Visible text after removing
// link markup is accepted as the source text.
export function passageFound(content,quote){
 const q=normalizePassage(quote);
 if(q.length<12)return false;
 const texts=[normalizePassage(content),normalizePassage(stripLinkMarkup(content))];
 if(texts.some(t=>t.includes(q)))return true;
 const parts=q.split(/\s*(?:\.\.\.|…)\s*/).map(x=>x.trim()).filter(Boolean);
 if(parts.length<2||parts.some(x=>x.length<12))return false;
 return texts.some(t=>{let from=0;for(const part of parts){const at=t.indexOf(part,from);if(at<0)return false;from=at+part.length;}return true;});
}
