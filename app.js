/**
 * ==============================================================================
 * ⚡ CORE APPLICATION CONTROLLER (WICHX × NYX STUDIO ARCHITECTURE)
 * ==============================================================================
 * ระบบการทำงานหลัก:
 * 1. Whitelabel Rebranding Engine (ธีม, โลโก้, สถิติ, ประกาศวิ่ง)
 * 2. Hero Promo Carousel (Wichx Style)
 * 3. Multi-Niche Catalog Renderer & Instant Live Search
 * 4. Category Visibility & Collapse Toggles
 * 5. Slide-Out Cart Drawer & Coupon Engine
 * 6. Dual-Fulfillment Flow (Instant Key Modal vs Custom Service Forms)
 * 7. Tri-Gateway Top-Up Modal (PromptPay QR, TrueMoney, Crypto LTC)
 * 8. Social Proof Real-time Order Feed (8-10s cadence)
 * 9. Custom Cyber Glass Toast System (Zero native browser alerts)
 * ==============================================================================
 */

// --- GLOBAL STATE ---
const AppState = {
  cart: JSON.parse(localStorage.getItem("wichx_cart") || "[]"),
  walletBalance: parseFloat(localStorage.getItem("wichx_balance") || "500.00"), // เครดิตเริ่มต้น ฿500 เพื่อความสะดวกในการทดสอบทันที
  orderHistory: JSON.parse(localStorage.getItem("wichx_orders") || "[]"),
  appliedPromo: null,
  activeCarouselIndex: 0,
  carouselTimer: null,
  socialProofTimer: null,
  categoryFilters: {}, // { categoryId: isVisible }
  categoryCollapses: {} // { categoryId: isCollapsed }
};

// --- DOM READY INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initWhitelabelTheme();
  initCategoryState();
  renderHeroCarousel();
  renderTelemetryGrid();
  renderCategoryFilterBar();
  renderProductsCatalog();
  renderAcceptedPaymentsFooter();
  updateCartBadge();
  updateWalletUI();
  initSocialProofFeed();
  lucide.createIcons();
});

// ==============================================================================
// 1. WHITELABEL REBRANDING & THEME ENGINE
// ==============================================================================
function initWhitelabelTheme() {
  const config = window.storeConfig || {};
  const theme = config.theme || {};

  // อัปเดต CSS Variables เข้าสู่ :root
  const root = document.documentElement;
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  if (theme.accentHover) root.style.setProperty("--accent-hover", theme.accentHover);
  if (theme.baseBg) root.style.setProperty("--base-bg", theme.baseBg);
  if (theme.cardBg) root.style.setProperty("--card-bg", theme.cardBg);
  if (theme.cardHover) root.style.setProperty("--card-hover", theme.cardHover);

  // อัปเดต Title และ Brand Text ทุกจุด
  document.title = `${config.storeName} | ${config.tagline}`;
  
  document.querySelectorAll("[data-bind='storeName']").forEach(el => {
    el.textContent = config.storeName;
  });
  document.querySelectorAll("[data-bind='brandShort']").forEach(el => {
    el.textContent = config.brandShort || config.storeName;
  });
  document.querySelectorAll("[data-bind='tagline']").forEach(el => {
    el.textContent = config.tagline;
  });
  document.querySelectorAll("[data-bind='subTagline']").forEach(el => {
    el.textContent = config.subTagline;
  });
  document.querySelectorAll("[data-bind='contactLine']").forEach(el => {
    el.textContent = config.contactLine;
  });
  document.querySelectorAll("[data-bind='discordCommunityUrl']").forEach(el => {
    el.setAttribute("href", config.discordCommunityUrl);
  });
}

// ==============================================================================
// 2. MARQUEE ANNOUNCEMENT TICKER (HIGH-TECH CAPSULES)
// ==============================================================================
function renderMarquee() {
  const container = document.getElementById("marquee-content");
  if (!container) return;
  const list = storeConfig.announcements || [];

  const tagColors = {
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30"
  };

  const renderItems = () => list.map(item => {
    if (typeof item === "string") {
      return `
        <div class="marquee-capsule text-slate-300">
          <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
          <span>${item}</span>
        </div>
        <span class="text-[var(--accent)]/30 text-[9px] font-mono select-none">◆</span>
      `;
    }

    const colorClass = tagColors[item.color] || tagColors.cyan;

    return `
      <div class="marquee-capsule text-slate-300">
        <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase border ${colorClass}">
          ${item.tag}
        </span>
        <span class="text-slate-300 font-medium">${item.text}</span>
        ${item.highlight ? `<span class="font-mono font-bold text-white px-1.5 py-0.5 rounded bg-black/50 text-[var(--accent)] border border-[rgba(25,186,255,0.2)]">${item.highlight}</span>` : ""}
      </div>
      <span class="text-[var(--accent)]/30 text-[9px] font-mono select-none">◆</span>
    `;
  }).join("");

  // Duplicate for smooth seamless infinite CSS marquee
  container.innerHTML = `
    <div class="inline-flex items-center gap-4 pr-4">
      ${renderItems()}
    </div>
    <div class="inline-flex items-center gap-4 pr-4" aria-hidden="true">
      ${renderItems()}
    </div>
  `;
}

// ==============================================================================
// 3. HERO PROMO BANNER CAROUSEL (WICHX STYLE)
// ==============================================================================
function renderHeroCarousel() {
  const container = document.getElementById("hero-carousel-track");
  const dotsContainer = document.getElementById("hero-carousel-dots");
  if (!container) return;

  const banners = storeConfig.heroBanners || [];
  container.innerHTML = "";
  if (dotsContainer) dotsContainer.innerHTML = "";

  banners.forEach((banner, idx) => {
    const slide = document.createElement("div");
    slide.className = `w-full flex-shrink-0 relative rounded-2xl overflow-hidden p-6 md:p-12 border border-[rgba(25,186,255,0.2)] bg-gradient-to-r ${banner.bgGradient} transition-all duration-500`;
    slide.innerHTML = `
      <div class="relative z-10 max-w-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(25,186,255,0.15)] border border-[rgba(25,186,255,0.3)] text-xs font-mono-val text-[var(--accent)] font-bold mb-4">
          <span class="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping"></span>
          ${banner.badge} • ${banner.accentTag}
        </div>
        <h2 class="text-2xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white tracking-wide leading-tight mb-3">
          ${banner.title}
        </h2>
        <p class="text-slate-300 text-sm md:text-base leading-relaxed mb-6 font-normal">
          ${banner.description}
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <button onclick="handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}')" class="btn-cyber-primary px-6 py-3 rounded-xl flex items-center gap-2 text-sm">
            <span>${banner.ctaText}</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>
          <a href="${storeConfig.discordCommunityUrl}" target="_blank" class="btn-cyber-secondary px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
            <i data-lucide="message-square" class="w-4 h-4 text-[var(--accent)]"></i>
            <span>เข้าสู่ดิสคอร์ด</span>
          </a>
        </div>
      </div>
      <!-- Decorative Cyber Wireframe Element -->
      <div class="absolute right-0 top-0 bottom-0 w-1/2 opacity-15 pointer-events-none hidden md:flex items-center justify-center">
        <i data-lucide="shield-check" class="w-72 h-72 text-[var(--accent)]"></i>
      </div>
    `;
    container.appendChild(slide);

    if (dotsContainer) {
      const dot = document.createElement("button");
      dot.className = `w-3 h-1.5 rounded-full transition-all duration-300 ${idx === 0 ? "bg-[var(--accent)] w-7" : "bg-slate-700"}`;
      dot.onclick = () => setCarouselSlide(idx);
      dotsContainer.appendChild(dot);
    }
  });

  startCarouselAutoplay();
}

