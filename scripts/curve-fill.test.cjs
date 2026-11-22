const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Surface extends EventTarget {
    constructor() {
        super(); this.classes = new Set(); this.attributes = {};
        this.classList = { toggle: (key, value) => value ? this.classes.add(key) : this.classes.delete(key), remove: key => this.classes.delete(key) };
    }
    emit(type, detail = {}) { const event = new Event(type); Object.assign(event, detail); this.dispatchEvent(event); }
    setAttribute(key, value) { this.attributes[key] = value; }
    setPointerCapture() {}
    matches() { return false; }
    getBoundingClientRect() { return { left: 100, top: 100, width: 130, height: 48 }; }
}
function environment(reduce = false) {
    const window = new Surface(), document = new Surface(), media = new Surface(), tweens = [], live = new Map(); media.matches = reduce;
    const gsap = {
        killTweensOf(path) { live.delete(path); },
        fromTo(path, from, to) { tweens.push({ path, from, to }); live.set(path, to); path.setAttribute('d', to.attr.d); }
    };
    const context = vm.createContext({ window, document, matchMedia: () => media, AbortController, gsap });
    vm.runInContext(fs.readFileSync('single-web/components/button/curve-fill-button-studio/effect.js', 'utf8'), context);
    function instance(config) {
        const button = new Surface(), path = new Surface(); button.querySelector = () => path;
        return { button, path, runtime: window.LibraryCurve.mount(button, config) };
    }
    return { window, document, media, tweens, live, instance };
}
test('curve fill follows nearest entry and exit edges, starts idle and isolates instances', () => {
    const env = environment(), a = env.instance(), b = env.instance();
    assert.equal(env.tweens.length, 0);
    const points = [
        [{ clientX: 165, clientY: 100 }, 'M 0 100 V 0 Q 50 0 100 0 V 0 H 0 z'],
        [{ clientX: 165, clientY: 148 }, 'M 0 100 V 100 Q 50 75 100 100 V 100 z'],
        [{ clientX: 100, clientY: 124 }, 'M 0 0 H 0 Q 0 50 0 100 H 0 V 0 z'],
        [{ clientX: 230, clientY: 124 }, 'M 100 0 H 100 Q 100 50 100 100 H 100 V 0 z']
    ];
    for (const [point, start] of points) {
        a.button.emit('pointerenter', { pointerType: 'mouse', ...point });
        assert.equal(env.tweens.at(-1).from.attr.d, start);
        assert.equal(env.tweens.at(-1).to.duration, .5);
        assert.equal(env.tweens.at(-1).to.ease, 'power3.out');
        assert.ok(a.button.classes.has('is-active')); assert.equal(b.button.classes.size, 0);
        a.button.emit('pointerleave', { pointerType: 'mouse', clientX: 230, clientY: 124 });
        assert.equal(env.tweens.at(-1).to.attr.d, 'M 100 0 H 100 Q 105 50 100 100 H 100 V 0 z');
        assert.equal(a.button.classes.size, 0);
        assert.equal(env.live.size, 1, 'rapid changes replace the previous animation');
    }
    a.runtime.destroy(); b.runtime.destroy(); assert.equal(env.live.size, 0);
});
test('curve fill supports touch release, cancellation, keyboard, reset and destruction', () => {
    const env = environment(), a = env.instance({ direction: 'horizontal', duration: 850 });
    a.button.emit('pointerenter', { pointerType: 'touch', clientX: 100, clientY: 124 }); assert.equal(env.tweens.length, 0);
    a.button.emit('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 124 }); assert.ok(a.button.classes.has('is-active'));
    a.button.emit('pointerup'); assert.equal(a.button.classes.size, 0);
    a.button.emit('keydown', { key: ' ' }); assert.ok(a.button.classes.has('is-active'));
    a.button.emit('pointercancel'); assert.equal(a.button.classes.size, 0); assert.equal(env.live.size, 0);
    a.runtime.update({ duration: 1200, slow: true });
    a.button.emit('keydown', { key: 'Enter' }); assert.equal(env.tweens.at(-1).to.duration, 4.8);
    env.window.emit('blur'); assert.equal(a.button.classes.size, 0); assert.equal(env.live.size, 0);
    a.button.emit('keydown', { key: 'Enter' }); env.document.hidden = true; env.document.emit('visibilitychange'); assert.equal(a.button.classes.size, 0);
    a.runtime.destroy(); const count = env.tweens.length;
    a.button.emit('keydown', { key: 'Enter' }); assert.equal(env.tweens.length, count);
});
test('reduced motion switches fill without scheduling tweens and responds to preference changes', () => {
    const env = environment(true), a = env.instance();
    a.button.emit('keydown', { key: 'Enter' }); assert.ok(a.button.classes.has('is-active'));
    assert.equal(env.tweens.length, 0); assert.equal(a.path.attributes.d, 'M 0 100 V 0 Q 50 0 100 0 V 100 z');
    env.media.emit('change'); assert.equal(a.button.classes.size, 0); assert.match(a.path.attributes.d, /Q 50 100/);
    a.runtime.destroy();
});
