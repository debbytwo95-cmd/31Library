    kick(px,py,strength=1) {
      if(paused)return;
      const radius=Math.min(130,this.width*.26),speed=radius*7.2*strength;
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        const i=y*COLS+x;if(this.table[i]<.012)continue;
        let rx=(x+.5)*this.cw+this.dx[i]-px,ry=(y+.5)*this.ch+this.dy[i]-py;
        let distance=Math.hypot(rx,ry);
        if(distance>=radius)continue;
        if(distance<.1){const a=hash(x,y+this.index)*Math.PI*2;rx=Math.cos(a);ry=Math.sin(a);distance=1;}
        const force=Math.pow(1-distance/radius,2)*speed;
        this.vx[i]=clamp(this.vx[i]+rx/distance*force,-radius*12,radius*12);
        this.vy[i]=clamp(this.vy[i]+ry/distance*force*.48,-radius*6,radius*6);
      }
    }
    updateSpring(dt) {
      if(paused)return;
      // A brief impulse, followed by an underdamped return to the original
      // grid. No sustained mouse force: the lines settle even while hovering.
      const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
      const stiffness=289,friction=11.2,limit=Math.min(130,this.width*.26);
      for(let step=0;step<steps;step++)for(let i=0;i<this.dx.length;i++){
        let x=this.dx[i],y=this.dy[i],vx=this.vx[i],vy=this.vy[i];
        if(x===0&&y===0&&vx===0&&vy===0)continue;
        vx+=(-stiffness*x-friction*vx)*h;vy+=(-stiffness*y-friction*vy)*h;
        x+=vx*h;y+=vy*h;
        if(Math.abs(x)>limit*.85){x=Math.sign(x)*limit*.85;vx*=.3;}
        if(Math.abs(y)>limit*.5){y=Math.sign(y)*limit*.5;vy*=.3;}
        if(Math.abs(x)<.015&&Math.abs(y)<.015&&Math.abs(vx)<.08&&Math.abs(vy)<.08)x=y=vx=vy=0;
        this.dx[i]=x;this.dy[i]=y;this.vx[i]=vx;this.vy[i]=vy;
      }
    }
