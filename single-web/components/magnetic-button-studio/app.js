/* Magnetic Button interaction, adapted from the supplied DesignBookmark study. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const defaults = { radius: 130, strength: 32, stiffness: 170, damping: 13 };
  const presets = { default: defaults, soft: { radius: 170, strength: 38, stiffness: 100, damping: 10 }, snappy: { radius: 110, strength: 25, stiffness: 340, damping: 25 } };
  const config = { ...defaults, showRadius: false, slow: false };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const field = $('field'), mag = $('mag'), label = $('mag-label');
  const S = (x, k, c) => ({ x, v: 0, t: x, k, c });
  const springs = [S(0,170,13), S(0,170,13), S(0,220,15), S(0,220,15), S(1,400,18)];
  const [bx, by, lx, ly, scale] = springs;
  const step = (s, dt) => { const c = reduce ? Math.max(s.c, 2*Math.sqrt(s.k)) : s.c; s.v += (-s.k*(s.x-s.t)-c*s.v)*dt; s.x += s.v*dt; };
  let pointer = null, lastTime = performance.now(), pressed = false;
  let inView = true, pageVisible = !document.hidden, codeVisible = false;
  let fieldWidth = field.clientWidth, fieldHeight = field.clientHeight;
  const observer = new ResizeObserver(() => { fieldWidth = field.clientWidth; fieldHeight = field.clientHeight; });
  observer.observe(field);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(field);
  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; lastTime = performance.now(); });
  field.addEventListener('pointermove', e => { const rect = field.getBoundingClientRect(); pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top }; });
  field.addEventListener('pointerleave', () => { pointer = null; pressed = false; });
  mag.addEventListener('pointerdown', e => { pressed = true; mag.setPointerCapture(e.pointerId); });
  const release = () => { if (pressed) { scale.v = reduce ? 0 : 3; pressed = false; } };
  mag.addEventListener('pointerup', release);
  mag.addEventListener('pointercancel', release);
  mag.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => { pressed = false; pointer = null; });
  mag.addEventListener('click', () => {
    const ripple = $('click-ripple');
    ripple.classList.remove('pop');
    ripple.style.left = `calc(50% + ${bx.x}px)`;
    ripple.style.top = `calc(50% + ${by.x}px)`;
    void ripple.offsetWidth;
    ripple.classList.add('pop');
    scale.v = reduce ? 0 : 3;
    notify('点击已响应，再试试从不同方向靠近');
  });
  function animate(now) {
    const dt = Math.min((now-lastTime)/1000, 1/30) * (config.slow ? .25 : 1);
    lastTime = now;
    if (inView && pageVisible && !codeVisible) {
      const cx = fieldWidth/2, cy = fieldHeight/2;
      const active = pointer !== null;
      const gx = pointer?.x ?? cx, gy = pointer?.y ?? cy;
      const dx=gx-cx, dy=gy-cy, distance=Math.hypot(dx,dy);
      const pull = active && distance < config.radius ? 1-distance/config.radius*.35 : 0;
      const strength=config.strength/100;
      bx.t=dx*strength*pull; by.t=dy*strength*(.38/.32)*pull;
      lx.t=dx*strength*(.14/.32)*pull; ly.t=dy*strength*(.18/.32)*pull;
      scale.t=pressed ? .94 : 1+(reduce ? 0 : .06*pull);
      for(let i=0;i<4;i++) springs.forEach(s=>step(s,dt/4));
      mag.style.transform=`translate(${bx.x.toFixed(2)}px,${by.x.toFixed(2)}px) scale(${scale.x.toFixed(4)})`;
      label.style.transform=`translate(${lx.x.toFixed(2)}px,${ly.x.toFixed(2)}px)`;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  function updateControls() {
    for(const key of Object.keys(defaults)) {
      const input=$(key); input.value=config[key];
      input.style.setProperty('--progress',`${(config[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
      $(key+'-output').innerHTML=`${config[key]}${key==='radius'?'<span>px</span>':key==='strength'?'<span>%</span>':''}`;
    }
    bx.k=by.k=config.stiffness; bx.c=by.c=config.damping;
    lx.k=ly.k=config.stiffness*(220/170); lx.c=ly.c=config.damping*(15/13);
    $('attraction-ring').style.width=$('attraction-ring').style.height=config.radius*2+'px';
    $('radius-label').textContent=`r = ${config.radius}px`;
    document.querySelectorAll('[data-preset]').forEach(button=>{
      const selected=Object.keys(defaults).every(key=>presets[button.dataset.preset][key]===config[key]);
      button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected));
    });
    if(codeVisible) renderCode();
  }
  Object.keys(defaults).forEach(key=>$(key).addEventListener('input',event=>{config[key]=Number(event.target.value);updateControls();}));
  document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{Object.assign(config,presets[button.dataset.preset]);updateControls();}));
  $('show-radius').addEventListener('change',e=>{config.showRadius=e.target.checked;$('attraction-ring').classList.toggle('visible',config.showRadius);});
  $('slow-control').addEventListener('click',()=>{config.slow=!config.slow;$('slow-control').setAttribute('aria-pressed',String(config.slow));$('speed-label').textContent=config.slow?'0.25×':'1×';});
  $('reset').addEventListener('click',()=>{
    Object.assign(config,defaults,{showRadius:false,slow:false});
    $('show-radius').checked=false;
    $('attraction-ring').classList.remove('visible');
    $('slow-control').setAttribute('aria-pressed','false');$('speed-label').textContent='1×';
    pointer=null;pressed=false;springs.forEach((s,i)=>{s.x=s.t=i===4?1:0;s.v=0;});
    updateControls();notify('已恢复默认参数');
  });
  document.querySelectorAll('[data-stage-theme]').forEach(button=>button.addEventListener('click',()=>setStageTheme(button.dataset.stageTheme)));
  function setStageTheme(theme) {
    $('preview-panel').dataset.theme=theme;
    document.querySelectorAll('[data-stage-theme]').forEach(button=>{const selected=button.dataset.stageTheme===theme;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    if(codeVisible)renderCode();
  }
  function setPageTheme(theme) {
    document.documentElement.dataset.theme=theme;
    $('page-theme').innerHTML=`<svg><use href="#i-${theme==='dark'?'moon':'sun'}"/></svg>`;
    $('page-theme').setAttribute('aria-label',theme==='dark'?'切换为浅色页面':'切换为深色页面');
    try{localStorage.setItem('motion-page-theme',theme);}catch{}
  }
  try{setPageTheme(localStorage.getItem('motion-page-theme')==='dark'?'dark':'light');}catch{setPageTheme('light');}
  $('page-theme').addEventListener('click',()=>setPageTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
  function setTab(code) {
    codeVisible=code;
    $('preview-panel').hidden=code;$('code-panel').hidden=!code;
    [$('preview-tab'),$('code-tab')].forEach((tab,index)=>{const selected=Boolean(index)===code;tab.classList.toggle('selected',selected);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    if(code)renderCode();
  }
  $('preview-tab').addEventListener('click',()=>setTab(false));
  $('code-tab').addEventListener('click',()=>setTab(true));
  document.querySelector('.tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const code=e.key==='Home'?false:e.key==='End'?true:!codeVisible;setTab(code);$(code?'code-tab':'preview-tab').focus();}});
  const navItems=[...document.querySelectorAll('.side-nav a')];
  navItems.forEach(link=>link.addEventListener('click',()=>{navItems.forEach(item=>item.classList.toggle('active',item===link));}));
  function exportDemo() {
    const light=$('preview-panel').dataset.theme==='light';
    return `<!doctype html>
<!-- Magnetic Button · based on DesignBookmark
     https://designbookmark.com/motion#db-magnetic-button -->
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Magnetic Button</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: ${light?'#f7f7f6':'#171717'}; font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .field { position: fixed; inset: 0; }
  .mag { position: absolute; left: 50%; top: 50%; width: 168px; height: 56px;
    margin: -28px 0 0 -84px; border: 0; border-radius: 999px;
    background: ${light?'#0e0f11':'#ffffff'}; color: ${light?'#f4f3f1':'#000000'}; font: 600 16px Inter, "Helvetica Neue", Helvetica, Arial, sans-serif;
    cursor: pointer; will-change: transform; touch-action: manipulation; }
  .label { display: inline-flex; gap: 8px; align-items: center; will-change: transform; }
  .mag:focus-visible { outline: 2px solid ${light?'#0e0f11':'#ffffff'}; outline-offset: 7px; }
</style>
<div class="field">
  <button class="mag"><span class="label">Get started <span aria-hidden="true">↗</span></span></button>
</div>
<script>
  const config = ${JSON.stringify({radius:config.radius,strength:config.strength/100,stiffness:config.stiffness,damping:config.damping},null,2).replace(/\n/g,'\n  ')};
  const field = document.querySelector('.field');
  const button = document.querySelector('.mag');
  const label = document.querySelector('.label');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spring = (x, k, c) => ({ x, v: 0, t: x, k, c });
  const bx = spring(0, config.stiffness, config.damping);
  const by = spring(0, config.stiffness, config.damping);
  const lx = spring(0, config.stiffness * 220/170, config.damping * 15/13);
  const ly = spring(0, config.stiffness * 220/170, config.damping * 15/13);
  const scale = spring(1, 400, 18);
  const springs = [bx, by, lx, ly, scale];
  let pointer = null, last = performance.now(), down = false;
  field.addEventListener('pointermove', e => {
    const r = field.getBoundingClientRect();
    pointer = { x: e.clientX-r.left, y: e.clientY-r.top };
  });
  field.addEventListener('pointerleave', () => { pointer = null; down = false; });
  button.addEventListener('pointerdown', e => { down = true; button.setPointerCapture(e.pointerId); });
  const release = () => { if (down) scale.v = reduced ? 0 : 3; down = false; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => button.addEventListener(name, release));
  window.addEventListener('blur', () => { down = false; pointer = null; });
  function frame(now) {
    const dt = Math.min((now-last)/1000, 1/30); last = now;
    const cx = field.clientWidth/2, cy = field.clientHeight/2;
    const x = pointer?.x ?? cx, y = pointer?.y ?? cy, active = pointer !== null;
    const dx=x-cx, dy=y-cy, d=Math.hypot(dx,dy);
    const pull = active && d < config.radius ? 1-d/config.radius*.35 : 0;
    bx.t=dx*config.strength*pull; by.t=dy*config.strength*.38/.32*pull;
    lx.t=dx*config.strength*.14/.32*pull; ly.t=dy*config.strength*.18/.32*pull;
    scale.t=down ? .94 : 1+(reduced ? 0 : .06*pull);
    for (let i=0; i<4; i++) for (const s of springs) {
      const damping = reduced ? Math.max(s.c, 2*Math.sqrt(s.k)) : s.c;
      s.v += (-s.k*(s.x-s.t)-damping*s.v)*dt/4; s.x += s.v*dt/4;
    }
    button.style.transform=\`translate(\${bx.x}px,\${by.x}px) scale(\${scale.x})\`;
    label.style.transform=\`translate(\${lx.x}px,\${ly.x}px)\`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
<\/script>
</html>`;
  }
  function renderCode(){ $('source-code').textContent=exportDemo(); }
  let toastTimer;
  function notify(message) { clearTimeout(toastTimer);$('toast').querySelector('span').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600); }
  $('copy-code').addEventListener('click',async()=>{
    const source=exportDemo();
    try {
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(source);
      else {
        const textarea=document.createElement('textarea');textarea.value=source;textarea.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(textarea);textarea.select();const ok=document.execCommand('copy');textarea.remove();if(!ok)throw new Error('Clipboard unavailable');
      }
      notify('完整 HTML 已复制，保存后即可运行');
    } catch { setTab(true);notify('无法访问剪贴板，请在代码面板手动复制'); }
  });
  $('download').addEventListener('click',()=>{
    const blob=new Blob([exportDemo()],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='magnetic-button.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已下载磁吸按钮 HTML');
  });
  updateControls();
})();
