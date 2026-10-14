export function registerDocuments(c){
 let documents=c.documents;
 if(!documents||(Array.isArray(documents)&&!documents.length)){
  // Older intake appended extracted documents to the brief rather than storing them.
  const sections=String(c.input||'').split(/\r?\n\r?\nDOCUMENT: /);
  documents=sections.slice(1).map(section=>{
   const match=section.match(/^([^\r\n]+)\r?\nSHA256: ([a-f0-9]{64})\r?\n([\s\S]*)$/);
   return match?{name:match[1],sha256:match[2],text:match[3]}:null;
  }).filter(Boolean);
 }
 if(!Array.isArray(documents)||documents.length>40)throw Error('Supply at most 40 documents.');
 let size=0;
 for(const document of documents){
  if(typeof document.name!=='string'||typeof document.text!=='string'||!document.text.trim()||typeof document.sha256!=='string'||!/^[a-f0-9]{64}$/.test(document.sha256))throw Error('Documents require a name, extracted text and SHA256.');
  size+=document.text.length;if(size>70000)throw Error('Document text exceeds 70,000 characters.');
  if(c.sources.some(s=>s.origin==='supplied_document'&&s.sha256===document.sha256))continue;
  let number=c.sources.length+1;while(c.sources.some(s=>s.id===`D${number}`))number++;
  c.sources.push({id:`D${number}`,title:document.name,url:'',content:document.text,kind:'extracted',origin:'supplied_document',sha256:document.sha256,notes:document.notes||[]});
 }
 c.documents=documents;
}
// The intake UI appends each document to the brief and also registers it as a source.
// Model calls receive the brief with registered documents replaced by a reference, so text is sent once.
export function briefForModel(c){
 const sections=String(c.input||'').split(/\r?\n\r?\nDOCUMENT: /);
 return sections[0]+sections.slice(1).map(section=>{
  const match=section.match(/^([^\r\n]+)\r?\nSHA256: ([a-f0-9]{64})\r?\n/);
  const source=match&&(c.sources||[]).find(s=>s.origin==='supplied_document'&&s.sha256===match[2]);
  return source?`\n\nDOCUMENT: ${match[1]} / registered as source ${source.id}; its full text is in sources.`:`\n\nDOCUMENT: ${section}`;
 }).join('');
}
// Snippets are search leads; extracted and supplied text stays complete because citations must match it exactly.
export function sourcesForModel(c,snippetLimit=600){
 return (c.sources||[]).map(s=>s.kind==='snippet'&&String(s.content||'').length>snippetLimit?{...s,content:String(s.content).slice(0,snippetLimit),content_truncated:true}:s);
}
// Retrieved text already lives in sources; the turn's retrieval log references it by ID.
export function retrievalsForModel(c,operationId){
 return (c.deliberation?.retrievals||[]).filter(r=>r.operation_id===operationId).map(r=>({...r,results:r.results.map(({source_id,url,title})=>({source_id,url,title}))}));
}
