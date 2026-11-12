  let clock=0;
  const tick=(count=1)=>{advance(clock,count);clock+=count;};
  const move=(x,y)=>studies.forEach((s,i)=>s.move({clientX:128+i*562+x,clientY:180+y}));
  const selection=s=>JSON.stringify(s.regions.map(({x,y,w,h,kind})=>({x,y,w,h,kind})));
  const heatAt=(s,x,y)=>s.heat[Math.floor(y/s.ch)*56+Math.floor(x/s.cw)];
  const onGrid=()=>studies.forEach(s=>{
    for(const points of s.frameBuckets)for(let i=0;i<points.length;i+=3){
      const gx=points[i]/s.cw-.5;assert.ok(Math.abs(gx-Math.round(gx))<1e-8,'all strands stay aligned');
    }
    assert.ok(s.regions.length>=1&&s.regions.length<=3);
    for(const b of s.regions){
      assert.ok([b.x,b.y,b.w,b.h].every(Number.isInteger));
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=56&&b.y+b.h<=112);
    }
  });
  tick(2);assert.ok(studies.every(s=>s.regions.length===0));
  const anchors=studies.map(s=>JSON.stringify(s.anchor));
  move(115,650);tick(3);onGrid();
  for(const s of studies){
    assert.equal(s.entryCount,1);assert.ok(heatAt(s,115,650)>.95);
    const blank=s.table.findIndex((value,i)=>value<.01&&s.heat[i]>.7);
    assert.ok(blank>=0,'cursor paints temporary activity beyond original logo');
    const x=(blank%56+.5)*s.cw,y=(Math.floor(blank/56)+.5)*s.ch;
    assert.ok(s.frameBuckets.some((points,level)=>level>0&&points.some((px,i)=>i%3===0&&Math.abs(px-x)<1e-6&&Math.abs((points[i+1]+points[i+2])/2-y)<1e-6)),'painted blank cells become visible heavier strands');
  }
  move(415,430);tick(2);
  studies.forEach(s=>{
    assert.ok(heatAt(s,115,650)>.22,'recent cursor trail remains briefly');
    assert.ok(heatAt(s,415,430)>.95);assert.equal(s.entryCount,1);
  });
  tick(70);onGrid();
  studies.forEach((s,i)=>{
    assert.ok(heatAt(s,115,650)<.02,'old cursor trail decays');
    assert.ok(heatAt(s,415,430)>.95,'current pointer maintains active region');
    assert.equal(JSON.stringify(s.anchor),anchors[i],'stable recognition anchor retained');
  });
  const locked=studies.map(selection);tick(65);
  studies.forEach((s,i)=>assert.equal(selection(s),locked[i],'stationary pointer has no timed ROI changes'));
  // Move to the stable anchor: connected/overlapping activity becomes one box.
  studies.forEach((s,i)=>s.move({clientX:128+i*562+(s.anchor.x+s.anchor.w/2)*s.cw,clientY:180+(s.anchor.y+s.anchor.h/2)*s.ch}));
  tick(75);studies.forEach(s=>assert.equal(s.regions.length,1,'anchor and overlapping cursor region merge'));
  move(115,650);tick(75);studies.forEach(s=>assert.equal(s.regions.length,2,'moving away separates cursor component from anchor'));
  capture=true;tick();capture=false;
  for(const s of studies){
    const clipped=s.ctx.draws.filter(d=>d.clip);
    assert.ok(clipped.some(d=>d.width>s.weights[3]*1.5),'locked strokes become thicker');
    assert.equal(s.ctx.clippedClears.length,s.regions.length);
    assert.ok(clipped.every(d=>s.ctx.boxes.some(b=>Math.abs(d.clip.x-b.x-1)<1e-7&&Math.abs(d.clip.y-b.y-1)<1e-7&&Math.abs(d.clip.w-b.w+2)<1e-7&&Math.abs(d.clip.h-b.h+2)<1e-7)));
    assert.equal(s.ctx.stack.length,0);
  }
  studies.forEach(s=>s.leave());tick(80);
  studies.forEach(s=>assert.ok(Math.max(...s.heat)<.01,'trail disappears after leaving'));
  move(240,350);studies.forEach(s=>{assert.equal(s.entryCount,2);assert.equal(s.entryAge,0);});
  tick(10);onGrid();motion.listeners.click();tick();
  const frozen=studies.map(s=>JSON.stringify(s.frameBuckets));tick(4);
  studies.forEach((s,i)=>assert.equal(JSON.stringify(s.frameBuckets),frozen[i]));
  win.devicePixelRatio=2;tick();assert.ok(cards.every(c=>c.art.width===1080&&c.art.height===1440));
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  const report={status:'passed',checks:['local cursor painting including empty background','short-lived cursor trail','stable bright anchor','connected-region merge and split','no timed random target changes','grid-snapped tracker edges','aligned vertical strands without spatial zoom or recoil','thicker clipped locked strands','entry noise on each visit','pause','DPR=2','existing brand colors'],mode:'offline Canvas command verification using real SVG luminance rasterization'};
  await fs.writeFile('work/video-hover-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
