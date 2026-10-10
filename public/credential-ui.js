const sources={'.env':'Loaded from .env',environment:'Loaded from environment',session:'Saved for this session',none:'Not configured'};
const statuses={succeeded:'Last request succeeded',authentication_rejected:'Authentication rejected',connection_failed:'Connection failed',request_failed:'Request failed',cancelled:'Request cancelled'};
export function outcomeLabel(outcome,catalog=false){
 if(!outcome)return catalog?'Catalog not checked':'Configured, not checked';
 const label=catalog&&outcome.status==='succeeded'?'Catalog access succeeded':statuses[outcome.status]||'Request outcome unknown';
 return `${catalog&&outcome.status!=='succeeded'?'Catalog: ':''}${label}${catalog?'':` / ${outcome.kind}`}${outcome.http_status?` / HTTP ${outcome.http_status}`:''} / ${new Date(outcome.finished_at).toLocaleString()}`;
}
export function renderCredentials(config){
 for(const name of ['nebius','tavily']){
  const provider=config.providers?.[name];
  document.querySelector(`#${name}-source`).textContent=provider?sources[provider.source]:'Status unavailable';
  document.querySelector(`#${name}-status`).textContent=provider?.configured?outcomeLabel(provider.last_request):'Not configured';
  const catalog=document.querySelector(`#${name}-catalog`);
  if(catalog)catalog.textContent=provider?.catalog?outcomeLabel(provider.catalog,true):'Catalog not checked';
 }
 const state=document.querySelector('#connection-state');
 const providers=Object.values(config.providers||{}),last=providers.flatMap(p=>[p.last_request,p.catalog]).filter(Boolean).sort((a,b)=>b.finished_at.localeCompare(a.finished_at));
 state.textContent=config.version!=='quorum-1'?'Server restart required':!config.nebius||!config.tavily?'Credentials incomplete':last[0]&&last[0].status!=='succeeded'?statuses[last[0].status]:providers.every(p=>p.last_request?.status==='succeeded')?'Last requests succeeded':'Configured, not checked';
 state.classList.toggle('ready',config.version==='quorum-1'&&providers.length===2&&providers.every(p=>p.last_request?.status==='succeeded'));
 state.title=providers.map((p,i)=>`${i===0?'Nebius':'Tavily'}: ${p.configured?outcomeLabel(p.last_request):'Not configured'}`).join('\n');
}
