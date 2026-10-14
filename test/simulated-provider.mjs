// TEST ONLY. A simulated Nebius and Tavily HTTP backend for offline engine tests. It is passed as fetchImpl to the
// real provider client, so receipts, parsing, repairs, budgets and acceptance run exactly as in production, but no
// network request is made and nothing is billed. The application never imports this file.
import {NEBIUS_CHAT,TAVILY_SEARCH,TAVILY_EXTRACT} from '../providers.mjs';

const page=(url,n)=>`Guidance page ${n} at ${url}.\n\nCategory B emergency protective measures include generator fuel for hospitals and shelters during the incident period.\nCash advances should prioritize jurisdictions that cannot front costs before reimbursement.\nDebris removal under Category A must be documented with load tickets and monitoring reports.\nLessons learned: payroll interruptions in small counties delay emergency work by two to three weeks.`;

export function simulatedProvider({faults={},latencyMs=5,pageChars=0}={}){
 const state={inFlight:0,maxInFlight:0,calls:[],requests:0,attemptsByOp:new Map()};
 const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','x-request-id':`req-${++state.requests}`}});
 const wait=(ms,signal)=>new Promise((resolve,reject)=>{const t=setTimeout(resolve,ms);signal?.addEventListener('abort',()=>{clearTimeout(t);reject(signal.reason);},{once:true});});
 async function fetchImpl(url,init){
  state.inFlight++;state.maxInFlight=Math.max(state.maxInFlight,state.inFlight);
  try{
   const data=JSON.parse(init.body);
   if(url===TAVILY_SEARCH){await wait(latencyMs,init.signal);state.calls.push({url,query:data.query});let h=0;for(const ch of data.query)h=(h*31+ch.charCodeAt(0))>>>0;const slug=h.toString(36);return respond({results:[1,2,3,4,5].map(n=>({url:`https://example.gov/${slug}/${n}`,title:`Guidance ${n}`,content:`Snippet ${n} for ${data.query}`})),usage:{credits:2}});}
   if(url===TAVILY_EXTRACT){await wait(latencyMs,init.signal);state.calls.push({url,urls:data.urls});return respond({results:data.urls.map((u,i)=>({url:u,raw_content:page(u,i+1).padEnd(pageChars,' Further guidance text on eligibility, documentation and cost reimbursement.')})),failed_results:[],usage:{credits:2}});}
   if(url!==NEBIUS_CHAT)throw Error(`Unexpected URL ${url}`);
   const user=data.messages[1].content,payload=JSON.parse(user.split('\n\nCORRECTION: ')[0]),op=payload.operation;
   const n=(state.attemptsByOp.get(op.id)||0)+1;state.attemptsByOp.set(op.id,n);
   state.calls.push({url,op:op.id,attempt:n,max_tokens:data.max_tokens,correction:user.includes('\n\nCORRECTION: '),sources:payload.sources.map(s=>s.id)});
   const fault=faults[op.id]?.[n-1];
   if(fault==='hang'){await wait(3600000,init.signal);}
   await wait(latencyMs,init.signal);
   if(fault==='http500')return respond({error:{message:'Simulated upstream failure.'}},500);
   const usage={prompt_tokens:Math.ceil(user.length/4),completion_tokens:0};
   if(fault==='invalid')return respond({id:`resp-${state.requests}`,model:data.model,choices:[{message:{content:'{"summary": "unterminated'},finish_reason:'stop'}],usage:{...usage,completion_tokens:12}});
   if(fault==='cutoff')return respond({id:`resp-${state.requests}`,model:data.model,choices:[{message:{content:'{"summary":"'+'x'.repeat(200)},finish_reason:'length'}],usage:{...usage,completion_tokens:data.max_tokens}});
   const reply=answer(payload,faults[op.id]?.options||{});
   const content=JSON.stringify(reply);
   return respond({id:`resp-${state.requests}`,model:data.model,choices:[{message:{content},finish_reason:'stop'}],usage:{...usage,completion_tokens:Math.ceil(content.length/4)}});
  }finally{state.inFlight--;}
 }
 return {fetchImpl,state};
}

