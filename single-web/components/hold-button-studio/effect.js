/* Hold Button — one independent instance per mount, used by preview and exports. */
function mountHoldButton(button, options = {}) {
    const defaults = { holdMs: 1200, doneMs: 1700, width: 220, height: 56, rebound: 14 };
    const config = { ...defaults, ...options };
    const fill = button.querySelector('.library-hold-fill');
    const topLabel = button.querySelector('.library-hold-label-fill');
    const announcement = button.querySelector('.library-hold-announcement');
    if (!fill || !topLabel || !announcement) throw new Error('Hold Button markup is incomplete');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    const listen = (node, name, fn) => node.addEventListener(name, fn, { signal: events.signal });
    const state = (x) => ({ x, v: 0, t: x });
    const progress = state(0), width = state(config.width), scale = state(1), shake = state(0);
    let phase = 'idle', holdElapsed = 0, raf = 0, last = 0, doneTimer = 0, destroyed = false;
    let activePointer = null, keyHeld = null;
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

    function spring(s, k, d, dt) {
        if (reduced.matches) { s.x = s.t; s.v = 0; return; }
        for (let i = 0; i < 4; i++) {
            const h = dt / 4;
            s.v += (-k * (s.x - s.t) - d * s.v) * h;
            s.x += s.v * h;
        }
        if (Math.abs(s.x - s.t) < .001 && Math.abs(s.v) < .001) {
            s.x = s.t; s.v = 0;
        }
    }
    function paint() {
        const w = Math.max(config.height, width.x);
        const fraction = clamp(progress.x, 0, 1);
        button.style.width = w + 'px';
        button.style.height = config.height + 'px';
        button.style.transform = 'translateX(' + shake.x + 'px) scale(' + scale.x + ')';
        fill.style.width = (fraction * w) + 'px';
        topLabel.style.clipPath = 'inset(0 ' + Math.max(0, w - fraction * w) + 'px 0 0)';
    }
    function settled(s) { return s.x === s.t && s.v === 0; }
    function schedule() {
        if (!raf && !destroyed) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    function frame(now) {
        raf = 0;
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        if (phase === 'holding') {
            holdElapsed += dt * 1000;
            progress.x = clamp(holdElapsed / config.holdMs, 0, 1);
            progress.t = progress.x; progress.v = 0;
            if (holdElapsed >= config.holdMs) complete();
        } else {
            spring(progress, 260, config.rebound, dt);
        }
        spring(width, 320, 20, dt);
        spring(scale, 520, 20, dt);
        spring(shake, 700, 14, dt);
        paint();
        if (phase === 'holding' || ![progress, width, scale, shake].every(settled)) schedule();
    }
    function start(kind) {
        if (destroyed || phase !== 'idle') return;
        clearTimeout(doneTimer);
        phase = 'holding';
        holdElapsed = clamp(progress.x, 0, 1) * config.holdMs;
        keyHeld = kind === 'keyboard' ? true : null;
        scale.t = reduced.matches ? 1 : .96;
        button.setAttribute('aria-label', '正在长按发布');
        schedule();
    }
    function release() {
        if (phase !== 'holding') return;
        phase = 'idle'; holdElapsed = 0; keyHeld = null;
        progress.t = 0; scale.t = 1;
        shake.v += reduced.matches ? 0 : 90 * clamp(progress.x * 2 + .3, 0, 1);
        button.setAttribute('aria-label', '按住发布');
        schedule();
    }
    function complete() {
        if (phase !== 'holding') return;
        phase = 'done'; activePointer = null; keyHeld = null;
        progress.x = progress.t = 1;
        button.classList.add('is-done');
        button.setAttribute('aria-label', '已发布');
        announcement.textContent = '已发布';
        width.t = config.height; scale.t = 1;
        if (!reduced.matches) scale.v += 2.5;
        if (typeof config.onComplete === 'function') config.onComplete();
        doneTimer = setTimeout(() => reset(), config.doneMs);
    }
    function reset() {
        if (destroyed) return;
        clearTimeout(doneTimer);
        if (raf) cancelAnimationFrame(raf);
        raf = 0; phase = 'idle'; activePointer = null; keyHeld = null; holdElapsed = 0;
        button.classList.remove('is-done');
        button.setAttribute('aria-label', '按住发布');
        announcement.textContent = '';
        for (const [s, x] of [[progress, 0], [width, config.width], [scale, 1], [shake, 0]]) {
            s.x = s.t = x; s.v = 0;
        }
        paint();
    }
    function update(next = {}) {
        Object.assign(config, next);
        config.holdMs = Math.max(100, Number(config.holdMs) || defaults.holdMs);
        config.doneMs = Math.max(100, Number(config.doneMs) || defaults.doneMs);
        config.height = clamp(Number(config.height) || defaults.height, 40, 96);
        config.width = Math.max(config.height, Number(config.width) || defaults.width);
        config.rebound = clamp(Number(config.rebound) || defaults.rebound, 8, 36);
        reset();
    }
    listen(button, 'pointerdown', event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        if (phase !== 'idle') return;
        activePointer = event.pointerId;
        start('pointer');
        try { button.setPointerCapture(event.pointerId); } catch {}
    });
    listen(button, 'pointerup', event => {
        if (activePointer === event.pointerId) { activePointer = null; release(); }
    });
    listen(button, 'pointercancel', event => {
        if (activePointer === event.pointerId) { activePointer = null; reset(); }
    });
    listen(button, 'lostpointercapture', event => {
        if (activePointer === event.pointerId) { activePointer = null; release(); }
    });
    listen(button, 'keydown', event => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat && !keyHeld) {
            event.preventDefault(); start('keyboard');
        }
    });
    listen(button, 'keyup', event => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            if (keyHeld) release();
        }
    });
    listen(button, 'blur', () => { if (phase === 'holding' && keyHeld) reset(); });
    listen(button, 'contextmenu', event => event.preventDefault());
    listen(window, 'blur', () => { if (phase === 'holding') reset(); });
    listen(window, 'pagehide', () => { if (phase === 'holding') reset(); });
    listen(document, 'visibilitychange', () => { if (document.hidden && phase === 'holding') reset(); });
    listen(reduced, 'change', () => { if (phase === 'holding') reset(); });
    update(options);
    return {
        update, reset,
        destroy() {
            reset(); destroyed = true;
            events.abort(); clearTimeout(doneTimer);
            if (raf) cancelAnimationFrame(raf);
        }
    };
}
window.LibraryHoldButton = { mount: mountHoldButton };
