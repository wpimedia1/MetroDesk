import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return ''}};
// Text is kept only for US federal works, statute or regulation text and openly licensed text (docs/SOURCES.md).
const reusable=u=>{const h=host(u);return /(^|\.)(fema\.gov|federalregister\.gov|congress\.gov|ecfr\.gov|regulations\.gov|dot\.gov|army\.mil|dvidshub\.net|everycrsreport\.com|wikipedia\.org)$/.test(h)||['usace.contentdm.oclc.org','usafacts.org','law.cornell.edu','govregs.com','leg.colorado.gov','content.qa.coleg.gov','colorado.public.law','scholar.law.colorado.edu'].includes(h)||['https://des.mt.gov/PAPPGv5.0_January06_2025_signed.pdf','https://www.cdid1.org/DocumentCenter/View/362/Fact-Sheet---Public-Law-84-99?bidId=','https://content.leg.colorado.gov/sites/default/files/images/olls/crs2024-title-24.pdf'].includes(u);};
const files=readdirSync(new URL('../records/',import.meta.url)).filter(f=>f.endsWith('.json'));
const sources=readFileSync(new URL('../docs/SOURCES.md',import.meta.url),'utf8');

for(const f of files)test(`record ${f}`,()=>{
 const c=JSON.parse(readFileSync(new URL('../records/'+f,import.meta.url),'utf8'));
 assert.equal(c.deliberation.messages.length,21);assert.equal(c.deliberation.proposals.length,4);assert.ok(c.deliberation.determination);
 // No stored copy of a non-reusable page's text anywhere in the record.
 (function walk(o){if(Array.isArray(o)){o.forEach(walk);return;}if(!o||typeof o!=='object')return;
  if(typeof o.url==='string'&&/^https?:/i.test(o.url)&&!reusable(o.url))for(const k of ['content','raw_content'])if(typeof o[k]==='string')assert.match(o[k],/^\[Text removed/,`${f}: ${o.url} ${k}`);
  for(const v of Object.values(o))walk(v);})(c);
 for(const s of c.sources.filter(s=>/^https?:/i.test(s.url||'')))assert.ok(sources.includes(s.url.replace(/\)/g,'%29').replace(/ /g,'%20')),`${f}: ${s.id} missing from SOURCES.md`);
 assert.equal(JSON.stringify(c).includes('API_KEY'),false);
});
