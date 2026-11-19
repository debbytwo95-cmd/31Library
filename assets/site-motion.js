/* Install in the head so native navigation snapshots never capture an entry frame. */
(() => {
    const root = document.documentElement;
    if (root.hasAttribute('data-cover')) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const running = new Map();
    let navigationTransition = null;
    const settle = () => root.setAttribute('data-library-motion-settled', '');
    function cancel() {
        running.forEach(animation => animation.cancel());
        running.clear();
    }
    function reveal(nodes) {
        cancel();
        if (reduced.matches || navigationTransition) return;
        const style = getComputedStyle(root);
        const durationToken = style.getPropertyValue('--library-duration-content').trim();
        const parsedDuration = parseFloat(durationToken) * (durationToken.endsWith('ms') ? 1 : 1000);
        const duration = Math.max(500, Math.min(800, Number.isFinite(parsedDuration) ? parsedDuration : 600));
        const easing = style.getPropertyValue('--library-ease-page').trim() || 'ease-in';
        nodes.forEach((node, i) => {
            if (!node || typeof node.animate !== 'function') return;
            const animation = node.animate([
                { opacity: 0, transform: 'translateY(8px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration, delay: Math.min(i * 30, 800 - duration), easing, fill: 'backwards' });
            running.set(node, animation);
            const done = () => { if (running.get(node) === animation) running.delete(node); };
            animation.finished.then(done, done);
        });
    }
    function nativeTransition(event) {
        if (!event.viewTransition) return;
        settle(); cancel();
        const transition = event.viewTransition;
        navigationTransition = transition;
        // Skipped or interrupted transitions are an ordinary navigation outcome.
        transition.ready.catch(() => {
            if (event.type !== 'pagereveal' || document.hidden || reduced.matches) return;
            if (navigationTransition && navigationTransition !== transition) return;
            navigationTransition = null;
            requestAnimationFrame(() => reveal([...document.querySelectorAll('.main, .main-shell')]));
        });
        const done = () => { if (navigationTransition === transition) navigationTransition = null; };
        transition.finished.then(done, done);
        if (reduced.matches) navigationTransition.skipTransition();
    }
    window.addEventListener('pagereveal', nativeTransition);
    window.addEventListener('pageswap', nativeTransition);
    window.addEventListener('pagehide', () => { settle(); cancel(); });
    window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        settle();
        // The catalog restores scroll in its pageshow listener before this frame.
        requestAnimationFrame(() => reveal([...document.querySelectorAll('.main, .main-shell')]));
    });
    reduced.addEventListener('change', () => {
        settle(); cancel();
        if (reduced.matches) navigationTransition?.skipTransition();
    });
    if (reduced.matches) settle();
    window.LibraryMotion = {
        updateCatalog(animate = false) {
            if (!animate) { cancel(); return; }
            settle();
            reveal([...document.querySelectorAll('.content > .title, .content > .chips, .content > .grid')]);
        }
    };
})();
