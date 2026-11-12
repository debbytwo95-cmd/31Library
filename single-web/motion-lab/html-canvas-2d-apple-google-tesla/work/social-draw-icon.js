    drawIcon() {
      const w=22,h=24,ctx=this.icon.getContext('2d');
      this.icon.width=Math.round(w*this.dpr);this.icon.height=Math.round(h*this.dpr);
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,w,h);
      let minX=COLS,maxX=0,minY=ROWS,maxY=0;
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(this.table[y*COLS+x]>.15){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
      const scale=Math.min((w-1)/((maxX-minX+1)*SX),(h-1)/((maxY-minY+1)*SY));
      const ox=(w-(maxX-minX+1)*SX*scale)/2,oy=(h-(maxY-minY+1)*SY*scale)/2;
      const points=[];
      for(let x=minX;x<=maxX;x+=2)for(let y=minY;y<=maxY;y++)if(this.table[y*COLS+x]>.3){
        const px=ox+(x-minX+.5)*SX*scale,py=oy+(y-minY)*SY*scale;
        points.push(px,py,py+SY*scale+.12);
      }
      const layers=this.brand.layers||[{color:this.brand.icon,dx:0,dy:0,opacity:1,width:1}];
      for(const layer of layers){
        ctx.strokeStyle=layer.color;ctx.globalAlpha=layer.opacity;
        ctx.lineWidth=Math.max(.6,this.width*.0014)*layer.width;ctx.lineCap='butt';ctx.beginPath();
        const dx=Math.sign(layer.dx)*.45,dy=Math.sign(layer.dy)*.45;
        for(let i=0;i<points.length;i+=3){ctx.moveTo(points[i]+dx,points[i+1]+dy);ctx.lineTo(points[i]+dx,points[i+2]+dy);}
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
