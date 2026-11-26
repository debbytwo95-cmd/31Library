/* Signed-distance typography and a depth-sampled light volume. No video textures. */
function mountSpectralLogo(root, initial = {}) {
  const defaults = { text: '31Library', color: '#73b6ff', depth: 1, wave: 1, glow: 1, speed: 1, tracking: true, theme: 'dark' };
  let config = { ...defaults, ...initial }, destroyed = false, frame = 0, time = 0, previous = 0, hovering = false, playing = false;
  const canvas = root.querySelector('.spectral-surface'), overlay = root.querySelector('.spectral-tracking');
  const ink = overlay.getContext('2d'), gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  const media = matchMedia('(prefers-reduced-motion: reduce)'), events = new AbortController();
  const W = 1200, H = 720;
  let boxes = [], program, texture, buffer, uniforms = {}, available = Boolean(gl), lost = false;
  const vertex = 'attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
  const fragment = `precision highp float;
varying vec2 uv;
uniform sampler2D mask;
uniform vec3 tint;
uniform float clock,depth,wave,glow,light;
float distanceAt(vec2 p){if(p.x<0.||p.x>1200.||p.y<0.||p.y>720.)return 32.;return (texture2D(mask,p/vec2(1200.,720.)).r*255.-128.)/4.;}
void main(){
  vec2 p=vec2(uv.x,1.-uv.y)*vec2(1200.,720.);
  float x=p.x/1200.;
  float beam=0.;
  for(int i=1;i<=56;i++){
    float z=float(i)/56.;
    float bend=sin(x*8.2-clock*1.25+z*2.1)*wave;
    vec2 offset=vec2(z*(36.+56.*sin(clock*.67))+sin(z*3.14)*22.*sin(x*12.-clock),z*(95.+72.*bend));
    offset+=vec2(12.*sin(x*17.+z*7.-clock*1.3),15.*sin(x*21.-z*5.-clock*1.7))*sin(z*3.14159)*wave;
    offset*=depth;
    float d=abs(distanceAt(p-offset));
    float ribbon=exp(-d*(1.1-z*.65))+.12*exp(-d*.15);
    float ridge=.55+.45*pow(max(.0001,.5+.5*sin(z*21.-x*13.+clock*1.2)),2.);
    beam+=ribbon*pow(max(.0001,1.-z),1.15)*ridge*.105;
  }
  float d=distanceAt(p);
  float rim=exp(-abs(d)*1.4);
  float halo=exp(-abs(d)*.20)*.12;
  vec3 radiance=(tint*tint*beam*4.8+mix(tint,vec3(.90,.96,1.),.6)*rim*1.2+tint*halo)*glow;
  float face=1.-smoothstep(-.8,.65,d);
  radiance*=1.-face*.98;
  vec3 dark=vec3(.004,.006,.009)+1.-exp(-radiance);
  vec3 paper=vec3(.975,.978,.985)-tint.bgr*min(beam*.38*glow, .50);
  paper=mix(paper,vec3(.07,.10,.15),face*.96);
  paper-=vec3(.30,.20,.06)*rim*.50;
  float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
  gl_FragColor=vec4(mix(dark,paper,light)+grain*.009,1.);
}`;
  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message); }
    return shader;
  }
  function initialize() {
    const shaders = [];
    try {
      program = gl.createProgram(); shaders.push(compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment));
      shaders.forEach(shader => gl.attachShader(program, shader)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      for (const name of ['clock','depth','wave','glow','light','tint']) uniforms[name] = gl.getUniformLocation(program, name);
      available = true;
    } catch (error) { available = false; console.warn('Spectral Logo: static typography fallback.', error); }
    finally { shaders.forEach(shader => gl.deleteShader(shader)); }
  }
  // Two chamfer sweeps yield a signed field in design pixels, uploaded only when text changes.
  function buildMask() {
    const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    const text = config.text || defaults.text;
    let size = 180;
    ctx.font = `400 ${size}px LibraryButtonInter, Inter, Arial, sans-serif`;
    size *= Math.min(1, 900 / Math.max(1, ctx.measureText(text).width));
    ctx.font = `400 ${size}px LibraryButtonInter, Inter, Arial, sans-serif`;
    const width = ctx.measureText(text).width, left = (W - width) / 2, baseline = 382;
    ctx.fillStyle = '#fff'; ctx.fillText(text, left, baseline);
    boxes = []; let prefix = '';
    for (const char of Array.from(text)) {
      const x = left + ctx.measureText(prefix).width; prefix += char;
      const m = ctx.measureText(char);
      if (char.trim()) boxes.push({ x: x - m.actualBoundingBoxLeft, y: baseline - m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent });
    }
    root.setAttribute('aria-label', `${text} 蓝色光谱字标，悬停流动，点击锁定或暂停`);
    if (!available) return;
    const pixels = ctx.getImageData(0, 0, W, H).data, field = new Float32Array(W * H);
    field.fill(64);
    const inside = i => pixels[i * 4 + 3] > 127;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, solid = inside(i);
      if (solid !== inside(i - 1) || solid !== inside(i + 1) || solid !== inside(i - W) || solid !== inside(i + W)) field[i] = .5;
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; field[i] = Math.min(field[i], field[i-1]+1, field[i-W]+1, field[i-W-1]+1.4142, field[i-W+1]+1.4142);
    }
    for (let y = H - 2; y > 0; y--) for (let x = W - 2; x > 0; x--) {
      const i = y * W + x; field[i] = Math.min(field[i], field[i+1]+1, field[i+W]+1, field[i+W+1]+1.4142, field[i+W-1]+1.4142);
    }
    const data = new Uint8Array(W * H);
    for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, 128 + (inside(i) ? -1 : 1) * field[i] * 4));
    gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W, H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
  }
  function drawTracking() {
    ink.setTransform(overlay.width / W, 0, 0, overlay.height / H, 0, 0); ink.clearRect(0, 0, W, H);
    if (!available) {
      ink.font = '400 160px LibraryButtonInter, Inter, Arial, sans-serif'; ink.textAlign = 'center'; ink.fillStyle = config.theme === 'light' ? '#171b25' : config.color; ink.fillText(config.text, W / 2, 382); ink.textAlign = 'start';
    }
    if (!config.tracking) return;
    ink.lineWidth = .65; ink.strokeStyle = config.theme === 'light' ? '#59616e88' : '#d6e6ff88';
    boxes.forEach((box, i) => {
      const drift = media.matches ? 0 : Math.sin(time * 1.3 + i * .85) * 3;
      const x = box.x - 3, y = box.y - 5 + drift;
      ink.strokeRect(x, y, box.width + 6, box.height + 10);
      if (root.dataset.cover === 'true') return;
      ink.fillStyle = config.theme === 'light' ? '#f8f9fc' : '#080c12'; ink.fillRect(x, y, 48, 10);
      ink.fillStyle = config.theme === 'light' ? '#3f4d60' : '#ecf5ff'; ink.font = '5.5px monospace'; ink.fillText('VECTOR ' + String(i + 1).padStart(2, '0'), x + 2, y + 7);
    });
  }
  function draw() {
    if (destroyed || lost) return;
    root.dataset.theme = config.theme;
    if (available) {
      gl.useProgram(program); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uniforms.clock, time); gl.uniform1f(uniforms.depth, config.depth * (media.matches ? .35 : 1));
      gl.uniform1f(uniforms.wave, config.wave); gl.uniform1f(uniforms.glow, config.glow); gl.uniform1f(uniforms.light, config.theme === 'light' ? 1 : 0);
      const rgb = config.color.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255); gl.uniform3fv(uniforms.tint, rgb);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    drawTracking();
  }
  function tick(now) {
    frame = 0;
    if (destroyed || lost || document.hidden || (!hovering && !playing) || media.matches) return;
    time += Math.min((now - previous) / 1000, .05) * config.speed; previous = now; draw(); frame = requestAnimationFrame(tick);
  }
  function schedule() { if (!frame && !destroyed && !lost && !document.hidden && (hovering || playing) && !media.matches) { previous = performance.now(); frame = requestAnimationFrame(tick); } }
  function stop() { cancelAnimationFrame(frame); frame = 0; }
  function resize() {
    if (destroyed) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5), width = Math.max(1, Math.min(root.clientWidth * ratio, 1500));
    canvas.width = overlay.width = Math.round(width); canvas.height = overlay.height = Math.round(width * H / W); draw();
  }
  function play(value) { playing = Boolean(value); root.setAttribute('aria-pressed', String(playing)); if (!playing) { hovering = false; stop(); } else schedule(); root.dispatchEvent(new CustomEvent('spectralstate', { detail: { playing } })); }
  function clear() { hovering = false; playing = false; root.setAttribute('aria-pressed', 'false'); stop(); time = 0; draw(); root.dispatchEvent(new CustomEvent('spectralstate', { detail: { playing } })); }
  const on = (target, name, fn) => target.addEventListener(name, fn, { signal: events.signal });
  on(root, 'pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; schedule(); } });
  on(root, 'pointerleave', () => { hovering = false; if (root.dataset.cover === 'true') clear(); else if (!playing) { stop(); time = 0; draw(); } });
  on(root, 'pointercancel', clear);
  on(root, 'click', () => play(!playing));
  on(root, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) play(!playing); } });
  on(window, 'blur', clear); on(window, 'pagehide', clear);
  on(document, 'visibilitychange', () => { if (document.hidden) clear(); });
  on(media, 'change', () => { stop(); draw(); schedule(); });
  on(canvas, 'webglcontextlost', event => { event.preventDefault(); lost = true; stop(); });
  on(canvas, 'webglcontextrestored', () => { if (!destroyed) { lost = false; initialize(); buildMask(); draw(); schedule(); } });
  if (gl) initialize();
  root.setAttribute('aria-pressed', 'false'); buildMask(); resize();
  const observer = new ResizeObserver(resize); observer.observe(root);
  document.fonts?.ready.then(() => { if (!destroyed) { buildMask(); draw(); } });
  const api = {
    getConfig: () => ({ ...config }), play, clear,
    update(values) {
      if (destroyed) return;
      const oldText = config.text;
      if (values.text !== undefined) config.text = String(values.text).slice(0, 24) || defaults.text;
      if (/^#[a-f\d]{6}$/i.test(values.color || '')) config.color = values.color;
      for (const key of ['depth','wave','glow','speed']) if (Number.isFinite(Number(values[key]))) config[key] = Math.max(0, Math.min(3, Number(values[key])));
      if (values.theme === 'light' || values.theme === 'dark') config.theme = values.theme;
      if (values.tracking !== undefined) config.tracking = Boolean(values.tracking);
      if (config.text !== oldText) buildMask(); draw();
    },
    reset() { const theme = config.theme; config = { ...defaults, theme }; buildMask(); clear(); },
    destroy() {
      if (destroyed) return; destroyed = true; stop(); events.abort(); observer.disconnect();
      if (gl && !lost) { gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); }
      if (root.libraryComponent === api) delete root.libraryComponent;
    }
  };
  root.libraryComponent = api; return api;
}
