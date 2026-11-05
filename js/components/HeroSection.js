/**
 * ==============================================================================
 * 🚀 HERO & TELEMETRY COMPONENT (OOP CONTROLLER)
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
      <div class="w-full flex-shrink-0 relative rounded-2xl overflow-hidden p-6 md:p-12 border border-[rgba(25,186,255,0.2)] bg-gradient-to-r ${banner.bgGradient} transition-all duration-500">
        <div class="relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(25,186,255,0.15)] border border-[rgba(25,186,255,0.3)] text-xs font-mono-val text-[var(--accent)] font-bold mb-4">
            <span class="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping"></span>
            ${banner.badge} • ${banner.accentTag}
          </div>
          <h2 class="text-2xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white tracking-wide leading-tight mb-3">
            ${banner.title}
          </h2>
          <p class="text-slate-300 text-sm md:text-base leading-relaxed mb-6 font-normal font-body">
            ${banner.description}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <button onclick="window.handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}')" class="btn-cyber-primary px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold cursor-pointer">
              <span>${banner.ctaText}</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
            ${banner.accentTag ? `<span class="text-xs font-mono text-slate-400">${banner.accentTag}</span>` : ""}
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
    setVal("metric-users", metrics.totalUsers || "30,000+");
    setVal("metric-products", metrics.totalProducts || "145+");
    setVal("metric-orders", metrics.ordersFulfilled || "660,000+");
    setVal("metric-uptime", metrics.uptime || "24/7 AUTO");
  }
}

window.HeroSectionComponent = HeroSectionComponent;
