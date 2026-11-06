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
      const isWallet = !banner.productId;
      const glowColor = banner.themeColor === 'amber' ? 'rgba(245,158,11,0.15)' : (banner.themeColor === 'emerald' ? 'rgba(16,185,129,0.15)' : 'rgba(0,242,255,0.15)');
      const borderColor = banner.themeColor === 'amber' ? 'border-amber-500/30' : (banner.themeColor === 'emerald' ? 'border-emerald-500/30' : 'border-cyan-500/30');

      return `
        <div class="w-full flex-shrink-0 relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-10 border border-white/[0.08] bg-gradient-to-br from-[#0A0F1A]/95 via-[#070A12]/95 to-[#040609]/95 backdrop-blur-2xl transition-all duration-500 shadow-2xl">
          
          <!-- Background Ambient Flare -->
          <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none" style="background: ${glowColor}"></div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            <!-- Left Column (7 cols): The Hook, Offer, and CTAs -->
            <div class="lg:col-span-7 space-y-4 text-left">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-xs font-mono font-bold text-[var(--accent)]">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>${banner.badge}</span>
              </div>

              <h2 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-black text-white tracking-wide leading-tight">
                ${banner.title}
                <span class="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-cyan-200 to-blue-400 mt-1">
                  ${banner.highlight}
                </span>
              </h2>

              <p class="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl font-normal">
                ${banner.description}
              </p>

              <!-- Key Perks List -->
              <div class="flex flex-wrap items-center gap-2 pt-1">
                ${(banner.perks || []).map(p => `
                  <span class="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-cyan-400"></i>
                    <span>${p}</span>
                  </span>
                `).join('')}
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-3 pt-2 sm:pt-3">
                <button onclick="window.handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}', '${banner.productId || ''}')" class="btn-cyber-primary btn-shimmer px-6 py-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-extrabold cursor-pointer active:scale-95 transition-all shadow-lg shadow-cyan-500/20">
                  <span>${banner.ctaText}</span>
                  <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </button>
                
                <button onclick="window.handleBannerSecondaryCta('${banner.secondaryCategory || ''}', '${banner.secondaryAction || ''}')" class="px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs sm:text-sm text-slate-300 hover:text-white font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5 text-slate-400"></i>
                  <span>${banner.secondaryText}</span>
                </button>
              </div>
            </div>

            <!-- Right Column (5 cols): The Floating Holographic Cyber Card -->
            <div class="lg:col-span-5 flex justify-center">
              <div class="interactive-cyber-tilt-card w-full max-w-sm rounded-3xl bg-[#080C16]/90 border ${borderColor} p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-cyan-400/60 transition-transform duration-200 ease-out will-change-transform" style="transform-style: preserve-3d; perspective: 1000px;">
                <!-- Iridescent Glare Sheen Foil (Stripe Issuing Style) -->
                <div class="card-glare-foil absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300 rounded-3xl z-10"></div>
                
                <!-- Card Header Tag -->
                <div class="flex items-center justify-between mb-4">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border ${banner.cardBadgeColor}">
                    ${banner.cardBadge}
                  </span>
                  <span class="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>${banner.cardStock}</span>
                  </span>
                </div>

                <!-- Product Identity -->
                <div class="mb-4">
                  <h3 class="text-base sm:text-lg font-heading font-extrabold text-white leading-snug">
                    ${banner.cardTitle}
                  </h3>
                  <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                    ${banner.cardSub}
                  </p>
                </div>

                <!-- Price Highlight -->
                <div class="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] mb-4 flex items-baseline justify-between">
                  <div>
                    <span class="text-[10px] text-slate-500 uppercase font-mono">ราคาพิเศษ: </span>
                    <span class="text-xl sm:text-2xl font-mono font-extrabold text-[var(--accent)] tracking-tight">
                      ${banner.cardPrice}
                    </span>
                  </div>
                  ${banner.cardOriginalPrice ? `
                    <span class="text-xs font-mono text-slate-500 line-through">
                      ${banner.cardOriginalPrice}
                    </span>
                  ` : ''}
                </div>

                <!-- Feature Perks List -->
                <div class="space-y-2 mb-5">
                  ${(banner.cardPerks || []).map(cp => `
                    <div class="flex items-start gap-2.5 text-xs text-slate-300">
                      <div class="w-4 h-4 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                        <i data-lucide="${cp.icon || 'check'}" class="w-3 h-3"></i>
                      </div>
                      <span class="text-[11px] leading-tight text-slate-300">${cp.text}</span>
                    </div>
                  `).join('')}
                </div>

                <!-- 1-Click Interactive Action Button -->
                ${isWallet ? `
                  <button onclick="window.navigateToPage('topup')" class="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    <span>เติมเงินเข้ากระเป๋าทันที</span>
                  </button>
                ` : `
                  <button onclick="window.quickBuyProduct('${banner.productId}')" class="btn-cyber-primary w-full h-11 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all">
                    <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                    <span>สั่งซื้อสินค้านี้ทันที</span>
                  </button>
                `}

              </div>
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
    const cards = document.querySelectorAll(".interactive-cyber-tilt-card");
    cards.forEach(card => {
      const glare = card.querySelector(".card-glare-foil");
      let bounds = null;

      const onMouseEnter = () => {
        bounds = card.getBoundingClientRect();
        if (glare) glare.style.opacity = "1";
      };

      const onMouseMove = (e) => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const x = (e.clientX - bounds.left) / (bounds.width || 1);
        const y = (e.clientY - bounds.top) / (bounds.height || 1);
        const rotX = (y - 0.5) * -16;
        const rotY = (x - 0.5) * 18;
        card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`;
        if (glare) {
          glare.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(0, 242, 255, 0.35) 0%, rgba(139, 92, 246, 0.2) 35%, transparent 70%)`;
        }
      };

      const onMouseLeave = () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
        if (glare) glare.style.opacity = "0";
        bounds = null;
      };

      card.addEventListener("mouseenter", onMouseEnter);
      card.addEventListener("mousemove", onMouseMove);
      card.addEventListener("mouseleave", onMouseLeave);
    });
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
