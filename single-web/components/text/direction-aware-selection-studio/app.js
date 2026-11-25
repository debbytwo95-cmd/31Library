(() => {
    'use strict';
    const $=id=>document.getElementById(id),defaults=LibraryDirectionSelection.defaults;
    const config={...defaults},root=$('direction-selection'),stage=$('preview-panel');
    const runtime=root.libraryComponent=LibraryDirectionSelection.mount(root,config);
    let codeVisible=false,delivery;
    const ranges=[['fontSize','px'],['duration','ms'],['bounce',''],['padding','px']];
    function sync() {
        runtime.update(config);$('text').value=config.text;$('color').value=config.color;$('showSize').checked=config.showSize;
        ['name','project','hint'].forEach(key=>{$(key).value=config[key];});
        ranges.forEach(([key,unit])=>{
            const input=$(key);input.value=config[key];
            input.style.setProperty('--progress',(100*(config[key]-Number(input.min))/(Number(input.max)-Number(input.min)))+'%');
            $(key+'-output').replaceChildren(document.createTextNode(config[key]),Object.assign(document.createElement('span'),{textContent:unit}));
        });
        if(codeVisible)delivery?.refresh();
    }
    ranges.forEach(([key])=>$(key).addEventListener('input',event=>{config[key]=Number(event.target.value);sync();}));
    $('text').addEventListener('input',event=>{if(event.target.value.trim()){config.text=event.target.value.trim().slice(0,120);runtime.update(config);if(codeVisible)delivery?.refresh();}});
    $('text').addEventListener('blur',()=>{$('text').value=config.text;});
    ['name','project','hint'].forEach(key=>$(key).addEventListener('input',event=>{config[key]=event.target.value.trim().slice(0,60);runtime.update(config);if(codeVisible)delivery?.refresh();}));
    $('color').addEventListener('input',event=>{config.color=event.target.value;sync();});
    $('showSize').addEventListener('change',event=>{config.showSize=event.target.checked;sync();});
    $('reset').addEventListener('click',()=>{Object.assign(config,defaults);sync();});
    document.querySelectorAll('[data-stage-theme]').forEach(button=>button.addEventListener('click',()=>{
        stage.dataset.theme=root.dataset.appearance=button.dataset.stageTheme;runtime.reset();
        document.querySelectorAll('[data-stage-theme]').forEach(other=>{other.classList.toggle('selected',other===button);other.setAttribute('aria-pressed',String(other===button));});
        if(codeVisible)delivery?.refresh();
    }));
    function setTab(code) {
        codeVisible=code;runtime.reset();stage.hidden=code;$('code-panel').hidden=!code;
        [$('preview-tab'),$('code-tab')].forEach((tab,index)=>{const active=Boolean(index)===code;tab.classList.toggle('selected',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
        if(code)delivery?.refresh();
    }
    $('preview-tab').addEventListener('click',()=>setTab(false));$('code-tab').addEventListener('click',()=>setTab(true));
    document.querySelector('.tabs').addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();const code=event.key==='Home'?false:event.key==='End'?true:!codeVisible;setTab(code);$(code?'code-tab':'preview-tab').focus();
    });
    if(!document.documentElement.hasAttribute('data-cover'))delivery=LibraryDelivery.register({
        id:'direction-aware-selection',title:'Direction Aware Selection · 方向感知选择',
        async bundle() {
            const snapshot={...config},appearance=root.dataset.appearance;
            const [styles,effect,font,handFont,handLicense,iconBytes]=await Promise.all([
                LibraryDelivery.read(new URL('selection.css',location.href).href),
                LibraryDelivery.read(new URL('effect.js',location.href).href),LibraryDelivery.fontCSS(true),
                LibraryDelivery.read(new URL('../../../../assets/fonts/caveat-variable.ttf',location.href).href,true),
                LibraryDelivery.read(new URL('../../../../assets/fonts/CAVEAT-OFL.txt',location.href).href),
                LibraryDelivery.read(new URL('../../../../assets/icons/site-logo.png',location.href).href,true)
            ]);
            let binary='';new Uint8Array(handFont).forEach(byte=>{binary+=String.fromCharCode(byte);});
            let iconBinary='';new Uint8Array(iconBytes).forEach(byte=>{iconBinary+=String.fromCharCode(byte);});
            const iconSource='data:image/png;base64,'+btoa(iconBinary);
            return {
                html:'<div class="library-direction-selection" data-appearance="'+appearance+'"></div>',
                css:font.split('\n/* Noto Sans SC license')[0].replaceAll('LibraryButtonInter','LibraryDirectionInter')+'\n/* Caveat font license\n'+handLicense.replace(/\*\//g,'* /')+'\n*/\n'+styles.replace('../../../../assets/fonts/caveat-variable.ttf','data:font/ttf;base64,'+btoa(binary)).replaceAll('Inter,','LibraryDirectionInter,Inter,'),
                js:effect.replace("const projectIcon = '../../../../assets/icons/site-logo.png';",'const projectIcon = '+JSON.stringify(iconSource)+';')+'\n(() => {\n const config = '+JSON.stringify(snapshot)+';\n document.querySelectorAll(".library-direction-selection").forEach(root => {\n  root.libraryComponent = LibraryDirectionSelection.mount(root, config);\n });\n})();',
                background:appearance==='dark'?'#171717':'#f7f7f8'
            };
        },
        prompt() {
            const layout='正文在独立单词 for 后固定换行，窄屏仍允许其他位置自然换行。项目名称前添加与地址栏相同的黑底白色 31 网站图标，源文件 assets/icons/site-logo.png 与 assets/favicon.png 完全一致；图标尺寸 1.1em，与文字间隔 0.3em，图标和项目名共同参与选择。复制代码和下载 HTML 内嵌该 PNG，不依赖仓库路径。';
            return layout+'实现 Direction Aware Selection · 方向感知选择。完整正文 '+JSON.stringify(config.text)+'，正文灰色，姓名 '+JSON.stringify(config.name)+' 与项目 '+JSON.stringify(config.project)+' 使用深色原生按钮，保留标点和空格。未匹配姓名或项目时按词提供交互。最大宽 680px、段落居中对齐，在容器中居中并自然换行。Inter Regular '+config.fontSize+' px，行高 1.7，字距 -0.045em；主题 '+root.dataset.appearance+'。姓名上方有 Caveat Semibold 手写 '+JSON.stringify(config.hint)+' 和指向姓名的弯曲手绘箭头标注，底部位于姓名高度 78%，左侧 58%，文字旋转 -8 度；交互时淡出，复位显示。真实悬停时出现 '+config.color+' 的 2px 透明选框、四角 8px 手柄，不添加文字背景、不填色、不反白。首次进入选框从向内 4px 开始弹性舒展，目标间弹簧移动与缩放：基准刚度 320，按 (320/时长)^2 缩放，阻尼 2*sqrt(刚度)*(1-回弹)。响应时长 '+config.duration+' ms，回弹 '+config.bounce+'，水平外扩 '+config.padding+' px，垂直 6px。'+(config.showSize?'下方蓝色 11px 标签显示文字实测宽 × 高（px）。':'隐藏尺寸标签。')+'移出、Escape、失焦、隐藏、取消、切换代码页签或重置时清理选框，恢复手写提示。键盘 Tab、Enter/空格、左右键及 Home/End 和触屏轻触可操作，触屏不模拟方向悬停。参数调整不自动演示，无虚拟光标或闲置循环，减少动态效果时直接切换。手绘箭头属于文字标注内容插图，四角手柄属于选框主体。原生 HTML/CSS/JavaScript 与 ResizeObserver，无第三方运行库；内嵌 Inter、Caveat 字体及各自许可，中文系统字体回退。LibraryDirectionSelection.mount(root, config) 提供 update/reset/destroy，多实例独立、重复挂载清理旧实例、销毁清理事件和动画。交付排除导航、工作台和封面跳转。';
        }
    });
    sync();
    if(document.documentElement.hasAttribute('data-cover'))new ResizeObserver(()=>{stage.style.setProperty('--cover-component-height',root.offsetHeight+'px');}).observe(root);
})();
