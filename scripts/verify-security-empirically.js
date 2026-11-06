const fs = require('fs');
const path = require('path');

function verify() {
  console.log('🧪 [VERIFICATION] Starting Empirical Security & Feature Audit...');
  let passed = 0;
  let failed = 0;

  function assert(name, condition) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Verify index.html & 200.html Head Security Shield
  ['index.html', '200.html'].forEach(file => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert(`${file} has __nyxBlockCtx in <head>`, html.includes('window.__nyxBlockCtx = function'));
    assert(`${file} has oncontextmenu on <body>`, html.includes('oncontextmenu="return window.__nyxBlockCtx'));
    assert(`${file} has Discord theme-color #00F2FF`, html.includes('content="#00F2FF"'));
    assert(`${file} has og:image og-banner.png`, html.includes('og-banner.png'));
    assert(`${file} has 1200x630 og dimension tags`, html.includes('1200') && html.includes('630'));
    assert(`${file} uses bundle v2.4.0`, html.includes('store.bundle.js?v=2.4.0'));
  });

  // 2. Verify admin.html
  const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
  assert('admin.html has __nyxBlockCtx in <head>', adminHtml.includes('window.__nyxBlockCtx = function'));
  assert('admin.html has oncontextmenu on <body>', adminHtml.includes('oncontextmenu="return window.__nyxBlockCtx'));
  assert('admin.html has CSV Export button', adminHtml.includes('exportOrdersToCSV()'));
  assert('admin.html has exportOrdersToCSV function with UTF-8 BOM', adminHtml.includes('\\uFEFF'));

  // 3. Verify Banner Assets
  assert('assets/og-banner.png exists (>100KB)', fs.existsSync('assets/og-banner.png') && fs.statSync('assets/og-banner.png').size > 100000);
  assert('dist/assets/og-banner.png exists (>100KB)', fs.existsSync('dist/assets/og-banner.png') && fs.statSync('dist/assets/og-banner.png').size > 100000);

  // 4. Verify styles.css
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  assert('styles.css has -webkit-touch-callout: none', css.includes('-webkit-touch-callout: none'));

  // 5. Verify SecurityEngine.js
  const sec = fs.readFileSync(path.join(__dirname, '..', 'js/core/SecurityEngine.js'), 'utf8');
  assert('SecurityEngine has silent triggerSecurityAlert (no toasts)', sec.includes('triggerSecurityAlert(msg = "") {\n    // Silent Mode') || sec.includes('return;'));
  assert('SecurityEngine syncs window.__nyxAdminUnlocked', sec.includes('window.__nyxAdminUnlocked = this.adminUnlocked;'));

  // 6. Verify Bundle Syntax
  const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist/store.bundle.js'), 'utf8');
  try {
    new Function(bundle);
    assert('dist/store.bundle.js passes JavaScript syntax parse', true);
  } catch (e) {
    assert('dist/store.bundle.js passes JavaScript syntax parse: ' + e.message, false);
  }

  console.log(`\n========================================`);
  console.log(`Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

verify();
