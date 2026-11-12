const pages = [
  {
    "href": "./single-web/motion-lab/analytics-3d-heatmap/analytics-3d-heatmap/index.html",
    "title": "Analytics · 3D 数据热力图",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/earth-replica/dist/index.html",
    "title": "Connected Earth · 交互地球",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/fluid-glow/index.html",
    "title": "流体炫光",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/ai-brand-signals-editorial.html",
    "title": "AI 品牌信号 · 编辑版",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/ai-brand-signals-playground.html",
    "title": "AI 品牌信号 · 交互实验",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/ai-brand-signals-spring.html",
    "title": "AI 品牌信号 · 弹簧效果",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/ai-brand-signals.html",
    "title": "AI 品牌信号",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/brand-signals.html",
    "title": "品牌信号 · Apple / Google / Tesla",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/social-brand-signals-spring.html",
    "title": "社交品牌 · 弹簧效果",
    "archive": false
  },
  {
    "href": "./single-web/motion-lab/analytics-3d-heatmap/analytics-3d-heatmap/single-file/index.html",
    "title": "Analytics · 3D 数据热力图",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/fluid-glow/analysis/detail.html",
    "title": "detail",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/fluid-glow/analysis/frames.html",
    "title": "frames",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/fluid-glow/versions/v1/index.html",
    "title": "流体炫光 · V1",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/ai-brand-signals-backup-20261025-125720.html",
    "title": "ai-brand-signals-backup-20261025-125720",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/ai-brand-signals-editorial-backup-20261025-153814.html",
    "title": "ai-brand-signals-editorial-backup-20261025-153814",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/brand-signals-backup-20261023-103030.html",
    "title": "brand-signals-backup-20261023-103030",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/outputs/brand-signals-initial.html",
    "title": "brand-signals-initial",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/work/ai-brand-signals-before-video-hover.html",
    "title": "ai-brand-signals-before-video-hover",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/work/ai-brand-signals-editorial-before-entrance.html",
    "title": "ai-brand-signals-editorial-before-entrance",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/work/ai-brand-signals-spring-before-no-boxes.html",
    "title": "ai-brand-signals-spring-before-no-boxes",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/work/brand-signals-before-gather.html",
    "title": "brand-signals-before-gather",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/work/brand-signals-before-pointer-lock.html",
    "title": "brand-signals-before-pointer-lock",
    "archive": true
  },
  {
    "href": "./single-web/motion-lab/html-canvas-2d-apple-google-tesla/work/brand-signals-v1.html",
    "title": "brand-signals-v1",
    "archive": true
  }
];
const grid=document.querySelector('#grid'), heading=document.querySelector('h1'),description=document.querySelector('#description'),search=document.querySelector('#search'),sidebar=document.querySelector('#categories'),chips=document.querySelector('#chips');
let section='components',category='buttons',filter='全部';
const componentCategories=[['buttons','按钮',6],['text','文字',0]];
function render(){
 document.querySelectorAll('[data-section]').forEach(b=>{const active=b.dataset.section===section;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
 const lab=section==='lab',blocks=section==='blocks';
 const categories=lab?[['all','全部实验',pages.length],['current','效果与实验',pages.filter(p=>!p.archive).length],['archive','历史版本',pages.filter(p=>p.archive).length]]:blocks?[['blocks','全部区块',0]]:componentCategories;
 sidebar.innerHTML=categories.map(([id,label,count])=>'<button class="category '+(category===id?'active':'')+'" data-category="'+id+'"><span>'+label+'</span><span class="count">'+count+'</span></button>').join('');
 const title=lab?(categories.find(c=>c[0]===category)||categories[0])[1]:blocks?'区块':category==='text'?'文字':'按钮';
 heading.textContent=title;
 document.querySelector('.category-heading span').textContent=lab?'全部实验':blocks?'全部区块':'全部组件';
 const tags=lab?['全部','Canvas','3D','光效']:['全部','悬停 hover','按压 press','拖拽 drag','滑动 swipe','输入 type'];
 chips.innerHTML=tags.map(t=>'<button class="chip '+(t===filter?'active':'')+'" aria-pressed="'+(t===filter)+'">'+t+'</button>').join('');
 const q=search.value.trim().toLowerCase();
 let items=lab?pages.filter(p=>category==='all'||(category==='archive'?p.archive:!p.archive)).map(p=>({...p,tag:p.href.includes('heatmap')||p.href.includes('earth')?'3D':p.href.includes('fluid-glow')?'光效':'Canvas'})):!blocks&&category==='buttons'?Array.from({length:6},(_,i)=>({title:i===1?'Jiggly Button':'按钮 Button',placeholder:true,tag:i===1?'按压 press':'悬停 hover',index:i})):[];
 items=items.filter(p=>(!q||(p.title+' '+(p.href||'')+' '+p.tag).toLowerCase().includes(q))&&(filter==='全部'||p.tag===filter||(filter==='按压 press'&&p.placeholder)));
 description.textContent=lab?items.length+' 个条目 · 点击卡片打开完整网页':blocks||category==='text'?'条目即将加入':items.length+' 个条目 · 按钮预览占位，后续替换为真实组件';
 grid.innerHTML=items.map(p=>{const tag=p.placeholder?'article':'a';return '<'+tag+' class="card" '+(p.href?'href="'+p.href+'"':'')+'><div class="preview">'+(p.placeholder?'<span class="demo-button '+(p.index===1?'dark':'')+'">'+(p.index===1?'Join the waitlist':'开始使用 <span>→</span>')+'</span>':'<span class="lab-placeholder">'+p.tag+'<small>预览占位</small></span>')+'</div><div class="card-info"><h2>'+p.title+'</h2><p>'+(p.placeholder?'操作 · '+(p.index===1?'press':'press / hover'):p.tag+' · '+(p.archive?'历史版本':'动效实验'))+'</p></div></'+tag+'>'}).join('');
 if(!items.length)grid.innerHTML='<div class="empty">'+(q?'没有找到匹配的条目，试试其他关键词。':'这里的内容正在整理中。')+'</div>';
}
 document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(!b)return;section=b.dataset.section;category=section==='lab'?'all':section==='blocks'?'blocks':'buttons';filter='全部';search.value='';render()});
 sidebar.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;filter='全部';render()}});
 chips.addEventListener('click',e=>{if(e.target.matches('button')){filter=e.target.textContent;render()}});
 search.addEventListener('input',render);
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus()}if(e.key==='Escape'){search.value='';render();search.blur()}});
 render();
