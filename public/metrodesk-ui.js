export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const live=c=>['running','recovering'].includes(c?.status);
const name=id=>{const s=String(id||'');return s==='moderator'?'Moderator':s?s[0].toUpperCase()+s.slice(1):'Council';};
const verb={propose:'proposing',challenge:'challenging',revise:'revising',vote:'voting',determine:'writing the determination'};
// What the council is doing now: server research, or the turns in flight (several at once in a parallel step).
export function activityLine(c){
 const d=c?.deliberation;
 if(d?.researching?.length)return `Server research: ${d.researching.map(name).join(', ')}`;
 const active=d?.active||[];
 if(!active.length)return c?.phase||'';
 const kinds=[...new Set(active.map(a=>a.kind))];
 return kinds.map(k=>`${active.filter(a=>a.kind===k).map(a=>name(a.agent)+(a.attempt>1?` (attempt ${a.attempt})`:'')).join(', ')} ${verb[k]||k}`).join(' / ');
}
export function sessionStatus(c,lost=false){
 if(lost)return {state:'connection_lost',title:'Connection lost',detail:'Session status is unknown. Reconnecting to the server.'};
 if(!c)return {state:'ready',title:'Ready',detail:'Open a session to begin.'};
 const state=c.status,open=(c.deliberation?.evidence_requests||[]).filter(e=>e.status==='open').length;
 const title={ready:'Ready',running:'Running',recovering:'Recovering',complete:'Finished',error:'Failed',stopped:'Stopped',interrupted:'Interrupted',budget_reached:'Budget reached',awaiting_evidence:'Interrupted',needs_triage:'Interrupted'}[state]||state;
 const evidence=open?` / ${open} evidence request${open===1?'':'s'} open (answer any time)`:'';
 const detail=state==='complete'?(c.deliberation?.determination?`Determination ready / ${c.deliberation.determination.agreement.status} agreement${c.deliberation.determination.unresolved_issues.length?' / unresolved issues remain':''}`:'No determination recorded.')
  :state==='error'||state==='stopped'?c.error
  :state==='budget_reached'?c.stop_reason||c.error
  :['interrupted','awaiting_evidence','needs_triage'].includes(state)?'The server restarted or an earlier engine paused this session. Resume to continue from the last accepted contribution.'
  :live(c)?`${activityLine(c)}${evidence}`
  :`Brief ready. Begin deliberation when ready.${evidence}`;
 return {state,title,detail};
}
const money=n=>'$'+Number(n||0).toFixed(2);
// Live meter (requirement 6): spend against the run limits and the estimated finish time.
export function meterText(c){
 const u=c?.usage,b=c?.budget,p=c?.progress;
 if(!u||!b)return {cost:'',tokens:'',eta:''};
 return {cost:`${money(u.cost_usd)} of ${money(b.cost_usd)}${u.estimated?' (est.)':''}`,tokens:`${Number(u.tokens).toLocaleString('en-US')} of ${Number(b.tokens).toLocaleString('en-US')} tokens`,
  eta:live(c)&&p?.eta_at?`Step ${Math.min((p.steps_done||0)+1,p.steps_total)} of ${p.steps_total} / finish about ${new Date(p.eta_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`:p?.steps_total?`${p.steps_done||0} of ${p.steps_total} steps`:''};
}
export function messageHTML(c,m,color='#06796f'){
 return `<article class="contribution" id="message-${esc(m.id)}"><div class="message-meta"><span class="agent-swatch" style="background:${color}"></span><b>${esc(name(m.agent))}</b><span>${esc(m.kind)} / R${m.round}</span><span>${esc(m.id)} / V${m.proposal_version}</span></div><p>${esc(m.summary)}</p><div class="message-links">${m.responds_to?.length?'Responding to '+m.responds_to.map(id=>`<button class="citation message-jump" data-message="${esc(id)}">${esc(id)}</button>`).join(''):''}</div>${(m.citations||[]).map(x=>`<button class="citation source-link" data-source="${esc(x.source_id)}" data-quote="${esc(x.quote)}" title="${esc(x.claim)} (${x.verified===false?'unverified: quote not found in this source':x.repaired?'quote corrected to the closest passage in the source':'read cited passage'})">${esc(x.source_id)}${x.verified===false?' / UNVERIFIED':x.repaired?' / CORRECTED':''} <span>${esc(clip(x.claim,70))}</span></button>`).join('')}${(m.objection_ids||[]).map(id=>{const o=c.deliberation.objections.find(o=>o.id===id);return `<div class="objection"><b>${esc(id)} / ${esc(o?.severity)}${o?.status&&o.status!=='open'?' / '+esc(o.status):''}</b> ${esc(o?.summary)}</div>`;}).join('')}${(m.evidence_request_ids||[]).map(id=>{const r=c.deliberation.evidence_requests?.find(r=>r.id===id);return `<div class="objection"><b>${esc(id)} / evidence ${esc(r?.status)}</b> ${esc(r?.need)}${r?.status==='open'&&!c.deliberation.determination?` <button class="answer-evidence" data-request="${esc(id)}">Answer</button>`:''}</div>`;}).join('')}${(m.resolutions||[]).map(r=>`<div class="resolution"><b>${esc(r.objection_id)} / ${esc(r.disposition)}${r.change_refs?.length?' / changes '+esc(r.change_refs.join(', ')):''}</b> ${esc(r.explanation)}</div>`).join('')}${(m.resolution_reviews||[]).map(r=>`<div class="resolution"><b>${esc(r.objection_id)} / resolution ${esc(r.verdict)}</b> ${esc(r.reason)}</div>`).join('')}${m.disposition?`<span class="tag ${m.disposition==='oppose'?'error':m.disposition==='conditional_support'?'warning':''}">${esc(m.disposition.replaceAll('_',' '))}</span>`:''}${m.mechanical_corrections?.length?`<details class="corrections"><summary>${m.mechanical_corrections.length} server correction${m.mechanical_corrections.length===1?'':'s'}</summary>${listHTML(m.mechanical_corrections)}</details>`:''}</article>`;
}
// Shortens text at a word boundary and marks the cut.
export const clip=(s,n)=>{s=String(s??'');if(s.length<=n)return s;const at=s.lastIndexOf(' ',n);return s.slice(0,at>n*0.6?at:n).replace(/[\s,;:.\-–—]+$/,'')+'…';};
export const listHTML=items=>`<ul class="list">${(items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
