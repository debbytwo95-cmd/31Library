const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element extends EventTarget {
    constructor() { super();this.children=[];this.style={};this.attributes={};this.clientWidth=640;this.scrollWidth=300; }
    append(el) { this.children.push(el);el.parent=this; }
    replaceChildren() { this.children=[]; }
    setAttribute(key,value) { this.attributes[key]=value; }
    getBoundingClientRect() {
        return this.parent ? {left:this.parent.children.indexOf(this)*20,width:20} : {left:0,width:300};
    }
    emit(type,values={}) { const event=new Event(type,{cancelable:true});Object.assign(event,values);this.dispatchEvent(event); }
}
function environment(reduced=false) {
    const window=new Element(),document=new Element(),media=new Element(),frames=new Map(),observers=[];
    document.createElement=()=>new Element();media.matches=reduced;
    let id=0,now=0;
    vm.runInNewContext(fs.readFileSync('single-web/components/text/weight-wave-studio/effect.js','utf8'), {
        window,document,matchMedia:()=>media,AbortController,
        performance:{now:()=>now}, requestAnimationFrame:fn=>{frames.set(++id,fn);return id;}, cancelAnimationFrame:key=>frames.delete(key),
        ResizeObserver:class {constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
    });
    function tick(count=500) { for(let i=0;i<count;i++){ now+=16;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now)); } }
    function create(options={}) {
        const root=new Element(),line=new Element();root.querySelector=()=>line;
        const runtime=window.LibraryWeightWave.mount(root,{autoplay:false,...options});
        return {root,line,runtime,weights:()=>line.children.map(el=>Number(el.style.fontWeight))};
    }
    return {window,document,media,frames,observers,tick,create};
}
test('wave starts and remains still; pointer creates a local peak then settles and stops',()=>{
    const env=environment(),a=env.create();
    assert.equal(env.frames.size,0);env.tick();assert.ok(a.weights().every(w=>w===300));
    a.root.emit('pointermove',{clientX:150,pointerType:'mouse'});env.tick();
    assert.ok(a.weights()[7]>800);assert.ok(a.weights()[0]<310);assert.equal(env.frames.size,0);
    a.root.emit('pointerleave');env.tick();assert.ok(a.weights().every(w=>w===300));assert.equal(env.frames.size,0);a.runtime.destroy();
});
test('touch requires contact and releases or cancels; keyboard does not start on focus',()=>{
    const env=environment(),a=env.create();
    a.root.emit('pointermove',{clientX:150,pointerType:'touch',pointerId:3});assert.equal(env.frames.size,0);
    a.root.emit('pointerdown',{clientX:150,pointerType:'touch',pointerId:3,button:0});env.tick();assert.ok(a.weights()[7]>800);
    a.root.emit('pointerup',{pointerType:'touch'});env.tick();assert.ok(a.weights().every(w=>w===300));
    a.line.emit('focus');assert.equal(env.frames.size,0);
    a.line.emit('keydown',{key:'End'});env.tick();assert.ok(a.weights().at(-1)>800);
    a.line.emit('keydown',{key:'Escape'});env.tick();assert.ok(a.weights().every(w=>w===300));
    a.root.emit('pointerdown',{clientX:150,pointerType:'touch',pointerId:3,button:0});a.root.emit('pointercancel');env.tick();assert.ok(a.weights().every(w=>w===300));a.runtime.destroy();
});
test('instances, updates, resize, blur, reset and destruction cleanly isolate state',()=>{
    const env=environment(),a=env.create(),b=env.create();
    a.root.emit('pointermove',{clientX:150,pointerType:'mouse'});env.tick();assert.ok(b.weights().every(w=>w===300));
    a.runtime.update({text:'New text',light:200,bold:900});assert.equal(a.line.children.length,8);assert.ok(a.weights().every(w=>w===200));
    a.root.emit('pointermove',{clientX:150,pointerType:'mouse'});env.window.emit('blur');assert.equal(env.frames.size,0);assert.ok(a.weights().every(w=>w===200));
    env.window.emit('focus');env.tick();
    a.root.emit('pointermove',{clientX:150,pointerType:'mouse'});env.observers[0].fn();assert.equal(env.frames.size,0);
    a.runtime.reset();a.runtime.destroy();a.root.emit('pointermove',{clientX:100,pointerType:'mouse'});a.runtime.update({text:'ignored'});assert.equal(env.frames.size,0);
    b.line.emit('keydown',{key:'Home'});env.tick();assert.ok(b.weights()[0]>800);b.runtime.destroy();assert.ok(env.observers.every(o=>o.disconnected));
});
test('idle sweep runs automatically, yields to a real pointer and resumes on exit',()=>{
    const env=environment(),a=env.create({autoplay:true});
    assert.equal(env.frames.size,1);env.tick(60);const first=a.weights();
    assert.ok(first.some(w=>w>500));env.tick(80);assert.notDeepEqual(a.weights(),first);assert.equal(env.frames.size,1);
    a.root.emit('pointermove',{clientX:150,pointerType:'mouse'});env.tick();
    assert.ok(a.weights()[7]>800);const held=a.weights();env.tick(90);assert.deepEqual(a.weights(),held);
    a.root.emit('pointerleave');env.tick(70);assert.notDeepEqual(a.weights(),held);assert.equal(env.frames.size,1);
    a.runtime.destroy();assert.equal(env.frames.size,0);
});
test('autoplay pauses for reset, code mode, hidden pages and reduced motion',()=>{
    const env=environment(),a=env.create({autoplay:true});
    env.tick(60);a.runtime.reset();assert.equal(env.frames.size,0);assert.ok(a.weights().every(w=>w===300));
    a.runtime.update({fontSize:60});assert.equal(env.frames.size,0);
    a.runtime.play();assert.equal(env.frames.size,1);env.tick(30);a.runtime.pause();assert.equal(env.frames.size,0);
    a.runtime.play();env.window.emit('blur');assert.equal(env.frames.size,0);env.window.emit('focus');assert.equal(env.frames.size,1);
    env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(env.frames.size,0);
    env.document.hidden=false;env.document.emit('visibilitychange');assert.equal(env.frames.size,1);
    env.media.matches=true;env.media.emit('change');assert.equal(env.frames.size,0);assert.ok(a.weights().every(w=>w===300));
    a.root.emit('pointermove',{clientX:150,pointerType:'mouse'});assert.ok(a.weights()[7]>800);assert.equal(env.frames.size,0);
    a.root.emit('pointerleave');assert.ok(a.weights().every(w=>w===300));a.runtime.destroy();
});
test('reduced motion applies direct feedback; equal weights avoid invalid opacity',()=>{
    const env=environment(true),a=env.create();
    a.root.emit('pointermove',{clientX:150,pointerType:'mouse'});assert.ok(a.weights()[7]>800);assert.equal(env.frames.size,0);
    a.root.emit('pointerleave');assert.ok(a.weights().every(w=>w===300));
    a.runtime.update({light:600,bold:600});a.line.emit('keydown',{key:'Home'});
    assert.ok(a.weights().every(w=>w===600));assert.ok(a.line.children.every(el=>el.style.opacity==='0.420'));a.runtime.destroy();
});
