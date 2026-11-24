(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { ...LibraryWeightWave.defaults }, config = { ...defaults };
    const root = $('weight-wave'), stage = $('preview-panel'), cover = document.documentElement.hasAttribute('data-cover');
    const runtime = root.libraryComponent = LibraryWeightWave.mount(root, config);
    let codeVisible = false, delivery;
    const ranges = ['fontSize','light','bold','spread','opacity','stiffness','damping'];
    function sync() {
        runtime.update(config);
        for (const key of ranges) {
            const percent = key === 'spread' || key === 'opacity';
            const input = $(key), value = percent ? Math.round(config[key]*100) : config[key];
            input.value = value;
            input.style.setProperty('--progress', (100*(value-Number(input.min))/(Number(input.max)-Number(input.min)))+'%');
            const unit = percent ? '%' : key === 'fontSize' ? 'px' : '';
            $(key+'-output').replaceChildren(document.createTextNode(value), ...(unit ? [Object.assign(document.createElement('span'),{ textContent:unit })] : []));
        }
        if (codeVisible) delivery?.refresh();
    }
    ranges.forEach(key => $(key).addEventListener('input',event => {
        config[key] = Number(event.target.value) / (key === 'spread' || key === 'opacity' ? 100 : 1);
        if (key === 'light') config.bold = Math.max(config.bold,config.light);
        if (key === 'bold') config.light = Math.min(config.light,config.bold);
        sync();
    }));
    $('text').addEventListener('input',event => { config.text = event.target.value || defaults.text;sync(); });
    $('text').addEventListener('blur',() => { $('text').value = config.text; });
    $('reset').addEventListener('click',() => { Object.assign(config,defaults);$('text').value = config.text;sync();runtime.reset(); });
    document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click',() => {
        stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => {
            other.classList.toggle('selected',other === button);other.setAttribute('aria-pressed',String(other === button));
        });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code;runtime.pause();stage.hidden = code;$('code-panel').hidden = !code;
        [$('preview-tab'),$('code-tab')].forEach((tab,index) => {
            const active = Boolean(index) === code;
            tab.classList.toggle('selected',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex = active ? 0 : -1;
        });
        if (code) delivery?.refresh();else runtime.play();
    }
    $('preview-tab').addEventListener('click',() => setTab(false));
    $('code-tab').addEventListener('click',() => setTab(true));
    document.querySelector('.tabs').addEventListener('keydown',event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();const code = event.key === 'Home' ? false : event.key === 'End' ? true : !codeVisible;
        setTab(code);$(code ? 'code-tab' : 'preview-tab').focus();
    });
    sync();
    if (cover) {
        const line = root.querySelector('.library-weight-wave-line');
        line.setAttribute('role','link');line.setAttribute('aria-label','打开 Weight Wave 工作台');
        const open = () => parent.postMessage({ type:'library:cover-open' },location.origin);
        line.addEventListener('click',open);
        line.addEventListener('keydown',event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault();open(); } });
    } else {
        delivery = LibraryDelivery.register({
            id:'weight-wave', title:'Weight Wave · 字重波浪',
            async bundle() {
                const snapshot = { ...config }, appearance = root.dataset.appearance;
                const [styles,effect,font,license] = await Promise.all([
                    LibraryDelivery.read(new URL('weight-wave.css',location.href).href),
                    LibraryDelivery.read(new URL('effect.js',location.href).href),
                    LibraryDelivery.read(new URL('../../../../assets/fonts/inter-variable.woff2',location.href).href,true),
                    LibraryDelivery.read(new URL('../../../../assets/fonts/INTER-OFL.txt',location.href).href)
                ]);
                let binary = '';new Uint8Array(font).forEach(byte => { binary += String.fromCharCode(byte); });
                return {
                    html:'<div class="library-weight-wave" data-appearance="'+appearance+'"><p class="library-weight-wave-line" role="img" tabindex="0"></p></div>',
                    css:'/* Inter Variable · SIL OFL 1.1\n'+license.replace(/\*\//g,'* /')+'\n*/\n'+styles.replace('../../../../assets/fonts/inter-variable.woff2','data:font/woff2;base64,'+btoa(binary)),
                    js:effect+'\n(() => {\n const config = '+JSON.stringify(snapshot)+';\n document.querySelectorAll(".library-weight-wave").forEach(root => {\n  root.libraryComponent?.destroy();\n  root.libraryComponent = LibraryWeightWave.mount(root, config);\n });\n})();',
                    background:appearance === 'dark' ? '#171717' : '#f7f7f8'
                };
            },
            prompt() {
                return '复刻 Weight Wave · 字重波浪：居中单行文字 '+JSON.stringify(config.text)+'，Inter Variable 完整 100–900 字重轴，字号 '+config.fontSize+' px，行高 1.2，字距 -0.03em；窄屏按峰值字宽缩小。主题 '+root.dataset.appearance+'（浅色 #17181a，深色 #fff）。基础字重 '+config.light+'，峰值字重 '+config.bold+'，高斯波峰宽度为整行宽度的 '+Math.round(config.spread*100)+'%，静止不透明度 '+Math.round(config.opacity*100)+'%，随字重增加至 100%。指针水平位置用单位质量弹簧 150 s⁻² / 22 s⁻¹ 跟随，字母弹簧刚度 '+config.stiffness+' s⁻²、阻尼 '+config.damping+' s⁻¹。没有鼠标经过时自动左右扫动，余弦周期 4600 ms，波峰范围为整行 -6% 至 106%；真实鼠标移动、触屏按住移动或文字聚焦后的方向键 / Home / End 优先接管波峰，离开、松手、取消或 Escape 后平滑恢复自动播放，不使用虚拟光标。失焦、页面隐藏和代码页签暂停，返回后恢复；重置暂停并清除临时状态，保留主题与页签。减少动态效果时关闭闲置扫动，操作直接反馈。原生 HTML/CSS/JavaScript，无第三方运行库，内嵌相同 Inter 可变字体与 SIL OFL 许可；中文系统字体回退。提供 LibraryWeightWave.mount(root, config) 及 update/reset/play/pause/destroy，多实例独立，销毁清理事件、观察器和动画。隔离类名，不包含站点导航、参数区和封面跳转。参考 DesignBookmark https://designbookmark.com/motion#db-weight-wave。';
            }
        });
    }
})();
