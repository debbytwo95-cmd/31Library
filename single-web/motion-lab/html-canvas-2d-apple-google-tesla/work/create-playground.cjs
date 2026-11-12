const fs=require('node:fs');
let html=fs.readFileSync('outputs/ai-brand-signals-editorial.html','utf8');
const replace=(from,to)=>{if(!html.includes(from))throw new Error('Missing insertion point: '+from.slice(0,80));html=html.replace(from,to);};
replace('<title>Signal Studies — Grok / Claude / ChatGPT</title>','<title>Signal Playground — Grok / Claude / ChatGPT</title>');
replace('VOL. 001','VOL. 002');
replace('<p class="intro-note">An exploration of identity, reduced to lines.<br><span>Move closer. Disturb the familiar.</span></p>','<p class="intro-note" id="interaction-guide">Click to send a signal. Hold to charge.<br><span>Rest to lock a region. Esc to release.</span></p>');
replace('LIVE EXPERIMENT','SIGNAL PLAYGROUND');
replace('56 STRANDS &nbsp;·&nbsp; 4 WEIGHTS &nbsp;·&nbsp; HOVER TO INTERACT','CLICK / RIPPLE &nbsp;·&nbsp; HOLD / CHARGE &nbsp;·&nbsp; REST / LOCK');
replace('    <button class="motion"','    <button class="reset-locks" disabled>Reset locks</button>\n    <button class="motion"');
html=html.replace(/(<article class="card [^"]+" tabindex="0")/g,'$1 aria-describedby="interaction-guide"');
html=html.replaceAll('检测框随鼠标锁定并局部放大','单击扩散，长按蓄能，停留锁定，Esc解除');
html=html.replaceAll('</header>\n      <div class="card-bottom">','</header>\n      <span class="interaction-state mono" aria-live="off">EXPLORE</span>\n      <div class="card-bottom">');
replace('</style>',`  .card { cursor:crosshair; user-select:none; -webkit-user-select:none; }
  .interaction-state { position:absolute; top:62px; right:26px; color:var(--sub); font-size:8px; letter-spacing:.8px; pointer-events:none; }
  .reset-locks { border:0; background:transparent; padding:4px 0; color:#70756a; font:10px Consolas,monospace; cursor:pointer; }
  .reset-locks:hover { color:#22241f; }
  .reset-locks:disabled { opacity:.35; cursor:default; }
  @media (max-width:1050px) { .footer { flex-wrap:wrap; } .legend { order:3; width:100%; } .interaction-state { right:20px; } }
</style>`);
replace('      this.pointer={x:-1000,y:-1000,inside:false};this.focused=false;',`      this.pointer={x:-1000,y:-1000,inside:false};this.focused=false;
      this.pointerType='mouse';this.overControl=false;this.press=null;this.waves=[];this.pinned=null;
      this.dwell=0;this.dwellOrigin=null;this.dwellSuppressed=false;
      this.status=card.querySelector('.interaction-state');`);
replace("      card.addEventListener('pointerdown',e=>this.move(e));","      card.addEventListener('pointerdown',e=>this.down(e));");
replace("      card.addEventListener('pointerup',e=>{if(e.pointerType==='touch')this.leave();});","      card.addEventListener('pointerup',e=>this.up(e));");
replace("      card.addEventListener('pointercancel',()=>this.leave());",`      card.addEventListener('pointercancel',()=>{this.cancelGesture();this.leave();});
      card.addEventListener('lostpointercapture',()=>{if(this.press)this.cancelGesture();});
      card.addEventListener('contextmenu',e=>{if(!e.target?.closest?.('button'))e.preventDefault();});
      card.addEventListener('keydown',e=>{
        if(e.target!==card||!(e.key==='Enter'||e.key===' '))return;
        e.preventDefault();this.emitWave(this.width*.5,this.height*.45,1,false);this.dwellSuppressed=true;
      });`);
replace('      const entering=!this.pointer.inside;',`      const entering=!this.pointer.inside;
      this.pointerType=e.pointerType||'mouse';this.overControl=Boolean(e.target?.closest?.('button'));`);
replace('      this.pointer={x,y,inside:true};',`      this.pointer={x,y,inside:true};
      if(!this.dwellOrigin||Math.hypot(x-this.dwellOrigin.x,y-this.dwellOrigin.y)>6){
        this.dwellOrigin={x,y};this.dwell=0;this.dwellSuppressed=false;
      }
      if(this.press&&Math.hypot(x-this.press.x,y-this.press.y)>this.width*.035){this.press.dragged=true;this.dwell=0;}`);
replace('    leave() {this.pointer.inside=false;this.lastPaint=null;}',`    leave() {this.pointer.inside=false;this.lastPaint=null;this.dwell=0;this.dwellOrigin=null;}
${fs.readFileSync('work/playground-methods.js','utf8')}`);
replace('      const boxes=[{...this.anchor},...components.slice(0,2)];',`      const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
      const boxes=this.pinned?[{...this.pinned},...[this.anchor,...components].filter(b=>!overlaps(b,this.pinned)).slice(0,2)]:[{...this.anchor},...components.slice(0,2)];`);
replace('          const a=boxes[i],b=boxes[j];','          const a=boxes[i],b=boxes[j];\n          if(a.kind===\'pinned\'||b.kind===\'pinned\')continue;');
replace("      this.regions=boxes.sort((a,b)=>(a.kind==='anchor'?-1:1)-(b.kind==='anchor'?-1:1)||a.y-b.y);","      const rank=b=>b.kind==='pinned'?0:b.kind==='anchor'?1:2;\n      this.regions=boxes.sort((a,b)=>rank(a)-rank(b)||a.y-b.y);");
replace('      const active=p.inside||this.focused;',"      const active=p.inside||this.focused||Boolean(this.pinned)||this.waves.length>0||Boolean(this.press);");
replace('      if(p.inside)this.stamp(p.x,p.y);','      this.updateGestures(dt);\n      if(p.inside)this.stamp(p.x,p.y);');
replace('      if(this.reveal>.008)this.drawDetections();','      if(this.reveal>.008)this.drawDetections();\n      this.drawGestureProgress();');
replace('        ctx.strokeStyle=accent;ctx.lineWidth=.7;ctx.strokeRect(x,y,w,h);',"        ctx.strokeStyle=accent;ctx.lineWidth=b.kind==='pinned'?1.3:.7;ctx.strokeRect(x,y,w,h);");
replace('        const label=`${Math.round(b.x*this.cw)}, ${Math.round(b.y*this.ch)}`;',"        const label=`${b.kind==='pinned'?'LOCK ':''}${Math.round(b.x*this.cw)}, ${Math.round(b.y*this.ch)}`;");
replace('  const observer=new ResizeObserver(entries=>{',`  const resetButton=document.querySelector('.reset-locks');
  function syncReset(){resetButton.disabled=!studies.some(s=>s.pinned);}
  resetButton.addEventListener('click',()=>studies.forEach(s=>s.clearPin()));
  document.addEventListener('pointerdown',e=>{
    if(!e.target?.closest?.('.card, dialog, button'))studies.forEach(s=>s.clearPin());
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!document.querySelector('dialog').open)studies.forEach(s=>{s.clearPin();s.cancelGesture();});
  });
  const observer=new ResizeObserver(entries=>{`);
replace("  window.addEventListener('blur',()=>studies.forEach(s=>s.pointer.inside=false));","  window.addEventListener('blur',()=>studies.forEach(s=>{s.cancelGesture();s.leave();}));");
fs.writeFileSync('outputs/ai-brand-signals-playground.html',html);
console.log('Created outputs/ai-brand-signals-playground.html ('+Buffer.byteLength(html)+' bytes)');
