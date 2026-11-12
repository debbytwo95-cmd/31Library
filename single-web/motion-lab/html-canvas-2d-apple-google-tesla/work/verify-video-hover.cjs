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
  const html=await fs.readFile('outputs/ai-brand-signals.html','utf8');
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
  let clock=0;
  const tick=(count=1)=>{advance(clock,count);clock+=count;};
  const move=(x,y)=>studies.forEach((s,i)=>s.move({clientX:128+i*562+x,clientY:180+y}));
  const selection=s=>JSON.stringify(s.regions.map(({x,y,w,h,kind})=>({x,y,w,h,kind})));
  const heatAt=(s,x,y)=>s.heat[Math.floor(y/s.ch)*56+Math.floor(x/s.cw)];
  const onGrid=()=>studies.forEach(s=>{
    for(const points of s.frameBuckets)for(let i=0;i<points.length;i+=3){
      const gx=points[i]/s.cw-.5;assert.ok(Math.abs(gx-Math.round(gx))<1e-8,'all strands stay aligned');
    }
    assert.ok(s.regions.length>=1&&s.regions.length<=3);
    for(const b of s.regions){
      assert.ok([b.x,b.y,b.w,b.h].every(Number.isInteger));
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=56&&b.y+b.h<=112);
    }
  });
  tick(2);assert.ok(studies.every(s=>s.regions.length===0));
  const anchors=studies.map(s=>JSON.stringify(s.anchor));
  move(115,650);tick(3);onGrid();
  for(const s of studies){
    assert.equal(s.entryCount,1);assert.ok(heatAt(s,115,650)>.95);
    const blank=s.table.findIndex((value,i)=>value<.01&&s.heat[i]>.7);
    assert.ok(blank>=0,'cursor paints temporary activity beyond original logo');
    const x=(blank%56+.5)*s.cw,y=(Math.floor(blank/56)+.5)*s.ch;
    assert.ok(s.frameBuckets.some((points,level)=>level>0&&points.some((px,i)=>i%3===0&&Math.abs(px-x)<1e-6&&Math.abs((points[i+1]+points[i+2])/2-y)<1e-6)),'painted blank cells become visible heavier strands');
  }
  move(415,430);tick(2);
  studies.forEach(s=>{
    assert.ok(heatAt(s,115,650)>.22,'recent cursor trail remains briefly');
    assert.ok(heatAt(s,415,430)>.95);assert.equal(s.entryCount,1);
  });
  tick(70);onGrid();
  studies.forEach((s,i)=>{
    assert.ok(heatAt(s,115,650)<.02,'old cursor trail decays');
    assert.ok(heatAt(s,415,430)>.95,'current pointer maintains active region');
    assert.equal(JSON.stringify(s.anchor),anchors[i],'stable recognition anchor retained');
  });
  const locked=studies.map(selection);tick(65);
  studies.forEach((s,i)=>assert.equal(selection(s),locked[i],'stationary pointer has no timed ROI changes'));
  // Move to the stable anchor: connected/overlapping activity becomes one box.
  studies.forEach((s,i)=>s.move({clientX:128+i*562+(s.anchor.x+s.anchor.w/2)*s.cw,clientY:180+(s.anchor.y+s.anchor.h/2)*s.ch}));
  tick(75);studies.forEach(s=>assert.equal(s.regions.length,1,'anchor and overlapping cursor region merge'));
  move(115,650);tick(75);studies.forEach(s=>assert.equal(s.regions.length,2,'moving away separates cursor component from anchor'));
  capture=true;tick();capture=false;
  for(const s of studies){
    const clipped=s.ctx.draws.filter(d=>d.clip);
    assert.ok(clipped.some(d=>d.width>s.weights[3]*1.5),'locked strokes become thicker');
    assert.equal(s.ctx.clippedClears.length,s.regions.length);
    assert.ok(clipped.every(d=>s.ctx.boxes.some(b=>Math.abs(d.clip.x-b.x-1)<1e-7&&Math.abs(d.clip.y-b.y-1)<1e-7&&Math.abs(d.clip.w-b.w+2)<1e-7&&Math.abs(d.clip.h-b.h+2)<1e-7)));
    assert.equal(s.ctx.stack.length,0);
  }
  studies.forEach(s=>s.leave());tick(80);
  studies.forEach(s=>assert.ok(Math.max(...s.heat)<.01,'trail disappears after leaving'));
  move(240,350);studies.forEach(s=>{assert.equal(s.entryCount,2);assert.equal(s.entryAge,0);});
  tick(10);onGrid();motion.listeners.click();tick();
  const frozen=studies.map(s=>JSON.stringify(s.frameBuckets));tick(4);
  studies.forEach((s,i)=>assert.equal(JSON.stringify(s.frameBuckets),frozen[i]));
  win.devicePixelRatio=2;tick();assert.ok(cards.every(c=>c.art.width===1080&&c.art.height===1440));
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  const report={status:'passed',checks:['local cursor painting including empty background','short-lived cursor trail','stable bright anchor','connected-region merge and split','no timed random target changes','grid-snapped tracker edges','aligned vertical strands without spatial zoom or recoil','thicker clipped locked strands','entry noise on each visit','pause','DPR=2','existing brand colors'],mode:'offline Canvas command verification using real SVG luminance rasterization'};
  await fs.writeFile('work/video-hover-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
