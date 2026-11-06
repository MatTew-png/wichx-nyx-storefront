const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const p200Path = path.join(__dirname, '..', '200.html');
const topupJsPath = path.join(__dirname, '..', 'js', 'components', 'TopUpModal.js');
const historyJsPath = path.join(__dirname, '..', 'js', 'components', 'HistoryModal.js');
const modalsJsPath = path.join(__dirname, '..', 'js', 'components', 'Modals.js');
const appJsPath = path.join(__dirname, '..', 'app.js');

let html = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Remove redundant bottom #topup-modal and #claim-ticket-modal
const bottomModalsRegex = /[ \t]*<!-- =+[\r\n\s]+11\.\s*MODAL 4:[^]+?<!-- =+[\r\n\s]+13\.\s*SOCIAL PROOF/m;

if (!bottomModalsRegex.test(html)) {
  console.error('bottomModalsRegex did not match');
  process.exit(1);
}

html = html.replace(bottomModalsRegex, `  <!-- ==============================================================================
       13. SOCIAL PROOF`);

console.log('✓ Redundant bottom modals removed from index.html');

fs.writeFileSync(indexHtmlPath, html, 'utf8');
fs.writeFileSync(p200Path, html, 'utf8');
console.log('✓ Synced to 200.html');

// 2. Update TopUpModal.js
let topupJs = fs.readFileSync(topupJsPath, 'utf8');
topupJs = topupJs.replace(
  /open\(recommendedAmount = 0\) \{[\s\S]*?this\.updatePromptPayQr\(val\);\s*\}/,
  `open(recommendedAmount = 0) {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('topup');
    }
    const input = document.getElementById("promptpay-amount-input");
    const val = recommendedAmount > 0 ? Math.ceil(recommendedAmount) : parseFloat(input?.value || "100");
    if (input) input.value = val;
    this.switchGateway("promptpay");
    this.updatePromptPayQr(val);
  }`
);
topupJs = topupJs.replace(
  /close\(\) \{[\s\S]*?this\.clearFeedbacks\(\);\s*\}/,
  `close() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('home');
    }
    this.clearFeedbacks();
  }`
);
fs.writeFileSync(topupJsPath, topupJs, 'utf8');
console.log('✓ TopUpModal.js updated to route to /topup page');

// 3. Update HistoryModal.js
let historyJs = fs.readFileSync(historyJsPath, 'utf8');
historyJs = historyJs.replace(
  /async open\(\) \{[\s\S]*?this\.render\(\);\s*\}/,
  `async open() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('history');
    }
    this.render();
  }`
);
historyJs = historyJs.replace(
  /close\(\) \{[\s\S]*?modalEl\.classList\.remove\("flex"\);\s*\}/,
  `close() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('home');
    }
  }`
);
fs.writeFileSync(historyJsPath, historyJs, 'utf8');
console.log('✓ HistoryModal.js updated to route to /history page');

// 4. Update Modals.js for Claims
let modalsJs = fs.readFileSync(modalsJsPath, 'utf8');
modalsJs = modalsJs.replace(
  /openClaim\(\) \{[\s\S]*?modal\.classList\.remove\("hidden"\);\s*\}/,
  `openClaim() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('claim');
    }
  }`
);
modalsJs = modalsJs.replace(
  /closeClaim\(\) \{[\s\S]*?modal\.classList\.add\("hidden"\);\s*\}/,
  `closeClaim() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('home');
    }
  }`
);
fs.writeFileSync(modalsJsPath, modalsJs, 'utf8');
console.log('✓ Modals.js updated to route to /claim page');

// 5. Update app.js bridges
let appJs = fs.readFileSync(appJsPath, 'utf8');
appJs = appJs.replace(
  /window\.openTopUpModal = \(amt\) => window\.Shop\.topupModal\.open\(amt\);/,
  `window.openTopUpModal = (amt) => window.Shop?.topupModal?.open(amt);`
);
appJs = appJs.replace(
  /window\.closeTopUpModal = \(\) => window\.Shop\.topupModal\.close\(\);/,
  `window.closeTopUpModal = () => window.Shop?.topupModal?.close();`
);
appJs = appJs.replace(
  /window\.openHistoryModal = \(\) => window\.Shop\.historyModal\.open\(\);/,
  `window.openHistoryModal = () => window.Shop?.historyModal?.open();`
);
appJs = appJs.replace(
  /window\.closeHistoryModal = \(\) => window\.Shop\.historyModal\.close\(\);/,
  `window.closeHistoryModal = () => window.Shop?.historyModal?.close();`
);
appJs = appJs.replace(
  /window\.openClaimModal = \(\) => window\.Shop\.modals\.openClaim\(\);/,
  `window.openClaimModal = () => window.Shop?.modals?.openClaim();`
);
appJs = appJs.replace(
  /window\.closeClaimModal = \(\) => window\.Shop\.modals\.closeClaim\(\);/,
  `window.closeClaimModal = () => window.Shop?.modals?.closeClaim();`
);
fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ app.js bridges updated');

console.log('All redundancies cleaned and consolidated!');
