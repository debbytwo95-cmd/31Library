/* Native reconstruction of SmoothUI Scrubber; reference: https://smoothui.dev/docs/components/scrubber */
(() => {
    'use strict';
    const defaults = { label: 'Value', min: 0, max: 1, step: .01, decimals: 2, ticks: 9, width: 320, value: .5 };
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    function normalize(options) {
        const config = { ...defaults, ...options };
        for (const key of ['min', 'max', 'step', 'decimals', 'ticks', 'width', 'value']) {
            config[key] = Number(config[key]);
            if (!Number.isFinite(config[key])) throw new RangeError(key + ' must be finite');
        }
        if (config.max <= config.min || config.step <= 0) throw new RangeError('Use max > min and step > 0');
        config.decimals = clamp(Math.round(config.decimals), 0, 6);
        config.ticks = clamp(Math.round(config.ticks), 0, 50);
        config.width = clamp(config.width, 160, 800);
        config.label = String(config.label).trim() || 'Value';
        return config;
    }
    function mount(root, options = {}) {
        let config = normalize(options);
        const initial = { ...config };
        const label = root.querySelector('.library-scrubber-label');
        const display = root.querySelector('.library-scrubber-value');
        const ticks = root.querySelector('.library-scrubber-ticks');
        const thumb = root.querySelector('.library-scrubber-thumb');
        const controller = new AbortController(), signal = controller.signal;
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const hoverMedia = matchMedia('(hover: hover) and (pointer: fine)');
        let value, pointerId = null, hovering = false, focused = false, destroyed = false;
        let frame = 0, lastTime = 0, scale = .7, velocity = 0, target = .7;
        const listen = (node, name, callback) => node.addEventListener(name, callback, { signal });
        function paintThumb() {
            thumb.style.transform = 'scale(' + scale + ')';
            thumb.style.opacity = String(.9 * (.15 + .65 * clamp((scale - .7) / .3, 0, 1)));
        }
        function snap() {
            cancelAnimationFrame(frame); frame = 0; lastTime = 0; velocity = 0; scale = target; paintThumb();
        }
        function animate(now) {
            frame = 0;
            const dt = lastTime ? Math.min((now - lastTime) / 1000, .032) : 1 / 60;
            lastTime = now;
            // Substeps keep the spring stable on low frame rate devices.
            for (let i = 0; i < 4; i++) {
                velocity += ((target - scale) * 800 - velocity * 42) * dt / 4;
                scale += velocity * dt / 4;
            }
            paintThumb();
            if (Math.abs(target - scale) < .0001 && Math.abs(velocity) < .001) snap();
            else frame = requestAnimationFrame(animate);
        }
        function activate(instant = false) {
            target = pointerId !== null || hovering || focused ? 1 : .7;
            if (instant || media.matches) snap();
            else if (!frame && Math.abs(scale - target) > .0001) { lastTime = 0; frame = requestAnimationFrame(animate); }
        }
        function quantize(next) {
            const bounded = clamp(next, config.min, config.max);
            if (bounded === config.min || bounded === config.max) return bounded;
            const rounded = config.min + Math.round((bounded - config.min) / config.step) * config.step;
            return clamp(Number(rounded.toPrecision(12)), config.min, config.max);
        }
        function render() {
            root.style.setProperty('--scrubber-width', config.width + 'px');
            root.style.setProperty('--scrubber-progress', (100 * (value - config.min) / (config.max - config.min)) + '%');
            root.setAttribute('role', 'slider'); root.tabIndex = 0;
            root.setAttribute('aria-orientation', 'horizontal');
            root.setAttribute('aria-label', config.label);
            root.setAttribute('aria-valuemin', config.min);
            root.setAttribute('aria-valuemax', config.max);
            root.setAttribute('aria-valuenow', value);
            label.textContent = config.label;
            display.textContent = value.toFixed(config.decimals);
        }
        function renderTicks() {
            ticks.replaceChildren();
            for (let i = 0; i < config.ticks; i++) {
                const tick = document.createElement('span'); tick.className = 'library-scrubber-tick';
                tick.style.left = (100 * (i + 1) / (config.ticks + 1)) + '%'; ticks.append(tick);
            }
        }
        function setValue(next, notify = true) {
            if (destroyed) return;
            if (!Number.isFinite(Number(next))) throw new RangeError('value must be finite');
            const previous = value; value = quantize(Number(next)); render();
            if (notify && value !== previous) config.onValueChange?.(value);
            return value;
        }
        function fromPointer(event) {
            const rect = root.getBoundingClientRect();
            if (rect.width > 0) setValue(config.min + clamp((event.clientX - rect.left) / rect.width, 0, 1) * (config.max - config.min));
        }
        function release() {
            const captured = pointerId; pointerId = null;
            root.classList.remove('is-dragging');
            if (captured !== null && root.hasPointerCapture(captured)) root.releasePointerCapture(captured);
            activate();
        }
        function settle() {
            hovering = false; focused = false; release(); activate(true);
        }
        listen(root, 'pointerenter', event => { if (event.pointerType === 'mouse' && hoverMedia.matches) { hovering = true; activate(); } });
        listen(root, 'pointerleave', () => { hovering = false; activate(); });
        listen(root, 'focus', () => { focused = true; activate(); });
        listen(root, 'blur', () => { focused = false; release(); });
        listen(root, 'pointerdown', event => {
            if (event.button !== 0 || event.isPrimary === false || pointerId !== null) return;
            event.preventDefault();
            // Pointer focus stays visible to keyboards without keeping the hover thumb active after a click.
            root.focus({ preventScroll: true }); focused = false;
            pointerId = event.pointerId; root.setPointerCapture(pointerId);
            root.classList.add('is-dragging'); activate(); fromPointer(event);
        });
        listen(root, 'pointermove', event => { if (event.pointerId === pointerId) fromPointer(event); });
        listen(root, 'pointerup', event => { if (event.pointerId === pointerId) { fromPointer(event); release(); } });
        listen(root, 'pointercancel', event => { if (event.pointerId === pointerId) settle(); });
        listen(root, 'lostpointercapture', () => { if (pointerId !== null) settle(); });
        listen(root, 'keydown', event => {
            const next = { ArrowRight: value + config.step, ArrowUp: value + config.step, ArrowLeft: value - config.step, ArrowDown: value - config.step, Home: config.min, End: config.max }[event.key];
            if (next === undefined) return;
            event.preventDefault(); focused = true; activate(); setValue(next);
        });
        listen(window, 'blur', settle);
        listen(document, 'visibilitychange', () => { if (document.hidden) settle(); });
        listen(media, 'change', () => activate(true));
        listen(hoverMedia, 'change', () => { hovering = false; activate(); });
        renderTicks(); setValue(config.value, false); paintThumb();
        return {
            get value() { return value; },
            get config() { return { ...config, value }; },
            setValue,
            update(next = {}) {
                if (destroyed) return;
                const updated = normalize({ ...config, value, ...next });
                const changedTicks = updated.ticks !== config.ticks;
                config = updated;
                if (changedTicks) renderTicks();
                setValue(config.value, false);
            },
            settle,
            reset() { if (!destroyed) { settle(); config = { ...initial }; renderTicks(); setValue(config.value, false); } },
            destroy() { if (!destroyed) { settle(); controller.abort(); destroyed = true; } }
        };
    }
    window.LibraryScrubber = { mount, defaults: { ...defaults } };
})();
