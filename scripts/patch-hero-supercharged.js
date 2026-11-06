const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const p200Path = path.join(__dirname, '..', '200.html');
const storeConfigPath = path.join(__dirname, '..', 'storeConfig.js');
const heroSectionJsPath = path.join(__dirname, '..', 'js', 'components', 'HeroSection.js');
const appJsPath = path.join(__dirname, '..', 'app.js');

// ==============================================================================
// 1. REMOVE "กลับหน้าหลัก" BUTTON FROM HEADER IN index.html
// ==============================================================================
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Remove nav-back-home-btn completely
const backBtnRegex = /<!-- Back to Home Action Button \(Shown on sub-pages\) -->\s*<button id="nav-back-home-btn"[\s\S]*?<\/button>/;
if (backBtnRegex.test(html)) {
  html = html.replace(backBtnRegex, '');
  console.log('✓ Removed nav-back-home-btn from Header');
} else {
  console.log('• nav-back-home-btn not found or already removed');
}

// ==============================================================================
// 2. ENHANCE VALUE PROPS UNDER HERO (NON-REPETITIVE & VALUE-PACKED)
// ==============================================================================
// Replace the old telemetry strip with high-impact 4-Pillar Value Ticker
const telemetryRegex = /<!-- ==============================================================================\s*3\.\s*LIVE TRUST & TELEMETRY STRIP[\s\S]*?<!-- ==============================================================================\s*4\.\s*PRO STORE FILTER/;

const newTelemetryHTML = `<!-- ==============================================================================
         3. PRO STORE VALUE PROPOSITIONS & VERIFIED TRUST TICKER
         ============================================================================== -->
    <div class="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      
      <!-- Value 1: Instant Bot Fulfillment -->
      <div class="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[var(--accent)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,242,255,0.1)]">
          <i data-lucide="zap" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0">
          <div class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
            <span>จัดส่งออโต้ 1-3 วินาที</span>
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div class="text-[10px] text-slate-400 truncate">รหัสเข้าคลังทันทีไม่ต้องรอแอดมิน</div>
        </div>
      </div>

      <!-- Value 2: 100% Buyer Protection -->
      <div class="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <i data-lucide="shield-check" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0">
          <div class="text-xs font-bold text-white truncate">รับประกันคุ้มครอง 100%</div>
          <div class="text-[10px] text-slate-400 truncate">มีปัญหาเคลมเปลี่ยนตัวใหม่ทันที</div>
        </div>
      </div>

      <!-- Value 3: 0% Fee Top-Up -->
      <div class="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <i data-lucide="wallet" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0">
          <div class="text-xs font-bold text-white truncate">เติมเงินฟรีค่าธรรมเนียม 0%</div>
          <div class="text-[10px] text-slate-400 truncate">พร้อมเพย์, TrueMoney, ธนาคาร</div>
        </div>
      </div>

      <!-- Value 4: 24/7 Discord Live Support -->
      <div class="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.1)]">
          <i data-lucide="message-square" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0">
          <div class="text-xs font-bold text-white truncate">แอดมินสแตนด์บาย 24 ชม.</div>
          <div class="text-[10px] text-slate-400 truncate">เปิดทิคเก็ตใน Discord ได้ตลอดเวลา</div>
        </div>
      </div>

    </div>

    <!-- ==============================================================================
         4. PRO STORE FILTER`;

if (telemetryRegex.test(html)) {
  html = html.replace(telemetryRegex, newTelemetryHTML);
  console.log('✓ Replaced repetitive telemetry with 4-Pillar Value Props Ticker');
}

fs.writeFileSync(indexHtmlPath, html, 'utf8');
fs.writeFileSync(p200Path, html, 'utf8');
console.log('✓ Saved to index.html and 200.html');

// ==============================================================================
// 3. SUPERCHARGE storeConfig.heroBanners
// ==============================================================================
let config = fs.readFileSync(storeConfigPath, 'utf8');

const heroBannersRegex = /heroBanners:\s*\[[\s\S]*?\n\s*\],\s*\/\/\s*---\s*ธีมสี/;

