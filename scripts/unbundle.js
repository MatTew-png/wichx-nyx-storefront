/**
 * ==============================================================================
 * 🔄 UNBUNDLE: RESTORE MODULAR SCRIPT TAGS FOR LOCAL DEVELOPMENT
 * ==============================================================================
 * Replaces the inline production bundle with individual modular <script src="...">
 * tags for easy line-by-line debugging in DevTools.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const rootIndex = path.join(ROOT, 'index.html');
const root200 = path.join(ROOT, '200.html');

if (!fs.existsSync(rootIndex)) {
  console.error('❌ index.html not found!');
  process.exit(1);
}

let html = fs.readFileSync(rootIndex, 'utf8');

// 1. Restore external styles.css link
const styleRegex = /<style id="nyx-core-styles">[\s\S]*?<\/style>/i;
if (styleRegex.test(html)) {
  html = html.replace(styleRegex, '<link rel="stylesheet" href="styles.css">');
}

// 2. Restore modular script tags
const modularBlock = `<!-- NYX_MODULAR_SCRIPTS_START -->
  <!-- 1. Database Adapter & Configurations -->
  <script src="database/supabaseClient.js?v=2.1.0"></script>
  <script src="storeConfig.js?v=2.1.0"></script>
  <script src="productsData.js?v=2.1.0"></script>

  <!-- 2. Core OOP Engines & State Container -->
  <script src="js/core/Store.js?v=2.1.0"></script>
  <script src="js/core/SecurityEngine.js?v=2.1.0"></script>
  <script src="js/core/ReceiptGenerator.js?v=2.1.0"></script>
  <script src="js/core/JulianMotion.js?v=2.1.0"></script>

  <!-- 3. Service Layer (Business Logic & Gateway Engines) -->
  <script src="js/services/AuthService.js?v=2.1.0"></script>
  <script src="js/services/CatalogService.js?v=2.1.0"></script>
  <script src="js/services/PaymentService.js?v=2.1.0"></script>
  <script src="js/services/CheckoutService.js?v=2.1.0"></script>
  <script src="js/services/HistoryService.js?v=2.1.0"></script>

  <!-- 4. UI Component Layer (Encapsulated Views & Modals) -->
  <script src="js/components/UI.js?v=2.1.0"></script>
  <script src="js/components/Navbar.js?v=2.1.0"></script>
  <script src="js/components/HeroSection.js?v=2.1.0"></script>
  <script src="js/components/CatalogView.js?v=2.1.0"></script>
  <script src="js/components/CartDrawer.js?v=2.1.0"></script>
  <script src="js/components/TopUpModal.js?v=2.1.0"></script>
  <script src="js/components/HistoryModal.js?v=2.1.0"></script>
  <script src="js/components/RestockModal.js?v=2.1.0"></script>
  <script src="js/components/DiscordServiceModal.js?v=2.1.0"></script>
  <script src="js/components/Modals.js?v=2.1.0"></script>
  <script src="js/components/SocialProof.js?v=2.1.0"></script>
  <script src="js/components/AmbientWaves.js?v=2.1.0"></script>
  <script src="js/visitor-tracker.js?v=2.1.0"></script>

  <!-- 5. Application Bootstrapper (OOP Coordinator) -->
  <script src="app.js?v=2.1.0"></script>
  <!-- NYX_MODULAR_SCRIPTS_END -->`;

const scriptsMarkerRegex = /<!-- NYX_MODULAR_SCRIPTS_START -->[\s\S]*?<!-- NYX_MODULAR_SCRIPTS_END -->/i;
if (scriptsMarkerRegex.test(html)) {
  html = html.replace(scriptsMarkerRegex, modularBlock);
  fs.writeFileSync(rootIndex, html, 'utf8');
  fs.writeFileSync(root200, html, 'utf8');
  console.log('✅ [UNBUNDLE] Restored modular development scripts in index.html & 200.html');
} else {
  console.error('❌ Could not find <!-- NYX_MODULAR_SCRIPTS_START --> marker');
}
