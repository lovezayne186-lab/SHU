const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 5500);
const host = process.env.HOST || '0.0.0.0';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function send(res, statusCode, body, headers) {
  res.writeHead(statusCode, Object.assign({ 'Cache-Control': 'no-store' }, headers || {}));
  res.end(body);
}

function safeResolve(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const abs = path.join(rootDir, normalized);
  if (!abs.startsWith(rootDir)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '/');
  let pathname = parsed.pathname || '/';
  if (pathname === '/') pathname = '/index.html';
  const filePath = safeResolve(pathname);
  if (!filePath) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    let targetPath = filePath;
    if (!statErr && stats.isDirectory()) {
      targetPath = path.join(filePath, 'index.html');
    }

    fs.readFile(targetPath, (readErr, data) => {
      if (readErr) {
        send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
        return;
      }
      const ext = path.extname(targetPath).toLowerCase();
      send(res, 200, data, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    });
  });
});

server.listen(port, host, () => {
  const localUrl = `http://127.0.0.1:${port}`;
  console.log(`Static server running at ${localUrl}`);
  if (host === '0.0.0.0') {
    try {
      const nets = os.networkInterfaces();
      const lanIps = [];
      Object.keys(nets || {}).forEach((name) => {
        const items = Array.isArray(nets[name]) ? nets[name] : [];
        items.forEach((item) => {
          if (!item || item.internal) return;
          if (item.family !== 'IPv4') return;
          lanIps.push(item.address);
        });
      });
      lanIps.forEach((ip) => {
        console.log(`LAN: http://${ip}:${port}`);
      });
    } catch (e) {}
  }
});
