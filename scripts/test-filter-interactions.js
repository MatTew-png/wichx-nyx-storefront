const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testInteractions() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join('C:\\Users\\_newgen\\AppData\\Local\\Temp', 'chrome_test_interact_' + Date.now());
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--user-data-dir=' + tempDir,
    '--window-size=1540,1050',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://localhost:9223/json');
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
      console.log('WS connected. Testing category selection...');

      // 1. Select 'cat-gaming-apps'
      await sendCmd('Runtime.evaluate', {
        expression: "window.Shop.catalogService.setCategoryFilter('cat-gaming-apps');"
      });
      await new Promise(r => setTimeout(r, 500));

      // Capture screenshot of cat-gaming-apps
      const snap1 = await sendCmd('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/_newgen/.gemini/antigravity/brain/6cecc6f0-a534-4757-a529-411c2cde58b5/category-filtered-gaming.png', Buffer.from(snap1.data, 'base64'));
      console.log('✅ Screenshot of Gaming filter saved.');

      // 2. Toggle inStockOnly
      await sendCmd('Runtime.evaluate', {
        expression: "window.Shop.catalogService.toggleInStockOnly(true);"
      });
      await new Promise(r => setTimeout(r, 500));

      const snap2 = await sendCmd('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/_newgen/.gemini/antigravity/brain/6cecc6f0-a534-4757-a529-411c2cde58b5/category-instock-only.png', Buffer.from(snap2.data, 'base64'));
      console.log('✅ Screenshot of In-Stock filter saved.');

      proc.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Interaction test failed:', err);
    proc.kill();
    process.exit(1);
  }
}

testInteractions().catch(console.error);
