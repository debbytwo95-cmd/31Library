(() => {
    'use strict';
    const $ = id => document.getElementById(id), config = { ...LibraryOrbitGallery.defaults };
    const root = $('orbit-gallery'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const files = ['work-01.jpg','work-02.webp','work-03.jpg','work-04.webp','work-05.webp','work-06.webp','work-07.jpg','work-08.webp','work-09.webp','work-10.jpg','work-11.jpg'];
    const names = ['Tengile MalaMala','Gionatan Nese','Erica Basile','Typography Study','Metal Study','Monogram Study','Engine Study','Mineral Study','Identity Study','Print Study','Red Study'];
    const items = files.map((file,index) => ({ src:'media/' + file, title:names[index], category:'Visual exploration' }));
    const runtime = root.libraryComponent = LibraryOrbitGallery.mount(root,config,items);
    let codeVisible = false, delivery;
    const units = { count:'张', spread:'%', size:'px', depth:'%', sensitivity:'%', duration:'ms' };
    function sync() {
        runtime.update(config);
        for (const [key,unit] of Object.entries(units)) {
            const input = $(key); input.value = config[key];
            input.style.setProperty('--progress', (100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min))) + '%');
            $(key + '-output').replaceChildren(document.createTextNode(config[key]), Object.assign(document.createElement('span'), { textContent:unit }));
        }
        if (codeVisible) delivery?.refresh();
    }
    Object.keys(units).forEach(key => $(key).addEventListener('input', event => { config[key] = Number(event.target.value); sync(); }));
    $('reset').addEventListener('click', () => { Object.assign(config,LibraryOrbitGallery.defaults); sync(); runtime.reset(); });
    document.querySelectorAll('[data-stage-theme]').forEach(button => button.addEventListener('click', () => {
        stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other => {
            other.classList.toggle('selected',other === button); other.setAttribute('aria-pressed',String(other === button));
        });
        if (codeVisible) delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible = code; runtime.close(); stage.hidden = code; $('code-panel').hidden = !code;
        [$('preview-tab'),$('code-tab')].forEach((tab,index) => {
            const active = Boolean(index) === code; tab.classList.toggle('selected',active); tab.setAttribute('aria-selected',String(active)); tab.tabIndex = active ? 0 : -1;
        });
        if (code) delivery?.refresh();
    }
    $('preview-tab').addEventListener('click', () => setTab(false)); $('code-tab').addEventListener('click', () => setTab(true));
    document.querySelector('.tabs').addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); const code = event.key === 'Home' ? false : event.key === 'End' ? true : !codeVisible;
        setTab(code); $(code ? 'code-tab' : 'preview-tab').focus();
    });
    function prompt(snapshot = { ...config }, appearance = root.dataset.appearance) {
        return '制作 Orbit Gallery · 环绕画廊。纯色 ' + appearance + ' 背景，竖幅作品图以黄金角分布到球面，图像始终朝前，按深度进行透视缩放和遮挡排序。当前参数：作品数量 ' + snapshot.count + ' 张（素材循环分配），空间展开 ' + snapshot.spread + '%，桌面基准作品宽度 ' + snapshot.size + ' px，透视纵深 ' + snapshot.depth + '%，指针灵敏度 ' + snapshot.sensitivity + '%，聚焦时长 ' + snapshot.duration + ' ms。小屏按可用空间等比缩小。鼠标位置驱动轻微球面视差，水平拖拽旋转，方向键旋转，Home 复位；画廊取得焦点后滚轮旋转，其余时候保留页面滚动。点击或 Enter/空格将作品放大居中，其他作品淡出至 5.5%；再次点击、空白、关闭按钮或 Escape 退出。悬停位移用指数缓动跟随，停止后收敛并终止动画帧；移出收回临时视差，保留主动旋转角度。触屏保留纵向滚动，取消/失焦清除拖拽。无自动旋转、闲置循环、虚拟光标、声音及自动播放视频。减少动态效果时关闭悬停视差与过渡。原生 HTML/CSS/JavaScript、ResizeObserver、Web Animations API，无第三方运行库。使用 LibraryOrbitGallery.mount(root,config,items)，提供 update/reset/close/getConfig/destroy，多实例隔离且重复挂载先销毁。图片与 Inter 字体内嵌，附字体许可，静态图片来源 Gionatan Nese，原作者保留权利，正式使用请替换为自己的素材。不要把导航、工作台和封面跳转放入组件代码。';
    }
    if (cover) {
        document.addEventListener('pointerleave', () => runtime.reset());
        window.addEventListener('blur', () => runtime.reset());
    } else {
        delivery = LibraryDelivery.register({
            id:'orbit-gallery', title:'Orbit Gallery · 环绕画廊',
            async bundle() {
                // Capture the parameters before reading asynchronous resources.
                const snapshot = { ...config }, appearance = root.dataset.appearance;
                const [styles,effect,font,embedded,sources] = await Promise.all([
                    LibraryDelivery.read(new URL('gallery.css',location.href).href),
                    LibraryDelivery.read(new URL('effect.js',location.href).href), LibraryDelivery.fontCSS(),
                    Promise.all(items.map(async item => {
                        const bytes = new Uint8Array(await LibraryDelivery.read(new URL(item.src,location.href).href,true));
                        let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); });
                        return { ...item, src:'data:image/' + (item.src.endsWith('.webp') ? 'webp' : 'jpeg') + ';base64,' + btoa(binary) };
                    })), LibraryDelivery.read(new URL('media/sources.json',location.href).href)
                ]);
                return {
                    html:'<div class="library-orbit-gallery" data-appearance="' + appearance + '"></div>',
                    css:font.replaceAll('LibraryButtonInter','LibraryOrbitInter') + '\n' + styles.replaceAll('Inter,','LibraryOrbitInter,Inter,'),
                    js:'/* Reference artwork: Gionatan Nese, rights retained by original creators. Replace images for production.\n' + sources.replace(/\*\//g,'* /') + '\n*/\n' + effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n const items = ' + JSON.stringify(embedded) + ';\n document.querySelectorAll(".library-orbit-gallery").forEach(root => {\n  root.libraryComponent = LibraryOrbitGallery.mount(root,config,items);\n });\n})();',
                    prompt:prompt(snapshot,appearance), background:appearance === 'dark' ? '#171717' : '#fff'
                };
            }, prompt
        });
    }
    sync();
})();
