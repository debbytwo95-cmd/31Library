  advance(0,1);
  for(const study of studies){assert.equal(study.hasEntered,false);assert.equal(study.gatherActive,false);}
  const visit=()=>studies.forEach((s,i)=>s.move({clientX:128+i*562+320,clientY:530}));
  visit();advance(1,1);
  for(const s of studies){
    assert.equal(s.gatherActive,true);assert.equal(s.hasEntered,true);
    const offGrid=s.frameBuckets.some(points=>points.some((px,i)=>i%3===0&&Math.abs((px/s.cw-.5)-Math.round(px/s.cw-.5))>.001));
    assert.ok(offGrid,'initial gathering starts away from fixed grid');
    assert.equal('vx' in s,false);assert.equal('vy' in s,false);
  }
  let last=studies.map(s=>s.gatherAge);
  for(let frame=3;frame<=62;frame++){
    advance(frame-1,1);
    studies.forEach((s,i)=>{assert.ok(s.gatherAge>=last[i]);last[i]=s.gatherAge;});
  }
  const assertOnGrid=()=>{
    for(const s of studies){
      assert.equal(s.gatherActive,false);
      for(const points of s.frameBuckets)for(let i=0;i<points.length;i+=3){
        const x=points[i]/s.cw-.5;assert.ok(Math.abs(x-Math.round(x))<1e-8,'strand returns exactly to original column, no overshoot');
      }
    }
  };
  assertOnGrid();
  advance(62,19);capture=true;advance(81,1);capture=false;
  for(const s of studies){
    assert.equal(s.regions.length,3);
    const draws=s.ctx.draws.filter(d=>d.clip);
    const boxed=s.ctx.boxes;
    assert.ok(draws.length>0,'magnified strokes are drawn under a clip');
    assert.ok(draws.some(d=>d.width>s.weights[3]*1.9),'locked strands visibly increase in width');
    for(const draw of draws){
      assert.ok(boxed.some(b=>Math.abs(draw.clip.x-(b.x+1))<1e-8&&Math.abs(draw.clip.y-(b.y+1))<1e-8&&Math.abs(draw.clip.w-(b.w-2))<1e-8&&Math.abs(draw.clip.h-(b.h-2))<1e-8),'all magnified strokes clipped one pixel inside frame');
    }
    assert.equal(s.ctx.clippedClears.length,3,'original strokes replaced inside each lock, preventing double-image artifacts');
    assert.ok(s.ctx.stack.length===0,'canvas clip state restored');
  }
  const settled=studies.map(s=>JSON.stringify(s.frameBuckets));
  studies.forEach((s,i)=>s.move({clientX:128+i*562+60,clientY:260}));
  advance(82,1);assertOnGrid();
  studies.forEach(s=>s.pointer.inside=false);visit();
  assert.ok(studies.every(s=>!s.gatherActive),'re-entry does not repeat first-entry gathering');
  advance(83,10);assertOnGrid();
  studies.forEach((s,i)=>assert.notEqual(JSON.stringify(s.frameBuckets),settled[i],'flow continues after gathering'));
  motion.listeners.click();advance(93,1);
  const paused=studies.map(s=>JSON.stringify(s.frameBuckets));
  advance(94,4);studies.forEach((s,i)=>assert.equal(JSON.stringify(s.frameBuckets),paused[i]));
  buttons[0].listeners.click();assert.equal(dialog.open,true);close.listeners.click();assert.equal(dialog.open,false);
  win.devicePixelRatio=2;advance(98,1);
  assert.ok(cards.every(c=>c.art.width===1080&&c.art.height===1440));
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  const report={checks:['syntax','one-time first-entry gathering','monotonic convergence','exact return to fixed columns','no spring or velocity state','no pointer repulsion','no gathering replay on re-entry','live flow after convergence','larger strokes inside lock','inset clipping for every magnified stroke','original interior cleared','pause','source dialog','DPR=2','brand detection colors'],status:'passed',mode:'offline Canvas command verification using real SVG luminance rasters'};
  await fs.writeFile('work/gather-checks.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
