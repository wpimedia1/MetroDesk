import {createHash,timingSafeEqual} from 'node:crypto';

export function createAccess({host,origin,username,password}){
 const local=['127.0.0.1','localhost','::1'].includes(host),configured=Boolean(username&&password);
 if(Boolean(username)!==Boolean(password))throw Error('Configure both QUORUM_USERNAME and QUORUM_PASSWORD.');
 if(!local&&(!configured||new URL(origin).protocol!=='https:'))throw Error('Public binding requires HTTPS APP_ORIGIN and QUORUM_USERNAME/QUORUM_PASSWORD.');
 const digest=value=>createHash('sha256').update(value).digest();
 const expected=configured?digest('Basic '+Buffer.from(username+':'+password).toString('base64')):null;
 return authorization=>!configured||timingSafeEqual(digest(String(authorization||'')),expected);
}
