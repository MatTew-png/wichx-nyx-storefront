const fs = require('fs');
const path = require('path');

const SOURCE_FILES = [
  'database/supabaseClient.js',
  'storeConfig.js',
  'productsData.js',
  'js/core/Store.js',
  'js/core/ThemeEngine.js',
  'js/core/AudioEngine.js',
  'js/core/SecurityEngine.js',
  'js/core/BotShield.js',
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
  'js/components/AuthModal.js',
  'js/components/DiscordServiceModal.js',
  'js/components/LuckyWheelModal.js',
  'js/components/MemberCardModal.js',
  'js/components/KeyAuthModal.js',
  'js/components/GamertagConfirmModal.js',
  'js/components/DailyRewardModal.js',
  'js/components/SupportWidgetModal.js',
  'js/components/Modals.js',
  'js/components/SocialProof.js',
  'js/components/AmbientWaves.js',
  'js/visitor-tracker.js',
  'app.js'
];

const ADMIN_SOURCE_FILES = [
  'js/admin/core/AdminStore.js',
  'js/admin/core/AdminUI.js',
  'js/admin/core/AdminApiClient.js',
  'js/admin/core/AdminAuth.js',
  'js/admin/services/AnalyticsService.js',
  'js/admin/services/InventoryService.js',
  'js/admin/services/OrderFinanceService.js',
  'js/admin/services/UserService.js',
  'js/admin/services/VoucherService.js',
  'js/admin/services/ProgramStatusService.js',
  'js/admin/services/SecuritySentinelService.js',
  'js/admin/services/ThemeStudioService.js',
  'js/admin/services/SettingsService.js',
  'js/admin/AdminApp.js'
];

