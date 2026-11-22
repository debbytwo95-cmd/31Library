/* Parameters and delivery for the shared ASCII field renderer. */
(() => {
  const $ = id => document.getElementById(id);
  const ranges = { cellSize: v => v + ' px', scale: v => v.toFixed(2) + '×', density: pct, fade: pct, glow: pct, twinkle: pct, speed: v => v.toFixed(1) + '×', seed: v => String(v), radius: v => v + ' px', magnify: pct, wake: pct };
  function pct(v) { return Math.round(v * 100) + '%'; }
  const root = $('ascii');
  const isCover = document.documentElement.hasAttribute('data-cover');
  const effect = mountAsciiField(root, isCover ? { animate: false } : {});
  const initial = effect.getConfig();
  let delivery;
  function sync() {
    const config = effect.getConfig();
    for (const [key, format] of Object.entries(ranges)) {
      const input = $(key); input.value = config[key];
      input.style.setProperty('--progress', 100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) + '%');
      $(key + '-value').value = format(config[key]);
    }
    if (document.activeElement !== $('characters')) $('characters').value = config.characters;
    $('pattern').value = config.pattern;
    $('animate').checked = config.animate; $('interactive').checked = config.interactive; $('multicolor').checked = config.multicolor;
    $('palette').hidden = !config.multicolor; $('color-row').hidden = $('color').hidden = config.multicolor;
    $('color').value = config.color;
    $('custom-background').checked = Boolean(config.background);
    $('background').value = config.background || '#ffffff';
    $('background').hidden = $('background-row').hidden = !config.background;
    document.querySelectorAll('[data-palette]').forEach(input => { input.value = config.colors[input.dataset.palette]; });
    $('state').textContent = (config.animate && config.speed > 0 ? '漂移已开启' : '静止') + ' · Canvas 2D';
    delivery?.refresh();
  }
  for (const key of Object.keys(ranges)) $(key).addEventListener('input', event => { effect.update({ [key]: Number(event.target.value) }); sync(); });
  $('characters').addEventListener('input', event => { const characters = event.target.value; if (characters.length) { effect.update({ characters }); sync(); } });
  $('characters').addEventListener('blur', sync);
  $('color').addEventListener('input', event => { effect.update({ color: event.target.value }); sync(); });
  $('custom-background').addEventListener('change', event => { effect.update({ background: event.target.checked ? $('background').value : '' }); sync(); });
  $('background').addEventListener('input', event => { effect.update({ background: event.target.value }); sync(); });
  document.querySelectorAll('[data-palette]').forEach(input => input.addEventListener('input', () => {
    const colors = effect.getConfig().colors; colors[input.dataset.palette] = input.value; effect.update({ colors }); sync();
  }));
  $('pattern').addEventListener('change', event => { effect.update({ pattern: event.target.value }); sync(); });
  $('animate').addEventListener('change', event => { effect.play(event.target.checked); sync(); });
  $('interactive').addEventListener('change', event => { effect.update({ interactive: event.target.checked }); sync(); });
  $('multicolor').addEventListener('change', event => { effect.update({ multicolor: event.target.checked }); sync(); });
  $('reset').addEventListener('click', () => { effect.reset(); effect.update({ ...initial, animate: false }); sync(); });
  if (isCover) {
    // Covers wake on a real pointer entering and return to the still frame on leave.
    const preview = $('preview-panel');
    preview.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') effect.play(true); });
    preview.addEventListener('pointerleave', () => effect.reset());
    window.addEventListener('blur', () => effect.reset());
  }
  delivery = mountLabWorkbench({
    id: 'ascii-field', title: 'ASCII Field',
    async bundle() {
      const snapshot = effect.getConfig();
      return {
        html: '<div class="library-ascii-field"><canvas aria-hidden="true"></canvas></div>',
        css: '.library-ascii-field{position:relative;isolation:isolate;overflow:hidden;width:100%;min-height:240px;aspect-ratio:2/1;background:' + (snapshot.background || '#fff') + ';border-radius:20px;touch-action:pan-y}.library-ascii-field:focus-visible{outline:2px solid currentColor;outline-offset:4px}.library-ascii-field>canvas{position:absolute;inset:0;z-index:-1;width:100%;height:100%;display:block;pointer-events:none}',
        js: '(() => {\nconst mount = ' + mountAsciiField.toString() + ';\ndocument.querySelectorAll(".library-ascii-field").forEach(root => { root.libraryComponent?.destroy(); root.libraryComponent = mount(root, ' + JSON.stringify(snapshot) + '); });\n})();'
      };
    },
    prompt() {
      const c = effect.getConfig();
      return '实现 ASCII Field · 字符光场背景，参考 uibrik ASCII Field 的公开预览。原生 Canvas 2D，无第三方依赖。容器按行高 ' + c.cellSize + ' px、列宽为行高 0.6 倍切成等宽字符网格，每格采样 0–1 光场值：' + { flow: '漂移 flow，两级域扭曲分形值噪声，拉成弯曲、不断变形的光带', waves: '交错 waves，两组交叉正弦涌浪叠加少量噪声', rings: '环形 rings，三个种子中心向外扩散的同心波' }[c.pattern] + '。形状尺度 ' + c.scale + '（越大越平缓），字符覆盖 ' + c.density + '（低于 1−覆盖 的区域留白），边缘椭圆渐隐 ' + c.fade + '，底部辉光 ' + c.glow + '（高值区域在低分辨率画布上模糊后作为底色），闪烁 ' + c.twinkle + '（少量随机格子偶尔点亮），速度 ' + c.speed + '×，构图种子 ' + c.seed + '。字符由稀到密为 ' + JSON.stringify(c.characters) + '，第一个通常为空格；值越高字符越密、透明度越高。' + (c.multicolor ? '多色模式，色板由淡到密 ' + c.colors.join(' → ') + '。' : '单色 ' + c.color + '，以透明度形成浓淡。') + '背景' + (c.background || '跟随页面（示例为 #fff）') + '。' + (c.interactive ? '指针交互：半径 ' + c.radius + ' px 内采样坐标向指针收拢形成放大透镜（放大 ' + c.magnify + '），透镜内光场加密、字形放大，下方叠一层浅色径向底盘；移动写入逐渐衰减的拖尾缓冲（强度 ' + c.wake + '），拖尾内字符随机打散；点击从落点发出一圈约 450 px/s 向外扩散、由随机密集字符组成的散点圆环。触屏只在按住时生效，捕获当前触点，松手、取消或失焦后释放；键盘聚焦后按 Enter / 空格从中心发出涟漪，不模拟悬停。' : '关闭指针交互。') + (c.animate ? '初始化后即开始漂移。' : '初始静止，只绘制一帧；调用 play(true) 后才漂移。') + '字形预渲染到图集后逐格贴图；仅在漂移、透镜过渡、拖尾或涟漪存在时逐帧绘制；静止透镜收敛及交互余波结束后停止循环，离开视口或切到后台暂停。prefers-reduced-motion 时不漂移、不发出涟漪。容器尺寸由 ResizeObserver 跟随，可在容器内叠放内容。多实例独立，提供 update、play、reset、getConfig、destroy。不添加自动演示、虚拟光标或模拟输入。';
    }
  });
  sync();
})();
