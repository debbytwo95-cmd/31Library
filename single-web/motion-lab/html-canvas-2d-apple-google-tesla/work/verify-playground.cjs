const fs=require('node:fs/promises');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const sharp=require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
let capture=false;
class Context {
  constructor(raw){this.raw=raw;this.nodes=[];this.stack=[];this.globalAlpha=1;this.font='10px Arial';this.fillStyle='#000';this.strokeStyle='#000';this.lineWidth=1;this.lineCap='butt';this.clipRect=null;this.strokeWidths=new Set();}
  setTransform(){} translate(){} scale(){}
  beginPath(){this.path=[];this.rectPath=null;}
  moveTo(x,y){if(!capture)return;assert.ok(Number.isFinite(x)&&Number.isFinite(y));this.path.push(`M${x.toFixed(3)},${y.toFixed(3)}`);}
  lineTo(x,y){if(!capture)return;assert.ok(Number.isFinite(x)&&Number.isFinite(y));this.path.push(`L${x.toFixed(3)},${y.toFixed(3)}`);}
  node(text){if(!capture)return;this.nodes.push(this.clipRect?`<svg x="${this.clipRect.x}" y="${this.clipRect.y}" width="${this.clipRect.w}" height="${this.clipRect.h}" viewBox="${this.clipRect.x} ${this.clipRect.y} ${this.clipRect.w} ${this.clipRect.h}">${text}</svg>`:text);}
  stroke(){if(capture)(this.draws??=[]).push({clip:this.clipRect?{...this.clipRect}:null,width:this.lineWidth});this.strokeWidths.add(this.lineWidth);this.node(`<path d="${this.path.join('')}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" opacity="${this.globalAlpha}" stroke-linecap="${this.lineCap}"/>`);}
  fill(){}
  rect(x,y,w,h){this.rectPath={x,y,w,h};}
  clip(){this.clipRect=this.rectPath;}
  clearRect(x,y,w,h){if(capture){if(this.clipRect)(this.clippedClears??=[]).push({x,y,w,h});else{this.nodes=[];this.draws=[];this.boxes=[];this.clippedClears=[];this.strokeWidths.clear();}}}
  fillRect(x,y,w,h){this.node(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.fillStyle}" opacity="${this.globalAlpha}"/>`);}
  strokeRect(x,y,w,h){if(capture)(this.boxes??=[]).push({x,y,w,h});this.node(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" opacity="${this.globalAlpha}"/>`);}
  measureText(text){return{width:text.length*parseFloat(this.font)*.6};}
  fillText(text,x,y){this.node(`<text x="${x}" y="${y}" dominant-baseline="hanging" font-family="Consolas,monospace" font-size="${parseFloat(this.font)}" fill="${this.fillStyle}" opacity="${this.globalAlpha}">${escape(text)}</text>`);}
  save(){this.stack.push({globalAlpha:this.globalAlpha,lineWidth:this.lineWidth,lineCap:this.lineCap,strokeStyle:this.strokeStyle,fillStyle:this.fillStyle,font:this.font,clipRect:this.clipRect});}
  restore(){Object.assign(this,this.stack.pop());}
  getImageData(){return{data:this.raw};}
}
class Element {
  constructor(){this.listeners={};this.dataset={};this.attributes={};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setAttribute(name,value){this.attributes[name]=value;}
  contains(){return false;}
}
class Canvas extends Element {
  constructor(raw){super();this.ctx=new Context(raw);}
  getContext(){return this.ctx;}
}
(async()=>{
  const html=await fs.readFile('outputs/ai-brand-signals-playground.html','utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
  assert.equal(/<img\b|<image\b|<script[^>]+src=|<link[^>]+href=|@import|url\(/i.test(html),false);
  const brands=vm.runInNewContext(script.slice(script.indexOf('  const BRANDS'),script.indexOf('  // One temporary raster'))+';BRANDS;');
  const rasters=[];
  for(const brand of Object.values(brands)){
    const w=336,h=448,size=w*brand.scale,tx=(w-size)/2+brand.offset*w,ty=brand.top*h;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="black"/><path fill="white" fill-rule="${brand.fillRule}" transform="translate(${tx} ${ty}) scale(${size/24})" d="${brand.path}"/></svg>`;
    const{data}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});rasters.push(data);
  }
  const cards=Object.keys(brands).map((brand,index)=>{
    const card=new Element();card.dataset.brand=brand;card.art=new Canvas();card.icon=new Canvas();
    card.getBoundingClientRect=()=>({width:540,height:720,left:128+index*562,top:180});
    card.status=new Element();card.status.textContent='EXPLORE';card.querySelector=selector=>selector==='.art'?card.art:selector==='.interaction-state'?card.status:card.icon;return card;
  });
  const resetButton=new Element(),motion=new Element(),dialog=new Element(),close=new Element(),title=new Element(),code=new Element();
  dialog.querySelector=()=>close;dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
  const buttons=Object.keys(brands).map(brand=>{const e=new Element();e.dataset.source=brand;return e;});
  const doc=new Element();doc.hidden=false;
  doc.querySelector=selector=>({'.reset-locks':resetButton,'.motion':motion,'dialog':dialog,'#source-title':title,'#source-code':code}[selector]);
  doc.querySelectorAll=selector=>selector==='.card'?cards:buttons;
  doc.createElement=()=>new Canvas(rasters.shift());
  const win=new Element();win.devicePixelRatio=1;
  let raf=null;
  const sandbox={document:doc,window:win,matchMedia:()=>({matches:false,addEventListener(){}}),ResizeObserver:class{observe(){}},Path2D:class{constructor(path){this.path=path;}},requestAnimationFrame:fn=>raf=fn,console};
  vm.createContext(sandbox);
  capture=true;
  vm.runInContext(script.replace('})();','globalThis.qa={studies,frame};})();'),sandbox);
  capture=false;
  const {studies}=sandbox.qa;
  const advance=(start,count)=>{for(let i=1;i<=count;i++)raf((start+i)*1000/60);};
  Context.prototype.arc=function(x,y,r,start,end){
    for(let i=0;i<=24;i++){const a=start+(end-start)*i/24;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i===0?this.moveTo(px,py):this.lineTo(px,py);}
  };
  let clock=0;
  const tick=(count=1)=>{advance(clock,count);clock+=count;};
  const s=studies[0];
  const event=(x,y,extra={})=>({clientX:128+x,clientY:180+y,pointerId:1,pointerType:'mouse',button:0,...extra});
  tick(2);
  s.down(event(240,350,{timeStamp:1000}));tick(3);
  s.up(event(240,350,{timeStamp:1130}));
  assert.equal(s.waves.length,1);assert.equal(s.waves[0].power,.9);assert.equal(s.press,null);
  tick(5);assert.ok(Math.max(...s.heat)>.9);
  s.updateGestures(1.5);assert.equal(s.waves.length,0);
  // Timestamp-based release still distinguishes a hold when rendering is slow.
  s.down(event(240,350,{timeStamp:2000}));
  s.updateGestures(.9);assert.ok(s.status.textContent.includes('CHARGING'));
  capture=true;tick();capture=false;
  s.up(event(240,350,{timeStamp:3400}));
  assert.equal(s.waves.length,2);assert.ok(s.waves.some(w=>w.fall));assert.ok(s.waves.some(w=>w.power>2.4));
  s.updateGestures(1.5);assert.equal(s.waves.length,0);
  // Painting/scroll-like movement should not become an accidental click wave.
  s.down(event(100,400));s.move(event(220,450));tick(2);s.up(event(220,450));
  assert.equal(s.waves.length,0);assert.equal(s.press,null);
  s.down(event(100,400,{target:{closest:()=>({})}}));assert.equal(s.press,null,'source button excluded from gesture recognizer');
  s.move(event(90,300));tick(2);s.updateGestures(.75);tick();
  assert.ok(s.pinned);assert.equal(resetButton.disabled,false);
  const pin=JSON.stringify(s.pinned);
  s.leave();tick(3);assert.equal(JSON.stringify(s.pinned),pin);assert.ok(s.regions.some(b=>b.kind==='pinned'));
  s.move(event(440,650));s.updateGestures(.8);tick();assert.equal(JSON.stringify(s.pinned),pin,'moving away and dwelling preserves existing lock');
  s.down(event(440,650));tick(2);s.up(event(440,650));assert.equal(s.pinned,null,'short click outside pinned frame releases it');assert.equal(s.waves.length,1);
  s.waves=[];s.move(event(240,220));tick();s.updateGestures(.75);tick();assert.ok(s.pinned);
  doc.listeners.keydown({key:'Escape'});assert.equal(s.pinned,null);assert.equal(resetButton.disabled,true);
  s.move(event(90,300));tick();s.updateGestures(.75);tick();assert.ok(s.pinned);
  resetButton.listeners.click();assert.equal(s.pinned,null);assert.equal(resetButton.disabled,true);
  s.move(event(240,220));tick();s.updateGestures(.75);tick();assert.ok(s.pinned);
  doc.listeners.pointerdown({target:{closest:()=>null}});assert.equal(s.pinned,null,'blank page click clears lock');
  s.down(event(240,350));s.cancelGesture();assert.equal(s.press,null);assert.equal(s.waves.length,0);
  cards[0].listeners.keydown({target:cards[0],key:'Enter',preventDefault(){}});assert.equal(s.waves.length,1);
  s.down(event(240,350));tick(2);win.listeners.blur();assert.equal(s.press,null);assert.equal(s.pointer.inside,false);
  capture=true;tick();capture=false;
  for(const study of studies){
    for(const points of study.frameBuckets)for(let i=0;i<points.length;i+=3){const gx=points[i]/study.cw-.5;assert.ok(Math.abs(gx-Math.round(gx))<1e-8);}
    assert.equal(study.ctx.stack.length,0);
  }
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  const report={status:'passed',checks:['short click creates single wave','long hold charges and emits stronger radial/downward effects','event timestamps handle slow frames','dragging does not create click wave','source controls excluded','hover dwell pins a region','pin survives leaving and moving elsewhere','outside click releases pin','Escape and reset button clear locks','cancellation and blur release gesture','keyboard Enter sends wave','grid-aligned strands and balanced clipping','brand colors preserved'],mode:'offline event-state and Canvas verification with real SVG raster sampling'};
  await fs.writeFile('work/playground-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