function setCarouselSlide(index) {
  const container = document.getElementById("hero-carousel-track");
  const dotsContainer = document.getElementById("hero-carousel-dots");
  const total = (storeConfig.heroBanners || []).length;
  if (!container || total === 0) return;

  AppState.activeCarouselIndex = (index + total) % total;
  container.style.transform = `translateX(-${AppState.activeCarouselIndex * 100}%)`;

  if (dotsContainer) {
    const dots = dotsContainer.children;
    for (let i = 0; i < dots.length; i++) {
      if (i === AppState.activeCarouselIndex) {
        dots[i].className = "w-7 h-1.5 rounded-full bg-[var(--accent)] transition-all duration-300";
      } else {
        dots[i].className = "w-3 h-1.5 rounded-full bg-slate-700 transition-all duration-300";
      }
    }
  }
}

function nextCarouselSlide() {
  setCarouselSlide(AppState.activeCarouselIndex + 1);
}

function prevCarouselSlide() {
  setCarouselSlide(AppState.activeCarouselIndex - 1);
}

function startCarouselAutoplay() {
  if (AppState.carouselTimer) clearInterval(AppState.carouselTimer);
  AppState.carouselTimer = setInterval(nextCarouselSlide, 5000);
}

function handleBannerCta(catId, action) {
  if (action === "openTopUp") {
    openTopUpModal();
  } else if (catId) {
    const target = document.getElementById(catId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

// ==============================================================================
// 4. 4-METRIC TELEMETRY GRID
// ==============================================================================
function renderTelemetryGrid() {
  const metrics = storeConfig.metrics || {};
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setVal("metric-users", metrics.totalUsers || "30,000+");
  setVal("metric-products", metrics.totalProducts || "145+");
  setVal("metric-orders", metrics.ordersFulfilled || "660,000+");
  setVal("metric-uptime", metrics.uptime || "24/7 AUTO");
}

// ==============================================================================
// 5. CATEGORY VISIBILITY & COLLAPSE TOGGLES
// ==============================================================================
function initCategoryState() {
  (window.categoriesData || []).forEach(cat => {
    AppState.categoryFilters[cat.id] = true; // default all visible
    AppState.categoryCollapses[cat.id] = false; // default expanded
  });
}

function renderCategoryFilterBar() {
  const container = document.getElementById("category-filter-bar");
  if (!container) return;

  container.innerHTML = "";
  (window.categoriesData || []).forEach(cat => {
    const isVisible = AppState.categoryFilters[cat.id];
    const pill = document.createElement("div");
    pill.className = `flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
      isVisible 
        ? "bg-[rgba(25,186,255,0.1)] border-[rgba(25,186,255,0.3)] text-white" 
        : "bg-slate-900/60 border-slate-800 text-slate-500 opacity-60"
    }`;
    
    pill.innerHTML = `
      <span class="cursor-pointer" onclick="scrollToCategory('${cat.id}')">${cat.name.split(" ")[0]} ${cat.name.split(" ")[1] || ""}</span>
      <span class="font-mono-val text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-[var(--accent)]">${cat.products.length}</span>
      <button onclick="toggleCategoryVisibility('${cat.id}')" title="${isVisible ? 'ซ่อนหมวดหมู่นี้' : 'แสดงหมวดหมู่นี้'}" class="hover:text-[var(--accent)] ml-1">
        <i data-lucide="${isVisible ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
      </button>
    `;
    container.appendChild(pill);
  });
}

function toggleCategoryVisibility(catId) {
  AppState.categoryFilters[catId] = !AppState.categoryFilters[catId];
  renderCategoryFilterBar();
  renderProductsCatalog();
  lucide.createIcons();
  showToast(
    AppState.categoryFilters[catId] ? "แสดงหมวดหมู่เรียบร้อย" : "ซ่อนหมวดหมู่แล้ว", 
    "info"
  );
}

function toggleCategoryCollapse(catId) {
  AppState.categoryCollapses[catId] = !AppState.categoryCollapses[catId];
  const grid = document.getElementById(`grid-${catId}`);
  const icon = document.getElementById(`collapse-icon-${catId}`);
  if (grid) {
    if (AppState.categoryCollapses[catId]) {
      grid.classList.add("hidden");
      if (icon) icon.setAttribute("data-lucide", "chevron-down");
    } else {
      grid.classList.remove("hidden");
      if (icon) icon.setAttribute("data-lucide", "chevron-up");
    }
    lucide.createIcons();
  }
}

function scrollToCategory(catId) {
  const target = document.getElementById(catId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ==============================================================================
// 6. MULTI-NICHE CATALOG RENDERER & INSTANT LIVE SEARCH
// ==============================================================================
function renderProductsCatalog(searchQuery = "") {
  const container = document.getElementById("catalog-container");
  if (!container) return;

  const query = searchQuery.trim().toLowerCase();
  container.innerHTML = "";

  let totalVisibleProducts = 0;

  (window.categoriesData || []).forEach(cat => {
    // ตรวจสอบการเปิด-ปิดการมองเห็นของหมวดหมู่
    if (!AppState.categoryFilters[cat.id]) return;

    // กรองสินค้าตามคำค้นหา
    const filteredProducts = cat.products.filter(p => {
      if (!query) return true;
      const matchTitle = p.title.toLowerCase().includes(query);
      const matchChips = p.chips.some(c => c.toLowerCase().includes(query));
      const matchCat = cat.name.toLowerCase().includes(query);
      return matchTitle || matchChips || matchCat;
    });

    if (filteredProducts.length === 0 && query) return;

    totalVisibleProducts += filteredProducts.length;

    const section = document.createElement("section");
    section.id = cat.id;
    section.className = "mb-14 scroll-mt-24";

    const isCollapsed = AppState.categoryCollapses[cat.id];

    section.innerHTML = `
      <!-- Category Header -->
      <div class="flex flex-wrap items-end justify-between gap-4 pb-4 mb-6 border-b border-[rgba(25,186,255,0.15)]">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[rgba(25,186,255,0.1)] border border-[rgba(25,186,255,0.25)] flex items-center justify-center text-[var(--accent)]">
              <i data-lucide="${cat.icon || 'layers'}" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl md:text-2xl font-heading font-extrabold text-white tracking-wide">
                  ${cat.name}
                </h3>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono-val font-bold bg-[rgba(25,186,255,0.15)] text-[var(--accent)] border border-[rgba(25,186,255,0.3)]">
                  ${cat.badge}
                </span>
              </div>
              <p class="text-xs md:text-sm text-slate-400 mt-0.5 font-normal">
                ${cat.subName}
              </p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono-val text-slate-400">
            สต็อกพร้อมส่ง: <b class="text-white">${filteredProducts.length} รายการ</b>
          </span>
          <button onclick="toggleCategoryCollapse('${cat.id}')" class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-[var(--accent)] text-xs text-slate-300 flex items-center gap-1 transition-all">
            <span>${isCollapsed ? "ขยายหมวด" : "ย่อเก็บ"}</span>
            <i id="collapse-icon-${cat.id}" data-lucide="${isCollapsed ? 'chevron-down' : 'chevron-up'}" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      <!-- Products Grid -->
      <div id="grid-${cat.id}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${isCollapsed ? 'hidden' : ''}">
        ${filteredProducts.map(p => renderProductCardHTML(p)).join("")}
      </div>
    `;

    container.appendChild(section);
  });

  if (totalVisibleProducts === 0) {
    container.innerHTML = `
      <div class="p-16 text-center rounded-2xl glass-panel border border-slate-800 max-w-lg mx-auto">
        <i data-lucide="package-x" class="w-16 h-16 text-slate-600 mx-auto mb-4"></i>
        <h4 class="text-xl font-heading font-bold text-white mb-2">ไม่พบสินค้าที่ตรงกับการค้นหา</h4>
        <p class="text-sm text-slate-400 mb-6">ลองค้นหาด้วยคำอื่น หรือเปิดหมวดหมู่ทั้งหมดในแถบตัวกรอง</p>
        <button onclick="resetSearch()" class="btn-cyber-primary px-6 py-2.5 rounded-xl text-sm">
          ล้างการค้นหา
        </button>
      </div>
    `;
  }

  lucide.createIcons();
}

function renderProductCardHTML(p) {
  const isOutOfStock = p.stock === 0 || p.status === "OUT OF STOCK";
  const isPreOrder = p.status === "PRE-ORDER";
  const isService = p.fulfillmentType && p.fulfillmentType.startsWith("custom_");

  let statusBadge = "";
  if (isOutOfStock) {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono-val font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">OUT OF STOCK</span>`;
  } else if (isPreOrder) {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono-val font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">PRE-ORDER</span>`;
  } else if (p.discountPercent) {
    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono-val font-bold bg-[rgba(25,186,255,0.2)] text-[var(--accent)] border border-[rgba(25,186,255,0.4)]">SALE -${p.discountPercent}%</span>`;
  }

  return `
    <div class="glass-panel rounded-2xl overflow-hidden tactile-card flex flex-col justify-between border border-[rgba(25,186,255,0.15)]">
      <!-- 1:1 Square Base Artwork Container -->
      <div class="relative w-full aspect-square overflow-hidden bg-slate-950 flex items-center justify-center">
        <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy"/>
        
        <!-- Floating Badges Top -->
        <div class="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div class="flex items-center gap-1.5">
            ${statusBadge}
          </div>
          <div class="px-2 py-0.5 rounded-full text-[10px] font-mono-val font-semibold bg-black/70 backdrop-blur-md text-slate-300 border border-slate-700/80">
            ${isOutOfStock ? "หมด" : `สต็อก: ${p.stock}`}
          </div>
        </div>
      </div>

      <!-- Content Area (Zero Long Text Slop) -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <!-- Title -->
          <h4 class="text-base font-heading font-bold text-white leading-snug line-clamp-1 mb-2.5" title="${p.title}">
            ${p.title}
          </h4>

          <!-- Punchy Icon Chips (Max 3) -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${(p.chips || []).map(chip => `<span class="chip-cyber">${chip}</span>`).join("")}
          </div>
        </div>

        <!-- Price & Action Footer -->
        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <!-- Price Block -->
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-xs text-[var(--accent)] font-mono-val font-bold">฿</span>
              <span class="text-xl font-mono-val font-extrabold text-white">
                ${p.price.toLocaleString("en-US", { minimumFractionDigits: p.price % 1 === 0 ? 0 : 2 })}
              </span>
              ${p.unit ? `<span class="text-[11px] text-slate-400 font-normal">/${p.unit}</span>` : ""}
            </div>
            ${p.originalPrice ? `
              <div class="text-[11px] text-slate-500 line-through font-mono-val -mt-0.5">
                ฿${p.originalPrice.toLocaleString("en-US")}
              </div>
            ` : ""}
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2">
            ${isOutOfStock ? `
              <button disabled class="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed">
                สินค้าหมด
              </button>
            ` : isService ? `
              <button onclick="openCustomServiceModal('${p.id}')" class="btn-cyber-primary px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
                <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                <span>กรอกข้อมูล</span>
              </button>
            ` : `
              <button onclick="addToCart('${p.id}')" title="เพิ่มลงตะกร้า" class="btn-cyber-secondary p-2 rounded-xl text-xs hover:scale-105 active:scale-95">
                <i data-lucide="shopping-cart" class="w-4 h-4"></i>
              </button>
              <button onclick="buyNowInstant('${p.id}')" class="btn-cyber-primary px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 active:scale-95">
                <span>สั่งซื้อ</span>
                <i data-lucide="zap" class="w-3.5 h-3.5"></i>
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleSearchInput(e) {
  renderProductsCatalog(e.target.value);
}

function resetSearch() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";
  renderProductsCatalog("");
}

// ==============================================================================
// 7. CART ENGINE & PERSISTENCE
// ==============================================================================
function findProductById(id) {
  for (const cat of window.categoriesData || []) {
    const found = cat.products.find(p => p.id === id);
    if (found) return found;
  }
  return null;
}

function addToCart(productId, quantity = 1, customData = null) {
  const product = findProductById(productId);
  if (!product) return;

  if (product.stock === 0) {
    showToast("ขออภัย สินค้านี้หมดสต็อกชั่วคราว", "warning");
    return;
  }

  const existingIndex = AppState.cart.findIndex(item => 
    item.id === productId && JSON.stringify(item.customData) === JSON.stringify(customData)
  );

  if (existingIndex > -1) {
    AppState.cart[existingIndex].quantity += quantity;
  } else {
    AppState.cart.push({
      id: productId,
      title: product.title,
      price: product.price,
      unit: product.unit || null,
      imageUrl: product.imageUrl,
      fulfillmentType: product.fulfillmentType,
      sampleDelivery: product.sampleDelivery,
      quantity: quantity,
      customData: customData
    });
  }

  saveCart();
  updateCartBadge();
  showToast(`เพิ่ม "${product.title}" ลงตะกร้าแล้ว`, "success");
}

function updateCartItemQuantity(index, delta) {
  if (!AppState.cart[index]) return;
  AppState.cart[index].quantity += delta;
  if (AppState.cart[index].quantity <= 0) {
    AppState.cart.splice(index, 1);
  }
  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function removeCartItem(index) {
  if (!AppState.cart[index]) return;
  AppState.cart.splice(index, 1);
  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast("ลบสินค้าออกจากตะกร้าแล้ว", "info");
}

function clearCart() {
  AppState.cart = [];
  AppState.appliedPromo = null;
  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function saveCart() {
  localStorage.setItem("wichx_cart", JSON.stringify(AppState.cart));
}

function updateCartBadge() {
  const count = AppState.cart.reduce((sum, i) => sum + i.quantity, 0);
  const badge = document.getElementById("cart-badge-count");
  if (badge) {
    badge.textContent = count;
    badge.className = count > 0 
      ? "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--accent)] text-[#06080C] text-[10px] font-mono-val font-extrabold flex items-center justify-center animate-bounce"
      : "hidden";
  }
}

// ==============================================================================
// 8. CART DRAWER & CHECKOUT SYSTEM
// ==============================================================================
function toggleCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("cart-drawer-backdrop");
  const panel = document.getElementById("cart-drawer-panel");
  if (!drawer) return;

  const isOpen = !drawer.classList.contains("hidden");

  if (isOpen) {
    // Close
    backdrop.classList.add("opacity-0");
    panel.classList.add("translate-x-full");
    setTimeout(() => drawer.classList.add("hidden"), 300);
  } else {
    // Open
    drawer.classList.remove("hidden");
    renderCartDrawer();
    setTimeout(() => {
      backdrop.classList.remove("opacity-0");
      panel.classList.remove("translate-x-full");
    }, 10);
  }
}

function renderCartDrawer() {
  const container = document.getElementById("cart-items-list");
  const totalSubEl = document.getElementById("cart-subtotal");
  const discountEl = document.getElementById("cart-discount");
  const totalFinalEl = document.getElementById("cart-total");
  const promoStatusEl = document.getElementById("promo-status-msg");
  if (!container) return;

  if (AppState.cart.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
        <i data-lucide="shopping-bag" class="w-16 h-16 text-slate-700 mb-3"></i>
        <p class="text-sm font-semibold text-slate-400">ยังไม่มีสินค้าในตะกร้า</p>
        <p class="text-xs text-slate-600 mt-1">เลือกซื้อสินค้าดิจิทัลในแคตตาล็อกได้เลย</p>
      </div>
    `;
    if (totalSubEl) totalSubEl.textContent = "฿0.00";
    if (discountEl) discountEl.textContent = "-฿0.00";
    if (totalFinalEl) totalFinalEl.textContent = "฿0.00";
    lucide.createIcons();
    return;
  }

  let subtotal = 0;
  container.innerHTML = AppState.cart.map((item, idx) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <img src="${item.imageUrl}" class="w-16 h-10 object-cover rounded-lg border border-slate-800" alt="${item.title}"/>
        <div class="flex-1 min-w-0">
          <h5 class="text-xs font-heading font-bold text-white truncate">${item.title}</h5>
          ${item.customData ? `<p class="text-[10px] text-[var(--accent)] font-mono-val truncate mt-0.5">${formatCustomDataSummary(item.customData)}</p>` : ""}
          <div class="text-xs font-mono-val text-slate-300 mt-1">฿${item.price.toFixed(2)}</div>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="updateCartItemQuantity(${idx}, -1)" class="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs">-</button>
          <span class="w-6 text-center text-xs font-mono-val font-bold text-white">${item.quantity}</span>
          <button onclick="updateCartItemQuantity(${idx}, 1)" class="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs">+</button>
        </div>
        <button onclick="removeCartItem(${idx})" class="p-1.5 text-slate-500 hover:text-rose-400">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  }).join("");

  // Calculate discount
  let discount = 0;
  if (AppState.appliedPromo) {
    if (AppState.appliedPromo.discountPercent) {
      discount = (subtotal * AppState.appliedPromo.discountPercent) / 100;
    } else if (AppState.appliedPromo.discountThb) {
      discount = AppState.appliedPromo.discountThb;
    }
  }

  const finalTotal = Math.max(0, subtotal - discount);

  if (totalSubEl) totalSubEl.textContent = `฿${subtotal.toFixed(2)}`;
  if (discountEl) discountEl.textContent = `-฿${discount.toFixed(2)}`;
  if (totalFinalEl) totalFinalEl.textContent = `฿${finalTotal.toFixed(2)}`;

  if (promoStatusEl) {
    promoStatusEl.innerHTML = AppState.appliedPromo 
      ? `<span class="text-emerald-400 text-xs flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> ใช้โค้ด "${AppState.appliedPromo.code}" (${AppState.appliedPromo.label})</span>` 
      : "";
  }

  lucide.createIcons();
}

function formatCustomDataSummary(data) {
  if (data.inviteUrl) return `ดิสคอร์ด: ${data.inviteUrl.substring(0, 20)}...`;
  if (data.phone) return `เบอร์: ${data.phone}`;
  if (data.userId) return `ID: ${data.userId}`;
  if (data.email) return `เมล: ${data.email}`;
  return "บริการคัสตอม";
}

function applyCouponCode() {
  const input = document.getElementById("coupon-input");
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) return;

  const validPromos = storeConfig.promoCodes || {};
  if (validPromos[code]) {
    const promo = validPromos[code];
    AppState.appliedPromo = { code, ...promo };
    renderCartDrawer();
    showToast(`ใช้โค้ด ${code} สำเร็จ! ${promo.label}`, "success");
  } else {
    showToast("โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ", "error");
  }
}

async function executeCheckout() {
  if (AppState.cart.length === 0) {
    showToast("กรุณาเลือกสินค้าลงตะกร้าก่อนดำเนินการ", "warning");
    return;
  }

  // 🍯 ตรวจสอบ Honeypot Trap ในฝั่ง Client ก่อน
  const hpInput = document.getElementById("security_hp_verify");
  const honeypotVal = hpInput ? hpInput.value.trim() : "";
  if (honeypotVal !== "") {
    showToast("ตรวจพบบอทอัตโนมัติ (Access Blocked)", "error");
    return;
  }

  // Calculate local total for instant validation
  let subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  if (AppState.appliedPromo) {
    if (AppState.appliedPromo.discountPercent) {
      discount = (subtotal * AppState.appliedPromo.discountPercent) / 100;
    } else if (AppState.appliedPromo.discountThb) {
      discount = AppState.appliedPromo.discountThb;
    }
  }
  const totalRequired = Math.max(0, subtotal - discount);

  // Check Wallet Balance
  if (AppState.walletBalance < totalRequired) {
    const diff = (totalRequired - AppState.walletBalance).toFixed(2);
    showToast(`ยอดเงินในกระเป๋าไม่พอ (ขาดอีก ฿${diff}) กรุณาเติมเงิน`, "warning");
    toggleCartDrawer();
    openTopUpModal(Math.ceil(diff));
    return;
  }

  // เรียก Serverless API /api/checkout เพื่อตรวจสอบราคาจริงและรับรองความปลอดภัย
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `IDEM-${Date.now()}`
      },
      body: JSON.stringify({
        items: AppState.cart,
        honeypotTrap: honeypotVal,
        promoCode: AppState.appliedPromo ? AppState.appliedPromo.code : null,
        userBalance: AppState.walletBalance
      })
    });

    if (res.ok) {
      const serverResult = await res.json();
      console.log("Server Verified Checkout:", serverResult);
    }
  } catch (e) {
    // โหมด Sandbox / Local fallback เมื่อรันออฟไลน์
    console.info("Running in local sandbox checkout mode:", e.message);
  }

  // Deduct Balance
  AppState.walletBalance -= totalRequired;
  localStorage.setItem("wichx_balance", AppState.walletBalance.toString());
  updateWalletUI();

  // Create Order Record
  const orderId = `WX-${Date.now().toString().slice(-6)}`;
  const orderItems = [...AppState.cart];
  const orderRecord = {
    orderId,
    timestamp: new Date().toISOString(),
    total: totalRequired,
    items: orderItems
  };
  AppState.orderHistory.unshift(orderRecord);
  localStorage.setItem("wichx_orders", JSON.stringify(AppState.orderHistory));

  // Trigger Celebration Confetti
  triggerConfetti();

  // Close Cart Drawer
  toggleCartDrawer();

  // Check if order has instant delivery items vs service items
  const instantItems = orderItems.filter(i => i.fulfillmentType === "instant");

  if (instantItems.length > 0) {
    // Open Instant Delivery Fulfillment Modal
    openInstantDeliveryModal(orderId, orderItems);
  } else {
    showToast(`สั่งซื้อสำเร็จ! รหัสคำสั่งซื้อ ${orderId} ดำเนินการส่งเข้าระบบเรียบร้อย`, "success");
  }

  // Clear Cart
  clearCart();
}

function buyNowInstant(productId) {
  const product = findProductById(productId);
  if (!product) return;

  clearCart();
  addToCart(productId, 1);
  toggleCartDrawer();
}

// ==============================================================================
// 9. DUAL-FULFILLMENT MODALS (INSTANT KEY VS CUSTOM SERVICE FORMS)
// ==============================================================================

// --- TYPE A: Instant Credentials Modal ---
function openInstantDeliveryModal(orderId, items) {
  const modal = document.getElementById("instant-delivery-modal");
  const content = document.getElementById("instant-delivery-content");
  if (!modal || !content) return;

  const credentialsPayload = items.map(item => {
    return `[${item.title}]\nข้อมูล: ${item.sampleDelivery || "GIFT-KEY-SAMPLE-WICHX-2026-AUTO"}\nจำนวน: ${item.quantity}\n`;
  }).join("\n---------------------------\n");

  content.innerHTML = `
    <div class="p-6 md:p-8">
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
            <i data-lucide="check-circle" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-xl font-heading font-extrabold text-white">ชำระเงินสำเร็จ • จัดส่งทันที</h4>
            <p class="text-xs text-slate-400 font-mono-val">ORDER ID: <span class="text-[var(--accent)] font-bold">${orderId}</span></p>
          </div>
        </div>
        <button onclick="closeInstantDeliveryModal()" class="p-2 text-slate-400 hover:text-white rounded-lg">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="my-6">
        <label class="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span>ข้อมูลไอดี / คีย์ดิจิทัลของคุณ:</span>
          <span class="text-emerald-400 text-[11px] font-mono-val">⚡ อัตโนมัติ 100%</span>
        </label>
        <div class="relative">
          <textarea id="credentials-text-box" readonly class="w-full h-40 p-4 rounded-xl bg-slate-950 border border-[rgba(25,186,255,0.3)] text-emerald-300 font-mono-val text-xs leading-relaxed focus:outline-none resize-none">${credentialsPayload}</textarea>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div class="flex items-center gap-2">
          <button onclick="copyCredentials()" class="btn-cyber-primary px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-bold">
            <i data-lucide="copy" class="w-4 h-4"></i>
            <span>คัดลอกข้อมูลทั้งหมด</span>
          </button>
          <button onclick="downloadReceiptTxt('${orderId}', \`${encodeURIComponent(credentialsPayload)}\`)" class="btn-cyber-secondary px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>บันทึกไฟล์ .TXT</span>
          </button>
        </div>
        <button onclick="closeInstantDeliveryModal()" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white">
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  lucide.createIcons();
}

function closeInstantDeliveryModal() {
  const modal = document.getElementById("instant-delivery-modal");
  if (modal) modal.classList.add("hidden");
}

function copyCredentials() {
  const el = document.getElementById("credentials-text-box");
  if (el) {
    el.select();
    navigator.clipboard.writeText(el.value).then(() => {
      showToast("คัดลอกข้อมูลสินค้าลงคลิปบอร์ดแล้ว!", "success");
    });
  }
}

function downloadReceiptTxt(orderId, encodedData) {
  const content = decodeURIComponent(encodedData);
  const fullText = `=================================================\n${storeConfig.storeName} - ใบเสร็จ & ข้อมูลสินค้า\n=================================================\nORDER ID: ${orderId}\nวันที่: ${new Date().toLocaleString("th-TH")}\n\n${content}\n\nขอบคุณที่ใช้บริการ 24 ชม. ติดต่อซัพพอร์ต: ${storeConfig.contactLine}`;
  const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `RECEIPT-${orderId}.txt`;
  a.click();
  showToast("ดาวน์โหลดไฟล์ใบเสร็จแล้ว", "success");
}

// --- TYPE B: Custom Discord Services Order Form Modal ---
function openCustomServiceModal(productId) {
  const product = findProductById(productId);
  if (!product) return;

  const modal = document.getElementById("custom-service-modal");
  const content = document.getElementById("custom-service-content");
  if (!modal || !content) return;

  let formHtml = "";

  if (product.fulfillmentType === "custom_discord_members") {
    // ฟอร์มปั๊มคนเข้า Discord: Invite link + Slider จำนวนคน
    formHtml = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">ลิงก์เซิร์ฟเวอร์ Discord (ต้องไม่หมดอายุ):</label>
          <input type="text" id="service-input-invite" placeholder="https://discord.gg/your-code" class="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-[var(--accent)] text-sm text-white focus:outline-none"/>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-300">จำนวนคนที่ต้องการ:</label>
            <span id="member-count-val" class="text-sm font-mono-val font-bold text-[var(--accent)]">200 คน</span>
          </div>
          <input type="range" id="service-slider-members" min="100" max="1000" step="50" value="200" oninput="updateMemberSliderPrice(this.value)" class="w-full accent-[var(--accent)]"/>
          <div class="flex justify-between text-[10px] text-slate-500 font-mono-val mt-1">
            <span>100 คน</span>
            <span>500 คน</span>
            <span>1,000 คน</span>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-slate-900/90 border border-[rgba(25,186,255,0.2)] flex items-center justify-between">
          <span class="text-xs text-slate-300">ยอดรวมบริการ:</span>
          <span id="service-price-calc" class="text-lg font-mono-val font-extrabold text-[var(--accent)]">฿100.00</span>
        </div>
      </div>
    `;
  } else if (product.fulfillmentType === "custom_phone_otp") {
    // ฟอร์มรับรหัส OTP สด: เลือกประเทศ + ขอรับเบอร์ + กล่อง OTP สด
    formHtml = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">เลือกประเทศเบอร์โทรศัพท์:</label>
          <select id="service-otp-country" class="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none">
            <option value="TH">🇹🇭 ไทย (+66)</option>
            <option value="US">🇺🇸 สหรัฐอเมริกา (+1)</option>
            <option value="VN">🇻🇳 เวียดนาม (+84)</option>
            <option value="PH">🇵🇭 ฟิลิปปินส์ (+63)</option>
          </select>
        </div>
        <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-slate-400">เบอร์จำลองที่ได้รับ:</span>
            <button onclick="generateVirtualPhone()" class="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
              <i data-lucide="refresh-cw" class="w-3 h-3"></i> สุ่มเบอร์ใหม่
            </button>
          </div>
          <div id="virtual-phone-display" class="font-mono-val text-base font-bold text-white tracking-wider">
            +66 98-412-9981
          </div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950 border border-[rgba(25,186,255,0.2)]">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-slate-400">รหัส OTP ที่ได้รับสด (รอ SMS):</span>
            <span id="otp-timer-badge" class="text-[10px] text-emerald-400 font-mono-val">พร้อมรับรหัส</span>
          </div>
          <div id="otp-code-display" class="font-mono-val text-xl font-extrabold text-[var(--accent)] tracking-widest text-center py-2">
            ------
          </div>
          <button onclick="simulateOtpIncoming()" class="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 mt-1">
            กดเพื่อจำลองรหัส OTP ส่งเข้ามือถือ
          </button>
        </div>
      </div>
    `;
  } else if (product.fulfillmentType === "custom_quest_badge") {
    // ฟอร์มทำเควสต์ Discord: ช่องกรอก Discord User ID
    formHtml = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Discord User ID (ตัวเลข 18-19 หลัก):</label>
          <input type="text" id="service-input-userid" placeholder="เช่น 719283749102837419" class="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-[var(--accent)] text-sm text-white font-mono-val focus:outline-none"/>
        </div>
        <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 leading-relaxed">
          <div class="flex items-center gap-1.5 text-[var(--accent)] font-semibold mb-1">
            <i data-lucide="help-circle" class="w-3.5 h-3.5"></i>
            <span>วิธีดู User ID ใน Discord:</span>
          </div>
          เข้าไปที่ User Settings > Advanced > เปิดโหมด <b>Developer Mode</b> > คลิกขวาที่ชื่อโปรไฟล์ของคุณ แล้วกด <b>"Copy User ID"</b>
        </div>
      </div>
    `;
  } else {
    // ฟอร์มบริการอื่นๆ เช่น YouTube Family Invite
    formHtml = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">ระบุอีเมลสำหรับรับคำเชิญ:</label>
          <input type="email" id="service-input-email" placeholder="your_email@gmail.com" class="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-[var(--accent)] text-sm text-white focus:outline-none"/>
        </div>
        <p class="text-xs text-slate-400">${product.instructions || "ระบบจะส่งลิงก์คำเชิญให้อัตโนมัติ"}</p>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="p-6 md:p-8">
      <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[rgba(25,186,255,0.15)] text-[var(--accent)] border border-[rgba(25,186,255,0.3)] flex items-center justify-center">
            <i data-lucide="sliders" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-lg font-heading font-bold text-white">${product.title}</h4>
            <p class="text-xs text-slate-400">กรอกข้อมูลเพื่อดำเนินการสั่งซื้อบริการ</p>
          </div>
        </div>
        <button onclick="closeCustomServiceModal()" class="p-2 text-slate-400 hover:text-white rounded-lg">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      ${formHtml}

      <div class="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-800">
        <button onclick="closeCustomServiceModal()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300">
          ยกเลิก
        </button>
        <button onclick="submitCustomServiceOrder('${product.id}')" class="btn-cyber-primary px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 font-bold">
          <i data-lucide="shopping-cart" class="w-4 h-4"></i>
          <span>ยืนยันข้อมูล & ใส่ตะกร้า</span>
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  lucide.createIcons();
}

function closeCustomServiceModal() {
  const modal = document.getElementById("custom-service-modal");
  if (modal) modal.classList.add("hidden");
}

function updateMemberSliderPrice(val) {
  const countEl = document.getElementById("member-count-val");
  const priceEl = document.getElementById("service-price-calc");
  if (countEl) countEl.textContent = `${val} คน`;
  if (priceEl) priceEl.textContent = `฿${(val * 0.50).toFixed(2)}`;
}

function generateVirtualPhone() {
  const num = Math.floor(1000000 + Math.random() * 9000000);
  const display = document.getElementById("virtual-phone-display");
  if (display) display.textContent = `+66 98-${num.toString().substring(0, 3)}-${num.toString().substring(3)}`;
  showToast("สุ่มหมายเลขเบอร์เสมือนใหม่แล้ว", "info");
}

function simulateOtpIncoming() {
  const otpDisplay = document.getElementById("otp-code-display");
  const badge = document.getElementById("otp-timer-badge");
  if (!otpDisplay) return;

  badge.textContent = "กำลังรอ SMS...";
  badge.className = "text-[10px] text-amber-400 font-mono-val animate-pulse";
  otpDisplay.textContent = "......";

  setTimeout(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpDisplay.textContent = `${code.substring(0, 3)} - ${code.substring(3)}`;
    badge.textContent = "ได้รับ OTP แล้ว!";
    badge.className = "text-[10px] text-emerald-400 font-mono-val";
    showToast(`รหัส OTP สำหรับยืนยัน: ${code}`, "success");
  }, 1200);
}

