const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function environment(reduced = false) {
  class Element extends EventTarget {
    constructor() { super(); this.dataset = {}; this.attributes = {}; this.clientWidth = 600; }
    setAttribute(key, value) { this.attributes[key] = value; }
    emit(type, values = {}) { const event = new Event(type); Object.assign(event, values); this.dispatchEvent(event); }
  }
  const frames = new Map(), resources = { deleted: 0 }, media = new Element(), document = new Element(), window = new Element();
  media.matches = reduced; let id = 0;
  const drawing = new Proxy({
    measureText(text) { return { width: text.length * 90, actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 90, actualBoundingBoxAscent: 130, actualBoundingBoxDescent: 0 }; },
    getImageData() { return { data: new Uint8ClampedArray(1200 * 720 * 4) }; }
  }, { get(target, key) { return target[key] || (() => {}); }, set(target, key, value) { target[key] = value; return true; } });
  const gl = new Proxy({
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}), createTexture: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true, getAttribLocation: () => 0,
    deleteTexture() { resources.deleted++; }, deleteBuffer() { resources.deleted++; }, deleteProgram() { resources.deleted++; }
  }, { get(target, key) { return target[key] || (() => {}); } });
  document.createElement = () => ({ getContext: () => drawing });
  const context = vm.createContext({ document, window, Event, CustomEvent, AbortController, console, devicePixelRatio: 1,
    matchMedia: () => media, performance: { now: () => 0 }, ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame(key) { frames.delete(key); }
  });
  vm.runInContext(fs.readFileSync('single-web/motion-lab/spectral-logo/effect.js', 'utf8'), context);
  function root(fallback = false) {
    const element = new Element();
    element.querySelector = selector => selector === '.spectral-surface' ? { getContext: () => fallback ? null : gl, addEventListener() {} } : { getContext: () => drawing };
    return element;
  }
  return { mount: context.mountSpectralLogo, root, frames, resources, media, window, document };
}

test('spectral instances start still, cancel independently and release resources', () => {
  const env = environment(), a = env.root(), b = env.root();
  const first = env.mount(a), second = env.mount(b);
  assert.equal(env.frames.size, 0);
  first.update({ depth: 1.55, color: '#3377ff', theme: 'light' });
  assert.equal(first.getConfig().depth, 1.55);
  assert.equal(second.getConfig().depth, 1);
  assert.equal(env.frames.size, 0, 'parameter updates do not start playback');
  a.emit('pointerenter', { pointerType: 'mouse' });
  assert.equal(env.frames.size, 1);
  a.emit('pointerleave'); assert.equal(env.frames.size, 0);
  a.emit('keydown', { key: 'Enter' }); assert.equal(a.attributes['aria-pressed'], 'true');
  assert.equal(env.frames.size, 1);
  first.reset(); assert.equal(first.getConfig().theme, 'light'); assert.equal(first.getConfig().depth, 1);
  assert.equal(env.frames.size, 0);
  second.play(true); first.destroy(); assert.equal(env.frames.size, 1);
  a.emit('click'); assert.equal(env.frames.size, 1, 'destroyed instance has no listeners');
  env.window.emit('blur'); assert.equal(env.frames.size, 0);
  second.destroy(); assert.equal(env.resources.deleted, 6);
});

test('cover exits, touch cancellation and reduced motion leave no animation running', () => {
  const env = environment(), root = env.root(true), effect = env.mount(root);
  root.dataset.cover = 'true';
  root.emit('pointerenter', { pointerType: 'touch' }); assert.equal(env.frames.size, 0);
  root.emit('click'); assert.equal(env.frames.size, 1);
  root.emit('pointerleave'); assert.equal(env.frames.size, 0); assert.equal(root.attributes['aria-pressed'], 'false');
  effect.play(true); root.emit('pointercancel'); assert.equal(env.frames.size, 0);
  env.media.matches = true; env.media.emit('change'); effect.play(true);
  assert.equal(env.frames.size, 0);
  effect.update({ text: '<script>', color: 'invalid', depth: Infinity });
  assert.equal(effect.getConfig().text, '<script>', 'text is drawn into canvas, never parsed as HTML');
  assert.equal(effect.getConfig().color, '#73b6ff'); assert.equal(effect.getConfig().depth, 1);
  effect.destroy();
});
