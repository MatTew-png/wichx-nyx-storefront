/**
 * ==============================================================================
 * 🛡️ STOREFRONT INTEGRITY & ANTI-REGRESSION TEST SUITE
 * ==============================================================================
 * Verifies that index.html, 200.html, and dist/ builds maintain 100% DOM integrity
 * and never collapse into empty shells.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REQUIRED_DOM_IDS = [
  'hero-carousel-track',
  'category-filter-bar',
  'catalog-container',
  'cart-drawer-container',
  'toast-container',
  'view-home',
  'view-topup',
  'view-history',
  'view-claim'
];

let errors = [];

function checkFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${label} (${filePath})`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const id of REQUIRED_DOM_IDS) {
    if (!content.includes(`id="${id}"`)) {
      errors.push(`Missing DOM id="${id}" in ${label}`);
    }
  }
  if (content.length < 50000) {
    errors.push(`File ${label} is suspiciously small: ${content.length} bytes`);
  }
}

console.log('🔍 [INTEGRITY CHECK] Verifying HTML Templates & Builds...');

// 1. Verify root index.html
checkFile(path.join(ROOT, 'index.html'), 'root index.html');

// 2. Verify root 200.html
checkFile(path.join(ROOT, '200.html'), 'root 200.html');

// 3. Verify dist/index.html
checkFile(path.join(ROOT, 'dist', 'index.html'), 'dist/index.html');

// 4. Verify dist/200.html
checkFile(path.join(ROOT, 'dist', '200.html'), 'dist/200.html');

// 5. Verify sync between index.html and 200.html
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const html200 = fs.readFileSync(path.join(ROOT, '200.html'), 'utf8');
if (indexHtml !== html200) {
  errors.push('root index.html and root 200.html are desynchronized! Run "npm run build" to sync them.');
}

// 6. Verify JS syntax for all modules
const JS_FILES = [
  'database/supabaseClient.js',
  'storeConfig.js',
  'productsData.js',
  'js/core/Store.js',
  'js/core/SecurityEngine.js',
  'js/core/ReceiptGenerator.js',
  'js/core/JulianMotion.js',
  'js/services/AuthService.js',
  'js/services/CatalogService.js',
  'js/services/PaymentService.js',
  'js/services/CheckoutService.js',
  'js/services/HistoryService.js',
  'js/services/ReviewService.js',
  'js/components/UI.js',
  'js/components/Navbar.js',
  'js/components/HeroSection.js',
  'js/components/CatalogView.js',
  'js/components/ReviewsSection.js',
  'js/components/CartDrawer.js',
  'js/components/TopUpModal.js',
  'js/components/HistoryModal.js',
  'js/components/RestockModal.js',
  'js/components/DiscordServiceModal.js',
  'js/components/Modals.js',
  'js/components/SocialProof.js',
  'js/components/AmbientWaves.js',
  'js/visitor-tracker.js',
  'app.js',
  'dist/store.bundle.js'
];

for (const file of JS_FILES) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing JavaScript file: ${file}`);
    continue;
  }
  try {
    const code = fs.readFileSync(fullPath, 'utf8');
    new Function(code);
  } catch (e) {
    errors.push(`Syntax error in ${file}: ${e.message}`);
  }
}

if (errors.length > 0) {
  console.error('\n❌ [INTEGRITY CHECK FAILED]');
  errors.forEach(err => console.error('  - ' + err));
  process.exit(1);
} else {
  console.log('✅ [INTEGRITY CHECK PASSED] All HTML templates, builds, and JS modules are 100% verified and synchronized!\n');
}
