(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { prefix:'Create any', words:['image','audio','video','campaign','movie'], suffix:'you imagine', fontSize:56, hold:1300, duration:650, pixel:12.5, autoplay:true };
    const config = { ...defaults, words:[...defaults.words] }, root = $('pixel-word-swap'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const runtime = root.libraryComponent = LibraryPixelWordSwap.mount(root, config);
    const { ranges, words, themes, tabs } = window.LibraryStudioControls;
    let delivery;
    const refresh = () => { if (view.code) delivery?.refresh(); };
    const renderRanges = ranges([['fontSize','px'], ['hold','ms'], ['duration','ms'], ['pixel','%']], config, () => sync());
    function sync() { runtime.update(config);renderRanges();$('autoplay').checked = config.autoplay;refresh(); }
    ['prefix','suffix'].forEach(key => $(key).addEventListener('input', event => { config[key] = event.target.value;sync(); }));
    words($('words'), config, () => sync());
    $('autoplay').addEventListener('change', event => { config.autoplay = event.target.checked;sync(); });
    $('reset').addEventListener('click', () => {
        Object.assign(config, defaults, { words:[...defaults.words] });
        ['prefix','suffix'].forEach(key => { $(key).value = config[key]; });
        $('words').value = config.words.join(', ');sync();
    });
    themes(stage, root, refresh);
    const view = tabs(stage, code => {
        runtime.pause();
        if (code) delivery?.refresh();
        else { runtime.refresh();if (config.autoplay) runtime.play(); }
    });
    if (cover) {
        // Covers rotate like the detail page; a real pointer entering the cover swaps at once.
        const fit = () => stage.style.setProperty('--cover-component-height', root.offsetHeight + 'px');
        new ResizeObserver(fit).observe(root);fit();
        stage.addEventListener('pointerenter', event => {
            if (event.isTrusted && event.pointerType !== 'touch') runtime.next();
        });
    } else {
        async function fontFace() {
            const [bytes, license] = await Promise.all([
                LibraryDelivery.read(new URL('../../../../assets/fonts/source-serif-4-latin-variable.woff2', location.href).href, true),
                LibraryDelivery.read(new URL('../../../../assets/fonts/SOURCE-SERIF-OFL.txt', location.href).href)
            ]);
            let binary = '';new Uint8Array(bytes).forEach(byte => { binary += String.fromCharCode(byte); });
            return { source:'data:font/woff2;base64,' + btoa(binary), license:'/* Source Serif 4 font license\n' + license.replace(/\*\//g, '* /') + '\n*/\n' };
        }
        delivery = LibraryDelivery.register({
            id:'pixel-word-swap', title:'Pixel Word Swap · 像素换词',
            async bundle() {
                const snapshot = { ...config, words:[...config.words] }, appearance = root.dataset.appearance;
                const clone = root.cloneNode(true);clone.removeAttribute('id');clone.removeAttribute('data-word');
                clone.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));clone.removeAttribute('style');
                const canvas = clone.querySelector('canvas');canvas.removeAttribute('width');canvas.removeAttribute('height');
                const [styles, effect, font] = await Promise.all([
                    LibraryDelivery.read(new URL('pixel-word-swap.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href), fontFace()
                ]);
                return {
                    html:clone.outerHTML,
                    css:font.license + styles.replace('../../../../assets/fonts/source-serif-4-latin-variable.woff2', font.source),
                    js:effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-pixel-word-swap").forEach(root => {\n  root.libraryComponent?.destroy();\n  root.libraryComponent = LibraryPixelWordSwap.mount(root, config);\n });\n})();',
                    background:appearance === 'dark' ? '#171717' : '#f7f7f8'
                };
            },
            prompt() {
                return '制作 Pixel Word Swap · 像素换词。居中标题句：前缀 ' + JSON.stringify(config.prefix) + '，轮换词组 ' + JSON.stringify(config.words) + '，后缀 ' + JSON.stringify(config.suffix) + '，词槽位于前缀与后缀之间。衬线字体 Source Serif 4（可变字重，自动光学尺寸）字重 450，字号 ' + config.fontSize + ' px，行高 1，字距 -0.015em，居中；主题 ' + root.dataset.appearance + '，浅色文字 #0e0e0e，深色文字 #f4f4f5，组件不带背景。整句绘制在 Canvas 2D 上，按 devicePixelRatio 缩放，画布四周外扩 0.3 倍字号；用一个隐藏的同字体文字层放入“前缀 + 最长词 + 后缀”撑开布局（最长词内的空格改为不换行空格），宽度不超过 960px，窄容器自动换行；单个词宽于容器时等比缩小字号。逐词排版：词槽按最长词宽度参与换行判断（超出可用宽 2% 才换行），绘制时使用当前词槽宽度，每行重新居中。初始显示第一个词。换词分为停留 ' + config.hold + ' ms 与切换 ' + config.duration + ' ms：切换进度 p 从 0 到 1，p<0.5 显示旧词、之后显示新词；像素块大小 = 1 + round((max-1)·sin(πp))，max = max(2, round(字号×' + config.pixel + '%))；词槽宽度按 easeInOutCubic 在新旧词宽之间插值，单词在词槽内居中，前后文字随之平移。像素化做法：只把词槽单词画在独立图层上，按块大小缩小采样（开启平滑）到临时画布，再关闭 imageSmoothing 放大回原尺寸，并裁剪到词槽矩形外扩 0.2 倍字号的范围；周围文字始终清晰。触发方式：' + (config.autoplay ? '默认自动轮换，打开后先停留再按停留与切换节奏持续循环；' : '关闭自动轮换，初始静止，只在悬停期间循环，移出后完成当前切换再停住；') + '鼠标或触控笔悬停标题时立即换词；点击、轻触或 Enter／空格立即换到下一个词，切换中连续操作最多排队一次，之后重新计算停留；触屏不模拟悬停。减少动态效果时直接换词，不显示马赛克。失焦、页面隐藏时暂停计时，返回后继续。只在切换期间运行 requestAnimationFrame，停留使用单个计时器；ResizeObserver 与字体加载完成后重新测量，文字颜色从 --pixel-word-swap-text 读取。按钮包含完整句子作为可访问名称，焦点环 2px。原生 HTML/CSS/JavaScript，无第三方运行库，内嵌 Source Serif 4 字体及 SIL OFL 许可，中文系统衬线回退。提供 LibraryPixelWordSwap.mount(root, config)（autoplay:false 关闭自动轮换），返回 next/play/pause/update/reset/refresh/destroy，多实例独立运行，销毁时清理事件、观察器、计时器与动画帧。交付使用隔离类名，排除网站外框、参数面板与封面逻辑。';
            }
        });
    }
    sync();
})();
