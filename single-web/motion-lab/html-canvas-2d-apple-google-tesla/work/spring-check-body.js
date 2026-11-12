  let clock=0;const tick=(count=1)=>{advance(clock,count);clock+=count;};
  tick(2);
  const targets=studies.map((s,index)=>{
    let cell=0,best=Infinity;
    for(let i=0;i<s.table.length;i++)if(s.table[i]>.9){
      const d=Math.hypot(i%56-28,(Math.floor(i/56)-50)*.65);
      if(d<best){best=d;cell=i;}
    }
    const x=(cell%56+.65)*s.cw,y=(Math.floor(cell/56)+.55)*s.ch;
    return{x,y,clientX:128+index*562+x,clientY:180+y};
  });
  const initial=[];
  studies.forEach((s,i)=>{
    s.move(targets[i]);
    assert.ok(Math.max(...s.vx.map(Math.abs))>100,'entry delivers a localized outward impulse');
    let id=0;for(let k=1;k<s.vx.length;k++)if(Math.hypot(s.vx[k],s.vy[k])>Math.hypot(s.vx[id],s.vy[id]))id=k;
    initial.push({id,vx:s.vx[id],vy:s.vy[id],overshoot:false});
    assert.equal('press' in s,false);assert.equal('pinned' in s,false);assert.equal('waves' in s,false);
  });
  capture=true;tick(6);capture=false;
  studies.forEach(s=>assert.ok(Math.max(...s.dx.map(Math.abs))>5,'nearby strands visibly scatter'));
  for(let frame=0;frame<250;frame++)studies.forEach((s,i)=>{
    s.updateSpring(1/120);const p=initial[i];
    if(s.dx[p.id]*p.vx+s.dy[p.id]*p.vy<-.1)p.overshoot=true;
  });
  studies.forEach((s,i)=>{
    assert.equal(s.pointer.inside,true);
    assert.ok(initial[i].overshoot,'spring return crosses original position before settling');
    assert.ok(Math.max(...s.dx.map(Math.abs))<.05&&Math.max(...s.dy.map(Math.abs))<.05,'returns to origin even while pointer stays inside');
  });
  studies.forEach((s,i)=>s.move({...targets[i],clientX:targets[i].clientX+30}));
  assert.ok(studies.every(s=>Math.max(...s.vx.map(Math.abs))>20),'moving to new nearby strands reactivates localized scatter');
  studies.forEach(s=>s.leave());
  for(let frame=0;frame<260;frame++)studies.forEach(s=>s.updateSpring(1/120));
  assert.ok(studies.every(s=>Math.max(...s.dx.map(Math.abs))<.05),'leaving continues a smooth spring settlement');
  studies.forEach((s,i)=>s.move(targets[i]));assert.ok(studies.every(s=>Math.max(...s.vx.map(Math.abs))>100),'each re-entry triggers scatter');
  studies.forEach((s,i)=>{
    for(let j=0;j<20;j++)s.move({...targets[i],clientX:targets[i].clientX+Math.sin(j)*70,clientY:targets[i].clientY+Math.cos(j)*50});
  });
  capture=true;tick(6);capture=false;
  studies.forEach(s=>{
    const limit=Math.min(130,s.width*.26);
    assert.ok([...s.dx,...s.dy,...s.vx,...s.vy].every(Number.isFinite));
    assert.ok(Math.max(...s.dx.map(Math.abs))<=limit*.85+.001);
    assert.equal(s.ctx.stack.length,0);
  });
  motion.listeners.click();const frozen=studies.map(s=>JSON.stringify([Array.from(s.dx),Array.from(s.dy)]));tick(2);
  studies.forEach((s,i)=>{s.kick(100,200,1);s.updateSpring(.1);assert.equal(JSON.stringify([Array.from(s.dx),Array.from(s.dy)]),frozen[i],'pause suppresses spring impulses and movement');});
  assert.deepEqual(Object.values(brands).map(b=>b.detection),['#168fff','#ffdf00','#ffffff']);
  assert.equal(html.includes('Reset locks'),false);assert.equal(html.includes('CHARGING'),false);
  const report={status:'passed',checks:['entry scatter impulse','visible localized displacement','elastic overshoot','automatic return while pointer is stationary','spring settling after leave','repeat entry and pointer movement','bounded finite motion after rapid movement','pause respects reduced-motion behavior','balanced canvas clipping','brand detection colors retained','no discarded playground gesture controls'],mode:'offline spring physics and Canvas command verification with real SVG raster sampling'};
  await fs.writeFile('work/spring-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
