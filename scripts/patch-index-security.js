const fs = require('fs');

const path = 'index.html';
let content = fs.readFileSync(path, 'utf8');

const target = '<!-- Cache Invalidation Directives -->';
const replacement = `<!-- Security & Browser Protection Directives -->
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />

  <!-- Cache Invalidation Directives -->`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('✅ Successfully added security meta directives to index.html');
} else {
  console.warn('⚠️ Target string not found in index.html');
}
