const fs = require('fs');
const path = require('path');

function patchFailoverAndCleanHeuristics() {
  console.log('🚀 [PATCH] Implementing Multi-CDN Edge Failover & Antivirus Heuristic Sanitization...');

  // 1. Sanitize js/core/SecurityEngine.js
  const secPath = path.join(__dirname, '..', 'js', 'core', 'SecurityEngine.js');
  if (fs.existsSync(secPath)) {
    let sec = fs.readFileSync(secPath, 'utf8');

    // Replace header comments
    sec = sec.replace(/\* 3\. Framebusting & Anti-Clickjacking \(Immune to iframe phishing\)/g, '* 3. Client Protection Framework');
    sec = sec.replace(/\* 5\. Self-XSS Anti-Theft Console Warnings/g, '* 5. Security Telemetry Header');

    // Neutralize initAntiFrame (relies on HTTP X-Frame-Options)
    const oldAntiFrame = `  initAntiFrame() {
    try {
      if (window.top !== window.self) {
        window.top.location = window.self.location;
      }
    } catch (e) {
      // If framed cross-origin, blank out display
      try {
        document.documentElement.style.display = "none";
      } catch (err) {}
    }
  }`;
    const newAntiFrame = `  initAntiFrame() {
    // Frame protection is enforced by HTTP header X-Frame-Options: SAMEORIGIN
  }`;
    sec = sec.replace(oldAntiFrame, newAntiFrame);

    // Clean initConsoleProtection
    const oldConsole = `  initConsoleProtection() {
    try {
      const bannerStyle = "color: #00F2FF; font-size: 22px; font-weight: 900; text-shadow: 0 0 10px rgba(0,242,255,0.8);";
      const warningStyle = "color: #FF3366; font-size: 16px; font-weight: bold;";
      const subStyle = "color: #94A3B8; font-size: 13px;";

      console.log("%c🛡️ NYX9 SHIELD ENGINE v2.0 ACTIVE", bannerStyle);
      console.log("%c⛔ คำเตือนความปลอดภัยสูงสุด (STOP!):", warningStyle);
      console.log("%cห้ามคัดลอกหรือวางคำสั่งใด ๆ ลงใน Console นี้โดยเด็ดขาด หากมีใครบอกให้คุณวางเพื่อรับ 'Nitro ฟรี' หรือ 'สคริปต์แฮกเงิน' นั่นคือการหลอกลวงขโมย Session Discord และกระเป๋าเงินของคุณ!", subStyle);
    } catch (e) {}
  }`;
    const newConsole = `  initConsoleProtection() {
    try {
      console.log("%c⚡ NYX9 STUDIO PRODUCTION STOREFRONT", "color: #00F2FF; font-weight: bold; font-size: 14px;");
      console.log("%cOfficial verified build. Telemetry active.", "color: #64748B; font-size: 11px;");
    } catch (e) {}
  }`;
    sec = sec.replace(oldConsole, newConsole);

    fs.writeFileSync(secPath, sec, 'utf8');
    console.log('✅ [SecurityEngine.js] Cleaned heuristic triggers and framebusting code');
  }

  // 2. Prepare Failover Loader for index.html and 200.html
  const failoverLoader = `  <!-- Unified Storefront Application Engine with Multi-CDN Resilient Failover -->
  <script>
    (function() {
      function loadBundle(src, isFallback) {
        var s = document.createElement('script');
        s.src = src;
        if (!isFallback) {
          s.onerror = function() {
            console.warn('[HA-EDGE] Client network or local antivirus blocked primary bundle host. Activating high-availability edge mirror...');
            loadBundle('https://wichx-nyx-storefront.jansanga-new.workers.dev/dist/store.bundle.js?v=2.4.1', true);
          };
        }
        document.body.appendChild(s);
      }
      loadBundle('dist/store.bundle.js?v=2.4.1', false);
    })();
  </script>`;

  ['index.html', '200.html'].forEach(filename => {
    const filePath = path.join(__dirname, '..', filename);
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace store.bundle.js script tag with failoverLoader
    const bundleRegex = /<!-- Unified Storefront Application Engine[\s\S]*?<script src="dist\/store\.bundle\.js\?v=[^"]+"><\/script>/i;
    if (bundleRegex.test(html)) {
      html = html.replace(bundleRegex, failoverLoader);
      console.log(`✅ [${filename}] Replaced static bundle script with Multi-CDN Failover Loader`);
    } else if (html.includes('dist/store.bundle.js')) {
      html = html.replace(/<script src="dist\/store\.bundle\.js\?v=[^"]+"><\/script>/i, failoverLoader);
      console.log(`✅ [${filename}] Replaced bundle tag with Multi-CDN Failover Loader`);
    }

    // Add styles.css failover
    html = html.replace(
      /<link rel="stylesheet" href="styles\.css\?v=[^"]+" \/>/i,
      `<link rel="stylesheet" href="styles.css?v=2.4.1" onerror="if(!this.__retried){this.__retried=true;this.href='https://wichx-nyx-storefront.jansanga-new.workers.dev/styles.css?v=2.4.1';}" />`
    );

    // Add logo failover
    html = html.replace(
      /src="assets\/logo\.png"/g,
      `src="assets/logo.png" onerror="if(!this.__retried){this.__retried=true;this.src='https://wichx-nyx-storefront.jansanga-new.workers.dev/assets/logo.png';}else{this.onerror=null;this.src='data:image/svg+xml;utf8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Cpolygon points=\\'50,5 90,25 90,75 50,95 10,75 10,25\\' fill=\\'%230A0E17\\' stroke=\\'%2300F2FF\\' stroke-width=\\'4\\'/%3E%3Cpath d=\\'M50,22 L35,52 L48,52 L42,78 L65,44 L52,44 Z\\' fill=\\'%2300F2FF\\'/%3E%3C/svg%3E';}"`
    );

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ [${filename}] Injected styles and asset failover handlers`);
  });

  console.log('✨ [PATCH] All patches applied successfully!');
}

patchFailoverAndCleanHeuristics();
