/* Goo Morph: based on the supplied DesignBookmark reference. */
(() => {
    'use strict';
    const defaults = { words:['Ideas','Sketches','Designs','Products'], fontSize:64, duration:1050, hold:1600, blur:8, threshold:140, autoplay:true };
    function normalize(options, previous = defaults) {
        const config = { ...previous };
        if (Array.isArray(options.words)) {
            const words = options.words.map(word => String(word).trim().slice(0,40)).filter(Boolean).slice(0,12);
            if (words.length) config.words = words;
        }
        if (typeof options.autoplay === 'boolean') config.autoplay = options.autoplay;
        for (const [key, min, max] of [['fontSize',24,96],['duration',300,2400],['hold',400,5000],['blur',2,16],['threshold',80,200]]) {
            if (Number.isFinite(Number(options[key]))) config[key] = Math.max(min,Math.min(max,Number(options[key])));
        }
        return config;
    }
    function mount(root, options = {}) {
        root.libraryComponent?.destroy();
        let config = normalize(options), index = 0, target = 0, frame = 0, started = 0, destroyed = false;
        let playing = config.autoplay, timer = 0, blurred = false;
        const button = root.querySelector('.library-goo-morph-trigger'), layers = root.querySelector('.library-goo-morph-layers');
        const [a,b] = layers.children, controller = new AbortController(), signal = controller.signal;
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns,'svg'), filter = document.createElementNS(ns,'filter'), matrix = document.createElementNS(ns,'feColorMatrix');
        const filterId = 'library-goo-morph-' + (window.libraryGooMorphId = (window.libraryGooMorphId || 0) + 1);
        svg.setAttribute('class','library-goo-morph-defs');svg.setAttribute('aria-hidden','true');
        filter.id = filterId;filter.setAttribute('x','-50%');filter.setAttribute('y','-100%');filter.setAttribute('width','200%');filter.setAttribute('height','300%');
        matrix.setAttribute('type','matrix');filter.append(matrix);svg.append(filter);root.append(svg);
        const measure = document.createElement('span');measure.className = 'library-goo-morph-measure';measure.setAttribute('aria-hidden','true');button.append(measure);
        function fit() {
            if (destroyed) return;
            button.style.setProperty('--goo-morph-size', config.fontSize + 'px');
            let longest = 1;
            for (const word of config.words) { measure.textContent = word;longest = Math.max(longest,measure.getBoundingClientRect().width); }
            const available = Math.max(1,root.clientWidth - 32);
            button.style.setProperty('--goo-morph-size', Math.min(config.fontSize,config.fontSize * available / longest) + 'px');
        }
        function clearTimer() { clearTimeout(timer);timer = 0; }
        function schedule() {
            clearTimer();
            if (!destroyed && playing && !blurred && !document.hidden && !frame && config.words.length > 1) {
                timer = setTimeout(() => { timer = 0;next(); }, config.hold);
            }
        }
        function rest(nextIndex = target) {
            clearTimer();
            cancelAnimationFrame(frame);frame = 0;index = target = nextIndex;
            layers.style.filter = 'none';a.textContent = config.words[index];b.textContent = '';
            a.style.filter = 'none';a.style.opacity = '1';b.style.filter = 'none';b.style.opacity = '0';
            root.dataset.word = config.words[index];root.dataset.melting = 'false';
            button.setAttribute('aria-label', config.words[index] + '，切换下一个词组');button.setAttribute('aria-busy','false');
        }
        function look(node, fraction) {
            node.style.filter = fraction >= 1 ? 'none' : 'blur(' + Math.min(config.blur / Math.max(fraction,.00001) - config.blur,100).toFixed(2) + 'px)';
            node.style.opacity = Math.pow(fraction,.4).toFixed(3);
        }
        function tick(now) {
            frame = 0;
            if (destroyed) return;
            const t = Math.min(1,Math.max(0,(now - started) / config.duration));
            if (t >= 1) { rest();schedule();return; }
            const f = t * t * (3 - 2 * t);look(a,1 - f);look(b,f);
            frame = requestAnimationFrame(tick);
        }
        function next() {
            if (destroyed || frame || config.words.length < 2) return;
            clearTimer();
            target = (index + 1) % config.words.length;
            if (media.matches) { rest();schedule();return; }
            a.textContent = config.words[index];b.textContent = config.words[target];
            matrix.setAttribute('values','1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -' + config.threshold);
            layers.style.filter = 'url(#' + filterId + ')';root.dataset.melting = 'true';button.setAttribute('aria-busy','true');
            look(a,1);look(b,0);started = performance.now();frame = requestAnimationFrame(tick);
        }
        const finish = () => { if (!destroyed) { rest();schedule(); } };
        const reset = () => { if (!destroyed) { rest(0);schedule(); } };
        const pause = () => { if (!destroyed) { playing = false;rest(); } };
        const play = () => { if (!destroyed) { playing = true;schedule(); } };
        button.addEventListener('click', next, {signal});
        root.addEventListener('pointerenter', event => { if (!playing && event.pointerType !== 'touch') next(); }, {signal});
        root.addEventListener('pointerleave', () => { if (!playing) reset(); }, {signal});root.addEventListener('pointercancel', finish, {signal});
        window.addEventListener('blur', () => { blurred = true;finish(); }, {signal});
        window.addEventListener('focus', () => { blurred = false;schedule(); }, {signal});
        window.addEventListener('pagehide', () => { blurred = true;finish(); }, {signal});
        window.addEventListener('pageshow', () => { blurred = false;schedule(); }, {signal});
        document.addEventListener('visibilitychange', finish, {signal});
        media.addEventListener('change', finish, {signal});
        const observer = new ResizeObserver(fit);observer.observe(root);document.fonts?.ready.then(fit);
        rest(0);fit();schedule();
        return { next, reset, finish, play, pause,
            update(options) { if (destroyed) return;config = normalize(options,config);if (typeof options.autoplay === 'boolean') playing = config.autoplay;rest(0);fit();schedule(); },
            destroy() { if (destroyed) return;destroyed = true;rest();controller.abort();observer.disconnect();svg.remove();measure.remove(); }
        };
    }
    window.LibraryGooMorph = { mount };
})();
