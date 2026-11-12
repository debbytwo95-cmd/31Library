import * as THREE from 'three';

/* =========================================================
   Utilities
   ========================================================= */
const $ = s => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
  io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  back: t => { const c = 1.45; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
};
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const OR = '#ee4d12';
const LV = ['#ececea', '#f9d5c2', '#f6ad86', '#f2814d', '#ee4d12'];

/** Promise-based tween on requestAnimationFrame */
function tween(dur, fn, easing = ease.io, delay = 0) {
  return new Promise(res => {
    const t0 = performance.now() + delay;
    const step = now => {
      const k = clamp((now - t0) / dur);
      if (now >= t0) fn(easing(k), k);
      k < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
}

/* =========================================================
   Data — 26 weeks × 7 days of shipped tasks (total 1,516)
   ========================================================= */
const WEEKS = 26, DAYS = 7, START = new Date(2025, 6, 7); // Mon, Jul 7
const V = [];
for (let w = 0; w < WEEKS; w++) {
  V.push([]);
  for (let d = 0; d < DAYS; d++) {
    let v;
    if (d >= 5) v = rnd() < .55 ? 0 : Math.round(rnd() * 3);
    else {
      const season = .75 + .5 * Math.sin(w / 26 * Math.PI * 1.4 + .4);
      v = Math.round((5 + rnd() * 12) * season * (d === 1 ? 1.15 : 1));
    }
    V[w].push(v);
  }
}
[[3,1,26],[4,2,24],[5,1,30],[2,3,22],[13,2,23],[16,1,21]].forEach(([w,d,v]) => V[w][d] = v);
V[21][0] = 34; // Mon, Dec 1 — busiest day
let total = V.flat().reduce((a, b) => a + b, 0);
while (total !== 1516) {
  const w = Math.floor(rnd() * WEEKS), d = Math.floor(rnd() * 5);
  if ((w === 21 && d === 0) || V[w][d] >= 20) continue;
  const s = total < 1516 ? 1 : -1;
  if (V[w][d] + s < 1) continue;
  V[w][d] += s; total += s;
}
const MAX = 34;
const level = v => v === 0 ? 0 : v < 6 ? 1 : v < 11 ? 2 : v < 18 ? 3 : 4;
const dateOf = (w, d) => new Date(START.getFullYear(), START.getMonth(), START.getDate() + w * 7 + d);
const fmtDay = dt => dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const projectsFor = v => {
  if (v === 34) return [12, 9, 7, 6];
  const a = Math.round(v * .36), b = Math.round(v * .26), c = Math.round(v * .2);
  return [a, b, c, Math.max(0, v - a - b - c)];
};

/* =========================================================
   Static dashboard
   ========================================================= */
const ICONS = {
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  pie: '<path d="M11 3a9 9 0 1 0 10 10H11z"/><path d="M13 1v10h10A10 10 0 0 0 13 1z"/>',
  bars: '<path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 12v3h2v-3zm4-6v9h2V9zm4 3v6h2v-6z"/>',
  chat: '<path d="M12 3c5 0 9 3.6 9 8s-4 8-9 8c-1.2 0-2.4-.2-3.4-.6L4 20l1.3-3.7A7.6 7.6 0 0 1 3 11c0-4.4 4-8 9-8z"/>',
  wallet: '<path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm12 5a2 2 0 1 0 0 4h6v-4z"/>',
  card: '<path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2H2zm0 4h20v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/>',
  users: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0zm15-9a3 3 0 1 0 0-6v6zm1 2a6 6 0 0 1 4 7h-3a8.6 8.6 0 0 0-1-7z"/>',
  id: '<path d="M3 5h18v14H3zm5 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm-3.5 8h7c0-2-1.6-3-3.5-3s-3.5 1-3.5 3zM13 9h6v2h-6zm0 4h4v2h-4z"/>',
  gear: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5.4v-2.8l-2.6-.6-.6-1.5 1.4-2.3-2-2-2.3 1.4-1.5-.6L13.4 2h-2.8l-.6 2.6-1.5.6L6.2 3.8l-2 2 1.4 2.3-.6 1.5-2.6.6v2.8l2.6.6.6 1.5-1.4 2.3 2 2 2.3-1.4 1.5.6.6 2.6h2.8l.6-2.6 1.5-.6 2.3 1.4 2-2-1.4-2.3.6-1.5z"/>'
};
const navItem = ([ic, label, badge, on]) =>
  `<li class="${on ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="currentColor">${ICONS[ic]}</svg>${label}${badge ? `<span class="badge">${badge}</span>` : ''}</li>`;
$('#nav-ws').innerHTML = [['grid','Overview'],['folder','Projects',12],['pie','Analytics',0,1],['bars','Reports'],['chat','Chat',4]].map(navItem).join('');
$('#nav-fin').innerHTML = [['wallet','Payments'],['card','Cards']].map(navItem).join('');
$('#nav-ppl').innerHTML = [['users','Users'],['id','Staffs']].map(navItem).join('');
$('#nav-set').innerHTML = navItem(['gear','Settings']);
document.querySelectorAll('.nav li').forEach(li => li.addEventListener('click', () => {
  document.querySelectorAll('.nav li').forEach(x => x.classList.remove('on')); li.classList.add('on');
}));
document.querySelectorAll('[data-seg]').forEach(seg => seg.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  seg.querySelectorAll('button').forEach(b => b.classList.remove('on')); e.target.classList.add('on');
}));

const path = pts => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
function sparkPts(w, h, n, s) {
  seed = s; const p = []; let y = h * .6;
  for (let i = 0; i < n; i++) { y = clamp(y + (rnd() - .55) * h * .45, 2, h - 2); p.push([i / (n - 1) * w, y - (i / n) * h * .35]); }
  return p;
}
$('#kpis').innerHTML = [['Billable hours','3,412','h','↗ 6.1%',3],['Utilization','82','%','↗ 4 pts',9],['Avg. response','1.8','h','↘ 2%',13]].map(([l, v, u, c, s]) =>
  `<div class="card kpi"><div class="card-h" style="font-size:13px;color:#666;font-weight:400">${l}<span class="r chip">${c}</span></div>
   <div class="val big">${v}<span class="unit">${u}</span></div>
   <svg viewBox="0 0 92 30"><path d="${path(sparkPts(92, 30, 22, s))}" fill="none" stroke="#555" stroke-width="1.3"/></svg></div>`).join('');

/* Revenue — interactive line chart */
(function revenue() {
  const A = [30,36,38,54,66,64,62,60,52,48,55,62,60,50,40,56,70,80,76,58,52,66,86,96,100];
  const B = [22,26,30,30,34,32,36,40,38,36,32,34,40,44,42,38,36,40,44,46,44,40,42,46,52];
  const n = A.length, W = 1000, H = 135;
  const P = arr => arr.map((y, i) => [i / (n - 1) * W, H - (y / 110) * H]);
  const pa = P(A), pb = P(B);
  const plot = $('#revPlot');
  plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${OR}" stop-opacity=".18"/><stop offset="1" stop-color="${OR}" stop-opacity="0"/></linearGradient></defs>
    <path d="${path(pa)}L${W},${H}L0,${H}Z" fill="url(#ga)"/>
    <path d="${path(pb)}" fill="none" stroke="#bdbdba" stroke-width="1.3" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
    <path d="${path(pa)}" fill="none" stroke="${OR}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
    <i class="vline"></i><i class="mk"></i><i class="mk b"></i><div class="rtip"></div>`;
  const vl = plot.querySelector('.vline'), m1 = plot.querySelector('.mk'), m2 = plot.querySelector('.mk.b'), tip = plot.querySelector('.rtip');
  const start = new Date(2026, 9, 1);
  const show = i => {
    const x = i / (n - 1) * 100;
    const ya = pa[i][1] / H * 100, yb = pb[i][1] / H * 100;
    vl.style.left = x + '%'; m1.style.left = m2.style.left = x + '%';
    m1.style.top = ya + '%'; m2.style.top = yb + '%';
    const va = (A[i] * .226).toFixed(1), vb = (B[i] * .342).toFixed(1);
    const dt = new Date(start.getTime() + i * 3.7 * 864e5);
    const pct = Math.round((va / vb - 1) * 100);
    tip.innerHTML = `<b style="font-weight:500">${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</b> <span class="muted">Week ${Math.floor(i / 2) + 1}</span>
      <div class="q">This quarter<b>$${va}k</b></div><span class="d">${pct >= 0 ? '+' : ''}${pct}%</span><div class="q l">Last quarter<b>$${vb}k</b></div>`;
    const pw = plot.clientWidth, px = x / 100 * pw;
    tip.style.left = (px > pw - 190 ? px - 172 : px + 14) + 'px';
    tip.style.top = '-4px';
  };
  show(18);
  plot.addEventListener('pointermove', e => {
    const r = plot.getBoundingClientRect();
    show(Math.round(clamp((e.clientX - r.left) / r.width) * (n - 1)));
  });
  plot.addEventListener('pointerleave', () => show(18));
})();

/* Billing flow */
(function billing() {
  const xs = [0, 75, 150, 225, 300], tops = [25, 38, 48, 56, 66], bots = [165, 152, 142, 135, 128];
  let layers = '';
  [[0,'#fbe3d6'],[10,'#f8c8ac'],[22,'#f39c6c'],[34,'#ee4d12']].forEach(([inset, c]) => {
    const t = xs.map((x, i) => [x, tops[i] + inset * (1 + i * .08)]);
    const b = xs.map((x, i) => [x, bots[i] - inset * (1 + i * .08)]).reverse();
    layers += `<path d="${path(t)}L${b.map(p => p.join(',')).join('L')}Z" fill="${c}"/>`;
  });
  $('#bill').innerHTML = `<div class="card-h" style="padding-top:0">Billing flow<span class="r chip or" style="height:21px;border-radius:10px;padding:0 8px">56% to cash</span></div>
    <div class="muted" style="font-size:11.5px;margin-top:4px">Proposals to cash · Q4</div>
    <svg viewBox="0 0 300 185" preserveAspectRatio="none">${layers}
    ${[75,150,225].map(x => `<line x1="${x}" x2="${x}" y1="0" y2="185" stroke="#999" stroke-opacity=".35" vector-effect="non-scaling-stroke"/>`).join('')}</svg>
    <div class="pills">${['$412k','$318k','$262k','$230k'].map(v => `<span>${v}</span>`).join('')}</div>
    <div class="xs"><span>Proposed</span><span>Won</span><span>Invoiced</span><span>Collected</span></div>`;
})();

/* Billable hours */
(function billable() {
  const hs = [56, 60, 60, 60, 82, 13, 7];
  $('#bh').innerHTML = `<div class="card-h" style="margin-top:4px">Billable hours<div class="r seg sm" data-seg><button class="on">Week</button><button>Month</button></div></div>
   <div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span class="big" style="font-size:26px">278h</span><span class="chip">↗ 5.4%</span><span class="muted" style="margin-left:auto;font-size:11.5px">this week</span></div>
   <div class="tags">${['All teams','Eng','Design','PM'].map((x, i) => `<span class="${i ? '' : 'on'}">${x}</span>`).join('')}</div>
   <div class="bars">${hs.map((h, i) => `<div class="${i === 4 ? 'hot' : ''}" style="height:${h}px"></div>`).join('')}</div>
   <div class="bars-x">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => `<span style="${i === 4 ? 'color:' + OR : ''}">${d}</span>`).join('')}</div>
   <div class="target"></div><div class="target-l">Target · 52h</div>`;
  $('#bh').querySelectorAll('[data-seg],.tags').forEach(el => el.addEventListener('click', e => {
    const kids = [...el.children]; if (!kids.includes(e.target)) return;
    kids.forEach(k => k.classList.remove('on')); e.target.classList.add('on');
    $('#bh').querySelectorAll('.bars div').forEach((b, i) => b.style.height = (i < 5 ? 30 + Math.random() * 55 : 4 + Math.random() * 12) + 'px');
  }));
})();

/* Tasks shipped (mini heatmap → opens drawer) */
(function tasksCard() {
  let dots = '';
  for (let w = 4; w < WEEKS; w++) for (let d = 0; d < DAYS; d++)
    dots += `<i data-w="${w}" data-d="${d}" style="background:${LV[level(V[w][d])]}"></i>`;
  $('#tsCard').innerHTML = `<div class="card-h">Tasks shipped<span class="r muted" style="font-size:12px;font-weight:400">Last 22 weeks</span></div>
    <div style="display:flex;align-items:flex-start;margin-top:8px">
      <span class="big" style="font-size:26px">1,516<span class="unit" style="font-size:12px;color:#777;margin-left:6px">tasks</span></span>
      <span style="margin-left:auto;font-size:11px;color:#777">Busiest day<b style="display:block;font-size:13px;color:#111;margin-top:3px">19</b></span>
      <span style="margin-left:16px;font-size:11px;color:#777">Streak<b style="display:block;font-size:13px;color:#111;margin-top:3px">16d</b></span>
    </div>
    <div class="hm-months">${['Jul','Aug','Sep','Oct','Nov','Dec'].map(m => `<span>${m}</span>`).join('')}</div>
    <div class="hm">${dots}</div>
    <div class="hm-foot"><span>Mon – Sun, top to bottom</span><span class="lg">Less ${LV.map(c => `<i style="background:${c}"></i>`).join('')} More</span></div>
    <div class="mini-tip" id="miniTip"></div>`;
  const card = $('#tsCard'), mt = $('#miniTip');
  card.querySelector('.hm').addEventListener('pointerover', e => {
    const el = e.target; if (el.tagName !== 'I') return;
    const w = +el.dataset.w, d = +el.dataset.d, v = V[w][d];
    mt.innerHTML = `<div>${fmtDay(dateOf(w, d))}</div><b>${v}</b> tasks shipped<div style="color:#bbb">Billing Revamp · ${projectsFor(v)[0]}</div>`;
    const cr = card.getBoundingClientRect(), r = el.getBoundingClientRect();
    mt.style.left = (r.left - cr.left - 50) + 'px'; mt.style.top = (r.top - cr.top - 58) + 'px';
    mt.classList.add('show');
  });
  card.querySelector('.hm').addEventListener('pointerleave', () => mt.classList.remove('show'));
  card.addEventListener('click', openDrawer);
  card.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && openDrawer());
})();

$('#dh').innerHTML = `<div class="card-h">Delivery health</div>
  <div class="tabs"><span class="on">All projects</span><span>Open</span><span>Shipped</span></div>
  <table><thead><tr><th>Metric</th><th>Actual</th><th>vs goal</th></tr></thead><tbody>
  ${[['Cycle time','Below 7-day goal','6.2d','−18%'],['On-time delivery','11 of 12 milestones','92%','+3'],['Budget overrun','Analytics Hub','1 Proj','—']]
    .map(r => `<tr><td>${r[0]}<small>${r[1]}</small></td><td>${r[2]}</td><td style="color:#666;font-weight:400">${r[3]}</td></tr>`).join('')}</tbody></table>`;
$('#dh .tabs').addEventListener('click', e => {
  if (e.target.tagName !== 'SPAN') return;
  $('#dh .tabs').querySelectorAll('span').forEach(s => s.classList.remove('on')); e.target.classList.add('on');
});

/* Drawer secondary content */
(function drawerContent() {
  const wk = [11.2, 13.6, 12.8, 12.1, 10.4, 1.6, .9], cy = [312, 486, 418, 208, 92];
  const vbars = (arr, mx) => arr.map(v => `<div>${v}<i data-h="${Math.max(3, v / mx * 52)}" style="height:0"></i></div>`).join('');
  $('#rhythm').innerHTML = vbars(wk, 13.6);
  $('#cycle').innerHTML = vbars(cy, 486);

  seed = 41; const n = 60, sh = [], cr = []; let a = 30, b = 34;
  for (let i = 0; i < n; i++) { a = clamp(a + (rnd() - .5) * 22, 8, 62); b = clamp(b + (rnd() - .5) * 12, 16, 50); sh.push(a + (i > 44 && i < 50 ? 18 : 0)); cr.push(b); }
  const P = v => v.map((y, i) => [i / (n - 1) * 435, 100 - y]);
  const pa = P(sh), pb = P(cr), pk = pa.reduce((m, p, i) => p[1] < pa[m][1] ? i : m, 0);
  $('#thr').innerHTML = `<defs><linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${OR}" stop-opacity=".14"/><stop offset="1" stop-color="${OR}" stop-opacity="0"/></linearGradient></defs>
    <path d="${path(pa)}L435,100L0,100Z" fill="url(#gt)"/>
    <path d="${path(pb)}" fill="none" stroke="#bbb" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
    <path d="${path(pa)}" fill="none" stroke="${OR}" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
    <circle cx="${pa[pk][0]}" cy="${pa[pk][1]}" r="4" fill="#fff" stroke="${OR}" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`;

  const team = [['Aylin Kaya','Design',412,'96%','2.1d','#f0653a'],['Marcus Reed','Engineering',386,'92%','2.6d','#7b9cc4'],
                ['Selin Demir','Engineering',361,'94%','2.3d','#2b2b2b'],['Jonah Park','Project lead',357,'88%','3.0d','#8a6a4a']];
  $('#teamBody').innerHTML = team.map((m, i) => {
    seed = 90 + i;
    const bars = Array.from({ length: 8 }, (_, k) => {
      const hot = i === 1 ? k === 6 : k === 7;
      return `<i class="${hot ? 'hot' : ''}" style="height:${hot ? 20 : 6 + rnd() * 9}px"></i>`;
    }).join('');
    return `<tr><td><span class="av" style="background:radial-gradient(circle at 40% 35%,#fff6 0,#fff0 45%),${m[5]}"></span><span class="who">${m[0]}<small>${m[1]}</small></span></td>
      <td>${m[2]}</td><td style="color:${i === 3 ? OR : 'inherit'}">${m[3]}</td><td class="mono">${m[4]}</td><td><span class="spark8">${bars}</span></td></tr>`;
  }).join('');
})();

/* =========================================================
   3D heatmap (three.js)
   ========================================================= */
const VIEWS = {
  // az/el in degrees; ppu = pixels per world unit; target = look-at point
  '3d':   { az: 32, el: 31,   ppu: 13.2, tx: 0,     ty: 3.1, tz: 0 },
  'grid': { az: 0,  el: 89.9, ppu: 14.4, tx: -0.55, ty: 0,   tz: 0.3 }
};
const BAR_MAX = 8.5; // world-units height of the busiest day

class Heatmap3D {
  constructor(host, labels, tip, viz) {
    this.host = host; this.labels = labels; this.tip = tip; this.viz = viz;
    this.cam = { ...VIEWS['3d'] };
    this.mode = '3d'; this.busy = false; this.grow = 0; this.growDir = 1;
    this.hovered = null; this.running = false; this.needsRender = true;
    this.dark = new THREE.Color('#1b1b1b');

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xe7ded6, 1.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-8, 14, 10); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd9c4, .55); rim.position.set(12, 5, -8); this.scene.add(rim);

    // bars — one shared unit cylinder (pivot at the base), one material per bar for hover tint
    const geo = new THREE.CylinderGeometry(.4, .4, 1, 32, 1);
    geo.translate(0, .5, 0);
    this.bars = [];
    for (let w = 0; w < WEEKS; w++) for (let d = 0; d < DAYS; d++) {
      const v = V[w][d], L = level(v);
      const base = new THREE.Color(LV[L]);
      const mat = new THREE.MeshStandardMaterial({ color: base.clone(), roughness: .62, metalness: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(w - (WEEKS - 1) / 2, 0, d - (DAYS - 1) / 2);
      const h = L === 0 ? 0 : Math.pow(v / MAX, 1.9) * BAR_MAX;
      mesh.userData = { w, d, v, L, h, base, hover: 0 };
      mesh.scale.y = .05;
      this.scene.add(mesh); this.bars.push(mesh);
    }

    // HTML labels (projected every frame)
    this.monthLabels = [];
    let prevMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const m = dateOf(w, 0).getMonth();
      if (m !== prevMonth) {
        prevMonth = m;
        const el = document.createElement('span');
        el.textContent = dateOf(w, 0).toLocaleDateString('en-US', { month: 'short' });
        labels.appendChild(el);
        this.monthLabels.push({ el, w });
      }
    }
    this.dayLabels = ['Mon', 'Wed', 'Fri'].map((t, i) => {
      const el = document.createElement('span'); el.textContent = t; labels.appendChild(el); return { el, d: i * 2 };
    });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.tmp = new THREE.Vector3();
    this.bindEvents();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  /* ---------- per-bar animated height ---------- */
  barScale(u) {
    const { w, d, h } = u;
    const stagger = this.growDir > 0 ? (w / (WEEKS - 1)) * .42 + (d / (DAYS - 1)) * .06
                                     : ((WEEKS - 1 - w) / (WEEKS - 1)) * .3;
    const span = this.growDir > 0 ? .52 : .7;
    const k = clamp((this.grow - stagger) / span);
    const e = this.growDir > 0 ? ease.back(k) : ease.io(k);
    return Math.max(.05, h * e);
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.size = { w, h };
    this.needsRender = true;
  }

  updateCamera() {
    const c = this.cam, { w, h } = this.size || { w: 1, h: 1 };
    const az = THREE.MathUtils.degToRad(c.az), el = THREE.MathUtils.degToRad(c.el), R = 120;
    this.camera.position.set(c.tx + R * Math.sin(az) * Math.cos(el), c.ty + R * Math.sin(el), c.tz + R * Math.cos(az) * Math.cos(el));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(c.tx, c.ty, c.tz);
    this.camera.left = -w / 2 / c.ppu; this.camera.right = w / 2 / c.ppu;
    this.camera.top = h / 2 / c.ppu; this.camera.bottom = -h / 2 / c.ppu;
    this.camera.updateProjectionMatrix();
  }

  project(x, y, z) {
    this.tmp.set(x, y, z).project(this.camera);
    return [(this.tmp.x + 1) / 2 * this.size.w, (1 - this.tmp.y) / 2 * this.size.h];
  }

  frame() {
    if (!this.running) return;
    requestAnimationFrame(() => this.frame());
    if (!this.size) return;
    this.updateCamera();
    const gridness = clamp((this.cam.el - VIEWS['3d'].el) / (VIEWS.grid.el - VIEWS['3d'].el));

    for (const m of this.bars) {
      const u = m.userData;
      m.scale.y = this.barScale(u);
      // hover tint eases toward target
      const target = m === this.hovered ? 1 : 0;
      u.hover += (target - u.hover) * .22;
      m.material.color.copy(u.base).lerp(this.dark, u.hover);
      // flat discs read better from top: slightly larger radius in grid view
      const r = 1 + gridness * .08;
      m.scale.x = m.scale.z = r;
    }

    // labels
    for (const { el, w } of this.monthLabels) {
      const [x, y] = this.project(w - (WEEKS - 1) / 2, 0, -(DAYS - 1) / 2 - 1.5);
      el.style.left = x + 'px'; el.style.top = y + 'px';
    }
    for (const { el, d } of this.dayLabels) {
      const [x, y] = this.project(-(WEEKS - 1) / 2 - 1.9, 0, d - (DAYS - 1) / 2);
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.opacity = clamp((gridness - .6) / .4);
    }

    this.renderer.render(this.scene, this.camera);
    if (this.hovered) this.placeTip();
  }

  start() { if (!this.running) { this.running = true; this.frame(); } }
  stop() { this.running = false; }

  /* ---------- hover + tooltip ---------- */
  pick(e) {
    const r = this.host.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.bars, false)[0];
    const m = hit ? hit.object : null;
    if (m === this.hovered) return;
    this.hovered = m;
    if (m) this.fillTip(m.userData); else this.tip.classList.remove('show');
  }

  fillTip({ w, d, v }) {
    const ps = projectsFor(v);
    const avg = 1516 / (WEEKS * DAYS);
    const rows = [['Billing Revamp', ps[0], OR], ['Atlas Mobile App', ps[1], '#f2814d'], ['Analytics Hub', ps[2], '#f6ad86'], ['Others', ps[3], '#777']];
    const people = Math.max(1, Math.min(4, Math.ceil(v / 8)));
    this.tip.innerHTML = `<div class="t-h">${fmtDay(dateOf(w, d))}${v === MAX ? '<em>Busiest</em>' : ''}</div>
      <div class="t-n">${v} <small>tasks · ${v ? (v / avg).toFixed(1).replace(/\.0$/, '') + '× daily avg' : 'no activity'}</small></div>
      ${v ? rows.map(r => `<div class="row"><i style="background:${r[2]}"></i>${r[0]}<b>${r[1]}</b></div>`).join('') : ''}
      ${v ? `<div class="t-f"><span>${['#f0653a','#7b9cc4','#e8b48a','#8a6a4a'].slice(0, people).map(c => `<i style="background:${c}"></i>`).join('')}</span>${people} contributor${people > 1 ? 's' : ''}</div>` : ''}`;
    this.tip.classList.add('show');
  }

  placeTip() {
    const m = this.hovered, u = m.userData;
    const [x, y] = this.project(m.position.x, m.scale.y, m.position.z);
    const tw = this.tip.offsetWidth, th = this.tip.offsetHeight, { w, h } = this.size;
    let left = x - tw - 16; if (left < 8) left = x + 16;
    let top = clamp(y - 14, 8, h - th - 30);
    this.tip.style.left = Math.min(left, w - tw - 8) + 'px';
    this.tip.style.top = top + 'px';
  }

  bindEvents() {
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener('pointermove', e => {
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        this.cam.az = clamp(drag.az - dx * .35, -20, 80);
        this.cam.el = clamp(drag.el + dy * .25, 14, 62);
        this.hovered = null; this.tip.classList.remove('show');
        return;
      }
      if (!this.busy) this.pick(e);
    });
    el.addEventListener('pointerleave', () => { this.hovered = null; this.tip.classList.remove('show'); });
    el.addEventListener('pointerdown', e => {
      if (this.mode !== '3d' || this.busy) return;
      drag = { x: e.clientX, y: e.clientY, az: this.cam.az, el: this.cam.el };
      el.setPointerCapture(e.pointerId); this.host.classList.add('dragging');
    });
    const end = () => { drag = null; this.host.classList.remove('dragging'); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => this.mode === '3d' && !this.busy && this.tweenCam(VIEWS['3d'], 600));
  }

  /* ---------- animations ---------- */
  tweenCam(to, dur, delay = 0) {
    const from = { ...this.cam };
    return tween(dur, k => { for (const key in to) this.cam[key] = lerp(from[key], to[key], k); }, ease.io, delay);
  }
  growBars(dir, dur, delay = 0) {
    this.growDir = dir;
    const from = this.grow, to = dir > 0 ? 1 : 0;
    return tween(dur, k => { this.grow = lerp(from, to, k); }, t => t, delay);
  }
  async intro() {
    this.cam = { ...VIEWS['3d'] }; this.mode = '3d'; this.grow = 0;
    this.busy = true;
    await this.growBars(1, 1100, 260);
    this.busy = false;
  }
  async setMode(mode) {
    if (mode === this.mode || this.busy) return false;
    this.busy = true; this.mode = mode;
    this.hovered = null; this.tip.classList.remove('show');
    if (mode === 'grid') {
      this.viz.classList.add('is-grid');
      await Promise.all([this.growBars(-1, 520), this.tweenCam(VIEWS.grid, 760, 260)]);
      this.viz.classList.add('settled');
    } else {
      this.viz.classList.remove('is-grid', 'settled');
      await Promise.all([this.tweenCam(VIEWS['3d'], 720), this.growBars(1, 1000, 420)]);
    }
    this.busy = false;
    return true;
  }
}

/* =========================================================
   Drawer wiring
   ========================================================= */
const app = $('#app'), drawer = $('#drawer'), viz = $('#viz');
let heatmap = null;
function ensureHeatmap() {
  if (heatmap) return heatmap;
  try { heatmap = new Heatmap3D($('#vizCanvas'), $('#vizLabels'), $('#tip'), viz); }
  catch (err) { console.error(err); $('#vizCanvas').innerHTML = '<div class="webgl-error">WebGL is not available in this browser.</div>'; }
  return heatmap;
}
function openDrawer() {
  if (app.classList.contains('drawer-open')) return;
  app.classList.add('drawer-open'); drawer.setAttribute('aria-hidden', 'false');
  // reset to 3D each time it opens, like the reference
  viz.classList.remove('is-grid', 'settled');
  setToggle('3d');
  const hm = ensureHeatmap();
  if (hm) { hm.start(); hm.intro(); }
  drawer.querySelectorAll('.vbars i').forEach((b, i) => { b.style.height = '0'; setTimeout(() => b.style.height = b.dataset.h + 'px', 380 + i * 35); });
}
function closeDrawer() {
  app.classList.remove('drawer-open'); drawer.setAttribute('aria-hidden', 'true');
  setTimeout(() => !app.classList.contains('drawer-open') && heatmap && heatmap.stop(), 700);
}
function setToggle(mode) {
  const t = $('#toggle');
  t.classList.toggle('grid', mode === 'grid');
  t.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  $('#vizHint').textContent = mode === 'grid' ? 'Hover a dot for details' : 'Hover a bar for details · drag to rotate';
}
$('#toggle').addEventListener('click', async e => {
  const mode = e.target.dataset && e.target.dataset.mode;
  if (!mode || !heatmap || heatmap.busy || mode === heatmap.mode) return;
  setToggle(mode);
  await heatmap.setMode(mode);
});
$('#closeBtn').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', closeDrawer);
addEventListener('keydown', e => e.key === 'Escape' && closeDrawer());
