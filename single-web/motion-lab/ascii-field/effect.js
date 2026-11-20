/* ASCII field renderer shared by preview, cover and delivery. Self-contained: no outer references. */
window.mountAsciiField = function mountAsciiField(root, initial = {}) {
  const defaults = { color: '#3f6bff', multicolor: false, colors: ['#1b2a4a', '#2f6df6', '#38c6d9', '#c4f5e4'], pattern: 'flow', characters: ' .:-=+*#%@', cellSize: 9, scale: .4, density: .7, fade: .6, glow: .53, twinkle: .23, speed: 1, seed: 28, animate: true, interactive: true, radius: 100, magnify: .6, wake: .7, background: '' };
  const config = { ...defaults, ...initial, colors: (initial.colors || defaults.colors).slice() };
  const canvas = root.querySelector('canvas') || root.appendChild(document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  const atlas = document.createElement('canvas'), atlasCtx = atlas.getContext('2d');
  const glowCanvas = document.createElement('canvas'), glowCtx = glowCanvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const on = (node, type, fn) => node.addEventListener(type, fn, { signal: events.signal });
  const LEVELS = 12, RING_LIFE = 1.4, RING_SPEED = 450;
  let width = 0, height = 0, dpr = 1, cols = 0, rows = 0, cellW = 0, cellH = 0, tile = 0, glyphs = [];
  let wake = new Float32Array(0), glowData = null;
  let time = 0, last = 0, frame = 0, visible = true, destroyed = false, seedHash = 0, centers = [];
  let rings = [];
  const pointer = { x: 0, y: 0, active: false, lens: 0, lastX: null, lastY: null, touchId: null };

  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  function rgb(hex) { const m = String(hex).replace('#', '').match(/^([\da-f]{3}|[\da-f]{6})$/i); if (!m) return [63, 107, 255]; let h = m[1]; if (h.length === 3) h = h.replace(/./g, c => c + c); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function hash(x, y, s = seedHash) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + s | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, octaves) {
    let sum = 0, amp = .5, norm = 0;
    for (let i = 0; i < octaves; i++) { sum += amp * noise(x, y); norm += amp; x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; amp *= .5; }
    return sum / norm;
  }
  function reseed() {
    seedHash = Math.imul((config.seed | 0) + 1, 2654435761) | 0;
    centers = [0, 1, 2].map(i => [.15 + .7 * hash(i, 11), .15 + .7 * hash(i, 23), .6 + .8 * hash(i, 37)]);
  }
  // Field shape in [0,1] for a point in CSS pixels at time t.
  function shape(x, y, t) {
    // Anchor the composition at the box centre so small and large boxes share the same focal area.
    const s = 1 / (175 * config.scale), u = (x - width / 2 + 600) * s, v = (y - height / 2 + 300) * s * 1.15;
    if (config.pattern === 'waves') {
      const a = Math.sin(u * 3.1 + t * 1.1 + 1.7 * Math.sin(v * 1.3 - t * .35));
      const b = Math.sin(v * 3.6 - u * 1.4 - t * .8 + 1.2 * Math.sin(u * 1.1 + t * .25));
      const n = fbm(u * .9 + t * .1, v * .9, 2);
      return clamp(.5 + .26 * a + .22 * b + (n - .5) * .7);
    }
    if (config.pattern === 'rings') {
      let sum = 0;
      for (const [cx, cy, k] of centers) {
        const d = Math.hypot(x - cx * width, y - cy * height) * s;
        sum += Math.sin(d * 5.2 * k - t * 2.2) * Math.exp(-d * .28);
      }
      const n = fbm(u * 1.2 - t * .08, v * 1.2, 2);
      return clamp(.48 + .34 * sum / 1.6 + (n - .5) * .65);
    }
    // Two-stage domain warp stretches value noise into curved, drifting ribbons.
    const px = u * .45, py = v * .6;
    const qx = fbm(px + .16 * t, py - .1 * t, 3), qy = fbm(px + 5.2 - .12 * t, py + 1.3 + .14 * t, 3);
    const rx = fbm(px + 1.6 * qx + 1.7 + .2 * t, py + 1.6 * qy + 9.2, 2), ry = fbm(px + 1.6 * qx + 8.3, py + 1.6 * qy + 2.8 - .18 * t, 2);
    const f = fbm(px + 1.8 * rx - .08 * t, py + 1.8 * ry, 2);
    return clamp((f - .3) / .4);
  }

  function buildAtlas() {
    glyphs = Array.from(config.characters || ' ').slice(0, 24);
    if (!glyphs.length) glyphs = [' '];
    tile = Math.ceil(cellH * 1.7 * dpr);
    atlas.width = tile * glyphs.length; atlas.height = tile * LEVELS;
    atlasCtx.clearRect(0, 0, atlas.width, atlas.height);
    atlasCtx.textAlign = 'center'; atlasCtx.textBaseline = 'middle';
    atlasCtx.font = '400 ' + (cellH * .76 * dpr * 1.25).toFixed(2) + 'px ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';
    const palette = config.multicolor ? config.colors.slice(0, 6).map(rgb) : null, base = rgb(config.color);
    for (let level = 0; level < LEVELS; level++) {
      const k = level / (LEVELS - 1);
      let c = base;
      if (palette && palette.length > 1) {
        const p = k * (palette.length - 1), i = Math.min(palette.length - 2, Math.floor(p)), f = p - i;
        c = palette[i].map((value, j) => Math.round(value + (palette[i + 1][j] - value) * f));
      }
      atlasCtx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(.34 + .44 * k).toFixed(3)})`;
      glyphs.forEach((glyph, i) => { if (glyph !== ' ') atlasCtx.fillText(glyph, i * tile + tile / 2, level * tile + tile / 2); });
    }
  }
  function resize() {
    const box = root.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    cellH = Math.max(6, config.cellSize); cellW = cellH * .6;
    cols = Math.ceil(width / cellW); rows = Math.ceil(height / cellH);
    wake = new Float32Array(cols * rows);
    glowCanvas.width = cols; glowCanvas.height = rows; glowData = glowCtx.createImageData(cols, rows);
    buildAtlas();
  }

  function draw(now) {
    const t = time * .3, lens = pointer.lens, R = config.radius, mag = config.magnify * .65;
    const n = glyphs.length, shuffle = Math.floor(now / 90), twinkleRate = config.twinkle * .16;
    const glowRGB = config.multicolor ? rgb(config.colors[Math.min(config.colors.length - 1, 2)]) : rgb(config.color);
    const motion = !reduced.matches, ringsNow = motion ? rings.map(ring => [ring.x, ring.y, (now - ring.start) / 1000]) : [];
    const gd = glowData.data;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (config.background) { ctx.fillStyle = config.background; ctx.fillRect(0, 0, canvas.width, canvas.height); } else ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cells = [];
    for (let row = 0; row < rows; row++) {
      const y = (row + .5) * cellH, ny = y / height * 2 - 1;
      for (let col = 0; col < cols; col++) {
        const x = (col + .5) * cellW, nx = x / width * 2 - 1, index = row * cols + col;
        let sx = x, sy = y, focus = 0;
        if (lens > .001) {
          const dx = x - pointer.x, dy = y - pointer.y, d = Math.hypot(dx, dy);
          if (d < R) { const k = 1 - d / R; focus = k * k * (3 - 2 * k) * lens; sx = pointer.x + dx * (1 - mag * focus); sy = pointer.y + dy * (1 - mag * focus); }
        }
        const base = shape(sx, sy, t);
        let v = clamp((base - (1 - config.density)) / Math.max(config.density, .001));
        v *= 1 - config.fade * smooth(.3, 1.05, Math.hypot(nx * .92, ny) / 1.36);
        const h = hash(col, row, seedHash ^ 0x5bd1e995);
        if (h < twinkleRate) {
          const pulse = Math.pow(Math.max(0, Math.sin(time * (.6 + h * 9) + h * 97)), 28);
          v = Math.max(v, pulse * (.55 + .45 * config.twinkle));
        }
        // Trail and rings scatter random glyphs rather than brightening smoothly.
        const stir = wake[index];
        let ring = 0;
        for (const [rx, ry, age] of ringsNow) {
          const d = Math.hypot(x - rx, y - ry) - age * RING_SPEED, fadeOut = 1 - age / RING_LIFE;
          if (Math.abs(d) < 90) ring += Math.exp(-d * d / 1400) * fadeOut;
        }
        v = clamp(v + focus * .8 * (.3 + v));
        if (gd) { const p = index * 4, g = smooth(.4, 1, v) * config.glow; gd[p] = glowRGB[0]; gd[p + 1] = glowRGB[1]; gd[p + 2] = glowRGB[2]; gd[p + 3] = g * 60; }
        let glyph = Math.round(clamp(v + (h - .5) * .015) * (n - 1)), level = Math.round(v * (LEVELS - 1));
        if ((stir > .02 || ring > .02) && n > 2) {
          const roll = hash(col + shuffle * 7, row - shuffle * 3, seedHash), pick = hash(col - shuffle, row + shuffle * 5, seedHash ^ 0x2545f491);
          // Rings speckle dense glyphs; the trail mixes the whole set.
          if (roll < Math.min(.7, ring)) { const k = .55 + .45 * pick; glyph = Math.round(k * (n - 1)); level = Math.max(level, Math.round(k * (LEVELS - 1))); }
          else if (roll < Math.min(.85, stir + ring)) { glyph = 1 + Math.floor(pick * (n - 1)); level = Math.round(pick * (LEVELS - 1)); }
        }
        if (v <= .005 && stir <= .02 && ring <= .02) continue;
        if (glyphs[glyph] === ' ') continue;
        glyph = Math.min(n - 1, glyph);
        cells.push(x, y, glyph, level, 1 + config.magnify * .7 * focus);
      }
    }
    if (config.glow > 0) {
      glowCtx.putImageData(glowData, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.filter = 'blur(' + (cellH * 1.1 * dpr).toFixed(1) + 'px)';
      ctx.drawImage(glowCanvas, 0, 0, cols * cellW * dpr, rows * cellH * dpr); ctx.restore();
    }
    if (lens > .001) {
      // Pale tint disc under the lens.
      const tint = ctx.createRadialGradient(pointer.x * dpr, pointer.y * dpr, 0, pointer.x * dpr, pointer.y * dpr, R * dpr);
      tint.addColorStop(0, `rgba(${glowRGB[0]},${glowRGB[1]},${glowRGB[2]},${(.1 * lens).toFixed(3)})`);
      tint.addColorStop(1, `rgba(${glowRGB[0]},${glowRGB[1]},${glowRGB[2]},0)`);
      ctx.fillStyle = tint; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const unit = cellH * 1.7 / 1.25;
    for (let i = 0; i < cells.length; i += 5) {
      const size = unit * cells[i + 4] * dpr;
      ctx.drawImage(atlas, cells[i + 2] * tile, cells[i + 3] * tile, tile, tile, cells[i] * dpr - size / 2, cells[i + 1] * dpr - size / 2, size, size);
    }
  }

  function busy() {
    const target = pointer.active && config.interactive ? 1 : 0;
    return (config.animate && config.speed > 0 && !reduced.matches) || Math.abs(target - pointer.lens) > .001 || rings.length > 0 || wake.some(value => value > .004);
  }
  function tick(now) {
    frame = 0;
    if (destroyed) return;
    const dt = Math.min(.05, last ? (now - last) / 1000 : 0); last = now;
    if (config.animate && !reduced.matches) time += dt * config.speed;
    pointer.lens += ((pointer.active && config.interactive ? 1 : 0) - pointer.lens) * (1 - Math.exp(-dt * 10));
    const target = pointer.active && config.interactive ? 1 : 0;
    if (Math.abs(target - pointer.lens) < .001) pointer.lens = target;
    const decay = Math.exp(-dt / (reduced.matches ? .15 : .25 + config.wake * .6));
    for (let i = 0; i < wake.length; i++) wake[i] *= decay;
    rings = rings.filter(ring => (now - ring.start) / 1000 < RING_LIFE);
    draw(now);
    if (visible && !document.hidden && busy()) frame = requestAnimationFrame(tick); else last = 0;
  }
  function kick() { if (!frame && !destroyed && visible && !document.hidden && busy()) { last = 0; frame = requestAnimationFrame(tick); } }
  function render() { if (!destroyed) draw(performance.now()); }

  function stamp(x0, y0, x1, y1) {
    if (!config.wake || reduced.matches) return;
    const r = Math.max(cellH, config.radius * .5), steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / cellW));
    for (let s = 1; s <= steps; s++) {
      const px = x0 + (x1 - x0) * s / steps, py = y0 + (y1 - y0) * s / steps;
      const c0 = Math.max(0, Math.floor((px - r) / cellW)), c1 = Math.min(cols - 1, Math.ceil((px + r) / cellW));
      const r0 = Math.max(0, Math.floor((py - r) / cellH)), r1 = Math.min(rows - 1, Math.ceil((py + r) / cellH));
      for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
        const d = Math.hypot((col + .5) * cellW - px, (row + .5) * cellH - py) / r;
        if (d < 1) { const i = row * cols + col; wake[i] = Math.min(1, Math.max(wake[i], config.wake * .9 * (1 - d) * (1 - d))); }
      }
    }
  }
  function local(event) { const box = root.getBoundingClientRect(); return [event.clientX - box.left, event.clientY - box.top]; }
  function move(event) {
    if (!config.interactive) return;
    if (event.pointerType === 'touch' && event.pointerId !== pointer.touchId) return;
    const [x, y] = local(event);
    if (pointer.lastX !== null) stamp(pointer.lastX, pointer.lastY, x, y);
    pointer.x = x; pointer.y = y; pointer.lastX = x; pointer.lastY = y; pointer.active = true;
    kick();
  }
  function leave(event) { if (event.pointerType === 'touch') return; release(); }
  function release() {
    const id = pointer.touchId; pointer.touchId = null;
    pointer.active = false; pointer.lastX = pointer.lastY = null;
    if (id !== null && root.hasPointerCapture?.(id)) root.releasePointerCapture(id);
    kick();
  }
  function press(event) {
    if (!config.interactive || (event.button !== undefined && event.button > 0)) return;
    const [x, y] = local(event);
    pointer.x = x; pointer.y = y; pointer.lastX = x; pointer.lastY = y; pointer.active = true;
    if (event.pointerType === 'touch') { pointer.touchId = event.pointerId; root.setPointerCapture?.(event.pointerId); }
    if (!reduced.matches) { rings.push({ x, y, start: performance.now() }); if (rings.length > 6) rings.shift(); }
    kick();
  }
  function clear() { release(); rings = []; wake.fill(0); pointer.lens = 0; cancelAnimationFrame(frame); frame = 0; last = 0; }
  function keyboard(event) {
    if (!config.interactive || event.target !== root || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat || reduced.matches) return;
    rings.push({ x: width / 2, y: height / 2, start: performance.now() });
    if (rings.length > 6) rings.shift();
    kick();
  }
  function accessibility() {
    root.setAttribute('role', 'button'); root.setAttribute('tabindex', config.interactive ? '0' : '-1');
    root.setAttribute('aria-disabled', String(!config.interactive));
    root.setAttribute('aria-label', '字符光场：移动指针查看透镜与拖尾，点击或按 Enter、空格发出涟漪');
    canvas.setAttribute('aria-hidden', 'true');
  }

  on(root, 'pointerenter', event => { if (event.pointerType !== 'touch') move(event); });
  on(root, 'pointermove', move);
  on(root, 'pointerdown', press);
  on(root, 'pointerleave', leave);
  on(root, 'pointerup', event => { if (event.pointerId === pointer.touchId) release(); });
  on(root, 'lostpointercapture', event => { if (event.pointerId === pointer.touchId) release(); });
  on(root, 'pointercancel', release);
  on(root, 'keydown', keyboard);
  on(window, 'blur', () => { clear(); render(); kick(); });
  on(document, 'visibilitychange', () => { clear(); if (!document.hidden) { render(); kick(); } });
  on(reduced, 'change', () => { clear(); render(); kick(); });
  const observer = new ResizeObserver(() => { resize(); render(); }); observer.observe(root);
  const viewport = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) { render(); kick(); } else clear();
  }) : null;
  viewport?.observe(root);
  accessibility(); reseed(); resize(); render(); kick();

  return {
    update(next) {
      if (destroyed) return;
      const prev = { ...config };
      Object.assign(config, next);
      if (next.colors) config.colors = next.colors.slice();
      if (prev.seed !== config.seed) reseed();
      if (prev.cellSize !== config.cellSize) resize();
      else if (['characters', 'color', 'multicolor', 'colors'].some(key => key in next)) buildAtlas();
      if (!config.interactive) clear();
      if ('interactive' in next) accessibility();
      render(); kick();
    },
    play(enabled = true) { if (destroyed) return; config.animate = Boolean(enabled); if (!busy()) { cancelAnimationFrame(frame); frame = 0; last = 0; } kick(); },
    reset() { if (destroyed) return; config.animate = false; time = 0; clear(); render(); },
    getConfig() { return { ...config, colors: config.colors.slice() }; },
    destroy() { if (destroyed) return; destroyed = true; clear(); events.abort(); observer.disconnect(); viewport?.disconnect(); }
  };
};
