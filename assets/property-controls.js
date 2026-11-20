/* Enhance real parameter controls without changing their IDs, values or handlers. */
(() => {
    if (document.documentElement.hasAttribute('data-cover')) return;
    const selector = 'input[type=range], input[type=checkbox], input[type=text], input[type=number], input[type=color], select, textarea';
    let nextId = 0;
    function mount(panel) {
        const syncers = [];
        for (const control of panel.querySelectorAll(selector)) {
            if (control.closest('.library-property')) continue;
            const kind = control.tagName === 'SELECT' ? 'select' : control.tagName === 'TEXTAREA' ? 'text' : control.type;
            let label = control.labels?.[0];
            if (!label) {
                label = document.createElement('label');
                control.id ||= 'library-property-' + ++nextId;
                label.htmlFor = control.id;
                label.textContent = control.getAttribute('aria-label') || control.name || '参数';
            }
            const holder = control.closest('.range-control, .toggle-row, .select-control, .easing-control');
            const row = holder || document.createElement('div');
            if (!holder) (label.parentElement ? label : control).before(row);
            row.classList.add('library-property');
            row.dataset.kind = kind;
            label.classList.add('library-property-label');
            row.append(label, control);
            if (!holder) syncers.push(() => {
                const hidden = control.hidden || label.hidden;
                if (row.hidden !== hidden) row.hidden = hidden;
            });
            if (kind === 'range') {
                const ticks = document.createElement('span');
                ticks.className = 'library-property-ticks';
                ticks.setAttribute('aria-hidden', 'true');
                for (let i = 0; i < 9; i++) ticks.append(document.createElement('i'));
                row.append(ticks);
                syncers.push(() => {
                    const min = Number(control.min || 0), max = Number(control.max || 100);
                    const position = max > min ? Math.min(1, Math.max(0, (Number(control.value) - min) / (max - min))) : 0;
                    row.style.setProperty('--library-property-position', position);
                    row.classList.toggle('is-disabled', control.disabled);
                });
            } else if (kind === 'color') {
                const originalOutput = label.querySelector('output');
                if (originalOutput) originalOutput.hidden = true;
                const hex = document.createElement('input');
                hex.type = 'text'; hex.maxLength = 7; hex.spellcheck = false;
                hex.className = 'library-property-hex';
                hex.setAttribute('aria-label', label.textContent.replace(/#[\da-f]{6}/ig, '').trim() + ' 十六进制颜色');
                const value = document.createElement('div'); value.className = 'library-property-color-value';
                value.append(control, hex); row.append(value);
                const applyHex = () => {
                    const valid = /^#[\da-f]{6}$/i.test(hex.value);
                    hex.setAttribute('aria-invalid', String(!valid));
                    if (valid && hex.value.toLowerCase() !== control.value.toLowerCase()) {
                        control.value = hex.value;
                        control.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                };
                hex.addEventListener('input', applyHex);
                hex.addEventListener('change', applyHex);
                hex.addEventListener('blur', () => { hex.value = control.value.toUpperCase(); hex.removeAttribute('aria-invalid'); });
                syncers.push(() => {
                    if (document.activeElement !== hex) hex.value = control.value.toUpperCase();
                    if (hex.disabled !== control.disabled) hex.disabled = control.disabled;
                    row.classList.toggle('is-disabled', control.disabled);
                });
            } else {
                syncers.push(() => row.classList.toggle('is-disabled', control.disabled));
            }
        }
        const sync = () => syncers.forEach(update => update());
        panel.addEventListener('input', sync);
        panel.addEventListener('change', sync);
        panel.addEventListener('click', () => queueMicrotask(sync));
        new MutationObserver(records => {
            if (records.some(record => record.target.matches(selector) || record.attributeName === 'hidden')) sync();
        }).observe(panel, { subtree: true, attributes: true, attributeFilter: ['style', 'value', 'min', 'max', 'disabled', 'hidden'] });
        sync();
    }
    document.querySelectorAll('.main-shell .settings').forEach(mount);
})();
