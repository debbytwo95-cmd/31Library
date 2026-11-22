/* A single renderer powers the preview, covers and all exported instances. */
(() => {
  const $ = id => document.getElementById(id);
  const root = $('horizon');
  const isCover = document.documentElement.hasAttribute('data-cover');
  const effect = mountHalftoneHorizon(root, isCover ? { intro: 0 } : {});
  root.libraryComponent = effect;
  const initial = effect.getConfig();
  const formats = { curve:2, reach:2, softness:2, spacing:1, dotSize:2, minDot:2, dots:2, speed:1, grain:3, seed:0, radius:0, lens:2, trailLength:1, follow:2, intro:1, introFrom:2 };
  const units = { spacing:' px', radius:' px', speed:'×', trailLength:' s', intro:' s' };
  let delivery;
  const componentCSS = '.library-halftone-horizon{position:relative;isolation:isolate;overflow:hidden;width:100%;min-height:260px;aspect-ratio:2/1;background:#fff8ef;touch-action:pan-y}.library-halftone-horizon>canvas{position:absolute;inset:0;z-index:-1;display:block;width:100%;height:100%;pointer-events:none}.library-halftone-horizon:focus-visible{outline:2px solid #18181c;outline-offset:-4px}';
  function sync() {
    const c = effect.getConfig();
    for (const [key, precision] of Object.entries(formats)) {
      const input = $(key); input.value = c[key];
      input.style.setProperty('--progress', (c[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100+'%');
      $(key+'-value').value = Number(c[key]).toFixed(precision)+(units[key]||'');
    }
    for (const key of ['multicolor','interactive','ripples']) $(key).checked = c[key];
    $('direction').value = c.direction; $('color').value = c.color;
    $('palette').hidden = !c.multicolor; $('color').hidden = $('color-label').hidden = c.multicolor;
    document.querySelectorAll('[data-palette]').forEach(input => input.value = c.colors[Number(input.dataset.palette)]);
    $('state').textContent = root.dataset.renderer === 'CSS fallback' ? '静态回退 · WebGL 不可用' : (c.intro > 0 ? '入场 '+c.intro.toFixed(1)+' s · WebGL' : '静止 · WebGL');
    delivery?.refresh();
  }
  for (const key of Object.keys(formats)) $(key).addEventListener('input', event => { effect.update({ [key]:Number(event.target.value) }); sync(); });
  for (const key of ['multicolor','interactive','ripples']) $(key).addEventListener('change', event => { effect.update({[key]:event.target.checked}); sync(); });
  for (const key of ['color','direction']) $(key).addEventListener('input', event => { effect.update({[key]:event.target.value}); sync(); });
  document.querySelectorAll('[data-palette]').forEach(input => input.addEventListener('input', () => { const colors = effect.getConfig().colors; colors[Number(input.dataset.palette)] = input.value; effect.update({colors}); sync(); }));
  $('reset').addEventListener('click', () => { effect.reset(); effect.update(initial); sync(); });
  $('replay-intro').addEventListener('click', effect.replayIntro);
  if (document.documentElement.hasAttribute('data-cover')) {
    root.addEventListener('pointerleave', effect.reset); window.addEventListener('blur', effect.reset);
  }
  delivery = mountLabWorkbench({
    id:'halftone-horizon', title:'Halftone Horizon · 半调地平线', clear:effect.reset,
    async bundle() {
      const snapshot = effect.getConfig();
      return {
        html:'<div class="library-halftone-horizon" aria-label="半调地平线，移动指针查看透镜，点击发出涟漪"><canvas aria-hidden="true"></canvas></div>',
        css:componentCSS,
        js:'(() => {\nconst mount = '+mountHalftoneHorizon.toString()+';\ndocument.querySelectorAll(".library-halftone-horizon").forEach(root => { root.libraryComponent?.destroy(); root.libraryComponent = mount(root, '+JSON.stringify(snapshot)+'); });\n})();',
        background:'#fff8ef'
      };
    },
    prompt() {
      const c = effect.getConfig();
      return '实现 Halftone Horizon · 半调地平线背景，依据 https://uibrik.com/components/halftone-horizon 的公开视觉独立复刻。使用原生 WebGL 片元着色器，无第三方依赖。弧形暗部从 '+c.direction+' 边缘进入，圆形半调网点从小到大融入平滑渐变；色板使用连续切线插值，亮部沿柔和曲线渐入暖白；加入固定胶片颗粒。'+(c.multicolor?'六阶色板：'+c.colors.join(' → '):'主色：'+c.color+'，从近黑经过主色过渡到暖白。')+'当前参数：'+JSON.stringify(c)+'。spacing、radius 单位 px；trailLength 单位秒，speed 仅控制真实点击触发的涟漪扩散。网点透镜直接跟随真实指针；在任意深色区域也会显出放大的主色圆点，按局部亮度判断，随移出恢复暗部；独立柔光稍后跟随；follow 只控制柔光迟滞。柔光沿当前位置的渐变色板提亮，暗部保持橙红，亮部呈浅桃色，不叠加中性灰白雾。历史路径按时间采样，连接成连续笔迹，在固定网格留下细小网点；拖尾随年龄缩小、收窄并淡出，取最强值避免反复累加。网点拖尾与当前透镜独立，保留点间空隙。点击发出圆形涟漪；键盘聚焦后 Enter / 空格从中心触发涟漪，触屏按住移动，释放或取消后复位并允许纵向页面滚动。首次进入视口播放一次 '+c.intro+' 秒入场，起始暗部深度 '+c.introFrom+'（0 为暖白底、1 为静止构图、2 为暗部深入后退回），使用三次减速缓动；调用 replayIntro() 可重播。入场结束后静止，不添加循环播放、模拟光标或闲置循环。交互收敛后停止 requestAnimationFrame，减少动态效果时跳过入场并禁用拖尾与涟漪。多实例独立，提供 update、getConfig、reset、destroy；用 ResizeObserver 适配容器，销毁时清理事件、观察器、动画帧与 WebGL 资源。没有 WebGL 时降级为静态 CSS 渐变。组件代码排除网站导航、控制面板和页脚。';
    }
  });
  sync();
})();
