(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { prefix:'Built for', words:['designers','founders','makers','teams'], interval:2400, fontSize:44, stagger:28, stiffness:420, damping:26 };
    const config = { ...defaults, words:[...defaults.words] }, root = $('word-roll'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const runtime = root.libraryComponent = LibraryWordRoll.mount(root, { ...config, autoplay:!cover });
    let codeVisible = false, delivery;
    function sync() {
        runtime.update(config);
        for (const [key, unit] of [['interval','ms'], ['fontSize','px'], ['stagger','ms'], ['stiffness',''], ['damping','']]) {
            const input = $(key);input.value = config[key];
            input.style.setProperty('--progress', (100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min))) + '%');
            $(key + '-output').replaceChildren(document.createTextNode(config[key]), ...(unit ? [Object.assign(document.createElement('span'), { textContent:unit })] : []));
        }
        if (codeVisible) delivery?.refresh();
    }
    ['interval','fontSize','stagger','stiffness','damping'].forEach(key => $(key).addEventListener('input', event => {
        config[key] = Number(event.target.value);sync();
    }));
    $('prefix').addEventListener('input', event => { config.prefix = event.target.value;sync(); });
    $('words').addEventListener('input', event => {
        const words = event.target.value.split(/[,，\n]/).map(word => word.trim().slice(0,40)).filter(Boolean).slice(0,12);
        if (words.length) { config.words = words;sync(); }
    });
    $('words').addEventListener('blur', () => { $('words').value = config.words.join(', '); });
    $('reset').addEventListener('click', () => {
        Object.assign(config, defaults, { words:[...defaults.words] });
        $('prefix').value = config.prefix;$('words').value = config.words.join(', ');sync();
    });
    document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => {
        stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => {
            other.classList.toggle('selected', other === button);other.setAttribute('aria-pressed', String(other === button));
        });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code;runtime.pause();stage.hidden = code;$('code-panel').hidden = !code;
        [$('preview-tab'), $('code-tab')].forEach((tab, index) => {
            const active = Boolean(index) === code;
            tab.classList.toggle('selected', active);tab.setAttribute('aria-selected', String(active));tab.tabIndex = active ? 0 : -1;
        });
        if (code) delivery?.refresh();else { runtime.update(config);runtime.play(); }
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
        // Covers rotate while a real pointer is present and return to rest on exit.
        stage.addEventListener('pointerenter', event => {
            if (event.isTrusted && event.pointerType !== 'touch') { runtime.next();runtime.play(); }
        });
        const rest = () => { runtime.pause();runtime.reset(); };
        stage.addEventListener('pointerleave', rest);document.addEventListener('pointerleave', rest);
    } else {
        delivery = LibraryDelivery.register({
            id:'word-roll', title:'Word Roll · 单词滚动',
            async bundle() {
                const snapshot = { ...config, words:[...config.words] }, appearance = root.dataset.appearance;
                const clone = root.cloneNode(true);clone.removeAttribute('id');clone.removeAttribute('data-word');
                clone.querySelector('.library-word-roll-slot').replaceChildren();
                clone.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));
                clone.querySelector('.library-word-roll-slot').removeAttribute('data-moving');
                const [styles, effect, font] = await Promise.all([
                    LibraryDelivery.read(new URL('word-roll.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href),LibraryDelivery.fontCSS()
                ]);
                return {
                    html:clone.outerHTML,
                    css:font.replaceAll('LibraryButtonInter', 'LibraryWordRollInter') + '\n' + styles.replaceAll('Inter,', 'LibraryWordRollInter,Inter,'),
                    js:effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-word-roll").forEach(root => {\n  root.libraryComponent?.destroy();\n  root.libraryComponent = LibraryWordRoll.mount(root, config);\n });\n})();',
                    background:appearance === 'dark' ? '#171717' : '#f7f7f8'
                };
            },
            prompt() {
                return '制作 Word Roll · 单词滚动。居中单行文字，固定前缀 ' + JSON.stringify(config.prefix) + '，轮换词组 ' + JSON.stringify(config.words) + '。Inter Semibold，字号 ' + config.fontSize + ' px（窄容器按最长词组缩小），行高 1.25，字距 -0.035em，间隔 0.26em。主题 ' + root.dataset.appearance + '；浅色前缀 #6f6e68、主体 #17181a，深色前缀 #9a9a9a、主体 #fff。自动循环轮换，轮换间隔 ' + config.interval + ' ms，支持点击、轻触或 Enter／空格立即切换下一词组，手动切换后重新计算完整轮换间隔；旧字逐字向上退出，新字从下方 105% 进入，透明度随位移减弱，新字延迟 60ms，进入错峰 ' + config.stagger + ' ms，退出错峰为进入的 22/28。单位质量为 1，逐字弹簧刚度 ' + config.stiffness + ' s⁻²、阻尼 ' + config.damping + ' s⁻¹；宽度弹簧 320/30，整句随宽度保持居中。初态为第一个词，等待一个轮换间隔后切换下一词，停稳后停止动画帧，计时器等待下一次轮换。减少动态效果时按相同间隔直接切换；失焦、页面隐藏与离页时暂停，恢复前台后重新计时；暂停和销毁清理计时器。原生 HTML/CSS/JavaScript，无第三方运行库，内嵌仓库 Inter 字体及许可，中文采用系统回退。提供 LibraryWordRoll.mount、next/update/reset/play/pause/destroy，多实例独立运行，销毁时清理事件、观察器与动画。交付使用隔离类名，排除网站外框、参数面板与封面逻辑。';
            }
        });
    }
    sync();
})();
