/* The workbench edits the same independent runtime that it delivers. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const defaults = { radius: 130, strength: 32, stiffness: 170, damping: 13, cornerRadius: 28 };
  const presets = { default: { radius: 130, strength: 32, stiffness: 170, damping: 13 }, soft: { radius: 170, strength: 38, stiffness: 100, damping: 10 }, snappy: { radius: 110, strength: 25, stiffness: 340, damping: 25 } };
  const config = { ...defaults };
  const field = $('field'), stage = $('preview-panel');
  const runtime = LibraryButtons.mountMagnetic(field, config);
  let delivery;
  function updateControls() {
    for (const key of Object.keys(defaults)) {
      const input = $(key); input.value = config[key];
      input.style.setProperty('--progress', (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100 + '%');
      $(key + '-output').innerHTML = config[key] + (key === 'radius' || key === 'cornerRadius' ? '<span>px</span>' : key === 'strength' ? '<span>%</span>' : '');
    }
    runtime.update(config);
    $('attraction-ring').style.width = $('attraction-ring').style.height = config.radius * 2 + 'px';
    $('radius-label').textContent = 'r = ' + config.radius + 'px';
    document.querySelectorAll('[data-preset]').forEach(button => {
      const selected = Object.keys(presets[button.dataset.preset]).every(key => presets[button.dataset.preset][key] === config[key]);
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    delivery?.refresh();
  }
  Object.keys(defaults).forEach(key => $(key).addEventListener('input', event => { config[key] = Number(event.target.value); updateControls(); }));
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => { Object.assign(config, presets[button.dataset.preset]); updateControls(); }));
  $('show-radius').addEventListener('change', event => $('attraction-ring').classList.toggle('visible', event.target.checked));
  $('reset').addEventListener('click', () => {
    Object.assign(config, defaults); $('show-radius').checked = false; $('attraction-ring').classList.remove('visible');
    runtime.reset(); updateControls();
  });
  document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.stageTheme)));
  function setTheme(theme) {
    stage.dataset.theme = field.dataset.appearance = theme;
    document.querySelectorAll('[data-stage-theme]').forEach(button => { const selected = button.dataset.stageTheme === theme; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
    delivery?.refresh();
  }
  document.documentElement.dataset.theme = 'light'; setTheme('light');
  function setTab(code) {
    runtime.reset(); stage.hidden = code; $('code-panel').hidden = !code;
    [$('preview-tab'), $('code-tab')].forEach((tab, i) => { const selected = Boolean(i) === code; tab.classList.toggle('selected', selected); tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
    if (code) delivery?.refresh();
  }
  $('preview-tab').addEventListener('click', () => setTab(false)); $('code-tab').addEventListener('click', () => setTab(true));
  document.querySelector('.tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const code = event.key === 'Home' ? false : event.key === 'End' ? true : $('code-panel').hidden;
    setTab(code); $(code ? 'code-tab' : 'preview-tab').focus();
  });
  delivery = LibraryDelivery.register({
    id: 'magnetic-button', title: 'Magnetic Button',
    async bundle() {
      const snapshot = Object.fromEntries(Object.keys(defaults).map(key => [key, config[key]])), theme = stage.dataset.theme;
      const clone = field.cloneNode(true); clone.className = 'library-magnetic-field'; clone.removeAttribute('id'); clone.removeAttribute('style');
      clone.querySelectorAll('.center-mark,.attraction-ring').forEach(node => node.remove());
      clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      clone.querySelector('button').className = 'library-magnetic-button'; clone.querySelector('button').removeAttribute('style');
      clone.querySelector('.library-magnetic-label').className = 'library-magnetic-label'; clone.querySelector('.library-magnetic-label').removeAttribute('style');
      clone.querySelector('.library-magnetic-ripple').className = 'library-magnetic-ripple'; clone.querySelector('.library-magnetic-ripple').removeAttribute('style');
      const [css, font] = await Promise.all([LibraryDelivery.read(new URL('button.css', location.href).href), LibraryDelivery.fontCSS()]);
      return {
        html: clone.outerHTML,
        css: font + '\n' + css.replace(/Inter,Arial/g, 'LibraryButtonInter,Arial'),
        js: '(() => {\nconst mount = ' + LibraryButtons.mountMagnetic.toString() + ';\ndocument.querySelectorAll(".library-magnetic-field").forEach(root => { root.libraryComponent?.destroy(); root.libraryComponent = mount(root, ' + JSON.stringify(snapshot) + '); });\n})();',
        background: theme === 'dark' ? '#171717' : '#f7f7f8'
      };
    },
    prompt() {
      return '实现 Magnetic Button · 磁吸按钮。原生 HTML / CSS / JavaScript，无第三方运行依赖。按钮 168×56 px，Inter Semibold 16 px（代码内嵌字体），文字 Get started 与内联 SVG 斜箭头。演示主题：' + stage.dataset.theme + '。\n当前参数：吸附半径 ' + config.radius + ' px；强度 ' + config.strength + '%；弹簧刚度 ' + config.stiffness + '；阻尼 ' + config.damping + '；圆角 ' + config.cornerRadius + ' px。鼠标在容器内靠近中心时按距离产生吸引，按钮与文字不同幅度跟随，移出自然弹回；按压缩小，释放回弹并产生轮廓涟漪。键盘 Tab 聚焦、Enter/空格激活；触屏仅按压和点击，不模拟悬停磁吸。尊重 prefers-reduced-motion，减小位移并抑制震荡；取消、失焦和离页清理临时状态。初始静止，只响应真实操作，禁止自动演示与虚拟光标。样式限定组件容器，多个实例独立；初始化返回 update/reset/destroy，移除前调用 root.libraryComponent.destroy()。不包含网站导航或调参面板；按目标项目技术栈接入，精确效果以所附组件代码为准。';
    }
  });
  updateControls();
})();
