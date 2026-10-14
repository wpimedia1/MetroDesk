import {mkdir,writeFile} from 'node:fs/promises';
import {providerCall} from '../provider-call.mjs';
try{process.loadEnvFile('.env');}catch{}
const c={provider_calls:[]};
await mkdir('artifacts',{recursive:true});
const save=()=>writeFile('artifacts/nebius-connectivity.json',JSON.stringify(c,null,2));
const key=(process.env.NEBIUS_API_KEY||'').trim();
if(!key)throw Error('No NEBIUS_API_KEY configured.');
try{
 const data=await providerCall(c,save,{url:'https://api.tokenfactory.nebius.com/v1/chat/completions',key,credentialSource:'NEBIUS_API_KEY from environment or .env',data:{model:process.env.NEBIUS_MODEL||'nvidia/Nemotron-3-Ultra-550b-a55b',messages:[{role:'user',content:'Connectivity check only. Return a JSON object with status set to ok.'}],max_tokens:128,response_format:{type:'json_object'}}});
 console.log(JSON.stringify({provider_calls:c.provider_calls,has_content:!!data.choices?.[0]?.message?.content},null,2));
}catch(e){console.log(JSON.stringify({error:e.message,provider_calls:c.provider_calls},null,2));process.exitCode=1;}
