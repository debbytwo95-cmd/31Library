(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { ...LibraryScrubber.defaults };
    const config = { ...defaults };
    const keys = Object.keys(defaults);
    const root = $('scrubber'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const pristineHTML = root.outerHTML;
    let codeVisible = false, delivery;
    const runtime = LibraryScrubber.mount(root, { ...config, onValueChange(value) {
        config.value = value; syncInputs();
    } });
    root.libraryComponent = runtime;
    function syncInputs() {
        // Quantization belongs to the component; native range must also represent an off-grid max.
        $('value').min = config.min; $('value').max = config.max; $('value').step = 'any';
        for (const key of keys) {
            const input = $(key);
            if (key !== 'label' || document.activeElement !== input) input.value = config[key];
            if (input.type === 'range') input.style.setProperty('--progress', (100 * (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) + '%');
            if ($(key + '-output')) $(key + '-output').textContent = key === 'value' ? config.value.toFixed(config.decimals) : config[key] + (key === 'width' ? ' px' : '');
        }
        if (codeVisible) delivery?.refresh();
    }
    $('label').addEventListener('blur', () => { $('label').value = config.label; });
    $('value').addEventListener('keydown', event => {
        const next = { ArrowRight: config.value + config.step, ArrowUp: config.value + config.step, ArrowLeft: config.value - config.step, ArrowDown: config.value - config.step, Home: config.min, End: config.max }[event.key];
        if (next !== undefined) { event.preventDefault(); runtime.setValue(next); }
    });
    function apply(next = config) {
        runtime.update(next); Object.assign(config, runtime.config); delete config.onValueChange;
        syncInputs();
    }
    function clearErrors() {
        for (const key of ['min', 'max', 'step']) { $(key).setCustomValidity(''); $(key).removeAttribute('aria-invalid'); }
        $('parameter-status').textContent = '';
    }
    for (const key of keys) $(key).addEventListener('input', () => {
        const candidate = { ...config, [key]: key === 'label' ? $(key).value : Number($(key).value) };
        clearErrors();
        if (['min', 'max', 'step'].includes(key)) {
            let message = '';
            if ($(key).value === '' || !$(key).validity.valid || !Number.isFinite(candidate[key])) message = '请输入有效数值（范围 -1000000 至 1000000，步长须大于 0）。';
            else if (candidate.min >= candidate.max) message = '最大值须大于最小值，预览暂时保留上一组有效参数。';
            else if (candidate.step <= 0) message = '步长须大于 0。';
            if (message) { $(key).setCustomValidity(message); $(key).setAttribute('aria-invalid', 'true'); $('parameter-status').textContent = message; return; }
        }
        apply(candidate);
    });
    $('reset').addEventListener('click', () => {
        clearErrors(); runtime.reset(); Object.assign(config, defaults); apply();
    });
    document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => {
        stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => {
            other.classList.toggle('selected', other === button); other.setAttribute('aria-pressed', String(other === button));
        });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code; runtime.settle(); stage.hidden = code; $('code-panel').hidden = !code;
        [$('preview-tab'), $('code-tab')].forEach((tab, index) => {
            const active = Boolean(index) === code;
            tab.classList.toggle('selected', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
        });
        if (code) delivery?.refresh();
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
        document.addEventListener('pointerleave', () => { runtime.reset(); root.blur(); Object.assign(config, defaults); syncInputs(); });
    } else {
        const prompt = () => '复刻 Scrubber · 数值拖动滑块。原生 HTML、CSS、JavaScript，无第三方运行库。配置：' + JSON.stringify(config) + '；width 单位 px，范围和 step 为数值单位，decimals 仅控制显示，ticks 为内部等距刻度数，0 隐藏。当前主题 ' + root.dataset.appearance + '。轨道高 36 px、圆角 8 px；前景填充透明度 .14，刻度 1 × 6 px、透明度 .25。手柄 4 × 22 px，静止缩放 .7、透明度 .135，真实悬停和拖动时用刚度 800 s⁻²、阻尼 42 s⁻¹ 的单位质量弹簧展开至 1、透明度 .72。拖动位置即时更新，其余位置变化 150 ms 缓动。Inter 字体与 OFL 许可内嵌在 HTML。支持鼠标、触笔、触屏、方向键、Home/End、ARIA slider 与实际数值，多实例独立。最小值和最大值均可到达；失焦、取消、后台清除拖拽，减少动态效果时立即更新。提供 LibraryScrubber.mount 与 value、config、setValue、update、settle、reset、destroy；update 不触发回调。只由真实操作触发，不加入自动演示；不包含工作台外壳。参考 https://smoothui.dev/docs/components/scrubber 。';
        delivery = LibraryDelivery.register({
            id: 'scrubber', title: 'Scrubber · 数值拖动滑块',
            async bundle() {
                // Snapshot before asynchronous resource reads, including the current user value.
                const snapshot = { ...config, value: runtime.value }, appearance = root.dataset.appearance;
                const template = document.createElement('template'); template.innerHTML = pristineHTML;
                const clone = template.content.firstElementChild;
                clone.removeAttribute('id'); clone.dataset.appearance = appearance;
                clone.setAttribute('aria-label', snapshot.label); clone.setAttribute('aria-valuemin', snapshot.min);
                clone.setAttribute('aria-valuemax', snapshot.max); clone.setAttribute('aria-valuenow', snapshot.value);
                clone.style.setProperty('--scrubber-width', snapshot.width + 'px');
                clone.style.setProperty('--scrubber-progress', (100 * (snapshot.value - snapshot.min) / (snapshot.max - snapshot.min)) + '%');
                clone.querySelector('.library-scrubber-label').textContent = snapshot.label;
                clone.querySelector('.library-scrubber-value').textContent = snapshot.value.toFixed(snapshot.decimals);
                const [css, effect, fontBytes, fontLicense] = await Promise.all([
                    LibraryDelivery.read(new URL('effect.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href),
                    LibraryDelivery.read(new URL('../../../../assets/fonts/inter-400.ttf', location.href).href, true),
                    LibraryDelivery.read(new URL('../../../../assets/fonts/INTER-OFL.txt', location.href).href)
                ]);
                let fontBinary = '';
                new Uint8Array(fontBytes).forEach(byte => { fontBinary += String.fromCharCode(byte); });
                const font = '/* Inter font license\n' + fontLicense.replace(/\*\//g, '* /') + '\n*/\n@font-face{font-family:LibraryScrubberInter;font-weight:400;font-display:swap;src:url(data:font/ttf;base64,' + btoa(fontBinary) + ") format('truetype')}";
                return {
                    html: clone.outerHTML,
                    css: font + '\n' + css.replace(/Inter, Arial/g, 'LibraryScrubberInter, Inter, Arial'),
                    js: effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-scrubber").forEach(root => {\n  root.libraryComponent?.destroy();\n  root.libraryComponent = LibraryScrubber.mount(root, config);\n });\n})();',
                    background: appearance === 'dark' ? '#171717' : '#fff'
                };
            },
            prompt
        });
    }
    syncInputs();
})();
