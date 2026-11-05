const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function snap() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join('C:\\Users\\_newgen\\AppData\\Local\\Temp', 'chrome_snap_filter_' + Date.now());
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + tempDir,
    '--window-size=1540,1050',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const pageTab = tabs.find(t => t.type === 'page');

    if (!pageTab) throw new Error('No page tab found');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === 1) {
        const outPath = 'C:/Users/_newgen/.gemini/antigravity/brain/6cecc6f0-a534-4757-a529-411c2cde58b5/category-filter-pro.png';
        fs.writeFileSync(outPath, Buffer.from(data.result.data, 'base64'));
        console.log('✅ Screenshot saved to', outPath);
        proc.kill();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error('Error during snap:', err);
    proc.kill();
    process.exit(1);
  }
}

snap().catch(console.error);
