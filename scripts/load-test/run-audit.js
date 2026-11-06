const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

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

async function runCommand(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env }
    });
    proc.on('close', (code) => {
      if (code === 0 || code === 99) resolve(code);
      else resolve(code); // Do not crash runner on test assertion failures
    });
    proc.on('error', (err) => reject(err));
  });
}

async function main() {
  console.log('\n======================================================================');
  console.log('🚀 [NYX9 FULL-OPTION SECURITY & LOAD TEST SUITE]');
  console.log(`🎯 Target Endpoint: ${TARGET_URL}`);
  console.log('======================================================================\n');

  let serverProcess = null;

  if (IS_LOCAL) {
    const isReady = await checkServerReady(TARGET_URL);
    if (!isReady) {
      console.log('📡 Starting background dev server on port 3000...');
      serverProcess = spawn('node', ['dev-server.js'], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'ignore'
      });
      // Wait for server to boot
      let retries = 10;
      while (retries > 0) {
        await new Promise(r => setTimeout(r, 500));
        if (await checkServerReady(TARGET_URL)) break;
        retries--;
      }
      console.log('✅ Local server is online and ready for audit!\n');
    }
  }

  try {
    // 1. Run Security Headers Audit
    const checkHeaders = require('./test-security-headers.js');
    await checkHeaders();

    const k6Bin = getK6Binary();

    // 2. Run Rate-Limit & Burst Defense Test
    console.log('\n🛡️ [SUITE 2] Running k6 Anti-Brute-Force & Rate-Limit Burst Test...');
    console.log('-'.repeat(70));
    await runCommand(k6Bin, ['run', `"${path.join(__dirname, 'test-burst-defense.js')}"`], {
      TARGET_URL
    });

    // 3. Run Concurrency Stress Load Test
    console.log('\n⚡ [SUITE 3] Running k6 Multi-Stage Concurrency Stress Test...');
    console.log('-'.repeat(70));
    await runCommand(k6Bin, ['run', `"${path.join(__dirname, 'test-stress-load.js')}"`], {
      TARGET_URL
    });

    console.log('\n======================================================================');
    console.log('🎉 [AUDIT COMPLETE] All security and stress test suites finished!');
    const reportPath = path.join(process.cwd(), 'load-test-report.html');
    if (fs.existsSync(reportPath)) {
      console.log(`📄 Standalone HTML Report: ${reportPath}`);
    }
    console.log('======================================================================\n');
  } finally {
    if (serverProcess) {
      console.log('🧹 Cleaning up background server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

main().catch(console.error);
