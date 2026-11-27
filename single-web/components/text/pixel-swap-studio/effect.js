/* Pixel Swap: a sharp sentence surrounding one pixelated, resizing word. */
(() => {
    'use strict';
    const defaults = Object.freeze({ prefix:'Create any', words:Object.freeze(['movie','image','campaign']), suffix:'you imagine', fontSize:64, duration:650, blockSize:8, autoplay:true });
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    function normalize(options = {}) {
        const config = { ...defaults, ...options };
        for (const key of ['prefix','suffix']) config[key] = String(config[key] ?? '').replace(/\s+/g,' ').trim().slice(0,100);
        const words = Array.isArray(config.words) ? config.words.map(word => String(word).replace(/\s+/g,' ').trim().slice(0,40)).filter(Boolean).slice(0,12) : [];
        config.words = words.length ? words : [...defaults.words];
        config.autoplay = Boolean(config.autoplay);
        for (const [key,min,max] of [['fontSize',24,96],['duration',200,1600],['blockSize',2,24]]) config[key] = Number.isFinite(Number(config[key])) ? clamp(Number(config[key]),min,max) : defaults[key];
        return config;
    }
    function mount(root, options = {}, hoverTarget = root) {
        root.libraryComponent?.destroy();
        const config = normalize(options), events = new AbortController();
        const button = document.createElement('button'), canvas = document.createElement('canvas');
        button.type = 'button';button.className = 'library-pixel-swap-trigger';
        canvas.setAttribute('aria-hidden','true');button.append(canvas);root.replaceChildren(button);
        const ctx = canvas.getContext('2d'), sharp = document.createElement('canvas'), word = document.createElement('canvas'), small = document.createElement('canvas');
        const fixed = sharp.getContext('2d'), variable = word.getContext('2d'), pixel = small.getContext('2d');
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        let index = 0, frame = 0, timer = 0, paused = false, suspended = false, destroyed = false, transition = null, layout = null;
        const listen = (target, type, fn) => target.addEventListener(type,fn,{signal:events.signal});
        function clearTimer(){clearTimeout(timer);timer=0;}
        function schedule(){
            clearTimer();
            if(destroyed || paused || suspended || document.hidden || media.matches || !config.autoplay || config.words.length<2 || !layout || frame)return;
            timer=setTimeout(()=>{timer=0;next();},1300);
        }
        function tokens(text) {
            // Keep Latin words intact, allow wrapping between CJK graphemes.
            return text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu) || [];
        }
        function itemsFor(text, slotWidth) {
            const before = tokens(config.prefix), after = tokens(config.suffix);
            return [...before.map((text,i)=>({text,gap:i?layout.space:0})), {text,slot:true,gap:before.length?layout.space:0}, ...after.map((text,i)=>({text,gap:i||before.length||config.words.length?layout.space:0}))].map(item=>({ ...item, width:item.slot?slotWidth:fixed.measureText(item.text).width, reserve:item.slot?layout.maxWord:fixed.measureText(item.text).width }));
        }
        function linesFor(items) {
            const lines = [[]];let width = 0;
            for (const item of items) {
                let gap = lines.at(-1).length ? item.gap : 0;
                if (lines.at(-1).length && width + gap + item.reserve > layout.width) { lines.push([]);width=0;gap=0; }
                lines.at(-1).push({...item,gap});width += gap + item.reserve;
            }
            return lines;
        }
        function draw(text = config.words[index], slotWidth = layout?.widths[index], block = 1) {
            if (destroyed || !layout) return;
            const {width,height,dpr,font,lineHeight,color} = layout;
            for (const c of [ctx,fixed,variable]) { c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);c.font=font;c.textBaseline='alphabetic';c.fillStyle=color;if ('letterSpacing' in c)c.letterSpacing=(layout.size*-.045)+'px'; }
            const lines = linesFor(itemsFor(text,slotWidth));let bounds;
            lines.forEach((line,row)=>{
                const total = line.reduce((sum,item)=>sum+item.width+item.gap,0);
                let x = (width-total)/2;
                const y = (height-lines.length*lineHeight)/2+row*lineHeight;
                const metrics = fixed.measureText('Mg');
                const ascent = metrics.fontBoundingBoxAscent ?? layout.size*.8, descent = metrics.fontBoundingBoxDescent ?? layout.size*.2;
                const baseline = y+(lineHeight-ascent-descent)/2+ascent;
                line.forEach(item=>{x+=item.gap;if(item.slot){variable.textAlign='center';variable.fillText(text,x+item.width/2,baseline);bounds={x,y,w:item.width,h:lineHeight};}else{fixed.textAlign='left';fixed.fillText(item.text,x,baseline);}x+=item.width;});
            });
            ctx.drawImage(sharp,0,0,sharp.width,sharp.height,0,0,width,height);
            if (block <= 1) ctx.drawImage(word,0,0,word.width,word.height,0,0,width,height);
            else {
                const w=Math.max(1,Math.ceil(width/block)),h=Math.max(1,Math.ceil(height/block));
                // The small buffer has its own device-independent pixel grid.
                if(small.width!==w)small.width=w;if(small.height!==h)small.height=h;
                pixel.clearRect(0,0,w,h);pixel.imageSmoothingEnabled=true;pixel.drawImage(word,0,0,word.width,word.height,0,0,w,h);
                ctx.save();ctx.beginPath();const bleed=layout.size*.2;ctx.rect(bounds.x-bleed,bounds.y-bleed,bounds.w+2*bleed,bounds.h+2*bleed);ctx.clip();
                ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,w,h,0,0,w*block,h*block);ctx.restore();ctx.imageSmoothingEnabled=true;
            }
            canvas.dataset.word=text;canvas.dataset.block=String(block);root.dataset.word=text;
        }
        function stop() { cancelAnimationFrame(frame);frame=0;transition=null; }
        function settle() { stop();draw(); }
        function measure() {
            if(destroyed || !root.clientWidth)return;
            stop();root.style.setProperty('--pixel-swap-size',config.fontSize+'px');
            const style=getComputedStyle(root), width=Math.max(1,root.clientWidth),dpr=Math.min(window.devicePixelRatio||1,3);
            const family=style.fontFamily;
            let size=config.fontSize;fixed.font=`400 ${size}px ${family}`;
            if ('letterSpacing' in fixed) fixed.letterSpacing=(size*-.045)+'px';
            const widest=Math.max(...[...config.words,...tokens(config.prefix),...tokens(config.suffix)].map(text=>fixed.measureText(text).width));
            size*=Math.min(1,width/Math.max(1,widest));
            // Keep short headlines within two lines in compact covers and phones.
            // The same responsive sizing is used by preview and delivered instances.
            function prepare(){
                const font=`400 ${size}px ${family}`;fixed.font=font;
                if('letterSpacing' in fixed)fixed.letterSpacing=(size*-.045)+'px';
                const widths=config.words.map(text=>fixed.measureText(text).width),lineHeight=size*1.16;
                layout={width,dpr,size,font,lineHeight,color:style.color,widths,maxWord:Math.max(...widths),space:fixed.measureText(' ').width};
            }
            prepare();
            while(size>20 && linesFor(itemsFor(config.words[index],layout.widths[index])).length>2){size=Math.max(20,size*.92);prepare();}
            const {widths,lineHeight}=layout;
            layout.height=Math.ceil(linesFor(itemsFor(config.words[index],widths[index])).length*lineHeight+size*.3);
            for(const target of [canvas,sharp,word]){target.width=Math.ceil(width*dpr);target.height=Math.ceil(layout.height*dpr);}
            canvas.style.width=width+'px';canvas.style.height=layout.height+'px';
            draw();schedule();
        }
        function next() {
            if(destroyed || config.words.length<2 || !layout)return;
            clearTimer();
            stop();const from=index;index=(index+1)%config.words.length;
            button.setAttribute('aria-label',[config.prefix,config.words[index],config.suffix].filter(Boolean).join(' ')+'；切换下一个词组');
            if(media.matches){draw();return;}
            transition={from,to:index,start:performance.now()};
            function tick(now){
                frame=0;if(!transition)return;
                const p=clamp((now-transition.start)/config.duration,0,1), eased=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
                const width=layout.widths[from]*(1-eased)+layout.widths[index]*eased;
                draw(config.words[p<.5?from:index],width,1+Math.round((config.blockSize-1)*Math.sin(Math.PI*p)));
                if(p<1)frame=requestAnimationFrame(tick);else {settle();schedule();}
            }
            frame=requestAnimationFrame(tick);
        }
        function restore() { if(destroyed)return;clearTimer();stop();index=0;button.setAttribute('aria-label',[config.prefix,config.words[0],config.suffix].filter(Boolean).join(' ')+'；切换下一个词组');measure(); }
        function reset() { paused=true;restore(); }
        function pause() { paused=true;clearTimer();settle(); }
        function resume() { if(destroyed)return;paused=false;schedule(); }
        function activate() { if(destroyed)return;paused=false;next(); }
        function suspend() { suspended=true;clearTimer();settle(); }
        function wake() { suspended=false;schedule(); }
        function update(options={}) { if(destroyed)return;Object.assign(config,normalize({...config,...options}));restore(); }
        listen(button,'click',event=>{if(event.isTrusted)activate();});
        listen(hoverTarget,'pointerenter',event=>{if(event.isTrusted && event.pointerType!=='touch')activate();});
        listen(hoverTarget,'pointerleave',restore);listen(hoverTarget,'pointercancel',restore);
        listen(button,'keydown',event=>{if(event.key==='Escape')reset();});
        listen(window,'blur',suspend);listen(window,'pagehide',suspend);listen(window,'focus',wake);listen(window,'pageshow',wake);
        listen(document,'visibilitychange',()=>{if(document.hidden)suspend();else wake();});
        listen(media,'change',()=>{settle();schedule();});
        const observer=new ResizeObserver(measure);observer.observe(root);
        document.fonts?.ready.then(measure);restore();
        const runtime={next:activate,reset,update,pause,resume,destroy(){if(destroyed)return;clearTimer();stop();destroyed=true;events.abort();observer.disconnect();}};
        root.libraryComponent=runtime;return runtime;
    }
    window.LibraryPixelSwap={defaults,normalize,mount};
})();
