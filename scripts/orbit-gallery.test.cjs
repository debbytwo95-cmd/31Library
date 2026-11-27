const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const directory = 'single-web/components/gallery/orbit-gallery-studio/';

class Element {
    constructor(tag = 'div') {
        this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.listeners = new Map(); this.animations = [];
        this.style = { setProperty(key,value) { this[key] = value; }, removeProperty(key) { delete this[key]; } };
        this.classList = { toggle() {} }; this.width = 900; this.height = 560;
    }
    addEventListener(name,fn) { const handlers = this.listeners.get(name) || []; handlers.push(fn); this.listeners.set(name,handlers); }
    removeEventListener(name,fn) { this.listeners.set(name,(this.listeners.get(name) || []).filter(handler => handler !== fn)); }
    emit(name,props = {}) {
        const event = { target:this, button:0, pointerId:1, pointerType:'mouse', clientX:0, clientY:0, defaultPrevented:false, preventDefault() { this.defaultPrevented = true; }, ...props };
        (this.listeners.get(name) || []).forEach(fn => fn(event)); return event;
    }
    setAttribute(key,value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; }
    append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
    replaceChildren(...nodes) { this.children.forEach(node => { node.parent = null; }); this.children = []; this.append(...nodes); }
    insertBefore(node,before) { node.parent = this; this.children.splice(this.children.indexOf(before),0,node); }
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this),1); this.parent = null; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    closest(selector) { return this.className === selector.slice(1) ? this : this.parent?.closest(selector) || null; }
    getBoundingClientRect() { return { width:this.width, height:this.height, left:0, top:0 }; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; this.emit('lostpointercapture'); }
    focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
    animate() { const animation = { cancelled:false, cancel() { this.cancelled = true; } }; this.animations.push(animation); return animation; }
    getAnimations() { return this.animations.filter(animation => !animation.cancelled); }
}
function environment(reduce = false) {
    const window = new Element(), document = new Element(), media = new Element(), frames = new Map();
    let now = 0, next = 0, disconnected = 0;
    media.matches = reduce; document.createElement = tag => { const node = new Element(tag); node.ownerDocument = document; return node; };
    const context = vm.createContext({ window,document,matchMedia:() => media,performance:{ now:() => now },
        requestAnimationFrame:fn => { frames.set(++next,fn); return next; }, cancelAnimationFrame:id => frames.delete(id),
        ResizeObserver:class { observe() {} disconnect() { disconnected++; } }
    });
    vm.runInContext(fs.readFileSync(directory + 'effect.js','utf8'),context);
    function tick(count = 1) { for (let i = 0; i < count; i++) { now += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); } }
    const root = () => { const node = new Element(); node.ownerDocument = document; return node; };
    return { window,document,media,frames,context,tick,root,api:window.LibraryOrbitGallery,disconnected:() => disconnected };
}
const items = [{ src:'image-a.jpg',title:'A' },{ src:'image-b.jpg',title:'B' }];
const cards = root => root.children.filter(node => node.className === 'orbit-card');

test('idle is still; pointer feedback settles and multiple instances remain independent', () => {
    const env = environment(), a = env.root(), b = env.root();
    const first = env.api.mount(a,{},items), second = env.api.mount(b,{},items);
    const initial = cards(a)[0].style.transform;
    assert.equal(env.frames.size,0);
    a.emit('pointermove',{ clientX:800,clientY:100 }); env.tick(120);
    assert.notEqual(cards(a)[0].style.transform,initial); assert.equal(cards(b)[0].style.transform,initial); assert.equal(env.frames.size,0);
    a.emit('pointerleave'); env.tick(120); assert.equal(cards(a)[0].style.transform,initial); assert.equal(env.frames.size,0);
    a.emit('keydown',{key:'ArrowRight'}); env.tick(120); assert.notEqual(cards(a)[0].style.transform,initial);
    first.reset(); assert.equal(cards(a)[0].style.transform,initial);
    first.destroy(); a.emit('pointermove',{clientX:100}); assert.equal(env.frames.size,0); second.destroy();
    assert.equal(env.disconnected(),2);
});

test('click, close button and Escape restore all cards and focus; cancellation clears capture', () => {
    const env = environment(), root = env.root(), instance = env.api.mount(root,{},items);
    const card = cards(root)[3], close = root.children.find(node => node.className === 'orbit-close');
    root.emit('click',{target:card}); assert.equal(card.getAttribute('aria-expanded'),'true'); assert.equal(close.hidden,false);
    assert.ok(cards(root).filter(other => other !== card).every(other => other.style.opacity === '.055' || other.style.opacity === '0.055'));
    root.emit('click',{target:close}); assert.equal(close.hidden,true); assert.ok(cards(root).every(other => other.getAttribute('aria-expanded') === 'false'));
    root.emit('click',{target:card}); root.emit('keydown',{key:'Escape'}); assert.equal(close.hidden,true);
    root.emit('pointerdown',{clientX:80,clientY:100}); root.emit('pointermove',{clientX:180,clientY:100}); assert.equal(root.dataset.dragging,'true');
    root.emit('pointercancel'); env.tick(150); assert.equal(root.dataset.dragging,'false'); assert.equal(root.capture,null); assert.equal(env.frames.size,0);
    root.emit('click',{target:card,detail:0}); assert.equal(card.getAttribute('aria-expanded'),'true','keyboard click after a cancelled pointer must work immediately');
    instance.destroy();
});

