/* Pixel Word Swap, rebuilt from a study of the melius.com hero headline.
   Canvas text: the slot word swaps through a pixel mosaic while the sentence reflows.
   Rotates on its own by default (autoplay); hover, click, Enter or Space swap at once.
   Animation frames run only during a swap; holds use one timer while hovered or playing. */
(() => {
    'use strict';
    const limits = [['fontSize', 24, 96], ['hold', 400, 4000], ['duration', 200, 1600], ['pixel', 4, 25]];
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const clean = (value, max) => String(value).replace(/\s+/g, ' ').trim().slice(0, max);
    const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const split = value => value ? value.split(' ').map(text => ({ text })) : [];
    function mount(root, options = {}) {
        const title = root.querySelector('.library-pixel-word-swap-title');
        const sizer = root.querySelector('.library-pixel-word-swap-sizer');
        const canvas = root.querySelector('.library-pixel-word-swap-canvas');
        const view = canvas.getContext('2d');
        // Offscreen layers: the surrounding words, the slot word alone, and its downsampled copy.
        const layers = [0, 1, 2].map(() => document.createElement('canvas'));
        const [textLayer, wordLayer, mosaicLayer] = layers;
        const text = textLayer.getContext('2d'), word = wordLayer.getContext('2d'), mosaic = mosaicLayer.getContext('2d');
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const events = new AbortController();
        const listen = (target, type, fn) => target.addEventListener(type, fn, { signal:events.signal });
        const config = { prefix:'Create any', words:['image', 'audio', 'video', 'campaign', 'movie'], suffix:'you imagine', fontSize:56, hold:1300, duration:650, pixel:12.5, autoplay:true };
        const m = { w:0, h:0, bleed:0, dpr:1, font:'', spacing:'0px', color:'', size:0, lineHeight:0, ascent:0, descent:0, space:0, widths:new Map(), widest:'', maxSlot:0, maxBlock:2 };
        let index = 0, swap = null, queued = false, hovering = false, playing = false, suspended = false, destroyed = false;
        let frame = 0, timer = 0, drawn = '';
        const slotWidth = value => m.widths.get(value) || 0;
        const sentence = value => [config.prefix, value, config.suffix].filter(Boolean).join(' ');
        function label(target) { title.setAttribute('aria-label', sentence(config.words[target]) + '，切换下一个词'); }
        function read() {
            const style = getComputedStyle(sizer);
            m.size = parseFloat(style.fontSize) || config.fontSize;
            m.lineHeight = parseFloat(style.lineHeight) || m.size * 1.1;
            m.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            m.spacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
            // The ink comes from the custom property: inherited `color` may still be mid-transition.
            m.color = style.getPropertyValue('--pixel-word-swap-text').trim() || style.color;
            prepare(text);
            m.widths = new Map(config.words.map(value => [value, text.measureText(value).width]));
            m.widest = config.words.reduce((a, b) => slotWidth(b) > slotWidth(a) ? b : a);
            m.maxSlot = slotWidth(m.widest);
            return Math.max(m.maxSlot, ...[...split(config.prefix), ...split(config.suffix)].map(item => text.measureText(item.text).width));
        }
        function prepare(ctx) {
            ctx.font = m.font;
            if ('letterSpacing' in ctx) ctx.letterSpacing = m.spacing;
        }
        function measure() {
            if (destroyed) return;
            root.style.setProperty('--pixel-word-swap-size', config.fontSize + 'px');
            m.w = sizer.offsetWidth;
            // Shrink only when a single unbreakable word is wider than the container.
            const unit = read();
            if (m.w > 0 && unit > m.w) {
                root.style.setProperty('--pixel-word-swap-size', Math.max(12, config.fontSize * m.w / unit * .98).toFixed(2) + 'px');read();
            }
            m.bleed = Math.round(m.size * .3);
            m.dpr = window.devicePixelRatio || 1;
            m.maxBlock = Math.max(2, Math.round(m.size * config.pixel / 100));
            // The hidden sizer keeps the longest sentence in flow, with the slot word unbreakable like on the canvas.
            const sample = [config.prefix, m.widest.replace(/ /g, ' '), config.suffix].filter(Boolean).join(' ');
            if (sizer.textContent !== sample) sizer.textContent = sample;
            const metrics = text.measureText(m.widest);
            m.ascent = metrics.fontBoundingBoxAscent ?? m.size * .8;
            m.descent = metrics.fontBoundingBoxDescent ?? m.size * .2;
            m.space = text.measureText(' ').width;
            m.w = sizer.offsetWidth;
            m.h = Math.max(sizer.offsetHeight, breakLines(items(m.widest, m.maxSlot)).length * m.lineHeight);
            const width = m.w + 2 * m.bleed, height = m.h + 2 * m.bleed;
            for (const layer of [canvas, ...layers]) {
                layer.width = Math.max(1, Math.round(width * m.dpr));layer.height = Math.max(1, Math.round(height * m.dpr));
            }
            Object.assign(canvas.style, { width:width + 'px', height:height + 'px', left:-m.bleed + 'px', top:-m.bleed + 'px' });
            for (const ctx of [text, word]) {
                ctx.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);prepare(ctx);
                ctx.fillStyle = m.color;ctx.textBaseline = 'alphabetic';
            }
            drawn = '';paint(performance.now());
            const fonts = document.fonts;
            if (fonts?.check && !fonts.check(m.font, sample)) {
                fonts.load(m.font, sample).then(() => { if (!destroyed && fonts.check(m.font, sample)) measure(); }, () => {});
            }
        }
        function items(current, drawWidth) {
            return [...split(config.prefix), { slot:current }, ...split(config.suffix)].map(item => {
                if (item.slot !== undefined) return { ...item, draw:drawWidth, room:m.maxSlot };
                const width = text.measureText(item.text).width;
                return { ...item, draw:width, room:width };
            });
        }
        // Lines break with the slot at its widest, then each line centres its current width.
        function breakLines(list) {
            const lines = [[]];let used = 0;
            for (const item of list) {
                const line = lines[lines.length - 1], next = line.length ? used + m.space + item.room : item.room;
                if (line.length && next > m.w * 1.02) { lines.push([item]);used = item.room; }
                else { line.push(item);used = next; }
            }
            return lines;
        }
        function layout(current, drawWidth) {
            const lines = breakLines(items(current, drawWidth));
            const width = m.w + 2 * m.bleed, height = m.h + 2 * m.bleed;
            text.clearRect(0, 0, width, height);word.clearRect(0, 0, width, height);
            const top = m.bleed + (m.h - lines.length * m.lineHeight) / 2;
            let rect = null;
            lines.forEach((line, row) => {
                const lineWidth = line.reduce((sum, item, i) => sum + item.draw + (i ? m.space : 0), 0);
                const y = top + row * m.lineHeight, baseline = y + (m.lineHeight - (m.ascent + m.descent)) / 2 + m.ascent;
                let x = m.bleed + (m.w - lineWidth) / 2;
                for (const item of line) {
                    if (item.slot !== undefined) {
                        word.textAlign = 'center';word.fillText(item.slot, x + item.draw / 2, baseline);
                        rect = { x, y, w:item.draw, h:m.lineHeight };
                    } else { text.textAlign = 'left';text.fillText(item.text, x, baseline); }
                    x += item.draw + m.space;
                }
            });
            return rect;
        }
        function compose(block, rect) {
            const width = m.w + 2 * m.bleed, height = m.h + 2 * m.bleed;
            view.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);view.clearRect(0, 0, width, height);
            view.imageSmoothingEnabled = true;view.drawImage(textLayer, 0, 0, width, height);
            if (block <= 1 || !rect) { view.drawImage(wordLayer, 0, 0, width, height);return; }
            // Sample the word layer at one pixel per block, then enlarge without smoothing.
            const cols = Math.max(1, Math.ceil(width / block)), rows = Math.max(1, Math.ceil(height / block)), pad = m.size * .2;
            mosaic.setTransform(1, 0, 0, 1, 0, 0);mosaic.clearRect(0, 0, cols, rows);mosaic.imageSmoothingEnabled = true;
            mosaic.drawImage(wordLayer, 0, 0, wordLayer.width, wordLayer.height, 0, 0, cols, rows);
            view.save();view.beginPath();view.rect(rect.x - pad, rect.y - pad, rect.w + 2 * pad, rect.h + 2 * pad);view.clip();
            view.imageSmoothingEnabled = false;view.drawImage(mosaicLayer, 0, 0, cols, rows, 0, 0, cols * block, rows * block);
            view.restore();
        }
        function paint(now) {
            if (!m.w || !config.words.length) return;
            let current = config.words[index], block = 1, width = slotWidth(current);
            if (swap) {
                const p = clamp((now - swap.start) / config.duration, 0, 1), eased = easeInOutCubic(p);
                current = p < .5 ? swap.from : swap.to;
                block = 1 + Math.round((m.maxBlock - 1) * Math.sin(Math.PI * p));
                width = slotWidth(swap.from) * (1 - eased) + slotWidth(swap.to) * eased;
            }
            const key = current + ':' + block + ':' + width.toFixed(1);
            if (key === drawn) return;
            drawn = key;root.dataset.word = current;
            compose(block, layout(current, width));
        }
        function schedule() {
            clearTimeout(timer);timer = 0;
            if (destroyed || swap || suspended || document.hidden || !(playing || hovering) || config.words.length < 2) return;
            timer = setTimeout(() => { timer = 0;begin(); }, config.hold);
        }
        function finish() {
            cancelAnimationFrame(frame);frame = 0;
            if (swap) { index = swap.target;swap = null; }
            paint(performance.now());
            if (queued) { queued = false;begin(); } else schedule();
        }
        function tick(now) {
            frame = 0;
            if (!swap) return;
            if (now - swap.start >= config.duration) { finish();return; }
            paint(now);frame = requestAnimationFrame(tick);
        }
        function begin() {
            clearTimeout(timer);timer = 0;
            if (destroyed || config.words.length < 2) return;
            const target = (index + 1) % config.words.length;label(target);
            if (media.matches) { index = target;paint(performance.now());schedule();return; }
            swap = { from:config.words[index], to:config.words[target], target, start:performance.now() };
            frame = requestAnimationFrame(tick);
        }
        // Rapid activation keeps at most one swap waiting behind the current one.
        function next() { if (destroyed) return;if (swap) queued = true;else begin(); }
        function play() { if (destroyed) return;playing = true;schedule(); }
        function pause() { playing = hovering = false;queued = false;clearTimeout(timer);timer = 0; }
        function suspend() { suspended = true;clearTimeout(timer);timer = 0; }
        function resume() { suspended = false;schedule(); }
        function reset() {
            if (destroyed) return;
            cancelAnimationFrame(frame);frame = 0;clearTimeout(timer);timer = 0;
            swap = null;queued = false;index = 0;playing = config.autoplay;
            label(0);measure();schedule();
        }
        function update(nextConfig = {}) {
            if (destroyed) return;
            if (nextConfig.prefix !== undefined) config.prefix = clean(nextConfig.prefix, 60);
            if (nextConfig.suffix !== undefined) config.suffix = clean(nextConfig.suffix, 60);
            if (Array.isArray(nextConfig.words)) {
                const words = nextConfig.words.map(value => clean(value, 40)).filter(Boolean).slice(0, 12);
                if (words.length) config.words = words;
            }
            for (const [key, min, max] of limits) {
                if (nextConfig[key] !== undefined && Number.isFinite(Number(nextConfig[key]))) config[key] = clamp(Number(nextConfig[key]), min, max);
            }
            if (nextConfig.autoplay !== undefined) config.autoplay = Boolean(nextConfig.autoplay);
            reset();
        }
        listen(title, 'click', next);
        listen(title, 'pointerenter', event => {
            if (event.pointerType === 'touch') return;
            hovering = true;if (!swap) begin();
        });
        listen(title, 'pointerleave', event => {
            if (event.pointerType === 'touch') return;
            hovering = false;if (!playing) { clearTimeout(timer);timer = 0; }
        });
        listen(window, 'blur', suspend);listen(window, 'pagehide', suspend);
        listen(window, 'focus', resume);listen(window, 'pageshow', resume);
        listen(document, 'visibilitychange', () => { if (document.hidden) suspend();else resume(); });
        listen(media, 'change', () => { if (media.matches && swap) finish(); });
        const resizer = new ResizeObserver(() => measure());resizer.observe(root);
        const watcher = new MutationObserver(() => measure());watcher.observe(root, { attributes:true, attributeFilter:['data-appearance'] });
        document.fonts?.ready.then(() => measure());
        update(options);
        return { next, update, reset, play, pause, refresh:measure, destroy() {
            if (destroyed) return;
            pause();cancelAnimationFrame(frame);frame = 0;swap = null;destroyed = true;
            events.abort();resizer.disconnect();watcher.disconnect();
        } };
    }
    window.LibraryPixelWordSwap = { mount };
})();
