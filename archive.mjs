import {mkdir,writeFile,chmod} from 'node:fs/promises';
import path from 'node:path';
import {inspectAcceptance} from './acceptance.mjs';

// A good run passes research acceptance and has no unverified citations.
export function goodRun(c){
 const inspected=inspectAcceptance(c,{requireResearch:true});
 return inspected.passed&&inspected.unverified_citations.length===0;
}
// Only good runs are copied into records/, which Git tracks. Copies are written once per revision
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
