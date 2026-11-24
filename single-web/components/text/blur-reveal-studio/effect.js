/* Independent character reveal with idle autoplay and explicit replay. */
(() => {
    'use strict';
    const defaults = Object.freeze({ text:'Coming into focus', fontSize:48, duration:400, stagger:30, blur:8, autoPlay:true });
    function mount(root, options = {}) {
        root.libraryComponent?.destroy();
        const button = root.querySelector('.library-blur-reveal-trigger');
        const controller = new AbortController(), media = matchMedia('(prefers-reduced-motion: reduce)');
        let config = { ...defaults }, animations = [], destroyed = false, generation = 0, timer = 0, paused = false, suspended = false;
        const on = (node, name, fn) => node.addEventListener(name, fn, { signal:controller.signal });
        function settle() {
            clearTimeout(timer);timer = 0;
            generation++;
            const previous = animations;animations = [];
            previous.forEach(animation => animation.cancel());
            root.dataset.revealing = 'false';
        }
        function schedule() {
            clearTimeout(timer);timer = 0;
            if (!destroyed && !paused && !suspended && !document.hidden && config.autoPlay && !media.matches && button.children[0]?.animate) {
                timer = setTimeout(play, 1400);
            }
        }
        function reset() { paused = true;settle(); }
        function resume() { if (destroyed) return;paused = false;schedule(); }
        function rest() { settle();schedule(); }
        function play() {
            if (destroyed || suspended || document.hidden) return;
            paused = false;settle();
            if (media.matches || !button.children[0]?.animate) return;
            const current = generation;
            root.dataset.revealing = 'true';
            animations = [...button.querySelectorAll('.library-blur-reveal-char')].map((span, index) => span.animate([
                { opacity:0, filter:`blur(${config.blur}px)` },
                { opacity:1, filter:'blur(0px)' }
            ], { duration:config.duration, delay:index * config.stagger, easing:'cubic-bezier(.23,1,.32,1)', fill:'both' }));
            Promise.all(animations.map(animation => animation.finished)).then(() => {
                if (!destroyed && generation === current) rest();
            }).catch(() => {});
        }
        function update(next = {}) {
            if (destroyed) return;
            settle();paused = false;
            if (typeof next.autoPlay === 'boolean') config.autoPlay = next.autoPlay;
            const text = typeof next.text === 'string' ? next.text.trim().slice(0,160) : config.text;
            config.text = text || config.text;
            for (const [key, min, max] of [['fontSize',16,96],['duration',100,2000],['stagger',0,150],['blur',0,24]]) {
                if (next[key] !== undefined && Number.isFinite(Number(next[key]))) config[key] = Math.max(min, Math.min(max, Number(next[key])));
            }
            root.style.setProperty('--blur-reveal-size', config.fontSize + 'px');
            button.setAttribute('aria-label', config.text + '，重新显现文字');
            // Keep words intact where possible; long words can wrap at character boundaries.
            const nodes = [];
            const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
            for (const part of config.text.split(/(\s+)/)) {
                if (!part) continue;
                const word = document.createElement('span');
                word.setAttribute('aria-hidden', 'true');
                word.className = /\s/.test(part) ? 'library-blur-reveal-space' : 'library-blur-reveal-word';
                const characters = segmenter ? [...segmenter.segment(part)].map(item => item.segment) : Array.from(part);
                for (const character of characters) {
                    const span = document.createElement('span');span.className = 'library-blur-reveal-char';
                    span.textContent = /\s/.test(character) ? '\u00a0' : character;
                    word.append(span);
                }
                nodes.push(word);
            }
            button.replaceChildren(...nodes);
            schedule();
        }
        on(root, 'pointerenter', event => { if (event.isTrusted && event.pointerType !== 'touch') play(); });
        on(root, 'pointerleave', rest);
        on(root, 'pointercancel', rest);
        on(button, 'click', event => { if (event.isTrusted) play(); });
        on(button, 'blur', rest);
        on(window, 'blur', () => { suspended = true;settle(); });
        on(window, 'focus', () => { suspended = false;schedule(); });
        on(window, 'pagehide', () => { suspended = true;settle(); });
        on(window, 'pageshow', () => { suspended = false;schedule(); });
        on(document, 'visibilitychange', () => { if (document.hidden) settle();else schedule(); });
        on(media, 'change', () => { settle();schedule(); });
        update(options);
        return { play, reset, resume, update, destroy() { if (destroyed) return;reset();destroyed = true;controller.abort(); } };
    }
    window.LibraryBlurReveal = { mount, defaults };
})();
