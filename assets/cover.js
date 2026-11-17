if (new URLSearchParams(location.search).get('cover') === '1' && window.parent !== window) {
    document.documentElement.dataset.cover = 'true';
    if (document.currentScript.dataset.kind) document.documentElement.dataset.coverKind = document.currentScript.dataset.kind;
}
