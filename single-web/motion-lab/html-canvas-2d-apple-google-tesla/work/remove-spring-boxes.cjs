const fs=require('node:fs');
const file='outputs/ai-brand-signals-spring.html';
let html=fs.readFileSync(file,'utf8');
fs.writeFileSync('work/ai-brand-signals-spring-before-no-boxes.html',html);
function replace(from,to){if(!html.includes(from))throw new Error('Missing insertion point: '+from.slice(0,90));html=html.replace(from,to);}
function removeBlock(from,to){const start=html.indexOf(from),end=html.indexOf(to,start);if(start<0||end<0)throw new Error('Missing block: '+from);html=html.slice(0,start)+html.slice(end);}
removeBlock('  // Summed-area data','  class Study {');
replace('      this.table=samplePath(this.brand);this.integral=makeIntegral(this.table);','      this.table=samplePath(this.brand);');
replace('      this.pointer={x:-1000,y:-1000,inside:false};this.focused=false;','      this.pointer={x:-1000,y:-1000,inside:false};');
replace('      this.heat=new Float32Array(COLS*ROWS);this.visited=new Uint8Array(COLS*ROWS);\n      this.queue=new Int32Array(COLS*ROWS);this.lastPaint=null;\n      this.anchor=this.findAnchor();\n      this.frameBuckets=[[],[],[],[]];this.weights=[];\n      this.reveal=0;this.scanAge=0;this.regions=[];','      this.frameBuckets=[[],[],[],[]];');
replace("      card.addEventListener('focusin',()=>{this.focused=true;this.updateLock();});\n      card.addEventListener('focusout',e=>{if(!card.contains(e.relatedTarget))this.focused=false;});\n",'');
replace('      if(entering){this.entryCount++;this.entryAge=paused?this.entryDuration:0;this.lastPaint=null;this.scanAge=0;}','      if(entering){this.entryCount++;this.entryAge=paused?this.entryDuration:0;}');
replace('      if(paused)this.heat.fill(0);\n      const from=this.lastPaint||{x,y};\n      const steps=Math.max(1,Math.min(40,Math.ceil(Math.hypot(x-from.x,y-from.y)/(this.cw*2))));\n      for(let i=1;i<=steps;i++)this.stamp(from.x+(x-from.x)*i/steps,from.y+(y-from.y)*i/steps);\n      this.lastPaint={x,y};\n      this.updateLock();\n','');
replace('    leave() {this.pointer.inside=false;this.lastPaint=null;this.lastKickPoint=null;}','    leave() {this.pointer.inside=false;this.lastKickPoint=null;}');
removeBlock('    stamp(px,py) {','    resize() {');
removeBlock('    findAnchor() {','    draw(time,dt) {');
replace('      const ctx=this.ctx,p=this.pointer,cw=this.cw,ch=this.ch;','      const ctx=this.ctx,cw=this.cw,ch=this.ch;');
const start=html.indexOf('      const active=p.inside||this.focused;'),end=html.indexOf('      // Every entry sends',start);
if(start<0||end<0)throw new Error('Missing draw prelude');
html=html.slice(0,start)+'      if(!paused)this.entryAge=Math.min(this.entryDuration,this.entryAge+dt);\n      this.updateSpring(dt);\n'+html.slice(end);
replace('        const painted=0; // The cursor moves the logo strands instead of painting extra lines.\n','');
replace('+(enteringNoise-.5)*entryFlow*1.25)+painted,0,1);','+(enteringNoise-.5)*entryFlow*1.25),0,1);');
replace('      this.frameBuckets=buckets;this.weights=weights;','      this.frameBuckets=buckets;');
replace('      if(this.reveal>.008)this.drawDetections();\n','');
removeBlock('    drawDetections() {','\n  }\n\n  const studies=');
html=html.replace(/^\s*"(?:highlight|detection|detectionText|minDensity)":.*\n/gm,'');
fs.writeFileSync(file,html);console.log('Updated '+file+' ('+Buffer.byteLength(html)+' bytes)');
