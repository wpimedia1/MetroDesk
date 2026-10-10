const providers=['nebius','tavily'];
export function createCredentialStore(inherited={},loaded={}){
 const entries=Object.fromEntries(providers.map(name=>{
  const variable=name.toUpperCase()+'_API_KEY',key=(loaded[variable]||'').trim();
  return [name,{key,source:key?(inherited[variable]!==undefined?'environment':'.env'):'none',version:1,last:null,catalog:null,sequence:0}];
 }));
 return {
  replace(name,value){
   const entry=entries[name],key=typeof value==='string'?value.trim():'';
   if(!key||key===entry.key)return;
   Object.assign(entry,{key,source:'session',version:entry.version+1,last:null,catalog:null});
  },
  snapshot(){return Object.fromEntries(providers.map(name=>[name,{key:entries[name].key,source:entries[name].source,version:entries[name].version}]));},
  begin(name,version,kind){
   const entry=entries[name],sequence=++entry.sequence,started_at=new Date().toISOString();
   return result=>{
    if(entry.version!==version)return;
    const field=kind==='catalog'?'catalog':'last';
    if(entry[field]?.sequence>sequence)return;
    const http_status=Number.isInteger(result.http_status)?result.http_status:null;
    const status=result.status==='cancelled'?'cancelled':result.status==='succeeded'?'succeeded':
     [401,403].includes(http_status)?'authentication_rejected':http_status===null?'connection_failed':'request_failed';
    entry[field]={kind,status,http_status,started_at,finished_at:result.finished_at||new Date().toISOString(),sequence};
   };
  },
  public(){
   const outcome=value=>value?Object.fromEntries(Object.entries(value).filter(([k])=>k!=='sequence')):null;
   return Object.fromEntries(providers.map(name=>{const e=entries[name];return [name,{configured:!!e.key,source:e.source,last_request:outcome(e.last),catalog:outcome(e.catalog)}];}));
  }
 };
}
