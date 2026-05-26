#!/usr/bin/env node
/**
 * scripts/static-server.mjs — minimal static file server for tests + dev.
 *
 *     node scripts/static-server.mjs [port]
 *
 * No deps; uses Node's built-in http + fs. Serves the repo root; resolves
 * "/" to "/index.html"; rejects paths that try to escape the root.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.argv[2] || process.env.PORT || '4173', 10);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
    '.txt':  'text/plain; charset=utf-8',
    '.wasm': 'application/wasm',
    '.gz':   'application/gzip'
};

const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        let rel = decodeURIComponent(url.pathname);
        if (rel === '/' || rel === '') rel = '/index.html';

        const abs = path.normalize(path.join(ROOT, rel));
        // Path-traversal guard.
        if (!abs.startsWith(ROOT)) {
            res.writeHead(403, { 'content-type': 'text/plain' });
            res.end('403 forbidden');
            return;
        }

        const st = await stat(abs).catch(() => null);
        if (!st || !st.isFile()) {
            res.writeHead(404, { 'content-type': 'text/plain' });
            res.end('404 ' + rel);
            return;
        }

        const ext = path.extname(abs).toLowerCase();
        const data = await readFile(abs);
        res.writeHead(200, {
            'content-type':  MIME[ext] || 'application/octet-stream',
            'content-length': data.length,
            'cache-control': 'no-cache',
            // Service Worker requires same-origin; we serve everything from one.
            'service-worker-allowed': '/'
        });
        res.end(data);
    } catch (err) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('500 ' + err.message);
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[static-server] http://127.0.0.1:${PORT}  (root=${ROOT})`);
});
