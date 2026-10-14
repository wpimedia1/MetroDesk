import {providerCall} from './provider-call.mjs';
import {parseModelDecision} from './model-response.mjs';

export const NEBIUS_CHAT='https://api.tokenfactory.nebius.com/v1/chat/completions',TAVILY_SEARCH='https://api.tavily.com/search',TAVILY_EXTRACT='https://api.tavily.com/extract';
// Provider access for one session. Every call carries its own metadata (agent, operation, call number), because the
// engine runs several calls at once; nothing is read from shared session state.
// Nemotron 3 reasons by default, and its hidden reasoning tokens count against max_tokens (a recorded run billed 5,058
// completion tokens for about 113 visible ones). Reasoning is turned off so each turn's fixed output budget holds the answer.
export function createIO({c,keys,save,credentials=null,fetchImpl=fetch,timeouts={}}){
 const call=(url,credential,data,signal,metadata,timeoutMs)=>{
  const name=url===NEBIUS_CHAT?'nebius':'tavily',kind=name==='nebius'?'inference':url===TAVILY_SEARCH?'search':'extract';
  return providerCall(c,save,{url,key:credential.key,data,signal,metadata:{attempt:c.attempts?.at(-1)?.number,...metadata},credentialSource:credential.source,fetchImpl,timeoutMs,onOutcome:credentials?credentials.begin(name,credential.version,kind):()=>{}});
 };
 return {
  save,
  decide:async(messages,signal,{response_format,max_tokens,metadata})=>parseModelDecision(await call(NEBIUS_CHAT,keys.nebius,{model:keys.model,messages,temperature:0.2,max_tokens,response_format,chat_template_kwargs:{enable_thinking:false}},signal,metadata,timeouts.model)),
  search:(query,signal,metadata)=>call(TAVILY_SEARCH,keys.tavily,{query,search_depth:'advanced',max_results:5,include_answer:false},signal,metadata,timeouts.research),
  extract:(urls,signal,metadata)=>call(TAVILY_EXTRACT,keys.tavily,{urls,extract_depth:'advanced'},signal,metadata,timeouts.research)
 };
}
