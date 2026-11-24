const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class NodeStub extends EventTarget {
    constructor() {
        super(); this.style = { setProperty(key, value) { this[key] = value; } };
        this.attributes = {}; this.children = []; this.classes = new Set();
        this.classList = { add: key => this.classes.add(key), remove: key => this.classes.delete(key) };
    }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    querySelector(selector) { return this.parts[selector]; }
    replaceChildren() { this.children = []; }
    append(child) { this.children.push(child); }
    getBoundingClientRect() { return { left: 100, width: 320 }; }
    focus() { this.emit('focus'); }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; this.emit('lostpointercapture'); }
    emit(name, values = {}) {
        const event = new Event(name, { cancelable: true }); Object.assign(event, values); this.dispatchEvent(event); return event;
    }
}
function environment(reduced = false) {
    const window = new NodeStub(), document = new NodeStub(), media = new NodeStub(), hover = new NodeStub(), frames = new Map();
    media.matches = reduced; hover.matches = true; document.createElement = () => new NodeStub();
    let id = 0, now = 0;
    vm.runInNewContext(fs.readFileSync('single-web/components/slider/scrubber-studio/effect.js', 'utf8'), {
        window, document, AbortController,
        matchMedia: query => query.includes('reduced') ? media : hover,
        requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id)
    });
    function tick(count = 1) { for (let i = 0; i < count; i++) { now += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); } }
    function root() {
        const node = new NodeStub(); node.parts = {};
        for (const part of ['label', 'value', 'ticks', 'thumb']) node.parts['.library-scrubber-' + part] = new NodeStub();
        return node;
    }
    return { window, document, media, hover, frames, tick, root, mount: window.LibraryScrubber.mount };
}
const pointer = (pointerId, clientX, pointerType = 'mouse') => ({ pointerId, clientX, pointerType, button: 0, isPrimary: true });

test('scrubber quantizes relative to min, preserves actual precision and keeps endpoints reachable', () => {
    const env = environment(), root = env.root(), changes = [];
    const instance = env.mount(root, { min: -.2, max: 1, step: .25, value: .3, decimals: 0, onValueChange: value => changes.push(value) });
    assert.equal(instance.value, .3);
    assert.equal(root.attributes['aria-valuenow'], '0.3');
    assert.equal(root.parts['.library-scrubber-value'].textContent, '0');
    root.emit('keydown', { key: 'End' }); assert.equal(instance.value, 1);
    root.emit('keydown', { key: 'Home' }); assert.equal(instance.value, -.2);
    root.emit('keydown', { key: 'ArrowUp' }); assert.equal(instance.value, .05);
    instance.setValue(.05); assert.deepEqual(changes, [1, -.2, .05]);
    instance.update({ min: -2, max: 2, step: .1, value: .2, decimals: 1, ticks: 0 });
    assert.equal(changes.length, 3, 'configuration updates are silent');
    assert.equal(root.parts['.library-scrubber-ticks'].children.length, 0);
    assert.equal(root.parts['.library-scrubber-value'].textContent, '0.2');
    assert.throws(() => instance.update({ max: -3 }), /max > min/);
    assert.throws(() => instance.update({ step: 0 }), /step > 0/);
    assert.throws(() => instance.setValue(NaN), /finite/);
    assert.equal(instance.value, .2, 'invalid update leaves last valid value intact');
    instance.reset(); assert.equal(instance.value, .3); assert.equal(instance.config.min, -.2); instance.destroy();
});

test('dragging uses pointer capture, ignores other pointers and handles cancellation independently', () => {
    const env = environment(), a = env.root(), b = env.root();
    const first = env.mount(a), second = env.mount(b);
    assert.equal(env.frames.size, 0, 'mount is static');
    a.emit('pointerdown', pointer(1, 180)); assert.equal(first.value, .25); assert.equal(a.capture, 1);
    a.emit('pointermove', pointer(2, 420)); assert.equal(first.value, .25);
    a.emit('pointermove', pointer(1, 800)); assert.equal(first.value, 1);
    assert.equal(second.value, .5);
    a.emit('pointercancel', pointer(1, 800));
    assert.equal(a.capture, null); assert.equal(a.classes.size, 0); assert.equal(env.frames.size, 0);
    a.emit('pointerdown', pointer(1, 100, 'touch')); a.emit('pointerup', pointer(1, 260, 'touch')); env.tick(100);
    assert.equal(first.value, .5); assert.equal(a.classes.size, 0); assert.equal(env.frames.size, 0);
    a.emit('pointerdown', pointer(1, 400)); env.window.emit('blur');
    assert.equal(a.classes.size, 0); assert.equal(env.frames.size, 0);
    a.emit('pointerdown', pointer(1, 400)); env.document.hidden = true; env.document.emit('visibilitychange');
    assert.equal(a.capture, null); assert.equal(env.frames.size, 0);
    first.destroy(); a.emit('pointerdown', pointer(3, 100)); assert.equal(a.capture, null);
    assert.equal(first.value, .94); second.destroy();
});

test('hover spring settles and stops frames, touch stays static, reduced motion responds immediately', () => {
    const env = environment(), root = env.root(), instance = env.mount(root);
    root.emit('pointerenter', { pointerType: 'touch' }); assert.equal(env.frames.size, 0);
    root.emit('pointerenter', { pointerType: 'mouse' }); assert.equal(env.frames.size, 1); env.tick(100);
    assert.equal(root.parts['.library-scrubber-thumb'].style.transform, 'scale(1)'); assert.equal(env.frames.size, 0);
    root.emit('pointerleave'); env.tick(100);
    assert.equal(root.parts['.library-scrubber-thumb'].style.transform, 'scale(0.7)'); assert.equal(env.frames.size, 0);
    root.emit('focus'); env.tick(2); env.media.matches = true; env.media.emit('change');
    assert.equal(root.parts['.library-scrubber-thumb'].style.transform, 'scale(1)'); assert.equal(env.frames.size, 0);
    root.emit('blur'); assert.equal(env.frames.size, 0); instance.destroy();
    const reduced = environment(true), touch = reduced.root(), other = reduced.mount(touch);
    touch.emit('pointerdown', pointer(7, 260, 'touch'));
    assert.equal(touch.parts['.library-scrubber-thumb'].style.transform, 'scale(1)'); assert.equal(reduced.frames.size, 0);
    touch.emit('pointerup', pointer(7, 260, 'touch'));
    assert.equal(touch.parts['.library-scrubber-thumb'].style.transform, 'scale(0.7)'); other.destroy();
});
