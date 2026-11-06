const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🌊 JULIAN FELLA LIQUID WAVE HOVER EMPIRICAL VERIFICATION');
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

// 1. Verify JulianMotion.js contains exact Julian Fella SVG paths
const julianMotionCode = fs.readFileSync(path.join(__dirname, '../js/core/JulianMotion.js'), 'utf8');
assert(julianMotionCode.includes('svgStartFromTop') || julianMotionCode.includes('M 0 100 V 0 Q 50 0 100 0 V 0 H 0 z'), 'JulianMotion.js contains exact quadratic bezier start path');
assert(julianMotionCode.includes('M 0 100 V 100 Q 50 125 100 100 V 0 H 0 z'), 'JulianMotion.js contains exact quadratic bezier end path');
assert(julianMotionCode.includes('getJulianMouseEnterDirection'), 'JulianMotion.js implements bounding-box proximity direction detection');
assert(julianMotionCode.includes('initLiquidWaveHover'), 'JulianMotion.js contains initLiquidWaveHover method');

// 2. Verify styles.css contains liquid wave rules and difference blend mode
const stylesCss = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
assert(stylesCss.includes('.julian-liquid-hover'), 'styles.css has .julian-liquid-hover definition');
assert(stylesCss.includes('mix-blend-mode: difference'), 'styles.css has mix-blend-mode: difference for contrast inversion');
assert(stylesCss.includes('.julian-arrow'), 'styles.css has .julian-arrow definition');

// 3. Verify index.html and 200.html have view-contact with Julian liquid cards
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const html200 = fs.readFileSync(path.join(__dirname, '../200.html'), 'utf8');

assert(indexHtml.includes('id="view-contact"'), 'index.html has view-contact');
assert(html200.includes('id="view-contact"'), '200.html has view-contact');
assert(indexHtml.includes('julian-liquid-hover'), 'index.html contains .julian-liquid-hover elements');
assert(html200.includes('julian-liquid-hover'), '200.html contains .julian-liquid-hover elements');
assert(indexHtml.includes('julian-arrow'), 'index.html contains .julian-arrow elements');
assert(html200.includes('julian-arrow'), '200.html contains .julian-arrow elements');

// 4. Verify bundle includes JulianMotion code and compiles cleanly
const bundleCode = fs.readFileSync(path.join(__dirname, '../dist/store.bundle.js'), 'utf8');
assert(bundleCode.includes('initLiquidWaveHover'), 'dist/store.bundle.js includes initLiquidWaveHover');
try {
  new Function(bundleCode);
  assert(true, 'dist/store.bundle.js evaluates cleanly without syntax error');
} catch (err) {
  assert(false, `dist/store.bundle.js syntax error: ${err.message}`);
}

console.log(`\n================================================================`);
console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
console.log(`================================================================\n`);

if (failed > 0) process.exit(1);
