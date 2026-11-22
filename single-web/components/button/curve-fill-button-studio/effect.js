/* Direction-aware quadratic SVG fill. Shared by preview, cover and delivery. */
(() => {
    function mountCurve(button, initial = {}) {
        const config = { duration: 500, direction: 'all', easing: 'power3.out', slow: false, ...initial };
        const path = button.querySelector('.curve-path');
        const empty = 'M 0 100 V 100 Q 50 100 100 100 V 100 z';
        // The reference uses a different curved edge for entry and exit.
        const paths = {
            fromTop: ['M 0 100 V 0 Q 50 0 100 0 V 0 H 0 z', 'M 0 100 V 100 Q 50 125 100 100 V 0 H 0 z'],
            fromBottom: ['M 0 100 V 100 Q 50 75 100 100 V 100 z', 'M 0 100 V 0 Q 50 0 100 0 V 100 z'],
            fromLeft: ['M 0 0 H 0 Q 0 50 0 100 H 0 V 0 z', 'M 0 0 H 100 Q 105 50 100 100 H 0 V 0 z'],
            fromRight: ['M 100 0 H 100 Q 100 50 100 100 H 100 V 0 z', 'M 100 0 H 0 Q -5 50 0 100 H 100 V 0 z'],
            toTop: ['M 0 100 V 100 Q 50 60 100 100 V 0 H 0 z', 'M 0 100 V 0 Q 50 -25 100 0 V 0 H 0 z'],
            toBottom: ['M 0 100 V 0 Q 50 40 100 0 V 100 z', 'M 0 100 V 100 Q 50 125 100 100 V 100 z'],
            toLeft: ['M 0 0 H 100 Q 95 50 100 100 H 0 V 0 z', 'M 0 0 H 0 Q -5 50 0 100 H 0 V 0 z'],
            toRight: ['M 100 0 H 0 Q 5 50 0 100 H 100 V 0 z', 'M 100 0 H 100 Q 105 50 100 100 H 100 V 0 z']
        };
        const events = new AbortController();
        const on = (node, type, fn) => node.addEventListener(type, fn, { signal: events.signal });
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        let hovering = false, focused = false, touching = false, keyboard = false, active = false, destroyed = false;
        function edge(event) {
            const rect = button.getBoundingClientRect();
            const x = event.clientX - rect.left, y = event.clientY - rect.top;
            const sides = config.direction === 'horizontal' ? [['Left', x], ['Right', rect.width - x]] : config.direction === 'vertical' ? [['Top', y], ['Bottom', rect.height - y]] : [['Top', y], ['Bottom', rect.height - y], ['Left', x], ['Right', rect.width - x]];
            return sides.reduce((a, b) => b[1] < a[1] ? b : a)[0];
        }
        function animate(enter, side = config.direction === 'horizontal' ? 'Left' : 'Top') {
            if (destroyed) return;
            active = enter;
            button.classList.toggle('is-active', enter);
            gsap.killTweensOf(path);
            if (reduced.matches) { path.setAttribute('d', enter ? paths.fromBottom[1] : empty); return; }
            const [start, end] = paths[(enter ? 'from' : 'to') + side];
            gsap.fromTo(path, { attr: { d: start } }, { attr: { d: end }, duration: config.duration / 1000 * (config.slow ? 4 : 1), ease: config.easing, overwrite: true });
        }
        function reconcile(side) {
            const next = hovering || focused || touching || keyboard;
            if (next !== active) animate(next, side);
        }
        function reset() {
            hovering = focused = touching = keyboard = active = false;
            gsap.killTweensOf(path); path.setAttribute('d', empty); button.classList.remove('is-active');
        }
        on(button, 'pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; reconcile(edge(event)); } });
        on(button, 'pointerleave', event => { hovering = false; reconcile(edge(event)); });
        on(button, 'focus', () => { focused = button.matches(':focus-visible'); reconcile(); });
        on(button, 'blur', () => { focused = keyboard = false; reconcile(); });
        on(button, 'pointerdown', event => { if (event.pointerType === 'touch') { touching = true; button.setPointerCapture(event.pointerId); reconcile(edge(event)); } });
        on(button, 'pointerup', () => { touching = false; reconcile(); });
        on(button, 'lostpointercapture', () => { touching = false; reconcile(); });
        on(button, 'pointercancel', reset);
        on(button, 'keydown', event => { if (event.key === ' ' || event.key === 'Enter') { keyboard = true; reconcile(); } });
        on(button, 'keyup', event => { if (event.key === ' ' || event.key === 'Enter') { keyboard = false; reconcile(); } });
        on(window, 'blur', reset); on(window, 'pagehide', reset);
        on(document, 'visibilitychange', () => { if (document.hidden) reset(); });
        on(reduced, 'change', reset);
        path.setAttribute('d', empty);
        return { update(next) { Object.assign(config, next); }, reset, destroy() { reset(); destroyed = true; events.abort(); } };
    }
    window.LibraryCurve = { mount: mountCurve };
})();
