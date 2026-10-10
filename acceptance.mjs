import {passageFound} from './passage.mjs';
import {operationSchedule,agreement,expectedRespondsTo} from './deliberation.mjs';
import {checkScenario} from './scenario.mjs';

export function inspectAcceptance(c,{requireResearch=false,baselineReceipts=0}={}){
 const issues=[],d=c.deliberation,schedule=operationSchedule();
 if(c.status!=='complete'||!d?.determination)issues.push(c.status==='awaiting_evidence'?'Paused for reviewer evidence; answer or decline the open requests in the app, then resume.':'No completed determination.');
 if(c.record_version!==2||!d)return {passed:false,issues:[...issues,'Not a v2 deliberation record.']};
 const finalVersion=schedule.filter(op=>['propose','revise'].includes(op.kind)).length;
 if(c.rounds.length!==3||d.proposals.length!==finalVersion||d.messages.length!==schedule.length)issues.push(`Expected three rounds, ${finalVersion} proposal versions and ${schedule.length} accepted contributions.`);
 if(d.operation)issues.push('A completed record still has an unfinished operation.');
 if(d.dispositions.length!==4||new Set(d.dispositions.map(v=>v.agent)).size!==4)issues.push('Four distinct reviewer dispositions are required.');
 const counts={support:0,conditional_support:0,oppose:0};for(const v of d.dispositions)if(v.disposition in counts)counts[v.disposition]++;
 if(Object.keys(counts).some(key=>counts[key]!==d.determination?.agreement?.counts?.[key])||agreement(d.dispositions).status!==d.determination?.agreement?.status)issues.push('Agreement does not match recorded votes.');
 for(const vote of d.dispositions){
  const message=d.messages.find(m=>m.id===vote.message_id);
  if(!message||message.kind!=='vote'||message.agent!==vote.agent||message.disposition!==vote.disposition||vote.proposal_version!==finalVersion||message.proposal_version!==finalVersion)issues.push(`Disposition is not linked to a final-proposal vote: ${vote.agent}.`);
  const finalVote=d.determination?.dispositions?.find(v=>v.agent===vote.agent);
  if(!finalVote||finalVote.disposition!==vote.disposition||JSON.stringify(finalVote.conditions)!==JSON.stringify(vote.conditions))issues.push(`Determination lost a disposition or condition: ${vote.agent}.`);
 }
 for(let i=0;i<d.proposals.length;i++){
  const proposal=d.proposals[i],message=d.messages.find(m=>m.id===proposal.message_id);
  if(proposal.version!==i+1||message?.agent!=='negotiator'||message.proposal_version!==proposal.version)issues.push(`Invalid proposal-version dependency: ${proposal.version}.`);
  if(c.mode==='scenario'&&!checkScenario(proposal.scenario,c.constraints,{requirePlan:true}).valid)issues.push(`Proposal ${proposal.version} failed spending reconciliation.`);
 }
 if(d.determination&&(d.determination.message_id!==d.messages.at(-1)?.id||d.messages.at(-1)?.kind!=='determine'||d.determination.proposal_version!==finalVersion))issues.push('Determination is not linked to the moderator and final proposal.');
 for(let i=0;i<schedule.length;i++){
  const op=schedule[i],message=d.messages[i];
  if(!message||message.operation_id!==op.id||message.agent!==op.agent){issues.push(`Missing or out-of-order contribution: ${op.id}.`);continue;}
  const prefix=d.messages.slice(0,i),prefixIds=new Set(prefix.map(m=>m.id));
  const expected=expectedRespondsTo({deliberation:{messages:prefix,proposals:d.proposals.filter(p=>prefixIds.has(p.message_id)),dispositions:d.dispositions.filter(v=>prefixIds.has(v.message_id))}},op);
  if(JSON.stringify(message.responds_to)!==JSON.stringify(expected))issues.push(`${message.id} is not linked to the contributions it answers.`);
  if(!d.proposals.some(p=>p.version===message.proposal_version))issues.push(`${message.id} references an unknown proposal version.`);
  if(!(c.provider_calls||[]).some(r=>r.id===message.provider_receipt_id&&r.provider==='Nebius'&&r.status==='succeeded'&&r.http_status===200&&r.agent===op.agent&&r.operation_id===op.id&&r.call===message.decision_call&&(r.request_id||r.response_id)))issues.push(`No linked successful provider receipt for ${op.id}.`);
  if(!(c.decisions||[]).some(decision=>decision.accepted&&decision.call===message.decision_call&&decision.operation_id===op.id))issues.push(`No accepted model decision for ${op.id}.`);
 }
 const unverifiedCitations=[];
 for(const message of d.messages)for(const citation of message.citations){
  const source=c.sources.find(s=>s.id===citation.source_id);
  // Citations the run itself marked unverified are disclosed, not counted as evidence; any other mismatch is a defect.
  if(citation.verified===false){unverifiedCitations.push({message_id:message.id,source_id:citation.source_id});if(passageFound(source?.content,citation.quote))issues.push(`Citation in ${message.id} is marked unverified but matches its source.`);continue;}
  if(!source||source.kind!=='extracted'||typeof citation.quote!=='string'||!passageFound(source.content,citation.quote))issues.push(`Invalid cited passage in ${message.id}.`);
 }
 const retrievedIds=new Set(d.retrievals.filter(r=>!r.cached&&r.action==='extract').flatMap(r=>r.results.map(s=>s.source_id)));
 const evidenceRevisions=[];
 for(const proposal of d.proposals){
  const revision=d.messages.find(m=>m.id===proposal.message_id);
  if(revision?.kind!=='revise'||!proposal.changes.length)continue;
  const challenges=d.messages.filter(m=>m.round===revision.round&&m.kind==='challenge'&&m.citations.some(cite=>cite.verified!==false&&retrievedIds.has(cite.source_id)));
  if(challenges.some(m=>revision.responds_to.includes(m.id)||revision.resolutions.some(r=>m.objection_ids.includes(r.objection_id))))evidenceRevisions.push({proposal_version:proposal.version,message_id:revision.id,changes:proposal.changes,challenge_ids:challenges.map(m=>m.id)});
 }
 if(requireResearch){
  for(const endpoint of ['/search','/extract'])if(!(c.provider_calls||[]).some(r=>r.provider==='Tavily'&&r.status==='succeeded'&&r.http_status===200&&new URL(r.endpoint).pathname===endpoint))issues.push(`No successful live Tavily ${endpoint} receipt.`);
  if(!evidenceRevisions.length)issues.push('No recorded retrieved-evidence-to-challenge-to-revision dependency.');
 }
 return {passed:issues.length===0,issues,unverified_citations:unverifiedCitations,id:c.id,status:c.status,contributions:d.messages.length,proposal_versions:d.proposals.length,dispositions:d.dispositions,agreement:d.determination?.agreement,evidence_revisions:evidenceRevisions,evidence_change_review:requireResearch?'Read the cited challenge, resolution and changes to verify material influence.':'Not required for this acceptance.',new_provider_requests:(c.provider_calls||[]).length-baselineReceipts};
}

