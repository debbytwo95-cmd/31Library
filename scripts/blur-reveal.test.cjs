const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element extends EventTarget {
    constructor() { super();this.children=[];this.style={setProperty(key,value){this[key]=value;}};this.dataset={};this.attributes={};this.className='';this.jobs=[]; }
    append(node) { this.children.push(node); }
    replaceChildren(...nodes) { this.children=nodes; }
    setAttribute(key,value) { this.attributes[key]=value; }
    querySelectorAll(selector) { return this.children.flatMap(node => [...(node.className === selector.slice(1) ? [node] : []),...node.querySelectorAll(selector)]); }
    animate(keyframes,options) {
        let resolve,reject;
        const animation={keyframes,options,cancelled:false,finished:new Promise((a,b)=>{resolve=a;reject=b;}),cancel(){this.cancelled=true;reject(new Error('cancelled'));},finish(){resolve();}};
        this.jobs.push(animation);return animation;
    }
    emit(name,properties={}) { const event=new Event(name);Object.assign(event,properties);this.dispatchEvent(event); }
}
function environment(reduce=false) {
    const window=new Element(),document=new Element(),media=new Element();media.matches=reduce;
    const timers=new Map();let timerId=0;
    document.createElement=()=>new Element();
    vm.runInNewContext(fs.readFileSync('single-web/components/text/blur-reveal-studio/effect.js','utf8'),{window,document,matchMedia:()=>media,AbortController,Intl,
        setTimeout(fn,delay){timers.set(++timerId,{fn,delay});return timerId;},clearTimeout(id){timers.delete(id);}});
    const create=config=>{
        const root=new Element(),button=new Element();root.querySelector=()=>button;
        const runtime=root.libraryComponent=window.LibraryBlurReveal.mount(root,{autoPlay:false,...config});
        return {root,button,runtime,chars:()=>button.querySelectorAll('.library-blur-reveal-char')};
    };
    return {window,document,media,create,timers,tick(){const pending=[...timers.values()];timers.clear();pending.forEach(item=>item.fn());}};
}

test('manual mode stays still; explicit play produces the intended opacity, blur and stagger',async()=>{
    const env=environment(),a=env.create({text:'Focus'});
    assert.equal(a.root.dataset.revealing,'false');assert.ok(a.chars().every(node=>node.jobs.length===0));
    a.button.emit('click');a.root.emit('pointerenter',{pointerType:'mouse'});
    assert.ok(a.chars().every(node=>node.jobs.length===0),'synthetic input cannot start the preview');
    a.runtime.update({duration:700,stagger:50,blur:12});a.runtime.play();
    const jobs=a.chars().map(node=>node.jobs.at(-1));
    assert.equal(jobs[2].options.delay,100);assert.equal(jobs[0].options.duration,700);
    assert.equal(jobs[0].keyframes[0].filter,'blur(12px)');assert.equal(jobs[0].keyframes[0].opacity,0);
    assert.equal(jobs[0].keyframes[1].opacity,1);assert.equal(jobs[0].options.easing,'cubic-bezier(.23,1,.32,1)');
    jobs.forEach(job=>job.finish());await new Promise(resolve=>setImmediate(resolve));
    assert.equal(a.root.dataset.revealing,'false');assert.ok(jobs.every(job=>job.cancelled));a.runtime.destroy();
});

test('rapid replay cancels old work; instances, cancellation and lifecycle remain independent',()=>{
    const env=environment(),a=env.create(),b=env.create();a.runtime.play();b.runtime.play();
    const old=a.chars()[0].jobs[0];a.runtime.play();assert.ok(old.cancelled);
    a.root.emit('pointerleave');assert.equal(a.root.dataset.revealing,'false');assert.equal(b.root.dataset.revealing,'true');
    b.root.emit('pointercancel');assert.equal(b.root.dataset.revealing,'false');
    a.runtime.play();env.window.emit('blur');assert.equal(a.root.dataset.revealing,'false');
    env.window.emit('focus');
    a.runtime.play();env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(a.root.dataset.revealing,'false');
    env.document.hidden=false;env.document.emit('visibilitychange');
    a.runtime.play();const latest=a.chars()[0].jobs.at(-1);a.runtime.destroy();assert.ok(latest.cancelled);
    a.runtime.play();assert.equal(a.root.dataset.revealing,'false');b.runtime.destroy();
});

test('autoplay repeats after the clear hold and pauses for reset, hidden pages and reduced motion',async()=>{
    const env=environment(),a=env.create({autoPlay:true,text:'Focus'});
    assert.equal(env.window.LibraryBlurReveal.defaults.autoPlay,true);
    assert.equal(env.timers.size,1);assert.equal([...env.timers.values()][0].delay,1400);
    env.tick();assert.equal(a.root.dataset.revealing,'true');assert.equal(env.timers.size,0);
    a.chars().forEach(node=>node.jobs.at(-1).finish());await new Promise(resolve=>setImmediate(resolve));
    assert.equal(a.root.dataset.revealing,'false');assert.equal(env.timers.size,1);
    env.tick();assert.equal(a.root.dataset.revealing,'true');
    a.root.emit('pointerleave');assert.equal(a.root.dataset.revealing,'false');assert.equal(env.timers.size,1);
    a.runtime.reset();assert.equal(env.timers.size,0);a.runtime.resume();assert.equal(env.timers.size,1);
    env.window.emit('blur');assert.equal(env.timers.size,0);env.window.emit('focus');assert.equal(env.timers.size,1);
    env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(env.timers.size,0);
    env.document.hidden=false;env.document.emit('visibilitychange');assert.equal(env.timers.size,1);
    env.media.matches=true;env.media.emit('change');assert.equal(env.timers.size,0);
    env.media.matches=false;env.media.emit('change');assert.equal(env.timers.size,1);
    a.runtime.update({duration:700});assert.equal(env.timers.size,1);
    a.runtime.destroy();assert.equal(env.timers.size,0);
});

test('text remains text, graphemes stay intact, reduced motion stays clear and remount cleans the old instance',()=>{
    const env=environment(),a=env.create({text:'你 e\u0301 <tag>'});
    assert.ok(a.chars().some(node=>node.textContent==='e\u0301'));
    assert.equal(a.chars().map(node=>node.textContent).join('').replaceAll('\u00a0',' '),'你 e\u0301 <tag>');
    a.runtime.play();env.media.matches=true;env.media.emit('change');assert.equal(a.root.dataset.revealing,'false');
    a.runtime.play();assert.equal(a.root.dataset.revealing,'false');
    a.runtime.update({text:' ',fontSize:999,duration:-1});assert.equal(a.root.style['--blur-reveal-size'],'96px');
    assert.ok(a.button.attributes['aria-label'].includes('<tag>'));
    const next=env.window.LibraryBlurReveal.mount(a.root,{text:'New'});a.runtime.play();assert.equal(a.root.dataset.revealing,'false');next.destroy();
});