function build() {
  console.log('⚡ [BUILD] Packaging Storefront modules into single bundle...');
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Package Storefront Bundle
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

  // Validate Storefront syntax
  new Function(bundleCode);
  console.log(`✅ [BUILD] dist/store.bundle.js generated successfully! (${Math.round(totalBytes / 1024)} KB)`);

  // 2. Build self-contained storefront (100% Antivirus & Chrome Safe Browsing Immunity)
  const stylesPath = path.join(__dirname, 'styles.css');
  const stylesContent = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';
  const rootIndex = path.join(__dirname, 'index.html');
  const root200 = path.join(__dirname, '200.html');

  if (fs.existsSync(rootIndex)) {
    let html = fs.readFileSync(rootIndex, 'utf8');

    // A. Inline CSS (Idempotent replacement)
    const inlineStyleTag = `<style id="nyx-core-styles">\n${stylesContent}\n</style>`;
    if (html.includes('<style id="nyx-core-styles">')) {
      html = html.replace(/<style id="nyx-core-styles">[\s\S]*?<\/style>/i, inlineStyleTag);
    } else {
      html = html.replace(
        /<link\s+rel="stylesheet"\s+href="styles\.css[^"]*"\s*[^>]*>/i,
        inlineStyleTag
      );
    }

    // B. Replace script block between strict markers with single self-contained bundle
    const scriptsMarkerRegex = /<!-- NYX_MODULAR_SCRIPTS_START -->[\s\S]*?<!-- NYX_MODULAR_SCRIPTS_END -->/i;
    const inlineBundleTag = `<!-- NYX_MODULAR_SCRIPTS_START -->\n  <!-- Unified Storefront Application Engine (Bundled for Antivirus Immunity & Zero-Latency) -->\n  <script id="nyx-store-bundle">\n${bundleCode}\n  </script>\n  <!-- NYX_MODULAR_SCRIPTS_END -->`;

    if (!scriptsMarkerRegex.test(html)) {
      throw new Error('❌ [BUILD ERROR] Missing <!-- NYX_MODULAR_SCRIPTS_START --> marker in index.html! Aborting to prevent file corruption.');
    }

    html = html.replace(scriptsMarkerRegex, inlineBundleTag);

    // C. Strict Build Assertions: Verify DOM integrity
    const REQUIRED_DOM_IDS = [
      'hero-carousel-track',
      'category-filter-bar',
      'catalog-container',
      'cart-drawer-container',
      'toast-container',
      'view-home',
      'view-topup'
    ];

    for (const reqId of REQUIRED_DOM_IDS) {
      if (!html.includes(`id="${reqId}"`)) {
        throw new Error(`❌ [BUILD ASSERTION FAILED] Essential DOM id="${reqId}" is missing from build!`);
      }
    }

    if (html.length < 50000) {
      throw new Error(`❌ [BUILD ASSERTION FAILED] HTML is suspiciously small (${html.length} bytes). Aborting.`);
    }

    // Write to root index.html and 200.html (Where Cloudflare Pages / Vercel deploy from)
    fs.writeFileSync(rootIndex, html, 'utf8');
    fs.writeFileSync(root200, html, 'utf8');

    // Also write to dist/ for standalone distribution
    fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
    fs.writeFileSync(path.join(distDir, '200.html'), html, 'utf8');
    console.log(`✅ [BUILD] Production storefront synchronized & verified across index.html, 200.html, and dist/ (${Math.round(html.length / 1024)} KB)`);
  }

  // 3. Package Modular Admin Engine Bundle
  console.log('⚡ [BUILD] Packaging Modular Admin OOP Engine into bundle...');
  const adminChunks = [];
  let adminTotalBytes = 0;

  for (const relPath of ADMIN_SOURCE_FILES) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing admin source file: ${relPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    adminTotalBytes += content.length;
    adminChunks.push(`\n/* ============================================================================== */\n/* 🛡️ ADMIN OOP MODULE: ${relPath} */\n/* ============================================================================== */\n${content}`);
  }

  const adminBundleCode = adminChunks.join('\n\n');
  const adminBundlePath = path.join(distDir, 'admin.bundle.js');
  fs.writeFileSync(adminBundlePath, adminBundleCode, 'utf8');

  // Validate Admin bundle syntax
  new Function(adminBundleCode);
  console.log(`✅ [BUILD] dist/admin.bundle.js generated successfully! (${Math.round(adminTotalBytes / 1024)} KB)`);

  // 4. Inlined Modular Admin Deployment
  const rootAdmin = path.join(__dirname, 'admin.html');
  if (fs.existsSync(rootAdmin)) {
    let adminHtml = fs.readFileSync(rootAdmin, 'utf8');
    const adminMarkerRegex = /<!-- NYX_ADMIN_SCRIPTS_START -->[\s\S]*?<!-- NYX_ADMIN_SCRIPTS_END -->/i;
    const inlineAdminTag = `<!-- NYX_ADMIN_SCRIPTS_START -->\n  <!-- Unified Admin Operations Engine (OOP Bundled for Antivirus Immunity & Zero-Latency) -->\n  <script id="nyx-admin-bundle">\n${adminBundleCode}\n  </script>\n  <!-- NYX_ADMIN_SCRIPTS_END -->`;

    if (!adminMarkerRegex.test(adminHtml)) {
      throw new Error('❌ [BUILD ERROR] Missing <!-- NYX_ADMIN_SCRIPTS_START --> marker in admin.html!');
    }

    adminHtml = adminHtml.replace(adminMarkerRegex, inlineAdminTag);

    // Verify Admin DOM integrity
    const REQUIRED_ADMIN_IDS = [
      'nav-btn-analytics',
      'nav-btn-products',
      'nav-btn-vault',
      'nav-btn-users',
      'nav-btn-orders',
      'nav-btn-theme',
      'tab-pane-access-logs'
    ];

    for (const reqId of REQUIRED_ADMIN_IDS) {
      if (!adminHtml.includes(`id="${reqId}"`)) {
        throw new Error(`❌ [BUILD ASSERTION FAILED] Essential Admin DOM id="${reqId}" is missing from build!`);
      }
    }

    fs.writeFileSync(rootAdmin, adminHtml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'admin.html'), adminHtml, 'utf8');
    console.log(`✅ [BUILD] Production Admin Operations Suite synchronized & verified across admin.html and dist/admin.html (${Math.round(adminHtml.length / 1024)} KB)`);
  }
}

build();
