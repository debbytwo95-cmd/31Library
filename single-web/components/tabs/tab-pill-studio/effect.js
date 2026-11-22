/* Tab Pill: independent edge springs, shared by the workbench and delivery. */
(() => {
    'use strict';
    let nextId = 0;
    const defaults = { leadStiffness: 620, leadDamping: 40, trailStiffness: 170, trailDamping: 19, timeScale: 1 };
    function mount(root, options = {}) {
        const bar = root.querySelector('.library-tab-pill-bar');
        const pill = root.querySelector('.library-tab-pill-indicator');
        const tabs = [...root.querySelectorAll('.library-tab-pill-tab')];
        const panels = [...root.querySelectorAll('.library-tab-pill-panel')];
        if (!bar || !pill || !tabs.length) throw new Error('Tab Pill markup is incomplete');
        const config = { ...defaults };
        const events = new AbortController();
        const listen = (node, name, fn) => node.addEventListener(name, fn, { signal: events.signal });
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const left = { x: 0, t: 0, v: 0 }, right = { x: 0, t: 0, v: 0 };
        let active = 0, direction = 1, raf = 0, last = 0, destroyed = false;
        const id = 'library-tab-pill-' + ++nextId;
        tabs.forEach((tab, i) => {
            tab.id = id + '-tab-' + i;
            if (panels[i]) {
                panels[i].id = id + '-panel-' + i;
                panels[i].setAttribute('aria-labelledby', tab.id);
                tab.setAttribute('aria-controls', panels[i].id);
            }
        });
        function configure(values) {
            for (const key of Object.keys(defaults)) {
                const value = Number(values[key]);
                if (Number.isFinite(value)) config[key] = Math.max(key === 'timeScale' ? .1 : 1, Math.min(key.includes('Stiffness') ? 1200 : key === 'timeScale' ? 4 : 80, value));
            }
        }
        function paint() {
            pill.style.transform = 'translateX(' + left.x.toFixed(3) + 'px)';
            pill.style.width = Math.max(0, right.x - left.x).toFixed(3) + 'px';
        }
        function settle() {
            cancelAnimationFrame(raf); raf = 0;
            for (const edge of [left, right]) { edge.x = edge.t; edge.v = 0; }
            paint();
        }
        function measure() {
            const tab = tabs[active];
            left.t = tab.offsetLeft; right.t = tab.offsetLeft + tab.offsetWidth;
        }
        function step(edge, k, damping, dt) {
            const steps = Math.max(4, Math.ceil(dt * 240));
            for (let n = 0; n < steps; n++) {
                const h = dt / steps;
                edge.v += (-k * (edge.x - edge.t) - damping * edge.v) * h;
                edge.x += edge.v * h;
            }
            if (Math.abs(edge.x - edge.t) < .01 && Math.abs(edge.v) < .01) { edge.x = edge.t; edge.v = 0; }
        }
        function frame(now) {
            raf = 0;
            const dt = Math.min((now - last) / 1000, 1 / 30) * config.timeScale;
            last = now;
            step(left, direction < 0 ? config.leadStiffness : config.trailStiffness, direction < 0 ? config.leadDamping : config.trailDamping, dt);
            step(right, direction > 0 ? config.leadStiffness : config.trailStiffness, direction > 0 ? config.leadDamping : config.trailDamping, dt);
            paint();
            if ([left, right].some(edge => edge.x !== edge.t || edge.v !== 0)) raf = requestAnimationFrame(frame);
        }
        function select(index, { snap = false, focus = false, notify = true } = {}) {
            if (destroyed || !Number.isInteger(index) || index < 0 || index >= tabs.length) return;
            const changed = index !== active;
            direction = index > active ? 1 : index < active ? -1 : direction;
            active = index;
            tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === active)); tab.tabIndex = i === active ? 0 : -1; });
            panels.forEach((panel, i) => { panel.hidden = i !== active; });
            measure();
            if (snap || reduced.matches) settle();
            else if (!raf && changed) { last = performance.now(); raf = requestAnimationFrame(frame); }
            if (focus) tabs[active].focus();
            if (changed && notify) options.onChange?.(active, tabs[active]);
        }
        tabs.forEach((tab, i) => listen(tab, 'click', () => select(i)));
        listen(bar, 'keydown', event => {
            if (!tabs.includes(event.target) || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (active + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            select(index, { focus: true });
        });
        const reflow = () => { if (!destroyed) { measure(); settle(); } };
        const observer = new ResizeObserver(reflow);
        observer.observe(bar);
        listen(window, 'blur', settle);
        listen(document, 'visibilitychange', () => { if (document.hidden) settle(); });
        listen(reduced, 'change', settle);
        document.fonts?.ready.then(reflow);
        configure(options);
        select(0, { snap: true, notify: false });
        return {
            select,
            get selectedIndex() { return active; },
            getConfig: () => ({ ...config }),
            update(values = {}) { if (!destroyed) { configure(values); reflow(); } },
            reset() { select(0, { snap: true, notify: false }); },
            settle,
            destroy() { if (destroyed) return; settle(); destroyed = true; events.abort(); observer.disconnect(); }
        };
    }
    window.LibraryTabPill = { mount };
})();
