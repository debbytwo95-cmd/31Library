/* Shared tabs for experiments; parameter controls remain project-specific. */
window.mountLabWorkbench = function(options) {
    const preview = document.getElementById('preview-panel'), code = document.getElementById('code-panel');
    let delivery;
    function setTab(showCode) {
        options.clear?.(); preview.hidden = showCode; code.hidden = !showCode;
        ['preview-tab', 'code-tab'].forEach((id, i) => {
            const tab = document.getElementById(id), selected = Boolean(i) === showCode;
            tab.classList.toggle('selected', selected); tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
        });
        if (showCode) delivery?.refresh();
    }
    document.getElementById('preview-tab').addEventListener('click', () => setTab(false));
    document.getElementById('code-tab').addEventListener('click', () => setTab(true));
    document.querySelector('.tabs').addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const showCode = event.key === 'Home' ? false : event.key === 'End' ? true : code.hidden;
        setTab(showCode); document.getElementById(showCode ? 'code-tab' : 'preview-tab').focus();
    });
    delivery = LibraryDelivery.register(options);
    return delivery;
};
