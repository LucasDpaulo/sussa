import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import youtube from './desktop/youtube.cjs';
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
http.createServer(async (req, res) => {
  try {
    if (!['127.0.0.1:5173', 'localhost:5173'].includes(req.headers.host)) { res.writeHead(403).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    // Os feeds do YouTube não liberam CORS, então o servidor local busca por você.
    const api = pathname.match(/^\/api\/youtube\/(channel|embeddable)\/([\w-]+)$/);
    if (api) {
      try {
        const body = JSON.stringify(api[1] === 'channel' ? await youtube.channelVideos(api[2]) : await youtube.embeddable(api[2]));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(body);
      } catch { res.writeHead(502).end('[]'); }
      return;
    }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + '/') || /\/\./.test(pathname) || !types[extname(file)]) { res.writeHead(403).end(); return; }
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    res.end(content);
  } catch { res.writeHead(404).end('Não encontrado'); }
}).listen(5173, '127.0.0.1', () => console.log('Sussa: http://127.0.0.1:5173'));
