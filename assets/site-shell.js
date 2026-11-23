/* Shared navigation and the embedded cover bridge; no synthetic interaction. */
(() => {
    const script = document.currentScript;
    const root = new URL('../', script.src);
    const cover = document.documentElement.hasAttribute('data-cover');
    const catalog = script.hasAttribute('data-catalog');
    const requested = new URLSearchParams(location.search).get('section');
    const section = catalog && ['components', 'blocks', 'lab'].includes(requested) ? requested : script.dataset.section || 'components';
    const localPath = new URL(location.href).pathname.slice(root.pathname.length).split('/');
    const category = section === 'components' && !catalog && localPath[0] === 'single-web' && localPath[1] === 'components' && localPath[3] ? localPath[2] : script.dataset.category;
    if (category) document.querySelector('.workspace')?.setAttribute('data-category', category);
    if (cover) {
        const stage = document.getElementById('preview-panel') || document.querySelector('.preview, .hero');
        const button = stage.querySelector('#mag, #icon-cta, #curve-cta, #hold-cta');
        const report = () => {
            if (button) stage.style.setProperty('--cover-component-height', `${button.offsetHeight}px`);
            parent.postMessage({ type: 'library:cover-size', height: stage.offsetHeight }, location.origin);
        };
        new ResizeObserver(report).observe(button || stage);
        document.fonts.ready.then(report);
        report();
        stage.addEventListener('click', event => {
            if (event.target.closest('button')) parent.postMessage({ type: 'library:cover-open' }, location.origin);
        });
        document.addEventListener('pointerleave', () => button?.blur());
        return;
    }

    const index = new URL('index.html', root);
    const sectionURL = name => {
        const url = new URL(name === 'components' ? 'single-web/components/index.html' : 'index.html', root);
        url.searchParams.set('section', name);
        if (name === 'components' && category) url.searchParams.set('category', category);
        return url;
    };
    const header = document.createElement('header');
    header.className = 'library-header';
    header.id = 'top';
    header.innerHTML = `<div class="library-header-left"><a class="library-logo" href="${index.href}" aria-label="31Library 首页">31Library</a><nav class="library-nav" aria-label="资源板块">${[['components', '组件'], ['blocks', '区块'], ['lab', '实验室']].map(([id, label]) => `<a class="library-nav-item${section === id ? ' active' : ''}" href="${sectionURL(id).href}"${section === id ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></div><form class="library-search" role="search"><span class="library-icon" data-library-icon="search" aria-hidden="true"></span><input type="search" name="q" aria-label="搜索名称、关键词或标签" placeholder="搜索名称、关键词或标签" autocomplete="off"><kbd>${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}K</kbd></form>`;
    const oldHeader = document.querySelector('body > .library-header, body > .site-header, body > .header');
    if (oldHeader) oldHeader.replaceWith(header);
    else document.body.prepend(header);
    const footer = document.createElement('footer');
    footer.className = 'library-footer';
    footer.innerHTML = '<span>31Library · 个人 UI 资源库 · V1.1</span><span>Explore → Preview → Experiment → Refine → Reuse</span>';
    const oldFooter = document.querySelector('body > footer');
    if (oldFooter) oldFooter.replaceWith(footer);
    else document.body.append(footer);
    const input = header.querySelector('input');
    if (catalog) input.id = 'search';
    header.querySelector('form').addEventListener('click', () => input.focus());
    header.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        if (catalog) return;
        const url = sectionURL(section);
        url.searchParams.set('q', input.value.trim());
        location.assign(url.href);
    });
    document.addEventListener('keydown', event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault(); input.focus(); input.select();
        }
        if (event.key === 'Escape') input.blur();
    });
    if (catalog) return;
    if (document.querySelector('.main-shell .settings')) {
        const controls = document.createElement('script');
        controls.src = new URL('assets/property-controls.js', root).href;
        document.body.append(controls);
    }
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem('31library:catalog:' + root.pathname) || 'null'); } catch {}
    const savedCategory = saved?.url ? new URL(saved.url, location.href).searchParams.get('category') : null;
    const canRestore = saved?.section === section && saved.url && (!category || ({ buttons: 'button', backgrounds: 'background' }[savedCategory] || savedCategory) === category);
    if (canRestore) {
        const back = new URL(saved.url, location.href);
        if (back.origin === location.origin) {
            back.searchParams.set('restore', '1');
            header.querySelector('.library-nav-item.active').href = back.href;
        }
    }
    document.querySelectorAll('.breadcrumbs a').forEach(link => {
        if (new URL(link.href, location.href).origin === location.origin) {
            const url = new URL(canRestore ? saved.url : sectionURL(section), location.href);
            if (url.origin === location.origin) { url.searchParams.set('restore', '1'); link.href = url.href; }
        }
    });
})();
