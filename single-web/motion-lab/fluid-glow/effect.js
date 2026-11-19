/* Parametric Canvas renderer shared by preview and delivery. */
window.mountFluidGlow = function mountFluidGlow(canvas, initial = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const core = document.createElement('canvas');
  const ink = core.getContext('2d');
  const W = 1440, H = W * 1268 / 2560;
  const params = { speed: 1, weave: .65, glow: 1, spacing: 3.35, thickness: 2.1, curvature: 1, 'offset-x': 0, 'offset-y': 0, ...initial.params };
  let widthMode = initial.widthMode || 'thin';
  // Generate once per shuffle, never per frame, so each strand keeps its width.
  let widthWeights = initial.widthWeights?.slice() || Array.from({ length: 18 }, () => .25 + Math.random() * 1.75);
  function strandWidth(index) {
    return params.thickness * (widthMode === 'random' ? widthWeights[index] : 1);
  }
  const defaultColor = '#ff5c37';
  function toHsl(hex) {
    const rgb = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255);
    const [r, g, b] = rgb, max = Math.max(...rgb), min = Math.min(...rgb);
    const delta = max - min, lightness = (max + min) / 2;
    let hue = 0;
    if (delta) {
      if (max === r) hue = ((g - b) / delta + 6) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
    }
    return [hue * 60, delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0, lightness];
  }
  // Shift the original palette as a family, preserving its hot, near-white core.
  const anchor = toHsl(defaultColor);
  let palette;
  function setColor(hex) {
    const chosen = toHsl(hex);
    const tint = (source, alpha = 1) => {
      const [h, s, l] = toHsl(source);
      const hue = (h + chosen[0] - anchor[0] + 360) % 360;
      const lightness = Math.max(0, Math.min(1, l + (chosen[2] - anchor[2]) * .35));
      return `hsla(${hue},${s * chosen[1] * 100}%,${lightness * 100}%,${alpha})`;
    };
    palette = {
      heat: alpha => tint('#ffeece', alpha),
      ghost: alpha => tint('#7d4536', alpha),
      strand: alpha => tint('#ffdbb1', alpha),
      packet: alpha => tint('#fff5d8', alpha),
      haze: [tint('#733c2d', .13), tint('#644034', .09)],
      bloom: ['#ef3c22', '#ff5c37', '#ff9b64'].map(color => tint(color)),
      dust: alpha => tint('#ffb077', alpha),
      wireHue: chosen[0]
    };
  }
  let color = initial.color || defaultColor; setColor(color);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = false, skeleton = initial.skeleton || false, time = 0, last = 0, scale = 1, frameId = 0, destroyed = false;

  function resize() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    scale = canvas.width / W;
    core.width = canvas.width;
    core.height = canvas.height;
  }
  const observer = new ResizeObserver(() => { resize(); draw(); }); observer.observe(canvas);
  resize();

  function arcBend(u, coefficient = 88) {
    return coefficient * params.curvature * u * u;
  }

  // An arched carrier + traveling waves. The edge envelope preserves a calm center.
  function point(u, strand, t) {
    const edge = Math.pow(Math.abs(u), 1.8);
    const phase = t * 1.7 - u * 9 + strand * .72;
    const envelope = (3 + 28 * edge) * params.weave;
    return [W * (.5 + .6 * u),
      188 + arcBend(u) + (strand - 8.5) * params.spacing + 1.675
      + Math.sin(phase) * envelope
      + Math.sin(phase * .54 + strand * .6) * envelope * .21];
  }

  function drawStrands(t) {
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.clearRect(0, 0, core.width, core.height);
    ink.setTransform(scale, 0, 0, scale, params['offset-x'] * scale, params['offset-y'] * scale);
    ink.globalCompositeOperation = 'lighter';
    ink.lineCap = 'round';
    // Overlapping filaments merge into a hot, continuous core in the middle.
    if (!skeleton) {
      const heat = ink.createLinearGradient(0, 0, W, 0);
      for (const [stop, alpha] of [[0, 0], [.15, .15], [.32, .95], [.5, 1], [.68, .95], [.85, .15], [1, 0]]) {
        heat.addColorStop(stop, palette.heat(alpha));
      }
      ink.strokeStyle = heat;
      ink.lineWidth = 12 * params.thickness / 2.1;
      ink.filter = `blur(${3 * scale}px)`;
      ink.beginPath();
      for (let k = 0; k <= 180; k++) {
        const u = -1.1 + k / 180 * 2.2;
        const x = W * (.5 + .6 * u), y = 190 + arcBend(u);
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
          const y = 40 + j * 9 + arcBend(u, 125) + Math.sin(u * 6 + t * .45 + j) * 2;
          k ? ink.lineTo(x, y) : ink.moveTo(x, y);
        }
        ink.strokeStyle = palette.ghost(.013 + j * .0015);
        ink.lineWidth = 2;
        ink.stroke();
      }
    }
    for (let i = 0; i < 18; i++) {
      const gradient = ink.createLinearGradient(0, 0, W, 0);
      const color = alpha => skeleton ? `hsla(${palette.wireHue + i * 4},95%,70%,${alpha})` : palette.strand(alpha);
      gradient.addColorStop(0, color(.07));
      gradient.addColorStop(.12, color(.52));
      gradient.addColorStop(.35, color(.92));
      gradient.addColorStop(.65, color(.92));
      gradient.addColorStop(.88, color(.52));
      gradient.addColorStop(1, color(.07));
      ink.strokeStyle = gradient;
      ink.lineWidth = strandWidth(i);
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
            ink.strokeStyle = palette.packet(intensity);
            ink.lineWidth = strandWidth(i);
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
      ctx.setTransform(scale, 0, 0, scale * .24, params['offset-x'] * scale, params['offset-y'] * scale);
      const haze = ctx.createRadialGradient(W / 2, 510, 70, W / 2, 510, 760);
      haze.addColorStop(0, palette.haze[0]);
      haze.addColorStop(.66, palette.haze[1]);
      haze.addColorStop(1, 'rgba(30,20,15,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H / .24);
      ctx.restore();
    }
    drawStrands(t);
    ctx.globalCompositeOperation = 'lighter';
    if (!skeleton && params.glow > 0) {
      // Wide red bloom, tighter orange bloom, then the unblurred warm-white core.
      for (const [blur, opacity, color] of [[30, .62, palette.bloom[0]], [11, .9, palette.bloom[1]], [3.5, .95, palette.bloom[2]]]) {
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
      ctx.setTransform(scale, 0, 0, scale, params['offset-x'] * scale, params['offset-y'] * scale);
      for (let i = 0; i < 17; i++) {
        const x = (i * 319.7 + t * (4 + i % 3)) % W;
        const y = 255 + Math.sin(i * 17.1) * 72 + Math.sin(t * .3 + i) * 7;
        ctx.fillStyle = palette.dust(.07 + .12 * Math.pow(Math.sin(t + i * 8), 8));
        ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
      }
    }
  }
  const tint = document.createElement('canvas'), tintCtx = tint.getContext('2d');
  function frame(now) {
    if (tint.width !== core.width || tint.height !== core.height) { tint.width = core.width; tint.height = core.height; }
    if (last && playing && !document.hidden) time += Math.min((now - last) / 1000, .05) * params.speed * (reduced.matches ? .15 : 1);
    last = now;
    render(time);
    if (playing && !destroyed) frameId = requestAnimationFrame(frame);
  }
  function draw() { cancelAnimationFrame(frameId); frameId = 0; frame(performance.now()); }
  draw();

  return {
    update(next={}) {
      Object.assign(params,next.params);
      if(next.widthMode) widthMode=next.widthMode;
      if(next.widthWeights) widthWeights=next.widthWeights.slice();
      if(next.color){color=next.color;setColor(color);}
      if(next.skeleton!==undefined)skeleton=next.skeleton;
      draw();
    },
    play(value){playing=value;last=0;draw();},
    reset(){playing=false;time=0;last=0;draw();},
    getConfig:()=>({params:{...params},widthMode,widthWeights:widthWeights.slice(),color,skeleton}),
    destroy(){destroyed=true;playing=false;cancelAnimationFrame(frameId);observer.disconnect();}
  };

};
