const fs = require('fs');
const path = require('path');

const files = ['index.html', '200.html'];

for (const f of files) {
  const filePath = path.join(__dirname, '..', f);
  if (!fs.existsSync(filePath)) continue;

  let html = fs.readFileSync(filePath, 'utf8');
  
  // 1. Remove head anti-tamper script
  html = html.replace(/<head>[\r\n\s]*<!-- =+[\s\S]+?ZERO-LATENCY BROWSER ANTI-TAMPER[\s\S]+?<\/script>[\r\n\s]*<meta charset="UTF-8" \/>/gi, '<head>\n  <meta charset="UTF-8" />');

  // 2. Remove oncontextmenu attribute on <body>
  html = html.replace(/\s*oncontextmenu="return window\.__nyxBlockCtx \? window\.__nyxBlockCtx\(event\) : false;"/gi, '');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ Removed anti-tamper heuristics from ${f}`);
}
