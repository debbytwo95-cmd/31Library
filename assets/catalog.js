const pages = [
  {
    "href": "./single-web/motion-lab/earth-replica/dist/index.html",
    "title": "Connected Earth · 交互地球",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/fluid-glow/index.html",
    "title": "流体炫�\u0085�",
    "archive": false
  }
];
const buttonComponents = [
  {
    "href": "./single-web/components/magnetic-button-studio/index.html",
    "title": "Magnetic Button · 磁吸按钮",
    "tag": "悬停 hover",
    "tags": [
      "悬停 hover",
      "按压 press"
    ],
    "keywords": "磁吸 鼠标 按钮 spring 弹簧 magnetic button",
    "magnetic": true
  }
];
const grid=document.querySelector('#grid'), heading=document.querySelector('h1'),description=document.querySelector('#description'),search=document.querySelector('#search'),sidebar=document.querySelector('#categories'),chips=document.querySelector('#chips');
let section='components',category='buttons',filter='全部';
const componentCategories=[['buttons','按钮',buttonComponents.length],['text','文字',0]];
function render(){
 document.querySelectorAll('[data-section]').forEach(b=>{const active=b.dataset.section===section;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
 const lab=section==='lab',blocks=section==='blocks';
 const categories=lab?[['all','全部实验',pages.length],['current','效果与实验',pages.filter(p=>!p.archive).length]]:blocks?[['blocks','全部区块',0]]:componentCategories;
 sidebar.innerHTML=categories.map(([id,label,count])=>'<button class="category '+(category===id?'active':'')+'" data-category="'+id+'"><span>'+label+'</span><span class="count">'+count+'</span></button>').join('');
 const title=lab?(categories.find(c=>c[0]===category)||categories[0])[1]:blocks?'区块':category==='text'?'文字':'按钮';
 heading.textContent=title;
 document.querySelector('.category-heading span').textContent=lab?'全部实验':blocks?'全部区块':'全部组件';
 const tags=lab?['全部','Canvas','3D','光效']:['全部','悬停 hover','按压 press','拖拽 drag','滑动 swipe','输入 type'];
 chips.innerHTML=tags.map(t=>'<button class="chip '+(t===filter?'active':'')+'" aria-pressed="'+(t===filter)+'">'+t+'</button>').join('');
 const q=search.value.trim().toLowerCase();
 let items=lab?pages.map(p=>({...p,tag:p.href.includes('heatmap')||p.href.includes('earth')?'3D':p.href.includes('fluid-glow')?'光效':'Canvas'})):!blocks&&category==='buttons'?buttonComponents:[];
 items=items.filter(p=>(!q||(p.title+' '+(p.href||'')+' '+p.tag+' '+(p.keywords||'')).toLowerCase().includes(q))&&(filter==='全部'||p.tag===filter||(p.tags||[]).includes(filter)||(filter==='按压 press'&&p.placeholder)));
 description.textContent=lab?items.length+' 个条目 · 点击卡片打开完整网页':blocks||category==='text'?'条目即将加入':items.length+' 个条目 · 点击卡片打开组件详情';
 grid.innerHTML=items.map(p=>{const tag=p.placeholder?'article':'a';return '<'+tag+' class="card" '+(p.href?'href="'+p.href+'"':'')+'><div class="preview '+(p.magnetic?'magnetic-preview':'')+'">'+(p.magnetic?'<span class="magnetic-button-preview"><span class="magnetic-preview-label">Get started <span aria-hidden="true">↗</span></span></span>':p.placeholder?'<span class="demo-button '+(p.index===1?'dark':'')+'">'+(p.index===1?'Join the waitlist':'开始使用 <span>→</span>')+'</span>':'<span class="lab-placeholder">'+p.tag+'<small>预览占位</small></span>')+'</div><div class="card-info"><h2>'+p.title+'</h2><p>'+(p.magnetic?'鼠标交互 · hover / press':p.placeholder?'操作 · '+(p.index===1?'press':'press / hover'):p.tag+' · '+(p.archive?'历史版本':'动效实验'))+'</p></div></'+tag+'>'}).join('');
 if(!items.length)grid.innerHTML='<div class="empty">'+(q?'没有找到匹配的条目，试试其他关键词。':'这里的内容正在整理中。')+'</div>';
}
 document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(!b)return;section=b.dataset.section;category=section==='lab'?'all':section==='blocks'?'blocks':'buttons';filter='全部';search.value='';render()});
 sidebar.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;filter='全部';render()}});
 chips.addEventListener('click',e=>{if(e.target.matches('button')){filter=e.target.textContent;render()}});
 search.addEventListener('input',render);
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus()}if(e.key==='Escape'){search.value='';render();search.blur()}});
 render();

