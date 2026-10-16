import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const port=4590+Math.floor(Math.random()*300),base=`http://127.0.0.1:${port}`;
let server;
test.before(async()=>{
 server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',NEBIUS_API_KEY:'',TAVILY_API_KEY:'',METRODESK_USERNAME:'',METRODESK_PASSWORD:'',METRODESK_RECORDS_DIR:mkdtempSync(path.join(tmpdir(),'md-'))},stdio:'ignore'});
 for(let i=0;i<50;i++){try{await fetch(base+'/api/config');return;}catch{await sleep(100);}}
 throw Error('Server did not start.');
});
test.after(()=>server?.kill());

test('static files: no traversal, no path disclosure, CSP on pages', async()=>{
 const missing=await fetch(base+'/nope.js');assert.equal(missing.status,404);assert.deepEqual(await missing.json(),{error:'Not found.'});
 const page=await fetch(base+'/');assert.match(page.headers.get('content-security-policy'),/default-src 'self'/);
 assert.equal(page.headers.get('x-frame-options'),'DENY');
});
test('host and origin checks', async()=>{
 // fetch cannot set Host, so this uses node:http (a DNS-rebinding request carries a foreign Host).
 const status=await new Promise((ok,fail)=>http.get({host:'127.0.0.1',port,path:'/api/config',headers:{Host:'evil.example'}},r=>{r.resume();ok(r.statusCode);}).on('error',fail));
 assert.equal(status,403);
 assert.equal((await fetch(base+'/api/config',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
});
test('documents must be extracted by this server', async()=>{
 const post=(p,b)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 const forged=await post('/api/cases',{title:'t',mode:'evidence',input:'situation text long enough here',documents:[{name:'x',text:'forged',sha256:'a'.repeat(64)}]});
 assert.equal(forged.status,400);
 const up=await (await post('/api/document',{name:'a.txt',data:Buffer.from('real document text').toString('base64')})).json();
 const ok=await post('/api/cases',{title:'t',mode:'evidence',input:'situation text long enough here',documents:[{name:'a.txt',text:up.text,sha256:up.sha256}]});
 assert.equal(ok.status,201);const c=await ok.json();assert.equal(c.sources[0].sha256,up.sha256);
 await post(`/api/cases/${c.id}/delete`,{});
});
test('config never returns keys', async()=>{
 const c=await (await fetch(base+'/api/config')).json();assert.equal(JSON.stringify(c).includes('key"'),false);
});
