const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class NodeStub extends EventTarget {
    constructor() {
        super(); this.style = { setProperty(key, value) { this[key] = value; } }; this.classes = new Set(); this.children = {};
        this.classList = { toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key), remove: key => this.classes.delete(key), add: key => this.classes.add(key) };
        this.clientWidth = 400; this.clientHeight = 300; this.offsetWidth = 170;
    }
    querySelector(selector) { return this.children[selector] || null; }
    matches() { return false; }
    setPointerCapture() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
    emit(name, values = {}) { const event = new Event(name); Object.assign(event, values); this.dispatchEvent(event); }
    setAttribute(key,value) { this.attributes ||= {}; this.attributes[key] = value; }
    removeAttribute(key) { if (this.attributes) delete this.attributes[key]; }
    replaceChildren() {}
    querySelectorAll() { return []; }
    remove() {}
    cloneNode() {
        const clone = new NodeStub(); clone.className=this.className; clone.dataset={...this.dataset}; clone.style={...this.style}; clone.html=this.html;
        for(const [key,node] of Object.entries(this.children)) clone.children[key]=node.cloneNode();
        return clone;
    }
    get outerHTML() {
        const vars=Object.entries(this.style).filter(([key])=>key!=='setProperty').map(([key,value])=>key+':'+value).join(';');
        return '<div class="'+(this.className||'')+'" style="'+vars+'">'+(this.html||'')+'</div>';
    }
}
function environment(reduce = false) {
    const window = new NodeStub(), document = new NodeStub(), media = new NodeStub(), frames = new Map();
    let next = 0, now = 0; media.matches = reduce;
    const context = vm.createContext({ window, document, matchMedia: () => media, AbortController, performance: { now: () => now }, ResizeObserver: class { observe() {} disconnect() {} }, requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id) });
    function tick(count = 1) { for (let i = 0; i < count; i++) { now += 16; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now)); } }
    vm.runInContext(fs.readFileSync('assets/button-runtime.js', 'utf8'), context);
    return { context, window, document, media, frames, tick, buttons: window.LibraryButtons };
}
function magnetic() {
    const field = new NodeStub(), button = new NodeStub(), label = new NodeStub(), ripple = new NodeStub();
    field.children['.library-magnetic-button'] = button; field.children['.library-magnetic-ripple'] = ripple; button.children['.library-magnetic-label'] = label;
    return { field, button, label, ripple };
}
test('magnetic instances settle, cancel and destroy independently', () => {
    const env = environment(), a = magnetic(), b = magnetic();
    const first = env.buttons.mountMagnetic(a.field), second = env.buttons.mountMagnetic(b.field);
    assert.equal(env.frames.size, 0, 'initial state schedules no motion');
    a.field.emit('pointermove', { pointerType: 'mouse', clientX: 260, clientY: 150 }); env.tick(160);
    assert.notEqual(a.button.style.transform, b.button.style.transform);
    assert.match(b.button.style.transform, /translate\(0px,0px\) scale\(1\)/);
    a.field.emit('pointerleave'); env.tick(300);
    assert.equal(a.button.style.transform, b.button.style.transform); assert.equal(env.frames.size, 0);
    a.button.emit('keydown', { key: ' ', repeat: false }); env.tick(25);
    first.reset(); assert.match(a.button.style.transform, /scale\(1\)/);
    env.window.emit('blur'); env.tick(); assert.equal(env.frames.size, 0);
    first.destroy(); a.field.emit('pointermove', { pointerType: 'mouse', clientX: 280, clientY: 150 }); assert.equal(env.frames.size, 0);
    second.destroy();
});
test('touch does not simulate magnetic hover; reduced motion limits displacement', () => {
    const full = environment(), small = environment(true), a = magnetic(), b = magnetic();
    const first = full.buttons.mountMagnetic(a.field), second = small.buttons.mountMagnetic(b.field);
    a.field.emit('pointermove', { pointerType: 'touch', clientX: 260, clientY: 150 }); assert.equal(full.frames.size, 0);
    for (const [env, node] of [[full,a],[small,b]]) { node.field.emit('pointermove', { pointerType: 'mouse', clientX: 260, clientY: 150 }); env.tick(180); }
    const x = node => Number(node.style.transform.match(/translate\(([-.\d]+)px/)[1]);
    assert.ok(Math.abs(x(b.button)) < Math.abs(x(a.button)) * .2);
    first.destroy(); second.destroy();
});
test('icon instances release touch, cancellation and keyboard state', () => {
    const env = environment(), a = new NodeStub(), b = new NodeStub();
    const first = env.buttons.mountIcon(a), second = env.buttons.mountIcon(b);
    a.emit('pointerdown', { pointerType: 'touch', pointerId: 1 }); assert.ok(a.classes.has('is-active')); assert.equal(b.classes.size, 0);
    a.emit('pointerup', { pointerType: 'touch' }); assert.equal(a.classes.size, 0);
    a.emit('keydown', { key: ' ' }); assert.ok(a.classes.has('is-pressed'));
    a.emit('pointercancel'); assert.equal(a.classes.size, 0);
    a.emit('pointerenter', { pointerType: 'mouse' }); env.document.hidden = true; env.document.emit('visibilitychange'); assert.equal(a.classes.size, 0);
    first.destroy(); a.emit('pointerenter', { pointerType: 'mouse' }); assert.equal(a.classes.size, 0); second.destroy();
});
test('ZIP keeps binary resources and UTF-8 names; snippet omits document shell', async () => {
    const document = { currentScript: { src: 'http://localhost/31Library/assets/delivery.js' } }, window = {};
    vm.runInNewContext(fs.readFileSync('assets/delivery.js','utf8'), {document,window,URL,Blob,TextEncoder});
    const delivery = window.LibraryDelivery;
    const text = delivery.snippet({html:'<button class="example">OK</button>',css:'.example{color:red}',js:'const current=37;'});
    assert.doesNotMatch(text, /<!doctype|<body|<nav|workbench/i); assert.match(text, /current=37/);
    const blob = delivery.zip({'资源.txt':'保留参数', 'image.bin':new Uint8Array([0,255,32])});
    const bytes = new Uint8Array(await blob.arrayBuffer()), view = new DataView(bytes.buffer);
    assert.equal(view.getUint32(0,true),0x04034b50); assert.equal(view.getUint32(bytes.length-22,true),0x06054b50); assert.equal(view.getUint16(bytes.length-12,true),2);
    // Independently check payload bytes and the standard CRC-32 known vector.
    const crcBytes = new Uint8Array(await delivery.zip({'test.txt':'123456789'}).arrayBuffer());
    assert.equal(new DataView(crcBytes.buffer).getUint32(14,true),0xcbf43926);
});
test('fluid renderer preserves parameters and random widths without starting playback', () => {
    const env = environment();
    function canvas() {
        const node = new NodeStub();
        const context = new Proxy({}, { get(target,key) { return target[key] || (() => ({ addColorStop() {} })); }, set(target,key,value) { target[key]=value;return true; } });
        node.getContext = () => context; return node;
    }
    env.document.createElement = canvas;
    env.context.devicePixelRatio = 1;
    vm.runInContext(fs.readFileSync('single-web/motion-lab/fluid-glow/effect.js','utf8'),env.context);
    const first = env.window.mountFluidGlow(canvas()), second = env.window.mountFluidGlow(canvas());
    assert.equal(env.frames.size,0);
    first.update({params:{spacing:7.25,'offset-x':42},color:'#388cff',widthMode:'random',widthWeights:Array(18).fill(1.25)});
    const saved=first.getConfig(); assert.equal(saved.params.spacing,7.25); assert.equal(saved.params['offset-x'],42); assert.equal(saved.color,'#388cff'); assert.equal(saved.widthWeights[0],1.25);
    assert.equal(second.getConfig().params.spacing,3.35); assert.equal(env.frames.size,0);
    saved.params.spacing=99; assert.equal(first.getConfig().params.spacing,7.25);
    first.play(true); assert.equal(env.frames.size,1); env.tick(3); first.reset(); assert.equal(env.frames.size,0);
    first.destroy(); second.destroy(); assert.equal(env.frames.size,0);
});
test('workbench exports and prompts include edited parameters; reset preserves theme and tab', async () => {
    for (const name of ['magnetic-button','icon-button']) {
        const env=environment(), directory='single-web/components/'+name+'-studio/', html=fs.readFileSync(directory+'index.html','utf8');
        const ids=new Map();
        for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
            const node=new NodeStub(); node.dataset={}; node.id=tag[1];
            for(const key of ['min','max','value']) node[key]=tag[0].match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1];
            node.hidden=tag[0].includes(' hidden'); ids.set(tag[1],node);
        }
        const groups={};
        for(const key of ['preset','stage-theme']) groups['[data-'+key+']']=[...html.matchAll(new RegExp('data-'+key+'="([^"]+)"','g'))].map(match=>{const node=new NodeStub();node.dataset={[key==='preset'?'preset':'stageTheme']:match[1]};return node;});
        const tabs=new NodeStub();
        ids.get('toast').children.span=new NodeStub();
        Object.assign(env.document,{documentElement:{dataset:{}},getElementById:id=>{assert.ok(ids.has(id),'Missing real HTML control '+id);return ids.get(id);},querySelectorAll:selector=>groups[selector]||[],querySelector:selector=>selector==='.tabs'?tabs:null,createElement:()=>new NodeStub(),createTextNode:text=>text});
        const field=ids.get('field');
        if(name==='magnetic-button') {
            const button=ids.get('mag'),label=ids.get('mag-label'),ripple=ids.get('click-ripple');
            field.children={'.library-magnetic-button':button,'button':button,'.library-magnetic-label':label,'.library-magnetic-ripple':ripple}; button.children['.library-magnetic-label']=label;
        }
        const base='http://localhost/'+directory+'index.html'; let options;
        const delivery={read:async url=>fs.readFileSync(new URL(url).pathname.slice(1),'utf8'),fontCSS:async()=>'',register:value=>{options=value;return{refresh(){}};}};
        Object.assign(env.context,{LibraryButtons:env.buttons,LibraryDelivery:delivery,location:{href:base},URL,localStorage:{setItem(){}},clearTimeout,setTimeout});
        vm.runInContext(fs.readFileSync(directory+'app.js','utf8'),env.context);
        const key=name==='magnetic-button'?'radius':'duration',value=name==='magnetic-button'?195:735;
        ids.get(key).value=String(value); ids.get(key).emit('input');
        const bundle=await options.bundle();
        if(name==='magnetic-button') assert.match(bundle.js,/"radius":195/); else assert.match(bundle.html,/--duration:735ms/);
        assert.match(options.prompt(),new RegExp(String(value)+' (px|ms)'));
        assert.doesNotMatch(bundle.html,/main-shell|settings|library-header/);
        new vm.Script(bundle.js);
        groups['[data-stage-theme]'][1].emit('click'); ids.get('code-tab').emit('click'); ids.get('reset').emit('click');
        assert.equal(ids.get('preview-panel').dataset.theme,'dark'); assert.equal(ids.get('code-panel').hidden,false);
        assert.equal(Number(ids.get(key).value),name==='magnetic-button'?130:500);
    }
});