export function parseAcceptanceArgs(args){
 const options={base:'http://127.0.0.1:4400',mode:'evidence',requireResearch:false};
 const names=new Set(['base','case','brief','mode','title','objective']);
 for(let i=0;i<args.length;i++){
  const name=args[i].replace(/^--/,'');
  if(args[i]==='--require-research'){options.requireResearch=true;continue;}
  if(!args[i].startsWith('--')||!names.has(name)||!args[i+1]||args[i+1].startsWith('--'))throw Error(`Unknown or incomplete argument: ${args[i]}`);
  options[name]=args[++i];
 }
 if(options.case&&options.brief)throw Error('Choose --case or --brief, not both.');
 if(options.case&&!/^[a-f0-9-]{36}$/.test(options.case))throw Error('Invalid case ID.');
 if(!['scenario','evidence'].includes(options.mode))throw Error('Invalid mode.');
 const url=new URL(options.base);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||(!['https:','http:'].includes(url.protocol))||(url.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw Error('Use an HTTPS origin, or HTTP localhost, without embedded credentials.');
 options.base=url.origin;return options;
}

// A server restart marks the case interrupted but cannot update the attempt it killed, so
// interrupted is terminal on its own; other terminal states wait for the attempt to record them.
export function runFinished(c){
 if(['interrupted','awaiting_evidence'].includes(c?.status))return true;
 return ['complete','error','stopped'].includes(c?.status)&&c.attempts?.at(-1)?.status===c.status;
}