// A schema-conforming answer for the operation in the payload.
function answer(p,o){
 const op=p.operation,web=p.sources.filter(s=>s.origin==='web_research'),doc=p.sources.find(s=>s.origin==='supplied_document');
 const quoteFrom=s=>s.content.split('\n').map(x=>x.trim()).find(x=>x.length>40)?.slice(0,120)||s.content.slice(0,60);
 const citations=[...(web[0]?[{source_id:web[0].id,quote:o.misquote==='near'?'Category B emergency measures include generator fuel for the hospitals and shelters':o.misquote==='far'?'This sentence does not appear anywhere in the supplied research at all.':quoteFrom(web[0]),claim:'Research supports prioritizing life-safety costs.'}]:[]),...(doc?[{source_id:doc.id,quote:quoteFrom(doc),claim:'The brief states this premise.'}]:[])];
 const base={summary:`${op.kind} for round ${op.round}.`,citations,objections:[],resolution_reviews:[],resolutions:[],unresolved_issues:[],evidence_requests:[],proposal:null,disposition:null,determination:null};
 if(o.evidence)base.evidence_requests=[{need:o.evidence,reason:'Needed to size the advance.',source_type:'public'}];
 const ledger=(extra=0)=>{
  const actors=['Bay','Escambia','Okaloosa','Santa Rosa','Walton','Gulf','Franklin','Calhoun','Wakulla','Washington'];
  const amount=i=>[9000000,3000000,2500000,2500000,2000000,4000000,3500000,3000000,2500000,2000000][i]+extra;
  return {narrative:'Advance cash to counties that cannot front costs first.',assumptions:['County cash positions are as stated in the brief.'],budget_usd:46750000,
   allocations:actors.map((a,i)=>({actor:a,population:10000*(i+1),needs:`${a} emergency work.`,rationale:'Need and ability to front costs.'})),
   spending_plan:[{id:'P1',label:'First 30 days',items:actors.map((a,i)=>({id:`I${i+1}`,actor:o.wrongActor&&i===0?'bay county':a,amount_usd:amount(i),purpose:'Category A/B work'}))}],unresolved_issues:[]};
 };
 if(op.kind==='propose')return {...base,proposal:{recommendation:o.prose||'Advance {{allocated}} and keep {{reserve}} in reserve.',changes:[],scenario:ledger(o.overspend?2000000:0)}};
 if(op.kind==='challenge')return {...base,objections:[{summary:`${op.id}: fuel priority for hospitals is not funded explicitly.`,severity:'material'}],resolution_reviews:p.pending_reviews.map(r=>({objection_id:r.id,verdict:'verified',reason:'The change resolves it.'}))};
 if(op.kind==='revise')return {...base,proposal:{recommendation:'Fund hospital fuel within each county allocation; keep {{reserve}} in reserve.',changes:['Earmark hospital generator fuel inside county items.'],ledger_changes:{set_phases:[],remove_phases:[],set_items:[{phase_id:'P1',id:`F${op.round}`,actor:'Gulf',amount_usd:100000,purpose:'Hospital generator fuel'}],remove_items:[],set_allocations:[],remove_allocations:[],narrative:null,assumptions:null,unresolved_issues:[]}},
  resolutions:[...p.objections_to_resolve.map(id=>({objection_id:id,disposition:'addressed',explanation:'Fuel earmarked.',change_refs:o.badRefs?[7]:[1]})),...(o.unknownResolution?[{objection_id:'O999',disposition:'addressed',explanation:'x',change_refs:[1]}]:[])]};
 if(op.kind==='vote')return {...base,disposition:o.disposition||'support',resolution_reviews:p.pending_reviews.map(r=>({objection_id:r.id,verdict:'verified',reason:'Resolved.'}))};
 return {...base,determination:{recommendation:o.prose||'Adopt the final proposal: advance {{allocated}} and hold {{reserve}}.',tradeoffs:['Speed versus documentation.'],next_steps:['Issue advances.']}};
}
