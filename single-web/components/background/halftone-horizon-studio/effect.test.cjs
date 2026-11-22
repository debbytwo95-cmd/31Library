const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
class Element extends EventTarget {
  constructor(){super();this.style={};this.dataset={};this.attrs={};this.clientWidth=800;this.clientHeight=400;this.capture=new Set();}
  getAttribute(k){return this.attrs[k]??null;} setAttribute(k,v){this.attrs[k]=v;} removeAttribute(k){delete this.attrs[k];}
  getBoundingClientRect(){return {left:0,top:0};}
  querySelector(){return this.canvas;}
  setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
  emit(type, props={}){const e=new Event(type,{cancelable:true});Object.assign(e,props);this.dispatchEvent(e);return e;}
}
function setup(reduced=false,rafOffset=0){
  let now=0,id=0,draws=0,deletes=0;const frames=new Map(),observers=[],uniforms={};
  const media=new Element();media.matches=reduced;
  const document=new Element(),window=new Element();document.hidden=false;
  const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,drawArrays:()=>draws++,deleteBuffer:()=>deletes++,deleteProgram:()=>deletes++,uniform1f:(loc,v)=>{assert.ok(Number.isFinite(v));uniforms[loc]=v;},uniform2f:(loc,...v)=>{assert.ok(v.every(Number.isFinite));uniforms[loc]=v;},uniform3f:(loc,...v)=>{assert.ok(v.every(Number.isFinite));uniforms[loc]=v;},uniform3fv:(loc,data)=>{assert.ok([...data].every(Number.isFinite));uniforms[loc]=Array.from(data);},getUniformLocation:(_,name)=>name}, {get:(target,k)=>target[k]||(()=>({}))});
  const context=vm.createContext({window,document,console,AbortController,Float32Array,devicePixelRatio:1,matchMedia:()=>media,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:i=>frames.delete(i),ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}});
  vm.runInContext(fs.readFileSync(__dirname+'/effect.js','utf8'),context);
  function root(){const r=new Element();r.canvas=new Element();r.canvas.getContext=()=>gl;return r;}
  function tick(count=1){for(let i=0;i<count;i++){now+=16;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now+rafOffset));}}
  return {root,mount:context.mountHalftoneHorizon,tick,frames,window,document,media,observers,uniforms,get draws(){return draws;},get deletes(){return deletes;}};
}
test('intro disabled stays still; real input settles; instances clean up independently',()=>{
  const e=setup(),a=e.root(),b=e.root(),first=e.mount(a,{intro:0}),second=e.mount(b,{intro:0});
  assert.equal(e.frames.size,0);assert.equal(a.dataset.renderer,'WebGL');
  a.emit('pointermove',{pointerType:'mouse',clientX:400,clientY:180});assert.equal(e.frames.size,1);
  e.tick(200);assert.equal(e.frames.size,0,'stationary pointer stops rendering');
  a.emit('pointerleave');e.tick(200);assert.equal(e.frames.size,0,'release returns to idle');
  a.emit('pointerdown',{pointerType:'mouse',button:0,clientX:400,clientY:180});e.tick(300);assert.equal(e.frames.size,0,'ripple ends');
  first.destroy();const draws=e.draws;a.emit('pointermove',{pointerType:'mouse',clientX:20,clientY:20});assert.equal(e.draws,draws);assert.equal(e.frames.size,0);
  b.emit('keydown',{key:'Enter',repeat:false});assert.equal(e.frames.size,1);second.destroy();assert.equal(e.frames.size,0);assert.equal(e.deletes,4);assert.ok(e.observers.every(o=>o.disconnected));
});
test('touch cancellation, blur and reset stop feedback without changing parameters',()=>{
  const e=setup(),r=e.root(),effect=e.mount(r,{intro:0});effect.update({spacing:12,direction:'left',multicolor:true});
  r.emit('pointermove',{pointerType:'touch',pointerId:1,clientX:20,clientY:20});assert.equal(e.frames.size,0);
  r.emit('pointerdown',{pointerType:'touch',pointerId:1,button:0,clientX:20,clientY:20});assert.equal(r.capture.size,1);
  r.emit('pointercancel');assert.equal(r.capture.size,0);assert.equal(e.frames.size,0);
  r.emit('keydown',{key:' '});assert.equal(e.frames.size,1);e.window.emit('blur');assert.equal(e.frames.size,0);
  effect.reset();assert.equal(effect.getConfig().spacing,12);assert.equal(effect.getConfig().direction,'left');effect.destroy();
});
test('reduced motion keeps immediate lens, disables animated trails and keyboard ripples',()=>{
  const e=setup(true),r=e.root(),effect=e.mount(r,{intro:0});
  r.emit('keydown',{key:'Enter'});assert.equal(e.frames.size,0);
  r.emit('pointermove',{pointerType:'mouse',clientX:20,clientY:20});e.tick();assert.equal(e.frames.size,0);
  r.emit('pointerleave');e.tick();assert.equal(e.frames.size,0);effect.destroy();
});
test('disabling interaction clears pending motion; zero trail length never uploads NaN',()=>{
  const e=setup(),r=e.root(),effect=e.mount(r,{intro:0});
  r.emit('pointermove',{pointerType:'mouse',clientX:20,clientY:20});effect.update({trailLength:0});e.tick(100);
  effect.update({interactive:false});assert.equal(e.frames.size,0);r.emit('keydown',{key:'Enter'});assert.equal(e.frames.size,0);effect.destroy();
});
test('missing WebGL degrades to static CSS and remains disposable',()=>{
  const e=setup(),r=e.root();r.canvas.getContext=()=>null;const effect=e.mount(r,{intro:0});
  assert.equal(r.dataset.renderer,'CSS fallback');assert.equal(r.canvas.hidden,true);assert.match(r.style.background,/#f0602a/);assert.equal(e.frames.size,0);effect.destroy();
});
test('downloaded standalone contains valid scripts and the current default configuration',()=>{
  const html=fs.readFileSync(__dirname+'/halftone-horizon.html','utf8');
  for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  const match=html.match(/root\.libraryComponent = mount\(root, (\{[^\n]+?\})\);/);
  assert.ok(match);const c=JSON.parse(match[1]);assert.equal(c.spacing,7);assert.equal(c.color,'#f0602a');assert.equal(c.direction,'top');assert.equal(c.intro,2.4);assert.equal(c.introFrom,0);
  assert.doesNotMatch(html,/src="https?:|library-header|horizon-controls/);
  const prefix='const mount = ',start=html.indexOf(prefix),end=html.indexOf(';\ndocument.querySelectorAll',start);
  assert.equal(html.slice(start+prefix.length,end).trim(),fs.readFileSync(__dirname+'/effect.js','utf8').trim(),'standalone uses the current renderer');
});
test('entry waits for first visibility, unfolds once, settles and can replay',()=>{
  const e=setup(),r=e.root(),effect=e.mount(r),intersection=e.observers[1];
  assert.equal(effect.getConfig().intro,2.4);assert.equal(r.dataset.intro,'pending');assert.equal(e.frames.size,0);
  intersection.fn([{isIntersecting:false}]);assert.equal(r.dataset.intro,'pending');
  intersection.fn([{isIntersecting:true}]);assert.equal(r.dataset.intro,'running');assert.equal(e.uniforms.introReach,0);assert.equal(e.frames.size,1);
  e.tick(50);assert.ok(e.uniforms.introReach>0&&e.uniforms.introReach<1);
  e.tick(200);assert.equal(r.dataset.intro,'complete');assert.equal(e.uniforms.introReach,1);assert.equal(e.frames.size,0);
  intersection.fn([{isIntersecting:false}]);intersection.fn([{isIntersecting:true}]);assert.equal(e.frames.size,0,'re-entering does not replay');
  effect.update({introFrom:2});effect.replayIntro();assert.equal(e.uniforms.introReach,2);e.tick(20);assert.ok(e.uniforms.introReach>1&&e.uniforms.introReach<2);
  effect.reset();assert.equal(e.uniforms.introReach,1);assert.equal(e.frames.size,0);effect.destroy();
});
test('entry honors reduced motion, duration zero, cancellation and destruction',()=>{
  const e=setup(),r=e.root(),effect=e.mount(r);effect.replayIntro();e.tick(10);effect.update({intro:0});assert.equal(e.frames.size,0);assert.equal(e.uniforms.introReach,1);
  effect.update({intro:2.4});effect.replayIntro();e.media.matches=true;e.media.emit('change');assert.equal(e.frames.size,0);assert.equal(e.uniforms.introReach,1);
  effect.replayIntro();assert.equal(e.frames.size,0);effect.destroy();
  const reduced=setup(true),rr=reduced.root(),reducedEffect=reduced.mount(rr);assert.equal(rr.dataset.intro,'complete');reduced.observers[1].fn([{isIntersecting:true}]);assert.equal(reduced.frames.size,0);reducedEffect.destroy();
  const other=setup(),or=other.root(),otherEffect=other.mount(or);otherEffect.replayIntro();assert.equal(other.frames.size,1);otherEffect.destroy();assert.equal(other.frames.size,0);
});
test('lens tracks the pointer while the independent pale light follows and settles',()=>{
  const e=setup(),r=e.root(),effect=e.mount(r,{intro:0,follow:1});
  r.emit('pointermove',{pointerType:'mouse',clientX:200,clientY:180});e.tick(100);
  r.emit('pointermove',{pointerType:'mouse',clientX:600,clientY:180});e.tick();
  assert.deepEqual(e.uniforms.pointer.slice(0,2),[600,180],'lens stays at actual pointer');
  assert.ok(e.uniforms.lightPointer[0]>200&&e.uniforms.lightPointer[0]<600,'light follows from its previous position');
  e.tick(300);assert.ok(Math.abs(e.uniforms.lightPointer[0]-600)<.05);assert.equal(e.frames.size,0);
  effect.update({follow:0});r.emit('pointermove',{pointerType:'mouse',clientX:300,clientY:180});e.tick();assert.deepEqual(e.uniforms.lightPointer,[300,180],'zero follow locks light to the pointer');
  effect.reset();assert.deepEqual(e.uniforms.pointer,[-1000,-1000,0]);assert.deepEqual(e.uniforms.lightPointer,[-1000,-1000]);assert.equal(e.frames.size,0);effect.destroy();
});
test('rapid input retains the requested wake lifetime; shortening duration clears it promptly',()=>{
  const e=setup(),r=e.root(),effect=e.mount(r,{intro:0,spacing:3,trailLength:1.2});
  r.emit('pointermove',{pointerType:'mouse',clientX:100,clientY:180});
  for(let i=1;i<=64;i++){e.tick();r.emit('pointermove',{pointerType:'mouse',clientX:100+i*5,clientY:180});}
  e.tick();const data=e.uniforms['trails[0]'];
  assert.equal(data[0],100,'fast input must not drop a still-live start point');assert.ok(data[2]>0&&data[2]<.2);
  assert.ok(data.filter((_,i)=>i%3===2).filter(v=>v>0).length<=32);
  effect.update({trailLength:.2});e.tick(20);assert.ok(e.uniforms['trails[0]'].every(v=>v===0),'new duration also applies to existing wake');
  e.tick(100);assert.equal(e.frames.size,0);effect.destroy();
});
test('embedded-frame timestamp skew cannot invert interaction or prevent settling',()=>{
  for(const offset of [-32,5000]){
    const e=setup(false,offset),r=e.root();r.clientWidth=294;r.clientHeight=147;
    const effect=e.mount(r,{intro:0});
    r.emit('pointermove',{pointerType:'mouse',clientX:140,clientY:35});
    e.tick();assert.ok(e.uniforms.pointer[2]>=0&&e.uniforms.pointer[2]<=1,'lens opacity must stay within [0,1]');
    e.tick(80);assert.ok(e.uniforms['trails[0]'].every(v=>v===0),'wake expires using elapsed local time');
    r.emit('pointerleave');e.tick(200);assert.equal(e.frames.size,0);assert.equal(e.uniforms.pointer[2],0);
    effect.destroy();
  }
});
