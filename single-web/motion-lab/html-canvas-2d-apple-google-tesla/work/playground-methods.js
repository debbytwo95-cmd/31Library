    down(e) {
      if(e.target?.closest?.('button')||(e.button!==undefined&&e.button!==0))return;
      this.move(e);
      this.press={id:e.pointerId,x:this.pointer.x,y:this.pointer.y,started:e.timeStamp,elapsed:0,dragged:false};
      this.dwell=0;this.dwellSuppressed=true;
      this.card.setPointerCapture?.(e.pointerId);
    }
    up(e) {
      const press=this.press;
      if(!press||(press.id!==undefined&&press.id!==e.pointerId))return;
      if(Number.isFinite(e.timeStamp)&&Number.isFinite(press.started))press.elapsed=Math.max(press.elapsed,(e.timeStamp-press.started)/1000);
      this.press=null;
      if(this.card.hasPointerCapture?.(e.pointerId))this.card.releasePointerCapture(e.pointerId);
      if(!press.dragged){
        const charge=clamp((press.elapsed-.28)/1.0,0,1);
        if(press.elapsed<.28){
          const pin=this.pinned;
          if(pin&&!this.containsPoint(pin,this.pointer.x,this.pointer.y))this.clearPin();
          this.emitWave(this.pointer.x,this.pointer.y,.9,false);
        }else this.emitWave(press.x,press.y,1.15+charge*1.35,true);
      }
      this.dwell=0;this.dwellSuppressed=true;
      if(e.pointerType==='touch')this.leave();
    }
    cancelGesture() {
      this.press=null;this.dwell=0;this.dwellSuppressed=true;
    }
    containsPoint(box,px,py) {
      return px>=box.x*this.cw&&px<=(box.x+box.w)*this.cw&&py>=box.y*this.ch&&py<=(box.y+box.h)*this.ch;
    }
    emitWave(px,py,power,fall) {
      if(paused){this.stamp(px,py);this.updateLock();return;}
      this.waves.push({u:px/this.width,v:py/this.height,age:0,duration:1.15,power,fall:false});
      if(fall)this.waves.push({u:px/this.width,v:py/this.height,age:0,duration:1.35,power:power*.8,fall:true});
      this.waves=this.waves.slice(-4);
      this.scanAge=.2;
    }
    pinRegion() {
      const px=this.pointer.x,py=this.pointer.y;
      const target=this.regions.filter(b=>this.containsPoint(b,px,py)).sort((a,b)=>a.w*a.h-b.w*b.h)[0];
      if(target&&target.w<=22&&target.h<=30)this.pinned={x:target.x,y:target.y,w:target.w,h:target.h,kind:'pinned'};
      else this.pinned={x:clamp(Math.floor(px/this.cw)-6,0,COLS-12),y:clamp(Math.floor(py/this.ch)-8,0,ROWS-16),w:12,h:16,kind:'pinned'};
      this.dwell=0;this.dwellSuppressed=true;syncReset();
    }
    clearPin() {
      this.pinned=null;this.dwell=0;this.dwellSuppressed=true;syncReset();
    }
    updateGestures(dt) {
      if(this.press){
        this.press.elapsed+=dt;
        if(!this.press.dragged&&this.press.elapsed>.28){
          const p=this.press,charge=clamp((p.elapsed-.28)/1.0,0,1);
          this.stamp(p.x,p.y);
          const rx=this.width*(.07+charge*.10),ry=this.height*(.06+charge*.08);
          for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
            const dx=((x+.5)*this.cw-p.x)/rx,dy=((y+.5)*this.ch-p.y)/ry;
            const n=Math.max(0,1-dx*dx-dy*dy);
            if(n>0)this.heat[y*COLS+x]=Math.max(this.heat[y*COLS+x],n*n*(.65+charge*.35));
          }
        }
      }else if(this.pointer.inside&&!this.pinned&&!this.dwellSuppressed&&!this.overControl&&this.pointerType!=='touch'){
        this.dwell=Math.min(.72,this.dwell+dt);
        if(this.dwell>=.72)this.pinRegion();
      }
      if(this.pinned){
        const p=this.pinned;this.stamp((p.x+p.w/2)*this.cw,(p.y+p.h/2)*this.ch);
      }
      if(!paused){
        for(const wave of this.waves)wave.age+=dt;
        this.waves=this.waves.filter(w=>w.age<w.duration);
      }
      // A wave contributes only to the existing luminance/heat field. No point
      // is displaced, so click and hold share the same aligned-strand renderer.
      for(const wave of this.waves){
        const t=wave.age/wave.duration,cx=wave.u*this.width;
        const cy=wave.v*this.height+(wave.fall?t*this.height*.52:0);
        const radius=t*this.width*1.25,band=this.width*(.045+.012*wave.power);
        const gain=Math.pow(1-t,1.5)*Math.min(1.8,wave.power);
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
          const dx=(x+.5)*this.cw-cx,dy=(y+.5)*this.ch-cy;
          const n=wave.fall?Math.max(0,1-dx*dx/(this.width*.14)**2-dy*dy/(this.height*.105)**2):Math.max(0,1-Math.abs(Math.hypot(dx,dy)-radius)/band);
          if(n>0){const i=y*COLS+x;this.heat[i]=Math.max(this.heat[i],clamp(n*n*gain,0,1));}
        }
      }
      const charge=this.press&&!this.press.dragged?clamp((this.press.elapsed-.28)/1.0,0,1):0;
      const label=charge>0?'CHARGING '+Math.round(charge*20)*5+'%':this.pinned?'LOCKED · ESC':this.waves.length?'SIGNAL RELEASED':this.dwell>.2?'LOCKING '+Math.round(this.dwell/.72*10)*10+'%':'EXPLORE';
      if(this.status&&label!==this.status.textContent)this.status.textContent=label;
    }
    drawGestureProgress() {
      if(media.matches)return;
      const charging=this.press&&!this.press.dragged&&this.press.elapsed>.28;
      const waiting=!this.press&&!this.pinned&&this.dwell>.18&&!this.dwellSuppressed;
      if(!charging&&!waiting)return;
      const ctx=this.ctx,progress=charging?clamp((this.press.elapsed-.28)/1.0,0,1):this.dwell/.72;
      const p=charging?this.press:this.pointer,r=charging?15:10;
      ctx.save();ctx.strokeStyle=this.brand.detection;ctx.lineWidth=1.4;
      ctx.globalAlpha=.2;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(p.x,p.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();ctx.restore();
    }
