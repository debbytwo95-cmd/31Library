/* Independent implementation of the visible Aceternity interaction. No framework required. */
(() => {
    'use strict';
    const projectIcon = '../../../../assets/icons/site-logo.png';
    const defaults = Object.freeze({ text:"Hi, I'm Evelyn Gao. I build 31Library for developers and designers.",name:'Evelyn Gao',project:'31Library',hint:'hover here',fontSize:30,color:'#3074fe',duration:320,bounce:.15,padding:10,showSize:true });
    const instances = new WeakMap();
    function entryEdge(rect, x, y) {
        const distances = [Math.abs(y-rect.top),Math.abs(x-rect.right),Math.abs(y-rect.bottom),Math.abs(x-rect.left)];
        return ['top','right','bottom','left'][distances.indexOf(Math.min(...distances))];
    }
    function normalize(input) {
        const result = { ...defaults,...input };
        result.text = String(result.text || defaults.text).trim().slice(0,120) || defaults.text;
        for (const key of ['name','project','hint']) result[key]=String(result[key]??defaults[key]).trim().slice(0,60);
        for (const [key,min,max] of [['fontSize',16,72],['duration',100,1000],['bounce',0,.4],['padding',4,20]]) {
            result[key] = Math.max(min,Math.min(max,Number.isFinite(Number(result[key])) ? Number(result[key]) : defaults[key]));
        }
        if (!/^#[\da-f]{6}$/i.test(result.color)) result.color = defaults.color;
        result.showSize = Boolean(result.showSize);
        return result;
    }
    function mount(root, input = {}) {
        instances.get(root)?.destroy();
        let config = normalize(input), selected = null, frameJob = 0, previous = 0, disposed = false;
        const controller = new AbortController(), media = matchMedia('(prefers-reduced-motion: reduce)');
        const states = ['x','y','w','h'].map(() => ({ value:0,velocity:0,target:0 }));
        const frame = document.createElement('span');frame.className = 'das-frame';frame.setAttribute('aria-hidden','true');
        for (let i=0;i<4;i++) { const handle=document.createElement('span');handle.className='das-handle';frame.append(handle); }
        const size=document.createElement('span');size.className='das-size';frame.append(size);
        function listen(node,type,fn) { node.addEventListener(type,fn,{signal:controller.signal}); }
        function paint() {
            const [x,y,w,h]=states.map(state=>state.value);
            frame.style.transform=`translate(${x}px,${y}px)`;frame.style.width=Math.max(0,w)+'px';frame.style.height=Math.max(0,h)+'px';
        }
        function settle() { cancelAnimationFrame(frameJob);frameJob=0;states.forEach(s=>{s.value=s.target;s.velocity=0;});paint(); }
        function tick(now) {
            frameJob=0;
            const dt=Math.min((now-previous)/1000,1/30)/4;previous=now;
            const stiffness=320*(320/config.duration)**2,damping=2*Math.sqrt(stiffness)*(1-config.bounce);
            for (let n=0;n<4;n++) states.forEach(s=>{s.velocity+=(-stiffness*(s.value-s.target)-damping*s.velocity)*dt;s.value+=s.velocity*dt;});
            paint();
            if (states.every(s=>Math.abs(s.value-s.target)<.05&&Math.abs(s.velocity)<.1)) settle();
            else frameJob=requestAnimationFrame(tick);
        }
        function measure(immediate=false) {
            if (!selected) return;
            const box=selected.getBoundingClientRect(),parent=root.getBoundingClientRect();
            const values=[box.left-parent.left-config.padding,box.top-parent.top-6,box.width+config.padding*2,box.height+12];
            states.forEach((s,i)=>{s.target=values[i];});
            size.textContent=Math.round(box.width)+' × '+Math.round(box.height);size.hidden=!config.showSize;
            if (immediate&&!media.matches) states.forEach((s,i)=>{s.value=s.target+(i<2?4:-8);s.velocity=0;});
            if (media.matches) settle();
            else if (!frameJob) { previous=performance.now();frameJob=requestAnimationFrame(tick); }
        }
        function activate(word, edge='left') {
            if (disposed) return;
            frame.hidden=false;
            if (selected===word) { word.dataset.selected='true';root.dataset.active='true';frame.style.opacity='1';return; }
            const first=!selected;
            if (selected) selected.dataset.selected='false';
            selected=word;word.dataset.selected='true';word.dataset.entry=edge;
            root.dataset.active='true';measure(first);frame.style.opacity='1';
        }
        function reset() {
            cancelAnimationFrame(frameJob);frameJob=0;selected=null;frame.style.opacity='0';frame.hidden=true;root.dataset.active='false';
            root.querySelectorAll('.das-word').forEach(word=>{word.dataset.selected='false';});
        }
        function word(text, isName=false) {
            const button=document.createElement('button');button.type='button';button.className='das-word';button.dataset.selected='false';
            const label=document.createElement('span');label.className='das-label';label.textContent=text;button.append(label);
            if(text===config.project&&!isName) {
                const icon=document.createElement('img');icon.className='das-project-icon';icon.src=projectIcon;icon.alt='';icon.width=33;icon.height=33;
                button.replaceChildren(icon,label);button.dataset.project='true';
            }
            if (isName&&config.hint) {
                const hint=document.createElement('span');hint.className='das-hint';hint.setAttribute('aria-hidden','true');
                // Hand-drawn annotation illustration, not a UI/action icon.
                const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 80 46');svg.setAttribute('fill','none');
                const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M75 8 C57 1 40 12 41 24 C42 36 56 29 48 21 C37 11 21 24 9 40 M8 29 L9 40 L21 36');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2.25');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);
                const text=document.createElement('span');text.className='das-hint-text';text.textContent=config.hint;hint.append(svg,text);button.append(hint);
            }
            return button;
        }
        function build() {
            reset();root.style.setProperty('--das-size',config.fontSize+'px');root.style.setProperty('--das-color',config.color);
            root.replaceChildren();
            const targets=[...new Set([config.name,config.project].filter(Boolean))];
            let cursor=0,matched=false;
            function appendPlain(text) {
                const parts=text.split(/(\bfor\b[ \t]+)/);
                parts.forEach(part=>{
                    if(/^for[ \t]+$/.test(part)) {
                        const lineBreak=document.createElement('br');lineBreak.className='das-break';
                        root.append(document.createTextNode('for'),lineBreak);
                    } else if(part)root.append(document.createTextNode(part));
                });
            }
            while(cursor<config.text.length) {
                const matches=targets.map(text=>({text,index:config.text.indexOf(text,cursor)})).filter(match=>match.index>=0).sort((a,b)=>a.index-b.index||b.text.length-a.text.length);
                if(!matches.length){appendPlain(config.text.slice(cursor));break;}
                const match=matches[0];if(match.index>cursor)appendPlain(config.text.slice(cursor,match.index));
                root.append(word(match.text,match.text===config.name));matched=true;cursor=match.index+match.text.length;
            }
            if(!matched){
                root.replaceChildren();config.text.split(/(\s+)/).forEach((text,index,parts)=>{
                    if(/^\s+$/.test(text)&&parts[index-1]==='for') {
                        const lineBreak=document.createElement('br');lineBreak.className='das-break';root.append(lineBreak);
                    } else root.append(/\s/.test(text)?document.createTextNode(text):word(text));
                });
            }
            root.append(frame);
        }
        function target(event) { const node=event.target.closest?.('.das-word');return node&&root.contains(node)?node:null; }
        listen(root,'pointerover',event=>{if(event.pointerType==='touch')return;const word=target(event);if(word)activate(word,entryEdge(word.getBoundingClientRect(),event.clientX,event.clientY));});
        listen(root,'pointerout',event=>{
            const word=target(event);if(!word||word.contains(event.relatedTarget))return;
            if(word===selected&&!target({target:event.relatedTarget||root}))reset();
        });
        listen(root,'pointerleave',reset);listen(root,'pointercancel',reset);
        listen(root,'focusin',event=>{const word=target(event);if(word)activate(word);});
        listen(root,'focusout',event=>{if(!root.contains(event.relatedTarget))reset();});
        listen(root,'click',event=>{const word=target(event);if(word)activate(word);});
        listen(root,'keydown',event=>{
            if(event.key==='Escape'){reset();return;}
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
            const words=[...root.querySelectorAll('.das-word')],index=words.indexOf(target(event));if(index<0)return;
            event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?words.length-1:(index+(event.key==='ArrowLeft'?-1:1)+words.length)%words.length;
            words[next].focus();
        });
        listen(window,'blur',reset);listen(window,'pagehide',reset);
        listen(document,'visibilitychange',()=>{if(document.hidden)reset();});
        listen(media,'change',()=>{if(media.matches)settle();});
        const observer=new ResizeObserver(()=>measure(true));observer.observe(root);
        document.fonts?.ready.then(()=>{if(!disposed)measure(true);});
        const api={update(next){if(disposed)return;config=normalize({...config,...next});build();},reset,destroy(){if(disposed)return;reset();disposed=true;controller.abort();observer.disconnect();root.replaceChildren();instances.delete(root);}};
        build();instances.set(root,api);return api;
    }
    window.LibraryDirectionSelection={defaults,mount,entryEdge};
})();
