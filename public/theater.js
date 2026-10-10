import * as THREE from 'three';
export const seats=[{id:'negotiator',name:'Negotiator',color:'#e79160'},{id:'analyst',name:'Analyst',color:'#62bcbb'},{id:'risk',name:'Risk',color:'#e56f68'},{id:'strategy',name:'Strategy',color:'#86a9d1'},{id:'stability',name:'Stability',color:'#d0c18b'}];
export function createTheater(host,onSelect){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#172124');
 const camera=new THREE.PerspectiveCamera(40,1,.1,120),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','QUORUM amphitheater with five council participants');
 scene.add(new THREE.HemisphereLight(0xd8edec,0x243335,2.1));
 const key=new THREE.DirectionalLight(0xffeedb,3);key.position.set(3,14,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-14,right:14,top:14,bottom:-14});scene.add(key);
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.65});
 function mesh(geometry,color,x,y,z){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
 const box=(w,h,d,color,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z);
 const cylinder=(r,h,color,x,y,z,n=64)=>mesh(new THREE.CylinderGeometry(r,r,h,n),color,x,y,z);
 cylinder(12,.3,'#202f32',0,-.55,0);cylinder(9.2,.3,'#34474a',0,-.32,0);cylinder(7.8,.32,'#435455',0,-.05,0);cylinder(6.4,.22,'#293d40',0,.19,0);
 for(let tier=0;tier<3;tier++){
  const r=8+tier*1.3,g=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.35,80,1,false,Math.PI*.55,Math.PI*.9),mat(tier%2?'#687773':'#4b615f'));g.position.y=.3+tier*.35;scene.add(g);g.receiveShadow=true;
  for(let j=0;j<16;j++){const a=Math.PI*.55+j*Math.PI*.9/15;const chair=box(.45,.45,.4,'#263b3e',Math.sin(a)*(r-.55),.65+tier*.35,Math.cos(a)*(r-.55));chair.rotation.y=a;}
 }
 cylinder(2.3,.38,'#bfc7bf',0,.48,0,8);cylinder(2.12,.1,'#334d4e',0,.72,0,8);cylinder(1.35,.52,'#537472',0,1.02,0,8);cylinder(1.62,.12,'#d8dfd6',0,1.34,0,8);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const tablet=box(.46,.035,.33,'#22383d',Math.sin(a)*1.18,1.43,Math.cos(a)*1.18);tablet.rotation.y=a;}
 const display=box(1.15,.08,.75,'#123e3c',0,1.47,0);display.material.emissive=new THREE.Color('#2c8d80');display.material.emissiveIntensity=.3;
 const proposalCanvas=document.createElement('canvas');proposalCanvas.width=1024;proposalCanvas.height=512;
 const proposalTexture=new THREE.CanvasTexture(proposalCanvas);proposalTexture.colorSpace=THREE.SRGBColorSpace;
 const board=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7),new THREE.MeshBasicMaterial({map:proposalTexture,side:THREE.DoubleSide}));board.position.set(0,2.5,1.5);board.rotation.y=.4;scene.add(board);
 let displayKey=null;
 function updateDisplay(c){
  const p=c?.deliberation?.proposals.at(-1),key=JSON.stringify([c?.id,p?.version,p?.recommendation]);if(key===displayKey)return;displayKey=key;
  const ctx=proposalCanvas.getContext('2d');ctx.fillStyle='#f1f5ef';ctx.fillRect(0,0,1024,512);ctx.fillStyle='#06796f';ctx.fillRect(0,0,1024,12);ctx.fillStyle='#203b3c';ctx.font='bold 40px Arial';ctx.fillText(p?`PROPOSAL ${p.version} / ROUND ${p.round}`:'AWAITING PROPOSAL',40,80);
  const text=p?.recommendation||'The floor is open.';ctx.font='28px Arial';let line='',y=138;
  for(const word of text.split(/\s+/)){if(ctx.measureText(line+' '+word).width>920){ctx.fillText(line,40,y);line=word;y+=40;if(y>230){line+=' ...';break;}}else line+=(line?' ':'')+word;}ctx.fillText(line,40,y);
  const allocations=p?.scenario?.allocations||[];const max=Math.max(1,...allocations.map(a=>a.amount_usd));
  allocations.slice(0,3).forEach((a,i)=>{const row=305+i*62;ctx.fillStyle='#203b3c';ctx.font='24px Arial';const label=a.actor.length>24?a.actor.slice(0,23)+'...':a.actor;ctx.fillText(label,40,row);ctx.fillStyle=['#158879','#d56648','#608bbb'][i];ctx.fillRect(360,row-20,420*a.amount_usd/max,24);ctx.fillStyle='#203b3c';ctx.font='23px Arial';ctx.fillText('$'+Number(a.amount_usd).toLocaleString(),800,row);});
  if(!allocations.length){ctx.font='24px Arial';ctx.fillStyle='#5e7777';ctx.fillText(p?'Evidence review / inspect the proposal on the record':'No model contribution received.',40,330);}
  if(allocations.length>3){ctx.font='20px Arial';ctx.fillText(`+ ${allocations.length-3} additional allocations in the decision record`,40,492);}
  proposalTexture.needsUpdate=true;
 }
 updateDisplay(null);
 const actors=[],pickables=[],labels=[];
 for(let i=0;i<seats.length;i++){
  const seat=seats[i],a=-1.22+i*.61,x=Math.sin(a)*4.5,z=-Math.cos(a)*4.5;
  const g=new THREE.Group();g.position.set(x,.3,z);g.rotation.y=a;scene.add(g);
  function part(geometry,color,px,py,pz){const m=new THREE.Mesh(geometry,mat(color));m.position.set(px,py,pz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  part(new THREE.BoxGeometry(1.04,.2,.94),'#32494b',0,.5,0);part(new THREE.BoxGeometry(1.04,1,.15),'#5a706c',0,1,.45);part(new THREE.CylinderGeometry(.25,.33,.65,12),seat.color,0,1.02,0);part(new THREE.SphereGeometry(.22,16,12),'#dfb59a',0,1.55,-.05);
  for(const side of [-1,1]){part(new THREE.BoxGeometry(.17,.5,.18),seat.color,side*.35,1,-.08);part(new THREE.BoxGeometry(.18,.4,.2),'#25393d',side*.17,.55,-.22);}
  part(new THREE.BoxGeometry(.7,.06,.46),'#829794',0,.88,-.63);part(new THREE.BoxGeometry(1.28,.06,.72),'#d1d8cf',0,.87,-.82);
  const hit=part(new THREE.BoxGeometry(1.45,2.1,1.9),seat.color,0,1,0);hit.visible=false;hit.userData.agent=seat.id;pickables.push(hit);
  const light=new THREE.PointLight(seat.color,0,4);light.position.set(x,2.7,z);scene.add(light);
  const marker=cylinder(.7,.03,seat.color,x,.47,z);marker.material.emissive=new THREE.Color(seat.color);marker.material.emissiveIntensity=.05;
  const b=document.createElement('button');b.className='seat-label';b.textContent=seat.name;b.dataset.agent=seat.id;b.setAttribute('aria-label',`${seat.name} contributions`);b.onclick=()=>onSelect(seat.id);document.querySelector('#seat-labels').append(b);
  actors.push({id:seat.id,g,light,marker,x,z,angle:a,color:seat.color,stand:0,pulse:0});labels.push({button:b,position:new THREE.Vector3(x,.3,z-.85)});
 }
 for(const side of [-1,1])for(let i=0;i<4;i++){const rib=box(.14,3.5,.14,'#48605f',side*(8.6-i*.15),1.6,-5+i*2);rib.rotation.z=side*.12;}

 // Archive: where research goes. A beam and a travelling packet show live search/extract requests.
 const archive=new THREE.Group();archive.position.set(-6.2,.35,2.2);scene.add(archive);
 for(let k=0;k<3;k++){const shelf=new THREE.Mesh(new THREE.BoxGeometry(1.2,.32,.7),mat(['#2f5d5a','#3c6e6a','#4a807b'][k]));shelf.position.y=.2+k*.36;shelf.castShadow=true;archive.add(shelf);}
 const archiveTop=new THREE.Vector3(-6.2,1.5,2.2);
 const beamMaterial=new THREE.LineDashedMaterial({color:'#7fd6c9',dashSize:.18,gapSize:.12,transparent:true,opacity:.9});
 const beam=new THREE.Line(new THREE.BufferGeometry(),beamMaterial);beam.visible=false;scene.add(beam);
 const packet=new THREE.Mesh(new THREE.SphereGeometry(.11,16,12),new THREE.MeshBasicMaterial({color:'#bff3ea'}));packet.visible=false;scene.add(packet);
 // Objection threads: one tube per objection from the objecting seat to the proposal board, coloured by status.
 const threads=new THREE.Group();scene.add(threads);
 const statusColor={open:'#e56f68',deferred:'#d9a441',addressed:'#3fb58f',withdrawn:'#7d8c8a'},voteColor={support:'#3fb58f',conditional_support:'#d9a441',oppose:'#e56f68'};
 const boardAnchor=new THREE.Vector3(0,2.2,1.5);
 // Speech bubbles are HTML so text stays sharp; one per seat plus one for the moderator at the board.
 const bubbleLayer=document.querySelector('#seat-labels');
 function bubble(color){const el=document.createElement('div');el.className='speech-bubble';el.hidden=true;el.style.borderColor=color;el.setAttribute('aria-live','polite');bubbleLayer.append(el);return el;}
 for(const actor of actors)actor.bubble=bubble(actor.color);
 const moderatorBubble=bubble('#f1f5ef');
 const archiveLabel=document.createElement('div');archiveLabel.className='archive-label';archiveLabel.textContent='Research archive';bubbleLayer.append(archiveLabel);
 let active=null,current=null,selected=null,zoomed=false,frame,lastTime=0,activity='idle',boardVersion=null,boardPulse=0,threadKey='';
 const target=new THREE.Vector3(0,.8,0),lookTarget=new THREE.Vector3(0,.8,0),cameraGoal=new THREE.Vector3(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(host.clientHeight,1);camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 renderer.domElement.addEventListener('click',e=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickables)[0];if(hit)onSelect(hit.object.userData.agent);});
 const clip=(text,n)=>{text=String(text||'').replace(/\s+/g,' ').trim();return text.length>n?text.slice(0,n-1)+'…':text;};
 const kindLabel={propose:'PROPOSES',challenge:'CHALLENGES',revise:'REVISES',vote:'VOTES',determine:'DETERMINES'};
 function head(actor){return new THREE.Vector3(actor.x,2.05+actor.stand*.6,actor.z);}
 function setThreads(c,round){
  const d=c?.deliberation,byMessage=new Map((d?.messages||[]).map(m=>[m.id,m]));
  const shown=(d?.objections||[]).filter(o=>byMessage.get(o.message_id)?.round===round);
  const key=JSON.stringify(shown.map(o=>[o.id,o.agent,o.status]));
  if(key===threadKey)return shown.length;threadKey=key;
  for(const t of [...threads.children]){threads.remove(t);t.geometry.dispose();t.material.dispose();}
  const perAgent=new Map();
  for(const o of shown){const actor=actors.find(a=>a.id===o.agent);if(!actor)continue;const n=perAgent.get(o.agent)||0;perAgent.set(o.agent,n+1);
   const start=new THREE.Vector3(actor.x,1.9,actor.z),end=boardAnchor.clone().add(new THREE.Vector3((n%3-1)*.35,(Math.floor(n/3)%3)*.25-.25,0));
   const mid=start.clone().lerp(end,.5).add(new THREE.Vector3(0,1.1+n*.12,0));
   const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start,mid,end),40,.065,10,false),new THREE.MeshBasicMaterial({color:statusColor[o.status]||statusColor.open}));
   tube.userData={objection:o.id,status:o.status};threads.add(tube);}
  return shown.length;
 }
 function showBubble(el,html,kind){el.innerHTML=html;el.className='speech-bubble'+(kind?' '+kind:'');el.hidden=false;}
 function setState(c,agent){
  current=c;updateDisplay(c);selected=agent||null;
  const d=c?.deliberation,messages=d?.messages||[],last=messages.at(-1),op=d?.operation,running=['running','recovering'].includes(c?.status);
  const awaiting=c?.status==='awaiting_evidence';
  active=running?op?.agent:last?.agent;
  activity=running?(op?.pending_tool?op.pending_tool.action:'thinking'):awaiting?'evidence':last?'spoken':'idle';
  for(const actor of actors){actor.bubble.hidden=true;actor.vote=null;}
  moderatorBubble.hidden=true;
  for(const v of d?.dispositions||[]){const actor=actors.find(a=>a.id===v.agent);if(actor)actor.vote=v.disposition;}
  const speakerBubble=actors.find(a=>a.id===active)?.bubble||(active==='moderator'?moderatorBubble:null);
  if(running&&speakerBubble){
   const tool=op.pending_tool;
   showBubble(speakerBubble,tool?`<b>${tool.action==='search'?'SEARCHING':'EXTRACTING'}</b>${esc(clip(tool.action==='search'?tool.query:tool.summary,110))}`:`<b>${kindLabel[op.kind]||'SPEAKING'}${c.status==='recovering'?' / CORRECTING':''}</b><span class="thinking-dots"><i></i><i></i><i></i></span>`,tool?'research':'thinking');
  }else if(awaiting){
   const open=(d?.evidence_requests||[]).filter(e=>e.status==='open');
   for(const actor of actors){const mine=open.filter(e=>e.agent===actor.id);if(mine.length)showBubble(actor.bubble,`<b>EVIDENCE NEEDED / ${mine.map(e=>esc(e.id)).join(', ')}</b>${esc(clip(mine[0].need,110))}`,'evidence');}
  }else if(last&&speakerBubble){
   showBubble(speakerBubble,`<b>${esc(last.id)} / ${kindLabel[last.kind]||esc(last.kind)}${last.disposition?' / '+esc(last.disposition.replaceAll('_',' ').toUpperCase()):''}</b>${esc(clip(last.summary,140))}`,last.kind);
  }
  const version=d?.proposals.at(-1)?.version||0;
  if(boardVersion!==null&&version>boardVersion&&!reduced.matches)boardPulse=1;
  boardVersion=version;
  setThreads(c,running?op?.round:last?.round);
  display.material.emissiveIntensity=d?.proposals.length?.5:.15;
 }
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function animate(time){
  const dt=Math.min(.1,(time-lastTime)/1000||0),ease=reduced.matches?1:1-Math.exp(-dt*5);
  const speaker=actors.find(a=>a.id===active);
  for(const actor of actors){
   const isSpeaker=actor===speaker&&activity!=='idle';
   actor.stand+=((isSpeaker?1:0)-actor.stand)*ease;
   const focus=actor.id===(selected||active);
   const facing=Math.atan2(-(boardAnchor.x-actor.x),-(boardAnchor.z-actor.z));
   let turn=facing-actor.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
   actor.g.rotation.set(0,actor.angle+turn*actor.stand*.6,0);
   actor.g.position.y=.3+actor.stand*.6;
   actor.light.intensity=focus?5:0;
   const vote=actor.vote&&voteColor[actor.vote],evidence=activity==='evidence'&&!actor.bubble.hidden;
   actor.marker.material.color.set(evidence?'#d9a441':vote||actor.color);
   actor.marker.material.emissive.set(evidence?'#d9a441':vote||actor.color);
   const pulse=(isSpeaker||evidence)&&!reduced.matches?.5+.5*Math.sin(time*.006):0;
   actor.marker.material.emissiveIntensity=vote?.8:focus?.65+pulse*.3:.05+pulse*.5;
   actor.marker.scale.setScalar(1+pulse*.12);
  }
  // Research beam from the speaker to the archive while a search or extraction is pending.
  const researching=speaker&&(activity==='search'||activity==='extract');
  beam.visible=packet.visible=!!researching;
  if(researching){const from=head(speaker);beam.geometry.setFromPoints([from,archiveTop]);beam.computeLineDistances();const f=reduced.matches?.5:(time*.0006)%1;packet.position.copy(from).lerp(archiveTop,f);packet.position.y+=Math.sin(f*Math.PI)*.8;}
  // Board pulse when a new proposal version arrives.
  boardPulse=Math.max(0,boardPulse-dt*.9);board.scale.setScalar(1+boardPulse*.12);display.material.emissiveIntensity=Math.max(display.material.emissiveIntensity,boardPulse);
  // Camera eases toward whoever has the floor.
  const focusActor=actors.find(a=>a.id===(selected||active)),engaged=focusActor&&activity!=='idle';
  const distance=(zoomed?15:host.clientWidth<500?22:20)*(engaged?.82:1);
  const bias=engaged?.35:0,fx=focusActor?focusActor.x*bias:0,fz=focusActor?focusActor.z*bias:0;
  target.set(fx,.8,fz);cameraGoal.set(11+fx*.8,distance*.69,distance+fz*.5);
  lookTarget.lerp(target,ease);camera.position.lerp(cameraGoal,ease);camera.lookAt(lookTarget);
  renderer.render(scene,camera);
  const project=v=>{const p=v.clone().project(camera);return {x:host.offsetLeft+(p.x*.5+.5)*host.clientWidth,y:host.offsetTop+(-p.y*.5+.5)*host.clientHeight,hidden:p.z>1};};
  for(const l of labels){const p=project(l.position);l.button.style.left=`${p.x}px`;l.button.style.top=`${p.y}px`;const actor=actors.find(a=>a.id===l.button.dataset.agent);
   l.button.classList.toggle('active',l.button.dataset.agent===(selected||active));l.button.dataset.vote=actor.vote||'';l.button.hidden=p.hidden;}
  for(const actor of actors){if(actor.bubble.hidden)continue;const p=project(head(actor).add(new THREE.Vector3(0,.45,0)));actor.bubble.style.left=`${p.x}px`;actor.bubble.style.top=`${p.y}px`;}
  {const p=project(new THREE.Vector3(-6.2,.2,3.1));archiveLabel.style.left=`${p.x}px`;archiveLabel.style.top=`${p.y}px`;archiveLabel.classList.toggle('active',beam.visible);}
  if(!moderatorBubble.hidden){const p=project(new THREE.Vector3(0,5.2,1.5));moderatorBubble.style.left=`${p.x}px`;moderatorBubble.style.top=`${p.y}px`;}
  lastTime=time;frame=requestAnimationFrame(animate);
 }
 frame=requestAnimationFrame(animate);
 const api={setState,focus(id){selected=id;},zoom(){zoomed=!zoomed;},overview(){selected=null;zoomed=false;},
  dispose(){cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();proposalTexture.dispose();for(const actor of actors)actor.bubble.remove();moderatorBubble.remove();archiveLabel.remove();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});delete host.theater;},
  inspect(){return {active,selected,activity,time:lastTime,threads:threads.children.map(t=>t.userData),beam:beam.visible,boardPulse,camera:camera.position.toArray(),
   bubbles:[...actors.map(a=>({id:a.id,hidden:a.bubble.hidden,kind:a.bubble.className,text:a.bubble.textContent})),{id:'moderator',hidden:moderatorBubble.hidden,text:moderatorBubble.textContent}].filter(b=>!b.hidden),
   actors:actors.map(a=>({id:a.id,stand:+a.stand.toFixed(3),vote:a.vote,position:a.g.position.toArray(),rotationY:a.g.rotation.y})),proposalVersion:current?.deliberation?.proposals.at(-1)?.version||0};}};
 host.theater=api;
 return api;
}
