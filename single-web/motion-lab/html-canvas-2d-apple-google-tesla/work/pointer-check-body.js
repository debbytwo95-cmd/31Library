  let clock=0;
  const tick=(count=1)=>{advance(clock,count);clock+=count;};
  const moveTo=(x,y)=>studies.forEach((s,i)=>s.move({clientX:128+i*562+x,clientY:180+y}));
  const selection=s=>JSON.stringify(s.regions.map(({x,y,w,h})=>({x,y,w,h})));
  const onGrid=()=>studies.forEach(s=>{
    for(const points of s.frameBuckets)for(let i=0;i<points.length;i+=3){
      const gx=points[i]/s.cw-.5;assert.ok(Math.abs(gx-Math.round(gx))<1e-8,'noise never displaces strands horizontally');
    }
  });
  tick(2);assert.ok(studies.every(s=>s.regions.length===0));
  moveTo(90,180);
  const first=studies.map(selection);
  assert.ok(studies.every(s=>s.entryCount===1&&s.entryAge===0&&s.regions.length===3));
  tick(15);onGrid();
  const advancingAge=studies.map(s=>s.entryAge);
  moveTo(90,180);
  studies.forEach((s,i)=>{assert.equal(s.entryCount,1);assert.equal(s.entryAge,advancingAge[i]);});
  tick(150);
  studies.forEach((s,i)=>assert.equal(selection(s),first[i],'stationary pointer never triggers automatic reacquisition'));
  const oldNear=studies.map(s=>Math.min(...s.regions.map(b=>Math.hypot((b.x+b.w/2)*s.cw-435,(b.y+b.h/2)*s.ch-500))));
  moveTo(435,500);
  studies.forEach((s,i)=>{
    assert.notEqual(selection(s),first[i],'new pointer region changes lock selection');
    const near=Math.min(...s.regions.map(b=>Math.hypot((b.x+b.w/2)*s.cw-435,(b.y+b.h/2)*s.ch-500)));
    assert.ok(near<oldNear[i],'lock follows pointer to nearby bright content');
    assert.equal(s.entryCount,1,'moving within card does not retrigger entry noise');
  });
  const second=studies.map(selection);tick(20);
  capture=true;tick(1);capture=false;
  for(const s of studies){
    const clipped=s.ctx.draws.filter(d=>d.clip);
    assert.ok(clipped.some(d=>d.width>s.weights[3]*1.9),'lock magnification retained');
    assert.equal(s.ctx.clippedClears.length,3);
    assert.ok(clipped.every(d=>s.ctx.boxes.some(b=>Math.abs(d.clip.x-b.x-1)<1e-7&&Math.abs(d.clip.y-b.y-1)<1e-7&&Math.abs(d.clip.w-b.w+2)<1e-7&&Math.abs(d.clip.h-b.h+2)<1e-7)));
  }
  tick(80);studies.forEach((s,i)=>assert.equal(selection(s),second[i]));
  moveTo(90,180);studies.forEach((s,i)=>assert.equal(selection(s),first[i],'same pointer location produces same deterministic regions'));
  studies.forEach(s=>s.pointer.inside=false);moveTo(90,180);
  studies.forEach(s=>{assert.equal(s.entryCount,2);assert.equal(s.entryAge,0);});
  tick(4);onGrid();
  studies.forEach(s=>s.pointer.inside=false);moveTo(435,500);
  studies.forEach(s=>{assert.equal(s.entryCount,3);assert.equal(s.entryAge,0);});
  tick(6);onGrid();
  motion.listeners.click();tick();
  const freeze=studies.map(s=>JSON.stringify(s.frameBuckets));tick(3);
  studies.forEach((s,i)=>assert.equal(JSON.stringify(s.frameBuckets),freeze[i]));
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  const report={status:'passed',checks:['noise retriggers on every entry','no retrigger during internal movement','no timed automatic lock changes','pointer locks nearest bright content','same pointer position yields same regions','fixed strand positions without rebound','live magnification clipped within boxes','pause','brand detection colors'],mode:'offline Canvas command verification with real SVG sampling'};
  await fs.writeFile('work/pointer-lock-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
