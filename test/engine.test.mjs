// Offline tests of the run engine against the simulated provider (test/simulated-provider.mjs). No network, no cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {initializeDeliberation,runDeliberation,respondToEvidence,operationSteps,OUTPUT_TOKENS,repairLedger} from '../deliberation.mjs';
import {createIO} from '../providers.mjs';
import {inspectAcceptance} from '../acceptance.mjs';
import {goodRun} from '../archive.mjs';
import {renderFigures,proseMismatches,ledgerTotals} from '../public/figures.js';
import {reportHTML} from '../report.mjs';
import {simulatedProvider} from './simulated-provider.mjs';

const brief='Hurricane Quillon made landfall near Panama City Beach as a Category 2 hurricane. Ten Panhandle counties are under a state of emergency and need cash advances for emergency work.';
function session(){
 const text='County cash positions: Franklin payroll is at risk within two weeks and Calhoun requests a full advance for debris removal.';
 return initializeDeliberation({id:'00000000-0000-4000-8000-000000000001',title:'Quillon cash advance',input:brief,objective:'Allocate the cash pool across the ten counties for Category A/B work. Keep the minimum reserve.',stakeholder_needs:'Counties that cannot front costs come first.',mode:'scenario',constraints:{budget_usd:46750000,actor_count:10,minimum_reserve_usd:4675000},documents:[{name:'cash-positions.md',text,sha256:createHash('sha256').update(text).digest('hex')}],status:'ready',sources:[],rounds:[],events:[],assessments:{},actions:0});
}
function harness(options){
 const sim=simulatedProvider(options),c=session(),saves={n:0};
 const io=createIO({c,keys:{nebius:{key:'test-key',source:'test',version:1},tavily:{key:'test-key',source:'test',version:1},model:'nvidia/Nemotron-3-Ultra-550b-a55b'},save:async()=>{saves.n++;},fetchImpl:sim.fetchImpl,timeouts:options?.timeouts||{}});
 return {c,io,sim,saves};
}
const run=(h,signal=new AbortController().signal)=>runDeliberation(h.c,h.io,signal);

