// Serves dist/ the way Cloudflare Pages will: /x/ -> /x/index.html, plus the
// headers from dist/_headers. For checks only.
//   node scripts/serve.mjs [port]
import http from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.argv[2] ?? 4173);
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain'};
const headers = {};
for (const line of readFileSync(path.join(root, '_headers'), 'utf8').split('\n')) {
  const m = /^\s+([\w-]+):\s*(.+)$/.exec(line);
  if (m) headers[m[1]] = m[2];
}
http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) file = path.join(root, 'index.html');
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', ...headers});
    res.end(readFileSync(file));
  })
  .listen(port, () => console.log(`http://localhost:${port}`));
