(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { duration: 500, cornerRadius: 24, direction: 'all', easing: 'power3.out', fillColor: '#525252' };
    const presets = { default: { duration: 500, easing: 'power3.out' }, soft: { duration: 850, easing: 'power1.inOut' }, snappy: { duration: 280, easing: 'power3.out' } };
    const config = { ...defaults }, button = $('curve-cta'), stage = $('preview-panel');
    const runtime = LibraryCurve.mount(button);
    button.libraryComponent = runtime;
    let codeVisible = false, delivery;
    function apply() {
        runtime.update(config);
        button.style.setProperty('--curve-radius', config.cornerRadius + 'px');
        button.style.setProperty('--curve-fill', config.fillColor);
        for (const [key, unit] of [['duration', 'ms'], ['cornerRadius', 'px']]) {
            const input = $(key); input.value = config[key];
            input.style.setProperty('--progress', 100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) + '%');
            $(key + '-output').replaceChildren(document.createTextNode(config[key]), Object.assign(document.createElement('span'), { textContent: unit }));
        }
        for (const key of ['direction', 'easing', 'fillColor']) $(key).value = config[key];
        document.querySelectorAll('[data-preset]').forEach(item => {
            const selected = Object.entries(presets[item.dataset.preset]).every(([key, value]) => config[key] === value);
            item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected));
        });
        if (codeVisible) delivery?.refresh();
    }
    for (const key of ['duration', 'cornerRadius', 'fillColor']) $(key).addEventListener('input', event => { config[key] = key === 'fillColor' ? event.target.value : Number(event.target.value); apply(); });
    for (const key of ['direction', 'easing']) $(key).addEventListener('change', event => { config[key] = event.target.value; apply(); });
    document.querySelectorAll('[data-preset]').forEach(item => item.addEventListener('click', () => { Object.assign(config, presets[item.dataset.preset]); apply(); }));
    $('reset').addEventListener('click', () => {
        Object.assign(config, defaults); runtime.reset(); apply();
    });
    document.querySelectorAll('[data-stage-theme]').forEach(item => item.addEventListener('click', () => {
        stage.dataset.theme = item.dataset.stageTheme;
        button.dataset.appearance = item.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => { const selected = other === item; other.classList.toggle('selected', selected); other.setAttribute('aria-pressed', String(selected)); });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code; runtime.reset(); stage.hidden = code; $('code-panel').hidden = !code;
        [$('preview-tab'), $('code-tab')].forEach((tab, index) => { const selected = Boolean(index) === code; tab.classList.toggle('selected', selected); tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
        if (code) delivery?.refresh();
    }
    $('preview-tab').addEventListener('click', () => setTab(false)); $('code-tab').addEventListener('click', () => setTab(true));
    document.querySelector('.tabs').addEventListener('keydown', event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const code = event.key === 'Home' ? false : event.key === 'End' ? true : !codeVisible; setTab(code); $(code ? 'code-tab' : 'preview-tab').focus(); }
    });
    delivery = LibraryDelivery.register({
        id: 'curve-fill-button', title: 'Curve Fill Button · 曲线填充按钮',
        async bundle() {
            const snapshot = { ...config }, theme = stage.dataset.theme;
            const clone = button.cloneNode(true); clone.removeAttribute('id'); clone.classList.remove('is-active');
            clone.querySelector('.curve-path').setAttribute('d', 'M 0 100 V 100 Q 50 100 100 100 V 100 z');
            const [css, font, gsapCode, license] = await Promise.all([
                LibraryDelivery.read(new URL('button.css', location.href).href), LibraryDelivery.fontCSS(),
                LibraryDelivery.read(new URL('assets/gsap.min.js', location.href).href),
                LibraryDelivery.read(new URL('assets/GSAP-LICENSE.txt', location.href).href)
            ]);
            return {
                html: clone.outerHTML, css: font + '\n' + css.replace('Inter,Arial', 'LibraryButtonInter,Arial'),
                js: '/* ' + license.replace(/\*\//g, '* /') + ' */\n' + gsapCode.replace(/\/\/# sourceMappingURL=.*$/gm, '') + '\n(() => {\nconst mount = ' + LibraryCurve.mount.toString() + ';\ndocument.querySelectorAll(".library-curve-button").forEach(root => { root.libraryComponent?.destroy(); root.libraryComponent = mount(root, ' + JSON.stringify(snapshot) + '); });\n})();',
                background: theme === 'dark' ? '#171717' : '#f7f7f8'
            };
        },
        prompt() {
            return '实现 Curve Fill Button · 曲线填充按钮，参考 Annnimate Curve Fill Button。按钮为胶囊形，高 48 px，水平内边距 22 px，Inter Semibold 15 px，文案 Book a guide；当前底色 ' + (stage.dataset.theme === 'dark' ? '#ffffff' : '#141314') + '，默认文字 ' + (stage.dataset.theme === 'dark' ? '#18181c' : '#f2f2ef') + '，悬停文字 #ffffff；浅色模式深底浅字，暗色模式白底黑字，两种模式默认悬停填充均为 #525252。组件通过 data-appearance 保存当前主题，导出后独立生效。使用 SVG viewBox="0 0 100 100" preserveAspectRatio="none"，二次贝塞尔路径由 GSAP 3.15.0 的 attr.d 插值。进入和离开分别比较指针到四条边的实际像素距离，选择最近边缘，从对应方向填入或退出；上下曲率与左右曲率沿用参考路径，不使用圆形缩放代替。当前参数：时长 ' + config.duration + ' ms，圆角 ' + config.cornerRadius + ' px，填充 ' + config.fillColor + '，方向模式 ' + config.direction + '，缓动 ' + config.easing + '，演示主题 ' + stage.dataset.theme + '。键盘 Tab 可见聚焦展开，Enter / 空格激活；触屏真实按住展开、松手收回，不模拟 hover。减少动态效果时直接切换状态。取消、失焦、离页清理动画与临时状态；多个实例独立，支持 reset() 与 destroy()。初始静止，不添加自动演示、闲置循环、虚拟光标或模拟输入。样式只作用组件专属类，GSAP 与 Inter 字体随独立示例内嵌，保留许可。';
        }
    });
    apply();
})();
