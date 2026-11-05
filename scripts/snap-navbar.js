const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function snapNavbarCloseUp() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join('C:\\Users\\_newgen\\AppData\\Local\\Temp', 'chrome_nav_snap_' + Date.now());
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--user-data-dir=' + tempDir,
    '--window-size=1200,400',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://localhost:9235/json');
    const tabs = await res.json();
    const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

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
      // Capture clip of navbar only
      const snap = await sendCmd('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: 1200, height: 120, scale: 2 }
      });
      const outPath = 'C:/Users/_newgen/.gemini/antigravity/brain/6cecc6f0-a534-4757-a529-411c2cde58b5/navbar-logo-closeup.png';
      fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
      console.log('✅ Navbar closeup saved to', outPath);

      proc.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Navbar snap failed:', err);
    proc.kill();
    process.exit(1);
  }
}

snapNavbarCloseUp().catch(console.error);
