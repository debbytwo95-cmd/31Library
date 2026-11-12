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
  const html=await fs.readFile('outputs/brand-signals.html','utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
  assert.equal(/<img\b|<image\b|<script[^>]+src=|<link[^>]+href=|@import|url\(/i.test(html),false);
  const brands=vm.runInNewContext(script.slice(script.indexOf('  const BRANDS'),script.indexOf('  // One temporary raster'))+';BRANDS;');
  const rasters=[];
  for(const brand of Object.values(brands)){
    const w=336,h=448,size=w*brand.scale,tx=(w-size)/2+brand.offset*w,ty=brand.top*h;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="black"/><path fill="white" transform="translate(${tx} ${ty}) scale(${size/24})" d="${brand.path}"/></svg>`;
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
  advance(0,1);
  for(const study of studies){assert.equal(study.hasEntered,false);assert.equal(study.gatherActive,false);}
  const visit=()=>studies.forEach((s,i)=>s.move({clientX:128+i*562+320,clientY:530}));
  visit();advance(1,1);
  for(const s of studies){
    assert.equal(s.gatherActive,true);assert.equal(s.hasEntered,true);
    const offGrid=s.frameBuckets.some(points=>points.some((px,i)=>i%3===0&&Math.abs((px/s.cw-.5)-Math.round(px/s.cw-.5))>.001));
    assert.ok(offGrid,'initial gathering starts away from fixed grid');
    assert.equal('vx' in s,false);assert.equal('vy' in s,false);
  }
  let last=studies.map(s=>s.gatherAge);
  for(let frame=3;frame<=62;frame++){
    advance(frame-1,1);
    studies.forEach((s,i)=>{assert.ok(s.gatherAge>=last[i]);last[i]=s.gatherAge;});
  }
  const assertOnGrid=()=>{
    for(const s of studies){
      assert.equal(s.gatherActive,false);
      for(const points of s.frameBuckets)for(let i=0;i<points.length;i+=3){
        const x=points[i]/s.cw-.5;assert.ok(Math.abs(x-Math.round(x))<1e-8,'strand returns exactly to original column, no overshoot');
      }
    }
  };
  assertOnGrid();
  advance(62,19);capture=true;advance(81,1);capture=false;
  for(const s of studies){
    assert.equal(s.regions.length,3);
    const draws=s.ctx.draws.filter(d=>d.clip);
    const boxed=s.ctx.boxes;
    assert.ok(draws.length>0,'magnified strokes are drawn under a clip');
    assert.ok(draws.some(d=>d.width>s.weights[3]*1.9),'locked strands visibly increase in width');
    for(const draw of draws){
      assert.ok(boxed.some(b=>Math.abs(draw.clip.x-(b.x+1))<1e-8&&Math.abs(draw.clip.y-(b.y+1))<1e-8&&Math.abs(draw.clip.w-(b.w-2))<1e-8&&Math.abs(draw.clip.h-(b.h-2))<1e-8),'all magnified strokes clipped one pixel inside frame');
    }
    assert.equal(s.ctx.clippedClears.length,3,'original strokes replaced inside each lock, preventing double-image artifacts');
    assert.ok(s.ctx.stack.length===0,'canvas clip state restored');
  }
  const settled=studies.map(s=>JSON.stringify(s.frameBuckets));
  studies.forEach((s,i)=>s.move({clientX:128+i*562+60,clientY:260}));
  advance(82,1);assertOnGrid();
  studies.forEach(s=>s.pointer.inside=false);visit();
  assert.ok(studies.every(s=>!s.gatherActive),'re-entry does not repeat first-entry gathering');
  advance(83,10);assertOnGrid();
  studies.forEach((s,i)=>assert.notEqual(JSON.stringify(s.frameBuckets),settled[i],'flow continues after gathering'));
  motion.listeners.click();advance(93,1);
  const paused=studies.map(s=>JSON.stringify(s.frameBuckets));
  advance(94,4);studies.forEach((s,i)=>assert.equal(JSON.stringify(s.frameBuckets),paused[i]));
  buttons[0].listeners.click();assert.equal(dialog.open,true);close.listeners.click();assert.equal(dialog.open,false);
  win.devicePixelRatio=2;advance(98,1);
  assert.ok(cards.every(c=>c.art.width===1080&&c.art.height===1440));
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  const report={checks:['syntax','one-time first-entry gathering','monotonic convergence','exact return to fixed columns','no spring or velocity state','no pointer repulsion','no gathering replay on re-entry','live flow after convergence','larger strokes inside lock','inset clipping for every magnified stroke','original interior cleared','pause','source dialog','DPR=2','brand detection colors'],status:'passed',mode:'offline Canvas command verification using real SVG luminance rasters'};
  await fs.writeFile('work/gather-checks.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
