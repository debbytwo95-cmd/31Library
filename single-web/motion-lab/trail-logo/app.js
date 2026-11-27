/* One renderer powers the preview, the index cover and every exported instance. */
(() => {
  const $ = id => document.getElementById(id);
  const root = $('trail-logo');
  const cover = document.documentElement.hasAttribute('data-cover');
  const effect = mountTrailLogo(root);
  root.libraryComponent = effect;
  const initial = effect.getConfig();
  const sliders = { speed: v => v.toFixed(2) + '×', length: percent, sway: percent, spread: percent, depth: v => v.toFixed(2) + '×', gloss: percent, glow: percent, focus: percent, grain: v => v.toFixed(3), pointer: percent };
  function percent(v) { return Math.round(v * 100) + '%'; }
  const exportFont = '"LibraryTrailLogoInter", Inter, system-ui, sans-serif';
  const componentCSS = '.library-trail-logo{position:relative;isolation:isolate;overflow:hidden;width:100%;aspect-ratio:16/9;min-height:240px;background:#020204;touch-action:pan-y;cursor:crosshair}.library-trail-logo>canvas{position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none}.library-trail-logo-play{position:absolute;right:16px;bottom:16px;z-index:1;padding:8px 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(10,12,18,.6);color:#eef2f9;font:600 12px/1 LibraryTrailLogoInter,Inter,system-ui,sans-serif;cursor:pointer}.library-trail-logo-play:hover{background:rgba(30,36,48,.8)}.library-trail-logo-play:focus-visible{outline:2px solid #fff;outline-offset:3px}';
  let delivery;
  function sync() {
    const c = effect.getConfig(), playing = effect.isPlaying();
    for (const [key, format] of Object.entries(sliders)) {
      const input = $(key); input.value = c[key];
      input.style.setProperty('--progress', (c[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100 + '%');
      $(key + '-value').value = format(c[key]);
    }
    if (document.activeElement !== $('text')) $('text').value = c.text;
    $('color').value = c.color; $('icon').checked = c.icon; $('hud').checked = c.hud;
    $('play').textContent = playing ? '暂停流动' : '播放流动'; $('play').setAttribute('aria-pressed', String(playing));
    const renderer = root.dataset.renderer || 'WebGL2';
    $('state').textContent = (renderer === 'WebGL2' ? (playing ? '流动中' : '已暂停') : '静态回退') + ' · ' + renderer;
    delivery?.refresh();
  }
  for (const key of Object.keys(sliders)) $(key).addEventListener('input', event => { effect.update({ [key]: Number(event.target.value) }); sync(); });
  $('color').addEventListener('input', event => { effect.update({ color: event.target.value }); sync(); });
  for (const key of ['icon', 'hud']) $(key).addEventListener('change', event => {
    // Keep at least one mark visible: an empty logo has nothing to sweep.
    if (key === 'icon' && !event.target.checked && !effect.getConfig().text) event.target.checked = true;
    effect.update({ [key]: event.target.checked }); sync();
  });
  // Rebuilding the distance field takes a moment, so typing is applied after a short pause.
  let typing = 0;
  function applyText() {
    clearTimeout(typing); typing = 0;
    const text = $('text').value.replace(/\s+/g, ' ').trim();
    if ((text || effect.getConfig().icon) && text !== effect.getConfig().text) { effect.update({ text }); sync(); }
  }
  $('text').addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(applyText, 160); });
  $('text').addEventListener('blur', () => { applyText(); $('text').value = effect.getConfig().text; });
  $('play').addEventListener('click', () => { effect.play(!effect.isPlaying()); sync(); });
  $('reset').addEventListener('click', () => { clearTimeout(typing); typing = 0; effect.reset(); effect.update(initial); $('text').value = initial.text; sync(); });
  if (cover) {
    // Covers stay on the still frame until a real pointer enters, then return to it.
    root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') effect.play(true); });
    root.addEventListener('pointerleave', effect.reset);
    window.addEventListener('blur', effect.reset);
  }
  delivery = mountLabWorkbench({
    id: 'trail-logo', title: 'Trail Logo · 拖尾标志',
    clear() { if (effect.isPlaying()) { effect.play(false); sync(); } },
    async bundle() {
      if (typing) applyText();
      const snapshot = { ...effect.getConfig(), fontFamily: exportFont };
      const font = await LibraryDelivery.fontCSS();
      const label = (snapshot.text || '31') + ' 拖尾标志';
      return {
        html: '<div class="library-trail-logo" role="img" aria-label="' + label.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]) + '"><canvas></canvas><canvas class="library-trail-logo-hud"></canvas><button class="library-trail-logo-play" type="button" aria-pressed="false">播放流动</button></div>',
        css: font.replaceAll('LibraryButtonInter', 'LibraryTrailLogoInter') + '\n' + componentCSS,
        js: '(() => {\nconst mount = ' + mountTrailLogo.toString() + ';\nconst config = ' + JSON.stringify(snapshot) + ';\ndocument.querySelectorAll(".library-trail-logo").forEach(root => {\n  root.libraryComponent?.destroy();\n  const effect = mount(root, config), button = root.querySelector(".library-trail-logo-play");\n  const label = () => { const on = effect.isPlaying(); button.textContent = on ? "暂停流动" : "播放流动"; button.setAttribute("aria-pressed", String(on)); };\n  const toggle = () => { effect.play(!effect.isPlaying()); label(); };\n  button?.addEventListener("click", toggle);\n  root.libraryComponent = { ...effect, play(on) { effect.play(on); label(); }, reset() { effect.reset(); label(); }, destroy() { button?.removeEventListener("click", toggle); effect.destroy(); } };\n});\n})();'
      };
    },
    prompt() {
      const c = effect.getConfig();
      return '实现 Trail Logo · 拖尾标志：深色画面中，' + (c.icon ? '31Library 图标（圆角方块，"31" 镂空）与' : '') + '字标 ' + JSON.stringify(c.text) + '（Inter Semibold，字距 -0.02em）沿流动路径向画面深处挤出发光的缎面拖尾，正面为深海军蓝 #030B1C 并带细亮边，拖尾颜色 ' + c.color + '。视觉参考 secondeight_ 发布的 Sixfold 标志动效视频，标志替换为 31Library。使用原生 WebGL2，无第三方依赖。做法：在离屏画布绘制标志蒙版，按亚像素透明度转换为有符号距离场（Felzenszwalb 距离变换），上传 R16F 纹理；路径由朝向平滑转动的运动体积分得到——朝向 3.95 rad 加三项正弦扰动（幅度 1.3/0.7/0.3 × 摆动幅度，频率 0.45/1.05/2.3），步速 1.1 加两项正弦，按相位采样 256 点写入 RG32F 表；第 z 层（0–1）的偏移 = P(u0 − z·2.2·拖尾长度) − P(u0)，以字高为单位，u0 = 流动相位 − 字间相位差 ×（1.1·横向位置 + 0.18·纵向位置）。每个像素在 z 方向按距离场下界做步进（步长 = 距离 / 最大斜率），首次相交后二分细化；侧壁法线 = normalize(梯度, −梯度·路径切向 /（挤出深度 × 2.4 字高）)，近正面主光 + 左上顶光 + 双层高光（光泽 ' + c.gloss + '），深度 0.5–1 淡出；未命中像素按最近距离加辉光。第二遍按深度做景深模糊（最大半径 = 景深模糊 × 0.1 字高，正面不模糊，背景不渗入正面），叠加辉光 ' + c.glow + ' 与胶片颗粒 ' + c.grain + '。另用 2D 画布绘制 “SECTION NN” 分区标注：图标固定为 01，其余每 0.42 s 按流动时间确定性生成 1–3 个字形的方框，带等宽标签、白点及全部白点之间的细连线，淡入淡出且随流动轻微漂移。当前参数：' + JSON.stringify(c) + '。速度为每秒推进的相位，长度、幅度、相位差、深度、光泽、辉光、景深、指针为倍率。初始停在静止构图（相位 1.6），点击“播放流动”才连续流动，再次点击暂停；不自动播放、不使用虚拟光标或闲置循环。真实鼠标移动时，以临界阻尼弹簧跟随指针并以 60 Hz 记录 1.6 s 位移历史，作为额外路径叠加（拖尾随指针甩动，静止后收回）；触屏按住拖动，松手或取消后收回，保留纵向滚动。减少动态效果时流动降为 0.3 倍、指针拖拽 0.25 倍。无 WebGL2 时用 Canvas 2D 叠层绘制静态画面。提供 update、getConfig、play、reset、isPlaying、destroy；ResizeObserver 适配容器，IntersectionObserver 在不可见时停帧，销毁时清理事件、观察器、动画帧与 WebGL 资源；多实例独立。组件代码排除网站导航、控制面板和页脚。';
    }
  });
  sync();
})();
