const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
    constructor() { this.children=[];this.dataset={};this.listeners=new Map();this.style={setProperty(key,value){this[key]=value;}};this.rect={left:0,top:0,width:60,height:51,right:60,bottom:51}; }
    append(...nodes) { nodes.forEach(node=>{node.parent=this;this.children.push(node);}); }
    replaceChildren(...nodes) { this.children.forEach(node=>node.parent=null);this.children=[];this.append(...nodes); }
    setAttribute(key,value) { this[key]=value; }
    getBoundingClientRect() { return this.rect; }
    contains(node) { return !!node&&(node===this||this.children.some(child=>child.contains(node))); }
    closest(selector) { return this.className===selector.slice(1)?this:this.parent?.closest(selector); }
    querySelectorAll(selector) { return this.children.flatMap(child=>[...(child.className===selector.slice(1)?[child]:[]),...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0]; }
    addEventListener(type,fn,{signal}={}) { const set=this.listeners.get(type)||new Set();set.add(fn);this.listeners.set(type,set);signal?.addEventListener('abort',()=>set.delete(fn),{once:true}); }
    emit(type,data={}) { for(const fn of this.listeners.get(type)||[])fn({target:this,...data}); }
    animate() { const animation={cancel(){this.cancelled=true;},cancelled:false};this.animation=animation;return animation; }
}
function environment(reduce=false) {
    const window=new Element(),document=new Element(),media=new Element(),frames=new Map();let id=0,time=0;
    document.createElement=()=>new Element();document.createElementNS=()=>new Element();document.createTextNode=text=>Object.assign(new Element(),{textContent:text});media.matches=reduce;
    const context=vm.createContext({window,document,matchMedia:()=>media,AbortController,ResizeObserver:class{observe(){}disconnect(){}},performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key)});
    vm.runInContext(fs.readFileSync('single-web/components/text/direction-aware-selection-studio/effect.js','utf8'),context);
    return {context,window,document,media,frames,api:window.LibraryDirectionSelection,tick(){for(let i=0;i<400;i++){time+=16;const tasks=[...frames.values()];frames.clear();tasks.forEach(fn=>fn(time));}}};
}
const over=(root,word,x=1,y=25)=>root.emit('pointerover',{target:word,pointerType:'mouse',clientX:x,clientY:y});
test('closest entry edge distinguishes all four directions',()=>{
    const {api}=environment(),box={top:10,left:20,right:120,bottom:70};
    for(const [x,y,edge] of [[60,9,'top'],[121,40,'right'],[60,71,'bottom'],[19,40,'left']])assert.equal(api.entryEdge(box,x,y),edge);
});
test('idle instances stay still; real selection travels, settles and resets independently',()=>{
    const env=environment(),a=new Element(),b=new Element(),first=env.api.mount(a),second=env.api.mount(b);
    const words=a.querySelectorAll('.das-word'),other=b.querySelectorAll('.das-word');
    assert.deepEqual(words.map(word=>word.querySelector('.das-label').textContent),['Evelyn Gao','31Library']);assert.equal(env.frames.size,0);
    assert.equal(words[1].querySelector('.das-project-icon').src,'../../../../assets/icons/site-logo.png');assert.equal(a.querySelectorAll('.das-break').length,1);
    assert.equal(words[0].querySelector('.das-hint-text').textContent,'hover here');assert.equal(a.querySelectorAll('.das-fill').length,0);
    over(a,words[0]);assert.equal(words[0].dataset.entry,'left');assert.equal(other[0].dataset.selected,'false');
    words[1].rect={left:90,top:0,width:45,height:51,right:135,bottom:51};over(a,words[1],136,25);
    assert.equal(words[1].dataset.entry,'right');assert.ok(env.frames.size>0);env.tick();assert.equal(env.frames.size,0);
    assert.equal(a.querySelector('.das-frame').style.transform,'translate(80px,-6px)');
    a.emit('pointercancel');assert.equal(a.querySelector('.das-frame').style.opacity,'0');assert.equal(env.frames.size,0);
    first.destroy();second.destroy();
});
test('leaving and returning restores the frame and hint; update and remount clean old work',()=>{
    const env=environment(),root=new Element(),instance=env.api.mount(root),word=root.querySelector('.das-word');
    over(root,word);root.emit('pointerout',{target:word,relatedTarget:root,clientX:61,clientY:25});
    assert.equal(word.dataset.selected,'false');over(root,word);assert.equal(word.dataset.selected,'true');
    assert.equal(root.dataset.active,'true');assert.equal(root.querySelector('.das-frame').style.opacity,'1');
    root.emit('pointerleave');assert.equal(root.dataset.active,'false');assert.equal(root.querySelector('.das-frame').style.opacity,'0');
    instance.update({text:'Changed text',fontSize:50,color:'#bad-value'});
    assert.equal(root.style['--das-size'],'50px');assert.equal(root.style['--das-color'],'#3074fe');assert.equal(root.querySelector('.das-frame').style.opacity,'0');
    const oldWord=root.querySelector('.das-word'),replacement=env.api.mount(root);
    over(root,oldWord);assert.equal(env.frames.size,0);assert.equal(root.querySelector('.das-frame').style.opacity,'0');replacement.destroy();
    assert.ok([...root.listeners.values()].every(set=>set.size===0));
});
test('touch does not emulate hover; reduced motion, blur and destroy leave no animation',()=>{
    const env=environment(true),root=new Element(),instance=env.api.mount(root),word=root.querySelector('.das-word');
    root.emit('pointerover',{target:word,pointerType:'touch'});assert.equal(word.dataset.selected,'false');
    root.emit('click',{target:word});assert.equal(word.dataset.selected,'true');assert.equal(env.frames.size,0);assert.equal(root.querySelector('.das-frame').animation,undefined);
    root.emit('keydown',{key:'Escape'});assert.equal(word.dataset.selected,'false');
    root.emit('focusin',{target:word});env.window.emit('blur');assert.equal(word.dataset.selected,'false');
    root.emit('focusin',{target:word});env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(word.dataset.selected,'false');
    instance.destroy();root.emit('click',{target:word});assert.equal(root.children.length,0);assert.equal(env.frames.size,0);
});
test('deliveries snapshot edited values before reading, embed assets and safely preserve arbitrary text',async()=>{
    const env=environment(),{document,context}=env,base='http://library.test/31Library/';
    const directory='single-web/components/text/direction-aware-selection-studio/';
    Object.assign(context,{URL,Blob,TextEncoder,btoa,location:new URL(base+directory+'index.html'),fetch:async url=>{
        const data=fs.readFileSync(decodeURIComponent(new URL(url).pathname.replace('/31Library/','')));
        return {ok:true,text:async()=>data.toString('utf8'),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
    }});
    const nodes={};
    for(const id of ['direction-selection','preview-panel','code-panel','preview-tab','code-tab','text','name','project','hint','fontSize','fontSize-output','duration','duration-output','bounce','bounce-output','padding','padding-output','color','showSize','reset'])nodes[id]=new Element();
    nodes['direction-selection'].dataset.appearance='light';nodes.fontSize.min=16;nodes.fontSize.max=72;nodes.duration.min=100;nodes.duration.max=1000;nodes.bounce.min=0;nodes.bounce.max=.4;nodes.padding.min=4;nodes.padding.max=20;
    document.getElementById=id=>nodes[id];document.createTextNode=text=>Object.assign(new Element(),{textContent:text});document.documentElement={hasAttribute:()=>false};
    document.querySelector=()=>new Element();document.querySelectorAll=()=>[];
    document.currentScript={src:base+'assets/delivery.js'};
    vm.runInContext(fs.readFileSync('assets/delivery.js','utf8'),context);
    let options;env.window.LibraryDelivery.register=value=>{options=value;return{refresh(){}};};
    context.LibraryDelivery=env.window.LibraryDelivery;context.LibraryDirectionSelection=env.api;
    vm.runInContext(fs.readFileSync(directory+'app.js','utf8'),context);
    nodes.text.value='Changed </script> 你好';nodes.text.emit('input');nodes.fontSize.value=52;nodes.fontSize.emit('input');
    nodes.color.value='#7c3aed';nodes.color.emit('input');nodes.showSize.checked=false;nodes.showSize.emit('change');
    const pending=options.bundle();nodes.text.value='Later';nodes.text.emit('input');
    const bundle=await pending;
    assert.match(bundle.js,/"text":"Changed <\/script> 你好"/);assert.match(bundle.js,/"fontSize":52/);assert.match(bundle.js,/"color":"#7c3aed"/);assert.match(bundle.js,/"showSize":false/);
    assert.match(bundle.css,/data:font\/ttf;base64/);assert.match(bundle.css,/Inter font license/);assert.match(bundle.css,/Caveat font license/);assert.doesNotMatch(bundle.css,/url\(['"]?\.\.?\//);
    assert.match(bundle.js,/data:image\/png;base64,/);assert.doesNotMatch(bundle.js,/\.\.\/\.\.\/\.\.\/\.\.\/assets\/icons\/site-logo\.png/);
    const snippet=env.window.LibraryDelivery.snippet(bundle),example=env.window.LibraryDelivery.example(bundle,options.title);
    assert.match(snippet,/<\\\/script> 你好/);assert.doesNotMatch(bundle.html,/library-header|main-shell|settings/);
    assert.match(example,/<!doctype html>/);assert.match(options.prompt(),/Later/);assert.match(options.prompt(),/52 px/);
    const js=example.match(/<script>([\s\S]*?)<\/script>/)[1];
    const exported=environment(),a=new Element(),b=new Element();exported.document.querySelectorAll=()=>[a,b];
    exported.context.LibraryDirectionSelection=exported.api;vm.runInContext(js,exported.context);
    assert.equal(a.querySelector('.das-word').children[0].textContent,'Changed');assert.equal(a.style['--das-size'],'52px');
    over(a,a.querySelector('.das-word'));assert.equal(b.querySelector('.das-word').dataset.selected,'false');
    a.libraryComponent.destroy();b.libraryComponent.destroy();
    if(process.env.DAS_EXAMPLE_PATH)fs.writeFileSync(process.env.DAS_EXAMPLE_PATH,example);
});
