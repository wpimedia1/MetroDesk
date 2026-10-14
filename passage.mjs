// Exact-passage matching that tolerates formatting only: Unicode compatibility forms,
// typographic quotes and dashes, whitespace runs (PDF text is joined with spaces) and table cell borders
// (adjacent "|" separators, as at a Markdown row boundary, count as one).
// Wording, punctuation otherwise and letter case must still match.
export function normalizePassage(value){
 return String(value??'').normalize('NFKC')
  .replace(/[‘’‚‛′]/g,"'")
  .replace(/[“”„‟″]/g,'"')
  .replace(/[‐-―−]/g,'-')
  .replace(/­/g,'')
  .replace(/\s+/g,' ')
  .replace(/\|(?: ?\|)+/g,'|').trim();
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
// Repairs a misquote on the first try: finds the window of the source, of the quote's length in words, that shares
// the most words with the quote. A window sharing at least `threshold` of the quote's words is returned as the
// source's own text (so it is an exact passage); otherwise null, and the citation is marked unverified.
export function closestPassage(content,quote,{threshold=0.7,minWords=4}={}){
 const key=w=>w.toLowerCase().replace(/[^\p{L}\p{N}$%]/gu,'');
 const want=normalizePassage(quote).split(' ').filter(w=>key(w));
 if(want.length<minWords)return null;
 let best=null;
 for(const text of [normalizePassage(content),normalizePassage(stripLinkMarkup(content))]){
  const words=text.split(' ');if(words.length<want.length)continue;
  const need=new Map();for(const w of want){const k=key(w);need.set(k,(need.get(k)||0)+1);}
  const have=new Map();let shared=0;
  const add=(w,d)=>{const k=key(w);if(!need.has(k))return;const before=have.get(k)||0,after=before+d;have.set(k,after);const n=need.get(k);shared+=Math.min(after,n)-Math.min(before,n);};
  for(let i=0;i<words.length;i++){
   add(words[i],1);if(i>=want.length)add(words[i-want.length],-1);
   if(i>=want.length-1){const score=shared/want.length;if(!best||score>best.score)best={score,passage:words.slice(i-want.length+1,i+1).join(' ')};}
  }
 }
 if(!best||best.score<threshold)return null;
 // Trim a ragged edge so the passage starts and ends on a word the quote used.
 const words=best.passage.split(' '),wanted=new Set(want.map(key));
 while(words.length>minWords&&!wanted.has(key(words[0])))words.shift();
 while(words.length>minWords&&!wanted.has(key(words.at(-1))))words.pop();
 const passage=words.join(' ');
 return passageFound(content,passage)?{passage,score:Math.round(best.score*100)/100}:null;
}
