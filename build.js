const fs = require('fs');
const path = require('path');

const SOURCE_FILES = [
  'database/supabaseClient.js',
  'storeConfig.js',
  'productsData.js',
  'js/core/Store.js',
  'js/services/AuthService.js',
  'js/services/CatalogService.js',
  'js/services/PaymentService.js',
  'js/services/CheckoutService.js',
  'js/services/HistoryService.js',
  'js/components/UI.js',
  'js/components/Navbar.js',
  'js/components/HeroSection.js',
  'js/components/CatalogView.js',
  'js/components/CartDrawer.js',
  'js/components/TopUpModal.js',
  'js/components/HistoryModal.js',
  'js/components/DiscordServiceModal.js',
  'js/components/Modals.js',
  'js/components/SocialProof.js',
  'js/components/AmbientWaves.js',
  'app.js'
];

function build() {
  console.log('⚡ [BUILD] Packaging Storefront modules into single bundle...');
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const chunks = [];
  let totalBytes = 0;

  for (const relPath of SOURCE_FILES) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing source file: ${relPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    totalBytes += content.length;
    chunks.push(`\n/* ============================================================================== */\n/* 📦 MODULE: ${relPath} */\n/* ============================================================================== */\n${content}`);
  }

  const bundleCode = chunks.join('\n\n');
  const bundlePath = path.join(distDir, 'store.bundle.js');
  fs.writeFileSync(bundlePath, bundleCode, 'utf8');

  // Validate syntax
  new Function(bundleCode);

  console.log(`✅ [BUILD] dist/store.bundle.js generated successfully! (${Math.round(totalBytes / 1024)} KB)`);
}

build();
