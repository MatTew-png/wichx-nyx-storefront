/**
 * ==============================================================================
 * HERO & TELEMETRY COMPONENT (OOP CONTROLLER - ASYMMETRICAL SPLIT BENTO)
 * ==============================================================================
 */

class HeroSectionComponent {
  constructor(store) {
    this.store = store;
    this.timer = null;
  }

  render() {
    this.renderCarousel();
    this.renderTelemetry();
  }

  getBannerArtwork(banner) {
    if (banner.imageUrl && banner.imageUrl.trim() !== "") {
      return banner.imageUrl;
    }
    const type = banner.artType || (banner.id?.includes("2") || banner.title?.includes("FIVEM") ? "fivem" : banner.id?.includes("3") || banner.title?.includes("ชำระ") ? "payment" : "discord");
    
    if (type === "fivem") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 280" width="100%" height="100%">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE066"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="cyanGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F2FF"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <radialGradient id="centerBurstGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="#00F2FF" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <circle cx="190" cy="140" r="120" fill="url(#centerBurstGold)"/>
  <ellipse cx="190" cy="140" rx="145" ry="46" fill="none" stroke="rgba(245,158,11,0.22)" stroke-width="1.5" stroke-dasharray="6 6" transform="rotate(-12 190 140)"/>
  <ellipse cx="190" cy="140" rx="145" ry="46" fill="none" stroke="rgba(0,242,255,0.25)" stroke-width="1.5" stroke-dasharray="8 6" transform="rotate(16 190 140)"/>
  <polygon points="190,30 285,78 285,188 190,248 95,188 95,78" fill="#0A0E17" stroke="url(#cyanGrad2)" stroke-width="2.5" stroke-linejoin="round"/>
  <polygon points="190,44 270,84 270,180 190,234 110,180 110,84" fill="none" stroke="rgba(245,158,11,0.25)" stroke-width="1" stroke-dasharray="5 5"/>
  <path d="M148,82 L190,192 L232,82 L211,82 L190,148 L169,82 Z" fill="url(#goldGrad)" filter="url(#glowGold)"/>
  <circle cx="190" cy="72" r="13" fill="#0A0E17" stroke="#00F2FF" stroke-width="2"/>
  <path d="M185,72 L188,75 L196,67" fill="none" stroke="#00F2FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="105" y="202" width="170" height="26" rx="13" fill="#0B101A" stroke="url(#goldGrad)" stroke-width="1.5"/>
  <circle cx="122" cy="215" r="4" fill="#F59E0B"/>
  <text x="194" y="219" text-anchor="middle" fill="#FFE066" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" letter-spacing="1">CLEAN HWID • STEAM V</text>
</svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    if (type === "payment") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 280" width="100%" height="100%">
  <defs>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="50%" stop-color="#00F2FF"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <radialGradient id="centerBurstGreen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#00F2FF" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <circle cx="190" cy="140" r="120" fill="url(#centerBurstGreen)"/>
  <ellipse cx="190" cy="140" rx="150" ry="48" fill="none" stroke="rgba(16,185,129,0.25)" stroke-width="1.5" stroke-dasharray="6 6" transform="rotate(-15 190 140)"/>
  <ellipse cx="190" cy="140" rx="140" ry="44" fill="none" stroke="rgba(0,242,255,0.22)" stroke-width="1.5" stroke-dasharray="8 6" transform="rotate(20 190 140)"/>
  <polygon points="190,32 280,80 280,195 190,245 100,195 100,80" fill="#0A0E17" stroke="url(#emeraldGrad)" stroke-width="2.5" stroke-linejoin="round"/>
  <polygon points="190,46 265,86 265,188 190,230 115,188 115,86" fill="none" stroke="rgba(16,185,129,0.25)" stroke-width="1" stroke-dasharray="4 4"/>
  <g transform="translate(142, 90) scale(4)" filter="url(#glowGreen)">
    <rect x="2" y="5" width="20" height="14" rx="3" stroke="#00F2FF" stroke-width="1.8" fill="none"/>
    <line x1="2" y1="10" x2="22" y2="10" stroke="#10B981" stroke-width="2"/>
    <rect x="6" y="14" width="4" height="2.5" rx="0.5" fill="#10B981"/>
    <circle cx="17" cy="15" r="1.5" fill="#00F2FF"/>
  </g>
  <rect x="110" y="202" width="160" height="26" rx="13" fill="#0B101A" stroke="url(#emeraldGrad)" stroke-width="1.5"/>
  <circle cx="126" cy="215" r="4" fill="#10B981"/>
  <text x="194" y="219" text-anchor="middle" fill="#10B981" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" letter-spacing="1">FEE 0% • PROMPTPAY QR</text>
</svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    // Default: discord
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 280" width="100%" height="100%">
  <defs>
    <linearGradient id="nitroGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F2FF"/>
      <stop offset="50%" stop-color="#5865F2"/>
      <stop offset="100%" stop-color="#EB459E"/>
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F2FF"/>
      <stop offset="100%" stop-color="#0088FF"/>
    </linearGradient>
    <radialGradient id="centerBurst" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00F2FF" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#5865F2" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glowDrop" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <circle cx="190" cy="140" r="120" fill="url(#centerBurst)"/>
  <ellipse cx="190" cy="140" rx="150" ry="50" fill="none" stroke="rgba(0,242,255,0.22)" stroke-width="1.5" stroke-dasharray="8 6" transform="rotate(-18 190 140)"/>
  <ellipse cx="190" cy="140" rx="130" ry="42" fill="none" stroke="rgba(235,69,158,0.25)" stroke-width="1.5" stroke-dasharray="5 5" transform="rotate(22 190 140)"/>
  <polygon points="190,32 280,80 280,195 190,245 100,195 100,80" fill="#0A0E17" stroke="url(#cyanGrad)" stroke-width="2.5" stroke-linejoin="round"/>
  <polygon points="190,46 265,86 265,188 190,230 115,188 115,86" fill="none" stroke="rgba(0,242,255,0.25)" stroke-width="1" stroke-dasharray="4 4"/>
  <g transform="translate(142, 85) scale(4)" filter="url(#glowDrop)">
    <path d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.2.35-.4.8-.56 1.18a16.8 16.8 0 0 0-5.14 0 9.87 9.87 0 0 0-.57-1.18 18.15 18.15 0 0 0-4.6 1.44A19.12 19.12 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98a12.16 12.16 0 0 1-1.92-.93c.16-.12.32-.24.47-.37a13.1 13.1 0 0 0 11.32 0c.16.13.31.25.47.37-.62.37-1.26.68-1.92.93.35.7.75 1.36 1.2 1.98 2.02-.62 3.92-1.6 5.63-2.87.5-5.46-1.3-10.22-3.3-12.83zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.4 2.15-2.4 1.21 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4zm7.97 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.4 2.15-2.4 1.21 0 2.17 1.08 2.15 2.4 0 1.32-.94 2.4-2.15 2.4z" fill="url(#nitroGlow)"/>
  </g>
  <polygon points="262,48 248,78 260,78 250,105 275,68 261,68" fill="#00F2FF" filter="drop-shadow(0 0 8px #00F2FF)"/>
  <rect x="110" y="202" width="160" height="26" rx="13" fill="#0B101A" stroke="url(#cyanGrad)" stroke-width="1.5"/>
  <circle cx="126" cy="215" r="4" fill="#00F2FF"/>
  <text x="194" y="219" text-anchor="middle" fill="#00F2FF" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" letter-spacing="1">DISCORD 24/7 AUTO</text>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  renderCarousel() {
    const container = document.getElementById("hero-carousel-track") || document.getElementById("hero-carousel-container");
    const dotsContainer = document.getElementById("hero-carousel-dots") || document.getElementById("hero-carousel-indicators");
    if (!container) return;

    const banners = window.storeConfig?.heroBanners || [];
    if (banners.length === 0) return;

    container.innerHTML = banners.map((banner, idx) => {
      const artworkSrc = this.getBannerArtwork(banner);
      return `
      <div class="w-full flex-shrink-0 relative rounded-2xl overflow-hidden p-6 sm:p-8 md:p-10 border border-white/[0.08] bg-[#0A0E17]/92 backdrop-blur-xl transition-all duration-500 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="max-w-xl lg:max-w-2xl space-y-4 relative z-10 flex-1">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(0,242,255,0.06)] border border-[rgba(0,242,255,0.2)] text-xs font-mono-val text-[var(--accent)] font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
            <span>${banner.badge} • ${banner.accentTag}</span>
          </div>

          <h2 class="text-2xl md:text-3xl lg:text-4xl font-heading font-extrabold text-white tracking-wide leading-tight">
            ${banner.title}
          </h2>

          <p class="text-slate-400 text-xs md:text-sm leading-relaxed font-normal font-body max-w-xl">
            ${banner.description}
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button onclick="window.handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}')" class="btn-cyber-primary btn-shimmer px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs md:text-sm font-extrabold cursor-pointer active:scale-95 transition-transform">
              <span>${banner.ctaText}</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
            
            <button onclick="window.openDiscordServicesModal()" class="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white font-medium flex items-center gap-2 transition-all cursor-pointer">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>คำนวณราคาบูสต์</span>
            </button>
          </div>
        </div>

        <!-- Hero Banner Artwork Graphic (Self-contained, always loads 100% after deploy) -->
        <div class="w-full md:w-64 lg:w-80 h-44 sm:h-52 md:h-56 flex-shrink-0 flex items-center justify-center relative z-10 pointer-events-none select-none">
          <img src="${artworkSrc}" alt="${banner.title}" class="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(0,242,255,0.25)] transition-transform duration-500 hover:scale-105" loading="eager" />
        </div>
      </div>
    `;
    }).join("");

    if (dotsContainer) {
      dotsContainer.innerHTML = banners.map((_, idx) => `
        <button onclick="window.setCarouselSlide(${idx})" class="w-3 h-1.5 rounded-full transition-all duration-300 ${idx === 0 ? 'w-7 bg-[var(--accent)]' : 'bg-slate-700'}" aria-label="Slide ${idx + 1}"></button>
      `).join("");
    }

    if (window.lucide) lucide.createIcons();
    this.startAutoTimer();
  }

  goToSlide(index) {
    const container = document.getElementById("hero-carousel-track") || document.getElementById("hero-carousel-container");
    const dotsContainer = document.getElementById("hero-carousel-dots") || document.getElementById("hero-carousel-indicators");
    const banners = window.storeConfig?.heroBanners || [];
    const total = banners.length;
    if (!container || total === 0) return;

    const activeIndex = (index + total) % total;
    container.style.transform = `translateX(-${activeIndex * 100}%)`;

    if (dotsContainer) {
      const dots = dotsContainer.children;
      for (let i = 0; i < dots.length; i++) {
        dots[i].className = i === activeIndex 
          ? "w-7 h-1.5 rounded-full bg-[var(--accent)] transition-all duration-300"
          : "w-3 h-1.5 rounded-full bg-slate-700 transition-all duration-300";
      }
    }

    this.store.set("activeCarouselIndex", activeIndex, true);
  }

  nextSlide() {
    const banners = window.storeConfig?.heroBanners || [];
    let current = this.store.get("activeCarouselIndex") || 0;
    this.goToSlide(current + 1);
  }

  prevSlide() {
    const banners = window.storeConfig?.heroBanners || [];
    let current = this.store.get("activeCarouselIndex") || 0;
    this.goToSlide(current - 1);
  }

  startAutoTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.nextSlide(), 7000);
  }

  renderTelemetry() {
    const metrics = window.storeConfig?.metrics || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setVal("live-visitors-today", metrics.visitorsToday || "12,450");
    setVal("live-orders-today", metrics.ordersToday || "850");
    setVal("live-total-members", metrics.totalMembers || "45,000+");
    setVal("live-visitors-today-m", metrics.visitorsToday || "12,450");
    setVal("live-orders-today-m", metrics.ordersToday || "850");
    setVal("live-total-members-m", metrics.totalMembers || "45,000+");
  }
}

window.HeroSectionComponent = HeroSectionComponent;
