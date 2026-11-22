/* Verify live entries and local resources; optionally request every URL over HTTP. */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { syncCatalog } from './sync-catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://library.test/';
const window = {};
vm.runInNewContext(await readFile(path.join(root, 'assets/catalog-data.js'), 'utf8'), { window });
const entries = window.LibraryCatalog;
const errors = [], seen = new Set(), pending = ['index.html', 'single-web/components/index.html', 'assets/search.svg', 'assets/property-controls.js', ...entries.map(item => item.href)];
try { syncCatalog({ check: true }); } catch (error) { errors.push(error.message); }
const ids = new Set();
for (const item of entries) {
    if (ids.has(item.id) || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(item.id)) errors.push('Invalid / duplicate project ID: ' + item.id);
    ids.add(item.id);
    for (const key of ['title','description','source','href']) if (!item[key]) errors.push(item.id + ': missing ' + key);
    if (!['components','blocks','lab'].includes(item.section)) errors.push('Unknown section: ' + item.section);
    if (!Array.isArray(item.interactions) || !Array.isArray(item.technologies)) errors.push(item.id + ': missing tags');
}
function add(ref, base) {
    if (!ref || ref.startsWith('#') || /^(data:|mailto:|tel:|javascript:)/i.test(ref)) return;
    const url = new URL(ref, base);
    if (url.origin === new URL(origin).origin) pending.push(decodeURIComponent(url.pathname.slice(1)));
}
while (pending.length) {
    const relative = pending.shift().replace(/^\.\//,'');
    if (seen.has(relative)) continue; seen.add(relative);
    const file = path.resolve(root, relative);
    if (path.relative(root, file).startsWith('..')) { errors.push('Escaped repository: ' + relative); continue; }
    try {
        if (!(await stat(file)).isFile()) throw new Error('Not a file');
        const extension = path.extname(file);
        if (!['.html','.css','.js'].includes(extension)) continue;
        const text = await readFile(file, 'utf8');
        let base = new URL(relative, origin);
        if (extension === '.html') {
            const declared = text.match(/<base[^>]+href=["']([^"']+)/i); if (declared) base = new URL(declared[1], base);
            for (const match of text.matchAll(/<(?:script|link|img|a|video|source|iframe|use)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/g)) add(match[1], base);
        }
        if (extension === '.css') for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) add(match[1], base);
        if (extension === '.js') {
            const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
            for (const match of code.matchAll(/(?:import|export)[^;\n]*?\bfrom\s*["']([^"']+)["']/g)) {
                if (match[1].startsWith('.')) add(match[1], base);
                else errors.push(relative + ': bare module import ' + match[1]);
            }
            for (const match of text.matchAll(/new URL\(['"](\.\.?\/[^'"`]+)['"],\s*import\.meta\.url\)/g)) add(match[1], base);
        }
    } catch (error) { errors.push(relative + ': ' + error.message); }
}
if (process.argv[2]) {
    const httpRoot = new URL(process.argv[2].replace(/\/?$/, '/'));
    for (const relative of seen) {
        try { const response = await fetch(new URL(relative, httpRoot), { method: 'HEAD', signal: AbortSignal.timeout(5000) }); if (!response.ok) errors.push(relative + ': HTTP ' + response.status); }
        catch (error) { errors.push(relative + ': ' + error.message); }
    }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${entries.length} projects; ${seen.size} pages and local resources${process.argv[2] ? ' under ' + process.argv[2] : ''}.`);
