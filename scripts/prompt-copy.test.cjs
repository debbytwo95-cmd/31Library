const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Node {
    constructor(width = 0) {
        this.width = width; this.style = {}; this.dataset = {}; this.attributes = {}; this.nodes = {}; this.children = []; this.handlers = new Map();
    }
    addEventListener(type, fn) {
        const listeners = this.handlers.get(type) || []; listeners.push(fn); this.handlers.set(type, listeners);
    }
    async emit(type, data = {}) { await Promise.all((this.handlers.get(type) || []).map(fn => fn(data))); }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    querySelector(selector) { return this.nodes[selector] || null; }
    getBoundingClientRect() { return { width: this.width, height: 20 }; }
    before(node) { this.beforeNode = node; }
    after(node) { this.afterNode = node; }
    closest() { return this; }
    select() {}
    showModal() { this.open = true; }
    set innerHTML(value) {
        this.markup = value;
        if (value.includes('delivery-copy-roll')) {
            for (const name of ['roll', 'words', 'original', 'success']) this.nodes['.delivery-copy-' + name] = new Node();
            this.nodes['.delivery-copy-words'].children = [new Node(65), new Node(39)];
        }
        if (value.includes('<textarea')) this.nodes.textarea = new Node();
    }
}
function environment({ reduced = false, write = async () => {} } = {}) {
    const window = new Node(), document = new Node(), media = new Node(), frames = new Map(), timers = new Map(), created = [];
    let now = 0, id = 0, prompt = '当前参数\n' + '保留完整提示词'.repeat(100);
    media.matches = reduced;
    const ids = new Map(['copy-code', 'download', 'code-tab', 'code-panel', 'source-code'].map(key => [key, new Node()]));
    ids.get('code-panel').hidden = true;
    document.currentScript = { src: 'http://localhost/31Library/assets/delivery.js' };
    document.documentElement = { hasAttribute: () => false };
    document.getElementById = key => ids.get(key);
    document.querySelector = () => new Node();
    document.createElement = () => { const node = new Node(); created.push(node); return node; };
    document.body = { append() {} };
    const context = vm.createContext({ window, document, URL, Blob, TextEncoder, navigator: { clipboard: { writeText: write } }, isSecureContext: true,
        matchMedia: () => media, ResizeObserver: class { observe() {} }, performance: { now: () => now },
        requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: key => frames.delete(key),
        setTimeout: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; }, clearTimeout: key => timers.delete(key) });
    vm.runInContext(fs.readFileSync('assets/copy-springs.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('assets/delivery.js', 'utf8'), context);
    window.LibraryDelivery.register({ title: 'Example', prompt: () => prompt });
    const button = ids.get('download').beforeNode;
    function tick(ms) {
        const end = now + ms;
        while (now < end) {
            now = Math.min(now + 16, end);
            const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now));
            for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn(); }
        }
    }
    return { button, window, document, media, frames, timers, tick, created,
        get prompt() { return prompt; }, set prompt(value) { prompt = value; },
        click: () => button.emit('click', { isTrusted: true }) };
}

test('prompt copy stays idle until a real click and preserves full, current multiline content', async () => {
    const writes = [], env = environment({ write: async text => writes.push(text) });
    assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
    await env.button.emit('click', { isTrusted: false }); assert.equal(writes.length, 0);
    await env.click(); env.tick(1200);
    assert.deepEqual(writes, [env.prompt]); assert.ok(writes[0].length > 500);
    assert.equal(env.button.dataset.copyState, 'copied'); assert.equal(env.frames.size, 0);
    assert.equal(env.button.nodes['.delivery-copy-words'].style.transform, 'translateY(-20.00px)');
    env.prompt = '调整后的参数\n宽度 480px'; await env.click(); env.tick(1400);
    assert.equal(writes[1], env.prompt); assert.equal(env.timers.size, 0); assert.equal(env.button.dataset.copyState, 'copied');
    env.tick(60000); assert.equal(env.button.dataset.copyState, 'copied');
    assert.equal(env.button.nodes['.delivery-copy-roll'].style.width, '39.00px');
    assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
    assert.equal(environment().button.dataset.copyState, 'idle', 'a fresh page starts in its default state');
});

test('confirmed feedback persists through cancellation, tab switching and failed retries', async () => {
    let fail = false;
    const env = environment({ write: async () => { if (fail) throw Error('permission denied'); } });
    await env.click(); env.tick(1200);
    await env.window.emit('blur'); await env.window.emit('pagehide'); await env.button.emit('pointercancel');
    env.document.hidden = true; await env.document.emit('visibilitychange');
    env.document.hidden = false; await env.document.emit('visibilitychange');
    assert.equal(env.button.dataset.copyState, 'copied'); assert.equal(env.frames.size, 0);
    fail = true; await env.click();
    assert.equal(env.button.dataset.copyState, 'copied'); assert.equal(env.timers.size, 0);
    assert.equal(env.created.find(node => node.markup?.includes('<textarea')).open, true);
});

test('pending writes cannot confirm early, duplicate, or leave stale feedback after cancellation', async () => {
    for (const cancel of ['blur', 'pagehide', 'pointercancel', 'visibilitychange']) {
        let resolve, calls = 0;
        const env = environment({ write: () => { calls++; return new Promise(done => { resolve = done; }); } });
        const job = env.click(); await env.click();
        assert.equal(calls, 1); assert.equal(env.button.dataset.copyState, 'idle'); assert.equal(env.frames.size, 0);
        if (cancel === 'pointercancel') await env.button.emit(cancel);
        else if (cancel === 'visibilitychange') { env.document.hidden = true; await env.document.emit(cancel); }
        else await env.window.emit(cancel);
        resolve(); await job;
        assert.equal(env.button.dataset.copyState, 'idle', cancel); assert.equal(env.timers.size, 0); assert.equal(env.frames.size, 0);
        assert.equal(env.button.attributes['aria-busy'], undefined);
    }
});

test('failed writes retain manual copying and never display a successful confirmation', async () => {
    const env = environment({ write: async () => { throw Error('permission denied'); } });
    await env.click(); env.tick(1000);
    const dialog = env.created.find(node => node.markup?.includes('<textarea'));
    assert.equal(dialog.open, true); assert.equal(dialog.nodes.textarea.value, env.prompt);
    assert.equal(env.button.dataset.copyState, 'idle'); assert.equal(env.timers.size, 0);
    assert.equal(env.button.nodes['.delivery-copy-success'].style.opacity, '0.000');
});

test('reduced motion still copies and keeps confirmation without scheduling animation frames', async () => {
    const writes = [], env = environment({ reduced: true, write: async text => writes.push(text) });
    await env.click(); assert.equal(writes[0], env.prompt); assert.equal(env.button.dataset.copyState, 'copied');
    assert.equal(env.frames.size, 0); assert.equal(env.button.nodes['.delivery-copy-roll'].style.width, '39.00px');
    env.tick(60000); assert.equal(env.button.dataset.copyState, 'copied'); assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
});
