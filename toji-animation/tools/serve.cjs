// Мини-сервер статики (нужен для fetch() аудиофайлов): require('./serve.cjs')(root) → Promise<port>
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav' };
module.exports = root => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
    rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(rsp);
  });
  srv.listen(0, '127.0.0.1', () => res({ port: srv.address().port, close: () => srv.close() }));
});
