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

  renderCarousel() {
    const container = document.getElementById("hero-carousel-track") || document.getElementById("hero-carousel-container");
    const dotsContainer = document.getElementById("hero-carousel-dots") || document.getElementById("hero-carousel-indicators");
    if (!container) return;

    const banners = window.storeConfig?.heroBanners || [];
    if (banners.length === 0) return;

    container.innerHTML = banners.map((banner, idx) => `
      <div class="w-full flex-shrink-0 relative rounded-2xl overflow-hidden p-6 md:p-8 lg:p-10 border border-white/[0.08] bg-[#0A0E17]/92 backdrop-blur-xl transition-all duration-500 shadow-2xl">
        <div class="max-w-2xl space-y-4 relative z-10">
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
      </div>
    `).join("");

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
