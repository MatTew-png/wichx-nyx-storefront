const { spawn } = require('child_process');
const path = require('path');

async function inspectCanvas() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join('C:\\Users\\_newgen\\AppData\\Local\\Temp', 'chrome_c_' + Date.now());
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--user-data-dir=' + tempDir,
    'http://localhost:3000'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://localhost:9229/json');
  const tabs = await res.json();
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  ws.onopen = async () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const c = document.getElementById('ambient-cyber-canvas');
          if (!c) return { error: 'canvas not found' };
          const s = getComputedStyle(c);
          const p = document.elementFromPoint(100, 200);
          return {
            zIndex: s.zIndex,
            position: s.position,
            width: c.width,
            height: c.height,
            styleWidth: s.width,
            styleHeight: s.height,
            opacity: s.opacity,
            topEl: p ? p.tagName + '.' + (p.className || '') : null
          };
        })()`,
        returnByValue: true
      }
    }));
    ws.onmessage = (msg) => {
      console.log('Canvas Info:', JSON.parse(msg.data).result?.result?.value);
      proc.kill();
      process.exit(0);
    };
  };
}
inspectCanvas();
