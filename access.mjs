import {createHash,timingSafeEqual} from 'node:crypto';

export function createAccess({host,origin,username,password}){
 const local=['127.0.0.1','localhost','::1'].includes(host),configured=Boolean(username&&password);
 if(Boolean(username)!==Boolean(password))throw Error('Configure both METRODESK_USERNAME and METRODESK_PASSWORD.');
 if(!local&&(!configured||new URL(origin).protocol!=='https:'))throw Error('Public binding requires HTTPS APP_ORIGIN and METRODESK_USERNAME/METRODESK_PASSWORD.');
 const digest=value=>createHash('sha256').update(value).digest();
 const expected=configured?digest('Basic '+Buffer.from(username+':'+password).toString('base64')):null;
 return authorization=>!configured||timingSafeEqual(digest(String(authorization||'')),expected);
}
// Failed sign-ins are limited per connecting address: after `limit` failures within `windowMs` that address is
// refused until the window ends. Behind a reverse proxy every client shares the proxy's address, so rate-limit at the proxy too.
export function createLoginLimiter({limit=10,windowMs=15*60*1000,now=()=>Date.now()}={}){
 const failures=new Map();
 const entry=key=>{const e=failures.get(key);if(e&&now()-e.first>=windowMs){failures.delete(key);return null;}return e;};
 return {
  blocked(key){const e=entry(key);return e&&e.count>=limit?Math.ceil((e.first+windowMs-now())/1000):0;},
  failed(key){const e=entry(key);if(e)e.count++;else failures.set(key,{count:1,first:now()});if(failures.size>10000)failures.delete(failures.keys().next().value);},
  succeeded(key){failures.delete(key);}
 };
}
