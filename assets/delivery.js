/* Delivery actions contain the current component, never the site workbench. */
(() => {
    const root = new URL('../', document.currentScript.src);
    const cache = new Map();
    async function read(url, binary = false) {
        const key = url + ':' + binary;
        if (!cache.has(key)) cache.set(key, fetch(url).then(response => {
            if (!response.ok) throw new Error('Resource unavailable: ' + url);
            return binary ? response.arrayBuffer() : response.text();
        }).catch(error => { cache.delete(key); throw error; }));
        return cache.get(key);
    }
    async function fontCSS(regular = false) {
        const license = await read(new URL('assets/fonts/INTER-OFL.txt', root).href);
        const weights = regular ? [400, 600] : [600];
        const faces = await Promise.all(weights.map(async weight => {
            const bytes = new Uint8Array(await read(new URL(`assets/fonts/inter-${weight}.ttf`, root).href, true));
            let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); });
            return `@font-face{font-family:LibraryButtonInter;font-weight:${weight === 600 ? '500 700' : weight};font-display:swap;src:url(data:font/ttf;base64,${btoa(binary)}) format('truetype')}`;
        }));
        let cjk = '';
        if (regular) {
            const cjkLicense = await read(new URL('assets/fonts/OFL.txt', root).href);
            cjk = `\n/* Noto Sans SC license; font supplied in the example archive\n${cjkLicense.replace(/\*\//g, '* /')}\n*/\n@font-face{font-family:LibraryControlsSC;font-weight:400;font-display:swap;src:url('./assets/noto-sans-sc-variable.ttf') format('truetype')}`;
        }
        return `/* Inter font license\n${license.replace(/\*\//g, '* /')}\n*/\n` + faces.join('\n') + cjk;
    }
    const escapeScript = code => code.replace(/<\/script/gi, '<\\/script');
    function snippet(bundle) {
        return `<!-- HTML：放入目标页面；每个实例保持完整容器 -->\n${bundle.html}\n\n<!-- CSS：引入一次 -->\n<style>\n${bundle.css}\n</style>\n\n<!-- JavaScript：在结构之后初始化，重复执行会先清理旧实例 -->\n<script${bundle.module ? ' type="module"' : ''}>\n${escapeScript(bundle.js)}\n<\/script>`;
    }
    function example(bundle, title) {
        return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;padding:32px;background:${bundle.background || '#f7f7f8'}}.library-example{max-width:1320px;margin:auto;display:grid;min-height:calc(100svh - 64px);align-content:center;justify-items:center}.library-example>.library-magnetic-field,.library-example>.library-fluid-glow,.library-example>.library-earth{width:100%}</style></head><body><main class="library-example">\n${snippet(bundle)}\n</main></body></html>`;
    }
    async function copy(text) {
        if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(text); return; }
        const input = document.createElement('textarea'); input.value = text; input.style.cssText = 'position:fixed;left:-9999px'; document.body.append(input); input.select();
        const ok = document.execCommand('copy'); input.remove(); if (!ok) throw new Error('Clipboard unavailable');
    }
    function download(blob, filename) {
        const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    // Store-only ZIP: local assets remain byte-for-byte intact, including licenses.
    function zip(files) {
        const encode = text => new TextEncoder().encode(text);
        const chunks = [], central = []; let offset = 0, directorySize = 0;
        for (const [path, content] of Object.entries(files)) {
            const name = encode(path), data = typeof content === 'string' ? encode(content) : new Uint8Array(content);
            let crc = -1;
            for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
            crc = (crc ^ -1) >>> 0;
            const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
            h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(12, 33, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
            const entry = new Uint8Array(46 + name.length), c = new DataView(entry.buffer);
            c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); entry.set(name, 46);
            chunks.push(header, data); central.push(entry); offset += header.length + data.length; directorySize += entry.length;
        }
        const end = new Uint8Array(22), e = new DataView(end.buffer);
        e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true); e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
        return new Blob([...chunks, ...central, end], { type: 'application/zip' });
    }
    function register(options) {
        if (document.documentElement.hasAttribute('data-cover')) return { refresh() {} };
        const copyButton = document.getElementById('copy-code'), downloadButton = document.getElementById('download');
        copyButton.querySelector('span') ? copyButton.querySelector('span').textContent = '复制组件代码' : copyButton.textContent = '复制组件代码';
        const downloadLabel = downloadButton.querySelector('span') || downloadButton;
        downloadLabel.textContent = options.archive ? '下载示例（源码包）' : '下载示例';
        const promptButton = document.createElement('button'); promptButton.id = 'copy-prompt'; promptButton.className = 'delivery-secondary';
        promptButton.innerHTML = `<img class="library-icon design-icon" data-library-icon="copy" src="${new URL('assets/icons/copy.svg', root).href}" width="16" height="16" alt=""><span>复制提示词</span>`;
        downloadButton.before(promptButton);
        const status = document.createElement('p'); status.className = 'delivery-status'; status.setAttribute('role', 'status'); downloadButton.closest('.guide').after(status);
        const fallback = document.createElement('dialog'); fallback.className = 'delivery-dialog';
        fallback.innerHTML = '<form method="dialog"><strong>手动复制</strong><button>关闭</button></form><textarea aria-label="待复制内容" readonly></textarea>';
        document.body.append(fallback);
        const notify = (message, state = 'info') => { status.dataset.state = state; status.textContent = message; };
        async function copyText(text, message) {
            try { await copy(text); notify(message, 'success'); }
            catch { fallback.querySelector('textarea').value = text; fallback.showModal(); fallback.querySelector('textarea').select(); notify('请在弹窗中手动复制', 'warning'); }
        }
        copyButton.addEventListener('click', async () => {
            copyButton.disabled = true; copyButton.setAttribute('aria-busy', 'true'); notify('正在准备组件代码…');
            try { const bundle = await options.bundle(); await copyText(snippet(bundle), '已复制组件代码，包含当前参数'); }
            catch { notify('资源读取失败，请通过本地服务打开页面后重试', 'danger'); }
            finally { copyButton.disabled = false; copyButton.setAttribute('aria-busy', 'false'); }
        });
        promptButton.addEventListener('click', () => copyText(options.prompt(), '已复制提示词，包含当前参数'));
        downloadButton.addEventListener('click', async () => {
            downloadButton.disabled = true;
            downloadButton.setAttribute('aria-busy', 'true'); notify('正在准备示例…');
            try {
                const bundle = await options.bundle(true);
                if (options.archive) {
                    download(zip({ 'index.html': example(bundle, options.title), 'README.md': options.readme, 'component.html': snippet(bundle), 'prompt.txt': bundle.prompt || options.prompt(), ...bundle.files }), options.id + '.zip');
                } else download(new Blob([example(bundle, options.title)], { type: 'text/html;charset=utf-8' }), options.id + '.html');
                notify('已下载示例，包含当前参数', 'success');
            } catch { notify('下载失败，请检查本地资源后重试', 'danger'); }
            finally { downloadButton.disabled = false; downloadButton.setAttribute('aria-busy', 'false'); }
        });
        let version = 0;
        async function refresh() {
            const current = ++version;
            if (document.getElementById('code-panel').hidden) return;
            try { const bundle = await options.bundle(); if (current === version) document.getElementById('source-code').textContent = snippet(bundle); }
            catch { if (current === version) document.getElementById('source-code').textContent = '资源读取失败，请通过本地服务打开页面后重试。'; }
        }
        document.getElementById('code-tab').addEventListener('click', refresh);
        document.querySelector('.tabs').addEventListener('keydown', () => queueMicrotask(refresh));
        return { refresh };
    }
    window.LibraryDelivery = { read, fontCSS, snippet, example, zip, register };
})();
