(() => {
  const $ = id => document.getElementById(id), cover = document.documentElement.hasAttribute('data-cover');
  const root = $('spectral-logo');
  if (cover) root.dataset.cover = 'true';
  const effect = mountSpectralLogo(root, { theme: cover ? 'light' : 'dark' });
  let playing = false, delivery;
  function sync() {
    const config = effect.getConfig();
    for (const key of ['depth', 'wave', 'glow', 'speed']) {
      const input = $(key); input.value = config[key];
      input.style.setProperty('--progress', (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100 + '%');
      $(key + '-value').value = key === 'speed' ? config[key].toFixed(2) + '×' : Math.round(config[key] * 100) + '%';
    }
    $('logo-text').value = config.text; $('color').value = config.color; $('color-value').value = config.color.toUpperCase(); $('tracking').checked = config.tracking;
    $('preview-panel').dataset.theme = config.theme;
    document.querySelectorAll('[data-stage-theme]').forEach(button => {
      const selected = button.dataset.stageTheme === config.theme; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    $('play').textContent = playing ? '暂停光效' : '播放光效'; $('play').setAttribute('aria-pressed', String(playing)); root.setAttribute('aria-pressed', String(playing));
    $('state').textContent = playing ? '播放中 · 再次点击暂停' : '静止 · 悬停预览，点击锁定播放';
    delivery?.refresh();
  }
  root.addEventListener('spectralstate', event => { playing = event.detail.playing; sync(); });
  $('play').addEventListener('click', () => effect.play(!playing));
  for (const key of ['depth', 'wave', 'glow', 'speed']) $(key).addEventListener('input', event => { effect.update({ [key]: Number(event.target.value) }); sync(); });
  $('logo-text').addEventListener('input', event => { effect.update({ text: event.target.value }); delivery?.refresh(); });
  $('logo-text').addEventListener('change', sync);
  $('color').addEventListener('input', event => { effect.update({ color: event.target.value }); sync(); });
  $('tracking').addEventListener('change', event => { effect.update({ tracking: event.target.checked }); sync(); });
  document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => { effect.update({ theme: button.dataset.stageTheme }); sync(); }));
  $('reset').addEventListener('click', () => { effect.reset(); sync(); });
  delivery = mountLabWorkbench({
    id: 'spectral-logo', title: 'Spectral Logo', clear: () => effect.play(false),
    async bundle() {
      const snapshot = effect.getConfig();
      const [css, font, license] = await Promise.all([
        LibraryDelivery.read(new URL('effect.css', location.href).href),
        LibraryDelivery.read(new URL('../../../assets/fonts/inter-400.ttf', location.href).href, true),
        LibraryDelivery.read(new URL('../../../assets/fonts/INTER-OFL.txt', location.href).href)
      ]);
      let binary = ''; new Uint8Array(font).forEach(byte => { binary += String.fromCharCode(byte); });
      const fonts = '/* Inter font license\n' + license.replace(/\*\//g, '* /') + '\n*/\n@font-face{font-family:LibraryButtonInter;font-weight:400;font-display:swap;src:url(data:font/ttf;base64,' + btoa(binary) + ') format("truetype")}';
      return {
        html: '<div class="library-spectral-logo" role="button" tabindex="0" aria-label="31Library 光谱字标，点击播放或暂停"><canvas class="spectral-surface" aria-hidden="true"></canvas><canvas class="spectral-tracking" aria-hidden="true"></canvas></div>',
        css: fonts + '\n' + css + '\n.library-spectral-logo{width:min(100%,1200px)}',
        js: '(() => {\nconst mount = ' + mountSpectralLogo.toString() + ';\ndocument.querySelectorAll(".library-spectral-logo").forEach(root => { root.libraryComponent?.destroy(); mount(root, ' + JSON.stringify(snapshot) + '); });\n})();'
      };
    },
    prompt() {
      const config = effect.getConfig();
      return '实现 Spectral Logo · 光谱字标。字标文字 ' + JSON.stringify(config.text) + '，字体 Inter Regular，设计坐标 1200×720，居中的镂空字面、蓝色高光轮廓与细线矢量追踪框；用 Canvas 2D 生成字形有符号距离场，WebGL 叠加 56 个波动深度切片，形成向后拖曳的体积光带。当前参数：' + JSON.stringify(config) + '。depth 拖影深度、wave 波动幅度、glow 发光强度为基准倍率；speed 为流速倍率；color 为十六进制颜色，tracking 控制追踪框。初始静止，真实悬停流动、移出复位，点击或 Enter/空格切换锁定播放，触屏轻触同样切换；窗口失焦、取消或页面隐藏时停止。减少动态效果时使用静态短拖影。参数变化只重绘、不自动播放。导出内嵌字体与许可，不依赖第三方库或视频贴图，支持独立多实例与 update、reset、destroy，reset 保留主题。无 WebGL 时回退为静态文字。不含网站导航、参数面板、虚拟光标或自动演示。精确效果以代码为准。';
    }
  });
  sync();
})();
