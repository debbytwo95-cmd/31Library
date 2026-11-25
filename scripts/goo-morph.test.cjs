const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element extends EventTarget {
    constructor() { super();this.children=[];this.style={setProperty(key,value){this[key]=value;}};this.dataset={};this.attributes={};this.clientWidth=600;this.textContent=''; }
    append(node) { this.children.push(node);node.parent=this; }
    replaceChildren(...nodes) { this.children=nodes; }
    remove() { if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this); }
    setAttribute(name,value) { this.attributes[name]=value; }
    getBoundingClientRect() { return {width:this.textContent.length*32}; }
    emit(name,options={}) { const event=new Event(name);Object.assign(event,options);this.dispatchEvent(event); }
}
function environment(reduce=false) {
    const window=new Element(),document=new Element(),media=new Element(),frames=new Map(),timers=new Map(),observers=[];
    let now=0,id=0;media.matches=reduce;document.createElement=document.createElementNS=()=>new Element();
    const context={
        window,document,matchMedia:()=>media,AbortController,performance:{now:()=>now},
        requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
        setTimeout:(fn,delay)=>{timers.set(++id,{fn,due:now+delay});return id;},clearTimeout:id=>timers.delete(id),
        ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
    };
    vm.runInNewContext(fs.readFileSync('single-web/components/text/goo-morph-studio/effect.js','utf8'),context);
    const tick=ms=>{now+=ms;for(const [id,timer] of [...timers])if(timer.due<=now){timers.delete(id);timer.fn();}const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now));};
    function create(config) {
        const root=new Element(),button=new Element(),layers=new Element(),a=new Element(),b=new Element();
        layers.append(a);layers.append(b);button.append(layers);root.append(button);
        root.querySelector=selector=>selector.includes('trigger')?button:layers;
        const runtime=root.libraryComponent=window.LibraryGooMorph.mount(root,{autoplay:false,...config});
        return {root,button,layers,a,b,runtime};
    }
    return {window,document,media,frames,timers,observers,tick,create,context};
}
test('idle has no scheduled work; input melts both layers and removes filtering on arrival',()=>{
    const env=environment(),a=env.create();assert.equal(env.frames.size,0);env.tick(10000);assert.equal(a.root.dataset.word,'Ideas');
    a.button.emit('click');assert.equal(a.root.dataset.melting,'true');assert.equal(a.b.textContent,'Sketches');
    assert.match(a.layers.style.filter,/url\(#library-goo-morph-/);env.tick(525);
    assert.equal(a.a.style.filter,'blur(8.00px)');assert.equal(a.b.style.filter,'blur(8.00px)');
    assert.equal(a.a.style.opacity,a.b.style.opacity);env.tick(525);
    assert.equal(a.root.dataset.word,'Sketches');assert.equal(a.layers.style.filter,'none');assert.equal(env.frames.size,0);
    a.runtime.destroy();
});
test('instances have unique filters, bounded rapid input and independent cleanup',()=>{
    const env=environment(),a=env.create(),b=env.create();a.runtime.next();b.runtime.next();
    assert.notEqual(a.layers.style.filter,b.layers.style.filter);
    for(let i=0;i<20;i++)a.runtime.next();assert.equal(a.b.textContent,'Sketches');
    a.runtime.reset();assert.equal(a.root.dataset.word,'Ideas');assert.equal(env.frames.size,1);
    a.runtime.destroy();a.button.emit('click');assert.equal(env.frames.size,1);env.tick(1050);
    assert.equal(b.root.dataset.word,'Sketches');assert.equal(env.frames.size,0);
    b.runtime.destroy();assert.ok(env.observers.every(observer=>observer.disconnected));
});
test('hover leaves reset, touch does not hover, and cancellation/blur stop pending frames',()=>{
    const env=environment(),a=env.create();a.root.emit('pointerenter',{pointerType:'touch'});assert.equal(env.frames.size,0);
    a.root.emit('pointerenter',{pointerType:'mouse'});assert.equal(env.frames.size,1);a.root.emit('pointerleave');assert.equal(a.root.dataset.word,'Ideas');
    a.runtime.next();a.root.emit('pointercancel');assert.equal(env.frames.size,0);assert.equal(a.root.dataset.word,'Sketches');
    a.runtime.next();env.window.emit('blur');assert.equal(env.frames.size,0);assert.equal(a.root.dataset.word,'Designs');
    a.runtime.next();env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(env.frames.size,0);assert.equal(a.root.dataset.word,'Products');
    a.runtime.destroy();
});
test('reduced motion switches instantly, parameter updates stay idle and long words fit',()=>{
    const env=environment(true),a=env.create({words:['Alpha','Beta'],fontSize:72});
    a.runtime.next();assert.equal(a.root.dataset.word,'Beta');assert.equal(env.frames.size,0);
    a.runtime.update({words:['<script>','A very long phrase with spaces'],duration:1800,blur:12,threshold:180});
    assert.equal(a.root.dataset.word,'<script>');assert.equal(a.a.textContent,'<script>');assert.equal(env.frames.size,0);
    a.root.clientWidth=180;env.observers[0].fn();assert.ok(parseFloat(a.button.style['--goo-morph-size'])<72);
    a.runtime.update({words:[]});assert.equal(a.root.dataset.word,'<script>');
    a.runtime.destroy();a.runtime.next();env.observers[0].fn();assert.equal(env.frames.size,0);
});
test('remounting cleans instance SVG resources and keeps filter IDs unique',()=>{
    const env=environment(),a=env.create();const previous=a.root.children[1].children[0].id;
    a.root.libraryComponent=env.window.LibraryGooMorph.mount(a.root);
    assert.equal(a.root.children.length,2);assert.notEqual(a.root.children[1].children[0].id,previous);
    assert.equal(a.button.children.length,2);a.root.libraryComponent.destroy();assert.equal(a.root.children.length,1);assert.equal(a.button.children.length,1);
});
test('autoplay waits for hold, morphs without input, wraps and cleans up on destroy',()=>{
    const env=environment(),a=env.create({autoplay:true});assert.equal(env.frames.size,0);assert.equal(env.timers.size,1);
    env.tick(1599);assert.equal(a.root.dataset.word,'Ideas');assert.equal(env.frames.size,0);
    env.tick(1);assert.equal(a.b.textContent,'Sketches');assert.equal(env.timers.size,0);
    env.tick(1050);assert.equal(a.root.dataset.word,'Sketches');assert.equal(env.frames.size,0);assert.equal(env.timers.size,1);
    a.root.emit('pointerleave');assert.equal(a.root.dataset.word,'Sketches');assert.equal(env.timers.size,1);
    for(const word of ['Designs','Products','Ideas']){env.tick(1600);env.tick(1050);assert.equal(a.root.dataset.word,word);}
    a.runtime.destroy();assert.equal(env.timers.size,0);assert.equal(env.frames.size,0);env.tick(10000);assert.equal(a.root.dataset.word,'Ideas');
});
test('manual changes restart hold; pause, focus and hidden state do not duplicate timers',()=>{
    const env=environment(),a=env.create({autoplay:true}),b=env.create();env.tick(1000);a.button.emit('click');env.tick(1050);
    env.tick(1599);assert.equal(a.root.dataset.word,'Sketches');assert.equal(a.root.dataset.melting,'false');env.tick(1);assert.equal(a.root.dataset.melting,'true');
    env.window.emit('blur');assert.equal(env.timers.size,1);assert.equal(env.frames.size,0);
    env.tick(1600);env.tick(1050);assert.equal(a.root.dataset.word,'Products');assert.equal(env.timers.size,1);
    env.window.emit('focus');env.window.emit('focus');assert.equal(env.timers.size,1);
    env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(env.timers.size,0);
    env.document.hidden=false;env.document.emit('visibilitychange');assert.equal(env.timers.size,1);
    a.runtime.pause();env.window.emit('focus');assert.equal(env.timers.size,0);
    a.runtime.update({hold:400});assert.equal(env.timers.size,0);a.runtime.play();a.runtime.play();assert.equal(env.timers.size,1);
    env.tick(400);env.tick(1050);assert.equal(a.root.dataset.word,'Sketches');assert.equal(b.root.dataset.word,'Ideas');
    a.runtime.destroy();b.runtime.destroy();assert.equal(env.timers.size,0);
});
test('visible unfocused autoplay survives pointer entry, exit and focus events without restarting hold',()=>{
    const env=environment(),a=env.create({autoplay:true});
    a.root.emit('pointerenter',{pointerType:'mouse'});a.root.emit('pointerleave');env.window.emit('blur');
    env.tick(1000);env.window.emit('focus');env.tick(600);env.tick(1050);
    assert.equal(a.root.dataset.word,'Sketches');assert.equal(env.timers.size,1);
    env.window.emit('pagehide');assert.equal(env.timers.size,0);assert.equal(env.frames.size,0);
    env.tick(10000);assert.equal(a.root.dataset.word,'Sketches');
    env.window.emit('pageshow');assert.equal(env.timers.size,1);env.tick(1600);env.tick(1050);
    assert.equal(a.root.dataset.word,'Designs');a.runtime.destroy();assert.equal(env.timers.size,0);
});
test('reduced motion autoplay changes directly; reset and single-word lists stay bounded',()=>{
    const env=environment(true),a=env.create({autoplay:true,hold:400});env.tick(400);assert.equal(a.root.dataset.word,'Sketches');assert.equal(env.frames.size,0);
    a.runtime.reset();assert.equal(a.root.dataset.word,'Ideas');assert.equal(env.timers.size,1);
    a.runtime.update({words:['Only']});assert.equal(env.timers.size,0);env.tick(10000);assert.equal(a.root.dataset.word,'Only');
    a.runtime.update({words:['One','Two'],autoplay:false});assert.equal(env.timers.size,0);
    a.runtime.destroy();
});
test('catalog cover app starts autoplay without trusted pointer or click events',()=>{
    const env=environment(),a=env.create(),nodes=new Map([['goo-morph',a.root]]);
    const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
    env.document.documentElement={hasAttribute:()=>true};
    env.document.getElementById=get;env.document.querySelector=()=>get('tabs');env.document.querySelectorAll=()=>[];
    env.document.createTextNode=text=>Object.assign(new Element(),{textContent:String(text)});
    env.context.LibraryGooMorph=env.window.LibraryGooMorph;
    vm.runInNewContext(fs.readFileSync('single-web/components/text/goo-morph-studio/app.js','utf8'),env.context);
    assert.equal(env.timers.size,1);assert.equal(env.frames.size,0);
    env.tick(1600);env.tick(1050);assert.equal(a.root.dataset.word,'Sketches');
    get('preview-panel').emit('pointerleave');env.document.emit('pointerleave');env.window.emit('blur');
    assert.equal(env.timers.size,1);env.tick(1600);env.tick(1050);assert.equal(a.root.dataset.word,'Designs');
    a.root.libraryComponent.destroy();assert.equal(env.timers.size,0);
});