test('wheel requires focus; touch hover and reduced motion start no continuous animation', () => {
    const env = environment(), root = env.root(), instance = env.api.mount(root,{},items);
    root.emit('pointermove',{pointerType:'touch',clientX:800}); assert.equal(env.frames.size,0);
    assert.equal(root.emit('wheel',{deltaY:100,deltaX:0}).defaultPrevented,false);
    root.focus(); assert.equal(root.emit('wheel',{deltaY:100,deltaX:0}).defaultPrevented,true); env.tick(150); assert.equal(env.frames.size,0);
    env.media.matches = true; env.media.emit('change');
    root.emit('pointermove',{clientX:800}); root.emit('keydown',{key:'ArrowRight'}); assert.equal(env.frames.size,0);
    root.emit('click',{target:cards(root)[0]}); assert.ok(cards(root).every(card => card.getAnimations().length === 0));
    instance.destroy();
});

test('reconfiguration, repeated mount and destroy do not retain listeners or animations', () => {
    const env = environment(), root = env.root(), first = env.api.mount(root,{},items);
    first.update({count:24,size:120}); assert.equal(cards(root).length,24); assert.equal(first.getConfig().size,120);
    const snapshot = first.getConfig(); snapshot.size = 50; assert.equal(first.getConfig().size,120);
    env.api.mount(root,{count:6},items); assert.equal(cards(root).length,6); assert.equal(env.disconnected(),1);
    root.emit('keydown',{key:'ArrowRight'}); assert.equal(env.frames.size,1);
    const second = env.api.mount(root,{},items); assert.equal(env.frames.size,0); second.destroy();
    assert.equal(root.children.length,0); assert.equal(root.getAttribute('tabindex'),null);
    assert.ok([...root.listeners.values()].every(listeners => listeners.length === 0));
});

test('perspective stays finite at parameter limits and narrow dimensions', () => {
    const { api } = environment();
    const config = api.normalize({count:Infinity,size:999,depth:999,spread:NaN,duration:-5});
    assert.equal(config.count,18); assert.equal(config.size,130); assert.equal(config.depth,80); assert.equal(config.spread,82); assert.equal(config.duration,150);
    for (const width of [240,375,900,1440]) for (const yaw of [-12,0,12]) for (let index = 0; index < 24; index++) {
        const p = api.project(index,{...config,count:24},yaw,.65,width,440);
        assert.ok(Object.values(p).every(Number.isFinite)); assert.ok(p.width > 0 && p.height > 0);
    }
});

test('delivery captures edited parameters before I/O and embeds every local resource', async () => {
    const env = environment(), nodes = new Map();
    const html = fs.readFileSync(directory + 'index.html','utf8');
    for (const match of html.matchAll(/id="([^"]+)"/g)) nodes.set(match[1],env.root());
    nodes.get('orbit-gallery').dataset.appearance = 'light'; nodes.get('preview-panel').dataset.theme = 'light';
    for (const key of Object.keys(env.api.defaults)) { nodes.get(key).min = 0; nodes.get(key).max = 1200; }
    const tabs = env.root(); env.document.getElementById = id => nodes.get(id);
    env.document.querySelector = () => tabs; env.document.querySelectorAll = () => []; env.document.documentElement = { hasAttribute:() => false };
    env.document.createTextNode = text => Object.assign(new Element('text'),{ textContent:String(text) });
    let options;
    const location = { href:'http://library.test/31Library/' + directory + 'index.html' };
    env.context.location = location; env.context.URL = URL; env.context.btoa = value => Buffer.from(value,'binary').toString('base64');
    env.context.LibraryOrbitGallery = env.api;
    env.context.LibraryDelivery = { register(value) { options = value; return { refresh() {} }; },
        async read(url,binary) { const relative = new URL(url).pathname.replace('/31Library/',''); const data = fs.readFileSync(path.resolve(relative)); return binary ? data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) : data.toString('utf8'); },
        fontCSS:async () => '/* Inter SIL OFL */ @font-face{font-family:LibraryButtonInter;src:url(data:font/ttf;base64,AA==)}'
    };
    vm.runInContext(fs.readFileSync(directory + 'app.js','utf8'),env.context);
    nodes.get('size').emit('input',{target:{value:'110'}}); nodes.get('count').emit('input',{target:{value:'12'}});
    const pending = options.bundle(); nodes.get('size').emit('input',{target:{value:'90'}});
    const bundle = await pending;
    assert.match(bundle.js,/"size":110/); assert.match(bundle.js,/"count":12/); assert.match(bundle.prompt,/110 px/);
    assert.match(options.prompt(),/90 px/); assert.match(bundle.css,/data:font\/ttf;base64/);
    assert.equal((bundle.js.match(/data:image\//g) || []).length,11);
    assert.doesNotMatch(bundle.html,/main-shell|library-header|id=/); assert.doesNotMatch(bundle.js,/G:\\|C:\\|AppData|\/31Library\/assets/);
    assert.ok(!bundle.css.includes('../../')); assert.match(bundle.js,/cdn.sanity.io/);
});
