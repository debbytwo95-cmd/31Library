/* Trail Logo: a WebGL2 sweep of the logo's distance field along a flowing path, with a section HUD. */
function mountTrailLogo(root, options = {}) {
  const defaults = { text: '31Library', icon: true, speed: 1, length: 1, sway: 1, spread: 1, depth: 1, color: '#5990df', gloss: 1, glow: 1, grain: .08, focus: 1, pointer: 1, hud: true, fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif' };
  const limits = { speed: [.1, 2.5], length: [.2, 2], sway: [0, 2], spread: [0, 2], depth: [.3, 3], gloss: [0, 2], glow: [0, 2], grain: [0, .2], focus: [0, 2], pointer: [0, 2] };
  const REST = 1.6, HISTORY = 96, STEP = 1 / 60, FIELD = 96, TABLE = 256;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sanitize = next => {
    const c = { ...defaults, ...next };
    for (const [key, [min, max]] of Object.entries(limits)) { const n = Number(c[key]); c[key] = Number.isFinite(n) ? clamp(n, min, max) : defaults[key]; }
    c.text = String(c.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!/^#[0-9a-f]{6}$/i.test(c.color)) c.color = defaults.color;
    c.icon = Boolean(c.icon); c.hud = Boolean(c.hud);
    return c;
  };
  let config = sanitize(options);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController(), signal = abort.signal;
  const canvas = root.querySelector('canvas') || root.appendChild(document.createElement('canvas'));
  const hud = root.querySelector('.library-trail-logo-hud') || root.appendChild(Object.assign(document.createElement('canvas'), { className: 'library-trail-logo-hud' }));
  canvas.setAttribute('aria-hidden', 'true'); hud.setAttribute('aria-hidden', 'true');
  const hudContext = hud.getContext('2d');
  let gl = null, program = null, buffer = null, texture = null, flat = null, lost = false, destroyed = false;
  let width = 1, height = 1, ratio = 1, quality = 1, frame = 0, previous = 0, visible = true, slow = 0;
  let logo = null, build = 0, playing = false, phase = REST;
  // Pointer displacement history, newest first, in mask pixels.
  const history = new Float32Array(HISTORY * 2);
  // Row 0: the flow path sampled along its phase; row 1: the pointer history.
  const table = new Float32Array(TABLE * 4);
  let tableStart = 0, tableStep = 1;
  let pointer = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, active: false, primed: false, id: null }, carry = 0;

  // Signed distance field of the logo (positive outside), built once per text or font change.
  function squaredDistance(grid, offset, stride, length, f, v, z) {
    v[0] = 0; z[0] = -1e20; z[1] = 1e20; f[0] = grid[offset];
    for (let q = 1, k = 0; q < length; q++) {
      f[q] = grid[offset + q * stride];
      let s;
      do { const r = v[k]; s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    for (let q = 0, k = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      const r = v[k]; grid[offset + q * stride] = f[r] + (q - r) * (q - r);
    }
  }
  function transform(grid, w, h) {
    const size = Math.max(w, h), f = new Float64Array(size), v = new Uint32Array(size), z = new Float64Array(size + 1);
    for (let x = 0; x < w; x++) squaredDistance(grid, x, w, h, f, v, z);
    for (let y = 0; y < h; y++) squaredDistance(grid, y * w, 1, w, f, v, z);
  }
  function measure(context, text) {
    const glyphs = [], chars = Array.from(text);
    let prefix = '';
    for (const char of chars) {
      const x = context.measureText(prefix).width, m = context.measureText(char);
      prefix += char;
      if (!char.trim()) continue;
      glyphs.push({ x0: x - m.actualBoundingBoxLeft, x1: x + m.actualBoundingBoxRight, y0: -m.actualBoundingBoxAscent, y1: m.actualBoundingBoxDescent });
    }
    return { glyphs, width: context.measureText(text).width };
  }
  function createLogo(font = 200) {
    const scratch = document.createElement('canvas').getContext('2d');
    scratch.font = `600 ${font}px ${config.fontFamily}`;
    const cap = scratch.measureText('H').actualBoundingBoxAscent || font * .727;
    const iconSize = config.icon ? cap * 1.3 : 0, gap = config.icon && config.text ? cap * .44 : 0;
    const iconTop = -cap / 2 - iconSize / 2;
    if ('letterSpacing' in scratch) scratch.letterSpacing = '-0.02em';
    const words = config.text ? measure(scratch, config.text) : { glyphs: [], width: 0 };
    const textX = iconSize + gap;
    const glyphs = words.glyphs.map(g => ({ x0: g.x0 + textX, x1: g.x1 + textX, y0: g.y0, y1: g.y1 }));
    const parts = [...glyphs];
    if (config.icon) parts.unshift({ x0: 0, x1: iconSize, y0: iconTop, y1: iconTop + iconSize, icon: true });
    if (!parts.length) return null;
    const bounds = parts.reduce((b, g) => ({ x0: Math.min(b.x0, g.x0), y0: Math.min(b.y0, g.y0), x1: Math.max(b.x1, g.x1), y1: Math.max(b.y1, g.y1) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    const ox = Math.floor(bounds.x0 - FIELD), oy = Math.floor(bounds.y0 - FIELD);
    const w = Math.ceil(bounds.x1 + FIELD) - ox, h = Math.ceil(bounds.y1 + FIELD) - oy;
    // Long words use a smaller field so the texture stays within common GPU limits.
    if (w > 4000 && font > 60) return createLogo(Math.max(60, Math.floor(font * (4000 - FIELD * 2) / (w - FIELD * 2))));
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    const context = mask.getContext('2d', { willReadFrequently: true });
    context.translate(-ox, -oy); context.fillStyle = '#fff';
    if (config.icon) {
      context.beginPath();
      if (context.roundRect) context.roundRect(0, iconTop, iconSize, iconSize, iconSize * .22); else context.rect(0, iconTop, iconSize, iconSize);
      context.fill();
      context.globalCompositeOperation = 'destination-out';
      context.font = `600 ${iconSize * .56}px ${config.fontFamily}`; context.textAlign = 'center';
      if ('letterSpacing' in context) context.letterSpacing = '-0.03em';
      const mark = context.measureText('31');
      context.fillText('31', iconSize / 2, iconTop + iconSize / 2 + (mark.actualBoundingBoxAscent - mark.actualBoundingBoxDescent) / 2);
      context.globalCompositeOperation = 'source-over'; context.textAlign = 'left';
    }
    if (config.text) {
      context.font = `600 ${font}px ${config.fontFamily}`;
      if ('letterSpacing' in context) context.letterSpacing = '-0.02em';
      context.fillText(config.text, textX, 0);
    }
    const pixels = context.getImageData(0, 0, w, h).data;
    const outer = new Float64Array(w * h).fill(1e20), inner = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const a = pixels[i * 4 + 3] / 255;
      if (a === 0) continue;
      if (a === 1) { outer[i] = 0; inner[i] = 1e20; continue; }
      const d = .5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0;
    }
    transform(outer, w, h); transform(inner, w, h);
    const field = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) field[i] = clamp(Math.sqrt(outer[i]) - Math.sqrt(inner[i]), -FIELD, FIELD);
    return { cap, glyphs, icon: config.icon ? parts[0] : null, bounds, origin: [ox, oy], size: [w, h], field, mask };
  }

  // The flow moves like a body whose heading turns smoothly; the trail is its recent path.
  function velocity(u) {
    const turn = config.sway * (1.3 * Math.sin(.45 * u + .3) + .7 * Math.sin(1.05 * u + 2.1) + .3 * Math.sin(2.3 * u + .7));
    const heading = 3.95 + turn, pace = 1.1 + .3 * Math.sin(.8 * u + 1.3) + .14 * Math.sin(1.9 * u + .4);
    return [Math.cos(heading) * pace, Math.sin(heading) * pace];
  }
  const trailSpan = () => 2.2 * config.length, reach = () => .9 * config.length, lag = () => .18 * config.spread;
  function integrate() {
    tableStart = phase - config.spread * 1.5 - trailSpan() - .05;
    tableStep = (phase + config.spread * .6 + .05 - tableStart) / (TABLE - 1);
    let x = 0, y = 0, fastest = 0;
    table[0] = table[1] = 0;
    for (let i = 1; i < TABLE; i++) {
      const v = velocity(tableStart + (i - .5) * tableStep);
      x += v[0] * tableStep; y += v[1] * tableStep; fastest = Math.max(fastest, Math.hypot(v[0], v[1]));
      table[i * 2] = x; table[i * 2 + 1] = y;
    }
    table.set(history, TABLE * 2);
    return fastest;
  }
  function pathAt(u) {
    const f = clamp((u - tableStart) / tableStep, 0, TABLE - 1.001), i = Math.floor(f), t = f - i;
    return [table[i * 2] + (table[i * 2 + 2] - table[i * 2]) * t, table[i * 2 + 1] + (table[i * 2 + 3] - table[i * 2 + 1]) * t];
  }
  function recall(tau) {
    const f = clamp(tau / STEP, 0, HISTORY - 1.001), i = Math.floor(f), t = f - i;
    return [history[i * 2] + (history[i * 2 + 2] - history[i * 2]) * t, history[i * 2 + 1] + (history[i * 2 + 3] - history[i * 2 + 1]) * t];
  }
  function offset(z, xn, yn) {
    const u0 = phase - config.spread * (xn * 1.1 + yn * .18), a = pathAt(u0 - z * trailSpan()), b = pathAt(u0);
    const l0 = lag() * xn, h = recall(l0 + z * reach()), h0 = recall(l0);
    return [(a[0] - b[0]) * logo.cap + h[0] - h0[0], (a[1] - b[1]) * logo.cap + h[1] - h0[1]];
  }
  function layout() {
    if (!logo) return null;
    const b = logo.bounds, w = b.x1 - b.x0;
    const scale = Math.min(width * .64 / w, height * .19 / logo.cap);
    const x = width * .49 - (b.x0 + w / 2) * scale, y = height * .42 + logo.cap / 2 * scale;
    return { scale, x, y };
  }

  const vertex = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  // Pass 1 traces the swept logo and stores color plus depth (0 = front face, 1 = empty).
  const sceneShader = `#version 300 es
precision highp float;
uniform sampler2D field;
uniform vec2 fieldOrigin,fieldSize,resolution,origin,span;
uniform vec4 box;
uniform highp sampler2D table;
uniform float unit,cap,phase,trail,spread,depth,slope,lag,reach,histStep,tableStart,tableStep,gloss,glow,moving;
uniform vec3 tint;
out vec4 color;
float sdf(vec2 q){return texture(field,(q-fieldOrigin)/fieldSize).r;}
vec2 row(float f,int y){int i=int(f);return mix(texelFetch(table,ivec2(i,y),0).rg,texelFetch(table,ivec2(i+1,y),0).rg,f-float(i));}
vec2 path(float u){return row(clamp((u-tableStart)/tableStep,0.,${TABLE - 1}.-.001),0);}
vec2 recall(float tau){return row(clamp(tau/histStep,0.,${HISTORY - 1}.-.001),1);}
vec2 sweep(float z,float u0,float l0,vec2 h0){vec2 o=path(u0-z*trail)*cap-h0;return moving>.5?o+recall(l0+z*reach):o;}
vec3 ramp(float x){
 vec3 a=tint*.3,b=mix(tint,vec3(1.),.5),c=mix(tint,vec3(1.),.8);
 if(x<.38)return a*smoothstep(0.,.38,x);
 if(x<.72)return mix(a,tint,smoothstep(.38,.72,x));
 if(x<1.02)return mix(tint,b,smoothstep(.72,1.02,x));
 return mix(b,c,smoothstep(1.02,1.45,x));
}
void main(){
 vec2 frag=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
 vec3 bg=vec3(.009,.007,.014);
 if(frag.x<box.x||frag.y<box.y||frag.x>box.z||frag.y>box.w){color=vec4(bg,1.);return;}
 vec2 p=(frag-origin)*unit;
 float xn=clamp((p.x-span.x)/(span.y-span.x),-.25,1.25);
 float u0=phase-spread*(xn*1.1+p.y/cap*.18);
 float l0=lag*xn;
 vec2 h0=path(u0)*cap+(moving>.5?recall(l0):vec2(0.));
 float aa=unit*.75,d0=sdf(p);
 float z=0.,zp=0.,best=1e4,zb=0.;bool hit=false;
 for(int i=0;i<200;i++){
  float d=sdf(p-sweep(z,u0,l0,h0))+aa;
  if(d<best){best=d;zb=z;}
  if(d<=0.){hit=true;break;}
  zp=z;z+=max(d/slope,.0025);
  if(z>1.)break;
 }
 vec3 col=bg;float far=1.;
 if(hit&&z>0.){
  float a=zp,b=z;
  for(int j=0;j<6;j++){float m=.5*(a+b);if(sdf(p-sweep(m,u0,l0,h0))+aa<=0.)b=m;else a=m;}
  z=b;
  vec2 q=p-sweep(z,u0,l0,h0);
  float e=cap*.08;
  vec2 g=vec2(sdf(q+vec2(e,0.))-sdf(q-vec2(e,0.)),sdf(q+vec2(0.,e))-sdf(q-vec2(0.,e)));
  g=length(g)>1e-5?normalize(g):vec2(0.,1.);
  float z0=max(z-.01,0.),z1=min(z+.01,1.);
  vec2 run=(sweep(z1,u0,l0,h0)-sweep(z0,u0,l0,h0))/(z1-z0);
  vec3 n=normalize(vec3(g,-dot(g,run)/(depth*cap*2.4)));
  vec3 eye=vec3(0.,0.,-1.),key=normalize(vec3(-.5,.3,-.8)),top=normalize(vec3(-.5,-.75,-.45));
  float diffuse=max(dot(n,key),0.);
  float side=max(dot(n,top),0.)*.25;
  vec3 half1=normalize(key+eye);
  float spec=(pow(max(dot(n,half1),0.),6.)*.35+pow(max(dot(n,half1),0.),40.)*.55)*gloss;
  float sheen=pow(max(dot(n,normalize(top+eye)),0.),12.)*gloss*.3;
  float light=(.05+diffuse*.72+side+spec+sheen)*mix(.7,1.,smoothstep(0.,.05,z));
  light=light>.85?.85+(light-.85)/(1.+(light-.85)*4.):light;
  col=mix(bg,ramp(light),1.-smoothstep(.5,1.,z));
  far=z;
 }else if(!hit){
  col+=tint*exp(-max(best,0.)/(cap*.17))*glow*.26*(1.-smoothstep(.42,1.,zb));
 }
 float cover=smoothstep(aa,-aa,d0);
 vec2 fg=vec2(sdf(p+vec2(1.5,0.))-sdf(p-vec2(1.5,0.)),sdf(p+vec2(0.,1.5))-sdf(p-vec2(0.,1.5)));
 fg=length(fg)>1e-5?normalize(fg):vec2(0.);
 float bevel=smoothstep(-cap*.045,0.,d0);
 vec3 face=vec3(.012,.045,.11)+tint*bevel*(.18+.5*max(dot(fg,normalize(vec2(-.6,-.8))),0.)+.25*max(dot(fg,vec2(.2,1.)),0.));
 color=vec4(clamp(mix(col,face,cover),0.,1.),mix(far,0.,step(.5,cover)));
}`;
  // Pass 2 blurs the trail by depth, keeps the front faces sharp, then adds bloom and grain.
  const postShader = `#version 300 es
precision highp float;
uniform sampler2D scene;
uniform vec2 resolution;
uniform float blur,bloom,grain,seed;
out vec4 color;
float hash(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33+seed);return fract((p.x+p.y)*p.x);}
float coc(float z){return blur*pow(smoothstep(.015,1.,z),.8);}
void main(){
 vec2 texel=1./resolution,frag=gl_FragCoord.xy;
 vec4 c=texture(scene,frag*texel);
 float cc=coc(c.a),turn=hash(frag+17.)*6.2832;
 vec3 sum=c.rgb/(cc*cc+1.),glow=vec3(0.);float weight=1./(cc*cc+1.);
 for(int i=0;i<40;i++){
  float r=sqrt((float(i)+.5)/40.)*max(blur,1.),a=float(i)*2.39996+turn;
  vec4 s=texture(scene,(frag+vec2(cos(a),sin(a))*r)*texel);
  float sc=coc(s.a);
  if(s.a>c.a+.02)sc=min(sc,cc);
  float w=clamp(sc-r+1.,0.,1.)/(sc*sc+1.);
  sum+=s.rgb*w;weight+=w;
  glow+=s.rgb*smoothstep(.4,1.,dot(s.rgb,vec3(.3,.5,.2)));
 }
 vec3 col=sum/weight+glow/40.*bloom*.35;
 float noise=hash(frag)-.5;
 col+=noise*grain*(.3+dot(col,vec3(.7)));
 color=vec4(clamp(col,0.,1.),1.);
}`;
  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw Error(error); }
    return shader;
  }
  function link(source, names) {
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, source), item = gl.createProgram();
    gl.attachShader(item, vs); gl.attachShader(item, fs); gl.bindAttribLocation(item, 0, 'position'); gl.linkProgram(item);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(item, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(item));
    const uniforms = {}; for (const name of names) uniforms[name] = gl.getUniformLocation(item, name);
    return { item, uniforms };
  }
  function linear(target) { for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(target, key, value); }
  function createGL() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    program = {
      scene: link(sceneShader, ['field', 'table', 'fieldOrigin', 'fieldSize', 'resolution', 'origin', 'span', 'box', 'unit', 'cap', 'phase', 'trail', 'spread', 'depth', 'slope', 'lag', 'reach', 'histStep', 'tableStart', 'tableStep', 'gloss', 'glow', 'moving', 'tint']),
      post: link(postShader, ['scene', 'resolution', 'blur', 'bloom', 'grain', 'seed'])
    };
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    texture = { field: gl.createTexture(), table: gl.createTexture(), scene: gl.createTexture(), target: gl.createFramebuffer(), width: 0, height: 0 };
    gl.bindTexture(gl.TEXTURE_2D, texture.table);
    for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, key, value);
    gl.bindTexture(gl.TEXTURE_2D, texture.field); linear(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, texture.scene); linear(gl.TEXTURE_2D);
    root.dataset.renderer = 'WebGL2';
    if (logo) upload();
    return true;
  }
  function upload() {
    if (!gl || lost || !logo) return;
    gl.bindTexture(gl.TEXTURE_2D, texture.field); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, logo.size[0], logo.size[1], 0, gl.RED, gl.FLOAT, logo.field);
  }
  function rgb(hex) { return hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255); }
  function extents() {
    // Sample the sweep to bound the drawn region and the distance-safe marching step.
    const fastest = integrate();
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    const b = logo.bounds;
    for (const xn of [-.25, 0, .15, .3, .45, .6, .75, .9, 1, 1.25]) for (const y of [b.y0, (b.y0 + b.y1) / 2, b.y1]) for (let i = 1; i <= 32; i++) {
      const o = offset(i / 32, xn, y / logo.cap);
      x0 = Math.min(x0, o[0]); y0 = Math.min(y0, o[1]); x1 = Math.max(x1, o[0]); y1 = Math.max(y1, o[1]);
    }
    let jump = 0;
    for (let i = 0; i < HISTORY - 1; i++) jump = Math.max(jump, Math.hypot(history[i * 2 + 2] - history[i * 2], history[i * 2 + 3] - history[i * 2 + 1]));
    const pad = logo.cap * 1.1;
    return { moving: jump > 1e-3, box: [b.x0 + x0 - pad, b.y0 + y0 - pad, b.x1 + x1 + pad, b.y1 + y1 + pad], slope: trailSpan() * logo.cap * fastest * 1.02 + reach() * jump / STEP + 1 };
  }
  function renderGL(place) {
    const device = ratio * quality, e = extents(), w = canvas.width, h = canvas.height;
    if (texture.width !== w || texture.height !== h) {
      gl.bindTexture(gl.TEXTURE_2D, texture.scene); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, texture.target); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.scene, 0);
      texture.width = w; texture.height = h;
    }
    const scene = program.scene.uniforms, post = program.post.uniforms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, texture.target); gl.viewport(0, 0, w, h); gl.useProgram(program.scene.item);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture.field); gl.uniform1i(scene.field, 0);
    const ox = place.x * device, oy = place.y * device, unit = 1 / (place.scale * device);
    gl.uniform2f(scene.fieldOrigin, logo.origin[0], logo.origin[1]); gl.uniform2f(scene.fieldSize, logo.size[0], logo.size[1]);
    gl.uniform2f(scene.resolution, w, h); gl.uniform2f(scene.origin, ox, oy);
    gl.uniform2f(scene.span, logo.bounds.x0, logo.bounds.x1);
    gl.uniform4f(scene.box, ox + e.box[0] / unit, oy + e.box[1] / unit, ox + e.box[2] / unit, oy + e.box[3] / unit);
    const values = { unit, cap: logo.cap, phase, trail: trailSpan(), spread: config.spread, depth: config.depth, slope: e.slope, lag: lag(), reach: reach(), histStep: STEP, tableStart, tableStep, gloss: config.gloss, glow: config.glow, moving: e.moving ? 1 : 0 };
    for (const [key, value] of Object.entries(values)) gl.uniform1f(scene[key], value);
    gl.uniform3fv(scene.tint, rgb(config.color));
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texture.table); gl.uniform1i(scene.table, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, TABLE, 2, 0, gl.RG, gl.FLOAT, table);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.useProgram(program.post.item);
    gl.bindTexture(gl.TEXTURE_2D, texture.scene); gl.uniform1i(post.scene, 0);
    gl.uniform2f(post.resolution, w, h);
    gl.uniform1f(post.blur, config.focus * logo.cap / unit * .1); gl.uniform1f(post.bloom, config.glow);
    gl.uniform1f(post.grain, config.grain); gl.uniform1f(post.seed, playing ? (phase * 61.7) % 97 : 3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  // Without WebGL2, stack tinted copies of the mask on a 2D canvas for a still image.
  function renderFlat(place) {
    flat ||= canvas.getContext('2d');
    if (!flat) return;
    const device = ratio * quality, [r, g, b] = rgb(config.color).map(v => Math.round(v * 255));
    integrate();
    flat.setTransform(1, 0, 0, 1, 0, 0); flat.fillStyle = '#020204'; flat.fillRect(0, 0, canvas.width, canvas.height);
    const tinted = document.createElement('canvas'); tinted.width = logo.size[0]; tinted.height = logo.size[1];
    const t = tinted.getContext('2d'); t.drawImage(logo.mask, 0, 0); t.globalCompositeOperation = 'source-in';
    flat.setTransform(place.scale * device, 0, 0, place.scale * device, place.x * device, place.y * device);
    for (let i = 40; i >= 0; i--) {
      const z = i / 40, o = offset(z, .5, -.5), light = (1 - z) * (.35 + .65 * Math.min(1, z * 8));
      t.fillStyle = i ? `rgb(${r * (.4 + light)},${g * (.4 + light)},${Math.min(255, b * (.4 + light))})` : '#030d1e';
      t.fillRect(0, 0, tinted.width, tinted.height);
      flat.globalAlpha = i ? .5 * (1 - z) : 1;
      flat.drawImage(tinted, logo.origin[0] + o[0], logo.origin[1] + o[1]);
    }
    flat.globalAlpha = 1;
  }

  // Deterministic section boxes: the same flow phase always shows the same HUD.
  const random = (k, j) => { const x = Math.sin(k * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
  function sections(tau) {
    const list = [], glyphs = logo.glyphs, every = .42;
    if (logo.icon) {
      const g = logo.icon, c = logo.cap;
      list.push({ label: '01', alpha: 1, x0: g.x0 - c * .08 + Math.sin(tau * 1.7) * c * .02, y0: g.y0 + c * .03, x1: g.x1 + c * .14, y1: g.y1 - c * .02 + Math.sin(tau * 1.3 + 1) * c * .02,
        dot: [(g.x0 + g.x1) / 2 + Math.sin(tau * 2.1) * c * .05, (g.y0 + g.y1) / 2 + Math.cos(tau * 1.6) * c * .05] });
    }
    if (!glyphs.length) return list;
    for (let k = Math.floor((tau - 3.8) / every); k <= Math.floor(tau / every); k++) {
      const born = k * every + random(k, 1) * .2, life = 1.3 + random(k, 2) * 2.4, age = tau - born;
      if (age < 0 || age > life) continue;
      const span = 1 + Math.floor(random(k, 4) ** 2 * 3.2), first = Math.floor(random(k, 3) * glyphs.length), last = Math.min(glyphs.length - 1, first + span - 1);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = first; i <= last; i++) { const g = glyphs[i]; x0 = Math.min(x0, g.x0); y0 = Math.min(y0, g.y0); x1 = Math.max(x1, g.x1); y1 = Math.max(y1, g.y1); }
      const c = logo.cap, drift = Math.sin(tau * (1.1 + random(k, 9)) + k) * c * .025;
      x0 -= c * (.05 + random(k, 5) * .16); x1 += c * (.05 + random(k, 6) * .16);
      y0 -= c * (.04 + random(k, 7) * .3); y1 += c * (.03 + random(k, 8) * .2);
      const alpha = Math.min(1, age / .16, (life - age) / .22);
      list.push({ label: String((k % 98 + 98) % 98 + 2).padStart(2, '0'), alpha, x0: x0 + drift, y0, x1: x1 + drift, y1,
        dot: [x0 + (x1 - x0) * (.3 + random(k, 10) * .4) + Math.sin(tau * 1.9 + k) * c * .04, y0 + (y1 - y0) * (.35 + random(k, 11) * .4) + Math.cos(tau * 1.4 + k) * c * .04] });
    }
    return list;
  }
  function renderHud(place) {
    const device = ratio * quality;
    hudContext.setTransform(1, 0, 0, 1, 0, 0); hudContext.clearRect(0, 0, hud.width, hud.height);
    if (!config.hud || !logo) return;
    hudContext.setTransform(device, 0, 0, device, 0, 0);
    const map = (x, y) => [place.x + x * place.scale, place.y + y * place.scale];
    const items = sections((phase - REST) + 15), size = clamp(logo.cap * place.scale * .1, 5, 10.5), labels = size >= 6.5;
    hudContext.lineWidth = Math.max(.6, size * .075);
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = map(...items[i].dot), b = map(...items[j].dot);
      hudContext.strokeStyle = `rgba(232,238,248,${.34 * Math.min(items[i].alpha, items[j].alpha)})`;
      hudContext.beginPath(); hudContext.moveTo(a[0], a[1]); hudContext.lineTo(b[0], b[1]); hudContext.stroke();
    }
    hudContext.font = `700 ${size}px Cousine, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`;
    hudContext.textBaseline = 'middle';
    for (const item of items) {
      const [x0, y0] = map(item.x0, item.y0), [x1, y1] = map(item.x1, item.y1), snap = v => Math.round(v * device) / device + .5 / device;
      hudContext.globalAlpha = item.alpha;
      hudContext.strokeStyle = 'rgba(226,233,245,.55)'; hudContext.lineWidth = 1 / device * Math.max(1, Math.round(device * .9));
      hudContext.strokeRect(snap(x0), snap(y0), Math.round((x1 - x0) * device) / device, Math.round((y1 - y0) * device) / device);
      if (labels) {
        const text = 'SECTION ' + item.label, pad = size * .45, w = hudContext.measureText(text).width + pad * 2, h = size * 1.55;
        hudContext.fillStyle = 'rgba(38,45,58,.86)'; hudContext.fillRect(x0 + size * .35, y0 + size * .35, w, h);
        hudContext.fillStyle = '#eef2f9'; hudContext.fillText(text, x0 + size * .35 + pad, y0 + size * .35 + h / 2 + size * .04);
      }
      const [dx, dy] = map(...item.dot);
      hudContext.fillStyle = '#fff'; hudContext.beginPath(); hudContext.arc(dx, dy, Math.max(1.6, size * .24), 0, Math.PI * 2); hudContext.fill();
    }
    hudContext.globalAlpha = 1;
  }
  function render() {
    if (destroyed || lost) return;
    const place = layout();
    if (!place) { if (gl) { gl.clearColor(.009, .007, .014, 1); gl.clear(gl.COLOR_BUFFER_BIT); } renderHud(place); return; }
    if (gl) renderGL(place); else renderFlat(place);
    renderHud(place);
  }

  const pointerGain = () => config.pointer * .75 * (media.matches ? .25 : 1);
  function settled() {
    let still = Math.abs(pointer.x - pointer.tx) + Math.abs(pointer.y - pointer.ty) < .05 && Math.abs(pointer.vx) + Math.abs(pointer.vy) < .05;
    for (let i = 1; still && i < HISTORY; i++) still = Math.abs(history[i * 2] - history[0]) + Math.abs(history[i * 2 + 1] - history[1]) < .05;
    return still;
  }
  function tick(now) {
    frame = 0;
    if (destroyed || lost || !visible || document.hidden) return;
    const dt = clamp((now - previous) / 1000, 0, .05); previous = now;
    if (playing) phase += dt * config.speed * (media.matches ? .3 : 1);
    // Critically damped follow, then sample the history at a fixed rate.
    const omega = 16, gain = pointerGain();
    for (let left = dt; left > 0; left -= 1 / 240) {
      const h = Math.min(1 / 240, left);
      pointer.vx += ((pointer.tx - pointer.x) * omega * omega - 2 * omega * pointer.vx) * h; pointer.x += pointer.vx * h;
      pointer.vy += ((pointer.ty - pointer.y) * omega * omega - 2 * omega * pointer.vy) * h; pointer.y += pointer.vy * h;
    }
    for (carry += dt; carry >= STEP; carry -= STEP) {
      history.copyWithin(2, 0, HISTORY * 2 - 2);
      history[0] = pointer.x * gain; history[1] = pointer.y * gain;
    }
    if (gl && dt > .034) { if (++slow > 20 && quality > .6) { quality = Math.max(.6, quality - .2); slow = 0; resize(); } } else slow = Math.max(0, slow - 1);
    render();
    if (playing || !settled()) schedule();
  }
  function schedule() { if (!frame && !destroyed && visible && !document.hidden && !lost) frame = requestAnimationFrame(tick); }
  function wake() { if (!frame) { previous = performance.now(); schedule(); } }
  function fill(x, y) { for (let i = 0; i < HISTORY; i++) { history[i * 2] = x; history[i * 2 + 1] = y; } }
  function releaseCapture() { if (pointer.id !== null && root.hasPointerCapture?.(pointer.id)) root.releasePointerCapture(pointer.id); pointer.id = null; }
  function local(event) {
    const place = layout(), rect = root.getBoundingClientRect();
    if (!place) return null;
    return [(event.clientX - rect.left - place.x) / place.scale, (event.clientY - rect.top - place.y) / place.scale];
  }
  function move(event) {
    if (config.pointer === 0 || event.pointerType === 'touch' && pointer.id !== event.pointerId) return;
    const p = local(event); if (!p) return;
    if (!pointer.primed) {
      // Shift the whole history to the entry point, so a returning pointer keeps the current trail.
      const gain = pointerGain(), dx = p[0] - pointer.x, dy = p[1] - pointer.y;
      for (let i = 0; i < HISTORY; i++) { history[i * 2] += dx * gain; history[i * 2 + 1] += dy * gain; }
      Object.assign(pointer, { x: p[0], y: p[1], primed: true });
    }
    pointer.tx = p[0]; pointer.ty = p[1]; pointer.active = true; wake();
  }
  function leave() { pointer.active = false; pointer.primed = false; pointer.tx = pointer.x; pointer.ty = pointer.y; wake(); }
  function reset() {
    cancelAnimationFrame(frame); frame = 0; releaseCapture();
    playing = false; phase = REST; carry = 0; root.dataset.state = 'still';
    pointer = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, active: false, primed: false, id: null }; fill(0, 0); render();
  }
  function play(on = true) {
    if (destroyed) return;
    playing = Boolean(on); root.dataset.state = playing ? 'playing' : 'still';
    if (playing) wake(); else render();
  }
  function resize() {
    width = Math.max(1, root.clientWidth); height = Math.max(1, root.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    const device = ratio * quality;
    canvas.width = Math.round(width * device); canvas.height = Math.round(height * device);
    hud.width = Math.round(width * ratio * quality); hud.height = Math.round(height * ratio * quality);
    render();
  }
  function rebuild() {
    const current = ++build, family = `600 100px ${config.fontFamily}`;
    const fonts = document.fonts ? Promise.all([document.fonts.load(family, config.text || 'H'), document.fonts.load('700 10px Cousine').catch(() => {})]).catch(() => {}) : Promise.resolve();
    return fonts.then(() => {
      if (destroyed || current !== build) return;
      logo = createLogo(); upload(); render();
      root.dataset.ready = 'true';
    });
  }

  root.addEventListener('pointermove', move, { signal });
  root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') move(event); }, { signal });
  root.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') leave(); }, { signal });
  root.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || config.pointer === 0) return;
    pointer.id = event.pointerId; root.setPointerCapture?.(event.pointerId); pointer.primed = false; move(event);
  }, { signal });
  root.addEventListener('pointerup', event => { if (event.pointerType === 'touch') { releaseCapture(); leave(); } }, { signal });
  root.addEventListener('pointercancel', () => { releaseCapture(); leave(); }, { signal });
  window.addEventListener('blur', () => { releaseCapture(); leave(); }, { signal });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); }, { signal });
  media.addEventListener('change', () => { fill(pointer.x * pointerGain(), pointer.y * pointerGain()); render(); }, { signal });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; }, { signal });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; try { createGL(); resize(); if (playing) wake(); } catch { gl = null; render(); } }, { signal });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) { render(); if (playing || !settled()) wake(); } }); intersectionObserver.observe(root);
  try { if (!createGL()) root.dataset.renderer = 'Canvas 2D'; } catch (error) { console.warn('Trail Logo renderer:', error.message); gl = null; root.dataset.renderer = 'Canvas 2D'; }
  fill(0, 0); root.dataset.state = 'still'; resize(); rebuild();
  return {
    getConfig: () => ({ ...config }),
    update(next) {
      const before = config; config = sanitize({ ...config, ...next });
      if (config.text !== before.text || config.icon !== before.icon || config.fontFamily !== before.fontFamily) rebuild();
      if (config.pointer === 0) { releaseCapture(); pointer = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, active: false, primed: false, id: null }; fill(0, 0); }
      render();
    },
    play, reset,
    isPlaying: () => playing,
    destroy() {
      if (destroyed) return;
      cancelAnimationFrame(frame); frame = 0; releaseCapture(); destroyed = true; abort.abort();
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      if (gl && !lost) { gl.deleteTexture(texture.field); gl.deleteTexture(texture.table); gl.deleteTexture(texture.scene); gl.deleteFramebuffer(texture.target); gl.deleteBuffer(buffer); gl.deleteProgram(program.scene.item); gl.deleteProgram(program.post.item); }
    }
  };
}
