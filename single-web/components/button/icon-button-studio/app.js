/* Icon Button: circle expansion and an arrow pass, activated by user input. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const defaults={duration:500,arrowDelay:30,iconSize:42,arrowTravel:40,cornerRadius:32,easing:'smooth'};
 const presets={default:{duration:500,arrowDelay:30,easing:'smooth'},soft:{duration:800,arrowDelay:90,easing:'smooth'},snappy:{duration:280,arrowDelay:0,easing:'ease'}};
 const curves={smooth:'cubic-bezier(.22,1,.36,1)',ease:'cubic-bezier(.4,0,.2,1)',spring:'cubic-bezier(.34,1.35,.64,1)'};
 const units={duration:'ms',arrowDelay:'ms',iconSize:'px',arrowTravel:'px',cornerRadius:'px'};
 const config={...defaults};
 const button=$('icon-cta'),stage=$('preview-panel');
 let codeVisible=false,toastTimer;
 const runtime=LibraryButtons.mountIcon(button);
 const clearInteraction=()=>runtime.reset();
 let delivery;
 function notify(message){clearTimeout(toastTimer);$('toast').querySelector('span').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
 function apply(){
  const vars={'--icon-button-duration':config.duration+'ms','--icon-button-arrow-delay':config.arrowDelay+'ms','--icon-button-ease':curves[config.easing],'--icon-button-disc':config.iconSize+'px','--icon-button-corner':config.cornerRadius+'px','--icon-button-travel':config.arrowTravel+'px','--icon-button-icon-center':config.iconSize/2+7+'px'};
  for(const [key,value] of Object.entries(vars))button.style.setProperty(key,value);
  for(const [key,unit] of Object.entries(units)){
   const input=$(key);input.value=config[key];input.style.setProperty('--progress',100*(config[key]-Number(input.min))/(Number(input.max)-Number(input.min))+'%');
   $(key+'-output').replaceChildren(document.createTextNode(config[key]),Object.assign(document.createElement('span'),{textContent:unit}));
  }
  $('easing').value=config.easing;
  document.querySelectorAll('[data-preset]').forEach(b=>{const selected=Object.entries(presets[b.dataset.preset]).every(([k,v])=>config[k]===v);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  if(codeVisible)delivery?.refresh();
 }
 Object.keys(units).forEach(key=>$(key).addEventListener('input',e=>{config[key]=Number(e.target.value);apply();}));
 $('easing').addEventListener('change',e=>{config.easing=e.target.value;apply();});
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{Object.assign(config,presets[b.dataset.preset]);apply();}));
 $('reset').addEventListener('click',()=>{Object.assign(config,defaults);clearInteraction();apply();notify('已恢复默认参数');});
 function setStageTheme(theme){stage.dataset.theme=theme;button.dataset.appearance=theme;document.querySelectorAll('[data-stage-theme]').forEach(b=>{const selected=b.dataset.stageTheme===theme;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});if(codeVisible)delivery?.refresh();}
 document.querySelectorAll('[data-stage-theme]').forEach(b=>{const theme=b.dataset.stageTheme;b.setAttribute('aria-label',theme==='light'?'浅色演示区':'深色演示区');b.setAttribute('title',theme==='light'?'浅色':'深色');b.addEventListener('click',()=>setStageTheme(theme));});
 document.documentElement.dataset.theme='light';setStageTheme('light');
 function setTab(code){codeVisible=code;clearInteraction();stage.hidden=code;$('code-panel').hidden=!code;[$('preview-tab'),$('code-tab')].forEach((tab,i)=>{const selected=Boolean(i)===code;tab.classList.toggle('selected',selected);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});if(code)delivery?.refresh();}
 $('preview-tab').addEventListener('click',()=>setTab(false));$('code-tab').addEventListener('click',()=>setTab(true));
 document.querySelector('.tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const code=e.key==='Home'?false:e.key==='End'?true:!codeVisible;setTab(code);$(code?'code-tab':'preview-tab').focus();}});

 delivery=LibraryDelivery.register({
  id:'icon-button',title:'Icon Button',
  async bundle(){
   const snapshot={...config},theme=stage.dataset.theme;
   const clone=button.cloneNode(true);clone.removeAttribute('id');clone.className='library-icon-button';clone.classList.remove('is-active','is-pressed');
   clone.style.setProperty('--icon-button-duration',snapshot.duration+'ms');clone.style.setProperty('--icon-button-arrow-delay',snapshot.arrowDelay+'ms');
   const [css,font]=await Promise.all([LibraryDelivery.read(new URL('button.css',location.href).href),LibraryDelivery.fontCSS()]);
   return {html:clone.outerHTML,css:font+'\n'+css.replace(/Inter,Arial/g,'LibraryButtonInter,Arial'),
    js:'(() => {\nconst mount = '+LibraryButtons.mountIcon.toString()+';\ndocument.querySelectorAll(".library-icon-button").forEach(root=>{root.libraryComponent?.destroy();root.libraryComponent=mount(root);});\n})();',
    background:theme==='dark'?'#171717':'#f7f7f8'};
  },
  prompt(){
   return '实现 Icon Button · 扩散箭头按钮。原生 HTML / CSS / JavaScript；按钮高 64 px，文字 Inter Semibold 16 px，内联 SVG 箭头；白色圆盘从右侧扩散覆盖按钮，文字反色；第一支箭头右移，第二支从左侧进入。当前参数：时长 '+config.duration+' ms，箭头延迟 '+config.arrowDelay+' ms，圆盘直径 '+config.iconSize+' px，箭头位移 '+config.arrowTravel+' px，圆角 '+config.cornerRadius+' px，缓动 '+curves[config.easing]+'；演示主题 '+stage.dataset.theme+'。鼠标悬停、键盘可见聚焦展开，离开后收回；触屏真实按压展开、松手复位。Tab 聚焦，Enter/空格激活。取消、失焦、离页清除临时状态；prefers-reduced-motion 禁用位移过渡，保留状态切换。初始静止，只响应真实操作，不使用自动演示或虚拟光标。样式限定组件容器，多个实例独立，移除前调用 root.libraryComponent.destroy()；无第三方运行依赖，Inter 字体内嵌，图标内联。按目标技术栈接入，精确效果以组件代码为准。';
  }
 });
 apply();
})();
