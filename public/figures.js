// Shared by the server and the browser. Dollar figures in prose come from the ledger: models write placeholders,
// the server renders them, and any allocated or reserve figure the model wrote anyway is checked against the ledger.
export const usd=n=>'$'+Number(n).toLocaleString('en-US');

// Ledger totals for a derived scenario (allocations and reserve are computed from line items by the server).
export function ledgerTotals(scenario,minimum=null){
 if(!scenario||!Array.isArray(scenario.allocations))return null;
 const allocated=scenario.allocations.reduce((t,a)=>t+(Number.isFinite(a?.amount_usd)?a.amount_usd:0),0);
 return {allocated,reserve:scenario.reserve_usd,budget:scenario.budget_usd,minimum,allocations:scenario.allocations.map(a=>({actor:a.actor,amount:a.amount_usd}))};
}

const moneyPattern=String.raw`\$\s?([\d,]+(?:\.\d+)?)\s*(million|thousand|M|K)?\b`;
function amount(n,unit){
 const digits=(n.split('.')[1]||'').length,scale=/^m/i.test(unit||'')?1e6:/^k|^thousand/i.test(unit||'')?1e3:1;
 return {value:Number(n.replace(/,/g,''))*scale,scale,digits,tolerance:scale===1?0.5:scale*0.5*10**-digits};
}
// Allocated and reserve amounts stated in prose, with their position in the text.
export function proseClaims(text){
 const claims=[],t=String(text||'');
 const add=(kind,m,group)=>{const full=m[0],at=m.index+full.lastIndexOf('$');claims.push({kind,text:full.trim(),start:at,end:m.index+full.length,raw:m[group],unit:m[group+1],...amount(m[group],m[group+1])});};
 for(const m of t.matchAll(new RegExp(String.raw`\ballocat\w*\s+`+moneyPattern,'gi')))add('allocated',m,1);
 for(const m of t.matchAll(new RegExp(String.raw`\b(?:retain\w*|reserve(?:\s+of|\s+at|:)?)\s+(?:a\s+)?`+moneyPattern,'gi')))add('reserve',m,1);
 for(const m of t.matchAll(new RegExp(moneyPattern+String.raw`\s+(?:state\s+)?reserve\b`,'gi')))add('reserve',m,1);
 return claims;
}
export function proseMismatches(text,{allocated,reserve}){
 const ledger={allocated,reserve},seen=new Set();
 return proseClaims(text).filter(c=>Number.isFinite(ledger[c.kind])&&Math.abs(c.value-ledger[c.kind])>c.tolerance).filter(c=>!seen.has(c.kind+c.value)&&seen.add(c.kind+c.value))
  .map(c=>`Determination text states "${c.text}", but the ledger ${c.kind==='allocated'?'allocates':'reserve is'} ${usd(ledger[c.kind])}.`);
}
// Writes ledger values in the unit the text used ($13.32 million stays in millions).
function formatLike(value,claim){
 if(claim.scale===1)return usd(value);
 const digits=Math.max(claim.digits,2),scaled=(value/claim.scale).toFixed(digits).replace(/\.?0+$/,'');
 return '$'+scaled+(claim.unit?(/^[A-Z]$/.test(claim.unit)?claim.unit:' '+claim.unit):'');
}
// Renders {{budget}}, {{allocated}}, {{reserve}}, {{minimum_reserve}} and {{actor:Name}} from the ledger, then replaces
// any allocated or reserve figure that disagrees with the ledger. Returns the text and a note for every change.
export function renderFigures(text,totals){
 const notes=[];let out=String(text??'');
 if(!totals)return {text:out.replace(/\{\{[^}]*\}\}/g,'[no ledger]'),notes};
 const values={budget:totals.budget,allocated:totals.allocated,reserve:totals.reserve,minimum_reserve:totals.minimum};
 out=out.replace(/\{\{\s*([a-z_]+)(?::([^}]+))?\s*\}\}/gi,(whole,key,arg)=>{
  key=key.toLowerCase();
  if(key==='actor'){const a=totals.allocations.find(x=>x.actor.trim().toLowerCase()===String(arg||'').trim().toLowerCase());if(a)return usd(a.amount);notes.push(`Placeholder ${whole} names no ledger actor.`);return '[unknown actor]';}
  if(Number.isFinite(values[key]))return usd(values[key]);
  notes.push(`Placeholder ${whole} is not a ledger figure.`);return '[unknown figure]';
 });
 const ledger={allocated:totals.allocated,reserve:totals.reserve};
 const starts=new Set();
 for(const c of proseClaims(out).filter(c=>!starts.has(c.start)&&starts.add(c.start)).filter(c=>Number.isFinite(ledger[c.kind])&&Math.abs(c.value-ledger[c.kind])>c.tolerance).sort((a,b)=>b.start-a.start)){
  const replacement=formatLike(ledger[c.kind],c),stated=out.slice(c.start,c.end);
  const money=new RegExp('^'+moneyPattern).exec(stated);if(!money)continue;
  out=out.slice(0,c.start)+replacement+out.slice(c.start+money[0].length);
  notes.push(`Prose stated ${c.kind} as ${money[0].trim()}; the ledger ${c.kind==='allocated'?'allocates':'reserve is'} ${usd(ledger[c.kind])}, so the server wrote ${replacement}.`);
 }
 return {text:out,notes};
}
