/**
 * ==============================================================================
 * 📦 CATALOG & INVENTORY SERVICE (OOP DATA LAYER)
 * ==============================================================================
 */

class CatalogService {
  constructor(store) {
    this.store = store;
  }

  async loadCatalog() {
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      try {
        const liveCats = await window.SupabaseAdapter.getProducts();
        if (liveCats && liveCats.length > 0) {
          window.categoriesData = liveCats;
          this.store.set("categories", liveCats);
        }
      } catch (err) {
        console.warn("[CATALOG SERVICE] Failed to fetch live products, using fallback:", err.message);
      }
    }
    this.initCategoryFilters();
  }

  initCategoryFilters() {
    const cats = this.store.get("categories") || [];
    const filters = {};
    cats.forEach(cat => {
      filters[cat.id] = true; // Default all visible
    });
    this.store.set("categoryFilters", filters);
  }

  setCategoryFilter(catId) {
    const cats = this.store.get("categories") || [];
    const filters = {};
    if (catId === "all") {
      cats.forEach(c => filters[c.id] = true);
    } else {
      cats.forEach(c => filters[c.id] = (c.id === catId));
    }
    this.store.set("categoryFilters", filters);
  }

  toggleCategoryEye(catId) {
    const filters = { ...this.store.get("categoryFilters") };
    filters[catId] = !filters[catId];
    this.store.set("categoryFilters", filters);
  }

  setSearchQuery(query) {
    this.store.set("searchQuery", (query || "").trim().toLowerCase());
  }

  findProductById(productId) {
    const cats = this.store.get("categories") || [];
    for (const cat of cats) {
      const prod = cat.products?.find(p => p.id === productId);
      if (prod) return { ...prod, categoryName: cat.name };
    }
    return null;
  }
}

window.CatalogService = CatalogService;
