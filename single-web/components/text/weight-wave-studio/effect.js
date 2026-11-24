/* Weight Wave, adapted from the user-supplied DesignBookmark reference. */
(() => {
    'use strict';
    const defaults = Object.freeze({ text:'Feel the weight', fontSize:54, light:300, bold:820, spread:.13, stiffness:260, damping:22, opacity:.42, autoplay:true });
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const numeric = (value, fallback, min, max) => Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : fallback;
    function normalize(options) {
        const result = { ...defaults };
        result.text = String(options.text ?? defaults.text).slice(0,80) || defaults.text;
        for (const [key, min, max] of [['fontSize',24,96],['light',100,900],['bold',100,900],['spread',.05,.4],['stiffness',100,600],['damping',14,40],['opacity',.2,1]]) result[key] = numeric(options[key] ?? defaults[key], defaults[key], min, max);
        result.bold = Math.max(result.light, result.bold);
        result.autoplay = options.autoplay !== false;
        return result;
    }
    function mount(root, options = {}) {
        let config = normalize(options), destroyed = false, frame = 0, previous = 0, active = false, pressed = null;
        let letters = [], centres = [], keyboardIndex = 0;
        let idleTime = 0, paused = false, suspended = Boolean(document.hidden);
        const line = root.querySelector('.library-weight-wave-line');
        if (!line) throw new Error('Weight Wave requires .library-weight-wave-line');
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const controller = new AbortController(), signal = controller.signal;
        const focus = { x:-.2, v:0, t:-.2 };
        const canAuto = () => config.autoplay && !paused && !suspended && !media.matches && config.bold > config.light;
        function stop() { cancelAnimationFrame(frame); frame = 0; }
        function render() {
            for (const letter of letters) {
                const weight = clamp(letter.x,100,900);
                letter.el.style.fontWeight = weight.toFixed(1);
                const mix = config.bold === config.light ? 0 : clamp((weight - config.light) / (config.bold - config.light),0,1);
                letter.el.style.opacity = (config.opacity + (1 - config.opacity) * mix).toFixed(3);
            }
        }
        function measure() {
            if (destroyed) return;
            line.style.fontSize = config.fontSize + 'px';
            letters.forEach(letter => { letter.el.style.fontWeight = config.bold; });
            const natural = line.scrollWidth || line.getBoundingClientRect().width;
            const available = Math.max(1, root.clientWidth - 48);
            if (natural > available) line.style.fontSize = (config.fontSize * available / natural) + 'px';
            render();readCentres();
        }
        function readCentres() {
            const rect = line.getBoundingClientRect();
            centres = letters.map(letter => {
                const r = letter.el.getBoundingClientRect();
                return (r.left + r.width / 2 - rect.left) / (rect.width || 1);
            });
        }
        function rest(immediate = false) {
            active = false;
            // Resume the cosine sweep from the current peak, avoiding a jump on exit.
            idleTime = Math.acos(1 - 2 * clamp((focus.x + .06) / 1.12,0,1)) * 4.6 / (2 * Math.PI);
            if (pressed !== null && root.hasPointerCapture?.(pressed)) root.releasePointerCapture(pressed);
            pressed = null;
            letters.forEach(letter => { letter.t = config.light; });
            if (immediate || media.matches) {
                stop(); focus.x = focus.t = -.2; focus.v = 0;
                letters.forEach(letter => { letter.x = config.light; letter.v = 0; });render();
            }
            if (!immediate || canAuto()) wake();
        }
        function spring(s, k, c, dt) {
            s.v += (-k * (s.x - s.t) - c * s.v) * dt;
            s.x += s.v * dt;
        }
        function targets() {
            letters.forEach((letter, index) => {
                const d = (centres[index] - focus.x) / config.spread;
                letter.t = active || canAuto() ? config.light + (config.bold - config.light) * Math.exp(-d*d) : config.light;
            });
        }
        function loop(now) {
            frame = 0;
            if (destroyed) return;
            readCentres();
            const dt = Math.min(Math.max((now - previous) / 1000,0),1/30) / 4; previous = now;
            for (let i=0; i<4; i++) {
                if (!active && canAuto()) {
                    idleTime += dt;
                    focus.t = -.06 + 1.12 * (.5 - .5 * Math.cos(idleTime * Math.PI * 2 / 4.6));
                }
                if (active || canAuto()) spring(focus,150,22,dt);
                targets(); letters.forEach(letter => spring(letter,config.stiffness,config.damping,dt));
            }
            const settled = (!active || Math.abs(focus.x-focus.t)<.0001 && Math.abs(focus.v)<.001) && letters.every(letter => Math.abs(letter.x-letter.t)<.02 && Math.abs(letter.v)<.05);
            if (settled) {
                focus.x = focus.t; focus.v = 0;
                targets();letters.forEach(letter => { letter.x = letter.t;letter.v = 0; });
            }
            render();
            if (!settled || canAuto()) frame = requestAnimationFrame(loop);
        }
        function wake() {
            if (destroyed || paused || suspended) return;
            if (media.matches) {
                stop();focus.x = focus.t;focus.v = 0;targets();
                letters.forEach(letter => { letter.x = letter.t;letter.v = 0; });render();
            } else if (!frame) { previous = performance.now();frame = requestAnimationFrame(loop); }
        }
        function point(event) {
            if (event.pointerType === 'touch' && pressed !== event.pointerId) return;
            const rect = line.getBoundingClientRect();
            paused = false;active = true;focus.t = (event.clientX - rect.left) / (rect.width || 1);wake();
        }
        function build() {
            stop();active = false;keyboardIndex = 0;line.replaceChildren();
            line.setAttribute('aria-label', config.text);
            letters = Array.from(config.text).map(char => {
                const el = document.createElement('span');el.className = 'library-weight-wave-char';el.textContent = char;
                el.setAttribute('aria-hidden','true');line.append(el);
                return { el, x:config.light, v:0, t:config.light };
            });
            focus.x = focus.t = -.2;focus.v = 0;idleTime = 0;render();measure();if (canAuto()) wake();
        }
        root.addEventListener('pointermove',point,{ signal });
        root.addEventListener('pointerenter',event => { if (event.pointerType !== 'touch') point(event); },{ signal });
        root.addEventListener('pointerdown',event => {
            if (event.button !== 0) return;
            pressed = event.pointerId;
            if (event.pointerType !== 'mouse') root.setPointerCapture?.(event.pointerId);
            point(event);
        },{ signal });
        root.addEventListener('pointerleave',() => rest(),{ signal });
        root.addEventListener('pointerup',event => { if (event.pointerType !== 'mouse') rest();else pressed = null; },{ signal });
        root.addEventListener('pointercancel',() => rest(),{ signal });
        root.addEventListener('lostpointercapture',() => { if (pressed !== null) rest(); },{ signal });
        line.addEventListener('keydown',event => {
            if (!['ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)) return;
            event.preventDefault();
            if (event.key === 'Escape') { rest();return; }
            keyboardIndex = event.key === 'Home' ? 0 : event.key === 'End' ? letters.length-1 : clamp(keyboardIndex+(event.key==='ArrowRight'?1:-1),0,letters.length-1);
            paused = false;active = true;focus.t = centres[keyboardIndex] ?? .5;wake();
        },{ signal });
        line.addEventListener('blur',() => rest(),{ signal });
        window.addEventListener('blur',() => { suspended = true;rest(true); },{ signal });
        window.addEventListener('focus',() => { suspended = Boolean(document.hidden);wake(); },{ signal });
        window.addEventListener('pagehide',() => { suspended = true;rest(true); },{ signal });
        window.addEventListener('pageshow',() => { suspended = Boolean(document.hidden);wake(); },{ signal });
        document.addEventListener('visibilitychange',() => { suspended = Boolean(document.hidden);if (suspended) rest(true);else wake(); },{ signal });
        media.addEventListener('change',() => rest(true),{ signal });
        const observer = new ResizeObserver(() => { rest(true);measure(); });observer.observe(root);
        document.fonts?.ready.then(() => { if (!destroyed) { rest(true);measure(); } });
        build();
        return {
            update(next) { if (destroyed) return;rest(true);config = normalize({ ...config,...next });build(); },
            reset() { if (!destroyed) { paused = true;rest(true); } },
            pause() { if (!destroyed) { paused = true;rest(true); } },
            play() { if (!destroyed) { paused = false;wake(); } },
            destroy() { if (destroyed) return;paused = true;rest(true);destroyed = true;controller.abort();observer.disconnect(); }
        };
    }
    window.LibraryWeightWave = { mount, defaults };
})();
