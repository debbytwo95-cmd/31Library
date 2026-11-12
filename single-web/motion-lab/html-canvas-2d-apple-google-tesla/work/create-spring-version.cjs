const fs=require('node:fs');
// Start from the editorial edition, not the discarded gesture playground.
let html=fs.readFileSync('outputs/ai-brand-signals-editorial.html','utf8');
function replace(from,to){if(!html.includes(from))throw new Error('Missing insertion point: '+from.slice(0,80));html=html.replace(from,to);}
replace('<title>Signal Studies — Grok / Claude / ChatGPT</title>','<title>Spring Signals — Grok / Claude / ChatGPT</title>');
replace('<p class="intro-note">An exploration of identity, reduced to lines.<br><span>Move closer. Disturb the familiar.</span></p>','<p class="intro-note">Move closer. Watch the signal scatter.<br><span>Pause and let the lines settle.</span></p>');
replace('56 STRANDS &nbsp;·&nbsp; 4 WEIGHTS &nbsp;·&nbsp; HOVER TO INTERACT','HOVER / SCATTER &nbsp;·&nbsp; REST / RETURN');
html=html.replaceAll('每次进入触发流动噪声，检测框随鼠标锁定并局部放大','鼠标进入时附近竖线散开，随后弹回原位');
replace('      this.pointer={x:-1000,y:-1000,inside:false};this.focused=false;',`      this.pointer={x:-1000,y:-1000,inside:false};this.focused=false;
      this.dx=new Float32Array(COLS*ROWS);this.dy=new Float32Array(COLS*ROWS);
      this.vx=new Float32Array(COLS*ROWS);this.vy=new Float32Array(COLS*ROWS);
      this.lastKickPoint=null;`);
replace('      this.pointer={x,y,inside:true};',`      this.pointer={x,y,inside:true};
      if(!e.target?.closest?.('button')&&(entering||!this.lastKickPoint||Math.hypot(x-this.lastKickPoint.x,y-this.lastKickPoint.y)>8)){
        this.kick(x,y,entering?1:.48);this.lastKickPoint={x,y};
      }`);
replace('    leave() {this.pointer.inside=false;this.lastPaint=null;}',`    leave() {this.pointer.inside=false;this.lastPaint=null;this.lastKickPoint=null;}
${fs.readFileSync('work/spring-methods.js','utf8')}`);
replace('      if(p.inside)this.stamp(p.x,p.y);','      this.updateSpring(dt);\n      if(p.inside)this.stamp(p.x,p.y);');
replace('      // Strand positions stay fixed; there is no spring or spatial recoil.','      // Width noise continues independently while spring offsets scatter and settle.');
replace('        const painted=this.heat[i]*(.44+detail*.22+node*.12);','        const painted=0; // The cursor moves the logo strands instead of painting extra lines.');
replace('        const px=bx,py=by;','        const px=bx+this.dx[i],py=by+this.dy[i];');
fs.writeFileSync('outputs/ai-brand-signals-spring.html',html);
console.log('Created outputs/ai-brand-signals-spring.html ('+Buffer.byteLength(html)+' bytes)');
