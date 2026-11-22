(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { leadStiffness: 620, leadDamping: 40, trailStiffness: 170, trailDamping: 19 };
    const config = { ...defaults };
    const root = $('tab-pill'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const runtime = LibraryTabPill.mount(root, config);
    root.libraryComponent = runtime;
    let slow = false, codeVisible = false, delivery;
    function sync() {
        runtime.update({ ...config, timeScale: slow ? .25 : 1 });
        for (const key of Object.keys(defaults)) {
            const input = $(key);
            input.value = config[key];
            input.style.setProperty('--progress', (100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min))) + '%');
            $(key + '-output').textContent = config[key];
        }
        if (codeVisible) delivery?.refresh();
    }
    for (const key of Object.keys(defaults)) $(key).addEventListener('input', event => { config[key] = Number(event.target.value); sync(); });
    $('reset').addEventListener('click', () => {
        Object.assign(config, defaults); slow = false;
        $('speed-label').textContent = '1×';
        $('slow-control').setAttribute('aria-pressed', 'false');
        runtime.reset(); sync();
    });
    $('slow-control').addEventListener('click', () => {
        slow = !slow;
        $('speed-label').textContent = slow ? '0.25×' : '1×';
        $('slow-control').setAttribute('aria-pressed', String(slow)); sync();
    });
    document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => {
        stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => {
            other.classList.toggle('selected', other === button);
            other.setAttribute('aria-pressed', String(other === button));
        });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code; runtime.settle();
        stage.hidden = code; $('code-panel').hidden = !code;
        [$('preview-tab'), $('code-tab')].forEach((tab, i) => {
            const active = Boolean(i) === code;
            tab.classList.toggle('selected', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
        });
        if (!code) runtime.update();
        else delivery?.refresh();
    }
    $('preview-tab').addEventListener('click', () => setTab(false));
    $('code-tab').addEventListener('click', () => setTab(true));
    document.querySelector('.tabs').addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const code = event.key === 'Home' ? false : event.key === 'End' ? true : !codeVisible;
        setTab(code); $(code ? 'code-tab' : 'preview-tab').focus();
    });
    if (cover) {
        // Hovering a real tab previews its selection; leaving restores the default.
        root.querySelectorAll('.library-tab-pill-tab').forEach((tab, index) => tab.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse') runtime.select(index);
        }));
        document.addEventListener('pointerleave', () => runtime.reset());
    } else {
        delivery = LibraryDelivery.register({
            id: 'tab-pill', title: 'Tab Pill · 弹性胶囊标签页',
            async bundle() {
                const snapshot = { ...config }, appearance = root.dataset.appearance;
                const clone = root.cloneNode(true);
                clone.removeAttribute('id');
                clone.querySelector('.library-tab-pill-indicator').removeAttribute('style');
                clone.querySelectorAll('.library-tab-pill-tab').forEach((tab, index) => {
                    tab.removeAttribute('id'); tab.removeAttribute('aria-controls');
                    tab.setAttribute('aria-selected', String(index === 0)); tab.tabIndex = index === 0 ? 0 : -1;
                });
                clone.querySelectorAll('.library-tab-pill-panel').forEach((panel, index) => {
                    panel.removeAttribute('id'); panel.removeAttribute('aria-labelledby'); panel.hidden = index !== 0;
                });
                const [css, effect, font] = await Promise.all([
                    LibraryDelivery.read(new URL('effect.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href),
                    LibraryDelivery.fontCSS()
                ]);
                return {
                    html: clone.outerHTML,
                    css: font.replace(/LibraryButtonInter/g, 'LibraryTabPillInter') + '\n' + css.replace(/Inter,/g, 'LibraryTabPillInter,Inter,'),
                    js: effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-tab-pill").forEach(root => {\n  root.libraryComponent?.destroy();\n  root.libraryComponent = LibraryTabPill.mount(root, config);\n });\n})();',
                    background: appearance === 'dark' ? '#171717' : '#fff'
                };
            },
            prompt() {
                return '制作 Tab Pill · 弹性胶囊标签页。四项 Overview、Projects、Team、Settings 横向排布，350 px 宽、46 px 高、4 px 内边距，窄屏自适应。当前主题 ' + root.dataset.appearance + '，浅色为浅灰轨道与黑色胶囊，深色为深灰轨道与白色胶囊。点击切换时左右边缘分别用单位质量为 1 的弹簧积分，前缘先行、后缘追随，再收拢；方向反转时交换两条边的参数。前缘刚度 ' + config.leadStiffness + ' s⁻²、阻尼 ' + config.leadDamping + ' s⁻¹，后缘刚度 ' + config.trailStiffness + ' s⁻²、阻尼 ' + config.trailDamping + ' s⁻¹。使用原生 CSS 和 JavaScript，无第三方运行库；Inter 字体随独立 HTML 内嵌并附 OFL 许可。支持鼠标、触屏、Enter/空格、左右键循环、Home/End、ARIA tablist/tab/tabpanel 和多实例唯一关联 ID；减少动态效果时立即切换。提供 select、update、reset、destroy 与 onChange 回调，尺寸或字体改变后重新测量，失焦后停稳。初始静止，不自动演示，停稳后停止动画帧；工作台慢速与封面跳转不进入组件代码。示例只展示标签栏，面板内容供屏幕阅读器使用，实际接入时可移除面板的视觉隐藏样式。';
            }
        });
    }
    sync();
})();