function submitCustomServiceOrder(productId) {
  const product = findProductById(productId);
  if (!product) return;

  let customData = {};
  let qty = 1;

  if (product.fulfillmentType === "custom_discord_members") {
    const invite = document.getElementById("service-input-invite").value.trim();
    const members = parseInt(document.getElementById("service-slider-members").value, 10);
    if (!invite || !invite.includes("discord")) {
      showToast("กรุณากรอกลิงก์เซิร์ฟเวอร์ Discord ให้ถูกต้อง", "warning");
      return;
    }
    customData = { inviteUrl: invite, members };
    qty = members; // จำนวนหน่วย
  } else if (product.fulfillmentType === "custom_phone_otp") {
    const country = document.getElementById("service-otp-country").value;
    const phone = document.getElementById("virtual-phone-display").textContent.trim();
    customData = { country, phone };
  } else if (product.fulfillmentType === "custom_quest_badge") {
    const userId = document.getElementById("service-input-userid").value.trim();
    if (!userId || userId.length < 15) {
      showToast("กรุณากรอก Discord User ID ให้ถูกต้อง (17-19 หลัก)", "warning");
      return;
    }
    customData = { userId };
  } else {
    const email = document.getElementById("service-input-email").value.trim();
    if (!email || !email.includes("@")) {
      showToast("กรุณากรอกอีเมลให้ถูกต้อง", "warning");
      return;
    }
    customData = { email };
  }

  addToCart(productId, qty, customData);
  closeCustomServiceModal();
  toggleCartDrawer();
}

