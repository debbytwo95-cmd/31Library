/* Word Roll, adapted from the user-supplied DesignBookmark reference.
   Unit-mass springs; timed word rotation, with animation frames only in motion. */
(() => {
    'use strict';
    function mount(root, options = {}) {
        const line = root.querySelector('.library-word-roll-line');
        const lead = root.querySelector('.library-word-roll-lead');
        const slot = root.querySelector('.library-word-roll-slot');
        slot.replaceChildren();
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const events = new AbortController();
        const config = { prefix:'Built for', words:['designers','founders','makers','teams'], interval:2400, fontSize:44, stagger:28, stiffness:420, damping:26 };
        const spring = (x, k, c) => ({ x, v:0, t:x, k, c });
        const width = spring(0, 320, 30);
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const listen = (target, type, fn) => target.addEventListener(type, fn, { signal:events.signal });
        const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
        let live = [], index = 0, frame = 0, timer = 0, previous = 0, elapsed = 0, destroyed = false, paused = false, suspended = false;
        function schedule() {
            clearTimeout(timer);timer = 0;
            if (destroyed || paused || suspended || document.hidden || config.words.length < 2) return;
            timer = setTimeout(() => { timer = 0;next(); }, config.interval);
        }
        function pause() { paused = true;clearTimeout(timer);timer = 0;settle(); }
        function play() { if (destroyed) return;paused = false;schedule(); }
        function suspend() { suspended = true;clearTimeout(timer);timer = 0;settle(); }
        function resume() { suspended = false;schedule(); }
        function make(word, first) {
            const el = document.createElement('span'); el.className = 'library-word-roll-word';
            const characters = segmenter ? Array.from(segmenter.segment(word), part => part.segment) : Array.from(word);
            const letters = characters.map((text, i) => {
                const node = document.createElement('span'); node.className = 'library-word-roll-char'; node.textContent = text; el.append(node);
                return { el:node, s:spring(first ? 0 : 1, config.stiffness, config.damping), due:first ? 0 : .06 + i * config.stagger / 1000 };
            });
            slot.append(el);
            return { el, letters, out:false };
        }
        const isSettled = s => Math.abs(s.x - s.t) < .001 && Math.abs(s.v) < .01;
        function stop() { cancelAnimationFrame(frame); frame = 0;slot.removeAttribute('data-moving'); }
        function render() {
            slot.style.width = Math.max(0, width.x).toFixed(3) + 'px';
            live.forEach(word => word.letters.forEach(({ el, s }) => {
                el.style.transform = `translateY(${(s.x * 105).toFixed(3)}%)`;
                el.style.opacity = clamp(1 - Math.abs(s.x) * .9, 0, 1).toFixed(3);
            }));
        }
        function settle() {
            stop();
            live.filter(word => word.out).forEach(word => word.el.remove());
            live = live.filter(word => !word.out);
            live.forEach(word => word.letters.forEach(letter => { letter.due = 0;letter.s.x = letter.s.t = letter.s.v = 0; }));
            width.x = width.t; width.v = 0;render();
        }
        function step(s, dt) {
            s.v += (-s.k * (s.x - s.t) - s.c * s.v) * dt;s.x += s.v * dt;
        }
        function loop(now) {
            frame = 0;
            const dt = Math.min(Math.max((now - previous) / 1000, 0), 1 / 30) / 4;previous = now;
            for (let n = 0; n < 4; n++) {
                elapsed += dt;step(width, dt);
                live.forEach(word => word.letters.forEach(letter => {
                    if (letter.due <= elapsed) { letter.s.t = word.out ? -1 : 0;step(letter.s, dt); }
                }));
            }
            live = live.filter(word => {
                if (!word.out || !word.letters.every(letter => letter.due <= elapsed && isSettled(letter.s))) return true;
                word.el.remove();return false;
            });
            if (isSettled(width) && live.every(word => word.letters.every(letter => letter.due <= elapsed && isSettled(letter.s)))) { settle();return; }
            render();frame = requestAnimationFrame(loop);
        }
        function show(first = false) {
            // Bound rapid repeated activation to the outgoing and incoming words.
            settle();elapsed = 0;
            live.forEach(word => {
                word.out = true;
                word.letters.forEach((letter, i) => { letter.due = i * config.stagger / 1000 * (22 / 28); });
            });
            const word = make(config.words[index], first);live.push(word);
            width.t = word.el.getBoundingClientRect().width;
            line.setAttribute('aria-label', [config.prefix, config.words[index]].filter(Boolean).join(' ') + '，切换下一个词组');
            root.dataset.word = config.words[index];
            if (first || media.matches) settle();
            else { slot.setAttribute('data-moving', '');previous = performance.now();frame = requestAnimationFrame(loop); }
        }
        function measure() {
            if (destroyed || !root.clientWidth) return;
            // Fit the longest configured phrase, keeping every word on one baseline.
            settle();line.style.fontSize = config.fontSize + 'px';
            const probe = make('', true);let widest = 0;
            config.words.forEach(word => { probe.el.textContent = word;widest = Math.max(widest, probe.el.getBoundingClientRect().width); });
            probe.el.remove();
            const full = lead.getBoundingClientRect().width + (config.prefix ? config.fontSize * .26 : 0) + widest;
            line.style.fontSize = (config.fontSize * Math.min(1, Math.max(1, root.clientWidth - 48) / Math.max(1, full))) + 'px';
            width.t = live[live.length - 1]?.el.getBoundingClientRect().width || 0;settle();
        }
        function next() { if (destroyed) return;index = (index + 1) % config.words.length;show();schedule(); }
        function reset() {
            if (destroyed) return;
            stop();live.forEach(word => word.el.remove());live = [];index = 0;
            show(true);measure();schedule();
        }
        function update(nextConfig = {}) {
            if (destroyed) return;
            if (nextConfig.prefix !== undefined) config.prefix = String(nextConfig.prefix).replace(/[\r\n]+/g, ' ').slice(0, 40);
            if (Array.isArray(nextConfig.words)) {
                const words = nextConfig.words.map(word => String(word).trim().slice(0, 40)).filter(Boolean).slice(0, 12);
                if (words.length) config.words = words;
            }
            if (nextConfig.autoplay !== undefined) paused = !nextConfig.autoplay;
            for (const [key, min, max] of [['interval',1200,6000], ['fontSize',24,72], ['stagger',0,70], ['stiffness',160,700], ['damping',16,40]]) {
                if (Number.isFinite(Number(nextConfig[key]))) config[key] = clamp(Number(nextConfig[key]), min, max);
            }
            lead.textContent = config.prefix;lead.hidden = !config.prefix;reset();
        }
        listen(line, 'click', next);
        listen(window, 'blur', suspend);listen(window, 'pagehide', suspend);
        listen(window, 'focus', resume);listen(window, 'pageshow', resume);
        listen(document, 'visibilitychange', () => { if (document.hidden) suspend();else resume(); });
        listen(media, 'change', () => { if (media.matches) settle(); });
        const observer = new ResizeObserver(measure);observer.observe(root);
        document.fonts?.ready.then(measure);
        update(options);
        return { next, update, reset, play, pause, destroy() {
            if (destroyed) return;
            pause();destroyed = true;events.abort();observer.disconnect();
        } };
    }
    window.LibraryWordRoll = { mount };
})();
