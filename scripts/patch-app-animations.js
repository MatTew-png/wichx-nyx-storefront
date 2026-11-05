const fs = require('fs');

const appPath = 'app.js';
let code = fs.readFileSync(appPath, 'utf8');

// 1. Add ambientWaves to constructor
code = code.replace(
  'this.socialProof = new window.SocialProofComponent();',
  'this.socialProof = new window.SocialProofComponent();\n    this.ambientWaves = window.AmbientWavesEngine ? new window.AmbientWavesEngine() : null;'
);

// 2. Call initCardSpotlight and animateMetricsCountUp in init()
code = code.replace(
  'this.socialProof.init();',
  'this.socialProof.init();\n    this.initCardSpotlight();\n    this.animateMetricsCountUp();'
);

// 3. Add methods before renderAcceptedPaymentsFooter
const methods = `  initCardSpotlight() {
    document.addEventListener("mousemove", (e) => {
      const card = e.target.closest?.(".product-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", \`\${e.clientX - rect.left}px\`);
      card.style.setProperty("--mouse-y", \`\${e.clientY - rect.top}px\`);
    }, { passive: true });
  }

  animateMetricsCountUp() {
    const runCount = (id, target, suffix = "", duration = 1200) => {
      const el = document.getElementById(id);
      if (!el) return;
      const startTime = performance.now();
      const frame = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const cur = Math.floor(target * ease);
        el.textContent = cur.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(frame);
    };

    setTimeout(() => {
      runCount("live-visitors-today", 12450);
      runCount("live-visitors-today-m", 12450);
      runCount("live-orders-today", 850);
      runCount("live-orders-today-m", 850);
      runCount("live-total-members", 45000, "+");
      runCount("live-total-members-m", 45000, "+");
    }, 150);
  }

  renderAcceptedPaymentsFooter() {`;

code = code.replace('  renderAcceptedPaymentsFooter() {', methods);

fs.writeFileSync(appPath, code, 'utf8');
console.log('✅ app.js patched with ambient wave, spotlight, and counter animation!');
