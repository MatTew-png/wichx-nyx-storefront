const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const modalIds = ['topup-modal', 'claim-ticket-modal', 'instant-delivery-modal', 'custom-service-modal', 'history-modal', 'cart-drawer-container'];
modalIds.forEach(id => {
  const p = html.indexOf('id="' + id + '"');
  if (p !== -1) {
    console.log('--- ' + id + ' ---');
    console.log(html.slice(p, p + 350));
  } else {
    console.log('--- ' + id + ' (Not in HTML directly) ---');
  }
});