const newHeroBannersConfig = `heroBanners: [
    {
      id: "banner-nitro",
      themeColor: "cyan",
      badge: "🔥 FLASH DEAL • ลดพิเศษ 48%",
      title: "DISCORD NITRO & BOOSTS",
      highlight: "ราคาเริ่มต้นเพียง ฿150",
      description: "รหัสแท้ 100% บอทส่งเข้าคลังอัตโนมัติใน 3 วินาที ไม่ต้องให้รหัสผ่านบัญชี พร้อม 2 บูสต์ในตัว ปลดล็อกทุกอิโมจิและส่งไฟล์ขนาดใหญ่ 500MB คุ้มค่าที่สุด",
      perks: ["ไม่ต้องให้รหัสผ่าน", "2x Server Boosts ในตัว", "รับประกันแท้ 30-90 วัน"],
      ctaText: "เลือกซื้อ Nitro ทันที",
      ctaCategory: "cat-discord-nitro",
      secondaryText: "คำนวณราคาบูสต์",
      secondaryAction: "discordCalculator",
      // Right Hologram Card Data
      cardBadge: "SALE -48%",
      cardBadgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      cardTitle: "Nitro Booster (Mailpass 3 เดือน)",
      cardSub: "ยกเมลเปลี่ยนรหัสได้แท้ 100%",
      cardPrice: "฿150.00",
      cardOriginalPrice: "฿290.00",
      cardStock: "พร้อมส่ง 20 ชิ้น",
      cardPerks: [
        { icon: "smile", text: "ใช้อิโมจิ & สติ๊กเกอร์เคลื่อนไหวได้ทุกเซิร์ฟเวอร์" },
        { icon: "rocket", text: "รับ 2x Server Boosts ฟรี ยกระดับเซิร์ฟเวอร์" },
        { icon: "upload", text: "สตรีมภาพ HD 60FPS + ส่งไฟล์สูงสุด 500MB" }
      ],
      productId: "nitro-3m-mailpass"
    },
    {
      id: "banner-fivem",
      themeColor: "amber",
      badge: "🎮 GAMING READY • ปลดแบน HWID",
      title: "FIVEM READY & STEAM แท้",
      highlight: "ไอดีสะอาดแท้ ยกเมล 100%",
      description: "ไอดีสดใหม่ยกเมลเปลี่ยนรหัสและอีเมลหลักได้ทันที ไร้ประวัติแบน คัดเกรดก่อนลงคลัง พร้อมโดดเข้าทุกเซิร์ฟเวอร์ดังได้ทันที ไร้ปัญหากวนใจ",
      perks: ["ยกเมลเปลี่ยนได้ 100%", "เข้าได้ทุกเมืองดัง", "HWID Clean ปลอดภัย"],
      ctaText: "ดูไอดี FiveM พร้อมส่ง",
      ctaCategory: "cat-gaming-apps",
      secondaryText: "ไอดีเกมมิ่งทั้งหมด",
      secondaryCategory: "cat-gaming-apps",
      // Right Hologram Card Data
      cardBadge: "HOT DEAL",
      cardBadgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      cardTitle: "Rockstar FiveM สดใหม่",
      cardSub: "ไอดีสะอาดแท้ 2 ชั้น • พร้อมเล่นทันที",
      cardPrice: "฿10.00",
      cardOriginalPrice: "฿50.00",
      cardStock: "พร้อมส่งในระบบ",
      cardPerks: [
        { icon: "shield", text: "ไอดีสะอาด ไร้ประวัติโดนแบนจากระบบ Global" },
        { icon: "globe", text: "เชื่อมโยงเซิร์ฟเวอร์ FiveM ได้ทุกประเทศ ทุกเมือง" },
        { icon: "key", text: "เปลี่ยนรหัสผ่านและเมลสำรองได้อิสระ 100%" }
      ],
      productId: "rockstar-fivem-fresh"
    },
    {
      id: "banner-wallet",
      themeColor: "emerald",
      badge: "⚡ AUTO 24/7 • ตัดยอด Real-time",
      title: "ระบบเติมเงินอัตโนมัติ",
      highlight: "ฟรีค่าธรรมเนียม 0% เข้าใน 5 วิ",
      description: "รองรับทั้ง พร้อมเพย์ QR Code, ซองของขวัญ TrueMoney, บัญชีธนาคารกสิกร และบัตรเครดิต บอทเช็คยอดอัตโนมัติตลอด 24 ชม. เครดิตเข้ากระเป๋าทันที",
      perks: ["ฟรีค่าธรรมเนียม 0%", "ตัดยอดใน 5-10 วินาที", "เครดิตไม่มีวันหมดอายุ"],
      ctaText: "เติมเงินเข้ากระเป๋าเลย",
      ctaAction: "openTopUp",
      secondaryText: "ดูประวัติคำสั่งซื้อ",
      secondaryAction: "openHistory",
      // Right Hologram Card Data
      cardBadge: "0% FEE",
      cardBadgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      cardTitle: "NYX9 WALLET DEPOSIT",
      cardSub: "ระบบเติมเงินกระเป๋าอัตโนมัติ 24 ชม.",
      cardPrice: "฿0.00 ค่าธรรมเนียม",
      cardOriginalPrice: "",
      cardStock: "บอทออนไลน์ 100%",
      cardPerks: [
        { icon: "qr-code", text: "PromptPay QR สแกนได้ทุกแอปธนาคาร ฟรี" },
        { icon: "gift", text: "ซองของขวัญ TrueMoney บอทรับเงินออโต้" },
        { icon: "lock", text: "ระบบป้องกันสลิปซ้ำด้วย TransRef Security" }
      ],
      productId: null
    }
  ],

  // --- ธีมสี`;

