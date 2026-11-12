  // One temporary raster per brand; only the averaged luminance survives.
  // Rectangular 6 × 4 sample cells preserve the card's 3:4 aspect ratio.
  function samplePath(brand) {
    const raster=document.createElement('canvas');
    raster.width=COLS*SX; raster.height=ROWS*SY;
    const ctx=raster.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#000'; ctx.fillRect(0,0,raster.width,raster.height);
    const size=raster.width*brand.scale;
    ctx.translate((raster.width-size)/2+brand.offset*raster.width,brand.top*raster.height);
    ctx.scale(size/24,size/24); ctx.fillStyle='#fff';ctx.fill(new Path2D(brand.path));
    const pixels=ctx.getImageData(0,0,raster.width,raster.height).data;
    const table=new Float32Array(COLS*ROWS);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) {
      let sum=0;
      for(let sy=0;sy<SY;sy++) for(let sx=0;sx<SX;sx++) {
        const i=((y*SY+sy)*raster.width+x*SX+sx)*4;
        sum+=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
      }
      table[y*COLS+x]=sum/(SX*SY*255);
    }
    raster.width=0;raster.height=0;
    return table;
  }

  function hash(x,y) {
    let n=Math.imul(x,374761393)+Math.imul(y,668265263);
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  }
  function noise(x,y) {
    const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
    fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
    return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;
  }
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=media.matches,motionTime=0,previous=0,pageVisible=!document.hidden;
  const motionButton=document.querySelector('.motion');
  function updateMotionButton() {
    motionButton.textContent=paused?'▷ Resume motion':'Ⅱ Pause motion';
    motionButton.setAttribute('aria-pressed',String(paused));
  }
  updateMotionButton();
  motionButton.addEventListener('click',()=>{paused=!paused;updateMotionButton();});
  media.addEventListener('change',e=>{paused=e.matches;updateMotionButton();});

  // Summed-area data makes changing detection windows independent of raster pixels.
  function makeIntegral(table) {
    const stride=COLS+1,out=new Float32Array(stride*(ROWS+1));
    for(let y=1;y<=ROWS;y++) for(let x=1;x<=COLS;x++)
      out[y*stride+x]=table[(y-1)*COLS+x-1]+out[y*stride+x-1]+out[(y-1)*stride+x]-out[(y-1)*stride+x-1];
    return out;
  }
  function windowMean(integral,x,y,w,h) {
    const s=COLS+1;
    return (integral[(y+h)*s+x+w]-integral[y*s+x+w]-integral[(y+h)*s+x]+integral[y*s+x])/(w*h);
  }

  class Study {
    constructor(card,index) {
      this.card=card;this.index=index;this.brand=BRANDS[card.dataset.brand];
      this.canvas=card.querySelector('.art');this.ctx=this.canvas.getContext('2d');
      this.icon=card.querySelector('.brand-icon');
      this.table=samplePath(this.brand);this.integral=makeIntegral(this.table);
      this.dx=new Float32Array(COLS*ROWS);this.dy=new Float32Array(COLS*ROWS);
      this.vx=new Float32Array(COLS*ROWS);this.vy=new Float32Array(COLS*ROWS);
      this.pointer={x:-1000,y:-1000,inside:false};this.focused=false;
      this.reveal=0;this.burst=0;this.scanClock=0;this.scanAge=0;this.scanId=0;this.regions=[];
      this.width=0;this.height=0;this.dpr=0;
      card.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')this.move(e);});
      card.addEventListener('pointermove',e=>this.move(e));
      card.addEventListener('pointerdown',e=>this.move(e));
      card.addEventListener('pointerleave',()=>this.pointer.inside=false);
      card.addEventListener('pointerup',e=>{if(e.pointerType==='touch')this.pointer.inside=false;});
      card.addEventListener('pointercancel',()=>this.pointer.inside=false);
      card.addEventListener('focusin',()=>this.focused=true);
      card.addEventListener('focusout',e=>{if(!card.contains(e.relatedTarget))this.focused=false;});
      this.resize();
    }
    move(e) {
      const rect=this.card.getBoundingClientRect();
      if(!this.pointer.inside) {
        this.burst=paused?0:1;
        this.scanClock=0;this.acquire();
      }
      this.pointer={x:e.clientX-rect.left,y:e.clientY-rect.top,inside:true};
    }
    resize() {
      const rect=this.card.getBoundingClientRect();
      this.width=rect.width;this.height=rect.height;this.dpr=window.devicePixelRatio||1;
      this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.cw=this.width/COLS;this.ch=this.height/ROWS;
      this.drawIcon();
    }
    drawIcon() {
      const w=this.width*.0625,h=this.width*.069,ctx=this.icon.getContext('2d');
      this.icon.width=Math.round(w*this.dpr);this.icon.height=Math.round(h*this.dpr);
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,w,h);
      let minX=COLS,maxX=0,minY=ROWS,maxY=0;
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(this.table[y*COLS+x]>.15){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
      const scale=Math.min((w-1)/((maxX-minX+1)*SX),(h-1)/((maxY-minY+1)*SY));
      const ox=(w-(maxX-minX+1)*SX*scale)/2,oy=(h-(maxY-minY+1)*SY*scale)/2;
      ctx.strokeStyle=this.brand.icon;ctx.lineWidth=Math.max(.6,this.width*.0014);ctx.lineCap='butt';ctx.beginPath();
      for(let x=minX;x<=maxX;x+=2)for(let y=minY;y<=maxY;y++)if(this.table[y*COLS+x]>.3){
        const px=ox+(x-minX+.5)*SX*scale,py=oy+(y-minY)*SY*scale;
        ctx.moveTo(px,py);ctx.lineTo(px,py+SY*scale+.12);
      }
      ctx.stroke();
    }
    acquire() {
      const generation=++this.scanId,candidates=[];
      // Different window sizes and a slowly moving saliency weight let the
      // tracker reacquire real bright regions rather than replay fixed boxes.
      for(let y=3;y<ROWS-18;y+=3)for(let x=2;x<COLS-12;x+=2){
        const w=7+Math.floor(hash(x+generation,y)*6),h=8+Math.floor(hash(y,generation+8)*9);
        const mean=windowMean(this.integral,x,y,w,h);
        if(mean<.56)continue;
        const salience=noise(x*.16+generation*1.73,y*.1+generation*.81);
        candidates.push({x,y,w,h,score:mean*.55+salience*.45});
      }
      candidates.sort((a,b)=>b.score-a.score);
      const picked=[];
      for(const b of candidates){
        const separate=picked.every(p=>{
          const ix=Math.max(0,Math.min(b.x+b.w,p.x+p.w)-Math.max(b.x,p.x));
          const iy=Math.max(0,Math.min(b.y+b.h,p.y+p.h)-Math.max(b.y,p.y));
          return ix*iy<3&&Math.hypot((b.x+b.w/2)-(p.x+p.w/2),((b.y+b.h/2)-(p.y+p.h/2))*.65)>15;
        });
        if(separate)picked.push(b);
        if(picked.length===3)break;
      }
      this.regions=picked;this.scanAge=0;
    }
    draw(time,dt) {
      const ctx=this.ctx,p=this.pointer,cw=this.cw,ch=this.ch;
      ctx.clearRect(0,0,this.width,this.height);
      const active=p.inside||this.focused;
      this.reveal+=(Number(active)-this.reveal)*(1-Math.exp(-dt*(active?13:9)));
      if(active&&this.regions.length===0)this.acquire();
      if(!paused){
        this.burst*=Math.exp(-dt*4.6);
        if(active){this.scanClock+=dt;this.scanAge+=dt;if(this.scanClock>.92){this.scanClock=0;this.acquire();}}
      }else this.burst=0;
      const weights=[.055,.13,.25,.43].map(w=>cw*w),buckets=[[],[],[],[]];
      const radius=this.width*.22,step=dt*60;
      const spring=1-Math.exp(-.036*step),damping=Math.exp(-.18*step);
      for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){
        const i=y*COLS+x,base=this.table[i];
        const bx=(x+.5)*cw,by=(y+.5)*ch;
        let targetX=0,targetY=0;
        if(p.inside&&!paused){
          let rx=bx-p.x,ry=by-p.y,d=Math.hypot(rx,ry);
          if(d<radius){
            if(d<.01){rx=.1;ry=-.1;d=Math.hypot(rx,ry);}
            const push=Math.pow(1-d/radius,2)*radius*.23;
            targetX=rx/d*push;targetY=ry/d*push*.55;
          }
        }
        this.vx[i]=(this.vx[i]+(targetX-this.dx[i])*spring)*damping;
        this.vy[i]=(this.vy[i]+(targetY-this.dy[i])*spring)*damping;
        this.dx[i]+=this.vx[i]*step;this.dy[i]+=this.vy[i]*step;
        // Subtracting time advects the noise down the card. Short, dense pulses
        // thicken individual nodes; the quieter field retains a thin spine.
        const flow=noise(x*.16+this.index*17,y*.125-time*.5);
        const detail=noise(x*1.37+29,y*.48-time*.8);
        const node=clamp((detail-.5)*2.8,0,1);
        let brightness=clamp(base*(.12+flow*.18+node*.69),0,1);
        if(this.burst>.015){
          const rain=noise(x*.73+this.index*6,y*.21-time*2.7);
          brightness=clamp(brightness*(1-this.burst*.23)+Math.max(0,rain-.62)*this.burst*1.6,0,1);
        }
        const level=brightness<.20?0:brightness<.39?1:brightness<.62?2:3;
        if(base<.012&&brightness<.09)continue;
        const px=bx+this.dx[i],py=by+this.dy[i];
        // Tiny overlaps keep stems intact, while heavier nodes are short and
        // rounded. Width is always one of exactly four discrete values.
        const half=ch*(level===0?.53:level===1?.49:.44);
        buckets[level].push(px,py-half,py+half);
      }
      ctx.strokeStyle=this.brand.color;
      for(let level=0;level<4;level++){
        ctx.globalAlpha=this.brand.opacity*(level===0?.62:level===1?.8:1);
        ctx.lineWidth=weights[level];ctx.lineCap=level<2?'butt':'round';ctx.beginPath();
        const points=buckets[level];
        for(let i=0;i<points.length;i+=3){ctx.moveTo(points[i],points[i+1]);ctx.lineTo(points[i],points[i+2]);}
        ctx.stroke();
      }
      ctx.globalAlpha=1;this.drawRain(time);
      if(this.reveal>.008)this.drawDetections();
    }
    drawRain(time) {
      const ctx=this.ctx;ctx.strokeStyle=this.brand.color;ctx.lineWidth=this.cw*.055;ctx.lineCap='butt';
      for(let i=0;i<18;i++){
        const x=(Math.floor(hash(i,this.index+31)*COLS)+.5)*this.cw;
        const y=((hash(i+21,this.index)*1.2+time*(.025+hash(i,9)*.028))%1.2-.1)*this.height;
        const length=(.012+hash(i,52)*.04)*this.height;
        ctx.globalAlpha=(.07+hash(i+9,this.index)*.12)*(.65+this.burst*.7);
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+length);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    drawDetections() {
      const ctx=this.ctx,blue='#168fff';
      const acquire=paused?1:1-Math.pow(1-clamp(this.scanAge/.22,0,1),3);
      const boxes=this.regions.map(b=>{
        const targetW=b.w*this.cw,targetH=b.h*this.ch;
        const w=targetW*(.12+.88*acquire),h=targetH*(.12+.88*acquire);
        return {x:(b.x+b.w/2)*this.cw-w/2,y:(b.y+b.h/2)*this.ch-h/2,w,h,b};
      });
      ctx.save();ctx.globalAlpha=this.reveal*.8;ctx.strokeStyle=blue;ctx.lineWidth=.65;ctx.lineCap='butt';
      ctx.beginPath();
      for(let i=1;i<boxes.length;i++){
        const a=boxes[i-1],b=boxes[i];
        const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2;
        const dx=bx-ax,dy=by-ay;
        const ta=Math.min(a.w/2/(Math.abs(dx)||1e-9),a.h/2/(Math.abs(dy)||1e-9));
        const tb=Math.min(b.w/2/(Math.abs(dx)||1e-9),b.h/2/(Math.abs(dy)||1e-9));
        ctx.moveTo(ax+dx*ta,ay+dy*ta);ctx.lineTo(bx-dx*tb,by-dy*tb);
      }
      ctx.stroke();ctx.globalAlpha=this.reveal;
      const font=Math.max(7,this.width*.015),labelH=font+3;
      ctx.font=`${font}px Consolas, monospace`;
      for(const box of boxes){
        const {x,y,w,h,b}=box;
        // Emphasize source strands inside the tracker, like the reference.
        ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
        ctx.globalAlpha=this.reveal*.27;ctx.strokeStyle=this.brand.highlight;ctx.lineWidth=this.cw*.25;ctx.lineCap='round';ctx.beginPath();
        for(let gx=b.x;gx<b.x+b.w;gx++)for(let gy=b.y;gy<b.y+b.h;gy++){
          if(this.table[gy*COLS+gx]<.5)continue;
          const px=(gx+.5)*this.cw,py=(gy+.5)*this.ch;
          ctx.moveTo(px,py-this.ch*.4);ctx.lineTo(px,py+this.ch*.4);
        }
        ctx.stroke();ctx.restore();
        ctx.strokeStyle=blue;ctx.lineWidth=.7;ctx.strokeRect(x,y,w,h);
        ctx.fillStyle=blue;
        for(const [cx,cy]of[[x,y],[x+w,y],[x,y+h],[x+w,y+h]])ctx.fillRect(cx-1,cy-1,2,2);
        const label=`${Math.round(b.x*this.cw)}, ${Math.round(b.y*this.ch)}`;
        const labelW=ctx.measureText(label).width+5;
        ctx.fillRect(x,y,labelW,labelH);
        ctx.fillStyle='#fff';ctx.textBaseline='top';ctx.fillText(label,x+2,y+1);
      }
      ctx.restore();
    }
  }

  const studies=Array.from(document.querySelectorAll('.card'),(card,i)=>new Study(card,i));
  const observer=new ResizeObserver(entries=>{
    for(const entry of entries){const study=studies.find(s=>s.card===entry.target);if(study)study.resize();}
  });
  studies.forEach(s=>observer.observe(s.card));
  document.addEventListener('visibilitychange',()=>{pageVisible=!document.hidden;previous=0;});
  window.addEventListener('blur',()=>studies.forEach(s=>s.pointer.inside=false));
  function frame(now) {
    const dt=previous?Math.min((now-previous)/1000,1/30):1/60;previous=now;
    if(pageVisible){
      if(!paused)motionTime+=dt;
      for(const study of studies){
        if(study.dpr!==(window.devicePixelRatio||1))study.resize();
        study.draw(motionTime,dt);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const dialog=document.querySelector('dialog');
  document.querySelectorAll('[data-source]').forEach(button=>button.addEventListener('click',()=>{
    const brand=BRANDS[button.dataset.source];
    document.querySelector('#source-title').textContent=brand.name+' / The source.';
    document.querySelector('#source-code').textContent=`<svg viewBox="0 0 24 24">\n  <path fill="white" d="${brand.path}" />\n</svg>`;
    dialog.showModal();studies.forEach(s=>s.pointer.inside=false);
  }));
  dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{
    const r=dialog.getBoundingClientRect();
    if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();
  });
