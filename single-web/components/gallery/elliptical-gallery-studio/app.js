(() => {
    'use strict';
    const $=id=>document.getElementById(id),config={...LibraryEllipticalGallery.defaults};
    const root=$('elliptical-gallery'),stage=$('preview-panel'),cover=document.documentElement.hasAttribute('data-cover');
    const runtime=LibraryEllipticalGallery.mount(root,config);
    let codeVisible=false,delivery;
    const units={count:'块',speed:'°/s',spread:'%',ellipse:'%',size:'px',depth:'%',blur:'px'};
    function sync(){
        runtime.update(config);
        for(const [key,unit] of Object.entries(units)){
            const input=$(key);input.value=config[key];input.style.setProperty('--progress',(100*(config[key]-Number(input.min))/(Number(input.max)-Number(input.min)))+'%');
            $(key+'-output').replaceChildren(document.createTextNode(config[key]),Object.assign(document.createElement('span'),{textContent:unit}));
        }
        $('palette').value=config.palette;$('direction').value=String(config.direction);
        if(codeVisible)delivery?.refresh();
    }
    Object.keys(units).forEach(key=>$(key).addEventListener('input',event=>{config[key]=Number(event.target.value);sync();}));
    ['palette','direction'].forEach(key=>$(key).addEventListener('change',event=>{config[key]=key==='direction'?Number(event.target.value):event.target.value;sync();}));
    $('reset').addEventListener('click',()=>{Object.assign(config,LibraryEllipticalGallery.defaults);sync();runtime.reset();});
    $('play').addEventListener('click',()=>{if(!codeVisible)runtime.resume();});$('pause').addEventListener('click',()=>runtime.pause());
    document.querySelectorAll('[data-stage-theme]').forEach(button=>button.addEventListener('click',()=>{
        stage.dataset.theme=root.dataset.appearance=button.dataset.stageTheme;
        document.querySelectorAll('[data-stage-theme]').forEach(other=>{other.classList.toggle('selected',other===button);other.setAttribute('aria-pressed',String(other===button));});
        if(codeVisible)delivery?.refresh();
    }));
    function setTab(code){
        codeVisible=code;runtime.pause();stage.hidden=code;$('code-panel').hidden=!code;
        if(!code){runtime.update(config);runtime.resume();}
        [$('preview-tab'),$('code-tab')].forEach((tab,index)=>{const active=Boolean(index)===code;tab.classList.toggle('selected',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
        if(code)delivery?.refresh();
    }
    $('preview-tab').addEventListener('click',()=>setTab(false));$('code-tab').addEventListener('click',()=>setTab(true));
    document.querySelector('.tabs').addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();const code=event.key==='Home'?false:event.key==='End'?true:!codeVisible;setTab(code);$(code?'code-tab':'preview-tab').focus();
    });
    function prompt(snapshot={...config},appearance=root.dataset.appearance){
        return '制作 Elliptical Gallery · 椭圆环绕画廊，参考 Melius 首页图片轨道旋转。只用纯色块代替所有图片和视频，不加载外部媒体，不添加中央文案、标识、卡片标签或图标。'+snapshot.count+' 个朝向屏幕的圆角矩形，混合竖幅、方形和横幅，圆角 7px，无投影。颜色依次循环 '+JSON.stringify(LibraryEllipticalGallery.palettes[snapshot.palette])+'，主题 '+appearance+'。色块沿同一椭圆轨道环绕，默认自动旋转 '+snapshot.speed+' 度/秒，方向 '+(snapshot.direction<0?'逆时针':'顺时针')+'；水平展开 '+snapshot.spread+'%，椭圆比例 '+snapshot.ellipse+'%，色块桌面基准宽度 '+snapshot.size+' px，透视系数 '+snapshot.depth+'%，后景最大模糊 '+snapshot.blur+' px。x=sin(角度)*横向半径，y=cos(角度)*前景或后景半径，后景半径为前景的 85%；缩放 .72/(1-cos(角度)*透视系数)，前景大而清晰，后景缩小、降透明度、模糊和减饱和，层级随深度变化。小屏等比缩小并限制边界。悬停或键盘聚焦单块时，轨道减速停驻，当前块渐放大最多 30%，移出恢复旋转；真实鼠标或触屏水平拖拽改变相位，触屏纵向仍滚动页面。点击色块或空格切换暂停和继续，左右键步进，Home/Escape 复位并暂停；重置保留主题和页签。失焦、隐藏或滚出视口暂停，返回恢复，减少动态效果时停止自动转动和放大动画，保留手动操作。原生 HTML/CSS/JavaScript、requestAnimationFrame、ResizeObserver、IntersectionObserver，无第三方依赖和资源文件。LibraryEllipticalGallery.mount(root,config) 提供 update/reset/pause/resume/getConfig/destroy，多实例隔离，重复挂载清理旧实例，销毁清除动画、事件和观察器。封面、预览和交付共用实现。';
    }
    if(!cover)delivery=LibraryDelivery.register({
        id:'elliptical-gallery',title:'Elliptical Gallery · 椭圆环绕画廊',
        async bundle(){
            const snapshot={...config},appearance=root.dataset.appearance;
            const [styles,effect]=await Promise.all([LibraryDelivery.read(new URL('gallery.css',location.href).href),LibraryDelivery.read(new URL('effect.js',location.href).href)]);
            return {html:'<div class="library-elliptical-gallery" data-appearance="'+appearance+'"></div>',css:styles,
                js:effect+'\n(() => { const config = '+JSON.stringify(snapshot)+'; document.querySelectorAll(".library-elliptical-gallery").forEach(root => LibraryEllipticalGallery.mount(root,config)); })();',
                prompt:prompt(snapshot,appearance),background:appearance==='dark'?'#18181c':'#f7f7f8'};
        },prompt
    });
    sync();
})();
