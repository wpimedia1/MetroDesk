import {esc,listHTML} from './metrodesk-ui.js';
import {usd,proseMismatches} from './figures.js';

// The allocated and reserve figures in determination prose are written by the server from the ledger (figures.js);
// proseMismatches stays as an independent check on every record, including those from earlier engines.
export {proseMismatches};
// Unresolved issues are grouped by what they are, with counts, so long records stay readable.
export function groupIssues(issues,mismatches=[]){
 const groups=new Map([['Determination text vs ledger',[...mismatches]]]);
 const add=(k,v)=>{if(!groups.has(k))groups.set(k,[]);groups.get(k).push(v);};
 for(const i of issues||[]){const s=String(i),o=s.match(/^O\d+ \(([a-z_]+)\)/);
  if(o)add(o[1][0].toUpperCase()+o[1].slice(1).replaceAll('_',' ')+' objections',s);
  else if(/^E\d+: evidence (not supplied|requested)/.test(s))add('Evidence not supplied',s);
  else if(/^Unverified citation/.test(s))add('Unverified citations',s);
  else add('Conditions and other issues',s);}
 return [...groups].filter(([,v])=>v.length);
}
export function issuesHTML(issues,mismatches=[]){
 const groups=groupIssues(issues,mismatches);
 if(!groups.length)return '<p class="document-text">None recorded.</p>';
 return groups.map(([k,v])=>`<details class="issue-group${k.startsWith('Determination')?' flagged':''}"${k.startsWith('Determination')?' open':''}><summary><span>${esc(k)}</span><span class="tag">${v.length}</span></summary>${listHTML(v)}</details>`).join('');
}

export function decisionFigures(c){
 const d=c?.deliberation,f=d?.determination,s=d?.proposals?.at(-1)?.scenario;
 if(!f||!s)return null;
 const allocations=(s.allocations||[]).map(a=>({actor:a.actor,population:a.population,amount:a.amount_usd})).sort((a,b)=>b.amount-a.amount);
 const allocated=allocations.reduce((t,a)=>t+(Number.isFinite(a.amount)?a.amount:0),0);
 return {allocations,allocated,reserve:s.reserve_usd,budget:s.budget_usd,minimum:c.constraints?.minimum_reserve_usd??null,version:d.proposals.at(-1).version};
}
// The summary leads the Decision view: agreement, votes, the ledger allocation and the reserve against its minimum.
export function decisionSummaryHTML(c){
 const f=c?.deliberation?.determination,x=decisionFigures(c);
 if(!f)return '';
 const tally=f.dispositions.map(v=>`<div class="vote"><b>${esc(v.agent[0].toUpperCase()+v.agent.slice(1))}</b><span class="tag ${v.disposition==='oppose'?'error':v.disposition==='conditional_support'?'warning':''}">${esc(v.disposition.replaceAll('_',' '))}</span></div>`).join('');
 const mismatches=x?proseMismatches(f.recommendation,x):[];
 const table=x?`<table class="allocation-table"><thead><tr><th>Recipient</th><th>Population</th><th>Allocation</th><th>Share</th></tr></thead><tbody>${x.allocations.map(a=>`<tr><td>${esc(a.actor)}</td><td>${Number(a.population).toLocaleString('en-US')}</td><td>${usd(a.amount)}</td><td>${x.budget?(a.amount/x.budget*100).toFixed(1)+'%':''}</td></tr>`).join('')}</tbody><tfoot><tr><td>Allocated</td><td></td><td>${usd(x.allocated)}</td><td>${x.budget?(x.allocated/x.budget*100).toFixed(1)+'%':''}</td></tr><tr><td>Reserve${x.minimum!=null?` (minimum ${usd(x.minimum)})`:''}</td><td></td><td>${usd(x.reserve)}</td><td>${x.budget?(x.reserve/x.budget*100).toFixed(1)+'%':''}</td></tr><tr><td>Budget</td><td></td><td>${usd(x.budget)}</td><td></td></tr></tfoot></table><p class="summary-note">Figures computed by the server from proposal V${x.version}'s line items.</p>`:'';
 return `<section class="decision-summary"><div class="summary-head"><div><span class="eyebrow">OUTCOME</span><h2>${esc(f.agreement.status[0].toUpperCase()+f.agreement.status.slice(1))} agreement</h2></div><div class="vote-row">${tally}</div></div>${mismatches.length?`<div class="mismatch" role="alert"><b>Determination text does not match the ledger.</b>${listHTML(mismatches)}</div>`:''}${table}</section>`;
}

// Evidence previews: plain text, with markdown symbols removed.
export function stripMarkdown(t){
 return String(t||'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/^\s{0,3}#{1,6}\s*/gm,'').replace(/\s#{1,6}\s/g,' ').replace(/[*_`>|]+/g,' ').replace(/^\s*[-+]\s+/gm,'').replace(/-{3,}/g,' ').replace(/\s+/g,' ').trim();
}
export function citationCounts(c){
 const n=new Map();for(const m of c?.deliberation?.messages||[])for(const x of m.citations||[])n.set(x.source_id,(n.get(x.source_id)||0)+1);return n;
}
export const sourceType=s=>/^D\d/.test(s.id)?'Document':/^R\d/.test(s.id)?'Reviewer':'Web';
export function evidenceHTML(c,citedOnly){
 const counts=citationCounts(c),all=c?.sources||[],shown=citedOnly?all.filter(s=>counts.get(s.id)):all;
 const head=`<div class="evidence-filter"><button class="evidence-toggle${citedOnly?' active':''}" data-cited-only="${citedOnly?'0':'1'}" aria-pressed="${citedOnly}">${citedOnly?'Show all sources':'Cited only'}</button><span>${shown.length} of ${all.length} sources</span></div>`;
 if(!all.length)return '<p class="empty">No evidence sources recorded yet.</p>';
 return head+shown.map(s=>{const k=counts.get(s.id)||0;return `<article class="source-item"><span class="tag">${esc(s.id)} / ${esc(sourceType(s))}</span><span class="tag ${k?'':'muted'}">${k?`cited ${k} time${k===1?'':'s'}`:'not cited'}</span><h2>${esc(s.title)}</h2><p>${esc(stripMarkdown(s.content).slice(0,280))}${String(s.content||'').length>280?'…':''}</p><button class="source-link" data-source="${esc(s.id)}"><i data-lucide="book-open"></i>Read source</button></article>`;}).join('');
}
