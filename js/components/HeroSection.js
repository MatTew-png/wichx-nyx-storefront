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
    const container = document.getElementById("hero-carousel-container");
    const indicators = document.getElementById("hero-carousel-indicators");
    if (!container) return;

    const banners = window.storeConfig?.heroBanners || [];
    if (banners.length === 0) return;

    container.innerHTML = banners.map((b, idx) => `
      <div class="carousel-slide ${idx === 0 ? 'active' : ''} p-6 sm:p-10 flex flex-col justify-between rounded-3xl bg-gradient-to-r ${b.bgGradient} border border-slate-800 shadow-2xl relative overflow-hidden" data-slide-index="${idx}">
        <div class="space-y-2 relative z-10">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(25,186,255,0.15)] text-[var(--accent)] text-[11px] font-bold tracking-wider border border-[rgba(25,186,255,0.3)]">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping"></span>
            ${b.badge}
          </span>
          <h2 class="text-xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">${b.title}</h2>
          <p class="text-xs sm:text-sm text-slate-300 max-w-xl font-body">${b.description}</p>
        </div>

        <div class="flex items-center justify-between pt-6 border-t border-slate-800/80 relative z-10">
          <button onclick="window.Shop?.catalogView?.scrollToCategory('${b.ctaCategory}')" class="btn-cyber-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer">
            <span>${b.ctaText}</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>
          <span class="text-xs font-mono text-slate-400">${b.accentTag}</span>
        </div>
      </div>
    `).join("");

    if (indicators) {
      indicators.innerHTML = banners.map((_, idx) => `
        <button onclick="window.Shop?.hero?.goToSlide(${idx})" class="w-2.5 h-1.5 rounded-full transition-all ${idx === 0 ? 'w-6 bg-[var(--accent)]' : 'bg-slate-700'}" aria-label="Slide ${idx + 1}"></button>
      `).join("");
    }

    if (window.lucide) lucide.createIcons();
    this.startAutoTimer();
  }

  goToSlide(index) {
    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll("#hero-carousel-indicators button");
    if (slides.length === 0) return;

    slides.forEach((s, idx) => s.classList.toggle("active", idx === index));
    dots.forEach((d, idx) => {
      d.className = idx === index ? "w-6 h-1.5 rounded-full bg-[var(--accent)] transition-all" : "w-2.5 h-1.5 rounded-full bg-slate-700 transition-all";
    });
    this.store.set("activeCarouselIndex", index, true);
  }

  nextSlide() {
    const banners = window.storeConfig?.heroBanners || [];
    let current = this.store.get("activeCarouselIndex") || 0;
    this.goToSlide((current + 1) % banners.length);
  }

  prevSlide() {
    const banners = window.storeConfig?.heroBanners || [];
    let current = this.store.get("activeCarouselIndex") || 0;
    this.goToSlide((current - 1 + banners.length) % banners.length);
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
