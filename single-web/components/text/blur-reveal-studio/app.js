(() => {
    'use strict';
    const $ = id => document.getElementById(id), defaults = LibraryBlurReveal.defaults;
    const config = { ...defaults }, root = $('blur-reveal'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const runtime = root.libraryComponent = LibraryBlurReveal.mount(root, config);
    let codeVisible = false, delivery;
    function sync() {
        runtime.update(config);
        for (const [key, unit] of [['fontSize','px'],['duration','ms'],['stagger','ms'],['blur','px']]) {
            const input = $(key);input.value = config[key];
            input.style.setProperty('--progress', (100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min))) + '%');
            $(key + '-output').replaceChildren(document.createTextNode(config[key]), Object.assign(document.createElement('span'), { textContent:unit }));
        }
        if (codeVisible) { runtime.reset();delivery?.refresh(); }
    }
    ['fontSize','duration','stagger','blur'].forEach(key => $(key).addEventListener('input', event => {
        config[key] = Number(event.target.value);sync();
    }));
    $('text').addEventListener('input', event => {
        if (event.target.value.trim()) { config.text = event.target.value.trim().slice(0,160);sync(); }
    });
    $('text').addEventListener('blur', () => { $('text').value = config.text; });
    $('reset').addEventListener('click', () => { Object.assign(config, defaults);$('text').value = config.text;sync();runtime.reset(); });
    document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => {
        stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => {
            other.classList.toggle('selected', other === button);other.setAttribute('aria-pressed', String(other === button));
        });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code;runtime.reset();stage.hidden = code;$('code-panel').hidden = !code;
        if (!code) runtime.resume();
        [$('preview-tab'), $('code-tab')].forEach((tab, index) => {
            const active = Boolean(index) === code;
            tab.classList.toggle('selected', active);tab.setAttribute('aria-selected', String(active));tab.tabIndex = active ? 0 : -1;
        });
        if (code) delivery?.refresh();
    }
    $('preview-tab').addEventListener('click', () => setTab(false));
    $('code-tab').addEventListener('click', () => setTab(true));
    document.querySelector('.tabs').addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const code = event.key === 'Home' ? false : event.key === 'End' ? true : !codeVisible;
        setTab(code);$(code ? 'code-tab' : 'preview-tab').focus();
    });
    if (cover) {
        stage.addEventListener('pointerenter', event => { if (event.isTrusted && event.pointerType !== 'touch') runtime.play(); });
    } else {
        delivery = LibraryDelivery.register({
            id:'blur-reveal', title:'Blur Reveal · 模糊显现',
            async bundle() {
                const snapshot = { ...config }, appearance = root.dataset.appearance;
                const [styles, effect, font] = await Promise.all([
                    LibraryDelivery.read(new URL('blur-reveal.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href),LibraryDelivery.fontCSS()
                ]);
                return {
                    html:'<div class="library-blur-reveal" data-appearance="' + appearance + '"><button class="library-blur-reveal-trigger" type="button" aria-label="重新显现文字"></button></div>',
                    css:font.replaceAll('LibraryButtonInter','LibraryBlurRevealInter') + '\n' + styles.replaceAll('Inter,','LibraryBlurRevealInter,Inter,'),
                    js:effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-blur-reveal").forEach(root => {\n  root.libraryComponent = LibraryBlurReveal.mount(root, config);\n });\n})();',
                    background:appearance === 'dark' ? '#171717' : '#f7f7f8'
                };
            },
            prompt() {
                return '制作 Blur Reveal · 模糊显现组件。居中展示 ' + JSON.stringify(config.text) + '，Inter Semibold 字号 ' + config.fontSize + ' px，行高 1.4、字距 -0.025em；按字素分段，中文与组合字符保持完整，窄容器自然换行。主题 ' + root.dataset.appearance + '，浅色文字 #3f3f46，深色 #e4e4e7。初始清晰，停驻 1400ms 后自动播放，完成后再停驻 1400ms 循环；真实悬停进入、点击、轻触或 Enter／空格也可从左到右重新逐字显现：opacity 0 到 1，filter blur(' + config.blur + 'px) 到 blur(0px)，单字时长 ' + config.duration + ' ms，逐字间隔 ' + config.stagger + ' ms，缓动 cubic-bezier(.23,1,.32,1)。不加位移或缩放。移出或取消后恢复清晰，稍后继续自动播放；窗口失焦、页面隐藏或切换代码页签时暂停，恢复可见后继续。重置后恢复默认参数并暂停，操作文字或切回预览恢复循环。重复操作重新开始，不累积动画。参数调整后等待 1400ms 自动播放。尊重减少动态效果，直接显示清晰文字。原生 HTML/CSS/JavaScript 与 Web Animations API，无第三方运行库；内嵌 Inter 与许可，中文用系统字体。提供 LibraryBlurReveal.mount(root, config) 与 play/update/reset/resume/destroy；组件样式隔离，多实例独立，销毁清理事件及动画。交付独立组件，排除导航、参数面板与封面跳转。';
            }
        });
    }
    sync();
})();
