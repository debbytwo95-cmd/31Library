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
  const html=await fs.readFile('outputs/ai-brand-signals-spring.html','utf8');
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
    card.querySelector=selector=>selector==='.art'?card.art:card.icon;return card;
  });
  const motion=new Element(),dialog=new Element(),close=new Element(),title=new Element(),code=new Element();
  dialog.querySelector=()=>close;dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
  const buttons=Object.keys(brands).map(brand=>{const e=new Element();e.dataset.source=brand;return e;});
  const doc=new Element();doc.hidden=false;
  doc.querySelector=selector=>({'.motion':motion,'dialog':dialog,'#source-title':title,'#source-code':code}[selector]);
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
  let clock=0;const tick=(count=1)=>{advance(clock,count);clock+=count;};
  tick(2);
  const targets=studies.map((s,index)=>{
    let cell=0,best=Infinity;
    for(let i=0;i<s.table.length;i++)if(s.table[i]>.9){
      const d=Math.hypot(i%56-28,(Math.floor(i/56)-50)*.65);
      if(d<best){best=d;cell=i;}
    }
    const x=(cell%56+.65)*s.cw,y=(Math.floor(cell/56)+.55)*s.ch;
    return{x,y,clientX:128+index*562+x,clientY:180+y};
  });
  const initial=[];
  studies.forEach((s,i)=>{
    s.move(targets[i]);
    assert.ok(Math.max(...s.vx.map(Math.abs))>100,'entry delivers a localized outward impulse');
    let id=0;for(let k=1;k<s.vx.length;k++)if(Math.hypot(s.vx[k],s.vy[k])>Math.hypot(s.vx[id],s.vy[id]))id=k;
    initial.push({id,vx:s.vx[id],vy:s.vy[id],overshoot:false});
    assert.equal('press' in s,false);assert.equal('pinned' in s,false);assert.equal('waves' in s,false);
  });
  capture=true;tick(6);capture=false;
  studies.forEach(s=>assert.ok(Math.max(...s.dx.map(Math.abs))>5,'nearby strands visibly scatter'));
  for(let frame=0;frame<250;frame++)studies.forEach((s,i)=>{
    s.updateSpring(1/120);const p=initial[i];
    if(s.dx[p.id]*p.vx+s.dy[p.id]*p.vy<-.1)p.overshoot=true;
  });
  studies.forEach((s,i)=>{
    assert.equal(s.pointer.inside,true);
    assert.ok(initial[i].overshoot,'spring return crosses original position before settling');
    assert.ok(Math.max(...s.dx.map(Math.abs))<.05&&Math.max(...s.dy.map(Math.abs))<.05,'returns to origin even while pointer stays inside');
  });
  studies.forEach((s,i)=>s.move({...targets[i],clientX:targets[i].clientX+30}));
  assert.ok(studies.every(s=>Math.max(...s.vx.map(Math.abs))>20),'moving to new nearby strands reactivates localized scatter');
  studies.forEach(s=>s.leave());
  for(let frame=0;frame<260;frame++)studies.forEach(s=>s.updateSpring(1/120));
  assert.ok(studies.every(s=>Math.max(...s.dx.map(Math.abs))<.05),'leaving continues a smooth spring settlement');
  studies.forEach((s,i)=>s.move(targets[i]));assert.ok(studies.every(s=>Math.max(...s.vx.map(Math.abs))>100),'each re-entry triggers scatter');
  studies.forEach((s,i)=>{
    for(let j=0;j<20;j++)s.move({...targets[i],clientX:targets[i].clientX+Math.sin(j)*70,clientY:targets[i].clientY+Math.cos(j)*50});
  });
  capture=true;tick(6);capture=false;
  studies.forEach(s=>{
    const limit=Math.min(130,s.width*.26);
    assert.ok([...s.dx,...s.dy,...s.vx,...s.vy].every(Number.isFinite));
    assert.ok(Math.max(...s.dx.map(Math.abs))<=limit*.85+.001);
    assert.equal(s.ctx.stack.length,0);
  });
  motion.listeners.click();const frozen=studies.map(s=>JSON.stringify([Array.from(s.dx),Array.from(s.dy)]));tick(2);
  studies.forEach((s,i)=>{s.kick(100,200,1);s.updateSpring(.1);assert.equal(JSON.stringify([Array.from(s.dx),Array.from(s.dy)]),frozen[i],'pause suppresses spring impulses and movement');});
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  assert.equal(html.includes('Reset locks'),false);assert.equal(html.includes('CHARGING'),false);
  const report={status:'passed',checks:['entry scatter impulse','visible localized displacement','elastic overshoot','automatic return while pointer is stationary','spring settling after leave','repeat entry and pointer movement','bounded finite motion after rapid movement','pause respects reduced-motion behavior','balanced canvas clipping','brand detection colors retained','no discarded playground gesture controls'],mode:'offline spring physics and Canvas command verification with real SVG raster sampling'};
  await fs.writeFile('work/spring-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
