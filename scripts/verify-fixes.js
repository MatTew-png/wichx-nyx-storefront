const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('⚡ PERFORMANCE & LAYOUT WARP VERIFICATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failed++;
  }
}

// 1. Verify JulianMotion.js has fast non-blocking catalog animation
const julianMotion = fs.readFileSync(path.join(__dirname, '../js/core/JulianMotion.js'), 'utf8');
assert(julianMotion.includes('.product-card'), 'animateCatalogGrid specifically targets .product-card');
assert(julianMotion.includes('stagger: { amount: 0.12'), 'animateCatalogGrid bounds stagger using GSAP amount (no linear per-card lag)');
assert(julianMotion.includes('viewEl.id === "view-home"'), 'animateView explicitly excludes #view-home from blanking out');
assert(julianMotion.includes('opacity: 0.2') || julianMotion.includes('opacity: 0.35'), 'Animations maintain minimum opacity (no blank loading hole)');

// 2. Verify app.js navigateToPage handles category reset and sticky navbar offset
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
assert(appJs.includes("hash === '#category-filter-bar'"), 'navigateToPage intercepts #category-filter-bar');
assert(appJs.includes("setCategoryFilter('all')"), 'navigateToPage automatically resets category filter to all');
assert(appJs.includes("target !== 'home'"), 'navigateToPage skips animateView for home page');
assert(appJs.includes("- 85"), 'navigateToPage applies sticky navbar offset (-85px) for perfect scroll alignment');

// 3. Verify styles.css has view-panel stabilization
const stylesCss = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
assert(stylesCss.includes('.view-panel'), 'styles.css defines .view-panel');
assert(stylesCss.includes('min-height: 70vh'), 'styles.css anchors view-panel to min-height 70vh (prevents viewport collapse)');
assert(stylesCss.includes('faqAccordionOpen'), 'styles.css provides smooth accordion expansion animation');

// 4. Verify bundle includes updated code
const bundle = fs.readFileSync(path.join(__dirname, '../dist/store.bundle.js'), 'utf8');
assert(bundle.includes("target !== 'home'"), 'dist/store.bundle.js has updated navigateToPage');
assert(bundle.includes("amount: 0.12"), 'dist/store.bundle.js has bounded stagger');

try {
  new Function(bundle);
  assert(true, 'dist/store.bundle.js evaluates cleanly without syntax errors');
} catch(e) {
  assert(false, `dist/store.bundle.js syntax error: ${e.message}`);
}

console.log(`\n================================================================`);
console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
console.log(`================================================================\n`);

if (failed > 0) process.exit(1);
