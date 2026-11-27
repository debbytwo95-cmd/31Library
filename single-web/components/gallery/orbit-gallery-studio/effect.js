/* Face-on photographs on a rotating sphere. No idle animation or external runtime. */
(() => {
    'use strict';
    const defaults = Object.freeze({ count:18, spread:82, size:84, depth:42, sensitivity:55, duration:600 });
    const limits = { count:[6,24], spread:[50,100], size:[50,130], depth:[0,80], sensitivity:[0,100], duration:[150,1200] };
    const instances = new WeakMap();
    function normalize(input = {}) {
        const result = {};
        for (const [key, fallback] of Object.entries(defaults)) {
            const number = Number(input[key] ?? fallback), [min,max] = limits[key];
            result[key] = Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
        }
        return result;
    }
    function project(index, config, yaw, pitch, width, height) {
        const y = 1 - 2 * (index + .5) / config.count;
        const ring = Math.sqrt(1 - y * y), angle = index * Math.PI * (3 - Math.sqrt(5)) + .8;
        const x = Math.cos(angle) * ring, z = Math.sin(angle) * ring;
        const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
        const rz = z * Math.cos(yaw) - x * Math.sin(yaw);
        const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
        const zz = rz * Math.cos(pitch) + y * Math.sin(pitch);
        const scale = 1 / (1 - zz * config.depth / 280);
        const fit = Math.min(1, width / 720, height / 560);
        const radiusX = Math.min(width * .37, height * .61) * config.spread / 100;
        const radiusY = height * .36 * config.spread / 100;
        return { x:rx * radiusX * scale, y:ry * radiusY * scale, z:zz, width:config.size * fit * scale, height:config.size * 1.337 * fit * scale };
    }
    function mount(root, input = {}, items = []) {
        instances.get(root)?.destroy();
        if (!items.length) throw new Error('Orbit Gallery requires at least one image.');
        let config = normalize(input), cards = [], selected = -1, lastFocus = null;
        let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0, baseYaw = 0, basePitch = 0;
        let frame = 0, previous = 0, drag = null, suppressClick = false, destroyed = false;
        const media = matchMedia('(prefers-reduced-motion: reduce)'), events = [];
        const oldTabIndex = root.getAttribute('tabindex'), oldLabel = root.getAttribute('aria-label');
        root.tabIndex = 0;
        root.setAttribute('aria-label', '环绕作品画廊；方向键旋转，Tab 选择作品，Enter 放大，Escape 关闭');
        const caption = document.createElement('p'); caption.className = 'orbit-caption'; caption.setAttribute('aria-live', 'polite');
        const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.className = 'orbit-close'; closeButton.textContent = '关闭'; closeButton.hidden = true;
        root.replaceChildren(caption, closeButton);
        function on(target, name, fn, options) { target.addEventListener(name, fn, options); events.push(() => target.removeEventListener(name, fn, options)); }
        function render() {
            if (destroyed) return;
            const { width, height } = root.getBoundingClientRect();
            cards.forEach((card,index) => {
                const p = project(index, config, yaw, pitch, width, height), active = index === selected;
                if (active) {
                    p.height = Math.min(height - 110, (width - 48) * 1.337); p.width = p.height / 1.337;
                    p.x = p.y = 0;
                }
                card.style.width = p.width.toFixed(2) + 'px'; card.style.height = p.height.toFixed(2) + 'px';
                card.style.transform = `translate(-50%,-50%) translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px)`;
                card.style.zIndex = active ? 100 : Math.round((p.z + 1) * 40);
                card.style.opacity = selected < 0 || active ? '1' : '.055';
                card.style.pointerEvents = selected < 0 || active ? 'auto' : 'none';
                card.tabIndex = selected < 0 || active ? 0 : -1;
                card.setAttribute('aria-expanded', String(active));
            });
        }
        function step(now) {
            frame = 0;
            const alpha = 1 - Math.exp(-Math.min(64, now - previous) / 95); previous = now;
            yaw += (targetYaw - yaw) * alpha; pitch += (targetPitch - pitch) * alpha;
            if (Math.abs(targetYaw - yaw) + Math.abs(targetPitch - pitch) < .0002) { yaw = targetYaw; pitch = targetPitch; }
            else frame = requestAnimationFrame(step);
            render();
        }
        function schedule() {
            if (destroyed) return;
            if (media.matches) { cancelAnimationFrame(frame); frame = 0; yaw = targetYaw; pitch = targetPitch; render(); }
            else if (!frame) { previous = performance.now(); frame = requestAnimationFrame(step); }
        }
        function animateLayout(change) {
            const before = cards.map(card => ({ transform:card.style.transform, width:card.style.width, height:card.style.height }));
            cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
            change(); render();
            if (!media.matches) cards.forEach((card,index) => card.animate([before[index], { transform:card.style.transform, width:card.style.width, height:card.style.height }], { duration:config.duration, easing:'cubic-bezier(.22,1,.36,1)' }));
        }
        function open(index) {
            if (selected === index) { close(); return; }
            cancelAnimationFrame(frame); frame = 0; lastFocus = cards[index];
            animateLayout(() => { selected = index; });
            const item = items[index % items.length], title = document.createElement('strong'), kind = document.createElement('span');
            title.textContent = item.title; kind.textContent = item.category || 'Visual exploration'; caption.replaceChildren(title,kind);
            closeButton.hidden = false; closeButton.focus({ preventScroll:true });
        }
        function close(restoreFocus = true) {
            if (selected < 0) return;
            animateLayout(() => { selected = -1; }); closeButton.hidden = true; caption.replaceChildren();
            if (restoreFocus) lastFocus?.focus({ preventScroll:true });
        }
        function clearDrag() {
            const pointer = drag?.id; drag = null; root.dataset.dragging = 'false';
            if (pointer != null && root.hasPointerCapture(pointer)) root.releasePointerCapture(pointer);
        }
        function rest() {
            clearDrag(); targetYaw = baseYaw; targetPitch = basePitch; schedule();
        }
        function rebuild() {
            cards.forEach(card => { card.getAnimations().forEach(animation => animation.cancel()); card.remove(); }); selected = -1; caption.replaceChildren(); closeButton.hidden = true;
            cards = Array.from({ length:config.count }, (_,index) => {
                const item = items[index % items.length], card = document.createElement('button'), image = document.createElement('img');
                card.type = 'button'; card.className = 'orbit-card'; card.dataset.index = index; card.setAttribute('aria-label', '查看 ' + item.title);
                image.src = item.src; image.alt = item.title; image.draggable = false; image.decoding = 'async';
                card.append(image); root.insertBefore(card,caption); return card;
            });
        }
        on(root, 'pointerdown', event => {
            if (event.button !== 0 || selected >= 0 || event.target === closeButton) return;
            // Keep the pressed image under the pointer until it becomes a drag.
            cancelAnimationFrame(frame); frame = 0; targetYaw = yaw; targetPitch = pitch;
            suppressClick = false; drag = { id:event.pointerId, x:event.clientX, y:event.clientY, yaw, pitch, moved:false };
        });
        on(root, 'pointermove', event => {
            if (selected >= 0) return;
            const rect = root.getBoundingClientRect(), sensitivity = config.sensitivity / 100;
            if (drag && drag.id === event.pointerId) {
                const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
                if (Math.hypot(dx,dy) > 6 && !drag.moved) { drag.moved = true; root.setPointerCapture(event.pointerId); root.dataset.dragging = 'true'; }
                if (drag.moved) { baseYaw = targetYaw = drag.yaw + dx * .009 * sensitivity; basePitch = targetPitch = Math.max(-.65, Math.min(.65, drag.pitch - dy * .004 * sensitivity)); schedule(); }
            } else if (event.pointerType !== 'touch' && !media.matches) {
                targetYaw = baseYaw + ((event.clientX - rect.left) / rect.width - .5) * sensitivity * .35;
                targetPitch = basePitch - ((event.clientY - rect.top) / rect.height - .5) * sensitivity * .18; schedule();
            }
        });
        on(root, 'pointerup', event => { if (drag?.id === event.pointerId) { suppressClick = drag.moved; clearDrag(); } });
        on(root, 'pointercancel', () => { suppressClick = true; rest(); });
        on(root, 'lostpointercapture', clearDrag);
        on(root, 'pointerleave', () => { if (!drag) rest(); });
        on(root, 'click', event => {
            if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
            suppressClick = false;
            const card = event.target.closest('.orbit-card');
            if (card && root.contains(card)) open(Number(card.dataset.index));
            else if (event.target === root || event.target === closeButton) close();
        });
        on(root, 'wheel', event => {
            if (!root.contains(document.activeElement) || selected >= 0 || event.ctrlKey) return;
            event.preventDefault(); baseYaw += Math.max(-100,Math.min(100,event.deltaY + event.deltaX)) * .0025 * config.sensitivity / 100;
            targetYaw = baseYaw; schedule();
        }, { passive:false });
        on(root, 'keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); close(); rest(); return; }
            if (selected >= 0 || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
            event.preventDefault();
            if (event.key === 'Home') baseYaw = basePitch = 0;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') baseYaw += event.key === 'ArrowRight' ? .2 : -.2;
            else basePitch = Math.max(-.65, Math.min(.65, basePitch + (event.key === 'ArrowUp' ? .12 : -.12)));
            targetYaw = baseYaw; targetPitch = basePitch; schedule();
        });
        on(window, 'blur', rest);
        on(document, 'visibilitychange', () => { if (document.hidden) rest(); });
        on(media, 'change', () => { rest(); cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel())); });
        const observer = new ResizeObserver(render); observer.observe(root);
        const api = {
            update(next) { config = normalize({ ...config,...next }); clearDrag(); if (cards.length !== config.count) rebuild(); root.style.setProperty('--orbit-duration', config.duration + 'ms'); render(); },
            reset() { close(false); clearDrag(); cancelAnimationFrame(frame); frame = 0; yaw = pitch = baseYaw = basePitch = targetYaw = targetPitch = 0; suppressClick = false; cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel())); render(); },
            close() { close(false); rest(); },
            getConfig() { return { ...config }; },
            destroy() {
                if (destroyed) return; clearDrag(); destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); events.forEach(remove => remove());
                cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel())); root.replaceChildren();
                root.removeAttribute('data-dragging'); root.style.removeProperty('--orbit-duration');
                if (oldTabIndex === null) root.removeAttribute('tabindex'); else root.setAttribute('tabindex',oldTabIndex);
                if (oldLabel === null) root.removeAttribute('aria-label'); else root.setAttribute('aria-label',oldLabel);
                instances.delete(root);
            }
        };
        rebuild(); api.update(config); instances.set(root,api); return api;
    }
    window.LibraryOrbitGallery = { defaults,normalize,project,mount };
})();
