(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { holdMs: 1200, doneMs: 1700, width: 220, height: 56, rebound: 14 };
    const config = { ...defaults };
    const button = $('hold-cta'), stage = $('preview-panel');
    const isCover = document.documentElement.hasAttribute('data-cover');
    const runtime = LibraryHoldButton.mount(button, {
        ...config,
        onComplete: isCover ? () => window.parent.postMessage({ type: 'library:cover-open' }, location.origin) : undefined
    });
    button.libraryComponent = runtime;
    let codeVisible = false, delivery;
    function sync() {
        runtime.update(config);
        for (const key of ['holdMs', 'doneMs', 'rebound']) {
            const input = $(key);
            if (!input) continue;
            input.value = config[key];
            const min = Number(input.min), max = Number(input.max);
            input.style.setProperty('--progress', (100 * (config[key] - min) / (max - min)) + '%');
            $(key + '-output').replaceChildren(
                document.createTextNode(config[key]),
                ...(key === 'rebound' ? [] : [Object.assign(document.createElement('span'), { textContent: 'ms' })])
            );
        }
        if (codeVisible) delivery?.refresh();
    }
    for (const key of ['holdMs', 'doneMs', 'rebound']) {
        $(key).addEventListener('input', event => { config[key] = Number(event.target.value); sync(); });
    }
    $('reset').addEventListener('click', () => {
        Object.assign(config, defaults);
        sync();
    });
    document.querySelectorAll('[data-stage-theme]').forEach(item => {
        item.addEventListener('click', () => {
            stage.dataset.theme = item.dataset.stageTheme;
            button.dataset.appearance = item.dataset.stageTheme;
            document.querySelectorAll('[data-stage-theme]').forEach(other => {
                const active = other === item;
                other.classList.toggle('selected', active);
                other.setAttribute('aria-pressed', String(active));
            });
            if (codeVisible) delivery?.refresh();
        });
    });
    function setTab(code) {
        codeVisible = code;
        runtime.reset();
        stage.hidden = code;
        $('code-panel').hidden = !code;
        [$('preview-tab'), $('code-tab')].forEach((tab, index) => {
            const active = Boolean(index) === code;
            tab.classList.toggle('selected', active);
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
        });
        if (code) delivery?.refresh();
    }
    $('preview-tab').addEventListener('click', () => setTab(false));
    $('code-tab').addEventListener('click', () => setTab(true));
    document.querySelector('.tabs').addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const code = event.key === 'Home' ? false : event.key === 'End' ? true : !codeVisible;
        setTab(code);
        $(code ? 'code-tab' : 'preview-tab').focus();
    });
    if (!isCover) {
        delivery = LibraryDelivery.register({
            id: 'hold-button', title: 'Hold Button · 长按确认按钮',
            async bundle() {
                const snapshot = { ...config };
                const appearance = button.dataset.appearance;
                const clone = button.cloneNode(true);
                clone.removeAttribute('id');
                clone.classList.remove('is-done');
                clone.removeAttribute('style');
                clone.querySelector('.library-hold-fill').removeAttribute('style');
                clone.querySelector('.library-hold-label-fill').removeAttribute('style');
                clone.querySelector('.library-hold-announcement').textContent = '';
                clone.setAttribute('aria-label', '按住发布');
                const [css, effect] = await Promise.all([
                    LibraryDelivery.read(new URL('button.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href)
                ]);
                clone.dataset.appearance = appearance;
                const js = effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-hold-button").forEach(button => {\n   button.libraryComponent?.destroy();\n   button.libraryComponent = LibraryHoldButton.mount(button, config);\n });\n})();';
                return {
                    html: clone.outerHTML,
                    css,
                    js,
                    background: appearance === 'dark' ? '#171717' : '#f7f7f8'
                };
            },
            prompt() {
                return '制作 Hold Button · 长按确认按钮。实现为可重复使用的独立按钮组件，深浅主题由 data-appearance 控制。外形是宽 ' + config.width + ' px、高 ' + config.height + ' px 的圆角胶囊；中心包含上传图标及 Hold to publish 文案，按住后底层填充条从左至右线性增长，填充经过文字时文字颜色精准反转；提前松开时以弹簧动画回退并轻微摇晃，完成后胶囊收缩为直径 ' + config.height + ' px 的成功绿色圆形，SVG 勾选线条绘制出现。当前参数：确认时间 ' + config.holdMs + ' ms、完成态持续 ' + config.doneMs + ' ms、回弹阻尼 ' + config.rebound + '；当前主题 ' + stage.dataset.theme + '。使用原生 CSS 和 JavaScript，不依赖第三方动画库。必须支持鼠标、触屏、键盘 Enter/空格按住，防误触，pointercancel、失焦、离页复位，prefers-reduced-motion，以及多实例独立运行。提供 update()、reset()、destroy() 和 onComplete 回调。初始静止，不自动演示。';
            }
        });
    }
    sync();
})();
