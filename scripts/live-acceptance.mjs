import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {inspectAcceptance,parseAcceptanceArgs,runFinished} from '../acceptance.mjs';
import {randomUUID} from 'node:crypto';
try{process.loadEnvFile('.env');}catch{}
const options=parseAcceptanceArgs(process.argv.slice(2));
const headers={};
if(process.env.QUORUM_USERNAME&&process.env.QUORUM_PASSWORD)headers.Authorization='Basic '+Buffer.from(process.env.QUORUM_USERNAME+':'+process.env.QUORUM_PASSWORD).toString('base64');
async function request(route,data){
 const response=await fetch(options.base+route,{method:data===undefined?'GET':'POST',headers:{...headers,...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`API ${route}: HTTP ${response.status}`);
 return route.endsWith('/report')?response.text():response.json();
}
let c,started=false,runRequested=false,interrupted=false;const runId=randomUUID();
process.on('SIGINT',()=>{interrupted=true;});process.on('SIGTERM',()=>{interrupted=true;});
try{
 const config=await request('/api/config');if(config.runtime_contract!==2)throw Error('Restart the server with the current QUORUM runtime before acceptance.');
 if(options.case)c=await request('/api/cases/'+options.case);
 else{
  if(!options.brief)throw Error('Supply --case CASE_ID or --brief PATH.');
  const input=await readFile(options.brief,'utf8');
  c=await request('/api/cases',{title:options.title||'LIVE ACCEPTANCE / Public evidence review',input,mode:options.mode,objective:options.objective||(options.requireResearch?'Use Tavily search and extraction to resolve a decision-relevant uncertainty in current primary-source guidance. Review the returned evidence and revise the proposal explicitly in response.':'Produce a cited decision brief through proposal, challenges, revisions and independent dispositions.')});
 }
 if(!c.deliberation)throw Error('Acceptance requires a v2 deliberation case.');
 const baselineReceipts=c.provider_calls?.length||0;
 if(['running','recovering'].includes(c.status))throw Error('This case is already running. Acceptance will not take ownership of an existing run.');
 if(c.status!=='complete'){runRequested=true;await request(`/api/cases/${c.id}/run`,{run_id:runId});started=true;}
 let previous;
 while(started){
  if(interrupted)throw Error('Acceptance interrupted; stopping the run it started.');
  c=await request(`/api/cases/${c.id}`);
  const state=[c.status,c.deliberation.operation?.id,c.deliberation.messages.length].join(' / ');
  if(previous!==state){console.log(state);previous=state;}
  if(runFinished(c)){started=false;break;}
  await sleep(2000);
 }
 const exported=await request(`/api/cases/${c.id}/export`),report=await request(`/api/cases/${c.id}/report`);
 const acceptance=inspectAcceptance(exported,{requireResearch:options.requireResearch,baselineReceipts});
 await mkdir('artifacts',{recursive:true});
 await writeFile(`artifacts/live-acceptance-${c.id}.json`,JSON.stringify(exported,null,2));
 await writeFile(`artifacts/live-acceptance-${c.id}.html`,report);
 await writeFile(`artifacts/acceptance-${c.id}.json`,JSON.stringify(acceptance,null,2));
 console.log(JSON.stringify({...acceptance,error:c.error||null},null,2));
 if(!acceptance.passed)process.exitCode=1;
}catch(error){
 console.error(error.cause?.code?`Acceptance transport failed (${error.cause.code}); no live-completion claim.`:error.message);process.exitCode=1;
}finally{
 if(runRequested&&c){
  try{
   const state=await request(`/api/cases/${c.id}`);
   if(state.run_id===runId&&['running','recovering'].includes(state.status)){
    await request(`/api/cases/${c.id}/stop`,{run_id:runId});
    let confirmed=false;for(let n=0;n<30;n++){const stopped=await request(`/api/cases/${c.id}`);if(!['running','recovering'].includes(stopped.status)){confirmed=true;break;}await sleep(1000);}
    if(!confirmed)throw Error('Stop not confirmed.');
   }
  }catch{console.error(`Unable to confirm stop for ${c.id}. Check the server before another run.`);}
 }
}
