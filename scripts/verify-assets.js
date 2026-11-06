const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('=== SCRIPT TAGS ===');
const scriptMatches = html.match(/<script[^>]+src="([^">]+)"/g) || [];
for (const tag of scriptMatches) {
  const src = tag.match(/src="([^">]+)"/)[1];
  const isLocal = !src.startsWith('http') && !src.startsWith('//');
  const cleanPath = src.split('?')[0];
  const exists = isLocal ? fs.existsSync(cleanPath) : true;
  console.log(`${src} | Local: ${isLocal} | Exists: ${exists}`);
}

console.log('\n=== CSS / LINK TAGS ===');
const linkMatches = html.match(/<link[^>]+href="([^">]+)"/g) || [];
for (const tag of linkMatches) {
  const href = tag.match(/href="([^">]+)"/)[1];
  const isLocal = !href.startsWith('http') && !href.startsWith('//');
  const cleanPath = href.split('?')[0];
  const exists = isLocal ? fs.existsSync(cleanPath) : true;
  console.log(`${href} | Local: ${isLocal} | Exists: ${exists}`);
}
