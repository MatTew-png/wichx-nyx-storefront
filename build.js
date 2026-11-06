const fs = require('fs');
const path = require('path');

const SOURCE_FILES = [
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
  'js/components/UI.js',
  'js/components/Navbar.js',
  'js/components/HeroSection.js',
  'js/components/CatalogView.js',
  'js/components/CartDrawer.js',
  'js/components/TopUpModal.js',
  'js/components/HistoryModal.js',
  'js/components/RestockModal.js',
  'js/components/DiscordServiceModal.js',
  'js/components/Modals.js',
  'js/components/SocialProof.js',
  'js/components/AmbientWaves.js',
  'js/visitor-tracker.js',
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

  // Copy assets folder into dist/assets for standalone deployability
  const assetsDir = path.join(__dirname, 'assets');
  const distAssetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    fs.cpSync(assetsDir, distAssetsDir, { recursive: true });
    console.log('✅ [BUILD] Synced assets/ into dist/assets/');
  }

  // Validate syntax
  new Function(bundleCode);

  console.log(`✅ [BUILD] dist/store.bundle.js generated successfully! (${Math.round(totalBytes / 1024)} KB)`);

  // Inline CSS and Bundle into index.html and 200.html for 100% Antivirus & Offline Resilience
  const stylesPath = path.join(__dirname, 'styles.css');
  const stylesContent = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';

  const htmlFiles = ['index.html', '200.html'];
  for (const file of htmlFiles) {
    const p = path.join(__dirname, file);
    if (!fs.existsSync(p)) continue;
    let html = fs.readFileSync(p, 'utf8');

    // 1. Replace styles.css link with inline style tag
    const linkRegex = /<link\s+rel="stylesheet"\s+href="styles\.css[^"]*"\s*[^>]*>/i;
    const inlineStyleTag = `<style id="nyx-core-styles">\n${stylesContent}\n</style>`;
    if (linkRegex.test(html)) {
      html = html.replace(linkRegex, inlineStyleTag);
    } else if (html.includes('<style id="nyx-core-styles">')) {
      html = html.replace(/<style id="nyx-core-styles">[\s\S]*?<\/style>/, inlineStyleTag);
    }

    // 2. Replace bundle loader script with inline bundle
    const bundleScriptRegex = /<!-- Unified Storefront Application Engine[\s\S]*?<script[\s\S]*?loadBundle[\s\S]*?<\/script>/i;
    const inlineBundleTag = `<!-- Unified Storefront Application Engine (Direct Inlined for 100% Antivirus Immunity & Zero-Latency) -->\n  <script id="nyx-store-bundle">\n${bundleCode}\n  </script>`;
    
    if (bundleScriptRegex.test(html)) {
      html = html.replace(bundleScriptRegex, inlineBundleTag);
    } else if (html.includes('<script id="nyx-store-bundle">')) {
      html = html.replace(/<!-- Unified Storefront Application Engine[\s\S]*?<script id="nyx-store-bundle">[\s\S]*?<\/script>/, inlineBundleTag);
    }

    fs.writeFileSync(p, html, 'utf8');
    console.log(`✅ [BUILD] Inlined core CSS & JS bundle into ${file} (Antivirus/Firewall Safe)`);
  }
}

build();
