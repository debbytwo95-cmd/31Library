(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const defaults = { words:['Ideas','Sketches','Designs','Products'], fontSize:64, duration:1050, hold:1600, blur:8, threshold:140 };
    const config = { ...defaults, words:[...defaults.words] }, root = $('goo-morph'), stage = $('preview-panel');
    const cover = document.documentElement.hasAttribute('data-cover');
    const runtime = root.libraryComponent = LibraryGooMorph.mount(root, config);
    const { ranges, words, themes, tabs } = window.LibraryStudioControls;
    let delivery;
    const refresh = () => { if (view.code) delivery?.refresh(); };
    const renderRanges = ranges([['fontSize','px'], ['duration','ms'], ['hold','ms'], ['blur','px'], ['threshold','']], config, () => sync());
    function sync() { runtime.update(config); renderRanges(); refresh(); }
    words($('words'), config, () => sync());
    $('reset').addEventListener('click', () => {
        Object.assign(config, defaults, { words:[...defaults.words] });$('words').value = config.words.join(', ');sync();
    });
    themes(stage, root, refresh);
    const view = tabs(stage, code => { runtime.pause(); if (code) delivery?.refresh(); else if (!cover) runtime.play(); });
    if (!cover) {
        delivery = LibraryDelivery.register({
            id:'goo-morph', title:'Goo Morph · 液态文字变形',
            async bundle() {
                const snapshot = { ...config, words:[...config.words] }, appearance = root.dataset.appearance;
                const html = '<div class="library-goo-morph" data-appearance="' + appearance + '"><button class="library-goo-morph-trigger" type="button" aria-label="切换下一个词组"><span class="library-goo-morph-layers" aria-hidden="true"><span class="library-goo-morph-word"></span><span class="library-goo-morph-word"></span></span></button></div>';
                const [styles, effect, font] = await Promise.all([
                    LibraryDelivery.read(new URL('goo-morph.css', location.href).href),
                    LibraryDelivery.read(new URL('effect.js', location.href).href),LibraryDelivery.fontCSS()
                ]);
                return {
                    html,
                    css:font.replaceAll('LibraryButtonInter', 'LibraryGooMorphInter') + '\n' + styles.replaceAll('Inter,', 'LibraryGooMorphInter,Inter,'),
                    js:effect + '\n(() => {\n const config = ' + JSON.stringify(snapshot) + ';\n document.querySelectorAll(".library-goo-morph").forEach(root => {\n  root.libraryComponent?.destroy();\n  root.libraryComponent = LibraryGooMorph.mount(root, config);\n });\n})();',
                    background:appearance === 'dark' ? '#171717' : '#f7f7f8'
                };
            },
            prompt() {
                return '制作 Goo Morph · 液态文字变形。居中文字，词组 ' + JSON.stringify(config.words) + '；Inter Semibold，字号 ' + config.fontSize + ' px，行高 1.2，字距 -0.045em，窄容器按最长词缩小。主题 ' + root.dataset.appearance + '，浅色文字 #17181a，深色 #fff。自动循环轮换，无需点击或悬停；每个词停留 ' + config.hold + ' ms，再进行变形。点击、轻触、Enter／空格可立即切换下一词，变形中忽略追加操作，手动切换后重新等待完整停留时间。封面、详情和导出示例均默认自动循环，指针进入或移出不改变播放。变形时长 ' + config.duration + ' ms；进度采用 smoothstep，旧词和新词 fraction 相反，模糊为 min(' + config.blur + '/fraction-' + config.blur + ',100) px，透明度为 fraction^0.4；变形时对双层容器应用 SVG feColorMatrix，alpha=255*alpha-' + config.threshold + '，停止后移除阈值滤镜恢复清晰边缘。减少动态效果时直接切换，窗口失焦时保持自动播放，页面隐藏或切到代码页签时暂停，返回后重新等待完整停留时间；取消时结束临时动效，销毁清理计时器和动画帧。原生 HTML/CSS/JavaScript/SVG，无第三方运行库，交付内嵌 Inter 及许可，中文用系统回退。提供 LibraryGooMorph.mount 与 next/update/reset/finish/play/pause/destroy；滤镜 ID 每实例唯一，多实例独立，销毁清理事件、观察器和动画。仅交付隔离的效果实现，排除网站外框和封面跳转。参考 DesignBookmark Goo Morph 用户提供源码。';
            }
        });
    }
    sync();
})();
