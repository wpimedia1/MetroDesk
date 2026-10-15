// Builds dist/: a read-only copy of the MetroDesk front end with the archived runs in records/. It needs no server
// and no provider keys, and makes no API calls, so it can be hosted on any static host (e.g. Cloudflare Pages:
// build command "node scripts/build-static.mjs", output directory "dist").
import {rmSync,mkdirSync,cpSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reportHTML} from '../report.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
rmSync(dist,{recursive:true,force:true});
cpSync(path.join(root,'public'),dist,{recursive:true});
mkdirSync(path.join(dist,'records'));mkdirSync(path.join(dist,'reports'));
// One record per session: the highest archived revision.
const latest=new Map();
for(const file of readdirSync(path.join(root,'records')).filter(f=>f.endsWith('.json'))){
 const m=file.match(/^([a-f0-9-]{36})-r(\d+)\.json$/);if(!m)throw Error(`Unexpected record file name: ${file}`);
 if(!latest.has(m[1])||latest.get(m[1]).revision<Number(m[2]))latest.set(m[1],{revision:Number(m[2]),file});
}
if(!latest.size)throw Error('No archived records in records/.');
const index=[];
for(const [id,{file}] of latest){
 const c=JSON.parse(readFileSync(path.join(root,'records',file),'utf8'));
 if(c.id!==id)throw Error(`${file}: record id ${c.id} does not match its file name.`);
 writeFileSync(path.join(dist,'records',`${id}.json`),JSON.stringify(c));
 writeFileSync(path.join(dist,'reports',`${id}.html`),reportHTML(c));
 index.push({id,title:c.title,status:c.status,created:c.created});
}
index.sort((a,b)=>String(b.created).localeCompare(String(a.created)));
writeFileSync(path.join(dist,'cases.json'),JSON.stringify(index));
// Marks the page as the read-only build; app.js reads this attribute.
const page=path.join(dist,'index.html'),html=readFileSync(page,'utf8');
if(!html.includes('<html lang="en">'))throw Error('index.html: <html lang="en"> not found.');
writeFileSync(page,html.replace('<html lang="en">','<html lang="en" data-static="true">'));
console.log(`dist/ built with ${index.length} recorded runs: ${index.map(c=>c.title).join('; ')}`);
