import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
try{process.loadEnvFile('.env');}catch{}
const roots=['public','scripts','docs'];
const files=['.env.example','.gitignore','README.md','LICENSE','VERIFICATION.md','package.json',...(await readdir('.')).filter(p=>p.endsWith('.mjs'))];
async function collect(root){for(const item of await readdir(root,{withFileTypes:true})){const name=path.join(root,item.name);if(item.isDirectory())await collect(name);else files.push(name);}}
for(const root of roots)await collect(root);
if(await access('records').then(()=>true,()=>false))await collect('records');
const keys=[process.env.NEBIUS_API_KEY,process.env.TAVILY_API_KEY,process.env.METRODESK_PASSWORD].filter(Boolean);
for(const file of files){const content=await readFile(file);for(const key of keys)if(content.includes(Buffer.from(key)))throw Error(`Configured credential found in packaging source: ${file}`);}
console.log(JSON.stringify({sourceFiles:files.length,configuredKeysExcluded:true,privatePathsExcluded:['.env','data/','artifacts/','node_modules/','misc/'],licensePresent:files.includes('LICENSE')}));
