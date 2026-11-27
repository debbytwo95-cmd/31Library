const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Node {
    constructor(width = 0) { this.width = width;this.style = {};this.dataset = {};this.attributes = {};this.handlers = new Map();this.children = [];this.nodes = {};this.textContent = ''; }
    addEventListener(type, fn, options = {}) {
        const listeners = this.handlers.get(type) || new Set();listeners.add(fn);this.handlers.set(type, listeners);
        options.signal?.addEventListener('abort', () => listeners.delete(fn), { once: true });
    }
    async emit(type, data = {}) { await Promise.all([...(this.handlers.get(type) || [])].map(fn => fn(data))); }
    querySelector(selector) { return this.nodes[selector]; }
    getBoundingClientRect() { return { width: this.width }; }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
}
function environment({ reduced = false, clipboard = async () => {} } = {}) {
    const window = new Node(), document = new Node(), media = new Node(), frames = new Map(), timers = new Map();
    let now = 0, id = 0;media.matches = reduced;window.isSecureContext = true;
    const context = vm.createContext({ window, document, navigator: { clipboard: { writeText: clipboard } }, matchMedia: () => media,
        AbortController, performance: { now: () => now }, ResizeObserver: class { observe() {} disconnect() {} },
        requestAnimationFrame: fn => { frames.set(++id, fn);return id; },cancelAnimationFrame: key => frames.delete(key),
        setTimeout: (fn, ms) => { timers.set(++id, { fn, end: now + ms });return id; },clearTimeout: key => timers.delete(key) });
    vm.runInContext(fs.readFileSync('assets/copy-springs.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('single-web/components/button/copy-button-studio/effect.js', 'utf8'), context);
    function tick(ms) {
        const end = now + ms;
        while (now < end) {
            now = Math.min(now + 16, end);
            const jobs = [...frames.values()];frames.clear();jobs.forEach(fn => fn(now));
            for (const [key, timer] of [...timers]) if (timer.end <= now) { timers.delete(key);timer.fn(); }
        }
    }
    function mount(options) {
        const root = new Node();
        for (const key of ['button', 'roll', 'words', 'original', 'success', 'status']) root.nodes['.library-copy-' + key] = new Node();
        root.nodes['.library-copy-words'].children = [new Node(32), new Node(46)];
        return { root, button: root.nodes['.library-copy-button'], runtime: window.LibraryCopyButton.mount(root, options) };
    }
    return { mount, tick, frames, timers, window, document, context };
}

test('idle and synthetic clicks do not animate or access the clipboard', async () => {
    let copies = 0;const env = environment({ clipboard: async () => copies++ }), a = env.mount();
    assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
    await a.button.emit('click', { isTrusted: false });env.tick(8000);
    assert.equal(copies, 0);assert.equal(a.root.dataset.state, 'idle');assert.equal(env.frames.size, 0);
    a.runtime.destroy();
});

test('confirmed copy rolls and resizes, repeats restart the timer, then settles with no frame loop', async () => {
    const writes = [];const env = environment({ clipboard: async value => writes.push(value) }), a = env.mount({ command: 'npm i example', doneMs: 1800 }), b = env.mount();
    await a.button.emit('click', { isTrusted: true });env.tick(800);
    assert.deepEqual(writes, ['npm i example']);assert.equal(a.root.dataset.state, 'copied');assert.equal(b.root.dataset.state, 'idle');
    assert.equal(a.root.nodes['.library-copy-roll'].style.width, '46.00px');
    assert.equal(a.root.nodes['.library-copy-words'].style.transform, 'translateY(-18.00px)');
    assert.equal(env.frames.size, 0, 'success settles while waiting for reset');
    await a.button.emit('click', { isTrusted: true });assert.equal(env.timers.size, 1);env.tick(1400);assert.equal(a.root.dataset.state, 'copied');
    env.tick(2000);assert.equal(a.root.dataset.state, 'idle');assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
    assert.equal(a.root.nodes['.library-copy-roll'].style.width, '32.00px');a.runtime.destroy();b.runtime.destroy();
});

test('pending clipboard writes cannot confirm after reset, update, blur, or destroy', async () => {
    for (const action of ['reset', 'update', 'blur', 'destroy']) {
        let resolve, calls = 0;const env = environment({ clipboard: () => { calls++;return new Promise(done => { resolve = done; }); } }), a = env.mount();
        const job = a.button.emit('click', { isTrusted: true });await a.button.emit('click', { isTrusted: true });assert.equal(calls, 1);
        if (action === 'blur') await env.window.emit('blur');else a.runtime[action]();
        resolve();await job;assert.equal(a.root.dataset.state, 'idle', action);assert.equal(env.frames.size, 0);assert.equal(env.timers.size, 0);
        assert.equal(a.button.attributes['aria-busy'], undefined);
        a.runtime.destroy();await a.button.emit('click', { isTrusted: true });assert.equal(calls, 1);
    }
});

test('copy failure stays honest; reduced motion preserves operation without animation', async () => {
    const failed = environment({ clipboard: async () => { throw Error('denied'); } }), a = failed.mount();
    await a.button.emit('click', { isTrusted: true });failed.tick(1000);
    assert.equal(a.root.dataset.state, 'error');assert.match(a.root.nodes['.library-copy-status'].textContent, /复制失败/);assert.equal(failed.timers.size, 0);
    a.runtime.destroy();
    let copiedText;
    const reduced = environment({ reduced: true, clipboard: async value => { copiedText = value; } }), b = reduced.mount({ command: '<script>alert(1)</script>\nnext' });
    await b.button.emit('click', { isTrusted: true });assert.equal(b.root.dataset.state, 'copied');assert.equal(reduced.frames.size, 0);
    assert.equal(copiedText, '<script>alert(1)</script> next');
    assert.equal(b.root.nodes['.library-copy-words'].style.transform, 'translateY(-18.00px)');
    reduced.tick(1800);assert.equal(b.root.dataset.state, 'idle');assert.equal(reduced.frames.size, 0);b.runtime.destroy();
});

test('clipboard fallback reports rejection and restores focus', async () => {
    const env = environment(), a = env.mount();env.window.isSecureContext = false;
    let removed = false, focused = false, copied = false;
    env.document.activeElement = { focus: () => { focused = true; } };
    env.document.getSelection = () => null;
    env.document.body = { append() {} };
    env.document.createElement = () => ({ style: {}, setAttribute() {}, select() {}, remove() { removed = true; } });
    env.document.execCommand = type => { copied = type === 'copy';return false; };
    await a.button.emit('click', { isTrusted: true });
    assert.equal(copied && removed && focused, true);assert.equal(a.root.dataset.state, 'error');
    env.document.execCommand = () => true;
    await a.button.emit('click', { isTrusted: true });assert.equal(a.root.dataset.state, 'copied');a.runtime.destroy();
});
