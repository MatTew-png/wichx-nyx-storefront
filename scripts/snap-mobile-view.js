const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function snapMobile() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join('C:\\Users\\_newgen\\AppData\\Local\\Temp', 'chrome_snap_mobile_' + Date.now());
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--user-data-dir=' + tempDir,
    '--window-size=390,844',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://localhost:9225/json');
    const tabs = await res.json();
    const pageTab = tabs.find(t => t.type === 'page');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    function sendCmd(method, params = {}) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onopen = async () => {
      const snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
      const outPath = 'C:/Users/_newgen/.gemini/antigravity/brain/6cecc6f0-a534-4757-a529-411c2cde58b5/mobile-view-clean.png';
      fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
      console.log('✅ Mobile screenshot saved to', outPath);

      proc.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Mobile snap failed:', err);
    proc.kill();
    process.exit(1);
  }
}

snapMobile().catch(console.error);
