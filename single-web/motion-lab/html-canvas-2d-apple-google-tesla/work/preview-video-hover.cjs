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
  let clearIndex=0;
  const originalClear=Context.prototype.clearRect;
  Context.prototype.clearRect=function(x,y,w,h){
    const previous=this.nodes.join('');originalClear.call(this,x,y,w,h);
    if(capture&&this.clipRect){
      const id='clear'+(++clearIndex);
      this.nodes=['<defs><mask id="'+id+'" maskUnits="userSpaceOnUse" x="0" y="0" width="540" height="720"><rect width="540" height="720" fill="white"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="black"/></mask></defs><g mask="url(#'+id+')">'+previous+'</g>'];
    }
  };
  advance(0,1);
  studies.forEach((s,i)=>s.move({clientX:128+i*562+140,clientY:180+420}));
  advance(1,8);
  studies.forEach((s,i)=>s.move({clientX:128+i*562+360,clientY:180+490}));
  advance(9,8);
  capture=true;advance(17,1);capture=false;
  const colors=[['#111316','#20252b'],['#8a432f','#cf8a64'],['#10392f','#1b6a56']];
  const taglines=[['A different angle.','A curious mind.','A new perspective.'],['Room for thought.','Space for nuance.','Ideas taking shape.'],['Start a conversation.','Follow an idea.','See where it leads.']];
  let defs='',body='';
  for(let i=0;i<3;i++){
    const b=Object.values(brands)[i];
    defs+=`<linearGradient id="bg${i}" x2=".3" y2="1"><stop stop-color="${colors[i][0]}"/><stop offset="1" stop-color="${colors[i][1]}"/></linearGradient>`;
    body+=`<svg x="${128+i*562}" y="180" width="540" height="720" viewBox="0 0 540 720"><rect width="540" height="720" fill="url(#bg${i})"/>${cards[i].art.ctx.nodes.join('')}<g transform="translate(63,64)">${cards[i].icon.ctx.nodes.join('')}</g><text x="110" y="96" font-family="Arial" font-size="32" font-weight="600" letter-spacing="-1.4" fill="${b.icon}">${b.name}</text>`;
    for(let j=0;j<3;j++)body+=`<text x="63" y="${467+j*49}" font-family="Arial" font-size="36" letter-spacing="-.18" fill="${b.icon}">${taglines[i][j]}</text>`;
    body+=`<text x="63" y="644" font-family="Arial" font-size="23" fill="${b.icon}">Reveal the source →</text></svg>`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${defs}</defs><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile('work/ai-video-hover-preview.png');
  // The negative center of the ChatGPT knot must survive the even-odd fill.
  const brand=brands.chatgpt,w=336,h=448,size=w*brand.scale,tx=(w-size)/2+brand.offset*w,ty=brand.top*h;
  const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="black"/><path fill="white" fill-rule="${brand.fillRule}" transform="translate(${tx} ${ty}) scale(${size/24})" d="${brand.path}"/></svg>`;
  const raw=await sharp(Buffer.from(source)).ensureAlpha().raw().toBuffer();
  const center=(Math.round(ty+size*.5)*w+Math.round(tx+size*.5))*4;
  assert.ok(raw[center]<10,'ChatGPT center remains a negative-space opening');
  console.log('Offline Canvas preview saved; ChatGPT negative space verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
