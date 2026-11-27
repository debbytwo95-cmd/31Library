/* Face-on color blocks moving through an elliptical orbit. No external assets. */
(() => {
    'use strict';
    const defaults=Object.freeze({count:17,speed:8,spread:88,ellipse:40,size:104,depth:36,blur:2.2,autoplay:true,direction:-1,palette:'spectrum'});
    const limits={count:[6,24],speed:[2,24],spread:[50,94],ellipse:[20,70],size:[56,150],depth:[0,50],blur:[0,5]};
    const palettes={
        spectrum:['#eb714f','#8799cf','#b6cba4','#d7a2ab','#d9b866','#85b7b1','#b49bd0','#b9c9d9','#ce8b5f','#88a898','#b4aecf','#dd9a7d'],
        vivid:['#f35b39','#4263cf','#edb741','#52a58b','#a46cbf','#ea7c9c','#3f9ba8','#d17f42'],
        mineral:['#8e9eaa','#c5af96','#8da7a1','#b8a3a8','#b3b5a6','#b69b89','#9296ad','#bcc6c9']
    };
    const ratios=[9/16,1,16/9,.746,.748,16/9,9/16,.798,.75,2/3,9/16,16/9,9/16,1,16/9,9/16,16/9];
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    function normalize(input={}){
        const config={...defaults,...input};
        for(const [key,[min,max]] of Object.entries(limits))config[key]=Number.isFinite(Number(config[key]))?clamp(Number(config[key]),min,max):defaults[key];
        config.count=Math.round(config.count);config.autoplay=Boolean(config.autoplay);config.direction=Number(config.direction)===1?1:-1;
        if(!Object.hasOwn(palettes,config.palette))config.palette=defaults.palette;
        return config;
    }
    function geometry(width,height,config){
        const fit=Math.min(1,width/1100,height/520),base=config.size*fit,near=.72/(1-config.depth/100);
        const rx=Math.max(1,Math.min(width*config.spread/200,width/2-base*1.5*near/2-16));
        const front=Math.max(1,Math.min(rx*config.ellipse/100,height/2-base*1.4*near/2-24));
        return {rx,front,back:front*.85,base,fit};
    }
    function project(index,phase,config,width,height){
        const g=geometry(width,height,config),angle=phase+index/config.count*Math.PI*2,z=Math.cos(angle),ratio=ratios[index%ratios.length];
        const w=g.base*clamp(.85*ratio,1,1.5),h=Math.min(w/ratio,w*1.4),scale=.72/(1-z*config.depth/100),depth=(z+1)/2;
        return {x:Math.sin(angle)*g.rx,y:z*(z>0?g.front:g.back),scale,width:w,height:h,z,
            opacity:.35+.65*depth,blur:z>0?0:(1-depth)*config.blur,saturation:z>0?1:.6+.4*depth,layer:z>0?150+Math.round(z*40):10+Math.round(depth*40)};
    }
    const instances=new WeakMap();
    function mount(root,input={}){
        instances.get(root)?.destroy();
        let config=normalize(input),cards=[],phase=.22,velocity=0,frame=0,previous=0,active=-1,drag=null,moved=false;
        let paused=!config.autoplay,suspended=false,visible=true,destroyed=false,width=0,height=0;
        const events=new AbortController(),media=matchMedia('(prefers-reduced-motion: reduce)');
        const oldTab=root.getAttribute('tabindex'),oldLabel=root.getAttribute('aria-label'),oldRole=root.getAttribute('role');
        root.tabIndex=0;root.setAttribute('role','group');root.setAttribute('aria-label','椭圆环绕色块；左右键旋转，空格暂停或继续，Home 复位');
        const on=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:events.signal});
        function running(){return !paused&&!suspended&&visible&&!document.hidden&&!media.matches;}
        function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
        function render(){
            if(destroyed)return;
            root.dataset.phase=phase.toFixed(4);root.dataset.playing=String(running());
            cards.forEach((card,index)=>{
                const p=project(index,phase,config,width,height),selected=index===active;
                const safeScale=Math.max(p.scale,Math.min((width/2-12-Math.abs(p.x))*2/p.width,(height/2-12-Math.abs(p.y))*2/p.height));
                const scale=Math.min(p.scale*(1+card.lift*.3),safeScale);
                card.node.style.width=p.width.toFixed(2)+'px';card.node.style.height=p.height.toFixed(2)+'px';
                card.node.style.transform=`translate(-50%,-50%) translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) scale(${scale.toFixed(3)})`;
                card.node.style.opacity=(selected?1:p.opacity).toFixed(3);card.node.style.zIndex=selected?'300':String(p.layer);
                card.node.style.filter=selected?'none':`blur(${p.blur.toFixed(2)}px) saturate(${p.saturation.toFixed(3)})`;
                card.node.dataset.active=String(selected);
            });
        }
        function tick(now){
            frame=0;if(destroyed)return;
            const dt=previous?Math.min(64,now-previous)/1000:0;previous=now;
            const target=running()&&active<0&&!drag?config.direction*config.speed*Math.PI/180:0;
            velocity+=(target-velocity)*(1-Math.exp(-dt*(active>=0?20:3.2)));
            if(Math.abs(target-velocity)<.00001)velocity=target;
            if(!drag)phase=(phase+velocity*dt)%(Math.PI*2);
            let moving=false;
            for(let i=0;i<cards.length;i++){
                const targetLift=i===active?1:0;cards[i].lift+=(targetLift-cards[i].lift)*(media.matches?1:1-Math.exp(-dt*12));
                if(Math.abs(targetLift-cards[i].lift)<.001)cards[i].lift=targetLift;else moving=true;
            }
            render();
            if((running()&&active<0&&!drag)||Math.abs(velocity)>.00001||moving)frame=requestAnimationFrame(tick);else previous=0;
        }
        function schedule(){if(destroyed||suspended||!visible||document.hidden)return;if(!frame){previous=performance.now();frame=requestAnimationFrame(tick);}}
        function measure(){if(destroyed)return;const rect=root.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);render();}
        function select(index){if(active===index)return;active=index;if(media.matches){cards.forEach((card,i)=>card.lift=i===index?1:0);render();}else schedule();}
        function clearDrag(){const id=drag?.id;drag=null;root.removeAttribute('data-dragging');if(id!=null&&root.hasPointerCapture(id))root.releasePointerCapture(id);}
        function pause(){paused=true;velocity=0;stop();cards.forEach(card=>card.lift=0);active=-1;render();}
        function resume(){if(destroyed)return;paused=false;render();if(running())schedule();}
        function reset(){clearDrag();paused=true;phase=.22;velocity=0;active=-1;cards.forEach(card=>card.lift=0);stop();render();}
        function build(){
            active=-1;clearDrag();cards=Array.from({length:config.count},(_,index)=>{
                const node=document.createElement('button');node.type='button';node.className='elliptical-card';node.dataset.index=String(index);
                node.setAttribute('aria-label','色块 '+(index+1)+'，暂停或继续旋转');node.style.background=palettes[config.palette][index%palettes[config.palette].length];
                return {node,lift:0};
            });root.replaceChildren(...cards.map(card=>card.node));
        }
        function cardIndex(target){const card=target.closest?.('.elliptical-card');return card&&root.contains(card)?Number(card.dataset.index):-1;}
        function update(next={}){
            if(destroyed)return;
            const previousAutoplay=config.autoplay;config=normalize({...config,...next});
            if(previousAutoplay!==config.autoplay)paused=!config.autoplay;
            clearDrag();velocity=0;active=-1;cards.forEach(card=>card.lift=0);
            if(cards.length!==config.count)build();
            cards.forEach((card,index)=>card.node.style.background=palettes[config.palette][index%palettes[config.palette].length]);
            measure();if(running())schedule();else stop();
        }
        on(root,'pointerover',event=>{if(event.pointerType!=='touch'&&!drag)select(cardIndex(event.target));});
        on(root,'pointerleave',()=>{if(!drag)select(-1);});
        on(root,'focusin',event=>select(cardIndex(event.target)));
        on(root,'focusout',event=>{if(!root.contains(event.relatedTarget))select(-1);});
        on(root,'pointerdown',event=>{
            if(event.button!==0||drag)return;
            moved=false;drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,horizontal:event.pointerType!=='touch'};velocity=0;
        });
        on(root,'pointermove',event=>{
            if(!drag||drag.id!==event.pointerId)return;
            const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
            if(!drag.horizontal){if(Math.max(Math.abs(dx),Math.abs(dy))<=6)return;if(Math.abs(dy)>=Math.abs(dx)){clearDrag();return;}drag.horizontal=true;}
            if(!moved&&Math.abs(dx)>6){moved=true;root.setPointerCapture(event.pointerId);root.dataset.dragging='true';select(-1);}
            if(moved){phase+=(event.clientX-drag.lastX)/(1.2*geometry(width,height,config).rx);render();}
            drag.lastX=event.clientX;
        });
        function endDrag(event){if(drag?.id!==event.pointerId)return;clearDrag();if(running())schedule();}
        function cancelDrag(event){if(drag?.id!==event.pointerId)return;moved=true;clearDrag();select(-1);if(running())schedule();}
        on(root,'pointerup',endDrag);on(window,'pointerup',endDrag);
        on(root,'pointercancel',cancelDrag);on(window,'pointercancel',cancelDrag);
        on(root,'lostpointercapture',()=>{clearDrag();if(running())schedule();});
        on(root,'click',event=>{if(moved&&event.detail!==0){moved=false;return;}if(cardIndex(event.target)<0)return;if(paused)resume();else pause();});
        on(root,'keydown',event=>{
            if(!['ArrowLeft','ArrowRight','Home','Escape',' '].includes(event.key))return;
            if(event.key===' '&&event.target!==root)return;
            event.preventDefault();
            if(event.key==='Home'||event.key==='Escape')reset();
            else if(event.key===' '){if(paused)resume();else pause();}
            else{pause();phase+=event.key==='ArrowRight'?.2:-.2;render();}
        });
        function suspend(){clearDrag();suspended=true;velocity=0;stop();active=-1;cards.forEach(card=>card.lift=0);render();}
        function wake(){suspended=false;render();if(running())schedule();}
        on(window,'blur',suspend);on(window,'pagehide',suspend);on(window,'focus',wake);on(window,'pageshow',wake);
        on(document,'visibilitychange',()=>{if(document.hidden)suspend();else wake();});
        on(media,'change',()=>{velocity=0;stop();render();if(running())schedule();});
        const resize=new ResizeObserver(measure);resize.observe(root);
        const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
            visible=Boolean(entries.at(-1)?.isIntersecting);if(!visible){clearDrag();velocity=0;stop();}render();if(running())schedule();
        }):null;intersection?.observe(root);
        const api={update,reset,pause,resume,getConfig:()=>({...config}),destroy(){
            if(destroyed)return;clearDrag();destroyed=true;stop();events.abort();resize.disconnect();intersection?.disconnect();root.replaceChildren();
            for(const [name,value] of [['tabindex',oldTab],['aria-label',oldLabel],['role',oldRole]])if(value===null)root.removeAttribute(name);else root.setAttribute(name,value);
            root.removeAttribute('data-phase');root.removeAttribute('data-playing');instances.delete(root);
        }};
        build();measure();if(running())schedule();instances.set(root,api);root.libraryComponent=api;return api;
    }
    window.LibraryEllipticalGallery={defaults,palettes,normalize,geometry,project,mount};
})();
