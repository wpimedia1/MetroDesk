// One small live call (max_tokens 256) with the same settings the council uses. It shows whether Token Factory accepts
// enable_thinking:false and whether hidden reasoning tokens still count against max_tokens.
import {mkdir,writeFile} from 'node:fs/promises';
import {providerCall} from '../provider-call.mjs';
import {NEBIUS_CHAT} from '../providers.mjs';
try{process.loadEnvFile('.env');}catch{}
const c={provider_calls:[]};
await mkdir('artifacts',{recursive:true});
const save=()=>writeFile('artifacts/nebius-connectivity.json',JSON.stringify(c,null,2));
const key=(process.env.NEBIUS_API_KEY||'').trim();
if(!key)throw Error('No NEBIUS_API_KEY configured.');
try{
 const result=await providerCall(c,save,{url:NEBIUS_CHAT,key,credentialSource:'NEBIUS_API_KEY from environment or .env',data:{model:process.env.NEBIUS_MODEL||'nvidia/Nemotron-3-Ultra-550b-a55b',messages:[{role:'user',content:'Return a JSON object with status set to ok.'}],temperature:0.2,max_tokens:256,response_format:{type:'json_object'},chat_template_kwargs:{enable_thinking:false}}});
 const m=result.choices?.[0]?.message||{},content=String(m.content||''),reasoning=String(m.reasoning_content||m.reasoning||'');
 console.log(JSON.stringify({http_status:c.provider_calls[0].http_status,finish_reason:result.choices?.[0]?.finish_reason,completion_tokens:result.usage?.completion_tokens??null,visible_characters:content.length,reasoning_characters:reasoning.length,content},null,2));
 console.log(reasoning.length||(result.usage?.completion_tokens??0)>Math.ceil(content.length/2)+20?'FAIL: reasoning is still on; do not run the council.':'PASS: reasoning is off; the fixed output budgets hold the answer.');
}catch(e){console.log(JSON.stringify({error:e.message},null,2));console.log('FAIL: Token Factory rejected the request; do not run the council.');process.exitCode=1;}
