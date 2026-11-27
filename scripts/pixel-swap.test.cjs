const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const directory = 'single-web/components/text/pixel-swap-studio/';
class Node extends EventTarget {
    constructor(){super();this.children=[];this.dataset={};this.attributes={};this.clientWidth=1000;this.style={setProperty(){}};this.classList={toggle(){}};}
    append(node){this.children.push(node);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(key,value){this.attributes[key]=value;}
    emit(type){this.dispatchEvent(new Event(type));}
}
function environment(reduced=false){
    let now=0,id=0;const frames=new Map(),timers=new Map(),contexts=[],observers=[];
    const window=new Node(),document=new Node(),media=new Node();media.matches=reduced;
    document.createElement=tag=>{
        const node=new Node();
        if(tag==='canvas'){
            const ctx={font:'400 64px Inter',letterSpacing:'0px',calls:[],setTransform(){},clearRect(){this.calls=[];},save(){},restore(){},beginPath(){},rect(){},clip(){},
                measureText(text){const size=Number(this.font.match(/([\d.]+)px/)[1]);return {width:Array.from(text).length*size*.53,fontBoundingBoxAscent:size*.8,fontBoundingBoxDescent:size*.2};},
                fillText(text,x,y){this.calls.push({kind:'text',text,x,y});},drawImage(...args){this.calls.push({kind:'image',args});}};
            contexts.push(ctx);node.getContext=()=>ctx;
        }return node;
    };
    const context=vm.createContext({window,document,AbortController,Intl,matchMedia:()=>media,getComputedStyle:()=>({fontFamily:'Inter',color:'#18181c'}),performance:{now:()=>now},
        requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
        setTimeout:(fn,delay)=>{timers.set(++id,{fn,due:now+delay});return id;},clearTimeout:id=>timers.delete(id),
        ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}});
    vm.runInContext(fs.readFileSync(directory+'effect.js','utf8'),context);
    const api=window.LibraryPixelSwap;
    return {context,api,window,document,media,frames,timers,contexts,observers,create(width=1000,config){const root=new Node();root.clientWidth=width;return {root,runtime:api.mount(root,{autoplay:false,...config})};},
        tick(ms){now+=ms;for(const [key,timer] of [...timers])if(timer.due<=now){timers.delete(key);timer.fn();}const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now));}};
}
test('only the word pixelates, its width interpolates, and the finished effect is idle',()=>{
    const env=environment(),a=env.create();assert.equal(env.frames.size,0);assert.equal(a.root.dataset.word,'movie');
    a.runtime.next();env.tick(163);
    assert.ok(Number(a.root.children[0].children[0].dataset.block)>1);
    assert.deepEqual(env.contexts[1].calls.filter(c=>c.kind==='text').map(c=>c.text),['Create','any','you','imagine']);
    assert.deepEqual(env.contexts[2].calls.filter(c=>c.kind==='text').map(c=>c.text),['movie']);
    env.tick(170);assert.equal(a.root.dataset.word,'image');env.tick(400);
    assert.equal(a.root.children[0].children[0].dataset.block,'1');assert.equal(env.frames.size,0);
    env.tick(10000);assert.equal(a.root.dataset.word,'image');a.runtime.destroy();
});
test('rapid activation is bounded, resets cancel work, remount and destroy release resources',()=>{
    const env=environment(),a=env.create(),b=env.create();
    for(let i=0;i<30;i++){a.runtime.next();assert.equal(env.frames.size,1);env.tick(10);}
    assert.equal(b.root.dataset.word,'movie');a.root.emit('pointerleave');assert.equal(a.root.dataset.word,'movie');assert.equal(env.frames.size,0);
    a.runtime.next();env.window.emit('blur');assert.equal(env.frames.size,0);
    const old=a.runtime,newRuntime=env.api.mount(a.root);old.next();assert.equal(env.frames.size,0);
    assert.equal(a.root.children.length,1);newRuntime.next();newRuntime.destroy();assert.equal(env.frames.size,0);
    env.observers[0].fn();b.runtime.destroy();assert.ok(env.observers.every(o=>o.disconnected));
});
test('reduced motion, narrow layouts, Unicode and invalid parameters retain a usable component',()=>{
    const env=environment(true),a=env.create(250);
    assert.ok(a.root.children[0].children[0].height<180,'compact cover fits two lines');
    a.runtime.next();assert.equal(a.root.dataset.word,'image');assert.equal(env.frames.size,0);
    a.runtime.update({prefix:'创造',words:['未来','世界'],suffix:'从想象开始',fontSize:999,duration:NaN,blockSize:-1});
    a.runtime.next();assert.equal(a.root.dataset.word,'世界');assert.equal(env.frames.size,0);
    const config=env.api.normalize({words:[],duration:NaN,blockSize:-1,fontSize:999});
    assert.equal(config.duration,650);assert.equal(config.blockSize,2);assert.equal(config.fontSize,96);assert.ok(config.words.length);
    a.runtime.update({words:['only']});a.runtime.next();assert.equal(a.root.dataset.word,'only');a.runtime.destroy();
});
test('autoplay advances without hover, rests between swaps and cancels every timer on destroy',()=>{
    const env=environment(),a=env.create(1000,{autoplay:true});
    assert.equal(env.timers.size,1);env.tick(1299);assert.equal(a.root.dataset.word,'movie');
    env.tick(1);assert.equal(env.frames.size,1);assert.equal(env.timers.size,0);
    env.tick(650);assert.equal(a.root.dataset.word,'image');assert.equal(env.timers.size,1);
    env.tick(1300);env.tick(650);assert.equal(a.root.dataset.word,'campaign');
    env.tick(1300);env.tick(650);assert.equal(a.root.dataset.word,'movie');
    a.runtime.destroy();assert.equal(env.timers.size,0);assert.equal(env.frames.size,0);
});
test('reset, code pause, background and reduced motion gate autoplay without duplicate schedules',()=>{
    const env=environment(),a=env.create(1000,{autoplay:true});
    a.runtime.reset();env.tick(10000);assert.equal(a.root.dataset.word,'movie');assert.equal(env.timers.size,0);
    a.runtime.update({duration:900});assert.equal(env.timers.size,0);
    a.runtime.next();env.tick(900);assert.equal(a.root.dataset.word,'image');assert.equal(env.timers.size,1);
    a.runtime.pause();env.tick(10000);assert.equal(env.timers.size,0);
    a.runtime.resume();a.runtime.resume();assert.equal(env.timers.size,1);
    env.window.emit('blur');assert.equal(env.timers.size,0);env.window.emit('focus');assert.equal(env.timers.size,1);
    env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(env.timers.size,0);
    env.document.hidden=false;env.document.emit('visibilitychange');assert.equal(env.timers.size,1);
    env.media.matches=true;env.media.emit('change');assert.equal(env.timers.size,0);
    a.runtime.next();assert.equal(env.frames.size,0);assert.equal(env.timers.size,0);
    env.media.matches=false;env.media.emit('change');assert.equal(env.timers.size,1);
    a.runtime.update({words:['one']});assert.equal(env.timers.size,0);a.runtime.destroy();
});
test('delivery snapshots edited parameters, includes local fonts, and reset retains theme and tab',async()=>{
    const env=environment(),ids=new Map(),html=fs.readFileSync(directory+'index.html','utf8');
    for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
        const node=new Node();for(const key of ['min','max','value'])node[key]=tag[0].match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1];
        node.hidden=tag[0].includes(' hidden');ids.set(tag[1],node);
    }
    const themes=['light','dark'].map(theme=>{const node=new Node();node.dataset.stageTheme=theme;return node;});
    const tabs=new Node();ids.get('pixel-swap').dataset.appearance='light';
    Object.assign(env.document,{documentElement:{hasAttribute:()=>false},getElementById:id=>ids.get(id),querySelectorAll:()=>themes,querySelector:()=>tabs,createTextNode:text=>text});
    let delivery;
    const read=async(url,binary)=>{const data=fs.readFileSync(new URL(url).pathname.replace('/31Library/',''));return binary?data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength):data.toString();};
    const deliveryContext=vm.createContext({window:{},document:{currentScript:{src:'http://library.test/31Library/assets/delivery.js'}},URL,Blob,TextEncoder,btoa,fetch:async url=>({ok:true,text:()=>read(url),arrayBuffer:()=>read(url,true)})});
    vm.runInContext(fs.readFileSync('assets/delivery.js','utf8'),deliveryContext);
    const sharedDelivery=deliveryContext.window.LibraryDelivery;
    Object.assign(env.context,{LibraryPixelSwap:env.api,LibraryDelivery:{...sharedDelivery,register:options=>{delivery=options;return{refresh(){}};}},location:{href:'http://library.test/31Library/'+directory+'index.html'},URL,btoa});
    vm.runInContext(fs.readFileSync(directory+'app.js','utf8'),env.context);
    ids.get('prefix').value='Imagine';ids.get('prefix').emit('input');ids.get('duration').value='950';ids.get('duration').emit('input');
    themes[1].emit('click');ids.get('code-tab').emit('click');
    const pending=delivery.bundle(true);ids.get('duration').value='200';ids.get('duration').emit('input');const bundle=await pending;
    assert.match(bundle.js,/"duration":950/);assert.match(bundle.js,/"prefix":"Imagine"/);assert.match(bundle.prompt,/950 ms/);assert.match(bundle.html,/data-appearance="dark"/);
    assert.ok(bundle.files['assets/noto-sans-sc-variable.ttf'].byteLength>1000000);assert.match(bundle.files['assets/NOTO-OFL.txt'],/OPEN FONT LICENSE/);
    assert.doesNotMatch(bundle.html,/main-shell|settings|library-header/);new vm.Script(bundle.js);
    assert.match(bundle.css,/data:font\/ttf;base64/);
    if(process.env.PIXEL_SWAP_QA_DIR){
        const path=require('node:path'),out=process.env.PIXEL_SWAP_QA_DIR;
        fs.mkdirSync(path.join(out,'assets'),{recursive:true});
        const example=sharedDelivery.example(bundle,delivery.title);
        fs.writeFileSync(path.join(out,'index.html'),example);
        fs.writeFileSync(path.join(out,'two-instances.html'),example.replace(bundle.html,bundle.html+'\n'+bundle.html));
        for(const [name,data] of Object.entries(bundle.files))fs.writeFileSync(path.join(out,name),Buffer.from(data));
    }
    ids.get('reset').emit('click');assert.equal(ids.get('duration').value,650);assert.equal(ids.get('preview-panel').dataset.theme,'dark');assert.equal(ids.get('code-panel').hidden,false);
});
