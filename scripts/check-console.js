const { spawn } = require('child_process');
const path = require('path');

async function checkConsole() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.join('C:\\Users\\_newgen\\AppData\\Local\\Temp', 'chrome_logs_' + Date.now());
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9231',
    '--user-data-dir=' + tempDir,
    'http://localhost:3000'
  ]);
  await new Promise(r => setTimeout(r, 1500));
  const res = await fetch('http://localhost:9231/json');
  const tabs = await res.json();
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

  const logs = [];
  ws.onopen = async () => {
    ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
    ws.send(JSON.stringify({ id: 4, method: 'Page.reload' }));

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        logs.push('[CONSOLE ' + data.params.type + '] ' + data.params.args.map(a => a.value || a.description).join(' '));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        logs.push('[EXCEPTION] ' + data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || ''));
      }
    };

    setTimeout(() => {
      console.log('--- BROWSER LOGS ---');
      logs.forEach(l => console.log(l));
      proc.kill();
      process.exit(0);
    }, 2500);
  };
}
checkConsole();
