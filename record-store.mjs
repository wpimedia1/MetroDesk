import {writeFile,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {setTimeout} from 'node:timers/promises';

export async function writeRecord(file,content,io={writeFile,rename,unlink,sleep:setTimeout}){
 const staging=`${file}.${randomUUID()}.tmp`;
 try{
  await io.writeFile(staging,content);
  // Windows sync clients can briefly lock the destination during replacement.
  for(let attempt=0;;attempt++){
   try{await io.rename(staging,file);break;}
   catch(error){
    if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=7)throw error;
    await io.sleep(Math.min(25*2**attempt,800));
   }
  }
 }finally{await io.unlink(staging).catch(()=>{});}
}
