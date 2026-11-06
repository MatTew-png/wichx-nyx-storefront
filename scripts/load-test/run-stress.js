const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const IS_LOCAL = TARGET_URL.includes('localhost') || TARGET_URL.includes('127.0.0.1');

function getK6Binary() {
  const localBin = path.join(__dirname, '../bin/k6.exe');
  if (fs.existsSync(localBin)) return `"${localBin}"`;
  const programFilesPath = 'C:\\Program Files\\k6\\k6.exe';
  if (fs.existsSync(programFilesPath)) return `"${programFilesPath}"`;
  return 'k6';
}

function checkServerReady(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => resolve(res.statusCode === 200 || res.statusCode === 304))
        .on('error', () => resolve(false));
  });
}

(async () => {
  console.log(`\n⚡ [NYX9 CONCURRENCY STRESS TEST] Target: ${TARGET_URL}\n`);

  let serverProcess = null;
  if (IS_LOCAL) {
    const ready = await checkServerReady(TARGET_URL);
    if (!ready) {
      serverProcess = spawn('node', ['dev-server.js'], { cwd: path.join(__dirname, '../..'), stdio: 'ignore' });
      let retries = 10;
      while (retries > 0) {
        await new Promise(r => setTimeout(r, 400));
        if (await checkServerReady(TARGET_URL)) break;
        retries--;
      }
    }
  }

  const k6Bin = getK6Binary();
  const scriptPath = path.join(__dirname, 'test-stress-load.js');

  const proc = spawn(k6Bin, ['run', `"${scriptPath}"`], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, TARGET_URL }
  });

  proc.on('close', (code) => {
    if (serverProcess) serverProcess.kill();
    process.exit(code || 0);
  });
})();