if (heroBannersRegex.test(config)) {
  config = config.replace(heroBannersRegex, newHeroBannersConfig);
  fs.writeFileSync(storeConfigPath, config, 'utf8');
  console.log('✓ Supercharged storeConfig.heroBanners with rich card data');
} else {
  console.error('Could not match heroBannersRegex in storeConfig.js');
}

// ==============================================================================
// 4. SUPERCHARGE HeroSection.js: Split-Screen Interactive Hero Cards
// ==============================================================================
let heroJs = fs.readFileSync(heroSectionJsPath, 'utf8');

const renderCarouselMethodRegex = /renderCarousel\(\)\s*\{[\s\S]*?this\.startAutoTimer\(\);\s*\}/;

const newRenderCarouselMethod = `renderCarousel() {
    const container = document.getElementById("hero-carousel-track") || document.getElementById("hero-carousel-container");
    const dotsContainer = document.getElementById("hero-carousel-dots") || document.getElementById("hero-carousel-indicators");
    if (!container) return;

    const banners = window.storeConfig?.heroBanners || [];
    if (banners.length === 0) return;

    container.innerHTML = banners.map((banner, idx) => {
      const isWallet = !banner.productId;
      const glowColor = banner.themeColor === 'amber' ? 'rgba(245,158,11,0.15)' : (banner.themeColor === 'emerald' ? 'rgba(16,185,129,0.15)' : 'rgba(0,242,255,0.15)');
      const borderColor = banner.themeColor === 'amber' ? 'border-amber-500/30' : (banner.themeColor === 'emerald' ? 'border-emerald-500/30' : 'border-cyan-500/30');

      return \`
        <div class="w-full flex-shrink-0 relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-10 border border-white/[0.08] bg-gradient-to-br from-[#0A0F1A]/95 via-[#070A12]/95 to-[#040609]/95 backdrop-blur-2xl transition-all duration-500 shadow-2xl">
          
          <!-- Background Ambient Flare -->
          <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none" style="background: \${glowColor}"></div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            <!-- Left Column (7 cols): The Hook, Offer, and CTAs -->
            <div class="lg:col-span-7 space-y-4 text-left">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-xs font-mono font-bold text-[var(--accent)]">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>\${banner.badge}</span>
              </div>

              <h2 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-black text-white tracking-wide leading-tight">
                \${banner.title}
                <span class="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-cyan-200 to-blue-400 mt-1">
                  \${banner.highlight}
                </span>
              </h2>

              <p class="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl font-normal">
                \${banner.description}
              </p>

              <!-- Key Perks List -->
              <div class="flex flex-wrap items-center gap-2 pt-1">
                \${(banner.perks || []).map(p => \`
                  <span class="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-cyan-400"></i>
                    <span>\${p}</span>
                  </span>
                \`).join('')}
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-3 pt-2 sm:pt-3">
                <button onclick="window.handleBannerCta('\${banner.ctaCategory || ''}', '\${banner.ctaAction || ''}', '\${banner.productId || ''}')" class="btn-cyber-primary btn-shimmer px-6 py-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-extrabold cursor-pointer active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
                  <span>\${banner.ctaText}</span>
                  <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </button>
                
                <button onclick="window.handleBannerSecondaryCta('\${banner.secondaryCategory || ''}', '\${banner.secondaryAction || ''}')" class="px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs sm:text-sm text-slate-300 hover:text-white font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5 text-slate-400"></i>
                  <span>\${banner.secondaryText}</span>
                </button>
              </div>
            </div>

            <!-- Right Column (5 cols): The Floating Holographic Cyber Card -->
            <div class="lg:col-span-5 flex justify-center">
              <div class="w-full max-w-sm rounded-3xl bg-[#080C16]/90 border \${borderColor} p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-cyan-400/60 transition-all">
                
                <!-- Card Header Tag -->
                <div class="flex items-center justify-between mb-4">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border \${banner.cardBadgeColor}">
                    \${banner.cardBadge}
                  </span>
                  <span class="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>\${banner.cardStock}</span>
                  </span>
                </div>

                <!-- Product Identity -->
                <div class="mb-4">
                  <h3 class="text-base sm:text-lg font-heading font-extrabold text-white leading-snug">
                    \${banner.cardTitle}
                  </h3>
                  <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                    \${banner.cardSub}
                  </p>
                </div>

                <!-- Price Highlight -->
                <div class="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] mb-4 flex items-baseline justify-between">
                  <div>
                    <span class="text-[10px] text-slate-500 uppercase font-mono">ราคาพิเศษ: </span>
                    <span class="text-xl sm:text-2xl font-mono font-extrabold text-[var(--accent)] tracking-tight">
                      \${banner.cardPrice}
                    </span>
                  </div>
                  \${banner.cardOriginalPrice ? \`
                    <span class="text-xs font-mono text-slate-500 line-through">
                      \${banner.cardOriginalPrice}
                    </span>
                  \` : ''}
                </div>

                <!-- Feature Perks List -->
                <div class="space-y-2 mb-5">
                  \${(banner.cardPerks || []).map(cp => \`
                    <div class="flex items-start gap-2.5 text-xs text-slate-300">
                      <div class="w-4 h-4 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                        <i data-lucide="\${cp.icon || 'check'}" class="w-3 h-3"></i>
                      </div>
                      <span class="text-[11px] leading-tight text-slate-300">\${cp.text}</span>
                    </div>
                  \`).join('')}
                </div>

                <!-- 1-Click Interactive Action Button -->
                \${isWallet ? \`
                  <button onclick="window.navigateToPage('topup')" class="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    <span>เติมเงินเข้ากระเป๋าทันที</span>
                  </button>
                \` : \`
                  <button onclick="window.quickBuyProduct('\${banner.productId}')" class="btn-cyber-primary w-full h-11 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all">
                    <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                    <span>สั่งซื้อสินค้านี้ทันที</span>
                  </button>
                \`}

              </div>
            </div>

          </div>
        </div>
      \`;
    }).join("");

    if (dotsContainer) {
      dotsContainer.innerHTML = banners.map((_, idx) => \`
        <button onclick="window.setCarouselSlide(\${idx})" class="w-3 h-1.5 rounded-full transition-all duration-300 \${idx === 0 ? 'w-7 bg-[var(--accent)]' : 'bg-slate-700'}" aria-label="Slide \${idx + 1}"></button>
      \`).join("");
    }

    if (window.lucide) lucide.createIcons();
    this.startAutoTimer();
  }`;

