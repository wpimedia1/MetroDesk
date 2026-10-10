import {randomUUID} from 'node:crypto';
import {providerError} from './provider-errors.mjs';

// Persist only request metadata, never credentials, request headers or private reasoning.
export async function providerCall(c,save,{url,key,data,signal,metadata={},credentialSource='unspecified',fetchImpl=fetch,onOutcome=()=>{}}) {
  c.provider_calls ||= [];
  const provider=new URL(url).hostname.includes('tavily')?'Tavily':'Nebius';
  const record={id:randomUUID(),provider,endpoint:url,credential_source:credentialSource,model:data.model||null,started_at:new Date().toISOString(),status:'pending',http_status:null,request_id:null,response_id:null,usage:null};
  if(provider==='Nebius'){
    record.requested_max_tokens=data.max_tokens||null;
    record.requested_response_format={type:data.response_format?.type||'unspecified',schema_name:data.response_format?.json_schema?.name||null,strict:data.response_format?.json_schema?.strict??null};
  }
  if(typeof metadata.agent==='string')record.agent=metadata.agent;
  if(typeof metadata.operation_id==='string')record.operation_id=metadata.operation_id;
  for(const field of ['attempt','call','correction_attempt'])if(Number.isSafeInteger(metadata[field]))record[field]=metadata[field];
  c.provider_calls.push(record);await save(c);
  const start=Date.now();
  try {
    const timeout=AbortSignal.timeout(provider==='Nebius'?600000:180000);
    const r=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(data),signal:signal?AbortSignal.any([signal,timeout]):timeout});
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
    if(provider==='Nebius')record.finish_reason=result.choices?.[0]?.finish_reason||null;
    record.request_id ||= typeof result.request_id==='string'?result.request_id:null;
    record.response_id=typeof result.id==='string'?result.id:null;
    record.model=typeof result.model==='string'?result.model:record.model;
    if(result.usage && typeof result.usage==='object') {
      record.usage={};
      for(const key of ['prompt_tokens','completion_tokens','total_tokens','credits'])if(Number.isFinite(result.usage[key]))record.usage[key]=result.usage[key];
    }
    record.status='succeeded';return result;
  }catch(e){
    record.status=signal?.aborted?'cancelled':'failed';
    const networkCode=e.cause?.code;
    record.error=networkCode?`${provider} connection failed (${networkCode}). No provider response received.`:e.message;
    throw Error(record.error);
  }finally{record.duration_ms=Date.now()-start;record.finished_at=new Date().toISOString();onOutcome(record);await save(c);}
}
