/**
 * ==============================================================================
 * HERO & TELEMETRY COMPONENT (OOP CONTROLLER - CLEAN CENTERED HERO BANNER)
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

  renderCarousel() {
    const container = document.getElementById("hero-carousel-track") || document.getElementById("hero-carousel-container");
    const dotsContainer = document.getElementById("hero-carousel-dots") || document.getElementById("hero-carousel-indicators");
    if (!container) return;

    const banners = window.storeConfig?.heroBanners || [];
    if (banners.length === 0) return;

    container.innerHTML = banners.map((banner, idx) => {
      const glowColor = banner.themeColor === 'amber' ? 'rgba(245,158,11,0.06)' : (banner.themeColor === 'emerald' ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.08)');

      return `
        <div class="w-full flex-shrink-0 relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-12 border border-white/[0.08] bg-gradient-to-br from-[#0D1017]/95 via-[#0A0C13]/95 to-[#06080C]/95 backdrop-blur-2xl transition-all duration-500 shadow-2xl">
          
          <!-- Background Ambient Flare -->
          <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none" style="background: ${glowColor}"></div>

          <div class="relative z-10 max-w-3xl space-y-4 text-left">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono font-medium text-indigo-400">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span>${banner.badge}</span>
            </div>

            <h2 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-black text-white tracking-wide leading-tight">
              ${banner.title}
              <span class="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-200 to-slate-100 mt-1">
                ${banner.highlight}
              </span>
            </h2>

            <p class="text-slate-300 text-xs sm:text-sm sm:leading-relaxed max-w-2xl font-normal">
              ${banner.description}
            </p>

            <!-- Key Perks List -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              ${(banner.perks || []).map(p => `
                <span class="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-indigo-400"></i>
                  <span>${p}</span>
                </span>
              `).join('')}
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-3 pt-2 sm:pt-4">
              <button onclick="window.handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}', '${banner.productId || ''}')" class="btn-cyber-primary btn-shimmer px-6 py-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer active:scale-95 transition-all shadow-md">
                <span>${banner.ctaText}</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </button>
              
              <button onclick="window.handleBannerSecondaryCta('${banner.secondaryCategory || ''}', '${banner.secondaryAction || ''}')" class="px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs sm:text-sm text-slate-300 hover:text-white font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${banner.secondaryText}</span>
              </button>
            </div>
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
    this.initTiltCards();
    this.startAutoTimer();
  }

  initTiltCards() {
    // Deprecated: Tilt cards removed for clean mobile-first layout
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
