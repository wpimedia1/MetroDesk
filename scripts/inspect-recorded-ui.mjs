import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Usage: node scripts/inspect-recorded-ui.mjs CASE_ID (reads data/CASE_ID.json) or a path to an exported record.
const arg=process.argv[2]||'',file=/^[a-f0-9-]{36}$/.test(arg)?`data/${arg}.json`:arg.endsWith('.json')?arg:null;
if(!file)throw Error('Usage: node scripts/inspect-recorded-ui.mjs CASE_ID | RECORD.json');
const record=JSON.parse(await readFile(file,'utf8')),id=record.id;
if(!process.env.BUNDLED_MODULES)throw Error('Set BUNDLED_MODULES to a node_modules directory that contains playwright.');
const require=createRequire(process.env.BUNDLED_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
const results=[];
try{
 await mkdir('artifacts',{recursive:true});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.EventSource=class extends EventTarget{close(){}};
   document.addEventListener('DOMContentLoaded',()=>{
    const banner=document.createElement('div');banner.textContent='RECORDED CASE INSPECTION / READ ONLY / NO PROVIDER CALLS';banner.style.cssText='padding:12px;background:#fff;color:#ac3125;border-bottom:2px solid #ac3125;font:12px Arial;';document.body.prepend(banner);
    const lock=()=>{for(const id of ['start','stop','delete','connections','new-case']){const button=document.getElementById(id);if(button&&!button.disabled)button.disabled=true;}const footer=document.getElementById('footer-mode');if(footer&&footer.textContent!=='RECORDED CASE')footer.textContent='RECORDED CASE';};
    new MutationObserver(lock).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});lock();
   });
  });
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());assert.equal(url.origin,'http://metrodesk-record.invalid');
   if(request.method()!=='GET')return route.fulfill({status:405,json:{error:'Read-only recorded inspection.'}});
   if(url.pathname.startsWith('/api/')){
    if(url.pathname==='/api/config')return route.fulfill({json:{version:'metrodesk-1',runtime_contract:3,model:record.provider_calls?.at(-1)?.model||'',nebius:false,tavily:false,providers:{nebius:{configured:false,source:'none'},tavily:{configured:false,source:'none'}}}});
    if(url.pathname==='/api/cases')return route.fulfill({json:[record]});
    if(url.pathname===`/api/cases/${id}`)return route.fulfill({json:record});
    return route.fulfill({status:404,json:{error:'Unavailable in recorded inspection.'}});
   }
   const file=path.resolve('public','.'+(url.pathname==='/'?'/index.html':url.pathname));assert.ok(file.startsWith(path.resolve('public')+path.sep));
   await route.fulfill({body:await readFile(file),contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(file)]||'application/octet-stream'});
  });
  await page.goto('http://metrodesk-record.invalid');await page.waitForFunction(()=>document.querySelector('#case-select').value!==''&&document.querySelector('#status-title').textContent!=='Ready');await page.waitForTimeout(700);
  assert.equal(await page.locator('#start').isDisabled(),true);
  assert.equal(await page.locator('#footer-mode').innerText(),'RECORDED CASE');
  const status=await page.locator('#status-title').innerText();if(record.status==='error')assert.equal(status,'Failed');if(record.status==='complete')assert.equal(status,'Finished');if(record.status==='running')assert.equal(status,'Running');
  const colors=await page.locator('canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),pixel=new Uint8Array(4),colors=new Set();for(let x=0;x<canvas.width;x+=15)for(let y=0;y<canvas.height;y+=15){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);colors.add([...pixel].join(','));}return colors.size;});assert.ok(colors>30);
  await page.screenshot({path:`artifacts/recorded-${id}-floor-${viewport.width}.png`,fullPage:true});
  await page.locator('#activity').click();assert.match(await page.locator('#content-view').innerText(),/Provider request records/);
  assert.equal(await page.locator('#content-view .receipt').filter({hasText:'Nebius / succeeded'}).count(),record.provider_calls.filter(r=>r.provider==='Nebius'&&r.status==='succeeded').length);
  await page.screenshot({path:`artifacts/recorded-${id}-activity-${viewport.width}.png`,fullPage:true});
  await page.locator('[data-view=decision]').click();await page.waitForTimeout(300);
  if(record.deliberation?.determination)assert.match(await page.locator('#content-view').innerText(),/agreement/i);
  await page.screenshot({path:`artifacts/recorded-${id}-decision-${viewport.width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({viewport,case_id:id,actual_status:record.status,accepted_messages:record.deliberation?.messages.length||0,canvas_colors:colors,read_only:true,provider_calls_made:0,errors});await page.close();
 }
 await writeFile(`artifacts/recorded-${id}-ui-check.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();console.log('Owned inspection browser closed.');}
