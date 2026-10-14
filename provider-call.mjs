import {randomUUID} from 'node:crypto';
import {providerError} from './provider-errors.mjs';

// Persist only request metadata, never credentials, request headers or private reasoning.
// Every request has its own time limit; when it expires the request is cancelled and recorded as timed_out.
export async function providerCall(c,save,{url,key,data,signal,metadata={},credentialSource='unspecified',fetchImpl=fetch,onOutcome=()=>{},timeoutMs}) {
  c.provider_calls ||= [];
  const provider=new URL(url).hostname.includes('tavily')?'Tavily':'Nebius';
  const record={id:randomUUID(),provider,endpoint:url,credential_source:credentialSource,model:data.model||null,started_at:new Date().toISOString(),status:'pending',http_status:null,request_id:null,response_id:null,usage:null};
  if(provider==='Nebius'){
    record.requested_max_tokens=data.max_tokens||null;
    record.requested_response_format={type:data.response_format?.type||'unspecified',schema_name:data.response_format?.json_schema?.name||null,strict:data.response_format?.json_schema?.strict??null};
  }
  if(typeof metadata.agent==='string')record.agent=metadata.agent;
  if(typeof metadata.operation_id==='string')record.operation_id=metadata.operation_id;
  if(typeof metadata.purpose==='string')record.purpose=metadata.purpose;
  for(const field of ['attempt','call','correction_attempt','round','run_engine'])if(Number.isSafeInteger(metadata[field]))record[field]=metadata[field];
  const body=JSON.stringify(data);record.request_characters=body.length;
  c.provider_calls.push(record);await save(c);
  const start=Date.now();
  try {
    const limit=Number.isSafeInteger(timeoutMs)&&timeoutMs>0?timeoutMs:provider==='Nebius'?120000:60000;record.timeout_ms=limit;
    const timeout=AbortSignal.timeout(limit);
    const r=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body,signal:signal?AbortSignal.any([signal,timeout]):timeout});
    record.http_status=r.status;
    record.request_id=r.headers.get('x-request-id')||r.headers.get('request-id')||null;
    if(!r.ok){
      // Keep the provider's own explanation (e.g. an unsupported schema) instead of a bare status line.
      const raw=await r.text().catch(()=>''),text=key?raw.split(key).join('[redacted]'):raw;
      let detail=text;
      try{const body=JSON.parse(text);const e=body?.error??body?.detail??body?.message;detail=typeof e==='string'?e:typeof e?.message==='string'?e.message:e?JSON.stringify(e):text;}catch{}
      detail=String(detail).trim().slice(0,1000);
      record.error_body=text.slice(0,4000)||null;
      throw Error(providerError(provider,r.status)+(detail?` Provider response: ${detail}`:''));
    }
    const result=await r.json();
    if(provider==='Nebius'){record.finish_reason=result.choices?.[0]?.finish_reason||null;record.response_characters=String(result.choices?.[0]?.message?.content||'').length;}
    record.request_id ||= typeof result.request_id==='string'?result.request_id:null;
    record.response_id=typeof result.id==='string'?result.id:null;
    record.model=typeof result.model==='string'?result.model:record.model;
    if(result.usage && typeof result.usage==='object') {
      record.usage={};
      for(const key of ['prompt_tokens','completion_tokens','total_tokens','credits'])if(Number.isFinite(result.usage[key]))record.usage[key]=result.usage[key];
    }
    record.status='succeeded';return result;
  }catch(e){
    const timedOut=!signal?.aborted&&(e.name==='TimeoutError'||e.cause?.name==='TimeoutError');
    record.status=signal?.aborted?'cancelled':timedOut?'timed_out':'failed';
    const networkCode=e.cause?.code;
    record.error=timedOut?`${provider} request exceeded its ${record.timeout_ms/1000}-second limit and was cancelled.`:networkCode?`${provider} connection failed (${networkCode}). No provider response received.`:e.message;
    throw Object.assign(Error(record.error),{code:timedOut?'PROVIDER_TIMEOUT':networkCode?'PROVIDER_CONNECTION':record.http_status?'PROVIDER_HTTP':'PROVIDER_FAILED',http_status:record.http_status});
  }finally{record.duration_ms=Date.now()-start;record.finished_at=new Date().toISOString();onOutcome(record);await save(c);}
}
