/* Run inside an extracted example: node serve.cjs */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = __dirname;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.jpg':'image/jpeg', '.ttf':'font/ttf', '.txt':'text/plain; charset=utf-8' };
http.createServer((request,response) => {
    let file;
    try {
        const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
        file = path.resolve(root,'.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
        const relative = path.relative(root,file);
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error();
    } catch { response.writeHead(400); response.end(); return; }
    fs.readFile(file,(error,data) => {
        if (error) { response.writeHead(404); response.end('Not found'); return; }
        response.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'}); response.end(data);
    });
}).listen(8000,'127.0.0.1',() => console.log('Example: http://127.0.0.1:8000'));