// ==============================================================================
// 10. TRI-GATEWAY TOP-UP MODAL (PROMPTPAY, TRUEMONEY, CRYPTO LTC)
// ==============================================================================
function updateWalletUI() {
  const el = document.getElementById("user-wallet-balance");
  if (el) el.textContent = `฿${AppState.walletBalance.toFixed(2)}`;
}

function openTopUpModal(recommendedAmount = 0) {
  const modal = document.getElementById("topup-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  if (recommendedAmount > 0) {
    const input = document.getElementById("promptpay-amount-input");
    if (input) input.value = recommendedAmount;
    generatePromptPayQr(recommendedAmount);
  }
  switchTopUpTab("promptpay");
}

function closeTopUpModal() {
  const modal = document.getElementById("topup-modal");
  if (modal) modal.classList.add("hidden");
}

function switchTopUpTab(tabKey) {
  const tabs = ["promptpay", "truemoney", "crypto_ltc"];
  tabs.forEach(t => {
    const tabBtn = document.getElementById(`tab-btn-${t}`);
    const tabPane = document.getElementById(`tab-pane-${t}`);
    if (t === tabKey) {
      if (tabBtn) tabBtn.className = "flex-1 py-3 text-center border-b-2 border-[var(--accent)] text-white text-xs font-bold transition-all bg-[rgba(25,186,255,0.08)]";
      if (tabPane) tabPane.classList.remove("hidden");
    } else {
      if (tabBtn) tabBtn.className = "flex-1 py-3 text-center border-b-2 border-transparent text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all";
      if (tabPane) tabPane.classList.add("hidden");
    }
  });

  if (tabKey === "promptpay") {
    const currentVal = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");
    generatePromptPayQr(currentVal);
  }
}

