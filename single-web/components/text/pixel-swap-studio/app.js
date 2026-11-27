(() => {
    'use strict';
    const $=id=>document.getElementById(id),defaults=LibraryPixelSwap.defaults;
    const config={...defaults,words:[...defaults.words]},root=$('pixel-swap'),stage=$('preview-panel');
    const cover=document.documentElement.hasAttribute('data-cover');
    const runtime=LibraryPixelSwap.mount(root,config,cover?stage:root);
    let codeVisible=false,delivery;
    const ranges=[['fontSize','px'],['duration','ms'],['blockSize','px']];
    function sync(){
        runtime.update(config);
        ranges.forEach(([key,unit])=>{const input=$(key);input.value=config[key];input.style.setProperty('--progress',(100*(config[key]-Number(input.min))/(Number(input.max)-Number(input.min)))+'%');$(key+'-output').replaceChildren(document.createTextNode(config[key]),Object.assign(document.createElement('span'),{textContent:unit}));});
        if(codeVisible)delivery?.refresh();
    }
    ranges.forEach(([key])=>$(key).addEventListener('input',event=>{config[key]=Number(event.target.value);sync();}));
    ['prefix','suffix','words'].forEach(key=>{
        $(key).addEventListener('input',event=>{
            if(key==='words'){const words=event.target.value.split(/[\n,，]/).map(word=>word.trim()).filter(Boolean).slice(0,12);if(!words.length)return;config.words=LibraryPixelSwap.normalize({words}).words;}
            else config[key]=event.target.value.replace(/\s+/g,' ').trim().slice(0,100);
            sync();
        });
        $(key).addEventListener('blur',()=>{$(key).value=key==='words'?config.words.join(', '):config[key];});
    });
    $('reset').addEventListener('click',()=>{Object.assign(config,{...defaults,words:[...defaults.words]});['prefix','suffix','words'].forEach(key=>{$(key).value=key==='words'?config.words.join(', '):config[key];});sync();runtime.reset();});
    document.querySelectorAll('[data-stage-theme]').forEach(button=>button.addEventListener('click',()=>{
        stage.dataset.theme=root.dataset.appearance=button.dataset.stageTheme;runtime.update(config);
        document.querySelectorAll('[data-stage-theme]').forEach(other=>{other.classList.toggle('selected',other===button);other.setAttribute('aria-pressed',String(other===button));});
        if(codeVisible)delivery?.refresh();
    }));
    function setTab(code){codeVisible=code;runtime.pause();stage.hidden=code;$('code-panel').hidden=!code;if(!code){runtime.update(config);runtime.resume();}[$('preview-tab'),$('code-tab')].forEach((tab,index)=>{const active=Boolean(index)===code;tab.classList.toggle('selected',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});if(code)delivery?.refresh();}
    $('preview-tab').addEventListener('click',()=>setTab(false));$('code-tab').addEventListener('click',()=>setTab(true));
    document.querySelector('.tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const code=event.key==='Home'?false:event.key==='End'?true:!codeVisible;setTab(code);$(code?'code-tab':'preview-tab').focus();});
    function prompt(snapshot=config,appearance=root.dataset.appearance){
        return '实现 Pixel Swap · 像素换词。居中句子由前缀 '+JSON.stringify(snapshot.prefix)+'、轮换词 '+JSON.stringify(snapshot.words)+'、后缀 '+JSON.stringify(snapshot.suffix)+' 组成。Inter Regular / Noto Sans SC，字号 '+snapshot.fontSize+' px、行高 1.16、字距 -0.045em。主题 '+appearance+'。仅中间词在 Canvas 2D 中下采样再关闭平滑放大，像素块从 1 px 按正弦增长到 '+snapshot.blockSize+' px，再回到 1 px；中点切换词，时长 '+snapshot.duration+' ms。词槽宽度以 easeInOutCubic 插值，两侧文字始终清晰并随词槽居中重排。按最长词预留换行位置，窄屏自然换行，超长单词缩小至容器宽。默认自动轮播，每次清晰停驻 1300 ms 后切换下一词，鼠标无需经过。真实指针进入、点击、轻触或 Enter/空格可立即切换；移出或取消恢复首词，停驻后继续轮播。Escape 或重置恢复首词并暂停，真实操作或切回预览可恢复。失焦、隐藏或代码页签暂停，返回后继续。调参后先清晰停驻 1300 ms，不立即演示。无虚拟光标。减少动态效果时停止自动轮播，手动操作直接换词。原生 HTML/CSS/JavaScript、Canvas 2D、ResizeObserver，无第三方运行库。字体及 OFL 许可随示例提供。LibraryPixelSwap.mount(root,config) 返回 next/update/reset/pause/resume/destroy，多实例独立，重复挂载清理旧实例，destroy 清除事件、观察器和动画。仅交付组件结构、隔离样式与初始化逻辑。';
    }
    const readme='Pixel Swap · 像素换词\n\n解压后直接打开 index.html。无第三方运行依赖，无需构建。字体和 OFL 许可随包提供，请保留 assets 目录。\n\n将 component.html 中的 HTML、CSS、JavaScript 按顺序接入页面。复制多个完整容器即可创建多个独立实例。调用 LibraryPixelSwap.mount(root,config)，返回 next/update/reset/pause/resume/destroy；删除节点前调用 destroy。挂载会清理旧实例。默认自动轮播，每次停驻 1300ms 后切换；悬停、点击、轻触、Enter/空格可立即切换。移出或取消复位后继续轮播；Escape 或 reset 暂停，真实操作或 resume 恢复。失焦或隐藏时暂停，返回后继续。减少动态效果时停止自动轮播，手动直接换词。\n\n参考 https://www.melius.com/?ref=minimal.gallery 的标题像素换词；仅复刻文字，字体使用 31Library 规范。';
    if(!cover)delivery=LibraryDelivery.register({
        id:'pixel-swap',title:'Pixel Swap · 像素换词',archive:true,readme,
        async bundle(download=false){
            // Snapshot everything before the first asynchronous resource read.
            const snapshot={...config,words:[...config.words]},appearance=root.dataset.appearance;
            const needsCJK=/[^\u0000-\u007f]/.test([snapshot.prefix,...snapshot.words,snapshot.suffix].join(''));
            const [styles,effect,font,cjk,license]=await Promise.all([
                LibraryDelivery.read(new URL('pixel-swap.css',location.href).href),LibraryDelivery.read(new URL('effect.js',location.href).href),LibraryDelivery.fontCSS(true),
                download||needsCJK?LibraryDelivery.read(new URL('../../../../assets/fonts/noto-sans-sc-variable.ttf',location.href).href,true):null,
                download||needsCJK?LibraryDelivery.read(new URL('../../../../assets/fonts/OFL.txt',location.href).href):null
            ]);
            let fontStyles=font.split('\n/* Noto Sans SC license')[0].replaceAll('LibraryButtonInter','LibraryPixelSwapInter');
            const files={};
            if(cjk){
                let src='./assets/noto-sans-sc-variable.ttf';
                if(download){files['assets/noto-sans-sc-variable.ttf']=cjk;files['assets/NOTO-OFL.txt']=license;}
                else{let binary='';new Uint8Array(cjk).forEach(byte=>{binary+=String.fromCharCode(byte);});src='data:font/ttf;base64,'+btoa(binary);}
                fontStyles+='\n/* Noto Sans SC OFL\n'+license.replace(/\*\//g,'* /')+'\n*/\n@font-face{font-family:LibraryPixelSwapSC;font-weight:400 700;font-display:swap;src:url('+src+') format("truetype")}';
            }
            return {html:'<div class="library-pixel-swap" data-appearance="'+appearance+'"></div>',css:fontStyles+'\n'+styles.replace('Inter,"Noto Sans SC"','LibraryPixelSwapInter,LibraryPixelSwapSC,Inter,"Noto Sans SC"'),
                js:effect+'\n(() => { const config = '+JSON.stringify(snapshot)+'; document.querySelectorAll(".library-pixel-swap").forEach(root => LibraryPixelSwap.mount(root,config)); })();',
                background:appearance==='dark'?'#18181c':'#f7f7f8',files,prompt:prompt(snapshot,appearance)};
        },prompt
    });
    sync();
    if(cover)new ResizeObserver(()=>stage.style.setProperty('--cover-component-height',root.offsetHeight+'px')).observe(root);
})();