test('a full run completes unattended in nine parallel steps and passes acceptance', async()=>{
 const h=harness();await run(h);
 const {c,sim}=h,d=c.deliberation;
 assert.equal(c.status,'complete',c.error);
 assert.equal(d.messages.length,21);assert.equal(d.proposals.length,4);assert.equal(c.progress.steps_done,9);
 assert.equal(operationSteps().length,9);
 assert.equal(sim.state.maxInFlight,5,'research for five agents and four reviewers run at the same time');
 const acceptance=inspectAcceptance(c,{requireResearch:true});assert.deepEqual(acceptance.issues,[]);
 assert.equal(goodRun(c),true);
 // Requirement 5: one search and one extract per agent per round, issued by the server.
 const searches=c.provider_calls.filter(r=>r.endpoint.endsWith('/search')),extracts=c.provider_calls.filter(r=>r.endpoint.endsWith('/extract'));
 assert.equal(searches.length,15);assert.equal(extracts.length,15);
 assert.ok(searches.every(r=>r.purpose==='research'));
 // Requirement 1: every model call used its fixed output budget.
 for(const r of c.provider_calls.filter(r=>r.provider==='Nebius'))assert.equal(r.requested_max_tokens,OUTPUT_TOKENS[d.messages.find(m=>m.operation_id===r.operation_id).kind]);
 assert.equal(c.attempts.at(-1).model_calls,21);
 // Requirement 2: the server writes the figures.
 const totals=ledgerTotals(d.proposals.at(-1).scenario,4675000);
 assert.deepEqual(proseMismatches(d.determination.recommendation,totals),[]);
 assert.match(d.determination.recommendation,/\$[\d,]+/);assert.doesNotMatch(d.determination.recommendation,/\{\{/);
 assert.match(reportHTML(c),/Allocation \(ledger, proposal V4\)/);
});

test('cut-off and invalid replies are retried at the same output budget; the rest are repaired on the first try', async()=>{
 const h=harness({faults:{'r1-propose':['cutoff'],'r1-risk':['invalid'],'r1-analyst':Object.assign([],{options:{misquote:'near'}}),'r1-strategy':Object.assign([],{options:{misquote:'far'}}),'r1-revise':Object.assign([],{options:{badRefs:true,unknownResolution:true}})}});
 await run(h);const {c,sim}=h,d=c.deliberation;
 assert.equal(c.status,'complete',c.error);
 const propose=sim.state.calls.filter(x=>x.op==='r1-propose');
 assert.deepEqual(propose.map(x=>x.max_tokens),[OUTPUT_TOKENS.propose,OUTPUT_TOKENS.propose],'a cut-off never gets more room');
 assert.equal(propose[1].correction,true);
 assert.equal(sim.state.calls.filter(x=>x.op==='r1-risk').length,2);
 const rejected=c.decisions.filter(x=>!x.accepted);assert.deepEqual(rejected.map(x=>x.rejected_reason).sort(),['INVALID_MODEL_JSON','MODEL_OUTPUT_LIMIT']);
 assert.ok(rejected.length/c.decisions.length<0.1,'under 10% rejected answers');
 const analyst=d.messages.find(m=>m.operation_id==='r1-analyst'),near=analyst.citations.find(x=>x.repaired);
 assert.ok(near&&near.verified,'a near misquote is replaced by the closest real passage');
 const strategy=d.messages.find(m=>m.operation_id==='r1-strategy');
 assert.ok(strategy.citations.some(x=>x.verified===false),'a far misquote is marked unverified');
 assert.equal(sim.state.calls.filter(x=>x.op==='r1-analyst'||x.op==='r1-strategy').length,2,'misquotes are never retried');
 const revise=d.messages.find(m=>m.operation_id==='r1-revise');
 assert.ok(revise.mechanical_corrections.some(n=>/ignored change_refs 7/.test(n)));
 assert.ok(revise.mechanical_corrections.some(n=>/O999/.test(n)));
 assert.ok(revise.resolutions.every(r=>r.disposition==='deferred'),'addressed without a valid reference is carried as deferred');
 assert.deepEqual(inspectAcceptance(c).issues,[]);
});

test('the ledger is repaired, not rejected: overspend, actor names and prose figures', async()=>{
 const h=harness({faults:{'r1-propose':Object.assign([],{options:{overspend:true,wrongActor:true,prose:'We allocate $50.1 million and retain $1.2 million in the state reserve.'}})}});
 await run(h);const {c,sim}=h,d=c.deliberation,v1=d.proposals[0];
 assert.equal(sim.state.calls.filter(x=>x.op==='r1-propose').length,1);
 assert.ok(v1.budget_check.valid,v1.budget_check.errors.join(' '));
 assert.ok(v1.scenario.reserve_usd>=4675000);
 const totals=ledgerTotals(v1.scenario,4675000);
 assert.deepEqual(proseMismatches(v1.recommendation,totals),[]);
 const notes=d.messages[0].mechanical_corrections.join(' ');
 assert.match(notes,/scaled/);assert.match(notes,/matched to allocation "Bay"/);assert.match(notes,/server wrote/);
 assert.equal(c.status,'complete');
});

test('evidence requests never pause the run, and an answer given mid-run is used by later turns', async()=>{
 const h=harness({faults:{'r1-risk':Object.assign([],{options:{evidence:'Hospital generator fuel burn rates for Gulf County'}})}});
 const {c}=h;let answered=false;
 const save=h.io.save;h.io.save=async x=>{await save(x);
  const e=x.deliberation.evidence_requests[0];
  if(!answered&&e&&x.deliberation.messages.length>=7){answered=true;respondToEvidence(x,[{request_id:e.id,text:'Gulf County hospital generators burn 1,200 gallons per day; three days on hand.'}]);}};
 await run(h);
 assert.equal(c.status,'complete',c.error);
 assert.ok(c.events.every(e=>e.kind!=='evidence_requested'));
 const e=c.deliberation.evidence_requests[0];assert.equal(e.status,'answered');assert.equal(e.researched_round,2,'public request researched by the server next round');
 const r=c.sources.find(s=>s.origin==='reviewer_response');assert.ok(r);
 assert.ok(h.sim.state.calls.some(x=>x.op==='final-analyst'&&x.sources.includes(r.id)),'the reviewer answer reaches later turns');
 assert.equal(inspectAcceptance(c).passed,true);
});

test('an open evidence request at the determination is recorded as unresolved, not awaited', async()=>{
 const h=harness({faults:{'r2-stability':Object.assign([],{options:{evidence:'Washington County payroll calendar'}})}});
 await run(h);const {c}=h;
 assert.equal(c.status,'complete');
 assert.ok(c.deliberation.determination.unresolved_issues.some(x=>/not supplied before the determination/.test(x)));
});

test('a call that exceeds its time limit is cancelled and retried', async()=>{
 const h=harness({faults:{'r1-stability':['hang']},timeouts:{model:300}});
 await run(h);const {c}=h;
 assert.equal(c.status,'complete',c.error);
 const calls=c.provider_calls.filter(r=>r.operation_id==='r1-stability');
 assert.equal(calls[0].status,'timed_out');assert.equal(calls[0].timeout_ms,300);assert.equal(calls[1].status,'succeeded');
});

test('upstream errors are retried, then the run fails with a resumable error', async()=>{
 const h=harness({faults:{'r1-propose':['http500','http500','http500']}});
 await run(h);assert.equal(h.c.status,'error');assert.match(h.c.error,/after 3 attempts/);
 assert.equal(h.c.deliberation.messages.length,0);
 await run(h);assert.equal(h.c.status,'complete');
});

test('stop cancels in-flight requests and keeps accepted work', async()=>{
 const h=harness({latencyMs:30});const controller=new AbortController();
 const save=h.io.save;h.io.save=async x=>{await save(x);if(x.deliberation.messages.length>=3)controller.abort();};
 await run(h,controller.signal);
 assert.equal(h.c.status,'stopped');assert.ok(h.c.deliberation.messages.length>=3);
 await run(h);assert.equal(h.c.status,'complete');assert.equal(inspectAcceptance(h.c).passed,true);
});

test('figures render from placeholders and replace contradicting prose', ()=>{
 const t={allocated:13320000,reserve:33430000,budget:46750000,minimum:4675000,allocations:[{actor:'Bay',amount:9000000}]};
 assert.equal(renderFigures('Bay gets {{actor:bay}}; reserve {{reserve}}.',t).text,'Bay gets $9,000,000; reserve $33,430,000.');
 const fixed=renderFigures('The council allocates $13.72 million and keeps a reserve of $33,030,000.',t);
 assert.equal(fixed.text,'The council allocates $13.32 million and keeps a reserve of $33,430,000.');
 assert.equal(fixed.notes.length,2);
 const {scenario,notes}=repairLedger({constraints:{budget_usd:100,minimum_reserve_usd:10}},{allocations:[{actor:'A',population:1,needs:'x',rationale:'y'}],spending_plan:[{id:'P',label:'P',items:[{id:'i',actor:'A',amount_usd:200,purpose:'p'}]}],narrative:'n',assumptions:['a']});
 assert.equal(scenario.reserve_usd,10);assert.match(notes.join(' '),/scaled/);
});

test('archived runs from the sequential engine still pass acceptance', async()=>{
 for(const f of await readdir(new URL('../records/',import.meta.url))){
  const c=JSON.parse(await readFile(new URL(`../records/${f}`,import.meta.url),'utf8'));
  assert.deepEqual(inspectAcceptance(c,{requireResearch:true}).issues,[],f);
 }
});