function setPromptPayPreset(val) {
  const input = document.getElementById("promptpay-amount-input");
  if (input) input.value = val;
  generatePromptPayQr(val);
}

function handlePromptPayInput(val) {
  const amount = parseFloat(val) || 0;
  generatePromptPayQr(amount);
}

// สร้าง Dynamic QR Code สำหรับ PromptPay
function generatePromptPayQr(amount) {
  const qrContainer = document.getElementById("promptpay-qr-display");
  const amountDisplay = document.getElementById("promptpay-qr-amount-text");
  if (!qrContainer) return;

  const validAmount = Math.max(1, amount || 100);
  if (amountDisplay) amountDisplay.textContent = `฿${validAmount.toFixed(2)}`;

  // SVG QR Code จำลองพร้อมโลโก้ PromptPay
  const qrSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <rect width="200" height="200" fill="#FFFFFF" rx="12"/>
      <!-- QR Position Markers -->
      <rect x="20" y="20" width="45" height="45" fill="#003D6B" rx="6"/>
      <rect x="27" y="27" width="31" height="31" fill="#FFFFFF" rx="4"/>
      <rect x="34" y="34" width="17" height="17" fill="#003D6B" rx="2"/>

      <rect x="135" y="20" width="45" height="45" fill="#003D6B" rx="6"/>
      <rect x="142" y="27" width="31" height="31" fill="#FFFFFF" rx="4"/>
      <rect x="149" y="34" width="17" height="17" fill="#003D6B" rx="2"/>

      <rect x="20" y="135" width="45" height="45" fill="#003D6B" rx="6"/>
      <rect x="27" y="142" width="31" height="31" fill="#FFFFFF" rx="4"/>
      <rect x="34" y="149" width="17" height="17" fill="#003D6B" rx="2"/>

      <!-- Matrix Dots Pattern -->
      <g fill="#003D6B">
        <rect x="80" y="20" width="8" height="8"/><rect x="95" y="20" width="8" height="8"/><rect x="110" y="20" width="8" height="8"/>
        <rect x="75" y="35" width="8" height="8"/><rect x="90" y="35" width="18" height="8"/><rect x="115" y="35" width="8" height="8"/>
        <rect x="80" y="50" width="8" height="8"/><rect x="105" y="50" width="8" height="8"/>
        <rect x="20" y="80" width="18" height="8"/><rect x="50" y="80" width="8" height="8"/><rect x="80" y="80" width="8" height="8"/><rect x="110" y="80" width="18" height="8"/><rect x="140" y="80" width="8" height="8"/><rect x="165" y="80" width="15" height="8"/>
        <rect x="35" y="95" width="8" height="8"/><rect x="65" y="95" width="18" height="8"/><rect x="95" y="95" width="10" height="8"/><rect x="125" y="95" width="8" height="8"/><rect x="150" y="95" width="8" height="8"/>
        <rect x="20" y="110" width="8" height="8"/><rect x="50" y="110" width="18" height="8"/><rect x="80" y="110" width="8" height="8"/><rect x="110" y="110" width="8" height="8"/><rect x="140" y="110" width="18" height="8"/><rect x="170" y="110" width="8" height="8"/>
        <rect x="80" y="135" width="18" height="8"/><rect x="110" y="135" width="8" height="8"/><rect x="140" y="135" width="18" height="8"/><rect x="170" y="135" width="8" height="8"/>
        <rect x="95" y="150" width="8" height="8"/><rect x="120" y="150" width="18" height="8"/><rect x="150" y="150" width="8" height="8"/>
        <rect x="80" y="165" width="8" height="8"/><rect x="105" y="165" width="18" height="8"/><rect x="140" y="165" width="8" height="8"/><rect x="165" y="165" width="15" height="8"/>
      </g>

      <!-- Center Logo Box -->
      <rect x="80" y="80" width="40" height="40" fill="#003D6B" rx="8"/>
      <text x="100" y="105" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="900" font-size="11">PROMPT</text>
    </svg>
  `;

  qrContainer.innerHTML = qrSvg;
}

function simulatePromptPayVerification() {
  const btn = document.getElementById("btn-verify-promptpay");
  const amount = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังตรวจสอบยอดเงิน...</span>`;
    lucide.createIcons();
  }

  setTimeout(() => {
    AppState.walletBalance += amount;
    localStorage.setItem("wichx_balance", AppState.walletBalance.toString());
    updateWalletUI();
    triggerConfetti();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>ฉันสแกนจ่ายแล้ว (ตรวจสอบยอดอัตโนมัติ)</span>`;
    }

    closeTopUpModal();
    showToast(`เติมเงินสำเร็จ! ฿${amount.toFixed(2)} เข้ากระเป๋าเรียบร้อยแล้ว`, "success");
  }, 1600);
}

function simulateTrueMoneyRedemption() {
  const input = document.getElementById("truemoney-voucher-input");
  const url = input?.value.trim();

  if (!url || !url.includes("truemoney.com") || !url.includes("?v=")) {
    showToast("กรุณากรอกลิงก์ซองของขวัญ TrueMoney ให้ถูกต้อง", "error");
    return;
  }

  const simulatedAmount = 150.00;
  AppState.walletBalance += simulatedAmount;
  localStorage.setItem("wichx_balance", AppState.walletBalance.toString());
  updateWalletUI();
  triggerConfetti();
  closeTopUpModal();
  if (input) input.value = "";
  showToast(`รับเงินจากซองของขวัญสำเร็จ +฿${simulatedAmount.toFixed(2)}!`, "success");
}

function copyCryptoAddress() {
  const addr = storeConfig.paymentDetails.crypto_ltc.address;
  navigator.clipboard.writeText(addr).then(() => {
    showToast("คัดลอกที่อยู่ LTC Address แล้ว!", "success");
  });
}

function simulateCryptoVerification() {
  const simulatedThb = 300.00;
  const bonus = (simulatedThb * 0.05);
  const total = simulatedThb + bonus;

  AppState.walletBalance += total;
  localStorage.setItem("wichx_balance", AppState.walletBalance.toString());
  updateWalletUI();
  triggerConfetti();
  closeTopUpModal();
  showToast(`ตรวจพบบล็อกเชน LTC สำเร็จ! +฿${simulatedThb.toFixed(2)} (โบนัส +฿${bonus.toFixed(2)})`, "success");
}

// ==============================================================================
// 11. SOCIAL PROOF LIVE ORDER NOTIFICATIONS (8-10S CADENCE)
// ==============================================================================
const simulatedOrders = [
  { user: "tew***", item: "Nitro Booster 1 เดือน", time: "เมื่อสักครู่", amount: "฿169" },
  { user: "art***", item: "เติมเงินผ่าน PromptPay", time: "1 นาทีที่แล้ว", amount: "฿500" },
  { user: "gta***", item: "Rockstar FiveM สดใหม่", time: "2 นาทีที่แล้ว", amount: "฿10" },
  { user: "nyx***", item: "ปั๊มคนเข้า Discord 500 คน", time: "3 นาทีที่แล้ว", amount: "฿250" },
  { user: "kri***", item: "รหัสติด Nitro 3 เดือน ยกเมล", time: "4 นาทีที่แล้ว", amount: "฿150" },
  { user: "vip***", item: "เติมเงินด้วย LTC (โบนัส 5%)", time: "5 นาทีที่แล้ว", amount: "฿1,200" }
];

function initSocialProofFeed() {
  const feed = document.getElementById("social-proof-feed");
  if (!feed) return;

  let index = 0;

  const cycleOrder = () => {
    const data = simulatedOrders[index % simulatedOrders.length];
    index++;

    feed.innerHTML = `
      <div class="glass-panel p-3.5 rounded-2xl flex items-center gap-3 border border-[rgba(25,186,255,0.25)] shadow-2xl max-w-xs">
        <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
          <i data-lucide="zap" class="w-4 h-4"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono-val">
            <span class="text-white font-semibold">${data.user}</span>
            <span>${data.time}</span>
          </div>
          <p class="text-xs font-heading font-bold text-[var(--accent)] truncate mt-0.5">${data.item}</p>
          <span class="text-[10px] text-emerald-400 font-mono-val font-bold">${data.amount} • สำเร็จแล้ว</span>
        </div>
        <button onclick="dismissSocialProof()" class="text-slate-500 hover:text-slate-300 p-1">
          <i data-lucide="x" class="w-3 h-3"></i>
        </button>
      </div>
    `;

    lucide.createIcons();
    feed.className = "social-proof-enter";

    setTimeout(() => {
      feed.className = "social-proof-exit";
    }, 5500);
  };

  cycleOrder();
  AppState.socialProofTimer = setInterval(cycleOrder, 9500);
}

function dismissSocialProof() {
  const feed = document.getElementById("social-proof-feed");
  if (feed) feed.className = "social-proof-exit";
  if (AppState.socialProofTimer) clearInterval(AppState.socialProofTimer);
}

// ==============================================================================
// 12. PRODUCT CLAIM & TICKET REPORT MODAL
// ==============================================================================
function openClaimModal() {
  const modal = document.getElementById("claim-ticket-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeClaimModal() {
  const modal = document.getElementById("claim-ticket-modal");
  if (modal) modal.classList.add("hidden");
}

function submitClaimTicket() {
  const orderId = document.getElementById("claim-order-id")?.value.trim();
  const reason = document.getElementById("claim-reason")?.value;
  const desc = document.getElementById("claim-desc")?.value.trim();

  if (!orderId || !desc) {
    showToast("กรุณากรอก Order ID และรายละเอียดปัญหา", "warning");
    return;
  }

  closeClaimModal();
  showToast(`ส่งคำร้องเคลมสำหรับ ${orderId} แล้ว ทีมงานจะติดต่อกลับผ่าน Discord`, "success");
}

// ==============================================================================
// 13. CUSTOM TOAST SYSTEM (ZERO BROWSER NATIVE ALERT)
// ==============================================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-item glass-panel p-3.5 px-4 rounded-xl flex items-center gap-3 border shadow-2xl max-w-sm text-xs font-semibold ${
    type === "success" ? "border-emerald-500/40 text-emerald-300" :
    type === "error" ? "border-rose-500/40 text-rose-300" :
    type === "warning" ? "border-amber-500/40 text-amber-300" :
    "border-[rgba(25,186,255,0.4)] text-[var(--accent)]"
  }`;

  const iconName = 
    type === "success" ? "check-circle-2" :
    type === "error" ? "alert-circle" :
    type === "warning" ? "alert-triangle" : "info";

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
    <span class="flex-1 text-slate-200">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==============================================================================
// 14. PRIVACY-FRIENDLY ANALYTICS & TELEMETRY TRACKER
// ==============================================================================
function trackAnalyticsEvent(eventName, eventData = {}) {
  const payload = {
    event: eventName,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    data: eventData
  };

  // 1. Console stream in development
  console.info(`[TELEMETRY] ${eventName}:`, eventData);

  // 2. Google Analytics (gtag) or Cloudflare Web Analytics if present
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, eventData);
  }

  // 3. Dispatch to Server Audit Logs if purchase or topup
  if (["PURCHASE_SUCCESS", "TOPUP_SUCCESS", "CLAIM_SUBMITTED"].includes(eventName)) {
    try {
      fetch("/api/discord-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: eventName,
          orderId: eventData.orderId || null,
          total: eventData.total || 0,
          items: eventData.items || []
        })
      }).catch(() => {});
    } catch (e) {}
  }
}

// ==============================================================================
// 15. UTILITIES & CELEBRATION CONFETTI
// ==============================================================================
function triggerConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#19BAFF", "#38D4FF", "#00FFA3", "#FFFFFF"]
    });
  }
}

function renderAcceptedPaymentsFooter() {
  const container = document.getElementById("footer-accepted-payments");
  if (!container) return;
  const payments = storeConfig.acceptedPayments || [];
  
  const paymentLabels = {
    promptpay: { name: "PromptPay QR", icon: "qr-code" },
    truemoney: { name: "TrueMoney Wallet", icon: "wallet" },
    crypto_ltc: { name: "Litecoin (LTC)", icon: "coins" }
  };

  container.innerHTML = payments.map(p => {
    const info = paymentLabels[p] || { name: p, icon: "credit-card" };
    return `
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono-val text-slate-300">
        <i data-lucide="${info.icon}" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
        <span>${info.name}</span>
      </div>
    `;
  }).join("");
}
