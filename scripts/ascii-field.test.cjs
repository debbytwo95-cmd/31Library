const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class NodeStub extends EventTarget {
    constructor() { super(); this.style = { setProperty() {} }; this.dataset = {}; this.attributes = {}; this.hidden = false; this.width = 128; this.height = 84; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 128, height: 84 }; }
    querySelector(selector) { return selector === 'canvas' ? this.canvas : null; }
    emit(name, values = {}) { const event = new Event(name, { cancelable: true }); Object.assign(event, values); this.dispatchEvent(event); return event; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
}
function environment(reduce = false) {
    const window = new NodeStub(), document = new NodeStub(), media = new NodeStub(), frames = new Map();
    let now = 0, next = 0, draws = 0;
    media.matches = reduce;
    function canvas() {
        const node = new NodeStub();
        const context = new Proxy({}, {
            get(target, key) {
                if (key === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
                if (key === 'drawImage') return () => { draws++; };
                return target[key] || (() => ({ addColorStop() {} }));
            },
            set(target, key, value) { target[key] = value; return true; }
        });
        node.getContext = () => context; return node;
    }
    document.createElement = canvas; document.hidden = false;
    const context = vm.createContext({ window, document, matchMedia: () => media, AbortController,
        performance: { now: () => now }, ResizeObserver: class { observe() {} disconnect() {} },
        requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id) });
    vm.runInContext(fs.readFileSync('single-web/motion-lab/ascii-field/effect.js', 'utf8'), context);
    function tick(count = 1) { for (let i = 0; i < count; i++) { now += 16; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now)); } }
    function root() { const node = new NodeStub(); node.canvas = canvas(); return node; }
    return { window, document, media, frames, context, tick, root, draws: () => draws, mount: window.mountAsciiField };
}

