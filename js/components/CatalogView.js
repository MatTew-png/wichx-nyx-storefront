/**
 * ==============================================================================
 * 📦 CATALOG & PRODUCT CARDS COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class CatalogViewComponent {
  constructor(store) {
    this.store = store;
    this.store.on("change:categories", () => this.render());
    this.store.on("change:categoryFilters", () => this.render());
    this.store.on("change:searchQuery", () => this.renderProducts());
  }

  render() {
    this.renderCategoryFilterBar();
    this.renderProducts();
  }

  renderCategoryFilterBar() {
    const container = document.getElementById("category-filter-bar");
    if (!container) return;

    const categories = this.store.get("categories") || [];
    const filters = this.store.get("categoryFilters") || {};
    const allActive = categories.every(c => filters[c.id]);

    let html = `
      <button onclick="window.Shop?.catalogService?.setCategoryFilter('all')" class="px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${allActive ? 'border-[var(--accent)] bg-[rgba(25,186,255,0.15)] text-[var(--accent)]' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}">
        <i data-lucide="layers" class="w-3.5 h-3.5"></i>
        <span>ทั้งหมด (${categories.reduce((acc, c) => acc + (c.products?.length || 0), 0)})</span>
      </button>
    `;

    categories.forEach(cat => {
      const isVisible = !!filters[cat.id];
      html += `
        <div class="inline-flex items-center rounded-xl border ${isVisible ? 'border-[var(--accent)] bg-[rgba(25,186,255,0.1)]' : 'border-slate-800 bg-slate-900/60 opacity-60'} transition-all overflow-hidden">
          <button onclick="window.Shop?.catalogService?.setCategoryFilter('${cat.id}')" class="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${isVisible ? 'text-[var(--accent)]' : 'text-slate-400 hover:text-white'}">
            <i data-lucide="${cat.icon || 'folder'}" class="w-3.5 h-3.5"></i>
            <span>${cat.name} (${cat.products?.length || 0})</span>
          </button>
          <button onclick="window.Shop?.catalogService?.toggleCategoryEye('${cat.id}')" class="px-2 py-1.5 border-l border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-[var(--accent)] transition-colors cursor-pointer" title="เปิด/ปิดการแสดงผล">
            <i data-lucide="${isVisible ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  renderProducts() {
    const container = document.getElementById("catalog-container") || document.getElementById("products-catalog-container");
    if (!container) return;

    const categories = this.store.get("categories") || [];
    const filters = this.store.get("categoryFilters") || {};
    const query = this.store.get("searchQuery") || "";

    const visibleCategories = categories.filter(c => filters[c.id]);

    if (visibleCategories.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
          <i data-lucide="eye-off" class="w-8 h-8 mx-auto text-slate-500 mb-2"></i>
          <p class="text-sm text-slate-400">ทุกหมวดหมู่ถูกปิดการแสดงผลอยู่ กดเปิดที่แถบตัวกรองด้านบนเพื่อดูสินค้า</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = visibleCategories.map(cat => {
      let prods = cat.products || [];
      if (query) {
        prods = prods.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.chips?.some(c => c.toLowerCase().includes(query))
        );
      }

      if (prods.length === 0 && query) return "";

      return `
        <div id="${cat.id}" class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-2 h-5 rounded-full bg-[var(--accent)]"></span>
              <h3 class="text-base sm:text-lg font-heading font-extrabold text-white">${cat.name}</h3>
              <span class="text-xs text-slate-400 font-mono">${cat.subName || ""}</span>
            </div>
            <span class="text-xs text-slate-400 font-mono">${prods.length} รายการ</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${prods.map(p => this.createProductCardHTML(p, cat)).join("")}
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }

    createProductCardHTML(p, cat) {
    const isOut = p.stock === 0;
    const isCustom = p.fulfillmentType === "custom_form";

    return `
      <div class="product-card group rounded-2xl bg-[#0C111A] hover:bg-[#111724] border border-[rgba(255,255,255,0.08)] hover:border-[var(--accent)] transition-all duration-200 p-4 flex flex-col justify-between relative shadow-lg hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.8),0_0_24px_-6px_rgba(0,242,255,0.25)] hover:-translate-y-1">
        <div>
          <!-- Artwork Area (1:1 Ratio with Subtle Dark Backdrop) -->
          <div class="w-full aspect-square rounded-xl bg-[#06080D] border border-[rgba(255,255,255,0.06)] overflow-hidden relative mb-3.5 flex items-center justify-center p-2.5">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />` : `<i data-lucide="box" class="w-12 h-12 text-slate-600"></i>`}
            
            <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
              ${p.status ? `<span class="px-2 py-0.5 rounded-md bg-[rgba(0,242,255,0.15)] text-[var(--accent)] border border-[rgba(0,242,255,0.35)] text-[10px] font-mono-val font-bold uppercase tracking-wider">${p.status}</span>` : ""}
            </div>

            <div class="absolute top-2.5 right-2.5 z-10">
              <span class="px-2 py-0.5 rounded-md ${isOut ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'} border text-[10px] font-mono-val font-bold">
                ${isOut ? 'สินค้าหมด' : `พร้อมส่ง: ${p.stock} ชิ้น`}
              </span>
            </div>
          </div>

          <!-- Title & Chips -->
          <h4 class="text-sm font-heading font-extrabold text-white group-hover:text-[var(--accent)] transition-colors line-clamp-1 mb-2">${p.title}</h4>
          
          <div class="flex flex-wrap gap-1.5 mb-3.5">
            ${(p.chips || []).map(chip => `
              <span class="px-2 py-0.5 rounded-md bg-[#070A0F] border border-[rgba(255,255,255,0.06)] text-[10px] text-slate-300 font-mono-val">${chip}</span>
            `).join("")}
          </div>
        </div>

        <!-- Footer & Action (Fitts's Law Optimized Hit Area) -->
        <div class="pt-3.5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2">
          <div>
            <div class="text-[10px] text-slate-500 line-through font-mono-val">${p.originalPrice ? `฿${p.originalPrice}` : ""}</div>
            <div class="text-base font-mono-val font-extrabold text-[var(--accent)] tracking-tight">฿${p.price.toFixed(2)}</div>
          </div>

          ${isCustom ? `
            <button onclick="window.Shop?.modals?.openCustomServiceForm('${p.id}')" class="btn-cyber-primary px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
              <span>สั่งทำพิเศษ</span>
            </button>
          ` : `
            <button onclick="window.Shop?.cartManager?.addToCartById('${p.id}')" ${isOut ? 'disabled' : ''} class="${isOut ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' : 'btn-cyber-primary cursor-pointer active:scale-95 transition-transform'} px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
              <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
              <span>ใส่ตะกร้า</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  scrollToCategory(catId) {
    const el = document.getElementById(catId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
}

window.CatalogViewComponent = CatalogViewComponent;