// Cover motion follows the real pointer; no idle demonstration or simulated cursor.
(() => {
 const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const spring = (x,k,c) => ({x,v:0,t:x,k,c});
 const springs = [spring(0,170,13),spring(0,170,13),spring(0,220,15),spring(0,220,15),spring(1,400,18)];
 const [bx,by,lx,ly,scale] = springs;
 let preview=null,button=null,label=null,pointer=null,pressed=false,frameId=null,last=0;
 const findPreview = target => target instanceof Element ? target.closest('.magnetic-preview') : null;
 function paint(){
  if(!button)return;
  button.style.transform=`translate(${bx.x.toFixed(2)}px,${by.x.toFixed(2)}px) scale(${scale.x.toFixed(4)})`;
  label.style.transform=`translate(${lx.x.toFixed(2)}px,${ly.x.toFixed(2)}px)`;
 }
 function clear(){
  if(frameId!==null)cancelAnimationFrame(frameId);
  frameId=null;
  if(button)button.style.removeProperty('transform');
  if(label)label.style.removeProperty('transform');
  springs.forEach((s,i)=>{s.x=s.t=i===4?1:0;s.v=0;});
  preview=button=label=pointer=null;pressed=false;
 }
 function wake(){if(frameId===null){last=performance.now();frameId=requestAnimationFrame(animate);}}
 function animate(now){
  frameId=null;
  if(!preview?.isConnected){clear();return;}
  const dt=Math.min((now-last)/1000,1/30);last=now;
  const dx=pointer?pointer.x-preview.clientWidth/2:0,dy=pointer?pointer.y-preview.clientHeight/2:0;
  const distance=Math.hypot(dx,dy),pull=pointer&&distance<130?1-distance/130*.35:0;
  bx.t=dx*.32*pull;by.t=dy*.38*pull;lx.t=dx*.14*pull;ly.t=dy*.18*pull;
  scale.t=pressed ? .94 : 1+(reduced?0:.06*pull);
  for(let i=0;i<4;i++)for(const s of springs){const damping=reduced?Math.max(s.c,2*Math.sqrt(s.k)):s.c;s.v+=(-s.k*(s.x-s.t)-damping*s.v)*dt/4;s.x+=s.v*dt/4;}
  const settled=springs.every(s=>Math.abs(s.x-s.t)<.001&&Math.abs(s.v)<.001);
  if(settled)springs.forEach(s=>{s.x=s.t;s.v=0;});
  paint();
  if(!settled)frameId=requestAnimationFrame(animate);
  else if(!pointer)clear();
 }
 function track(event){
  if(event.pointerType==='touch')return;
  const next=findPreview(event.target);
  if(!next)return;
  if(next!==preview){clear();preview=next;button=next.querySelector('.magnetic-button-preview');label=next.querySelector('.magnetic-preview-label');}
  const rect=next.getBoundingClientRect();pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};wake();
 }
 grid.addEventListener('pointerover',track);
 grid.addEventListener('pointermove',track);
 grid.addEventListener('pointerout',event=>{
  if(preview&&preview.contains(event.target)&&!preview.contains(event.relatedTarget)){pointer=null;pressed=false;wake();}
 });
 grid.addEventListener('pointerdown',event=>{if(event.button===0&&event.pointerType!=='touch'&&findPreview(event.target)===preview&&preview){pressed=true;wake();}});
 window.addEventListener('pointerup',()=>{if(pressed){pressed=false;scale.v=reduced?0:3;wake();}});
 window.addEventListener('pointercancel',()=>{if(preview){pointer=null;pressed=false;wake();}});
 window.addEventListener('blur',clear);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();
