/* No textures: every light strand is an animated parametric curve. */
(() => {
  'use strict';
  const canvas = document.querySelector('#light');
  const ctx = canvas.getContext('2d', { alpha: false });
  const core = document.createElement('canvas');
  const ink = core.getContext('2d');
  const W = 1440, H = W * 1268 / 2560;
  const params = { speed: 1, weave: .65, glow: 1 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = !reduced, skeleton = false, time = 0, last = 0, scale = 1;

  function resize() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    scale = canvas.width / W;
    core.width = canvas.width;
    core.height = canvas.height;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // An arched carrier + traveling waves. The edge envelope preserves a calm center.
  function point(u, strand, t) {
    const edge = Math.pow(Math.abs(u), 1.8);
    const phase = t * 1.7 - u * 9 + strand * .72;
    const envelope = (3 + 28 * edge) * params.weave;
    return [W * (.5 + .6 * u),
      188 + 88 * u * u + (strand - 8) * 3.35
      + Math.sin(phase) * envelope
      + Math.sin(phase * .54 + strand * .6) * envelope * .21];
  }

  function drawStrands(t) {
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.clearRect(0, 0, core.width, core.height);
    ink.setTransform(scale, 0, 0, scale, 0, 0);
    ink.globalCompositeOperation = 'lighter';
    ink.lineCap = 'round';
    // Overlapping filaments merge into a hot, continuous core in the middle.
    if (!skeleton) {
      const heat = ink.createLinearGradient(0, 0, W, 0);
      for (const [stop, alpha] of [[0, 0], [.15, .15], [.32, .95], [.5, 1], [.68, .95], [.85, .15], [1, 0]]) {
        heat.addColorStop(stop, `rgba(255,238,206,${alpha})`);
      }
      ink.strokeStyle = heat;
      ink.lineWidth = 12;
      ink.filter = `blur(${3 * scale}px)`;
      ink.beginPath();
      for (let k = 0; k <= 180; k++) {
        const u = -1.1 + k / 180 * 2.2;
        const x = W * (.5 + .6 * u), y = 190 + 88 * u * u;
        k ? ink.lineTo(x, y) : ink.moveTo(x, y);
      }
      ink.stroke();
      ink.filter = 'none';
    }
    // A faint dome of residual streaks, visible above the main light band.
    if (!skeleton) {
      for (let j = 0; j < 12; j++) {
        ink.beginPath();
        for (let k = 0; k <= 120; k++) {
          const u = -1.1 + k / 120 * 2.2;
          const x = W * (.5 + .6 * u);
          const y = 40 + j * 9 + 125 * u * u + Math.sin(u * 6 + t * .45 + j) * 2;
          k ? ink.lineTo(x, y) : ink.moveTo(x, y);
        }
        ink.strokeStyle = `rgba(125,69,54,${.013 + j * .0015})`;
        ink.lineWidth = 2;
        ink.stroke();
      }
    }
    for (let i = 0; i < 18; i++) {
      const gradient = ink.createLinearGradient(0, 0, W, 0);
      const color = skeleton ? `hsla(${12 + i * 4},95%,70%,` : 'rgba(255,219,177,';
      gradient.addColorStop(0, color + '.07)');
      gradient.addColorStop(.12, color + '.52)');
      gradient.addColorStop(.35, color + '.92)');
      gradient.addColorStop(.65, color + '.92)');
      gradient.addColorStop(.88, color + '.52)');
      gradient.addColorStop(1, color + '.07)');
      ink.strokeStyle = gradient;
      ink.lineWidth = skeleton ? 1 : 2.1 + Math.sin(i * 1.9) * .55;
      ink.beginPath();
      for (let k = 0; k <= 220; k++) {
        const [x, y] = point(-1.08 + k / 220 * 2.16, i, t);
        k ? ink.lineTo(x, y) : ink.moveTo(x, y);
      }
      ink.stroke();
      // Short luminous packets travel across the otherwise continuous strands.
      if (!skeleton) {
        for (let packet = 0; packet < 2; packet++) {
          const head = ((t * .12 + i * .073 + packet * .5) % 1) * 2.4 - 1.2;
          for (let n = 0; n < 12; n++) {
            const u = head - n * .013;
            if (Math.abs(u) > 1.1) continue;
            const a = point(u, i, t), b = point(u - .014, i, t);
            const intensity = (1 - n / 12) * .6;
            ink.strokeStyle = `rgba(255,245,216,${intensity})`;
            ink.lineWidth = 2;
            ink.beginPath(); ink.moveTo(...a); ink.lineTo(...b); ink.stroke();
          }
        }
      }
    }
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.fillStyle = '#030303';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!skeleton) {
      ctx.save();
      ctx.scale(scale, scale * .24);
      const haze = ctx.createRadialGradient(W / 2, 510, 70, W / 2, 510, 760);
      haze.addColorStop(0, 'rgba(115,60,45,.13)');
      haze.addColorStop(.66, 'rgba(100,64,52,.09)');
      haze.addColorStop(1, 'rgba(30,20,15,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H / .24);
      ctx.restore();
    }
    drawStrands(t);
    ctx.globalCompositeOperation = 'lighter';
    if (!skeleton && params.glow > 0) {
      // Wide red bloom, tighter orange bloom, then the unblurred warm-white core.
      for (const [blur, opacity, color] of [[30, .62, '#ef3c22'], [11, .9, '#ff5c37'], [3.5, .95, '#ff9b64']]) {
        ctx.save();
        ctx.filter = `blur(${blur * scale}px)`;
        ctx.globalAlpha = opacity * params.glow;
        // Tint a silhouette using a reusable temporary canvas to retain antialiasing.
        tintCtx.setTransform(1, 0, 0, 1, 0, 0);
        tintCtx.globalCompositeOperation = 'source-over';
        tintCtx.clearRect(0, 0, tint.width, tint.height);
        tintCtx.drawImage(core, 0, 0);
        tintCtx.globalCompositeOperation = 'source-in';
        tintCtx.fillStyle = color;
        tintCtx.fillRect(0, 0, tint.width, tint.height);
        for (let bloom = 0; bloom < 3; bloom++) ctx.drawImage(tint, 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.drawImage(core, 0, 0);
    // Subtle drifting dust. Fixed formulas avoid frame-to-frame random flicker.
    if (!skeleton) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      for (let i = 0; i < 17; i++) {
        const x = (i * 319.7 + t * (4 + i % 3)) % W;
        const y = 255 + Math.sin(i * 17.1) * 72 + Math.sin(t * .3 + i) * 7;
        ctx.fillStyle = `rgba(255,176,119,${.07 + .12 * Math.pow(Math.sin(t + i * 8), 8)})`;
        ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
      }
    }
  }
  const tint = document.createElement('canvas'), tintCtx = tint.getContext('2d');
  function frame(now) {
    if (tint.width !== core.width || tint.height !== core.height) { tint.width = core.width; tint.height = core.height; }
    if (last && playing && !document.hidden) time += Math.min((now - last) / 1000, .05) * params.speed;
    last = now;
    render(time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const playButton = document.querySelector('#play');
  function updatePlay() {
    playButton.textContent = playing ? 'Ⅱ' : '▶';
    playButton.setAttribute('aria-label', playing ? '暂停动画' : '播放动画');
    document.querySelector('#state').textContent = playing ? '实时渲染 · Canvas 2D' : '已暂停 · Canvas 2D';
  }
  updatePlay();
  playButton.onclick = () => { playing = !playing; updatePlay(); };
  for (const name of ['speed', 'weave', 'glow']) {
    document.querySelector('#' + name).oninput = event => {
      params[name] = Number(event.target.value);
      document.querySelector('#' + name + '-value').value = name === 'speed' ? params[name].toFixed(2) + '×' : Math.round(params[name] * 100) + '%';
    };
  }
  document.querySelector('#layers').onclick = event => {
    skeleton = !skeleton;
    event.currentTarget.setAttribute('aria-pressed', String(skeleton));
    event.currentTarget.textContent = skeleton ? '恢复辉光' : '拆解光轨';
  };
  document.querySelector('#reset').onclick = () => {
    for (const [key, value] of Object.entries({ speed: 1, weave: .65, glow: 1 })) {
      const input = document.querySelector('#' + key);
      input.value = value; input.dispatchEvent(new Event('input'));
    }
    time = 0;
  };
  document.querySelector('#compare').onclick = event => {
    const reference = document.querySelector('.reference');
    reference.hidden = !reference.hidden;
    document.querySelector('.preview').classList.toggle('comparing', !reference.hidden);
    event.currentTarget.setAttribute('aria-pressed', String(!reference.hidden));
    const video = reference.querySelector('video');
    if (!reference.hidden) { if (playing) video.play().catch(() => {}); }
    else video.pause();
  };
  document.querySelector('#newsletter').onsubmit = event => {
    event.preventDefault();
    document.querySelector('#form-note').textContent = '演示模式：邮箱未发送或保存。';
  };
})();
