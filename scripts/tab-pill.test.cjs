const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const directory = 'single-web/components/tabs/tab-pill-studio/';

class Node extends EventTarget {
    constructor() {
        super(); this.attributes = {}; this.style = { setProperty(key, value) { this[key] = value; } };
        this.dataset = {}; this.classList = { toggle() {} }; this.offsetLeft = 0; this.offsetWidth = 100;
    }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    removeAttribute(key) { delete this.attributes[key]; }
    focus() { this.focused = true; }
    emit(type, values = {}) {
        const event = new Event(type, { cancelable: true });
        for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value });
        this.dispatchEvent(event); return event;
    }
}
function markup() {
    const root = new Node(), bar = new Node(), pill = new Node();
    const tabs = Array.from({ length: 4 }, (_, i) => Object.assign(new Node(), { offsetLeft: 4 + i * 80, offsetWidth: 80 }));
    const panels = tabs.map(() => new Node());
    root.querySelector = selector => selector.endsWith('-bar') ? bar : pill;
    root.querySelectorAll = selector => selector.endsWith('-tab') ? tabs : panels;
    return { root, bar, pill, tabs, panels };
}
function environment(reduce = false) {
    const window = new Node(), document = new Node(), media = new Node(), frames = new Map(), observers = [];
    let now = 0, id = 0; media.matches = reduce;
    window.matchMedia = () => media;
    const context = vm.createContext({ window, document, AbortController, performance: { now: () => now },
        requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
        ResizeObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
    });
    vm.runInContext(fs.readFileSync(directory + 'effect.js', 'utf8'), context);
    const tick = (count = 1) => { for (let n = 0; n < count; n++) { now += 16; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now)); } };
    return { window, document, media, frames, context, observers, tick, mount: window.LibraryTabPill.mount };
}

test('edge springs stretch, reverse smoothly, settle, and leave other instances independent', () => {
    const env = environment(), a = markup(), b = markup(), changes = [];
    const one = env.mount(a.root, { onChange: index => changes.push(index) }), two = env.mount(b.root);
    assert.equal(env.frames.size, 0, 'no initial animation or autoplay');
    assert.notEqual(a.tabs[0].id, b.tabs[0].id);
    assert.equal(a.tabs[0].attributes['aria-controls'], a.panels[0].id);
    a.tabs[3].emit('click'); env.tick(5);
    assert.equal(one.selectedIndex, 3); assert.equal(two.selectedIndex, 0);
    assert.ok(parseFloat(a.pill.style.width) > 80, 'leading edge moves faster than the trailing edge');
    const inFlight = a.pill.style.transform;
    a.tabs[1].emit('click'); assert.equal(a.pill.style.transform, inFlight, 'interruption preserves current position');
    env.tick(400);
    assert.equal(a.pill.style.transform, 'translateX(84.000px)');
    assert.equal(a.pill.style.width, '80.000px'); assert.equal(env.frames.size, 0);
    assert.equal(b.pill.style.transform, 'translateX(4.000px)');
    assert.deepEqual(changes, [3, 1]);
    one.destroy(); two.destroy();
});

test('keyboard navigation wraps, maintains roving focus and associated panel state', () => {
    const env = environment(), a = markup(), instance = env.mount(a.root);
    const key = key => a.bar.emit('keydown', { key, target: a.tabs[instance.selectedIndex] });
    assert.equal(key('ArrowLeft').defaultPrevented, true); assert.equal(instance.selectedIndex, 3);
    assert.equal(a.tabs[3].tabIndex, 0); assert.equal(a.tabs[0].tabIndex, -1); assert.equal(a.panels[3].hidden, false);
    key('ArrowRight'); assert.equal(instance.selectedIndex, 0);
    key('End'); assert.equal(instance.selectedIndex, 3); key('Home'); assert.equal(instance.selectedIndex, 0);
    instance.select(-1); instance.select(4); assert.equal(instance.selectedIndex, 0);
    instance.destroy();
});

