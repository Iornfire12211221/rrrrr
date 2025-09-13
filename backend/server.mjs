import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const cwd = process.cwd();
const distPath = path.join(cwd, 'dist');
const indexPath = path.join(distPath, 'index.html');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function serveFile(filePath, res) {
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath), 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.end(data);
  } catch (e) {
    console.error('Error reading file', filePath, e);
    send(res, 500, 'Internal Server Error');
  }
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '/');
  const pathname = decodeURIComponent(parsed.pathname || '/');

  if (req.method === 'HEAD' && (pathname === '/' || pathname === '/health')) {
    res.writeHead(200);
    return res.end();
  }

  if (pathname === '/health' || pathname === '/status' || pathname === '/ping') {
    return send(res, 200, 'OK', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  // Static files
  const requested = pathname.replace(/^\/+/, '');
  const filePath = path.join(distPath, requested);
  if (requested && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(filePath, res);
  }

  // SPA fallback
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(indexPath).pipe(res);
  }

  return send(res, 200, 'Server running. No web build found.');
});

const port = Number(process.env.PORT || 8081);
server.listen(port, '0.0.0.0', () => {
  console.log('HTTP server started on http://0.0.0.0:' + port);
  console.log('CWD:', cwd);
  console.log('dist exists:', fs.existsSync(distPath), 'index exists:', fs.existsSync(indexPath));
});
