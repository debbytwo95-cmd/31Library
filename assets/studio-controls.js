/* Shared parameter-panel wiring for text studios: range outputs, word lists, stage theme and preview/code tabs. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    function ranges(fields, config, onInput) {
        fields.forEach(([key]) => $(key).addEventListener('input', event => { config[key] = Number(event.target.value); onInput(); }));
        return function render() {
            for (const [key, unit] of fields) {
                const input = $(key); input.value = config[key];
                input.style.setProperty('--progress', (100 * (config[key] - Number(input.min)) / (Number(input.max) - Number(input.min))) + '%');
                $(key + '-output').replaceChildren(document.createTextNode(config[key]), ...(unit ? [Object.assign(document.createElement('span'), { textContent: unit })] : []));
            }
        };
    }
    function words(input, config, onInput) {
        input.addEventListener('input', event => {
            const list = event.target.value.split(/[,，\n]/).map(word => word.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
            if (list.length) { config.words = list; onInput(); }
        });
        input.addEventListener('blur', () => { input.value = config.words.join(', '); });
    }
    function themes(stage, root, onChange) {
        const buttons = document.querySelectorAll('[data-stage-theme]');
        buttons.forEach(button => button.addEventListener('click', () => {
            stage.dataset.theme = root.dataset.appearance = button.dataset.stageTheme;
            buttons.forEach(other => { other.classList.toggle('selected', other === button); other.setAttribute('aria-pressed', String(other === button)); });
            onChange();
        }));
    }
    function tabs(stage, onChange) {
        let code = false;
        function set(next) {
            code = next; stage.hidden = next; $('code-panel').hidden = !next;
            [$('preview-tab'), $('code-tab')].forEach((tab, index) => {
                const active = Boolean(index) === next;
                tab.classList.toggle('selected', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
            });
            onChange(next);
        }
        $('preview-tab').addEventListener('click', () => set(false));
        $('code-tab').addEventListener('click', () => set(true));
        document.querySelector('.tabs').addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? false : event.key === 'End' ? true : !code;
            set(next); $(next ? 'code-tab' : 'preview-tab').focus();
        });
        return { get code() { return code; } };
    }
    window.LibraryStudioControls = { ranges, words, themes, tabs };
})();
