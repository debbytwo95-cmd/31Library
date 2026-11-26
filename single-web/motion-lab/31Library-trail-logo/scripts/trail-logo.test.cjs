const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const directory = 'single-web/motion-lab/trail-logo/';
class NodeStub extends EventTarget {
    constructor() { super(); this.style = { setProperty(key, value) { this[key] = value; } }; this.dataset = {}; this.attributes = {}; this.hidden = false; this.clientWidth = 640; this.clientHeight = 360; this.children = {}; }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; }
    getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
    querySelector(selector) { return this.children[selector] || null; }
    appendChild(node) { return node; }
    emit(name, values = {}) { const event = new Event(name, { cancelable: true }); Object.assign(event, values); this.dispatchEvent(event); return event; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
}
// A 2D context that measures text and returns a filled block, enough to build a distance field.
function context2d(canvas) {
    const state = { font: '600 200px Inter' };
    const size = () => Number((state.font.match(/([\d.]+)px/) || [0, 100])[1]);
    const api = {
        measureText: text => ({ width: Array.from(text).length * size() * .6, actualBoundingBoxLeft: 0, actualBoundingBoxRight: size() * .55, actualBoundingBoxAscent: size() * .72, actualBoundingBoxDescent: /[gjpqy]/.test(text) ? size() * .2 : 0 }),
        getImageData: (x, y, w, h) => {
            const data = new Uint8ClampedArray(w * h * 4);
            for (let j = Math.floor(h * .3); j < h * .7; j++) for (let i = Math.floor(w * .2); i < w * .8; i++) data[(j * w + i) * 4 + 3] = (i + j) % 7 ? 255 : 128;
            return { data };
        }
    };
    return new Proxy(api, {
        get(target, key) { if (key in target) return target[key]; if (key in state) return state[key]; return () => {}; },
        set(target, key, value) { state[key] = value; return true; },
        has(target, key) { return key === 'letterSpacing' || key in target; }
    });
}
function canvasStub() { const node = new NodeStub(); node.getContext = type => type === '2d' ? (node.context ||= context2d(node)) : null; return node; }
function environment(reduce = false) {
    const window = new NodeStub(), document = new NodeStub(), media = new NodeStub(), frames = new Map();
    let now = 0, next = 0;
    media.matches = reduce; document.hidden = false; document.createElement = canvasStub; window.devicePixelRatio = 1;
    const context = vm.createContext({ window, document, matchMedia: () => media, AbortController, console, setTimeout, clearTimeout,
        performance: { now: () => now }, ResizeObserver: class { observe() {} disconnect() {} }, IntersectionObserver: class { observe() {} disconnect() {} },
        requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id) });
    vm.runInContext(fs.readFileSync(directory + 'effect.js', 'utf8'), context);
    function tick(count = 1) { for (let i = 0; i < count; i++) { now += 16; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now)); } }
    function root() { const node = new NodeStub(); node.children.canvas = canvasStub(); node.children['.library-trail-logo-hud'] = canvasStub(); return node; }
    return { window, document, media, frames, context, tick, root, mount: context.mountTrailLogo };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('trail logo starts still, plays only on request and resets to the still frame', async () => {
    const env = environment(), a = env.root(), b = env.root();
    const first = env.mount(a), second = env.mount(b, { speed: 9, color: 'blue', text: '  31   Library  '.repeat(4) });
    await settle();
    assert.equal(a.dataset.ready, 'true'); assert.equal(a.dataset.renderer, 'Canvas 2D', 'without WebGL2 the still fallback renders');
    assert.equal(env.frames.size, 0, 'the initial still frame has no idle RAF');
    const c = second.getConfig();
    assert.equal(c.speed, 2.5); assert.equal(c.color, '#5990df'); assert.ok(c.text.length <= 24 && !/\s{2}/.test(c.text));
    first.update({ sway: 1.4, gloss: 0 });
    assert.equal(first.getConfig().sway, 1.4); assert.equal(second.getConfig().sway, 1);
    assert.equal(env.frames.size, 0, 'parameter edits do not start playback');
    first.play(true); assert.equal(first.isPlaying(), true); assert.equal(a.dataset.state, 'playing'); assert.equal(env.frames.size, 1);
    env.tick(5); assert.equal(env.frames.size, 1, 'playback keeps scheduling frames');
    first.play(false); env.tick(2); assert.equal(env.frames.size, 0, 'pausing stops the loop');
    first.play(true); first.reset();
    assert.equal(first.isPlaying(), false); assert.equal(a.dataset.state, 'still'); assert.equal(env.frames.size, 0);
    first.destroy(); second.destroy();
});

