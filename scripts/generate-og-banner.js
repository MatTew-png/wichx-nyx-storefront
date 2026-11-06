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
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      background: #06080C;
      background-image: 
        radial-gradient(ellipse 90% 55% at 50% -10%, rgba(56, 189, 248, 0.08) 0%, transparent 70%),
        radial-gradient(circle at 85% 90%, rgba(30, 58, 138, 0.08) 0%, transparent 60%);
      font-family: 'Space Grotesk', 'IBM Plex Sans Thai', sans-serif;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 64px 84px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Ambient Subtle Hairline Bezel */
    .top-hairline {
      position: absolute;
      top: 0;
      left: 15%;
      right: 15%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.4), rgba(255, 255, 255, 0.6), rgba(56, 189, 248, 0.4), transparent);
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
      gap: 18px;
    }

    .logo-badge {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      color: #FFFFFF;
      font-family: 'Space Grotesk', monospace;
      box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.5);
    }

    .brand-title {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 18px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34D399;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }

    /* Main Headline */
    .headline-area {
      position: relative;
      z-index: 10;
      margin-top: 10px;
    }

    .headline-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #38BDF8;
      font-weight: 600;
      letter-spacing: 1.5px;
      margin-bottom: 14px;
      text-transform: uppercase;
    }

    .headline-main {
      font-size: 40px;
      font-weight: 800;
      line-height: 1.28;
      color: #F8FAFC;
      letter-spacing: -0.02em;
      margin-bottom: 14px;
      max-width: 1020px;
    }

    .headline-sub {
      font-size: 18px;
      color: #94A3B8;
      font-weight: 500;
      line-height: 1.55;
      max-width: 920px;
    }

    /* Feature Pills - Unified Monochrome Luxury Glass */
    .badges-row {
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      z-index: 10;
    }

    .badge-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 14px;
      font-weight: 600;
      color: #E2E8F0;
      box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.4);
    }

    /* Footer URL watermark */
    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      padding-top: 22px;
      position: relative;
      z-index: 10;
    }

    .domain-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 19px;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: 1px;
    }

    .order-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 500;
      color: #64748B;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="top-hairline"></div>

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
    <div class="headline-tag">HIGH-SPEED AUTOMATION DIGITAL STORE</div>
    <div class="headline-main">ร้านค้าบริการ Discord Nitro & Gaming Accounts ส่งออโต้ 24 ชม.</div>
    <div class="headline-sub">ศูนย์รวมบริการ Discord Nitro, บูสต์เซิร์ฟเวอร์, FiveM, Steam GTA V & แอพพรีเมียม ตัดยอดและส่งมอบรหัสทันทีใน 1 วินาที</div>
  </div>

  <!-- Badges - Unified Luxury Glass -->
  <div class="badges-row">
    <div class="badge-card">⚡ จัดส่งรวดเร็วใน 1 วินาที</div>
    <div class="badge-card">🛡️ รับประกันคุณภาพ 24 ชม.</div>
    <div class="badge-card">💳 พร้อมเพย์ QR & TrueMoney</div>
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

console.log('Rendering 1200x630 Luxury Editorial Banner with Headless Chrome...');
execSync(cmd);

if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);

console.log('✅ assets/og-banner.png generated successfully! Size:', fs.statSync(outBannerPath).size, 'bytes');
