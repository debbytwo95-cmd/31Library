const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element extends EventTarget {
    constructor() { super();this.children = [];this.style = {};this.dataset = {};this.attributes = {};this.clientWidth = 640;this._text = ''; }
    append(node) { this.children.push(node);node.parent = this; }
    replaceChildren() { this.children = [];this._text = ''; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); }
    set textContent(value) { this._text = String(value);this.children = []; }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    getBoundingClientRect() { return { width:this.hidden ? 0 : Array.from(this.textContent).length * 22 }; }
    emit(name) { this.dispatchEvent(new Event(name)); }
}
function environment(reduce = false) {
    const window = new Element(), document = new Element(), media = new Element(), frames = new Map(), timers = new Map();
    let now = 0, id = 0;media.matches = reduce;
    document.createElement = () => new Element();
    const observers = [];
    vm.runInNewContext(fs.readFileSync('single-web/components/text/word-roll-studio/effect.js','utf8'), {
        window, document, matchMedia:() => media, AbortController, Intl,
        performance:{ now:() => now }, requestAnimationFrame:fn => { frames.set(++id,fn);return id; },
        cancelAnimationFrame:key => frames.delete(key),
        setTimeout:(fn, delay) => { timers.set(++id, { fn, due:now + delay });return id; },
        clearTimeout:key => timers.delete(key),
        ResizeObserver:class { constructor(fn) { this.fn = fn;observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
    });
    function tick(count) {
        for (let i = 0; i < count; i++) {
            now += 16;
            for (const [key, timer] of [...timers]) if (timer.due <= now) { timers.delete(key);timer.fn(); }
            const jobs = [...frames.values()];frames.clear();jobs.forEach(fn => fn(now));
        }
    }
    function create(options) {
        const root = new Element(), button = new Element(), lead = new Element(), slot = new Element();
        root.querySelector = selector => ({ '.library-word-roll-line':button, '.library-word-roll-lead':lead, '.library-word-roll-slot':slot })[selector];
        button.append(lead);button.append(slot);
        const runtime = window.LibraryWordRoll.mount(root, { autoplay:false,...options });
        return { root, button, lead, slot, runtime };
    }
    return { window, document, media, frames, timers, tick, create, observers };
}

test('paused word roll staggers programmatic changes and settles without animation frames', () => {
    const env = environment(), a = env.create();
    assert.equal(env.frames.size,0);assert.equal(a.root.dataset.word,'designers');
    a.runtime.next();assert.equal(a.root.dataset.word,'founders');assert.equal(a.slot.children.length,2);
    env.tick(7);
    const letters = a.slot.children[1].children;
    assert.notEqual(letters[0].style.transform,letters.at(-1).style.transform,'letters enter at different times');
    env.tick(260);
    assert.equal(env.frames.size,0);assert.equal(a.slot.children.length,1);
    assert.equal(a.slot.children[0].textContent,'founders');
    assert.equal(a.slot.children[0].children[0].style.transform,'translateY(0.000%)');
    env.tick(400);assert.equal(a.root.dataset.word,'founders');
    a.runtime.destroy();
});

test('rapid activation is bounded, wraps, and does not affect another instance', () => {
    const env = environment(), a = env.create(), b = env.create();
    for (let i = 0; i < 9; i++) { a.runtime.next();assert.equal(a.slot.children.length,2);env.tick(2); }
    assert.equal(a.root.dataset.word,'founders');assert.equal(b.root.dataset.word,'designers');
    a.runtime.reset();assert.equal(a.root.dataset.word,'designers');assert.equal(env.frames.size,0);
    a.runtime.destroy();a.button.emit('click');assert.equal(env.frames.size,0);
    b.runtime.next();env.tick(300);assert.equal(b.root.dataset.word,'founders');assert.equal(env.frames.size,0);
    b.runtime.destroy();assert.ok(env.observers.every(observer => observer.disconnected));
});

test('reduced motion, cancellation, font measurement and configuration keep valid state', () => {
    const env = environment(true), a = env.create({ prefix:'为', words:['设计师','创造者'],stagger:70 });
    a.runtime.next();assert.equal(a.root.dataset.word,'创造者');assert.equal(env.frames.size,0);
    env.media.matches = false;a.runtime.next();assert.equal(env.frames.size,1);
    env.window.emit('blur');assert.equal(env.frames.size,0);assert.equal(a.slot.children.length,1);
    a.runtime.update({ words:[],prefix:'',stiffness:700,damping:16 });
    assert.equal(a.root.dataset.word,'设计师');assert.equal(a.lead.hidden,true);
    a.runtime.next();env.tick(400);assert.equal(env.frames.size,0);
    env.observers[0].fn();assert.equal(a.root.dataset.word,'创造者');assert.equal(env.frames.size,0);
    a.runtime.next();a.runtime.pause();assert.equal(env.frames.size,0);
    a.runtime.destroy();env.observers[0].fn();a.runtime.next();assert.equal(env.frames.size,0);
});

test('remounting delivered code clears the previous generated letters', () => {
    const env = environment(), a = env.create();
    a.runtime.next();env.tick(300);a.runtime.destroy();
    const remounted = env.window.LibraryWordRoll.mount(a.root, { words:['one','two'],autoplay:false });
    assert.equal(a.slot.children.length,1);assert.equal(a.slot.children[0].textContent,'one');
    remounted.next();env.tick(300);
    assert.equal(a.root.dataset.word,'two');assert.equal(a.slot.children.length,1);
    remounted.destroy();assert.equal(env.frames.size,0);
});

test('autoplay rotates on its interval, wraps and clears timers on destroy', () => {
    const env = environment(), a = env.create({ autoplay:true });
    assert.equal(a.root.dataset.word,'designers');assert.equal(env.frames.size,0);assert.equal(env.timers.size,1);
    env.tick(149);assert.equal(a.root.dataset.word,'designers');
    env.tick(1);assert.equal(a.root.dataset.word,'founders');
    env.tick(450);assert.equal(a.root.dataset.word,'designers');assert.equal(env.timers.size,1);
    a.runtime.destroy();assert.equal(env.timers.size,0);assert.equal(env.frames.size,0);
    env.tick(600);assert.equal(a.root.dataset.word,'designers');
});

test('click advances immediately and restarts one full autoplay interval independently', () => {
    const env = environment(true), a = env.create({ autoplay:true }), b = env.create({ autoplay:true });
    env.tick(100);a.button.emit('click');
    assert.equal(a.root.dataset.word,'founders');assert.equal(b.root.dataset.word,'designers');
    assert.equal(env.timers.size,2);
    env.tick(50);assert.equal(a.root.dataset.word,'founders');assert.equal(b.root.dataset.word,'founders');
    env.tick(99);assert.equal(a.root.dataset.word,'founders');
    env.tick(1);assert.equal(a.root.dataset.word,'makers');
    for (let i = 0; i < 12; i++) a.button.emit('click');
    assert.equal(a.root.dataset.word,'makers');assert.equal(a.slot.children.length,1);assert.equal(env.timers.size,2);
    a.runtime.destroy();a.button.emit('click');assert.equal(a.root.dataset.word,'makers');
    b.runtime.destroy();assert.equal(env.timers.size,0);
});

test('autoplay pauses offscreen and in code mode, resumes once, and resets the interval', () => {
    const env = environment(true), a = env.create({ autoplay:true,interval:1200 });
    env.tick(75);assert.equal(a.root.dataset.word,'founders');assert.equal(env.frames.size,0);
    env.window.emit('blur');assert.equal(env.timers.size,0);
    env.tick(150);assert.equal(a.root.dataset.word,'founders');
    env.window.emit('focus');env.document.emit('visibilitychange');assert.equal(env.timers.size,1);
    env.tick(75);assert.equal(a.root.dataset.word,'makers');
    a.runtime.pause();a.runtime.update({interval:3000});assert.equal(env.timers.size,0);
    a.runtime.play();a.runtime.play();assert.equal(env.timers.size,1);
    env.tick(100);a.runtime.reset();env.tick(100);assert.equal(a.root.dataset.word,'designers');
    env.tick(88);assert.equal(a.root.dataset.word,'founders');
    a.runtime.update({words:['only']});assert.equal(env.timers.size,0);
    a.runtime.destroy();
});
