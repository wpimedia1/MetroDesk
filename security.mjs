import {createHash} from 'node:crypto';
// Content-Security-Policy for the app pages. The only inline script is the import map in public/index.html,
// allowed by its hash; inline styles are used by the app's rendered markup.
export function contentSecurityPolicy(indexHTML){
 const hashes=[...indexHTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).map(s=>`'sha256-${createHash('sha256').update(s).digest('base64')}'`);
 return ["default-src 'self'",`script-src 'self' ${hashes.join(' ')}`.trim(),"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","connect-src 'self'","font-src 'self'","object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'"].join('; ');
}
