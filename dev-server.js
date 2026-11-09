const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const SECURITY_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://*.workers.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://gift.truemoney.com https://api.easyslip.com https://api.qrserver.com https://discord.com https://*.workers.dev; frame-ancestors 'self'; base-uri 'self'; form-action 'self';",
  'Access-Control-Allow-Origin': '*'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
  } catch (e) {
    req.query = {};
  }

  // Helper for Express/Vercel compatibility
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (obj) {
    if (!this.getHeader('Content-Type')) {
      this.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }
    this.end(JSON.stringify(obj));
    return this;
  };

  // Route API requests to api/*.js
  if (reqPath.startsWith('/api/')) {
    const apiName = reqPath.replace('/api/', '').replace('.js', '');
    const apiFile = path.join(ROOT, 'api', `${apiName}.js`);

    if (fs.existsSync(apiFile)) {
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; });
      req.on('end', async () => {
        try {
          req.body = bodyData ? JSON.parse(bodyData) : {};
        } catch {
          req.body = {};
        }
        try {
          const handler = require(apiFile);
          await handler(req, res);
        } catch (apiErr) {
          console.error(`[API Error] ${reqPath}:`, apiErr);
          res.status(500).json({ success: false, error: 'INTERNAL_API_ERROR', message: apiErr.message });
        }
      });
      return;
    }
  }

  // Block access to sensitive internal files
  const normalized = reqPath.toLowerCase();
  if (
    normalized.includes('/.') ||
    normalized.startsWith('/database') ||
    normalized.startsWith('/scripts') ||
    normalized.startsWith('/scratch') ||
    normalized.startsWith('/docs') ||
    normalized.endsWith('.sql') ||
    normalized.endsWith('.env') ||
    normalized.endsWith('.md') ||
    normalized === '/package.json' ||
    normalized === '/package-lock.json' ||
    normalized === '/dev-server.js' ||
    normalized === '/build.js' ||
    normalized === '/wrangler.jsonc'
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8', ...SECURITY_HEADERS });
    res.end('Access Denied: Internal Resource Protected');
    return;
  }

  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  let filePath = path.join(ROOT, decodeURIComponent(reqPath));

  // If path doesn't exist, fallback to 200.html for SPA routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...SECURITY_HEADERS
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [LOCAL SERVER RUNNING] http://localhost:${PORT}`);
  console.log(`🌐 Local Network Access: http://127.0.0.1:${PORT}`);
});
