const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const directory='single-web/components/gallery/elliptical-gallery-studio/';
class Node{
    constructor(){this.handlers=new Map();this.dataset={};this.attributes={};this.children=[];this.capture=new Set();this.style={setProperty(){}};this.classList={toggle(){}};this.rect={width:1100,height:520};}
    addEventListener(type,fn,options={}){const handlers=this.handlers.get(type)||[];handlers.push(fn);this.handlers.set(type,handlers);options.signal?.addEventListener('abort',()=>this.removeEventListener(type,fn),{once:true});}
    removeEventListener(type,fn){this.handlers.set(type,(this.handlers.get(type)||[]).filter(handler=>handler!==fn));}
    emit(type,data={}){const event={type,target:this,preventDefault(){this.prevented=true;},...data};for(const fn of [...this.handlers.get(type)||[]])fn(event);return event;}
    setAttribute(key,value){this.attributes[key]=String(value);}
    getAttribute(key){return this.attributes[key]??null;}
    removeAttribute(key){delete this.attributes[key];if(key.startsWith('data-'))delete this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];}
    replaceChildren(...nodes){this.children=nodes;nodes.forEach(node=>{if(node&&typeof node==='object')node.parent=this;});}
    contains(node){return node===this||this.children.some(child=>child.contains(node));}
    closest(selector){return selector==='.'+this.className?this:this.parent?.closest(selector)||null;}
    getBoundingClientRect(){return this.rect;}
    setPointerCapture(id){this.capture.add(id);}
    hasPointerCapture(id){return this.capture.has(id);}
    releasePointerCapture(id){this.capture.delete(id);}
}
function environment(reduced=false){
    let now=1,id=0;const frames=new Map(),resizes=[],intersections=[];
    const window=new Node(),document=new Node(),media=new Node();media.matches=reduced;
    document.createElement=()=>new Node();
    const context=vm.createContext({window,document,AbortController,matchMedia:()=>media,performance:{now:()=>now},
        requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
        ResizeObserver:class{constructor(fn){this.fn=fn;resizes.push(this);}observe(){}disconnect(){this.disconnected=true;}},
        IntersectionObserver:class{constructor(fn){this.fn=fn;intersections.push(this);}observe(){}disconnect(){this.disconnected=true;}}});
    vm.runInContext(fs.readFileSync(directory+'effect.js','utf8'),context);
    const api=window.LibraryEllipticalGallery;
    return {api,context,window,document,media,frames,resizes,intersections,create(config){const root=new Node();return{root,runtime:api.mount(root,config)};},
        tick(count=1){for(let i=0;i<count;i++){now+=16;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now));}}};
}
test('elliptical projection preserves face-on mixed proportions, depth ordering and bounds',()=>{
    const {api}=environment(),config=api.normalize(),front=api.project(0,0,config,1100,520),back=api.project(0,Math.PI,config,1100,520);
    assert.ok(front.scale>back.scale);assert.ok(front.layer>back.layer);assert.equal(front.blur,0);assert.ok(back.blur>0);assert.ok(front.opacity>back.opacity);
    for(const sample of [config,api.normalize({size:150,depth:50,spread:94,ellipse:70,count:24})])for(const [width,height] of [[1100,520],[295,320],[255,325]])for(let step=0;step<100;step++)for(let i=0;i<sample.count;i++){
        const p=api.project(i,step/100*Math.PI*2,sample,width,height);
        assert.ok(Math.abs(p.x)+p.width*p.scale/2<width/2);assert.ok(Math.abs(p.y)+p.height*p.scale/2<height/2);
    }
    assert.notEqual(api.project(0,0,config,1100,520).width/api.project(0,0,config,1100,520).height,api.project(2,0,config,1100,520).width/api.project(2,0,config,1100,520).height);
});
test('autoplay runs without input, hover stops and enlarges, leave resumes, reset stays paused',()=>{
    const env=environment(),a=env.create();env.tick(60);const before=a.root.dataset.phase;
    env.tick(30);assert.notEqual(a.root.dataset.phase,before);
    a.root.emit('pointerover',{pointerType:'mouse',target:a.root.children[0]});env.tick(120);assert.equal(a.root.children[0].dataset.active,'true');assert.equal(env.frames.size,0);
    const still=a.root.dataset.phase;env.tick(30);assert.equal(a.root.dataset.phase,still);
    a.root.emit('pointerleave');env.tick(90);assert.notEqual(a.root.dataset.phase,still);
    a.runtime.reset();assert.equal(env.frames.size,0);assert.equal(a.root.dataset.phase,'0.2200');env.tick(90);assert.equal(a.root.dataset.phase,'0.2200');
    a.runtime.update({speed:12});assert.equal(env.frames.size,0);a.runtime.resume();env.tick(30);assert.notEqual(a.root.dataset.phase,'0.2200');a.runtime.destroy();
});
test('drag, vertical touch cancellation, keyboard, offscreen and reduced motion retain correct state',()=>{
    const env=environment(),a=env.create({autoplay:false});
    a.root.emit('pointerdown',{pointerId:1,pointerType:'mouse',button:0,clientX:100,clientY:100});
    a.root.emit('pointermove',{pointerId:1,pointerType:'mouse',clientX:180,clientY:100});assert.equal(a.root.dataset.dragging,'true');assert.notEqual(a.root.dataset.phase,'0.2200');
    env.window.emit('pointerup',{pointerId:1});assert.equal(a.root.capture.size,0);assert.equal(a.root.dataset.dragging,undefined);
    const phase=a.root.dataset.phase;a.root.emit('click',{target:a.root.children[0],detail:1});assert.equal(a.root.dataset.phase,phase);assert.equal(env.frames.size,0,'drag release suppresses accidental click');
    a.root.emit('pointerdown',{pointerId:2,pointerType:'touch',button:0,clientX:100,clientY:100});a.root.emit('pointermove',{pointerId:2,pointerType:'touch',clientX:102,clientY:130});assert.equal(a.root.dataset.phase,phase);
    a.root.emit('keydown',{key:'Home'});assert.equal(a.root.dataset.phase,'0.2200');a.root.emit('keydown',{key:'ArrowRight'});assert.equal(a.root.dataset.phase,'0.4200');
    a.runtime.resume();env.tick(10);env.window.emit('blur');assert.equal(env.frames.size,0);env.window.emit('focus');assert.equal(env.frames.size,1);
    env.intersections[0].fn([{isIntersecting:false}]);assert.equal(env.frames.size,0);env.intersections[0].fn([{isIntersecting:true}]);assert.equal(env.frames.size,1);
    env.media.matches=true;env.media.emit('change');assert.equal(env.frames.size,0);a.root.emit('keydown',{key:'ArrowRight'});assert.equal(env.frames.size,0);a.runtime.destroy();
});
test('instances, parameter changes, remount and destroy clean up independent resources',()=>{
    const env=environment(),a=env.create(),b=env.create();a.runtime.pause();const still=a.root.dataset.phase;env.tick(30);assert.equal(a.root.dataset.phase,still);assert.notEqual(b.root.dataset.phase,still);
    a.runtime.update({count:24,palette:'vivid',speed:999,depth:NaN});assert.equal(a.root.children.length,24);assert.equal(a.runtime.getConfig().speed,24);assert.equal(a.runtime.getConfig().depth,36);
    assert.equal(a.root.children[0].style.background,env.api.palettes.vivid[0]);
    const old=a.runtime,replacement=env.api.mount(a.root,{autoplay:false});old.resume();assert.equal(a.root.children.length,17);replacement.destroy();b.runtime.destroy();
    assert.equal(env.frames.size,0);assert.ok(env.resizes.every(observer=>observer.disconnected));assert.ok(env.intersections.every(observer=>observer.disconnected));
    a.root.emit('keydown',{key:' '});assert.equal(env.frames.size,0);assert.equal(a.root.children.length,0);
});
test('delivery snapshots edited parameters without media dependencies and reset retains theme and tab',async()=>{
    const env=environment(),ids=new Map(),html=fs.readFileSync(directory+'index.html','utf8');
    for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
        const node=new Node();for(const key of ['min','max','value'])node[key]=tag[0].match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1];node.hidden=tag[0].includes(' hidden');ids.set(tag[1],node);
    }
    const themes=['light','dark'].map(theme=>{const node=new Node();node.dataset.stageTheme=theme;return node;});const tabs=new Node();ids.get('elliptical-gallery').dataset.appearance='light';
    Object.assign(env.document,{documentElement:{hasAttribute:()=>false},getElementById:id=>ids.get(id),querySelectorAll:()=>themes,querySelector:()=>tabs,createTextNode:text=>text});
    let delivery;
    Object.assign(env.context,{LibraryEllipticalGallery:env.api,LibraryDelivery:{read:async url=>fs.readFileSync(new URL(url).pathname.replace('/31Library/',''),'utf8'),register:options=>{delivery=options;return{refresh(){}};}},location:{href:'http://library.test/31Library/'+directory+'index.html'},URL});
    vm.runInContext(fs.readFileSync(directory+'app.js','utf8'),env.context);
    ids.get('count').value='21';ids.get('count').emit('input');ids.get('speed').value='12';ids.get('speed').emit('input');ids.get('palette').value='vivid';ids.get('palette').emit('change');themes[1].emit('click');ids.get('code-tab').emit('click');
    const pending=delivery.bundle();ids.get('speed').value='20';ids.get('speed').emit('input');const bundle=await pending;
    assert.match(bundle.js,/"count":21/);assert.match(bundle.js,/"speed":12/);assert.match(bundle.prompt,/12 度\/秒/);assert.match(bundle.prompt,/#f35b39/);assert.match(bundle.html,/data-appearance="dark"/);
    assert.doesNotMatch(bundle.html,/<img|main-shell|library-header|settings/);assert.doesNotMatch(bundle.css,/url\(/);new vm.Script(bundle.js);
    if(process.env.ELLIPTICAL_QA_DIR){
        const path=require('node:path'),out=process.env.ELLIPTICAL_QA_DIR;fs.mkdirSync(out,{recursive:true});
        const deliveryContext=vm.createContext({window:{},document:{currentScript:{src:'http://library.test/31Library/assets/delivery.js'}},URL,Blob,TextEncoder});vm.runInContext(fs.readFileSync('assets/delivery.js','utf8'),deliveryContext);
        const example=deliveryContext.window.LibraryDelivery.example(bundle,delivery.title);fs.writeFileSync(path.join(out,'index.html'),example);fs.writeFileSync(path.join(out,'two-instances.html'),example.replace(bundle.html,bundle.html+'\n'+bundle.html));
    }
    ids.get('reset').emit('click');assert.equal(ids.get('count').value,17);assert.equal(ids.get('preview-panel').dataset.theme,'dark');assert.equal(ids.get('code-panel').hidden,false);assert.equal(ids.get('elliptical-gallery').dataset.playing,'false');
});
