import {mkdir,writeFile,chmod} from 'node:fs/promises';
import path from 'node:path';
import {inspectAcceptance} from './acceptance.mjs';

// A recorded run is a completed live deliberation that used Tavily: it passes acceptance (all 21 contributions,
// four proposal versions, votes, determination and linked provider receipts) and has successful search and extract
// receipts. Its flaws are not grounds for exclusion: unverified citations, unreviewed or disputed objections and
// declined evidence stay in the record and the determination, where they are disclosed.
export function goodRun(c){
 const tavily=endpoint=>(c.provider_calls||[]).some(r=>r.provider==='Tavily'&&r.status==='succeeded'&&r.http_status===200&&String(r.endpoint).endsWith(endpoint));
 return inspectAcceptance(c).passed&&tavily('/search')&&tavily('/extract');
}
// Only recorded runs are copied into records/, which Git tracks. Copies are written once per revision
// (never overwritten) and marked read-only. Every other run stays in data/, which Git ignores.
export async function archiveRecord(dir,c,{accept=goodRun}={}){
 if(!/^[a-f0-9-]{36}$/.test(String(c.id)))throw Error('Invalid record ID for archive.');
 if(!accept(c))return null;
 await mkdir(dir,{recursive:true});
 const file=path.join(dir,`${c.id}-r${c.revision||0}.json`);
 try{await writeFile(file,JSON.stringify(c,null,2),{flag:'wx'});}
 catch(e){if(e.code==='EEXIST')return file;throw e;}
 await chmod(file,0o444);
 return file;
}
