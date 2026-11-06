const fs = require('fs');
const path = require('path');

// 1. Update styles.css
const cssPath = path.join(__dirname, '..', 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('.skeleton-shimmer')) {
  css += `\n\n/* Cyberpunk Skeleton Shimmer (Anti-FOUC Smooth Loader) */\n@keyframes skeletonWave {\n  0% { transform: translateX(-100%); }\n  100% { transform: translateX(200%); }\n}\n\n.skeleton-shimmer {\n  position: relative;\n  overflow: hidden;\n}\n\n.skeleton-shimmer::after {\n  content: "";\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  transform: translateX(-100%);\n  background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.04), rgba(255, 255, 255, 0.06), transparent);\n  animation: skeletonWave 1.8s ease-in-out infinite;\n  pointer-events: none;\n}\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('✓ styles.css updated with .skeleton-shimmer');
}

// 2. Update Store.js: isCatalogLoading: true and initial categories: []
const storePath = path.join(__dirname, '..', 'js', 'core', 'Store.js');
let storeCode = fs.readFileSync(storePath, 'utf8');
storeCode = storeCode.replace(
  /this\.state\s*=\s*\{[\s\S]*?activeCarouselIndex:\s*0\s*\};/,
  `this.state = {
      user: null,
      walletBalance: typeof localStorage !== "undefined" ? parseFloat(localStorage.getItem("wichx_balance") || "500.00") : 500.00,
      cart: safeParse("wichx_cart", []),
      orderHistory: safeParse("wichx_orders", []),
      appliedPromo: null,
      isCatalogLoading: true,
      categories: [],
      categoryFilters: {},
      activeCategory: "all",
      sortOrder: "popular",
      inStockOnly: false,
      categoryCollapses: {},
      searchQuery: "",
      activeCarouselIndex: 0
    };`
);
fs.writeFileSync(storePath, storeCode, 'utf8');
console.log('✓ Store.js updated (isCatalogLoading: true, categories: [])');

// 3. Update CatalogService.js: set isCatalogLoading to false on completion or fallback
const catalogServicePath = path.join(__dirname, '..', 'js', 'services', 'CatalogService.js');
let catServiceCode = fs.readFileSync(catalogServicePath, 'utf8');
catServiceCode = catServiceCode.replace(
  /async loadCatalog\(\)\s*\{[\s\S]*?this\.initCategoryFilters\(\);\s*\}/,
  `async loadCatalog() {
    this.store.set("isCatalogLoading", true);
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      try {
        const liveCats = await window.SupabaseAdapter.getProducts();
        if (liveCats && liveCats.length > 0) {
          window.categoriesData = liveCats;
          this.store.set("categories", liveCats);
          this.initCategoryFilters();
          this.store.set("isCatalogLoading", false);
          return;
        }
      } catch (err) {
        console.warn("[CATALOG SERVICE] Failed to fetch live products, using fallback:", err.message);
      }
    }
    // Offline or Network Failure Fallback
    const fallback = window.categoriesData || [];
    this.store.set("categories", fallback);
    this.initCategoryFilters();
    this.store.set("isCatalogLoading", false);
  }`
);
fs.writeFileSync(catalogServicePath, catServiceCode, 'utf8');
console.log('✓ CatalogService.js updated');

// 4. Update CatalogView.js: render skeleton shimmer during isCatalogLoading
const catalogViewPath = path.join(__dirname, '..', 'js', 'components', 'CatalogView.js');
let catViewCode = fs.readFileSync(catalogViewPath, 'utf8');

// Ensure listener for isCatalogLoading
if (!catViewCode.includes('change:isCatalogLoading')) {
  catViewCode = catViewCode.replace(
    'this.store.on("change:categories", () => this.render());',
    'this.store.on("change:categories", () => this.render());\n    this.store.on("change:isCatalogLoading", () => this.render());'
  );
}

// Update renderCategoryFilterBar to handle loading
catViewCode = catViewCode.replace(
  /renderCategoryFilterBar\(\)\s*\{([\s\S]*?)const categories = this\.store\.get\("categories"\)/,
  `renderCategoryFilterBar() {
    const container = document.getElementById("category-filter-bar");
    if (!container) return;

    if (this.store.get("isCatalogLoading")) {
      container.innerHTML = \`
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 animate-pulse">
          <div class="h-8 w-24 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-32 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-36 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-28 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
        </div>
      \`;
      return;
    }

    const categories = this.store.get("categories")`
);

// Update renderProducts to handle loading
catViewCode = catViewCode.replace(
  /renderProducts\(\)\s*\{([\s\S]*?)const categories = this\.store\.get\("categories"\)/,
  `renderProducts() {
    const container = document.getElementById("catalog-container") || document.getElementById("products-catalog-container");
    if (!container) return;

    if (this.store.get("isCatalogLoading")) {
      container.innerHTML = \`
        <div class="space-y-6">
          <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] animate-pulse">
            <div class="h-6 w-44 rounded-lg bg-white/[0.06]"></div>
            <div class="h-4 w-16 rounded bg-white/[0.04]"></div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            \${[1, 2, 3, 4, 5, 6, 7, 8].map(() => \`
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
                  <div class="h-5 w-16 rounded bg-cyan-500/20"></div>
                  <div class="h-8 w-16 rounded-xl bg-white/[0.06]"></div>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \`;
      return;
    }

    const categories = this.store.get("categories")`
);

fs.writeFileSync(catalogViewPath, catViewCode, 'utf8');
console.log('✓ CatalogView.js updated with Skeleton Shimmer');
