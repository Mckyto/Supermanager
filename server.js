#!/usr/bin/env node
/**
 * Server static minimal, fără dependențe, pentru SuperManager 26/27.
 *
 * Servește conținutul din ./public (implicit index.html).
 *   PORT=3000 HOST=0.0.0.0 node server.js
 */
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/** Rezolvă o cerere URL la un fișier din ROOT, fără a ieși din directorul rădăcină. */
function resolveTarget(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch {
    return null; // URI invalid
  }
  if (decoded.includes('\0')) return null;

  const relative = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const target = path.join(ROOT, relative);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;
  return target;
}

async function sendFile(req, res, filePath) {
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    return notFound(res);
  }
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    try {
      stat = await fsp.stat(indexPath);
      filePath = indexPath;
    } catch {
      return notFound(res);
    }
  }

  const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag });
    return res.end();
  }

  const isHtml = path.extname(filePath).toLowerCase() === '.html';
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    ETag: etag,
    // HTML-ul se revalidează mereu; restul se poate cache-ui agresiv.
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  });

  if (req.method === 'HEAD') return res.end();

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

function notFound(res) {
  const body = '404 — Fișier inexistent';
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  const target = resolveTarget(req.url || '/');
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400 — Cerere invalidă');
  }

  sendFile(req, res, target).catch(() => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`SuperManager 26/27 rulează pe http://${HOST}:${PORT}`);
});
