import {spawn} from 'node:child_process';
import {openSync,mkdirSync} from 'node:fs';
mkdirSync('artifacts',{recursive:true});
const child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),detached:true,windowsHide:true,stdio:['ignore',openSync('artifacts/server.log','a'),openSync('artifacts/server-error.log','a')]});
child.unref();console.log(`Server PID ${child.pid}`);