test('ASCII field stays idle, settles interaction, and cleans up independent instances', () => {
    const env = environment(), a = env.root(), b = env.root();
    const first = env.mount(a, { animate: false }), second = env.mount(b, { animate: false });
    assert.equal(env.frames.size, 0, 'the initial still frame has no idle RAF');
    first.update({ color: '#ff0000', seed: 23, pattern: 'waves' });
    assert.equal(second.getConfig().color, '#3f6bff');
    assert.equal(env.frames.size, 0, 'parameter edits do not start playback');
    for (const pattern of ['flow', 'waves', 'rings']) first.update({ pattern });
    a.emit('pointerenter', { pointerType: 'mouse', clientX: 60, clientY: 40 }); env.tick(160);
    assert.equal(env.frames.size, 0, 'a stationary lens stops redrawing after settling');
    a.emit('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 60 });
    a.emit('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 60, button: 0 });
    a.emit('pointerleave', { pointerType: 'mouse' }); env.tick(500);
    assert.equal(env.frames.size, 0, 'trail and click ring decay without an idle loop');
    first.play(); assert.equal(env.frames.size, 1); env.tick(3);
    first.reset(); assert.equal(env.frames.size, 0); assert.equal(first.getConfig().animate, false);
    first.destroy(); const before = env.draws();
    a.emit('pointermove', { pointerType: 'mouse', clientX: 30, clientY: 20 }); first.update({ cellSize: 18 }); first.play();
    assert.equal(env.frames.size, 0); assert.equal(env.draws(), before);
    second.destroy();
});

test('ASCII touch capture, cancellation, keyboard, visibility and reduced motion', () => {
    const env = environment(), root = env.root(), effect = env.mount(root, { animate: false });
    root.emit('pointermove', { pointerType: 'touch', pointerId: 7, clientX: 40, clientY: 30 });
    assert.equal(env.frames.size, 0, 'touch does not imitate hover');
    root.emit('pointerdown', { pointerType: 'touch', pointerId: 7, clientX: 40, clientY: 30 });
    assert.equal(root.capture, 7);
    root.emit('pointerup', { pointerType: 'touch', pointerId: 7 }); assert.equal(root.capture, null);
    env.tick(500); assert.equal(env.frames.size, 0);
    assert.equal(root.emit('keydown', { key: 'Enter' }).defaultPrevented, true);
    assert.equal(env.frames.size, 1); effect.reset();
    effect.play(); env.document.hidden = true; env.document.emit('visibilitychange'); assert.equal(env.frames.size, 0);
    env.document.hidden = false; env.document.emit('visibilitychange'); assert.equal(env.frames.size, 1);
    effect.update({ interactive: false }); assert.equal(root.attributes.tabindex, '-1');
    effect.reset(); root.emit('keydown', { key: ' ' }); assert.equal(env.frames.size, 0);
    effect.destroy();
    const reduced = environment(true), still = reduced.root(), safe = reduced.mount(still, { animate: true });
    still.emit('keydown', { key: 'Enter' }); assert.equal(reduced.frames.size, 0);
    still.emit('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 50, clientY: 30 });
    reduced.window.emit('blur'); assert.equal(still.capture, null); assert.equal(reduced.frames.size, 0); safe.destroy();
});

test('ASCII workbench delivers the edited parameters and executable isolated code', async () => {
    const env = environment(), ids = new Map(), html = fs.readFileSync('single-web/motion-lab/ascii-field/index.html', 'utf8');
    for (const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
        const node = tag[1] === 'ascii' ? env.root() : new NodeStub();
        for (const key of ['min', 'max', 'value']) node[key] = tag[0].match(new RegExp('\\b' + key + '="([^"]*)"'))?.[1];
        node.hidden = tag[0].includes(' hidden'); ids.set(tag[1], node);
    }
    const palette = [0, 1, 2, 3].map(index => { const node = ids.get('palette-' + index); node.dataset.palette = String(index); return node; });
    Object.assign(env.document, { activeElement: null, documentElement: { hasAttribute: () => false }, getElementById: id => { assert.ok(ids.has(id), id); return ids.get(id); }, querySelectorAll: () => palette });
    let options;
    Object.assign(env.context, { mountAsciiField: env.mount, mountLabWorkbench: value => { options = value; return { refresh() {} }; } });
    vm.runInContext(fs.readFileSync('single-web/motion-lab/ascii-field/app.js', 'utf8'), env.context);
    const savedDefaults = await options.bundle();
    for (const pair of ['"cellSize":9', '"scale":0.4', '"glow":0.53', '"twinkle":0.23', '"seed":28', '"animate":true']) assert.ok(savedDefaults.js.includes(pair), pair);
    assert.equal(ids.get('animate').checked, true);
    ids.get('animate').checked = false; ids.get('animate').emit('change');
    ids.get('pattern').value = 'rings'; ids.get('pattern').emit('change');
    ids.get('density').value = '.42'; ids.get('density').emit('input');
    ids.get('custom-background').checked = true; ids.get('custom-background').emit('change');
    ids.get('background').value = '#101020'; ids.get('background').emit('input');
    const bundle = await options.bundle();
    assert.match(bundle.js, /"pattern":"rings"/); assert.match(bundle.js, /"density":0.42/); assert.match(bundle.js, /"background":"#101020"/);
    assert.match(options.prompt(), /#101020/); assert.match(options.prompt(), /0.42/);
    assert.doesNotMatch(bundle.html + bundle.css, /main-shell|settings|library-header|#ascii\b/);
    const a = env.root(), b = env.root();
    env.document.querySelectorAll = () => [a, b];
    vm.runInContext(bundle.js, env.context);
    assert.equal(a.libraryComponent.getConfig().density, .42); assert.equal(b.libraryComponent.getConfig().background, '#101020');
    assert.equal(env.frames.size, 0);
    a.libraryComponent.update({ seed: 99 }); assert.equal(b.libraryComponent.getConfig().seed, 28);
    a.libraryComponent.destroy(); b.libraryComponent.destroy();
    ids.get('reset').emit('click'); assert.equal(ids.get('custom-background').checked, false); assert.equal(ids.get('density').value, .7);
    assert.equal(ids.get('animate').checked, false); assert.equal(ids.get('seed').value, 28); assert.equal(env.frames.size, 0);
});
