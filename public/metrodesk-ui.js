export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const live=c=>['running','recovering'].includes(c?.status);
export function sessionStatus(c,lost=false){
 if(lost)return {state:'connection_lost',title:'Connection lost',detail:'Session status is unknown. Reconnecting to the server.'};
 if(!c)return {state:'ready',title:'Ready',detail:'Open a session to begin.'};
 const state=c.status,op=c.deliberation?.operation;
 const title={ready:'Ready',running:'Running',recovering:'Recovering',complete:'Finished',error:'Failed',stopped:'Stopped',interrupted:'Interrupted',awaiting_evidence:'Evidence needed',needs_triage:'Needs triage'}[state]||state;
 const activity=op?.pending_tool?(op.pending_tool.action==='search'?'Searching sources':'Extracting source passages'):op?.kind||c.phase;
 const detail=state==='complete'?(c.deliberation?.determination?`Determination ready / ${c.deliberation.determination.agreement.status} agreement${c.deliberation.determination.unresolved_issues.length?' / unresolved issues remain':''}`:'No determination recorded.'):state==='error'||state==='stopped'?c.error:state==='interrupted'?'Server restarted. Resume the unfinished operation.':state==='needs_triage'?`${c.deliberation?.triage?.agent||'Agent'} ${c.deliberation?.triage?.kind||'turn'} failed six attempts. Triage the open objections, then resume.`:state==='awaiting_evidence'?`${(c.deliberation?.evidence_requests||[]).filter(e=>e.status==='open').map(e=>`${e.id} from ${e.agent}`).join(', ')} awaiting the reviewer.`:live(c)?`${op?.agent||'Council'} / ${activity}${state==='recovering'?' / correcting response':''}`:'Brief ready. Begin deliberation when ready.';
 return {state,title,detail};
}
export function messageHTML(c,m,color='#06796f'){
 return `<article class="contribution" id="message-${esc(m.id)}"><div class="message-meta"><span class="agent-swatch" style="background:${color}"></span><b>${esc(m.agent[0].toUpperCase()+m.agent.slice(1))}</b><span>${esc(m.kind)} / R${m.round}</span><span>${esc(m.id)} / V${m.proposal_version}</span></div><p>${esc(m.summary)}</p><div class="message-links">${m.responds_to?.length?'Responding to '+m.responds_to.map(id=>`<button class="citation message-jump" data-message="${esc(id)}">${esc(id)}</button>`).join(''):''}</div>${(m.citations||[]).map(x=>`<button class="citation source-link" data-source="${esc(x.source_id)}" data-quote="${esc(x.quote)}" title="${esc(x.claim)} (${x.verified===false?'unverified: quote not found in this source':'read cited passage'})">${esc(x.source_id)}${x.verified===false?' / UNVERIFIED':''} <span>${esc(clip(x.claim,70))}</span></button>`).join('')}${(m.objection_ids||[]).map(id=>{const o=c.deliberation.objections.find(o=>o.id===id);return `<div class="objection"><b>${esc(id)} / ${esc(o?.severity)}${o?.status&&o.status!=='open'?' / '+esc(o.status):''}</b> ${esc(o?.summary)}</div>`;}).join('')}${(m.evidence_request_ids||[]).map(id=>{const r=c.deliberation.evidence_requests?.find(r=>r.id===id);return `<div class="objection"><b>${esc(id)} / evidence ${esc(r?.status)}</b> ${esc(r?.need)}</div>`;}).join('')}${(m.resolutions||[]).map(r=>`<div class="resolution"><b>${esc(r.objection_id)} / ${esc(r.disposition)}${r.change_refs?.length?' / changes '+esc(r.change_refs.join(', ')):''}</b> ${esc(r.explanation)}</div>`).join('')}${(m.resolution_reviews||[]).map(r=>`<div class="resolution"><b>${esc(r.objection_id)} / resolution ${esc(r.verdict)}</b> ${esc(r.reason)}</div>`).join('')}${m.disposition?`<span class="tag ${m.disposition==='oppose'?'error':m.disposition==='conditional_support'?'warning':''}">${esc(m.disposition.replaceAll('_',' '))}</span>`:''}</article>`;
}
// Shortens text at a word boundary and marks the cut.
export const clip=(s,n)=>{s=String(s??'');if(s.length<=n)return s;const at=s.lastIndexOf(' ',n);return s.slice(0,at>n*0.6?at:n).replace(/[\s,;:.\-–—]+$/,'')+'…';};
export const listHTML=items=>`<ul class="list">${(items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
// Working time of a session. Idle time is removed: a wait for the reviewer (evidence request or triage) counts as
// HUMAN_RESPONSE_SECONDS, the time a real answer takes, and any gap longer than IDLE_SECONDS with no provider request
// in flight (run stopped, server down, nobody resuming) counts as zero. Everything else counts in full.
export const HUMAN_RESPONSE_SECONDS=300,IDLE_SECONDS=60;
export function activeSeconds(c,now=Date.now()){
 const t=x=>Date.parse(x),calls=(c?.provider_calls||[]).map(r=>[t(r.started_at),t(r.finished_at||r.started_at)]).filter(([a,b])=>a<=b);
 const points=[...(c?.events||[]).map(e=>({at:t(e.at),kind:e.kind})),...calls.flatMap(([a,b])=>[{at:a},{at:b}])].filter(p=>Number.isFinite(p.at)).sort((a,b)=>a.at-b.at);
 if(!points.length)return 0;
 if(live(c))points.push({at:now});
 const waiting=new Set(['evidence_requested','triage_needed']);let total=0,lastKind=null;
 for(let i=1;i<points.length;i++){
  const a=points[i-1].at,b=points[i].at,gap=(b-a)/1000;if(points[i-1].kind)lastKind=points[i-1].kind;
  if(gap<=0)continue;
  if(waiting.has(lastKind)&&!calls.some(([s,e])=>s<b&&e>a))total+=Math.min(gap,HUMAN_RESPONSE_SECONDS);
  else if(calls.some(([s,e])=>s<b&&e>a)||gap<=IDLE_SECONDS)total+=gap;
 }
 return Math.floor(total);
}
export const clock=seconds=>{const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60,p=n=>String(n).padStart(2,'0');return h?`${h}:${p(m)}:${p(s)}`:`${p(m)}:${p(s)}`;};
