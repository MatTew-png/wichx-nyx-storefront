const fs = require('fs');

let data = fs.readFileSync('productsData.js', 'utf8');
data = data.replace(/[⏳⏱]/g, '');
// Clean up any extra leading/trailing whitespace inside chips
data = data.replace(/chips:\s*\[([^\]]+)\]/g, (match, p1) => {
  const items = p1.split(',').map(s => {
    return s.replace(/"\s+/g, '"').replace(/\s+"/g, '"').trim();
  });
  return `chips: [${items.join(', ')}]`;
});
fs.writeFileSync('productsData.js', data, 'utf8');

// Also update supabaseClient.js regex
let sc = fs.readFileSync('database/supabaseClient.js', 'utf8');
sc = sc.replace(/\\u\{27BF\}/g, '\\u{27BF}\\u{2300}-\\u{23FF}');
fs.writeFileSync('database/supabaseClient.js', sc, 'utf8');

console.log('✅ Cleaned remaining symbols in productsData.js and supabaseClient.js');
