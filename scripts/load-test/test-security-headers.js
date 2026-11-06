const http = require('http');
const https = require('https');
const { URL } = require('url');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';

async function checkHeaders() {
  console.log(`\n🛡️ [SECURITY SCANNER] Auditing HTTP Security Headers for: ${TARGET_URL}`);
  console.log('='.repeat(70));

  const parsedUrl = new URL(TARGET_URL);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = client.get(TARGET_URL, (res) => {
      const headers = res.headers;
      let score = 0;
      let total = 7;

      function evaluate(headerName, expectedDesc, validator) {
        const val = headers[headerName.toLowerCase()];
        if (val && (!validator || validator(val))) {
          console.log(`  ✅ [PASS] ${headerName.padEnd(28)}: ${val.length > 50 ? val.slice(0, 47) + '...' : val}`);
          score++;
          return true;
        } else {
          console.log(`  ❌ [WARN] ${headerName.padEnd(28)}: ${val || 'NOT CONFIGURED'} (${expectedDesc})`);
          return false;
        }
      }

      evaluate('X-Frame-Options', 'SAMEORIGIN or DENY to prevent Clickjacking', v => ['sameorigin', 'deny'].includes(v.toLowerCase()));
      evaluate('X-Content-Type-Options', 'nosniff to prevent MIME sniffing', v => v.toLowerCase() === 'nosniff');
      evaluate('Referrer-Policy', 'strict-origin-when-cross-origin to protect privacy', Boolean);
      evaluate('Permissions-Policy', 'Restrict unused device sensors (camera, mic)', Boolean);
      evaluate('Cross-Origin-Opener-Policy', 'same-origin to isolate window context', Boolean);
      evaluate('Content-Security-Policy', 'Strict script/style execution whitelist', Boolean);
      evaluate('Access-Control-Allow-Origin', 'CORS boundary defined', Boolean);

      console.log('='.repeat(70));
      console.log(`📊 Security Headers Grade: ${score}/${total} Passed (${Math.round((score / total) * 100)}%)\n`);
      resolve({ score, total });
    });

    req.on('error', (err) => {
      console.error(`❌ Connection Error to ${TARGET_URL}:`, err.message);
      resolve({ score: 0, total: 6, error: err.message });
    });
  });
}

if (require.main === module) {
  (async () => {
    let serverProcess = null;
    const isLocal = TARGET_URL.includes('localhost') || TARGET_URL.includes('127.0.0.1');
    if (isLocal) {
      const ready = await new Promise(r => http.get(TARGET_URL, () => r(true)).on('error', () => r(false)));
      if (!ready) {
        const { spawn } = require('child_process');
        const path = require('path');
        serverProcess = spawn('node', ['dev-server.js'], { cwd: path.join(__dirname, '../..'), stdio: 'ignore' });
        await new Promise(r => setTimeout(r, 600));
      }
    }
    try {
      await checkHeaders();
    } finally {
      if (serverProcess) serverProcess.kill();
    }
  })();
}

module.exports = checkHeaders;
