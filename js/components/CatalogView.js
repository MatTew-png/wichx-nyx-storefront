/**
 * ==============================================================================
 * CATALOG & PRODUCT CARDS COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class CatalogViewComponent {
  constructor(store) {
    this.store = store;
    this.store.on("change:categories", () => this.render());
    this.store.on("change:isCatalogLoading", () => this.render());
    this.store.on("change:categoryFilters", () => {
      this.renderCategoryFilterBar();
      this.renderProducts();
    });
    this.store.on("change:activeCategory", () => this.renderCategoryFilterBar());
    this.store.on("change:sortOrder", () => this.renderProducts());
    this.store.on("change:inStockOnly", () => {
      this.renderCategoryFilterBar();
      this.renderProducts();
    });
    this.store.on("change:searchQuery", () => this.renderProducts());
  }

  render() {
    this.renderCategoryFilterBar();
    this.renderProducts();
  }

  renderCategoryFilterBar() {
    const container = document.getElementById("category-filter-bar");
    if (!container) return;

    if (this.store.get("isCatalogLoading")) {
      container.innerHTML = `
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 animate-pulse">
          <div class="h-8 w-24 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-32 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-36 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-28 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
        </div>
      `;
      return;
    }

    const categories = this.store.get("categories") || [];
    const activeCategory = this.store.get("activeCategory") || "all";
    const sortOrder = this.store.get("sortOrder") || "popular";
    const inStockOnly = this.store.get("inStockOnly") || false;

    // Calculate total product count
    const totalCount = categories.reduce((acc, c) => acc + (c.products?.length || 0), 0);

    let html = `
      <!-- Left: Ghost Tabs Rail (Frameless & Breathable) -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth flex-nowrap">
        <!-- ALL TAB -->
        <button onclick="window.Shop?.catalogService?.setCategoryFilter('all')" 
          class="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 ${activeCategory === 'all' 
            ? 'bg-white text-[#0A0D14] shadow-md shadow-black/40 font-bold border border-white' 
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12]'}">
          <i data-lucide="layout-grid" class="w-3.5 h-3.5 ${activeCategory === 'all' ? 'text-[#05080E]' : 'text-slate-400 group-hover:text-white'}"></i>
          <span>ทั้งหมด</span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono-val font-bold ${activeCategory === 'all' ? 'bg-[#05080E]/20 text-[#05080E]' : 'bg-white/[0.04] text-slate-400 group-hover:text-slate-200'}">${totalCount}</span>
        </button>
    `;

    categories.forEach(cat => {
      const isActive = activeCategory === cat.id;
      const count = cat.products?.length || 0;
      const icon = cat.icon || "box";

      html += `
        <button onclick="window.Shop?.catalogService?.setCategoryFilter('${cat.id}')" 
          class="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 ${isActive 
            ? 'bg-white text-[#0A0D14] shadow-md shadow-black/40 font-bold border border-white' 
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12]'}">
          <i data-lucide="${icon}" class="w-3.5 h-3.5 ${isActive ? 'text-[#05080E]' : 'text-slate-400 group-hover:text-[var(--accent)]'}"></i>
          <span>${cat.name}</span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono-val font-bold ${isActive ? 'bg-[#05080E]/20 text-[#05080E]' : 'bg-white/[0.04] text-slate-400 group-hover:text-slate-200'}">${count}</span>
        </button>
      `;
    });

    html += `
      </div>

      <!-- Right: Utility Controls (Frameless Minimalist Controls) -->
      <div class="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0 justify-end">
        <!-- IN-STOCK ONLY TOGGLE -->
        <button onclick="window.Shop?.catalogService?.toggleInStockOnly()" 
          title="กรองเฉพาะสินค้าที่มีของพร้อมจัดส่ง"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95 ${inStockOnly 
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12]'}">
          <span class="relative flex h-2 w-2">
            ${inStockOnly ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>' : ''}
            <span class="relative inline-flex rounded-full h-2 w-2 ${inStockOnly ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}"></span>
          </span>
          <span class="text-xs">เฉพาะพร้อมส่ง</span>
        </button>

        <!-- SORT DROPDOWN -->
        <div class="relative flex items-center">
          <div class="pointer-events-none absolute left-2.5 flex items-center text-slate-400">
            <i data-lucide="arrow-down-up" class="w-3.5 h-3.5 text-slate-400"></i>
          </div>
          <select onchange="window.Shop?.catalogService?.setSortOrder(this.value)" 
            class="pl-7 pr-7 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-xs text-slate-300 hover:text-white font-semibold focus:outline-none cursor-pointer transition-colors appearance-none">
            <option value="popular" class="bg-[#0C111A] text-white" ${sortOrder === 'popular' ? 'selected' : ''}>ยอดนิยม</option>
            <option value="price_asc" class="bg-[#0C111A] text-white" ${sortOrder === 'price_asc' ? 'selected' : ''}>ราคา: ต่ำ → สูง</option>
            <option value="price_desc" class="bg-[#0C111A] text-white" ${sortOrder === 'price_desc' ? 'selected' : ''}>ราคา: สูง → ต่ำ</option>
            <option value="discount" class="bg-[#0C111A] text-white" ${sortOrder === 'discount' ? 'selected' : ''}>ส่วนลดสูงสุด</option>
          </select>
          <div class="pointer-events-none absolute right-2 flex items-center text-slate-400">
            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    if (window.JulianMotion && typeof window.JulianMotion.animateCatalogGrid === 'function') {
      window.JulianMotion.animateCatalogGrid(container);
    }
  }

  renderProducts() {
    const container = document.getElementById("catalog-container") || document.getElementById("products-catalog-container");
    if (!container) return;

    if (this.store.get("isCatalogLoading")) {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] animate-pulse">
            <div class="h-6 w-44 rounded-lg bg-white/[0.06]"></div>
            <div class="h-4 w-16 rounded bg-white/[0.04]"></div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `
              <div class="rounded-2xl bg-[#0C111A] border border-white/[0.06] p-4 flex flex-col justify-between relative overflow-hidden skeleton-shimmer">
                <div>
                  <div class="w-full aspect-square rounded-xl bg-[#06080D] border border-white/[0.04] mb-3.5 relative overflow-hidden flex items-center justify-center">
                    <div class="w-10 h-10 rounded-xl bg-white/[0.03]"></div>
                  </div>
                  <div class="h-4 w-3/4 rounded bg-white/[0.08] mb-2.5"></div>
                  <div class="flex gap-1.5 mb-3.5">
                    <div class="h-3.5 w-12 rounded bg-white/[0.04]"></div>
                    <div class="h-3.5 w-16 rounded bg-white/[0.04]"></div>
                  </div>
                </div>
                <div class="pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                  <div class="h-5 w-16 rounded bg-white/[0.05]"></div>
                  <div class="h-8 w-16 rounded-xl bg-white/[0.06]"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      return;
    }

    const categories = this.store.get("categories") || [];
    const filters = this.store.get("categoryFilters") || {};
    const query = this.store.get("searchQuery") || "";
    const sortOrder = this.store.get("sortOrder") || "popular";
    const inStockOnly = this.store.get("inStockOnly") || false;

    const visibleCategories = categories.filter(c => filters[c.id]);

    if (visibleCategories.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center rounded-3xl bg-[#0C111A]/80 border border-[rgba(255,255,255,0.08)]">
          <i data-lucide="package-x" class="w-10 h-10 mx-auto text-slate-500 mb-3"></i>
          <h4 class="text-base font-heading font-bold text-white mb-1">ไม่พบหมวดหมู่ที่เลือก</h4>
          <p class="text-xs text-slate-400">คลิกปุ่ม "ทั้งหมด" ด้านบนเพื่อดูสินค้าครบทุกหมวดหมู่</p>
          <button onclick="window.Shop?.catalogService?.setCategoryFilter('all')" class="mt-4 px-4 py-2 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold text-xs cursor-pointer active:scale-95 transition-transform shadow-lg">
            ดูสินค้าทั้งหมด
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    if (window.JulianMotion && typeof window.JulianMotion.animateCatalogGrid === 'function') {
      window.JulianMotion.animateCatalogGrid(container);
    }
      return;
    }

    let renderedAnyProduct = false;

    const html = visibleCategories.map(cat => {
      let prods = cat.products || [];

      // Filter: In-Stock Only
      if (inStockOnly) {
        prods = prods.filter(p => p.stock > 0);
      }

      // Filter: Search Query
      if (query) {
        prods = prods.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.chips?.some(c => c.toLowerCase().includes(query))
        );
      }

      // Sort
      if (sortOrder === "price_asc") {
        prods = [...prods].sort((a, b) => a.price - b.price);
      } else if (sortOrder === "price_desc") {
        prods = [...prods].sort((a, b) => b.price - a.price);
      } else if (sortOrder === "discount") {
        prods = [...prods].sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
      }

      if (prods.length === 0) {
        if (query || inStockOnly) return "";
      }

      renderedAnyProduct = true;

      return `
        <div id="${cat.id}" class="space-y-4 mb-10">
          <div class="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
            <div class="flex items-center gap-3">
              <span class="w-1.5 h-5 rounded-full bg-[var(--accent)]"></span>
              <div>
                <h3 class="text-base sm:text-lg font-heading font-extrabold text-white tracking-wide">${cat.name}</h3>
                <p class="text-xs text-slate-400 font-mono-val">${cat.subName || ""}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-lg bg-[#0C111A] border border-[rgba(255,255,255,0.06)] text-xs text-slate-300 font-mono-val font-bold">
                ${prods.length} รายการ
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${prods.map((p, idx) => {
              if (idx === 0 && prods.length >= 3) {
                return this.createBentoSpotlightCardHTML(p, cat);
              }
              return this.createProductCardHTML(p, cat);
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    if (!renderedAnyProduct) {
      container.innerHTML = `
        <div class="p-12 text-center rounded-3xl bg-[#0C111A]/80 border border-[rgba(255,255,255,0.08)]">
          <i data-lucide="package-x" class="w-10 h-10 mx-auto text-slate-500 mb-3"></i>
          <h4 class="text-base font-heading font-bold text-white mb-1">ไม่พบสินค้าที่ตรงกับเงื่อนไข</h4>
          <p class="text-xs text-slate-400">ลองรีเซ็ตตัวกรอง หรือค้นหาด้วยคำอื่น</p>
          <div class="mt-4 flex items-center justify-center gap-3">
            <button onclick="window.Shop?.catalogService?.setCategoryFilter('all'); if (window.Shop?.catalogService?.toggleInStockOnly) window.Shop.catalogService.toggleInStockOnly(false); if (window.Shop?.catalogService?.setSearchQuery) { window.Shop.catalogService.setSearchQuery(''); const el = document.getElementById('search-input'); if (el) el.value = ''; const elMob = document.getElementById('search-input-mobile'); if (elMob) elMob.value = ''; }" class="px-4 py-2 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold text-xs cursor-pointer active:scale-95 transition-transform shadow-lg">
              รีเซ็ตตัวกรองทั้งหมด
            </button>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = html;
    }

    if (window.lucide) lucide.createIcons();
    if (window.JulianMotion && typeof window.JulianMotion.animateCatalogGrid === 'function') {
      window.JulianMotion.animateCatalogGrid(container);
    }
  }

    createProductCardHTML(p, cat) {
    const isOut = p.stock === 0;
    const isCustom = p.fulfillmentType === "custom_form";
    const user = this.store ? this.store.get("user") : null;
    const isReseller = user?.role === "reseller" || user?.is_reseller;
    const resellerPrice = p.reseller_price ? Number(p.reseller_price) : (p.price > 0 ? Math.round(p.price * 0.88) : p.price);
    const activePrice = isReseller ? resellerPrice : p.price;

    return `
      <div class="product-card group rounded-2xl bg-[#0A0D14] hover:bg-[#0F1420] border border-white/[0.07] hover:border-white/[0.18] transition-all duration-200 p-4 flex flex-col justify-between relative shadow-lg hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.85)] hover:-translate-y-1">
        <div>
          <!-- Artwork Area (1:1 Ratio Minimal Base Placeholder) -->
          <div class="w-full aspect-square rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:border-white/[0.14] overflow-hidden relative mb-3.5 flex items-center justify-center p-2.5 transition-colors">
            ${p.imageUrl ? `
              <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');" />
              <div class="hidden flex-col items-center justify-center gap-2 select-none pointer-events-none">
                <div class="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500">
                  <i data-lucide="image" class="w-5 h-5"></i>
                </div>
                <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600">NO IMAGE</span>
              </div>
            ` : `
              <div class="flex flex-col items-center justify-center gap-2 select-none pointer-events-none">
                <div class="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500 group-hover:text-slate-400 group-hover:scale-105 group-hover:border-white/[0.12] transition-all">
                  <i data-lucide="image" class="w-5 h-5"></i>
                </div>
                <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600 group-hover:text-slate-500 transition-colors">NO IMAGE</span>
              </div>
            `}
            
            <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
              ${p.status ? `<span class="px-2 py-0.5 rounded-md bg-white/[0.04] text-sky-300 border border-white/[0.08] text-[10px] font-mono-val font-semibold uppercase tracking-wider">${p.status}</span>` : ""}
            </div>

            <div class="absolute top-2.5 right-2.5 z-10">
              ${isOut 
                ? `<span class="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-mono-val font-bold">สินค้าหมดชั่วคราว</span>` 
                : (p.stock <= 2 
                    ? `<span class="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/60 text-amber-300 text-[10px] font-mono-val font-extrabold flex items-center gap-1 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.4)]"><i data-lucide="flame" class="w-3 h-3 text-amber-400 fill-amber-400"></i><span>เหลือ ${p.stock} ชิ้นสุดท้าย!</span></span>`
                    : `<span class="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono-val font-bold">พร้อมส่ง: ${p.stock} ชิ้น</span>`
                  )
              }
            </div>
          </div>

          <!-- Merchant Trust Indicator -->
          <div class="flex items-center gap-1.5 mb-1.5 text-[11px] font-mono select-none">
            <span class="text-emerald-400 font-bold flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i><span class="text-slate-300 text-[10px] font-mono-val font-semibold">ของแท้ 100% • บอทส่งทันที</span></span>
          </div>
          <h4 class="text-sm font-heading font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1 mb-2">${p.title}</h4>
          
          <div class="flex flex-wrap gap-1.5 mb-3.5">
            ${(p.chips || []).map(chip => `
              <span class="px-2 py-0.5 rounded-md bg-[#070A0F] border border-[rgba(255,255,255,0.06)] text-[10px] text-slate-300 font-mono-val">${chip}</span>
            `).join("")}
          </div>

          ${(cat.id === 'cat-roblox-scripts' || p.category === 'cat-roblox-scripts') ? `
            <!-- Roblox Executor Compatibility Radar & One-Click Script Loader (Sprint 4: 4.2) -->
            <div class="my-2 p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/20 space-y-2">
              <div class="flex items-center justify-between text-[10px] font-mono">
                <span class="flex items-center gap-1 text-slate-300"><i data-lucide="shield" class="w-3 h-3 text-cyan-400"></i> EXECUTOR RADAR:</span>
                <span class="text-emerald-400 font-bold">BYPASS 100%</span>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[9px] font-mono font-semibold">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center">Delta 🟢</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center">Codex 🟢</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center">Wave 🟢</span>
                <span class="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-center">Solara 🟡</span>
              </div>
              <button onclick="window.copyRobloxLoaderScript('${p.id}')" class="w-full py-1.5 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95">
                <i data-lucide="terminal" class="w-3 h-3"></i>
                <span>⚡ คัดลอก Loader Script</span>
              </button>
            </div>
          ` : ''}
        </div>

                <!-- Footer & Action (Fitts's Law Dual-Action: Cart + 1-Click Buy) -->
        <div class="pt-3.5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2">
          <div>
            <div class="text-[10px] text-slate-500 line-through font-mono-val">${p.originalPrice ? `฿${p.originalPrice}` : ""}</div>
            ${isReseller ? `
              <div class="flex items-center gap-1.5">
                <span class="text-base font-mono-val font-bold text-emerald-400 tracking-tight">฿${activePrice.toFixed(2)}</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">RESELLER</span>
              </div>
            ` : `
              <div class="text-base font-mono-val font-bold text-[var(--accent)] tracking-tight">฿${p.price.toFixed(2)}</div>
              <div class="text-[9px] text-emerald-400/90 font-mono tracking-tight font-semibold">ราคาส่ง Reseller: ฿${resellerPrice.toFixed(2)}</div>
            `}
          </div>

          ${isOut ? `
            <button onclick="window.openRestockNotifyModal('${p.id}', '${p.title.replace(/'/g, "\\'")}')" class="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md">
              <i data-lucide="bell-ring" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>แจ้งเตือนเมื่อของมาเติม</span>
            </button>
          ` : (isCustom ? `
            <button onclick="window.Shop?.modals?.openCustomServiceForm('${p.id}')" class="btn-cyber-primary px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
              <span>สั่งทำ</span>
            </button>
          ` : `
            <div class="flex items-center gap-1.5">
              <button onclick="window.Shop?.cartManager?.addToCartById('${p.id}')" class="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all" title="หยิบใส่ตะกร้า">
                <i data-lucide="shopping-cart" class="w-4 h-4 text-slate-300"></i>
              </button>
              <button onclick="window.quickBuyProduct('${p.id}')" class="btn-cyber-primary cursor-pointer active:scale-95 transition-transform px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-md">
                <i data-lucide="zap" class="w-3.5 h-3.5 fill-current"></i>
                <span>ซื้อด่วน</span>
              </button>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  createBentoSpotlightCardHTML(p, cat) {
    const isOut = p.stock === 0;
    const isCustom = p.fulfillmentType === "custom_form";
    const user = this.store ? this.store.get("user") : null;
    const isReseller = user?.role === "reseller" || user?.is_reseller;
    const resellerPrice = p.reseller_price ? Number(p.reseller_price) : (p.price > 0 ? Math.round(p.price * 0.88) : p.price);
    const activePrice = isReseller ? resellerPrice : p.price;

    return `
      <div class="bento-spotlight group col-span-1 sm:col-span-2 md:col-span-2 p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6 items-stretch relative">
        <!-- BEST SELLER BADGE -->
        <div class="absolute top-3 left-3 z-20">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/25 to-rose-500/25 border border-amber-500/50 text-amber-300 text-[10px] font-mono-val font-extrabold shadow-[0_0_16px_rgba(245,158,11,0.35)]">
            <i data-lucide="flame" class="w-3 h-3 text-amber-400 fill-amber-400"></i>
            <span>🔥 BEST SELLER • สินค้ายอดนิยม</span>
          </span>
        </div>

        <!-- Artwork -->
        <div class="w-full sm:w-[42%] aspect-square sm:aspect-auto rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden relative flex items-center justify-center p-4">
          ${p.imageUrl ? `
            <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');" />
            <div class="hidden flex-col items-center justify-center gap-2 select-none pointer-events-none">
              <div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500">
                <i data-lucide="image" class="w-6 h-6"></i>
              </div>
              <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600">NO IMAGE</span>
            </div>
          ` : `
            <div class="flex flex-col items-center justify-center gap-2 select-none pointer-events-none">
              <div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500 group-hover:text-slate-400 group-hover:scale-105 group-hover:border-white/[0.12] transition-all">
                <i data-lucide="image" class="w-6 h-6"></i>
              </div>
              <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600 group-hover:text-slate-500 transition-colors">NO IMAGE</span>
            </div>
          `}
          <div class="absolute top-2 right-2 z-10">
            ${isOut
              ? `<span class="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-mono-val font-bold">สินค้าหมดชั่วคราว</span>`
              : `<span class="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono-val font-bold">พร้อมส่ง: ${p.stock} ชิ้น</span>`
            }
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 flex flex-col justify-between">
          <div>
            ${p.status ? `<span class="inline-block px-2 py-0.5 rounded-md bg-white/[0.04] text-sky-300 border border-white/[0.08] text-[10px] font-mono-val font-semibold uppercase tracking-wider mb-2">${p.status}</span>` : ""}
            <h4 class="text-lg sm:text-xl font-heading font-extrabold text-white group-hover:text-sky-300 transition-colors mb-2.5">${p.title}</h4>

            <div class="flex flex-wrap gap-1.5 mb-4">
              ${(p.chips || []).map(chip => `
                <span class="px-2.5 py-1 rounded-lg bg-[#070A0F] border border-[rgba(255,255,255,0.08)] text-[11px] text-slate-300 font-mono-val">${chip}</span>
              `).join("")}
            </div>

            <!-- Detailed Perks -->
            <div class="space-y-2 mb-5">
              <div class="flex items-center gap-2 text-xs font-mono-val text-slate-300">
                <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
                <span>ของแท้ 100% • รับประกันเต็มจำนวน</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-mono-val text-slate-300">
                <i data-lucide="zap" class="w-4 h-4 text-[var(--accent)]"></i>
                <span>บอทส่งอัตโนมัติทันทีหลังชำระเงิน</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-mono-val text-slate-300">
                <i data-lucide="headset" class="w-4 h-4 text-amber-400"></i>
                <span>ซัพพอร์ต 24 ชม. ผ่าน Discord พร้อมช่วยเหลือทุกขั้นตอน</span>
              </div>
            </div>
          </div>

          <!-- Footer & Action -->
          <div class="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3">
            <div>
              <div class="text-[10px] text-slate-500 line-through font-mono-val">${p.originalPrice ? `฿${p.originalPrice}` : ""}</div>
              ${isReseller ? `
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-mono-val font-bold text-emerald-400 tracking-tight">฿${activePrice.toFixed(2)}</span>
                  <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">RESELLER</span>
                </div>
              ` : `
                <div class="text-2xl font-mono-val font-bold text-[var(--accent)] tracking-tight">฿${p.price.toFixed(2)}</div>
                <div class="text-[9px] text-emerald-400/90 font-mono tracking-tight font-semibold">ราคาส่ง Reseller: ฿${resellerPrice.toFixed(2)}</div>
              `}
            </div>

            ${isOut ? `
              <button onclick="window.openRestockNotifyModal('${p.id}', '${p.title.replace(/'/g, "\\'")}')" class="btn-spring py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                <i data-lucide="bell-ring" class="w-4 h-4 text-amber-400"></i>
                <span>แจ้งเตือนเมื่อของมาเติม</span>
              </button>
            ` : (isCustom ? `
              <button onclick="window.Shop?.modals?.openCustomServiceForm('${p.id}')" class="btn-spring btn-cyber-primary px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="sliders" class="w-4 h-4"></i>
                <span>สั่งทำ</span>
              </button>
            ` : `
              <div class="flex items-center gap-2">
                <button onclick="window.Shop?.cartManager?.addToCartById('${p.id}')" class="btn-spring p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer" title="หยิบใส่ตะกร้า">
                  <i data-lucide="shopping-cart" class="w-4 h-4 text-slate-300"></i>
                </button>
                <button onclick="window.quickBuyProduct('${p.id}')" class="btn-spring btn-cyber-primary cursor-pointer px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md">
                  <i data-lucide="zap" class="w-4 h-4 fill-current"></i>
                  <span>ซื้อด่วน</span>
                </button>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  scrollToCategory(catId) {
    const el = document.getElementById(catId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
}

if (typeof window !== "undefined") {
  window.CatalogViewComponent = CatalogViewComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CatalogViewComponent;
}
