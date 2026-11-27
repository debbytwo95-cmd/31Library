const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element extends EventTarget {
    constructor() {
        super();this.dataset = {};this.attributes = {};this.textContent = '';this.offsetWidth = 960;this.offsetHeight = 56;
        const vars = this.vars = {};
        this.style = { setProperty(name, value) { vars[name] = value; } };
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    removeAttribute(name) { delete this.attributes[name]; }
    emit(name, values = {}) { const event = new Event(name);Object.assign(event, values);this.dispatchEvent(event); }
}
function context(canvas, log) {
    return {
        font:'10px serif', letterSpacing:'0px', fillStyle:'#000', textAlign:'start', textBaseline:'alphabetic', imageSmoothingEnabled:true,
        setTransform() {}, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
        clearRect() { if (canvas.view) log.push({ type:'clear' }); },
        measureText(text) {
            const size = parseFloat(this.font.match(/([\d.]+)px/)[1]);
            return { width:Array.from(text).length * size * .5, fontBoundingBoxAscent:size * .8, fontBoundingBoxDescent:size * .2 };
        },
        fillText(text) { log.push({ type:'fill', canvas, text, color:this.fillStyle }); },
        drawImage(source, ...args) { if (canvas.view) log.push({ type:'draw', source, args, smooth:this.imageSmoothingEnabled }); }
    };
}
function environment({ reduce = false } = {}) {
    const window = new Element(), document = new Element(), media = new Element(), frames = new Map(), timers = new Map(), log = [];
    const observers = [];
    let now = 0, id = 0;media.matches = reduce;window.devicePixelRatio = 2;
    const canvas = () => { const node = new Element();node.getContext = () => node.ctx ||= context(node, log);return node; };
    document.createElement = canvas;
    class Observer { constructor(fn) { this.fn = fn;observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
    vm.runInNewContext(fs.readFileSync('single-web/components/text/pixel-word-swap-studio/effect.js', 'utf8'), {
        window, document, matchMedia:() => media, AbortController, Math, Number, Map, String, Array, Object,
        performance:{ now:() => now },
        requestAnimationFrame:fn => { frames.set(++id, fn);return id; }, cancelAnimationFrame:key => frames.delete(key),
        setTimeout:(fn, delay) => { timers.set(++id, { fn, due:now + delay });return id; }, clearTimeout:key => timers.delete(key),
        ResizeObserver:Observer, MutationObserver:Observer,
        getComputedStyle:node => {
            const size = node.root.vars['--pixel-word-swap-size'] || '56px';
            const ink = node.root.dataset.appearance === 'dark' ? '#f4f4f5' : '#0e0e0e';
            return { fontSize:size, lineHeight:size, fontStyle:'normal', fontWeight:'450', fontFamily:'LibraryPixelSerif, serif', letterSpacing:'-0.84px', color:'rgb(1, 2, 3)', getPropertyValue:name => name === '--pixel-word-swap-text' ? ink : '' };
        }
    });
    function tick(count = 1) {
        for (let i = 0; i < count; i++) {
            now += 16;
            for (const [key, timer] of [...timers]) if (timer.due <= now) { timers.delete(key);timer.fn(); }
            const jobs = [...frames.values()];frames.clear();jobs.forEach(fn => fn(now));
        }
    }
    function create(options = {}, width = 960, raw = false) {
        const root = new Element(), title = new Element(), sizer = new Element(), view = canvas();
        view.view = true;sizer.root = root;sizer.offsetWidth = width;
        root.querySelector = selector => ({ '.library-pixel-word-swap-title':title, '.library-pixel-word-swap-sizer':sizer, '.library-pixel-word-swap-canvas':view })[selector];
        const runtime = window.LibraryPixelWordSwap.mount(root, raw ? options : { autoplay:false, ...options });
        return { root, title, sizer, view, runtime };
    }
    // Operations since the view was last cleared, i.e. the latest composed frame and the layers drawn just before it.
    const latest = () => log.slice(log.map(item => item.type).lastIndexOf('clear', log.map(item => item.type).lastIndexOf('clear') - 1) + 1);
    const mosaic = () => log.slice(log.map(item => item.type).lastIndexOf('clear')).find(item => item.type === 'draw' && !item.smooth);
    return { window, document, media, frames, timers, log, observers, tick, create, mosaic, latest };
}

test('rests on the first word without frames or timers, and draws crisp canvas text', () => {
    const env = environment(), a = env.create();
    assert.equal(a.root.dataset.word, 'image');assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
    assert.equal(a.title.getAttribute('aria-label'), 'Create any image you imagine，切换下一个词');
    assert.equal(a.sizer.textContent, 'Create any campaign you imagine', 'sizer reserves the widest word');
    assert.equal(a.view.width, Math.round((960 + 2 * 17) * 2), 'canvas bleeds 0.3em and follows devicePixelRatio');
    assert.equal(env.mosaic(), undefined);
    env.tick(300);assert.equal(a.root.dataset.word, 'image', 'no idle loop');
    a.runtime.destroy();
});

test('a swap pixelates at the midpoint, changes word there and stops its frames', () => {
    const env = environment(), a = env.create();
    a.runtime.next();assert.equal(env.frames.size, 1);
    env.tick(20);
    assert.equal(a.root.dataset.word, 'image');
    const block = env.mosaic();
    assert.ok(block, 'mid-swap draws an unsmoothed mosaic');
    assert.equal(block.args[6] / block.args[2], 7, 'largest block is 12.5% of 56px');
    env.tick(2);assert.equal(a.root.dataset.word, 'audio');
    env.tick(20);assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
    assert.equal(env.mosaic(), undefined, 'rest frame is crisp again');
    assert.equal(a.title.getAttribute('aria-label'), 'Create any audio you imagine，切换下一个词');
    a.runtime.destroy();
});

test('rapid activation queues one swap and leaves another instance untouched', () => {
    const env = environment(), a = env.create(), b = env.create();
    for (let i = 0; i < 6; i++) { a.title.emit('click');env.tick(2); }
    env.tick(120);
    assert.equal(a.root.dataset.word, 'video');assert.equal(b.root.dataset.word, 'image');
    assert.equal(env.frames.size, 0);
    a.runtime.reset();assert.equal(a.root.dataset.word, 'image');
    a.runtime.destroy();b.runtime.destroy();
});

test('hover cycles with hold and swap, finishes the running swap after leaving, and ignores touch', () => {
    const env = environment(), a = env.create();
    a.title.emit('pointerenter', { pointerType:'touch' });assert.equal(env.frames.size, 0);
    a.title.emit('pointerenter', { pointerType:'mouse' });assert.equal(env.frames.size, 1);
    env.tick(42);assert.equal(a.root.dataset.word, 'audio');assert.equal(env.timers.size, 1, 'hold timer while hovered');
    env.tick(81);assert.equal(env.frames.size, 1, 'next swap starts after 1300ms');
    a.title.emit('pointerleave', { pointerType:'mouse' });
    env.tick(42);assert.equal(a.root.dataset.word, 'video');
    assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
    env.tick(200);assert.equal(a.root.dataset.word, 'video');
    a.runtime.destroy();
});

test('autoplay and play loop until paused; blur and hidden pages stop the hold timer', () => {
    const env = environment(), a = env.create({ autoplay:true });
    assert.equal(env.timers.size, 1);assert.equal(env.frames.size, 0);
    env.window.emit('blur');assert.equal(env.timers.size, 0);
    env.tick(200);assert.equal(a.root.dataset.word, 'image');
    env.window.emit('focus');assert.equal(env.timers.size, 1);
    env.tick(82 + 42);assert.equal(a.root.dataset.word, 'audio');assert.equal(env.timers.size, 1);
    a.runtime.pause();assert.equal(env.timers.size, 0);
    env.tick(200);assert.equal(a.root.dataset.word, 'audio');
    a.runtime.update({ autoplay:false });a.runtime.play();assert.equal(env.timers.size, 1);
    a.runtime.update({ words:['solo'] });assert.equal(env.timers.size, 0, 'a single word never schedules');
    a.runtime.destroy();assert.equal(env.timers.size, 0);
});

test('reduced motion swaps immediately; configuration is clamped and keeps valid words', () => {
    const env = environment({ reduce:true }), a = env.create({ words:['film', 'extraordinary campaign'], fontSize:400, pixel:1, hold:5 }, 2000);
    a.runtime.next();assert.equal(a.root.dataset.word, 'extraordinary campaign');assert.equal(env.frames.size, 0);
    assert.equal(a.root.vars['--pixel-word-swap-size'], '96px');
    assert.equal(a.sizer.textContent, 'Create any extraordinary campaign you imagine', 'slot word stays unbreakable');
    a.runtime.update({ words:['', '   '], prefix:'  Make\n every ', suffix:'' });
    assert.equal(a.root.dataset.word, 'film');assert.equal(a.sizer.textContent, 'Make every extraordinary campaign');
    env.media.matches = false;a.runtime.next();assert.equal(env.frames.size, 1);
    env.media.matches = true;env.media.emit('change');assert.equal(env.frames.size, 0);
    assert.equal(a.root.dataset.word, 'extraordinary campaign');
    a.runtime.destroy();
});

test('long words shrink to fit and appearance changes redraw with the new ink', () => {
    const env = environment(), a = env.create({ words:['supercalifragilistic', 'ok'], fontSize:96 }, 300);
    const size = parseFloat(a.root.vars['--pixel-word-swap-size']);
    assert.ok(size < 96 && size * .5 * 20 <= 300, 'widest word fits the container');
    const inks = () => [...new Set(env.latest().filter(item => item.type === 'fill').map(item => item.color))];
    assert.deepEqual(inks(), ['#0e0e0e']);
    a.root.dataset.appearance = 'dark';env.observers[1].fn();
    assert.deepEqual(inks(), ['#f4f4f5'], 'ink comes from --pixel-word-swap-text, not a transitioning color');
    a.runtime.destroy();
});

test('destroy releases listeners, observers and frames; remounting starts clean', () => {
    const env = environment(), a = env.create();
    a.runtime.next();a.runtime.destroy();
    assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
    assert.ok(env.observers.every(observer => observer.disconnected));
    a.title.emit('click');a.title.emit('pointerenter', { pointerType:'mouse' });env.window.emit('focus');
    assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
    const again = env.window.LibraryPixelWordSwap.mount(a.root, { words:['one', 'two'] });
    assert.equal(a.root.dataset.word, 'one');
    a.title.emit('click');env.tick(45);assert.equal(a.root.dataset.word, 'two');
    again.destroy();assert.equal(env.frames.size, 0);
});

test('mounts with autoplay by default; hover during a hold swaps at once and keeps rotating', () => {
    const env = environment(), a = env.create({}, 960, true);
    assert.equal(a.root.dataset.word, 'image');assert.equal(env.timers.size, 1, 'hold timer from the start');assert.equal(env.frames.size, 0);
    env.tick(30);assert.equal(env.frames.size, 0, 'still holding the first word');
    a.title.emit('pointerenter', { pointerType:'mouse' });assert.equal(env.frames.size, 1, 'hover swaps without waiting for the hold');
    env.tick(42);assert.equal(a.root.dataset.word, 'audio');assert.equal(env.timers.size, 1);
    a.title.emit('pointerleave', { pointerType:'mouse' });assert.equal(env.timers.size, 1, 'autoplay keeps its timer after leaving');
    env.tick(82 + 42);assert.equal(a.root.dataset.word, 'video');
    a.runtime.destroy();assert.equal(env.timers.size, 0);
});
