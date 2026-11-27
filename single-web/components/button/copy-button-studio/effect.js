/* Copy Button, adapted from the user-supplied DesignBookmark reference.
   Spring motion comes from assets/copy-springs.js, loaded before this file. */
(() => {
    'use strict';
    function mount(root, options = {}) {
        const button = root.querySelector('.library-copy-button');
        const roll = root.querySelector('.library-copy-roll');
        const words = root.querySelector('.library-copy-words');
        const copyIcon = root.querySelector('.library-copy-original');
        const checkIcon = root.querySelector('.library-copy-success');
        const status = root.querySelector('.library-copy-status');
        const [label, doneLabel] = words.children;
        const events = new AbortController();
        const config = { command: 'npm i motion-kit', doneMs: 1800, stiffness: 260, damping: 20 };
        const { row, icon, width, media, clamp, settle, animate, idle } = window.LibraryCopySprings({ roll, words, original: copyIcon, success: checkIcon });
        let timer = 0, generation = 0, destroyed = false, copied = false, pending = false;
        const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: events.signal });
        function measure() {
            if (destroyed) return;
            width.t = (copied ? doneLabel : label).getBoundingClientRect().width;
            // A hidden code panel has no measurable text; remeasure when shown.
            if (!width.t) return;
            if (idle()) settle();
        }
        function setCopied(value) {
            copied = value; row.t = icon.t = value ? 1 : 0;
            width.t = (value ? doneLabel : label).getBoundingClientRect().width;
            button.setAttribute('aria-label', value ? '已复制，再次复制' : '复制内容');
            root.dataset.state = value ? 'copied' : 'idle';
            animate();
        }
        function reset() {
            generation++; pending = false; clearTimeout(timer); timer = 0;
            button.removeAttribute('aria-busy'); status.textContent = '';
            setCopied(false); settle();
        }
        function fallbackCopy(text) {
            const active = document.activeElement, selection = document.getSelection();
            const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
            const input = document.createElement('textarea');
            input.value = text; input.setAttribute('readonly', '');
            input.style.cssText = 'position:fixed;left:-9999px;top:0';
            document.body.append(input); input.select();
            try { if (!document.execCommand('copy')) throw new Error('Clipboard unavailable'); }
            finally {
                input.remove(); active?.focus({ preventScroll: true });
                if (selection) { selection.removeAllRanges(); ranges.forEach(range => selection.addRange(range)); }
            }
        }
        async function copy(event) {
            if (!event.isTrusted || destroyed || pending) return;
            pending = true;
            const current = ++generation, text = config.command;
            clearTimeout(timer); timer = 0;
            button.setAttribute('aria-busy', 'true'); status.textContent = '';
            try {
                if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(text);
                else fallbackCopy(text);
                if (destroyed || current !== generation) return;
                status.textContent = '已复制：' + text;
                setCopied(true);
                timer = setTimeout(() => { timer = 0; status.textContent = ''; setCopied(false); }, config.doneMs);
            } catch {
                if (destroyed || current !== generation) return;
                setCopied(false); root.dataset.state = 'error';
                status.textContent = '复制失败，请检查浏览器剪贴板权限后重试。';
            } finally {
                if (!destroyed && current === generation) { pending = false; button.removeAttribute('aria-busy'); }
            }
        }
        function update(next = {}) {
            if (destroyed) return;
            if (next.command !== undefined) config.command = String(next.command).replace(/[\r\n]+/g, ' ').slice(0, 500);
            for (const [key, min, max] of [['doneMs', 500, 4000], ['stiffness', 120, 600], ['damping', 12, 36]]) {
                if (Number.isFinite(Number(next[key]))) config[key] = clamp(Number(next[key]), min, max);
            }
            row.k = config.stiffness; row.c = config.damping;
            reset();
        }
        listen(button, 'click', copy);
        listen(button, 'pointercancel', reset);
        listen(window, 'blur', reset);
        listen(window, 'pagehide', reset);
        listen(document, 'visibilitychange', () => { if (document.hidden) reset(); });
        listen(media, 'change', () => { if (media.matches) settle(); });
        const observer = new ResizeObserver(measure); observer.observe(label); observer.observe(doneLabel);
        document.fonts?.ready.then(measure);
        update(options);
        return {
            update, reset,
            destroy() {
                if (destroyed) return;
                reset(); destroyed = true; events.abort(); observer.disconnect();
            }
        };
    }
    window.LibraryCopyButton = { mount };
})();
