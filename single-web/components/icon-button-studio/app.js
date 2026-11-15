/* Icon Button: circle expansion and an arrow pass, activated by user input. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const defaults={duration:500,arrowDelay:30,iconSize:48,arrowTravel:40,cornerRadius:32,easing:'smooth'};
 const presets={default:{duration:500,arrowDelay:30,easing:'smooth'},soft:{duration:800,arrowDelay:90,easing:'smooth'},snappy:{duration:280,arrowDelay:0,easing:'ease'}};
 const curves={smooth:'cubic-bezier(.22,1,.36,1)',ease:'cubic-bezier(.4,0,.2,1)',spring:'cubic-bezier(.34,1.35,.64,1)'};
 const units={duration:'ms',arrowDelay:'ms',iconSize:'px',arrowTravel:'px',cornerRadius:'px'};
 const config={...defaults};
 const button=$('icon-cta'),stage=$('preview-panel');
 let slow=false,codeVisible=false,buttonCSS='',toastTimer;
 // This same function is included in the independent HTML export.
 function wireButton(button){
  let hovering=false,focused=false;
  const update=()=>button.classList.toggle('is-active',hovering||focused);
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hovering=true;update();}});
  button.addEventListener('pointerleave',()=>{hovering=false;update();});
  button.addEventListener('focus',()=>{focused=button.matches(':focus-visible');update();});
  button.addEventListener('blur',()=>{focused=false;update();});
  button.addEventListener('pointerdown',()=>{hovering=true;update();});
  button.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){hovering=false;update();}});
  button.addEventListener('pointercancel',()=>{hovering=false;update();});
  window.addEventListener('blur',()=>{hovering=focused=false;update();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){hovering=focused=false;update();}});
  return ()=>{hovering=focused=false;update();};
 }
 const clearInteraction=wireButton(button);
 function notify(message){clearTimeout(toastTimer);$('toast').querySelector('span').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
 function apply(){
  const factor=slow?4:1;
  const vars={'--duration':config.duration*factor+'ms','--arrow-delay':config.arrowDelay*factor+'ms','--ease':curves[config.easing],'--disc':config.iconSize+'px','--corner':config.cornerRadius+'px','--travel':config.arrowTravel+'px','--icon-center':config.iconSize/2+8+'px'};
  for(const [key,value] of Object.entries(vars))button.style.setProperty(key,value);
  for(const [key,unit] of Object.entries(units)){
   const input=$(key);input.value=config[key];input.style.setProperty('--progress',100*(config[key]-Number(input.min))/(Number(input.max)-Number(input.min))+'%');
   $(key+'-output').replaceChildren(document.createTextNode(config[key]),Object.assign(document.createElement('span'),{textContent:unit}));
  }
  $('easing').value=config.easing;
  document.querySelectorAll('[data-preset]').forEach(b=>{const selected=Object.entries(presets[b.dataset.preset]).every(([k,v])=>config[k]===v);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  if(codeVisible)renderCode();
 }
 Object.keys(units).forEach(key=>$(key).addEventListener('input',e=>{config[key]=Number(e.target.value);apply();}));
 $('easing').addEventListener('change',e=>{config.easing=e.target.value;apply();});
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{Object.assign(config,presets[b.dataset.preset]);apply();}));
 $('reset').addEventListener('click',()=>{Object.assign(config,defaults);slow=false;clearInteraction();$('slow-control').setAttribute('aria-pressed','false');$('speed-label').textContent='1×';apply();notify('已恢复默认参数');});
 $('slow-control').addEventListener('click',()=>{slow=!slow;$('slow-control').setAttribute('aria-pressed',String(slow));$('speed-label').textContent=slow?'0.25×':'1×';apply();});
 function setStageTheme(theme){stage.dataset.theme=theme;button.dataset.appearance=theme;document.querySelectorAll('[data-stage-theme]').forEach(b=>{const selected=b.dataset.stageTheme===theme;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});if(codeVisible)renderCode();}
 document.querySelectorAll('[data-stage-theme]').forEach(b=>{const theme=b.dataset.stageTheme;b.setAttribute('aria-label',theme==='light'?'浅色演示区':'深色演示区');b.setAttribute('title',theme==='light'?'浅色':'深色');b.addEventListener('click',()=>setStageTheme(theme));});
 function setPageTheme(theme){document.documentElement.dataset.theme=theme;$('page-theme').innerHTML=`<svg><use href="#i-${theme==='dark'?'moon':'sun'}"/></svg>`;$('page-theme').setAttribute('aria-label',theme==='dark'?'切换为浅色页面':'切换为深色页面');try{localStorage.setItem('icon-button-page-theme',theme);}catch{}}
 setPageTheme('light');setStageTheme('light');
 $('page-theme').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';setPageTheme(theme);setStageTheme(theme);});
 function setTab(code){codeVisible=code;clearInteraction();stage.hidden=code;$('code-panel').hidden=!code;[$('preview-tab'),$('code-tab')].forEach((tab,i)=>{const selected=Boolean(i)===code;tab.classList.toggle('selected',selected);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});if(code)renderCode();}
 $('preview-tab').addEventListener('click',()=>setTab(false));$('code-tab').addEventListener('click',()=>setTab(true));
 document.querySelector('.tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const code=e.key==='Home'?false:e.key==='End'?true:!codeVisible;setTab(code);$(code?'code-tab':'preview-tab').focus();}});
 async function loadCSS(){
  if(buttonCSS)return buttonCSS;
  const response=await fetch('button.css');if(!response.ok)throw new Error('CSS unavailable');buttonCSS=await response.text();return buttonCSS;
 }
 function exportHTML(){
  const dark=stage.dataset.theme==='dark';
  const clone=button.cloneNode(true);clone.removeAttribute('id');clone.classList.remove('is-active');
  // Export the chosen timing, not the workbench slow-inspection multiplier.
  clone.style.setProperty('--duration',config.duration+'ms');clone.style.setProperty('--arrow-delay',config.arrowDelay+'ms');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Icon Button</title>\n<style>\n*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:${dark?'#171717':'#f7f7f8'};font-family:Inter,Arial,sans-serif}\n${buttonCSS}\n</style></head><body>\n${clone.outerHTML}\n<script>(${wireButton.toString()})(document.querySelector('.icon-cta'));<\/script>\n</body></html>`;
 }
 let codeVersion=0;
 async function renderCode(){const version=++codeVersion;try{await loadCSS();if(version===codeVersion)$('source-code').textContent=exportHTML();}catch{$('source-code').textContent='代码暂时无法载入，请通过本地预览地址打开页面后重试。';}}
 $('copy-code').addEventListener('click',async()=>{try{await loadCSS();const source=exportHTML();if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(source);else{const text=document.createElement('textarea');text.value=source;text.style.cssText='position:fixed;left:-9999px';document.body.append(text);text.select();const ok=document.execCommand('copy');text.remove();if(!ok)throw new Error('Clipboard unavailable');}notify('已复制完整 HTML，参数与主题已同步');}catch{setTab(true);notify('请在代码面板手动复制');}});
 $('download').addEventListener('click',async()=>{try{await loadCSS();const url=URL.createObjectURL(new Blob([exportHTML()],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='icon-button.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已下载独立 HTML');}catch{notify('下载暂时不可用，请刷新页面后重试');}});
 apply();
})();
