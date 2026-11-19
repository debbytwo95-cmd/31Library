import * as THREE from './assets/three.module.js';
import { OrbitControls } from './assets/OrbitControls.js';

export function mountEarth(root, options = {}) {
const events = new AbortController();
let destroyed = false, frameId = 0;
const on = (target, name, handler, settings = {}) => target.addEventListener(name, handler, { ...settings, signal: events.signal });
const stats = {landPoints:0};

// Projection, sampling, material, camera and motion parameters match the reference.
const config = Object.freeze({radius:6,cameraDistance:18,fov:45,landStep:4,landSize:.05,landOpacity:.8,seaStep:8,seaSize:.06,seaOpacity:.15,color:0xc8c3bc,introMs:2200,introSpeed:12,idleSpeed:.8,orbitPeriod:120000,...options});
const places = [
 ['Germany',52.52,13.405,'Rain on a quiet street'],['Japan',35.68,139.69,'A forest after the rain'],['Norway',60.39,5.32,'Water at the harbour'],['Scotland',57.48,-4.22,'Wind across the highlands'],
 ['Iceland',64.15,-21.94,'A moment of stillness'],['India',28.61,77.21,'The city waking up'],['Morocco',31.63,-7.98,'Voices in the market'],['Portugal',38.72,-9.14,'Ships on the horizon'],
 ['Taiwan',25.03,121.56,'A train passing by'],['Belgium',50.85,4.35,'The rhythm of a workshop'],['France',48.86,2.35,'An afternoon at the café'],['Brazil',-22.91,-43.17,'A street in the evening'],
 ['Kenya',-1.29,36.82,'Footsteps in the morning'],['Canada',49.28,-123.12,'Rain against the window'],['New Zealand',-41.29,174.78,'Water along the shore'],['Colombia',4.71,-74.07,'A forest full of life'],
 ['USA',40.71,-74.01,'A crossing in the city'],['USA',34.05,-118.24,'The sound of a neighbourhood'],['Mexico',19.43,-99.13,'An open square'],['Peru',-12.05,-77.04,'A distant conversation'],
 ['Argentina',-34.60,-58.38,'A late afternoon'],['Chile',-33.45,-70.67,'An everyday moment'],['South Africa',-33.92,18.42,'The ocean nearby'],['Egypt',30.04,31.24,'Life beside the river'],
 ['Nigeria',6.52,3.38,'A busy morning'],['Ghana',5.60,-.19,'The rhythm of the coast'],['Spain',40.42,-3.70,'Voices in a courtyard'],['Italy',41.90,12.50,'A walk through the city'],
 ['Greece',37.98,23.73,'Wind through the trees'],['Turkey',41.01,28.98,'Across the water'],['Finland',60.17,24.94,'A quiet shoreline'],['Sweden',59.33,18.07,'A northern morning'],
 ['Poland',52.23,21.01,'The city in motion'],['Nepal',27.72,85.32,'A distant bell'],['Thailand',13.76,100.50,'A market in the evening'],['Vietnam',21.03,105.85,'A street awakening'],
 ['Indonesia',-6.21,106.85,'Rain in the garden'],['Singapore',1.35,103.82,'A tropical afternoon'],['China',31.23,121.47,'The river at dusk'],['South Korea',37.57,126.98,'Footsteps after dark'],
 ['Australia',-33.87,151.21,'Waves on the shore'],['Australia',-31.95,115.86,'Wind from the ocean'],['Fiji',-18.14,178.44,'Water and wind'],['Alaska',61.22,-149.90,'An open landscape'],
 ['Greenland',64.18,-51.72,'The silence of a coast'],['Mongolia',47.92,106.92,'Wind across the plain'],['Madagascar',-18.88,47.51,'A forest at dawn'],['Sri Lanka',6.93,79.86,'Rain on a rooftop']
].map(([country,lat,lon,title],index)=>({country,lat,lon,title,index}));

function point(lat,lon,r=config.radius){const a=THREE.MathUtils.degToRad(lat),b=THREE.MathUtils.degToRad(lon);return new THREE.Vector3(-r*Math.cos(a)*Math.cos(b),r*Math.sin(a),r*Math.cos(a)*Math.sin(b));}
function gradient(index,total){const t=total>1?index/(total-1):0,h=t*360;return `linear-gradient(to bottom,hsl(${h} 24% 26%) 0%,hsl(${h+6} 18% 50%) ${45+t*15}%,hsl(${h+10} 17% 77%) 100%)`;}
const globe=root.querySelector('[data-earth=globe]'),overlay=root.querySelector('[data-earth=markers]'),orbit=root.querySelector('[data-earth=orbit]'),caption=root.querySelector('[data-earth=caption]');
const mobile=matchMedia('(max-width:700px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(error){root.querySelector('[data-earth=error]').hidden=false;throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);globe.prepend(renderer.domElement);
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','三维地球；方向键旋转，鼠标或触屏拖拽');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(config.fov,1,.1,1000);
camera.position.fromArray(options.camera || [0,0,config.cameraDistance]);
const controls=new OrbitControls(camera,renderer.domElement);
Object.assign(controls,{enableDamping:true,dampingFactor:.05,enableZoom:false,enablePan:false,minDistance:12,maxDistance:30,autoRotate:false,autoRotateSpeed:config.introSpeed});
controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.ROTATE};
const pointers=new Set();
on(renderer.domElement,'pointerdown',event=>pointers.add(event.pointerId));
on(renderer.domElement,'pointerup',event=>pointers.delete(event.pointerId));
on(renderer.domElement,'pointercancel',event=>pointers.delete(event.pointerId));
function cancelDrag(){const active=[...pointers];pointers.clear();for(const pointerId of active)renderer.domElement.dispatchEvent(new PointerEvent('pointercancel',{pointerId}));}
on(renderer.domElement,'lostpointercapture',event=>{if(pointers.has(event.pointerId))cancelDrag();});
on(renderer.domElement,'keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();focusTarget=null;const spherical=new THREE.Spherical().setFromVector3(camera.position);spherical.theta+=event.key==='ArrowLeft'?-.1:event.key==='ArrowRight'?.1:0;spherical.phi=THREE.MathUtils.clamp(spherical.phi+(event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0),.05,Math.PI-.05);camera.position.setFromSpherical(spherical);controls.update();});
function makePoints(vertices,size,opacity){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const material=new THREE.PointsMaterial({color:config.color,size,transparent:true,opacity,sizeAttenuation:true,depthTest:true,depthWrite:false});const mesh=new THREE.Points(geometry,material);scene.add(mesh);return mesh;}
const sea=[];
for(let lat=-90;lat<=90;lat+=config.seaStep)for(let lon=-180;lon<=180;lon+=config.seaStep){const p=point(lat,lon);sea.push(p.x,p.y,p.z);}
makePoints(sea,config.seaSize,config.seaOpacity);
const image=new Image();
image.onload=()=>{if(destroyed)return;const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,2048,1024);const pixels=ctx.getImageData(0,0,2048,1024).data,land=[];for(let y=0;y<1024;y+=config.landStep)for(let x=0;x<2048;x+=config.landStep){const i=(y*2048+x)*4;if((pixels[i]+pixels[i+1]+pixels[i+2])/3>50){const p=point(90-y/1024*180,x/2048*360-180);land.push(p.x,p.y,p.z);}}makePoints(land,config.landSize,config.landOpacity);stats.landPoints=land.length/3;root.dataset.loaded='true';};
image.onerror=()=>{if(destroyed)return;root.querySelector('[data-earth=error]').hidden=false;};
image.src=new URL('./assets/earth.jpg',import.meta.url).href;
const arcs=new THREE.Group();scene.add(arcs);
let selected=null,hovered=null,focusTarget=null,paused=true,dragging=false,start=performance.now(),last=start,ringAngle=0,ringHover=null;
let rotationSpeed=config.idleSpeed;
const markerNodes=places.map(p=>{const node=document.createElement('button');node.className='marker';node.setAttribute('aria-label',`${p.country} · ${p.title}`);node.innerHTML='<span></span>';node.firstChild.style.background=gradient(p.index,places.length);on(node,'pointerenter',()=>{hovered=p;showCaption(p);});on(node,'pointerleave',()=>{hovered=null;showCaption(selected);});on(node,'click',()=>select(p));overlay.append(node);return {node,position:point(p.lat,p.lon),place:p};});
function clearArcs(){for(const line of [...arcs.children]){arcs.remove(line);line.geometry.dispose();line.material.dispose();}}
function showCaption(p){caption.textContent=p?`${p.title}. ${p.country}.`:'';caption.classList.toggle('visible',!!p);}
function select(p){selected=selected===p?null:p;markerNodes.forEach(m=>m.node.classList.toggle('selected',m.place===selected));clearArcs();showCaption(selected);if(!selected){focusTarget=null;return;}const v=point(p.lat,p.lon,1);focusTarget={azimuth:Math.atan2(v.x,v.z),polar:Math.acos(v.y)};const closest=places.filter(a=>a!==p).sort((a,b)=>point(a.lat,a.lon,1).distanceTo(v)-point(b.lat,b.lon,1).distanceTo(v)).slice(0,5);closest.forEach(other=>{const vertices=[],end=point(other.lat,other.lon,1);for(let i=0;i<=80;i++){const t=i/80;vertices.push(v.clone().lerp(end,t).normalize().multiplyScalar(6+Math.sin(t*Math.PI)*.6));}const geo=new THREE.BufferGeometry().setFromPoints(vertices.slice(3,-3));arcs.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x1c1917,opacity:.4,transparent:true})));});}
const ringNodes=[];
function buildRing(){orbit.replaceChildren();ringNodes.length=0;const n=mobile.matches?8:16,r=mobile.matches?190:500,size=mobile.matches?96:112;for(let i=0;i<n;i++){const angle=i/n*360-90,rad=angle*Math.PI/180,p=places[i],node=document.createElement('button');node.className='orbit-card';node.style.left=`${Math.round(r*Math.cos(rad))-size/2}px`;node.style.top=`${Math.round(r*Math.sin(rad))-size/2}px`;node.style.background=gradient(i,n);node.innerHTML=`<span class="label">${p.country}</span><span class="cross" aria-hidden="true">+</span>`;node.setAttribute('aria-label',`查看${p.country}`);const enter=()=>{ringHover=i;hovered=p;showCaption(p);const v=point(p.lat,p.lon,1);focusTarget={azimuth:Math.atan2(v.x,v.z),polar:Math.acos(v.y)};};const leave=()=>{ringHover=null;hovered=null;focusTarget=null;showCaption(selected);};on(node,'pointerenter',enter);on(node,'pointerleave',leave);on(node,'focus',enter);on(node,'blur',leave);on(node,'click',()=>select(p));orbit.append(node);ringNodes.push({node,angle});}}
buildRing();on(mobile,'change',buildRing);
function resize(){const w=globe.clientWidth,h=globe.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
const observer=new ResizeObserver(resize);observer.observe(globe);resize();
on(controls,'start',()=>{dragging=true;focusTarget=null;});on(controls,'end',()=>{dragging=false;});

const pauseButton=root.querySelector('[data-earth=pause]');
function updatePause(){pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.innerHTML=paused?'开始旋转 <span>▷</span>':'暂停旋转 <span>Ⅱ</span>';}
on(pauseButton,'click',()=>{paused=!paused;updatePause();});updatePause();
on(root.querySelector('[data-earth=focus]'),'click',e=>{const on=root.classList.toggle('focus-mode');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.innerHTML=on?'完整效果 <span>↙</span>':'仅看地球 <span>↗</span>';resize();});
function reset(){cancelDrag();root.classList.remove("focus-mode");const focusButton=root.querySelector("[data-earth=focus]");focusButton.setAttribute("aria-pressed","false");focusButton.textContent="仅看地球";paused=true;updatePause();controls.autoRotate=false;const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;camera.position.fromArray(options.camera || [0,0,config.cameraDistance]);controls.target.set(0,0,0);focusTarget=null;selected=null;hovered=null;dragging=false;ringHover=null;ringAngle=0;rotationSpeed=config.idleSpeed;start=performance.now();clearArcs();markerNodes.forEach(m=>m.node.classList.remove("selected"));showCaption(null);controls.update();resize();}
on(root.querySelector("[data-earth=restart]"),"click",reset);
function clearTransient(){cancelDrag();dragging=false;hovered=null;ringHover=null;focusTarget=null;showCaption(selected);}
on(window,"blur",clearTransient);
on(window,"pagehide",clearTransient);
on(document,"visibilitychange",()=>{if(document.hidden)clearTransient();});
const projected=new THREE.Vector3(),viewDirection=new THREE.Vector3(),normal=new THREE.Vector3();
function frame(now){if(destroyed)return;frameId=requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.05);last=now;const elapsed=paused?100000:now-start;
 controls.autoRotateSpeed=rotationSpeed*(reduced.matches?.15:1);
 controls.autoRotate=!paused&&!dragging&&!focusTarget;
 if(focusTarget&&!dragging){const current=new THREE.Spherical().setFromVector3(camera.position);let difference=focusTarget.azimuth-current.theta;while(difference>Math.PI)difference-=2*Math.PI;while(difference< -Math.PI)difference+=2*Math.PI;current.theta+=difference*(reduced.matches?1:.09);current.phi=THREE.MathUtils.clamp(current.phi+(focusTarget.polar-current.phi)*(reduced.matches?1:.09),.05,Math.PI-.05);camera.position.setFromSpherical(current);camera.lookAt(0,0,0);}
 controls.update(delta);
 const w=globe.clientWidth/2,h=globe.clientHeight/2;
 markerNodes.forEach(({node,position})=>{viewDirection.subVectors(position,camera.position).normalize();normal.copy(position).normalize();if(normal.dot(viewDirection)>-.05){node.style.display='none';return;}node.style.display='block';projected.copy(position).project(camera);node.style.transform=`translate(${projected.x*w+w-16}px,${-projected.y*h+h-16}px)`;});
 if(!paused)ringAngle=(ringAngle+delta*1000/config.orbitPeriod*360*(rotationSpeed/.8)*(reduced.matches?.15:1))%360;orbit.style.transform=`rotate(${ringAngle}deg)`;
 const n=ringNodes.length;
 ringNodes.forEach(({node,angle},i)=>{const d=(Math.sin((angle+ringAngle)*Math.PI/180)+1)/2,j=Math.max(0,(d-.4)/.6);let blur=mobile.matches?0:j*j*14,opacity=1-d*.88,scale=1;const order=(i-Math.floor(n/2)+n)%n,appear=reduced.matches?1:THREE.MathUtils.clamp((elapsed-1000-order*80)/300,0,1);opacity*=appear*appear*(3-2*appear);if(ringHover!==null){const distance=Math.min(Math.abs(i-ringHover),n-Math.abs(i-ringHover)),influence=Math.exp(-.33*distance);blur+=(1-influence)*5;opacity*=.35+.65*influence;scale=reduced.matches?1:distance===0?1.16:distance===1?1.07:distance===2?1.03:1;if(distance===0)opacity=Math.max(.85,opacity);}node.style.opacity=String(opacity);node.style.filter=blur>.1?`blur(${blur}px)`:'';node.style.transform=`rotate(${angle+90}deg) scale(${scale})`;});
 renderer.render(scene,camera);
}
frameId=requestAnimationFrame(frame);
return {reset,getState:()=>({paused,ringAngle,camera:camera.position.toArray(),selected:selected?.country||null,landPoints:stats.landPoints}),getConfig:()=>({idleSpeed:rotationSpeed}),update(next){if(next.idleSpeed!==undefined)rotationSpeed=next.idleSpeed;},destroy(){cancelDrag();destroyed=true;cancelAnimationFrame(frameId);events.abort();observer.disconnect();image.onload=image.onerror=null;controls.dispose();clearArcs();scene.traverse(object=>{object.geometry?.dispose();if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material?.dispose();});renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();overlay.replaceChildren();orbit.replaceChildren();}};
}

