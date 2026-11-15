/* Header search only. The magnetic interaction remains in the unchanged app.js. */
(() => {
  const input=document.getElementById('site-search');
  const form=document.getElementById('site-search-form');
  const results=document.getElementById('search-results');
  const entries=[
    {title:'Icon Button',detail:'按钮 · 鼠标交互',href:'#playground',keywords:'magnetic button 按钮 扩散 鼠标 交互 默认 舒缓 利落'},
    {title:'一次经过，三层变化',detail:'交互原理',href:'#principles',keywords:'交互 原理 approach follow release 靠近 跟随 回弹 动效'},
    {title:'把这个细节，带进你的作品',detail:'代码与 HTML 下载',href:'#guide',keywords:'代码 下载 html 复制 使用 说明'}
  ];
  function close(){results.hidden=true;input.setAttribute('aria-expanded','false');}
  function matches(){const query=input.value.trim().toLowerCase();return query?entries.filter(entry=>(entry.title+' '+entry.detail+' '+entry.keywords).toLowerCase().includes(query)):entries;}
  function render(){
    results.replaceChildren();
    for(const entry of matches()){
      const link=document.createElement('a');link.href=entry.href;
      const title=document.createElement('strong');title.textContent=entry.title;
      const detail=document.createElement('span');detail.textContent=entry.detail;
      link.append(title,detail);link.addEventListener('click',close);results.append(link);
    }
    if(!results.children.length){const empty=document.createElement('p');empty.textContent='当前页面没有匹配的内容';results.append(empty);}
    results.hidden=false;input.setAttribute('aria-expanded','true');
  }
  input.addEventListener('input',render);
  input.addEventListener('focus',render);
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){close();input.blur();}
    if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('a')?.focus();}
  });
  form.addEventListener('submit',event=>{event.preventDefault();const first=matches()[0];if(first){close();document.querySelector(first.href)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}else render();});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.site-search'))close();});
  document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();input.focus();input.select();}if(event.key==='Escape')close();});
})();
