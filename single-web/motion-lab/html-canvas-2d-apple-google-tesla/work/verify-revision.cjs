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
  stroke(){this.strokeWidths.add(this.lineWidth);this.node(`<path d="${this.path.join('')}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" opacity="${this.globalAlpha}" stroke-linecap="${this.lineCap}"/>`);}
  fill(){}
  rect(x,y,w,h){this.rectPath={x,y,w,h};}
  clip(){this.clipRect=this.rectPath;}
  clearRect(){if(capture)this.nodes=[];this.strokeWidths.clear();}
  fillRect(x,y,w,h){this.node(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.fillStyle}" opacity="${this.globalAlpha}"/>`);}
  strokeRect(x,y,w,h){this.node(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" opacity="${this.globalAlpha}"/>`);}
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
  advance(0,119);capture=true;advance(119,1);capture=false;
  const initial=cards.map(c=>c.art.ctx.nodes.join(''));
  const text=[['Designed with','restraint. Every pixel','has to earn its place.'],['Organizing the','world’s information,','one signal at a time.'],['Accelerating the','world’s transition to','sustainable energy.']];
  async function canvasSheet(file){
    let body='';
    for(let i=0;i<3;i++){
      const fill=['url(#apple)','url(#google)','url(#tesla)'][i],fg=i?'#fff':'#171717';
      body+=`<svg x="${128+i*562}" y="180" width="540" height="720" viewBox="0 0 540 720"><rect width="540" height="720" fill="${fill}"/>${cards[i].art.ctx.nodes.join('')}<g transform="translate(63,64)">${cards[i].icon.ctx.nodes.join('')}</g><text x="110" y="96" font-family="Arial" font-size="32" font-weight="600" letter-spacing="-1.4" fill="${fg}">${Object.values(brands)[i].name}</text>`;
      for(let j=0;j<3;j++)body+=`<text x="63" y="${467+j*49}" font-family="Arial" font-size="36" letter-spacing="-.18" fill="${fg}">${text[i][j]}</text>`;
      body+=`<text x="63" y="644" font-family="Arial" font-size="23" fill="${fg}">Reveal the source →</text></svg>`;
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="apple" x2=".25" y2="1"><stop stop-color="#f6f6f6"/><stop offset="1" stop-color="#e5e5e5"/></linearGradient><linearGradient id="google" x2="0" y2="1"><stop stop-color="#10184c"/><stop offset=".52" stop-color="#1c3890"/><stop offset="1" stop-color="#2d60ef"/></linearGradient><linearGradient id="tesla" x2=".3" y2="1"><stop stop-color="#121212"/><stop offset="1" stop-color="#171112"/></linearGradient></defs><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(file);
  }
  await canvasSheet('work/revised-canvas-idle.png');
  advance(120,29);capture=true;advance(149,1);capture=false;
  assert.notEqual(cards[0].art.ctx.nodes.join(''),initial[0],'idle noise changes frame geometry');
  for(let i=0;i<3;i++){
    const study=studies[i];study.move({clientX:128+i*562+320,clientY:180+350});
    assert.equal(study.regions.length,3,`${study.brand.name}: 3 bright regions`);
    for(const b of study.regions){
      assert.equal(b.x,Math.floor(b.x));assert.equal(b.y,Math.floor(b.y));
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=56&&b.y+b.h<=112);
    }
  }
  advance(150,29);capture=true;advance(179,1);capture=false;
  assert.ok(studies.every(s=>Math.max(...s.dx.map(Math.abs))>2),'nearby strands scatter');
  await canvasSheet('work/revised-canvas-hover.png');
  const firstBoxes=studies.map(s=>JSON.stringify(s.regions));
  advance(180,60);
  assert.ok(studies.every((s,i)=>JSON.stringify(s.regions)!==firstBoxes[i]),'trackers reacquire new bright grid regions');
  for(const s of studies)s.pointer.inside=false;
  advance(240,240);
  assert.ok(studies.every(s=>Math.max(...s.dx.map(Math.abs))<.05),'springs return to original grid');
  motion.listeners.click();advance(480,9);capture=true;advance(489,1);capture=false;
  const paused=cards[0].art.ctx.nodes.join('');advance(490,29);capture=true;advance(519,1);capture=false;
  assert.equal(cards[0].art.ctx.nodes.join(''),paused,'pause stops noise, rain and scanning');
  buttons[0].listeners.click();assert.equal(dialog.open,true);assert.ok(code.textContent.includes('<path'));close.listeners.click();assert.equal(dialog.open,false);
  win.devicePixelRatio=2;advance(520,1);
  assert.ok(cards.every(c=>c.art.width===1080&&c.art.height===1440),'DPR=2 uses doubled backing resolution');
  const report={syntax:'valid',images:0,externalDependencies:0,rasterCount:3,renderedCards:3,regions:studies.map(s=>({brand:s.brand.name,count:s.regions.length})),checks:['real SVG raster sampling','finite drawing coordinates','idle flow','3 non-overlapping bright grid boxes per brand','tracker reacquisition','pointer scattering','spring settling','pause','source modal','DPR=2'],note:'Canvas drawing commands verified offline with SVG rasterization; browser UI preview unavailable.'};
  await fs.writeFile('work/revision-checks.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
