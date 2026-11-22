import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { syncCatalog } from './sync-catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function serve({ port = Number(process.env.PORT) || 4173, entry = 'index.html' } = {}) {
    syncCatalog();
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8' };
    const server = http.createServer(async (request, response) => {
        try {
            let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            if (pathname === '/' || pathname === '/31Library' || pathname === '/31Library/') {
                response.writeHead(302, { Location: '/31Library/' + entry }); response.end(); return;
            }
            if (pathname.startsWith('/31Library/')) pathname = pathname.slice('/31Library'.length);
            if (pathname.endsWith('/')) pathname += 'index.html';
            const file = path.resolve(root, '.' + pathname), relative = path.relative(root, file);
            if (relative.startsWith('..') || path.isAbsolute(relative) || /(^|[\\/])\.(git|codex|agents)([\\/]|$)/.test(relative)) { response.writeHead(403); response.end(); return; }
            const data = await readFile(file);
            response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
            response.end(request.method === 'HEAD' ? undefined : data);
        } catch { response.writeHead(404); response.end('Not found'); }
    });
    server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}/31Library/${entry}`));
    return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) serve();
