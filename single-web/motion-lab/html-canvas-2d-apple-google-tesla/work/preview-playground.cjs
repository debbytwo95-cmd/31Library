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
    card.getBoundingClientRect=()=>({width:430.667,height:574.223,left:56+index*448.667,top:320});
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
  Context.prototype.arc=function(x,y,r,start,end){for(let i=0;i<=24;i++){const a=start+(end-start)*i/24;i===0?this.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r):this.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}};
  let clearIndex=0;const originalClear=Context.prototype.clearRect;
  Context.prototype.clearRect=function(x,y,w,h){
    const previous=this.nodes.join('');originalClear.call(this,x,y,w,h);
    if(capture&&this.clipRect){const id='mask'+(++clearIndex);this.nodes=[`<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="540" height="720"><rect width="540" height="720" fill="white"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="black"/></mask></defs><g mask="url(#${id})">${previous}</g>`];}
  };
  const event=(i,x,y)=>({clientX:56+i*448.667+x,clientY:320+y,pointerId:i+1,pointerType:'mouse',button:0});
  advance(0,1);
  studies[0].down(event(0,200,290));studies[0].press.elapsed=.1;studies[0].up(event(0,200,290));studies[0].updateGestures(.18);
  studies[1].down(event(1,230,290));studies[1].updateGestures(1.05);
  studies[2].move(event(2,260,280));studies[2].updateGestures(.75);studies[2].leave();
  capture=true;advance(1,1);capture=false;
  const colors=[['#111316','#20252b'],['#8a432f','#cf8a64'],['#10392f','#1b6a56']];
  const captions=['A different angle.','Room for thought.','Start a conversation.'];
  let defs='',body='';
  const width=430.667,height=574.223;
  for(let i=0;i<3;i++){
    const brand=Object.values(brands)[i];
    defs+=`<linearGradient id="bg${i}" x2=".3" y2="1"><stop stop-color="${colors[i][0]}"/><stop offset="1" stop-color="${colors[i][1]}"/></linearGradient><clipPath id="card${i}"><rect width="${width}" height="${height}" rx="9"/></clipPath>`;
    body+=`<svg x="${56+i*448.667}" y="320" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g clip-path="url(#card${i})"><rect width="100%" height="100%" fill="url(#bg${i})"/>${cards[i].art.ctx.nodes.join('')}<g transform="translate(27,27)">${cards[i].icon.ctx.nodes.join('')}</g><text x="59" y="45" font-family="Arial" font-size="16" font-weight="600" fill="${brand.icon}">${brand.name}</text><text x="${width-26}" y="43" text-anchor="end" font-family="Consolas" font-size="10" fill="${brand.icon}" opacity=".6">0${i+1} / ${brand.name.toUpperCase()}</text><text x="${width-26}" y="70" text-anchor="end" font-family="Consolas" font-size="8" fill="${brand.icon}" opacity=".7">${escape(cards[i].status.textContent)}</text><text x="27" y="${height-82}" font-family="Arial" font-size="21" letter-spacing="-.75" fill="${brand.icon}">${captions[i]}</text><path d="M27 ${height-55}H${width-26}" stroke="${brand.icon}" opacity=".25"/><text x="27" y="${height-27}" font-family="Arial" font-size="11" fill="${brand.icon}">Reveal the source</text><text x="${width-65}" y="${height-27}" font-family="Consolas" font-size="9" text-anchor="end" fill="${brand.icon}" opacity=".6">PATH / 0${i+1}</text><text x="${width-27}" y="${height-25}" font-family="Arial" font-size="17" text-anchor="end" fill="${brand.icon}">→</text></g></svg>`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="980"><defs>${defs}</defs><rect width="100%" height="100%" fill="#f4f3ef"/><g fill="#22241f"><text x="56" y="52" font-family="Arial" font-size="13" font-weight="700">▥ FORM &amp; FREQUENCY</text><text x="1384" y="52" text-anchor="end" font-family="Consolas" font-size="10" fill="#77796f">INTERACTIVE STUDIES / VOL. 002</text><path d="M56 78H1384" stroke="#d7d8d0"/><text x="56" y="138" font-family="Consolas" font-size="10" letter-spacing="1.9" fill="#77796f">THREE ICONS. ONE VISUAL LANGUAGE.</text><text x="56" y="214" font-family="Georgia" font-size="65" letter-spacing="-3.1">Familiar forms.</text><text x="56" y="280" font-family="Georgia" font-style="italic" font-size="65" letter-spacing="-3.1" fill="#8b8c82">Different frequency.</text><text x="1112" y="255" font-family="Arial" font-size="12" fill="#77796f">Click to send a signal. Hold to charge.</text><text x="1112" y="277" font-family="Arial" font-size="12" fill="#393d33">Rest to lock a region. Esc to release.</text></g>${body}<text x="56" y="928" font-family="Consolas" font-size="9" letter-spacing="1" fill="#6d7267">● SIGNAL PLAYGROUND / CANVAS 2D</text><text x="720" y="928" text-anchor="middle" font-family="Consolas" font-size="9" fill="#8b8e83">CLICK / RIPPLE · HOLD / CHARGE · REST / LOCK</text><text x="1265" y="928" text-anchor="end" font-family="Consolas" font-size="10" fill="#70756a">Reset locks</text><text x="1384" y="928" text-anchor="end" font-family="Consolas" font-size="10" fill="#70756a">Ⅱ Pause motion</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile('work/playground-preview.png');console.log('Offline preview saved: click, charge, lock states.');
})().catch(e=>{console.error(e);process.exitCode=1;});
