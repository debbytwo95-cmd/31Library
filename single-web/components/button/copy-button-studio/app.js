(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { command: 'npm i motion-kit', doneMs: 1800, stiffness: 260, damping: 20 };
    const controls = ['doneMs', 'stiffness', 'damping'];
    const config = { ...defaults }, root = $('copy-command'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const runtime = root.libraryComponent = LibraryCopyButton.mount(root, config);
    let codeVisible = false, delivery;
    function sync() {
        runtime.update(config);
        for (const [key, unit] of [['doneMs', 'ms'], ['stiffness', ''], ['damping', '']]) {
            const input = $(key); input.value = config[key];
            input.style.setProperty('--progress', (100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min))) + '%');
            $(key + '-output').replaceChildren(document.createTextNode(config[key]), ...(unit ? [Object.assign(document.createElement('span'), { textContent: unit })] : []));
        }
        if (codeVisible) delivery?.refresh();
    }
    controls.forEach(key => $(key).addEventListener('input', event => {
        config[key] = Number(event.target.value); sync();
    }));
    $('reset').addEventListener('click', () => { Object.assign(config, defaults); sync(); });
    document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => {
        stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => {
            other.classList.toggle('selected', other === button); other.setAttribute('aria-pressed', String(other === button));
        });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code; runtime.reset();
        stage.hidden = code; $('code-panel').hidden = !code;
        [$('preview-tab'), $('code-tab')].forEach((tab, index) => {
            const active = Boolean(index) === code;
            tab.classList.toggle('selected', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
        });
        if (code) delivery?.refresh();
        else runtime.update(config);
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
        // Cover clicks navigate via site-shell; hovering never writes to the clipboard.
        document.addEventListener('pointerleave', () => runtime.reset());
    } else {
        delivery = LibraryDelivery.register({
            id: 'copy-button', title: 'Copy Button · 复制按钮',
            async bundle() {
                const snapshot = { ...config }, appearance = root.dataset.appearance;
                const clone = root.cloneNode(true);
                clone.removeAttribute('id'); clone.removeAttribute('data-state');
                clone.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));
                const button = clone.querySelector('.library-copy-button');
                button.removeAttribute('aria-busy'); button.setAttribute('aria-label', '复制内容');
                clone.querySelector('.library-copy-status').textContent = '';
                const [styles, effect, font, copy, check] = await Promise.all([
                    LibraryDelivery.read(new URL('button.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href),
                    LibraryDelivery.fontCSS(),
                    LibraryDelivery.read(new URL('../../../../assets/icons/copy.svg', location.href).href),
                    LibraryDelivery.read(new URL('../../../../assets/icons/check.svg', location.href).href)
                ]);
                const css = styles.replaceAll('../../../../assets/icons/copy.svg', 'data:image/svg+xml;base64,' + btoa(copy))
                    .replaceAll('../../../../assets/icons/check.svg', 'data:image/svg+xml;base64,' + btoa(check))
                    .replaceAll('Inter,', 'LibraryCopyInter,Inter,');
                return {
                    html: clone.outerHTML,
                    css: font.replaceAll('LibraryButtonInter', 'LibraryCopyInter') + '\n' + css,
                    js: effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-copy-command").forEach(root => {\n  root.libraryComponent?.destroy();\n  root.libraryComponent = LibraryCopyButton.mount(root, config);\n });\n})();',
                    background: appearance === 'dark' ? '#171717' : '#f7f7f8'
                };
            },
            prompt() {
                return '制作 Copy Button · 复制按钮。只展示居中的独立按钮，高 36px、圆角 12px、内边距 0 12px 0 10px，图标与文字间隔 6px，Inter Semibold 13px；不展示命令行或前缀。复制内容为 ' + JSON.stringify(config.command) + '（示例固定内容，接入时可通过 config.command 修改，不在演示主体展示）。主题 ' + root.dataset.appearance + '。真实复制成功后 Copy 向上滚动 18px 变为绿色 Copied，复制图标缩小并旋转 -40 度淡出，勾选缩放弹入，文字宽度以弹簧展开。完成态停留 ' + config.doneMs + ' ms。单位质量为 1，文字弹簧刚度 ' + config.stiffness + ' s⁻²、阻尼 ' + config.damping + ' s⁻¹；图标为 420/18，文字宽度为 300/24。只使用仓库 assets/icons/copy.svg 和 check.svg，保持源文件不变；交付内嵌同一资源及 Inter 字体并保留许可。原生 HTML/CSS/JavaScript，无第三方运行库；支持鼠标、触屏、Enter/空格、多实例、失败提示、减少动态效果、update/reset/destroy，失焦及离页清理。复制内容仅保存在配置中；仅真实点击可写剪贴板，成功后才展示确认，失败显示明确提示。初始静止，不自动演示，停稳后停止动画帧。导出排除网站外框及封面跳转。';
            }
        });
    }
    sync();
})();
