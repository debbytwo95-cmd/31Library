  Context.prototype.arc=function(x,y,r,start,end){
    for(let i=0;i<=24;i++){const a=start+(end-start)*i/24;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i===0?this.moveTo(px,py):this.lineTo(px,py);}
  };
  let clock=0;
  const tick=(count=1)=>{advance(clock,count);clock+=count;};
  const s=studies[0];
  const event=(x,y,extra={})=>({clientX:128+x,clientY:180+y,pointerId:1,pointerType:'mouse',button:0,...extra});
  tick(2);
  s.down(event(240,350,{timeStamp:1000}));tick(3);
  s.up(event(240,350,{timeStamp:1130}));
  assert.equal(s.waves.length,1);assert.equal(s.waves[0].power,.9);assert.equal(s.press,null);
  tick(5);assert.ok(Math.max(...s.heat)>.9);
  s.updateGestures(1.5);assert.equal(s.waves.length,0);
  // Timestamp-based release still distinguishes a hold when rendering is slow.
  s.down(event(240,350,{timeStamp:2000}));
  s.updateGestures(.9);assert.ok(s.status.textContent.includes('CHARGING'));
  capture=true;tick();capture=false;
  s.up(event(240,350,{timeStamp:3400}));
  assert.equal(s.waves.length,2);assert.ok(s.waves.some(w=>w.fall));assert.ok(s.waves.some(w=>w.power>2.4));
  s.updateGestures(1.5);assert.equal(s.waves.length,0);
  // Painting/scroll-like movement should not become an accidental click wave.
  s.down(event(100,400));s.move(event(220,450));tick(2);s.up(event(220,450));
  assert.equal(s.waves.length,0);assert.equal(s.press,null);
  s.down(event(100,400,{target:{closest:()=>({})}}));assert.equal(s.press,null,'source button excluded from gesture recognizer');
  s.move(event(90,300));tick(2);s.updateGestures(.75);tick();
  assert.ok(s.pinned);assert.equal(resetButton.disabled,false);
  const pin=JSON.stringify(s.pinned);
  s.leave();tick(3);assert.equal(JSON.stringify(s.pinned),pin);assert.ok(s.regions.some(b=>b.kind==='pinned'));
  s.move(event(440,650));s.updateGestures(.8);tick();assert.equal(JSON.stringify(s.pinned),pin,'moving away and dwelling preserves existing lock');
  s.down(event(440,650));tick(2);s.up(event(440,650));assert.equal(s.pinned,null,'short click outside pinned frame releases it');assert.equal(s.waves.length,1);
  s.waves=[];s.move(event(240,220));tick();s.updateGestures(.75);tick();assert.ok(s.pinned);
  doc.listeners.keydown({key:'Escape'});assert.equal(s.pinned,null);assert.equal(resetButton.disabled,true);
  s.move(event(90,300));tick();s.updateGestures(.75);tick();assert.ok(s.pinned);
  resetButton.listeners.click();assert.equal(s.pinned,null);assert.equal(resetButton.disabled,true);
  s.move(event(240,220));tick();s.updateGestures(.75);tick();assert.ok(s.pinned);
  doc.listeners.pointerdown({target:{closest:()=>null}});assert.equal(s.pinned,null,'blank page click clears lock');
  s.down(event(240,350));s.cancelGesture();assert.equal(s.press,null);assert.equal(s.waves.length,0);
  cards[0].listeners.keydown({target:cards[0],key:'Enter',preventDefault(){}});assert.equal(s.waves.length,1);
  s.down(event(240,350));tick(2);win.listeners.blur();assert.equal(s.press,null);assert.equal(s.pointer.inside,false);
  capture=true;tick();capture=false;
  for(const study of studies){
    for(const points of study.frameBuckets)for(let i=0;i<points.length;i+=3){const gx=points[i]/study.cw-.5;assert.ok(Math.abs(gx-Math.round(gx))<1e-8);}
    assert.equal(study.ctx.stack.length,0);
  }
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  const report={status:'passed',checks:['short click creates single wave','long hold charges and emits stronger radial/downward effects','event timestamps handle slow frames','dragging does not create click wave','source controls excluded','hover dwell pins a region','pin survives leaving and moving elsewhere','outside click releases pin','Escape and reset button clear locks','cancellation and blur release gesture','keyboard Enter sends wave','grid-aligned strands and balanced clipping','brand colors preserved'],mode:'offline event-state and Canvas verification with real SVG raster sampling'};
  await fs.writeFile('work/playground-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