test('pointer drag settles back, touch never imitates hover, and destroy removes listeners', async () => {
    const env = environment(), root = env.root(), effect = env.mount(root);
    await settle();
    root.emit('pointermove', { pointerType: 'touch', pointerId: 3, clientX: 200, clientY: 150 });
    assert.equal(env.frames.size, 0, 'touch move without press is ignored');
    root.emit('pointerenter', { pointerType: 'mouse', clientX: 200, clientY: 150 });
    root.emit('pointermove', { pointerType: 'mouse', clientX: 420, clientY: 120 });
    assert.equal(env.frames.size, 1, 'a real pointer move wakes the renderer');
    env.tick(20); root.emit('pointerleave', { pointerType: 'mouse' });
    env.tick(240); assert.equal(env.frames.size, 0, 'the drag trail retracts and the loop stops');
    root.emit('pointerdown', { pointerType: 'touch', pointerId: 5, clientX: 100, clientY: 100 });
    assert.equal(root.capture, 5);
    root.emit('pointermove', { pointerType: 'touch', pointerId: 5, clientX: 300, clientY: 100 });
    root.emit('pointerup', { pointerType: 'touch', pointerId: 5 }); assert.equal(root.capture, null);
    env.tick(240); assert.equal(env.frames.size, 0);
    root.emit('pointerenter', { pointerType: 'mouse', clientX: 10, clientY: 10 }); root.emit('pointermove', { pointerType: 'mouse', clientX: 90, clientY: 30 });
    env.window.emit('blur'); env.tick(240); assert.equal(env.frames.size, 0, 'window blur releases the pointer');
    effect.update({ pointer: 0 }); root.emit('pointermove', { pointerType: 'mouse', clientX: 50, clientY: 50 });
    assert.equal(env.frames.size, 0, 'pointer strength 0 disables dragging');
    effect.destroy();
    root.emit('pointermove', { pointerType: 'mouse', clientX: 30, clientY: 20 }); effect.play(true);
    assert.equal(env.frames.size, 0, 'a destroyed instance ignores input and playback');
});

test('workbench delivery carries the edited parameters and excludes the site shell', async () => {
    const env = environment(), html = fs.readFileSync(directory + 'index.html', 'utf8'), ids = new Map();
    for (const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
        const node = tag[1] === 'trail-logo' ? env.root() : new NodeStub();
        node.id = tag[1];
        for (const key of ['min', 'max', 'value']) node[key] = tag[0].match(new RegExp('\\b' + key + '="([^"]*)"'))?.[1];
        node.checked = tag[0].includes(' checked'); ids.set(tag[1], node);
    }
    let options;
    Object.assign(env.document, { documentElement: { hasAttribute: () => false }, activeElement: null, getElementById: id => { assert.ok(ids.has(id), 'Missing real HTML control ' + id); return ids.get(id); } });
    Object.assign(env.context, { mountLabWorkbench: value => { options = value; return { refresh() {} }; }, LibraryDelivery: { fontCSS: async () => '@font-face{font-family:LibraryButtonInter}' } });
    vm.runInContext(fs.readFileSync(directory + 'app.js', 'utf8'), env.context);
    await settle();
    assert.equal(ids.get('state').textContent, '静态回退 · Canvas 2D');
    ids.get('speed').value = '1.75'; ids.get('speed').emit('input');
    ids.get('color').value = '#ff5c37'; ids.get('color').emit('input');
    ids.get('text').value = 'Northwind'; ids.get('text').emit('input');
    const bundle = await options.bundle();
    assert.match(bundle.js, /"speed":1.75/); assert.match(bundle.js, /"color":"#ff5c37"/); assert.match(bundle.js, /"text":"Northwind"/);
    assert.match(bundle.js, /LibraryTrailLogoInter/); assert.match(bundle.css, /font-family:LibraryTrailLogoInter/);
    assert.match(options.prompt(), /"speed":1.75/); assert.match(options.prompt(), /#ff5c37/);
    assert.doesNotMatch(bundle.html, /main-shell|settings|library-header|id="/);
    new vm.Script(bundle.js);
    ids.get('play').emit('click'); assert.equal(ids.get('play').attributes['aria-pressed'], 'true');
    options.clear(); assert.equal(ids.get('play').attributes['aria-pressed'], 'false', 'opening the code tab pauses playback');
    ids.get('play').emit('click'); ids.get('reset').emit('click');
    assert.equal(Number(ids.get('speed').value), 1); assert.equal(ids.get('text').value, '31Library');
    assert.equal(ids.get('play').attributes['aria-pressed'], 'false'); assert.equal(env.frames.size, 0);
});
