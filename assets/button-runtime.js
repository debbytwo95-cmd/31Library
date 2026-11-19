/* Shared by the live previews and reusable exports. Each mount owns its state. */
(() => {
    function mountMagnetic(field, initial = {}) {
        const button = field.querySelector('.library-magnetic-button');
        const label = button.querySelector('.library-magnetic-label');
        const ripple = field.querySelector('.library-magnetic-ripple');
        const config = { radius: 130, strength: 32, stiffness: 170, damping: 13, cornerRadius: 28, slow: false, ...initial };
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        const events = new AbortController();
        const on = (node, name, handler) => node.addEventListener(name, handler, { signal: events.signal });
        const springs = [0, 0, 0, 0, 1].map(x => ({ x, v: 0, t: x }));
        let pointer = null, pressed = false, frameId = 0, last = 0, destroyed = false;
        function paint() {
            button.style.transform = `translate(${springs[0].x}px,${springs[1].x}px) scale(${springs[4].x})`;
            label.style.transform = `translate(${springs[2].x}px,${springs[3].x}px)`;
        }
        function schedule() { if (!frameId && !destroyed) { last = performance.now(); frameId = requestAnimationFrame(frame); } }
        function frame(now) {
            frameId = 0;
            const dt = Math.min((now - last) / 1000, 1 / 30) * (config.slow ? .25 : 1); last = now;
            const dx = (pointer?.x ?? field.clientWidth / 2) - field.clientWidth / 2;
            const dy = (pointer?.y ?? field.clientHeight / 2) - field.clientHeight / 2;
            const distance = Math.hypot(dx, dy);
            const pull = pointer && distance < config.radius ? 1 - distance / config.radius * .35 : 0;
            const strength = config.strength / 100 * (reduced.matches ? .12 : 1);
            const targets = [dx * strength * pull, dy * strength * .38 / .32 * pull, dx * strength * .14 / .32 * pull, dy * strength * .18 / .32 * pull, pressed ? (reduced.matches ? .99 : .94) : 1 + (reduced.matches ? 0 : .06 * pull)];
            springs.forEach((s, i) => {
                s.t = targets[i];
                const k = i === 4 ? 400 : config.stiffness * (i > 1 ? 220 / 170 : 1);
                let c = i === 4 ? 18 : config.damping * (i > 1 ? 15 / 13 : 1);
                if (reduced.matches) c = Math.max(c, 2 * Math.sqrt(k));
                for (let n = 0; n < 4; n++) { s.v += (-k * (s.x - s.t) - c * s.v) * dt / 4; s.x += s.v * dt / 4; }
                if (Math.abs(s.x - s.t) < .001 && Math.abs(s.v) < .001) { s.x = s.t; s.v = 0; }
            });
            paint();
            if (springs.some(s => s.x !== s.t || s.v)) frameId = requestAnimationFrame(frame);
        }
        function clear(immediate = false) {
            pointer = null; pressed = false;
            if (immediate) {
                cancelAnimationFrame(frameId); frameId = 0;
                springs.forEach((s, i) => { s.x = s.t = i === 4 ? 1 : 0; s.v = 0; });
                ripple?.classList.remove('is-popping'); paint();
            } else schedule();
        }
        function release() { if (pressed && !reduced.matches) springs[4].v = 3; pressed = false; schedule(); }
        on(field, 'pointermove', event => {
            if (event.pointerType === 'touch') return;
            const rect = field.getBoundingClientRect(); pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }; schedule();
        });
        on(field, 'pointerleave', () => clear());
        on(button, 'pointerdown', event => { pressed = true; button.setPointerCapture(event.pointerId); schedule(); });
        on(button, 'pointerup', release);
        on(button, 'pointercancel', () => clear());
        on(button, 'lostpointercapture', release);
        on(button, 'keydown', event => { if ([' ', 'Enter'].includes(event.key) && !event.repeat) { pressed = true; schedule(); } });
        on(button, 'keyup', event => { if ([' ', 'Enter'].includes(event.key)) release(); });
        on(button, 'blur', () => clear());
        on(button, 'click', () => {
            if (!reduced.matches) springs[4].v = 3;
            if (ripple) { ripple.classList.remove('is-popping'); ripple.style.left = `calc(50% + ${springs[0].x}px)`; ripple.style.top = `calc(50% + ${springs[1].x}px)`; void ripple.offsetWidth; ripple.classList.add('is-popping'); }
            schedule();
        });
        on(window, 'blur', () => clear(true));
        on(window, 'pagehide', () => clear(true));
        on(document, 'visibilitychange', () => { if (document.hidden) clear(true); });
        on(reduced, 'change', () => clear(true));
        const resize = new ResizeObserver(() => clear(true)); resize.observe(field);
        function update(next) { Object.assign(config, next); button.style.borderRadius = config.cornerRadius + 'px'; if (ripple) ripple.style.borderRadius = config.cornerRadius + 1 + 'px'; }
        update(initial); paint();
        return { update, reset: () => clear(true), destroy() { clear(true); destroyed = true; events.abort(); resize.disconnect(); } };
    }

    function mountIcon(button) {
        const events = new AbortController();
        const on = (node, name, handler) => node.addEventListener(name, handler, { signal: events.signal });
        let hovering = false, focused = false, pressed = false;
        const update = () => { button.classList.toggle('is-active', hovering || focused || pressed); button.classList.toggle('is-pressed', pressed); };
        const reset = () => { hovering = focused = pressed = false; update(); };
        on(button, 'pointerenter', e => { if (e.pointerType !== 'touch') { hovering = true; update(); } });
        on(button, 'pointerleave', () => { hovering = pressed = false; update(); });
        on(button, 'focus', () => { focused = button.matches(':focus-visible'); update(); });
        on(button, 'blur', reset);
        on(button, 'pointerdown', e => { pressed = true; button.setPointerCapture(e.pointerId); update(); });
        on(button, 'pointerup', e => { pressed = false; if (e.pointerType === 'touch') hovering = false; update(); });
        on(button, 'pointercancel', reset);
        on(button, 'lostpointercapture', () => { pressed = false; update(); });
        on(button, 'keydown', e => { if ([' ', 'Enter'].includes(e.key)) { pressed = true; update(); } });
        on(button, 'keyup', e => { if ([' ', 'Enter'].includes(e.key)) { pressed = false; update(); } });
        on(window, 'blur', reset);
        on(window, 'pagehide', reset);
        on(document, 'visibilitychange', () => { if (document.hidden) reset(); });
        return { reset, destroy() { reset(); events.abort(); } };
    }
    window.LibraryButtons = { mountMagnetic, mountIcon };
})();
