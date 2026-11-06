const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@600;700;800&family=JetBrains+Mono:wght@700&family=Space+Grotesk:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      background: radial-gradient(circle at 80% 20%, rgba(0, 242, 255, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 20% 80%, rgba(255, 0, 128, 0.12) 0%, transparent 50%),
                  linear-gradient(135deg, #05070D 0%, #0A0F1D 50%, #030508 100%);
      font-family: 'Space Grotesk', 'IBM Plex Sans Thai', sans-serif;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 80px;
      position: relative;
      overflow: hidden;
      border: 4px solid rgba(0, 242, 255, 0.4);
    }

    /* Cyberpunk Grid Mesh Overlay */
    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    /* Top Accent Line */
    .top-glow-bar {
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 4px;
      background: linear-gradient(90deg, transparent, #00F2FF, #FF007A, transparent);
      box-shadow: 0 0 20px #00F2FF;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .logo-badge {
      width: 68px;
      height: 68px;
      border-radius: 20px;
      background: rgba(0, 242, 255, 0.1);
      border: 2px solid #00F2FF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px rgba(0, 242, 255, 0.4);
      font-size: 32px;
      font-weight: 900;
      color: #00F2FF;
      font-family: 'Space Grotesk', monospace;
    }

    .brand-title {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -1px;
      background: linear-gradient(135deg, #FFFFFF 40%, #00F2FF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 40px rgba(0, 242, 255, 0.3);
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 22px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1.5px solid rgba(16, 185, 129, 0.5);
      color: #34D399;
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 700;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 12px #10B981;
    }

    /* Main Headline */
    .headline-area {
      position: relative;
      z-index: 10;
      margin-top: 10px;
    }

    .headline-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      color: #00F2FF;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }

    .headline-main {
      font-size: 42px;
      font-weight: 800;
      line-height: 1.25;
      color: #FFFFFF;
      margin-bottom: 14px;
    }

    .headline-sub {
      font-size: 20px;
      color: #94A3B8;
      font-weight: 600;
      line-height: 1.5;
      max-width: 900px;
    }

    /* Feature Pills */
    .badges-row {
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      z-index: 10;
    }

    .badge-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 15px;
      font-weight: 700;
      color: #E2E8F0;
    }

    .badge-card.cyan {
      border-color: rgba(0, 242, 255, 0.4);
      background: rgba(0, 242, 255, 0.08);
      color: #00F2FF;
    }

    .badge-card.gold {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.08);
      color: #FBBF24;
    }

    /* Footer URL watermark */
    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      position: relative;
      z-index: 10;
    }

    .domain-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 22px;
      font-weight: 700;
      color: #00F2FF;
      letter-spacing: 1px;
    }

    .order-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>
  <div class="top-glow-bar"></div>

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="logo-badge">N9</div>
      <div class="brand-title">NYX9 STUDIO</div>
    </div>
    <div class="status-pill">
      <div class="status-dot"></div>
      <span>SYSTEM ONLINE 24/7</span>
    </div>
  </div>

  <!-- Headline -->
  <div class="headline-area">
    <div class="headline-tag">⚡ HIGH-SPEED AUTOMATION DIGITAL STORE</div>
    <div class="headline-main">ร้านค้าบริการ Discord Nitro & Gaming Accounts ส่งออโต้ 24 ชม.</div>
    <div class="headline-sub">ศูนย์รวมบริการ Discord Nitro, บูสต์เซิร์ฟเวอร์, FiveM, Steam GTA V & แอพพรีเมียม ตัดยอดและส่งมอบรหัสทันทีใน 1 วินาที</div>
  </div>

  <!-- Badges -->
  <div class="badges-row">
    <div class="badge-card cyan">⚡ จัดส่งรวดเร็วใน 1 วินาที</div>
    <div class="badge-card">🛡️ รับประกันคุณภาพ 24 ชม.</div>
    <div class="badge-card gold">💳 พร้อมเพย์ QR & TrueMoney</div>
    <div class="badge-card">🌟 รีวิวแน่น ปลอดภัย 100%</div>
  </div>

  <!-- Footer -->
  <div class="footer-bar">
    <div class="domain-text">HTTPS://NYXNING.SHOP/</div>
    <div class="order-counter">GUARANTEED OVER 660,000+ ORDERS DELIVERED</div>
  </div>
</body>
</html>
`;

const tempHtmlPath = path.join(__dirname, 'temp_banner.html');
const outBannerPath = path.join(__dirname, '..', 'assets', 'og-banner.png');

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --window-size=1200,630 --screenshot="${outBannerPath}" "${tempHtmlPath}"`;

console.log('Rendering 1200x630 Cyberpunk Banner with Headless Chrome...');
execSync(cmd);

if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);

console.log('✅ assets/og-banner.png generated successfully! Size:', fs.statSync(outBannerPath).size, 'bytes');