test('reduced motion, reflow, blur, reset and destroy stop pending work', () => {
    const env = environment(true), a = markup(), instance = env.mount(a.root);
    instance.select(3); assert.equal(env.frames.size, 0); assert.equal(a.pill.style.transform, 'translateX(244.000px)');
    env.media.matches = false; instance.select(2); env.tick(2); assert.equal(env.frames.size, 1);
    env.window.emit('blur'); assert.equal(env.frames.size, 0); assert.equal(instance.selectedIndex, 2);
    a.tabs[2].offsetLeft = 140; a.tabs[2].offsetWidth = 60; env.observers[0].callback();
    assert.equal(a.pill.style.transform, 'translateX(140.000px)'); assert.equal(a.pill.style.width, '60.000px');
    instance.select(1); env.media.matches = true; env.media.emit('change'); assert.equal(env.frames.size, 0);
    instance.reset(); assert.equal(instance.selectedIndex, 0); assert.equal(env.frames.size, 0);
    env.media.matches = false; instance.select(3); instance.destroy();
    assert.equal(env.frames.size, 0); assert.equal(env.observers[0].disconnected, true);
    a.tabs[1].emit('click'); assert.equal(instance.selectedIndex, 3); assert.equal(env.frames.size, 0);
});

test('supported parameter extremes remain finite and settle even at high simulation speed', () => {
    for (const config of [
        { leadStiffness: 1000, leadDamping: 15, trailStiffness: 400, trailDamping: 8, timeScale: 4 },
        { leadStiffness: 300, leadDamping: 60, trailStiffness: 80, trailDamping: 40, timeScale: .25 }
    ]) {
        const env = environment(), a = markup(), instance = env.mount(a.root, config);
        instance.select(3); env.tick(3000);
        assert.equal(a.pill.style.transform, 'translateX(244.000px)');
        assert.equal(a.pill.style.width, '80.000px'); assert.equal(env.frames.size, 0);
        instance.destroy();
    }
});

test('workbench exports current parameters and theme, excludes slow mode, and resets without changing theme or code tab', async () => {
    const env = environment(), a = markup(), nodes = {};
    const keys = ['leadStiffness', 'leadDamping', 'trailStiffness', 'trailDamping'];
    for (const id of ['preview-panel', 'code-panel', 'preview-tab', 'code-tab', 'reset', 'slow-control', 'speed-label', ...keys, ...keys.map(key => key + '-output')]) nodes[id] = new Node();
    nodes['tab-pill'] = a.root; a.root.dataset.appearance = 'light';
    const themes = ['light', 'dark'].map(theme => { const node = new Node(); node.dataset.stageTheme = theme; return node; });
    env.document.documentElement = { hasAttribute: () => false };
    env.document.getElementById = id => nodes[id];
    env.document.querySelectorAll = () => themes;
    env.document.querySelector = () => new Node();
    let delivery;
    env.context.LibraryTabPill = env.window.LibraryTabPill;
    env.context.location = { href: 'http://library.test/31Library/' + directory + 'index.html' };
    env.context.URL = URL;
    env.context.LibraryDelivery = {
        register(options) { delivery = options; return { refresh() {} }; },
        fontCSS: async () => '/* embedded font and license */',
        read: async (url, binary) => {
            const filename = new URL(url).pathname.replace('/31Library/', '');
            const data = fs.readFileSync(filename);
            return binary ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data.toString('utf8');
        }
    };
    const clone = markup();
    Object.defineProperty(clone.root, 'outerHTML', { get: () => '<div class="library-tab-pill" data-appearance="' + clone.root.dataset.appearance + '"></div>' });
    a.root.cloneNode = () => { clone.root.dataset = { ...a.root.dataset }; return clone.root; };
    vm.runInContext(fs.readFileSync(directory + 'app.js', 'utf8'), env.context);
    nodes.leadStiffness.emit('input', { target: { value: '870' } });
    themes[1].emit('click'); nodes['slow-control'].emit('click');
    assert.match(delivery.prompt(), /870/); assert.match(delivery.prompt(), /dark/);
    const pending = delivery.bundle();
    nodes.leadStiffness.emit('input', { target: { value: '880' } });
    const bundle = await pending;
    assert.match(bundle.js, /"leadStiffness":870/); assert.doesNotMatch(bundle.js, /"timeScale":0.25/);
    assert.match(bundle.html, /data-appearance="dark"/); assert.equal(bundle.background, '#171717');
    assert.doesNotMatch(bundle.html, /main-shell|library-header|settings/);
    nodes['code-tab'].emit('click'); nodes.reset.emit('click');
    assert.equal(a.root.dataset.appearance, 'dark'); assert.equal(nodes['code-panel'].hidden, false);
    assert.equal(nodes.leadStiffness.value, 620); assert.equal(nodes['speed-label'].textContent, '1×');
    assert.equal(a.root.libraryComponent.selectedIndex, 0); assert.equal(env.frames.size, 0);
    a.root.libraryComponent.destroy();
});
