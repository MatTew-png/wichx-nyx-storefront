const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testAnimations() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join('C:\\Users\\_newgen\\AppData\\Local\\Temp', 'chrome_anim_snap_' + Date.now());
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--user-data-dir=' + tempDir,
    '--window-size=1440,900',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://localhost:9227/json');
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
      // 1. Verify canvas ambient waves is active
      const evalCanvas = await sendCmd('Runtime.evaluate', {
        expression: `
          const c = document.getElementById("ambient-cyber-canvas");
          ({
            exists: !!c,
            width: c?.width,
            height: c?.height,
            isEngineRunning: window.Shop?.ambientWaves?.isRunning
          })
        `,
        returnByValue: true
      });
      console.log('🌊 Ambient Wave Status:', evalCanvas.result.value);

      // Take snapshot of normal view with ambient waves
      const snapWaves = await sendCmd('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/_newgen/.gemini/antigravity/brain/6cecc6f0-a534-4757-a529-411c2cde58b5/ambient-waves-render.png', Buffer.from(snapWaves.data, 'base64'));
      console.log('📸 Saved ambient-waves-render.png');

      // 2. Open Modal to test Spring Dialog Bounce
      await sendCmd('Runtime.evaluate', {
        expression: `window.openTopUpModal();`
      });
      // Wait 150ms during spring bounce peak
      await new Promise(r => setTimeout(r, 200));

      const snapModal = await sendCmd('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/_newgen/.gemini/antigravity/brain/6cecc6f0-a534-4757-a529-411c2cde58b5/dialog-bounce-render.png', Buffer.from(snapModal.data, 'base64'));
      console.log('📸 Saved dialog-bounce-render.png');

      proc.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Animation test failed:', err);
    proc.kill();
    process.exit(1);
  }
}

testAnimations().catch(console.error);