heroJs = heroJs.replace(renderCarouselMethodRegex, newRenderCarouselMethod);
fs.writeFileSync(heroSectionJsPath, heroJs, 'utf8');
console.log('✓ Updated HeroSection.js with Split-Screen Interactive Hero Cards');

// ==============================================================================
// 5. UPDATE app.js: Enhanced handleBannerCta & handleBannerSecondaryCta
// ==============================================================================
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Clean out backBtn references from navigateToPage
appJs = appJs.replace(
  /\/\/ 2\. Toggle Back-to-Home Button in Header[\s\S]*?backBtn\.classList\.add\('flex'\);\s*\}\s*\}/,
  `// 2. Nav Back Home Cleaned (User prefers direct branding click)`
);

// Update handleBannerCta
appJs = appJs.replace(
  /window\.handleBannerCta = \(catId, action\) => \{[\s\S]*?\};/,
  `window.handleBannerCta = (catId, action, productId) => {
  if (action === "openTopUp") {
    window.navigateToPage('topup');
  } else if (action === "openHistory") {
    window.navigateToPage('history');
  } else if (action === "openProduct" && productId) {
    window.quickBuyProduct(productId);
  } else if (catId) {
    window.navigateToPage('home');
    setTimeout(() => {
      const target = document.getElementById(catId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  }
};

window.handleBannerSecondaryCta = (catId, action) => {
  if (action === "discordCalculator") {
    window.openDiscordServicesModal();
  } else if (action === "openHistory") {
    window.navigateToPage('history');
  } else if (action === "openTopUp") {
    window.navigateToPage('topup');
  } else if (catId) {
    window.navigateToPage('home');
    setTimeout(() => {
      const target = document.getElementById(catId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  } else {
    window.navigateToPage('home', '#category-filter-bar');
  }
};`
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ Updated app.js banner CTA routing');

console.log('🎉 Supercharged Hero & Navigation Finished!');
