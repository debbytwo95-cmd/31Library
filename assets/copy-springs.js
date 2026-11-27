/* Shared spring motion for Copy Button and the "复制提示词" delivery button.
   Unit-mass springs; no animation frame is scheduled while idle. */
(() => {
'use strict';
window.LibraryCopySprings = function createCopySprings({ roll, words, original, success, rowHeight = () => 18 }) {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const spring = (k, c) => ({ x: 0, v: 0, t: 0, k, c });
    const row = spring(260, 20), icon = spring(420, 18), width = spring(300, 24), springs = [row, icon, width];
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let frame = 0, previous = 0;
    function render() {
        roll.style.width = Math.max(0, width.x).toFixed(2) + 'px';
        words.style.transform = `translateY(${(-rowHeight() * row.x).toFixed(2)}px)`;
        const i = clamp(icon.x, -.2, 1.2), bounded = clamp(i, 0, 1);
        original.style.opacity = clamp(1 - i * 1.6, 0, 1).toFixed(3);
        original.style.transform = `scale(${(1 - .5 * bounded).toFixed(3)}) rotate(${(-40 * bounded).toFixed(1)}deg)`;
        success.style.opacity = clamp(i * 1.6 - .4, 0, 1).toFixed(3);
        success.style.transform = `scale(${(.4 + .6 * i).toFixed(3)})`;
    }
    function settle() {
        cancelAnimationFrame(frame); frame = 0;
        springs.forEach(s => { s.x = s.t; s.v = 0; }); render();
    }
    function loop(now) {
        frame = 0;
        const dt = Math.min(Math.max((now - previous) / 1000, 0), 1 / 30) / 4;
        previous = now;
        for (let n = 0; n < 4; n++) springs.forEach(s => {
            s.v += (-s.k * (s.x - s.t) - s.c * s.v) * dt;
            s.x += s.v * dt;
        });
        if (springs.every(s => Math.abs(s.x - s.t) < .001 && Math.abs(s.v) < .01)) { settle(); return; }
        render(); frame = requestAnimationFrame(loop);
    }
    function animate() {
        if (media.matches) { settle(); return; }
        if (!frame) { previous = performance.now(); frame = requestAnimationFrame(loop); }
    }
    return { row, icon, width, media, clamp, render, settle, animate, idle: () => !frame };
};
})();
