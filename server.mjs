import http from 'node:http';
import {readFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initializeDeliberation,runDeliberation,respondToEvidence,openEvidenceRequests} from './deliberation.mjs';
import {reportHTML} from './report.mjs';
import {writeRecord} from './record-store.mjs';
import {archiveRecord} from './archive.mjs';
import {createAccess} from './access.mjs';
import {providerError} from './provider-errors.mjs';
import {providerCall} from './provider-call.mjs';
import {createCredentialStore} from './credential-status.mjs';
import {parseModelDecision} from './model-response.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const inherited={...process.env};
try{process.loadEnvFile(path.join(root,'.env'));}catch{}
const port=Number(process.env.PORT||4400),host=process.env.HOST||'127.0.0.1',base=process.env.APP_ORIGIN||`http://127.0.0.1:${port}`;
const authorized=createAccess({host,origin:base,username:process.env.METRODESK_USERNAME,password:process.env.METRODESK_PASSWORD});
const credentials=createCredentialStore(inherited,process.env);
const config={model:process.env.NEBIUS_MODEL||'nvidia/Nemotron-3-Ultra-550b-a55b'};
function publicConfig(){const providers=credentials.public();return {nebius:providers.nebius.configured,tavily:providers.tavily.configured,providers,model:config.model,version:'metrodesk-1',runtime_contract:2};}
const cases=new Map(), jobs=new Map(),streams=new Map(),writes=new Map();
// Read once at startup so a later environment change cannot redirect live-record archives.
const recordsDir=process.env.METRODESK_RECORDS_DIR||path.join(root,'records');
await mkdir(path.join(root,'data'),{recursive:true});
async function save(c){c.updated_at=new Date().toISOString();c.revision=(c.revision||0)+1;const revision=c.revision,content=JSON.stringify(c,null,2),p=path.join(root,'data',`${c.id}.json`);const pending=(writes.get(c.id)||Promise.resolve()).catch(()=>{}).then(async()=>{await writeRecord(p,content);for(const res of streams.get(c.id)||[])res.write(`id: ${revision}\nevent: state\ndata: ${JSON.stringify({revision})}\n\n`);});writes.set(c.id,pending);await pending;if(writes.get(c.id)===pending)writes.delete(c.id);}
for(const file of await readdir(path.join(root,'data'))){if(!file.endsWith('.json'))continue;try{const c=JSON.parse(await readFile(path.join(root,'data',file),'utf8'));if(c.record_version!==2)continue;if(['running','recovering'].includes(c.status))c.status='interrupted';cases.set(c.id,c);}catch{}}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function body(req){let size=0,chunks=[];for await(const b of req){size+=b.length;if(size>16*1024*1024)throw Error('Request exceeds 16 MB.');chunks.push(b);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
function ioFor(keys,c){
 const call=(url,credential,data,signal,metadata={})=>{const name=url.includes('tavily')?'tavily':'nebius';const operation=c.deliberation?.operation;return providerCall(c,save,{url,key:credential.key,data,signal,metadata:{agent:operation?.agent,operation_id:operation?.id,attempt:c.attempts?.at(-1)?.number,call:c.actions,correction_attempt:operation?(operation.retries||0)+1:undefined,...metadata},credentialSource:credential.source,onOutcome:credentials.begin(name,credential.version,name==='nebius'?'inference':url.endsWith('/search')?'search':'extract')});};
 return {save,decide:async(messages,signal,options={})=>{
   const r=await call('https://api.tokenfactory.nebius.com/v1/chat/completions',keys.nebius,{model:keys.model,messages,temperature:0.2,max_tokens:options.max_tokens||16384,response_format:options.response_format||{type:'json_object'}},signal,{agent:options.agent,operation_id:options.operation_id});
   return parseModelDecision(r);
 },search:(query,signal)=>call('https://api.tavily.com/search',keys.tavily,{query,search_depth:'advanced',max_results:5,include_answer:false,include_usage:true},signal),extract:(urls,signal)=>call('https://api.tavily.com/extract',keys.tavily,{urls,extract_depth:'advanced',include_usage:true},signal)};
}
function planningSettings(b){
 const mode=b.mode||'evidence';if(!['scenario','evidence'].includes(mode))throw Error('Choose scenario or evidence mode.');
 const constraints={};for(const k of ['budget_usd','actor_count','minimum_reserve_usd']){const raw=b.constraints?.[k];if(raw!==undefined&&raw!==null&&raw!==''){if(!Number.isSafeInteger(raw)||raw<0||(k!=='minimum_reserve_usd'&&raw===0)||(k==='actor_count'&&raw>20))throw Error(`Invalid ${k}.`);constraints[k]=raw;}}
 if(constraints.minimum_reserve_usd>constraints.budget_usd)throw Error('Reserve cannot exceed total budget.');
 return {mode,constraints};
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
 try {
 if(!authorized(req.headers.authorization)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="MetroDesk", charset="UTF-8"','Cache-Control':'no-store','Content-Type':'application/json'});return res.end(JSON.stringify({error:'Authentication required.'}));}
 if(![`127.0.0.1:${port}`,`localhost:${port}`,new URL(base).host].includes(req.headers.host))return send(res,403,{error:'Invalid host.'});
  if(!['GET','HEAD'].includes(req.method) && req.headers.origin && ![base,`http://localhost:${port}`].includes(req.headers.origin))return send(res,403,{error:'Invalid origin.'});
  const url=new URL(req.url,base), p=url.pathname;
  if(p==='/api/config' && req.method==='GET')return send(res,200,publicConfig());
  if(p==='/api/config' && req.method==='POST'){const b=await body(req);for(const k of ['nebius','tavily'])credentials.replace(k,b[k]);if(typeof b.model==='string'&&b.model.trim())config.model=b.model.trim();return send(res,200,{saved:true});}
  if(p==='/api/models' && req.method==='GET'){
   const key=credentials.snapshot().nebius;if(!key.key)throw Error('Enter a Nebius API key first.');
   const finish=credentials.begin('nebius',key.version,'catalog');let http_status=null;
   try{const r=await fetch('https://api.tokenfactory.nebius.com/v1/models',{headers:{Authorization:`Bearer ${key.key}`},signal:AbortSignal.timeout(20000)});http_status=r.status;if(!r.ok)throw Error(providerError('Nebius',r.status));const result=await r.json();finish({status:'succeeded',http_status});return send(res,200,result);}
   catch(e){finish({status:'failed',http_status});throw e;}
  }
  if(p==='/api/cases' && req.method==='GET')return send(res,200,[...cases.values()].map(({id,title,status,created})=>({id,title,status,created})).reverse());
  if(p==='/api/cases' && req.method==='POST'){const b=await body(req);if(typeof b.input!=='string'||b.input.trim().length<20||b.input.length>70000)throw Error('Enter an inquiry between 20 and 70,000 characters.');const c=initializeDeliberation({id:randomUUID(),title:String(b.title||'Untitled inquiry').slice(0,120),input:b.input,documents:b.documents,objective:String(b.objective||'').slice(0,5000),stakeholder_needs:String(b.stakeholder_needs||'').slice(0,10000),...planningSettings(b),created:new Date().toISOString(),status:'ready',phase:'Observe',sources:[],rounds:[],events:[],assessments:{},actions:0});cases.set(c.id,c);await save(c);return send(res,201,c);}
  if(p==='/api/document' && req.method==='POST'){
    const b=await body(req),bytes=Buffer.from(String(b.data||''),'base64');if(bytes.length>10*1024*1024)throw Error('Document must be under 10 MB.');
    let text='',notes=[];
    if(bytes.subarray(0,5).toString()==='%PDF-'){const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true,isEvalSupported:false}).promise;if(doc.numPages>80)throw Error('Maximum 80 pages.');for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const content=await page.getTextContent();text+=`\n[Page ${i}]\n`+content.items.map(x=>x.str||'').join(' ');}const attachments=await doc.getAttachments();if(attachments)notes.push(`Embedded attachments: ${Object.keys(attachments).join(', ')}`);await doc.destroy();if(text.trim().length<40)notes.push('Little extractable text. Scanned pages may require OCR; no OCR or authenticity determination performed.');}
    else if(/\.(txt|md)$/i.test(b.name||''))text=bytes.toString('utf8');else throw Error('Supported files: PDF, TXT and Markdown.');
    if(text.length>60000)throw Error('Extracted text exceeds 60,000 characters. Submit a smaller document.');
    return send(res,200,{text,notes,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const match=p.match(/^\/api\/cases\/([a-f0-9-]+)(?:\/(run|stop|export|report|stream|delete|configure|evidence))?$/);
  if(match){const c=cases.get(match[1]);if(!c)return send(res,404,{error:'Inquiry not found.'});const action=match[2];
    if(!action || action==='export')return send(res,200,c);
    if(action==='report'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`inline; filename="metrodesk-${c.id}.html"`});return res.end(reportHTML(c));}
    if(action==='stream'){
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(`id: ${c.revision||0}\nevent: state\ndata: ${JSON.stringify({revision:c.revision||0})}\n\n`);
     if(!streams.has(c.id))streams.set(c.id,new Set());streams.get(c.id).add(res);
     const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),15000);
     res.on('close',()=>{clearInterval(heartbeat);streams.get(c.id)?.delete(res);if(!streams.get(c.id)?.size)streams.delete(c.id);});return;
    }
    if(req.method!=='POST')return send(res,405,{error:'POST required.'});
    // A run that has already left running/recovering may still be persisting its last state; wait for it.
    if(action!=='stop'&&jobs.has(c.id)&&!['running','recovering'].includes(c.status))await jobs.get(c.id).done;
    if(action==='configure'){if(jobs.has(c.id)||c.rounds.length||c.deliberation?.messages.length)throw Error('Only a record without accepted contributions can be reconfigured.');Object.assign(c,planningSettings(await body(req)));await save(c);return send(res,200,c);}
    if(action==='delete'){if(jobs.has(c.id))throw Error('Stop this council before deleting the record.');await unlink(path.join(root,'data',`${c.id}.json`));cases.delete(c.id);return send(res,200,{deleted:true});}
    if(action==='evidence'){if(jobs.has(c.id))throw Error('Stop this council before responding.');const b=await body(req);respondToEvidence(c,b.responses);await save(c);return send(res,200,c);}
    if(action==='stop'){const b=await body(req);if(b.run_id&&b.run_id!==c.run_id)return send(res,409,{error:'Run ownership changed; not stopped.'});jobs.get(c.id)?.controller.abort();return send(res,200,{stopping:true,run_id:c.run_id});}
    if(action==='run'){const b=await body(req);if(b.run_id&&!/^[a-f0-9-]{36}$/.test(b.run_id))throw Error('Invalid run ID.');if(jobs.has(c.id))throw Error('This council is already running.');if(jobs.size)throw Error('One council can run at a time.');const keys=credentials.snapshot();if(!keys.nebius.key||!keys.tavily.key)throw Error('Connect Nebius and Tavily in Connections before starting.');if(c.deliberation.determination)throw Error('Session complete. Create a follow-up inquiry.');if(openEvidenceRequests(c).length)throw Error('Answer or decline the open evidence requests before resuming.');const controller=new AbortController();c.run_id=b.run_id||randomUUID();c.status='running';const done=runDeliberation(c,ioFor({...keys,model:config.model},c),controller.signal).catch(e=>console.error('Council persistence failed:',e.code||e.name)).then(()=>archiveRecord(recordsDir,c).catch(e=>console.error('Live record archive failed:',e.message))).finally(()=>jobs.delete(c.id));jobs.set(c.id,{controller,done});return send(res,202,{started:true,run_id:c.run_id});}
  }
  if(p.startsWith('/api/'))return send(res,404,{error:'Not found.'});
  let file=p==='/'?'/index.html':p;
  let full=path.join(root,'public',file);
  if(!full.startsWith(path.join(root,'public')+path.sep))return send(res,403,{error:'Forbidden.'});
  const data=await readFile(full);res.writeHead(200,{'Content-Type':types[path.extname(full)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch(e){send(res,e.code==='ENOENT'?404:400,{error:e.message});}
}).listen(port,host,()=>console.log(`MetroDesk listening at ${base}`));
