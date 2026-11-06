const fs = require('fs');
['index.html', '200.html'].forEach(f => {
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace(/store\.bundle\.js\?v=[^"']+/g, 'store.bundle.js?v=2.4.0');
  h = h.replace(/styles\.css\?v=[^"']+/g, 'styles.css?v=2.4.0');
  fs.writeFileSync(f, h, 'utf8');
  console.log('Bumped cache buster in', f);
});
