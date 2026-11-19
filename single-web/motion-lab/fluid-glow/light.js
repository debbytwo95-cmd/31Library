/* Parameters and delivery for the shared light-band renderer. */
(() => {
  const $ = id => document.getElementById(id);
  const defaults = { speed: 1, weave: .65, glow: 1, spacing: 3.35, thickness: 2.1, curvature: 1, 'offset-x': 0, 'offset-y': 0 };
  const effect = mountFluidGlow($('light'));
  let playing = false, delivery;
  const initial = effect.getConfig();
  function sync() {
    const config = effect.getConfig();
    for (const [key, value] of Object.entries(config.params)) {
      $(key).value = value;
      $(key).style.setProperty('--progress', 100 * (value - Number($(key).min)) / (Number($(key).max) - Number($(key).min)) + '%');
      $(key + '-value').value = key === 'speed' ? value.toFixed(2) + '×' : ['weave','glow','curvature'].includes(key) ? Math.round(value * 100) + '%' : value.toFixed(key.startsWith('offset') ? 0 : 2) + ' px';
    }
    $('color').value = config.color; $('color-value').value = config.color.toUpperCase();
    document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === config.color.toLowerCase())));
    document.querySelectorAll('[data-width-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.widthMode === config.widthMode)));
    $('shuffle-widths').hidden = config.widthMode !== 'random';
    $('layers').setAttribute('aria-pressed', String(config.skeleton)); $('layers').textContent = config.skeleton ? '恢复辉光' : '拆解光轨';
    $('play').textContent = playing ? '暂停光效' : '播放光效'; $('play').setAttribute('aria-pressed', String(playing));
    $('state').textContent = playing ? '实时渲染 · Canvas 2D' : '已暂停 · Canvas 2D';
    delivery?.refresh();
  }
  for (const key of Object.keys(defaults)) $(key).addEventListener('input', event => { effect.update({ params: { [key]: Number(event.target.value) } }); sync(); });
  $('color').addEventListener('input', event => { effect.update({ color: event.target.value }); sync(); });
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => { effect.update({ color: button.dataset.color }); sync(); }));
  $('play').addEventListener('click', () => { playing = !playing; effect.play(playing); sync(); });
  $('layers').addEventListener('click', () => { effect.update({ skeleton: !effect.getConfig().skeleton }); sync(); });
  $('center-flow').addEventListener('click', () => { effect.update({ params: { 'offset-x': 0, 'offset-y': 0 } }); sync(); });
  $('shuffle-widths').addEventListener('click', () => { effect.update({ widthWeights: Array.from({length:18},()=>.25+Math.random()*1.75) }); sync(); });
  document.querySelectorAll('[data-width-mode]').forEach(button => button.addEventListener('click', () => {
    const widthMode = button.dataset.widthMode; effect.update({ widthMode, params: { thickness: {thick:5,thin:2.1,random:3}[widthMode] } }); sync();
  }));
  $('reset').addEventListener('click', () => { playing = false; effect.reset(); effect.update(initial); sync(); });
  const cover = document.documentElement.hasAttribute('data-cover');
  if (cover) {
    const preview = $('preview-panel');
    preview.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') effect.play(true); });
    preview.addEventListener('pointerleave', () => effect.reset());
    window.addEventListener('blur', () => effect.reset());
  }
  delivery = mountLabWorkbench({
    id: 'fluid-glow', title: 'Fluid Glow',
    async bundle() {
      const snapshot = effect.getConfig();
      return {
        html: '<div class="library-fluid-glow"><canvas aria-label="弧形光带"></canvas><button type="button" aria-pressed="false">播放光效</button></div>',
        css: '.library-fluid-glow{position:relative;overflow:hidden;background:#030303;border-radius:20px}.library-fluid-glow canvas{display:block;width:100%;aspect-ratio:2560/1268}.library-fluid-glow button{position:absolute;right:20px;bottom:20px;padding:8px 16px;border:1px solid #777;border-radius:999px;background:#18181c;color:#fff;cursor:pointer}.library-fluid-glow button:focus-visible{outline:2px solid #fff;outline-offset:4px}',
        js: '(() => {\nconst mount = ' + mountFluidGlow.toString() + ';\ndocument.querySelectorAll(".library-fluid-glow").forEach(root=>{root.libraryComponent?.destroy();const effect=mount(root.querySelector("canvas"),'+JSON.stringify(snapshot)+');let playing=false;const button=root.querySelector("button");const click=()=>{playing=!playing;effect.play(playing);button.textContent=playing?"暂停光效":"播放光效";button.setAttribute("aria-pressed",String(playing));};button.addEventListener("click",click);root.libraryComponent={...effect,reset(){playing=false;effect.reset();button.textContent="播放光效";button.setAttribute("aria-pressed","false");},destroy(){button.removeEventListener("click",click);effect.destroy();}};});\n})();'
      };
    },
    prompt() {
      const config = effect.getConfig();
      return '实现 Fluid Glow · 流体光效。原生 Canvas 2D，无第三方依赖、贴图或网络资源。18 根参数曲线形成向上拱起的光带，沿弧线叠加相位波动，离屏画布合成三层辉光与移动亮度脉冲。设计坐标 1440×713.25，按容器等比缩放。当前参数：流速 '+config.params.speed+'×，交织 '+config.params.weave*100+'%，辉光 '+config.params.glow*100+'%，光线间距 '+config.params.spacing+' px，基础粗细 '+config.params.thickness+' px，弯曲度 '+config.params.curvature*100+'%，水平位移 '+config.params['offset-x']+' px，垂直位移 '+config.params['offset-y']+' px，颜色 '+config.color+'，粗细模式 '+config.widthMode+'，拆解光轨 '+config.skeleton+'。随机宽度权重 '+JSON.stringify(config.widthWeights)+'。初始静止，点击播放后才运动；调整参数实时重绘，不自动播放。重置暂停并恢复静态；prefers-reduced-motion 降低运动速度。按钮支持鼠标、触屏及键盘 Enter/空格；样式限定容器，多实例独立，移除前调用 root.libraryComponent.destroy()。不包含站点导航、调参面板或虚拟光标，精确效果以组件代码为准。';
    }
  });
  sync();
})();
