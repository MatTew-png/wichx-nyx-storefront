/**
 * ==============================================================================
 * 📦 INVENTORY, PRODUCTS & KEY VAULT SERVICE
 * ==============================================================================
 * Manages Products CRUD, Category Taxonomy, Key Vault Inventory, and Bulk Restock
 * ==============================================================================
 */

class InventoryService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.currentVaultProductId = "";
    this.currentVaultKeys = [];
  }

  // --- 1. PRODUCTS TABLE & FILTER ---
  filterProductsTable() {
    const searchInput = document.getElementById("products-search-input");
    const catSelect = document.getElementById("products-category-filter");
    const statusSelect = document.getElementById("products-status-filter");

    const search = (searchInput?.value || "").toLowerCase().trim();
    const cat = catSelect?.value || "";
    const status = statusSelect?.value || "";

    const list = this.store.get("currentProductsList") || [];

    const filtered = list.filter(p => {
      const matchSearch = !search ||
        (p.title && p.title.toLowerCase().includes(search)) ||
        (p.id && p.id.toLowerCase().includes(search)) ||
        (Array.isArray(p.chips) && p.chips.some(c => c.toLowerCase().includes(search)));

      const matchCat = !cat || p.category_id === cat;

      let matchStatus = true;
      if (status === "active") matchStatus = p.is_active === true;
      else if (status === "inactive") matchStatus = p.is_active === false;
      else if (status === "out_of_stock") {
        const prodStock = this.getProductStockCount(p.id);
        matchStatus = prodStock === 0;
      }

      return matchSearch && matchCat && matchStatus;
    });

    this.renderProductsRows(filtered);
  }

  getProductStockCount(productId) {
    if (!window.currentDashboardData?.stock_by_product) return 0;
    const found = window.currentDashboardData.stock_by_product.find(s => s.product_id === productId);
    return found ? found.in_stock : 0;
  }

  getProductSoldCount(productId) {
    if (!window.currentDashboardData?.stock_by_product) return 0;
    const found = window.currentDashboardData.stock_by_product.find(s => s.product_id === productId);
    return found ? found.sold_count : 0;
  }

  renderProductsTable() {
    this.filterProductsTable();
  }

  renderProductsRows(products) {
    const table = document.getElementById("products-table-body");
    const badge = document.getElementById("products-count-badge");
    if (!table) return;

    table.innerHTML = "";
    if (badge) badge.textContent = `${products.length} รายการ`;

    if (!products || products.length === 0) {
      table.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
      return;
    }

    products.forEach(p => {
      const unsold = this.getProductStockCount(p.id);
      const sold = this.getProductSoldCount(p.id);
      const isLow = unsold <= 1;
      const originalPrice = parseFloat(p.original_price || 0);
      const currentPrice = parseFloat(p.price || 0);

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-3">
          <div class="font-bold text-white">${AdminUI.escapeHtml(p.title)}</div>
          <div class="text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 mt-0.5">
            <span>${p.id}</span>
            ${p.fulfillment_type === 'instant' ? '<span class="px-1.5 py-0.2 rounded bg-cyan-500/10 text-[9px] border border-cyan-500/30">KEY AUTO</span>' : '<span class="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[9px] border border-amber-500/30">MANUAL</span>'}
          </div>
          ${Array.isArray(p.chips) && p.chips.length > 0 ? `
            <div class="flex flex-wrap gap-1 mt-1">
              ${p.chips.map(c => `<span class="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-300 font-mono">${AdminUI.escapeHtml(c)}</span>`).join('')}
            </div>
          ` : ''}
        </td>
        <td class="py-3 px-3 text-slate-300 text-[11px]">
          ${this.getCategoryName(p.category_id)}
        </td>
        <td class="py-3 px-3">
          <div class="font-mono font-bold text-emerald-400">฿${currentPrice.toFixed(2)}</div>
          ${originalPrice > currentPrice ? `<div class="text-[10px] font-mono text-slate-500 line-through">฿${originalPrice.toFixed(2)}</div>` : ''}
        </td>
        <td class="py-3 px-3 text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${unsold === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/30' : (isLow ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30')}">
            ${unsold} ชิ้น
          </span>
        </td>
        <td class="py-3 px-3 text-center font-mono text-slate-400 text-xs">
          ${sold} ชิ้น
        </td>
        <td class="py-3 px-3 text-center">
          <button onclick="handleToggleProductActive('${p.id}')" class="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${p.is_active ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'}">
            ${p.is_active ? '● เปิดขาย' : '○ ปิดการขาย'}
          </button>
        </td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="navigateToProductVault('${p.id}')" class="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 cursor-pointer" title="เปิดคลังคีย์สินค้า (Vault)">
              <i data-lucide="key" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="openProductModal('edit', '${p.id}')" class="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 cursor-pointer" title="แก้ไขข้อมูลสินค้า">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="handleDeleteProduct('${p.id}', '${AdminUI.escapeHtml(p.title)}')" class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-300 border border-red-500/30 cursor-pointer" title="ลบสินค้าออกจากระบบ">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      `;
      table.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  getCategoryName(catId) {
    const list = this.store.get("currentCategoriesList") || [];
    const found = list.find(c => c.id === catId);
    if (found) return found.name;
    const map = {
      "cat-discord-nitro": "Discord Nitro & บูสต์",
      "cat-discord-services": "บริการดิสคอร์ด & ไอดี",
      "cat-roblox-scripts": "สคริปต์ & ระบบเกม Roblox",
      "cat-roblox-assets": "Roblox GFX & โมเดล 3D"
    };
    return map[catId] || catId || "-";
  }

  openProductModal(mode, productId = null) {
    const modal = document.getElementById("modal-product");
    const title = document.getElementById("modal-product-title");
    const formMode = document.getElementById("prod-form-mode");
    const idInput = document.getElementById("prod-form-id");
    const feedback = document.getElementById("prod-form-feedback");
    if (!modal) return;
    if (feedback) feedback.classList.add("hidden");

    if (formMode) formMode.value = mode;

    if (mode === "create") {
      if (title) title.innerHTML = `<i data-lucide="plus-circle" class="w-5 h-5 text-[var(--accent)]"></i> <span>เพิ่มสินค้าใหม่</span>`;
      if (idInput) {
        idInput.disabled = false;
        idInput.value = "";
      }
      document.getElementById("prod-form-category").value = "cat-discord-nitro";
      document.getElementById("prod-form-title").value = "";
      document.getElementById("prod-form-price").value = "";
      document.getElementById("prod-form-orig-price").value = "";
      document.getElementById("prod-form-unit").value = "ชิ้น";
      document.getElementById("prod-form-min").value = "1";
      document.getElementById("prod-form-max").value = "1000";
      document.getElementById("prod-form-step").value = "1";
      document.getElementById("prod-form-fulfillment").value = "instant";
      document.getElementById("prod-form-chips").value = "";
      document.getElementById("prod-form-active").checked = true;
    } else {
      const list = this.store.get("currentProductsList") || [];
      const prod = list.find(p => p.id === productId);
      if (!prod) return;

      if (title) title.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-[var(--accent)]"></i> <span>แก้ไขข้อมูลสินค้า: ${AdminUI.escapeHtml(prod.title)}</span>`;
      if (idInput) {
        idInput.disabled = true;
        idInput.value = prod.id;
      }
      document.getElementById("prod-form-category").value = prod.category_id || "cat-discord-nitro";
      document.getElementById("prod-form-title").value = prod.title || "";
      document.getElementById("prod-form-price").value = prod.price || "";
      document.getElementById("prod-form-orig-price").value = prod.original_price || "";
      document.getElementById("prod-form-unit").value = prod.unit || "ชิ้น";
      document.getElementById("prod-form-min").value = prod.min_quantity || "1";
      document.getElementById("prod-form-max").value = prod.max_quantity || "1000";
      document.getElementById("prod-form-step").value = prod.step_quantity || "1";
      document.getElementById("prod-form-fulfillment").value = prod.fulfillment_type || "instant";
      document.getElementById("prod-form-chips").value = Array.isArray(prod.chips) ? prod.chips.join(", ") : "";
      document.getElementById("prod-form-active").checked = prod.is_active !== false;
    }

    modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  closeProductModal() {
    const modal = document.getElementById("modal-product");
    if (modal) modal.classList.add("hidden");
  }

  async handleSaveProduct(e, refreshCallback) {
    if (e) e.preventDefault();
    const mode = document.getElementById("prod-form-mode").value;
    const id = document.getElementById("prod-form-id").value.trim().toLowerCase();
    const category_id = document.getElementById("prod-form-category").value;
    const title = document.getElementById("prod-form-title").value.trim();
    const price = parseFloat(document.getElementById("prod-form-price").value) || 0;
    const origPriceVal = document.getElementById("prod-form-orig-price").value;
    const original_price = origPriceVal ? parseFloat(origPriceVal) : null;
    const unit = document.getElementById("prod-form-unit").value.trim() || "ชิ้น";
    const min_quantity = parseInt(document.getElementById("prod-form-min").value) || 1;
    const max_quantity = parseInt(document.getElementById("prod-form-max").value) || 1000;
    const step_quantity = parseInt(document.getElementById("prod-form-step").value) || 1;
    const fulfillment_type = document.getElementById("prod-form-fulfillment").value;
    const chipsRaw = document.getElementById("prod-form-chips").value;
    const is_active = document.getElementById("prod-form-active").checked;

    const chips = chipsRaw ? chipsRaw.split(",").map(c => c.trim()).filter(Boolean) : [];

    const productData = {
      category_id,
      title,
      price,
      original_price,
      unit,
      min_quantity,
      max_quantity,
      step_quantity,
      fulfillment_type,
      chips,
      is_active
    };

    const feedback = document.getElementById("prod-form-feedback");
    if (feedback) feedback.classList.add("hidden");

    try {
      const res = await this.apiClient.rpc("admin_manage_product", {
        p_action: mode,
        p_product_id: id,
        p_product_data: productData
      });

      if (res.error || !res.data || !res.data.success) {
        throw new Error(res.data?.message || res.error?.message || "บันทึกสินค้าไม่สำเร็จ");
      }

      this.closeProductModal();
      AdminUI.showToast(`บันทึกข้อมูลสินค้า ${title} เรียบร้อยแล้ว`, "success");
      if (typeof refreshCallback === "function") await refreshCallback();
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = `ข้อผิดพลาด: ${err.message}`;
        feedback.classList.remove("hidden");
      }
    }
  }

  async handleToggleProductActive(productId, refreshCallback) {
    const list = this.store.get("currentProductsList") || [];
    const prod = list.find(p => p.id === productId);
    if (!prod) return;

    try {
      const res = await this.apiClient.rpc("admin_manage_product", {
        p_action: "toggle_active",
        p_product_id: productId,
        p_product_data: {}
      });

      if (res.error || !res.data || !res.data.success) {
        throw new Error(res.data?.message || res.error?.message || "เปลี่ยนสถานะไม่สำเร็จ");
      }

      prod.is_active = !prod.is_active;
      this.filterProductsTable();
      AdminUI.showToast(`เปลี่ยนสถานะ ${prod.title} เป็น ${prod.is_active ? 'เปิดขาย' : 'ปิดการขาย'} แล้ว`, "info");
      if (typeof refreshCallback === "function") await refreshCallback();
    } catch (err) {
      alert("ข้อผิดพลาด: " + err.message);
    }
  }

  async handleDeleteProduct(productId, productTitle, refreshCallback) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${productTitle}" ออกจากระบบ?`)) return;

    try {
      const res = await this.apiClient.rpc("admin_manage_product", {
        p_action: "delete",
        p_product_id: productId,
        p_product_data: {}
      });

      if (res.error || !res.data || !res.data.success) {
        throw new Error(res.data?.message || res.error?.message || "ลบสินค้าไม่สำเร็จ");
      }

      AdminUI.showToast(`ลบสินค้า "${productTitle}" เรียบร้อยแล้ว`, "success");
      if (typeof refreshCallback === "function") await refreshCallback();
    } catch (err) {
      alert("ข้อผิดพลาดในการลบสินค้า: " + err.message);
    }
  }

  // --- 2. CATEGORIES ---
  renderCategoriesTable() {
    const table = document.getElementById("categories-table-body");
    const list = this.store.get("currentCategoriesList") || [];
    if (!table) return;

    table.innerHTML = "";
    if (list.length === 0) {
      table.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">ยังไม่มีหมวดหมู่สินค้าในระบบ</td></tr>`;
      return;
    }

    list.forEach(c => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-3 font-mono text-cyan-400 text-xs">${c.id}</td>
        <td class="py-3 px-3 font-bold text-white">${AdminUI.escapeHtml(c.name)}</td>
        <td class="py-3 px-3 font-mono text-slate-400 text-xs">${c.sort_order || 0}</td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}">
            ${c.is_active ? 'เปิดใช้งาน' : 'ปิด'}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <button onclick="handleDeleteCategory('${c.id}', '${AdminUI.escapeHtml(c.name)}')" class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-300 border border-red-500/30 cursor-pointer" title="ลบหมวดหมู่">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      `;
      table.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  populateCategoryDropdowns() {
    const list = this.store.get("currentCategoriesList") || [];
    const filterSelect = document.getElementById("products-category-filter");
    const formSelect = document.getElementById("prod-form-category");

    if (filterSelect) {
      filterSelect.innerHTML = `<option value="">ทุกหมวดหมู่ (All Categories)</option>` +
        list.map(c => `<option value="${c.id}">${AdminUI.escapeHtml(c.name)}</option>`).join("");
    }
    if (formSelect) {
      formSelect.innerHTML = list.map(c => `<option value="${c.id}">${AdminUI.escapeHtml(c.name)}</option>`).join("");
    }
  }

  // --- 3. DEDICATED KEY VAULT ---
  populateVaultViewSelect() {
    const select = document.getElementById("vault-product-select");
    const list = this.store.get("currentProductsList") || [];
    if (!select) return;

    select.innerHTML = list.map(p => `<option value="${p.id}">${AdminUI.escapeHtml(p.title)} (${this.getProductStockCount(p.id)} ชิ้น)</option>`).join("");
    if (list.length > 0 && !this.currentVaultProductId) {
      this.currentVaultProductId = list[0].id;
    }
    if (this.currentVaultProductId) {
      select.value = this.currentVaultProductId;
      this.onVaultProductSelectChange();
    }
  }

  async onVaultProductSelectChange() {
    const select = document.getElementById("vault-product-select");
    const prodId = select ? select.value : this.currentVaultProductId;
    this.currentVaultProductId = prodId;
    if (!prodId) return;

    const table = document.getElementById("vault-keys-table-body");
    if (table) {
      table.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto text-cyan-400"></i><div class="mt-2 text-xs">กำลังดึงข้อมูลคลังคีย์...</div></td></tr>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_keys", {
        p_action: "list",
        p_product_id: prodId,
        p_keys: []
      });

      if (res.error || !res.data || !res.data.success) {
        throw new Error(res.data?.message || res.error?.message || "ไม่สามารถดึงข้อมูลคีย์ได้");
      }

      this.currentVaultKeys = res.data.keys || [];
      this.renderVaultKeysTable(this.currentVaultKeys);
    } catch (err) {
      if (table) table.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-rose-400">ข้อผิดพลาด: ${err.message}</td></tr>`;
    }
  }

  renderVaultKeysTable(keys) {
    const table = document.getElementById("vault-keys-table-body");
    const countBadge = document.getElementById("vault-keys-count");
    if (!table) return;

    table.innerHTML = "";
    if (countBadge) countBadge.textContent = `${keys.length} รายการ`;

    if (!keys || keys.length === 0) {
      table.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">ไม่มีคีย์สินค้าในคลังสำหรับสินค้านี้</td></tr>`;
      return;
    }

    keys.forEach((k, idx) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-3 font-mono text-slate-500 text-xs">${idx + 1}</td>
        <td class="py-3 px-3 font-mono text-white text-xs select-all">${AdminUI.escapeHtml(k.item_key)}</td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${k.is_sold ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}">
            ${k.is_sold ? 'ขายแล้ว' : 'พร้อมส่ง'}
          </span>
        </td>
        <td class="py-3 px-3 font-mono text-slate-400 text-xs">${k.order_id || '-'}</td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="AdminUI.copyToClipboard('${AdminUI.escapeJs(k.item_key)}')" class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300" title="คัดลอกคีย์">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
            ${!k.is_sold ? `
              <button onclick="handleDeleteVaultKey('${k.id}')" class="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30" title="ลบคีย์ออกจากคลัง">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </td>
      `;
      table.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 4. BULK RESTOCK CONTROLLER ---
  populateRestockSelect() {
    const select = document.getElementById("restock-product-select");
    const list = this.store.get("currentProductsList") || [];
    if (!select) return;

    select.innerHTML = list.map(p => `<option value="${p.id}">${AdminUI.escapeHtml(p.title)} (${this.getProductStockCount(p.id)} ชิ้น)</option>`).join("");
  }

  async handleBulkRestock(e, refreshCallback) {
    if (e) e.preventDefault();
    const select = document.getElementById("restock-product-select");
    const textarea = document.getElementById("restock-keys-input");
    const feedback = document.getElementById("restock-feedback");
    const btn = document.getElementById("btn-submit-restock");

    const productId = select?.value;
    const rawKeys = textarea?.value || "";
    const keys = rawKeys.split("\n").map(k => k.trim()).filter(Boolean);

    if (!productId || keys.length === 0) {
      alert("กรุณาเลือกสินค้าและใส่คีย์สินค้าอย่างน้อย 1 รายการ");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังเพิ่มคีย์เข้าคลัง...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_keys", {
        p_action: "add",
        p_product_id: productId,
        p_keys: keys
      });

      if (res.error || !res.data || !res.data.success) {
        throw new Error(res.data?.message || res.error?.message || "เพิ่มสต็อกคีย์ไม่สำเร็จ");
      }

      if (textarea) textarea.value = "";
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200";
        feedback.textContent = `✅ เพิ่มคีย์สำเร็จ ${keys.length} รายการสำหรับสินค้านี้`;
        feedback.classList.remove("hidden");
      }

      AdminUI.showToast(`เพิ่มสต็อก ${keys.length} ชิ้น เรียบร้อยแล้ว`, "success");
      if (typeof refreshCallback === "function") await refreshCallback();
      if (this.currentVaultProductId === productId) {
        await this.onVaultProductSelectChange();
      }
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = `ข้อผิดพลาด: ${err.message}`;
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="upload-cloud" class="w-4 h-4"></i> <span>เพิ่มสต็อกสินค้าทันที</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  // --- 5. VAULT VIEW SUBTABS & DETAIL CONTROLLERS ---
  switchVaultViewSubtab(tab) {
    const btnUnsold = document.getElementById("btn-vault-view-tab-unsold");
    const btnSold = document.getElementById("btn-vault-view-tab-sold");
    const paneUnsold = document.getElementById("vault-view-pane-unsold");
    const paneSold = document.getElementById("vault-view-pane-sold");

    if (tab === "unsold") {
      if (btnUnsold) btnUnsold.className = "px-4 py-2 text-xs font-bold font-heading border-b-2 border-emerald-400 text-emerald-400 flex items-center gap-2 cursor-pointer";
      if (btnSold) btnSold.className = "px-4 py-2 text-xs font-semibold font-heading border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
      if (paneUnsold) paneUnsold.classList.remove("hidden");
      if (paneSold) paneSold.classList.add("hidden");
    } else {
      if (btnUnsold) btnUnsold.className = "px-4 py-2 text-xs font-semibold font-heading border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
      if (btnSold) btnSold.className = "px-4 py-2 text-xs font-bold font-heading border-b-2 border-purple-400 text-purple-400 flex items-center gap-2 cursor-pointer";
      if (paneUnsold) paneUnsold.classList.add("hidden");
      if (paneSold) paneSold.classList.remove("hidden");
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async loadVaultViewKeys(productId) {
    const unsoldList = document.getElementById("vault-view-unsold-list");
    const soldList = document.getElementById("vault-view-sold-list");
    const unsoldCount = document.getElementById("vault-view-unsold-count");
    const soldCount = document.getElementById("vault-view-sold-count");

    if (!unsoldList || !soldList) return;

    unsoldList.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">กำลังดึงรายการคีย์จากคลัง...</div>`;
    soldList.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">กำลังดึงรายการคีย์ที่ขายแล้ว...</div>`;

    try {
      let unsoldKeys = [];
      let soldKeys = [];
      let loadedViaApi = false;

      try {
        const [resUnsold, resSold] = await Promise.all([
          fetch(`/api/stock-manager?action=list&product_id=${encodeURIComponent(productId)}&status=available&limit=100`),
          fetch(`/api/stock-manager?action=list&product_id=${encodeURIComponent(productId)}&status=sold&limit=100`)
        ]);

        if (resUnsold.ok && resSold.ok) {
          const dataUnsold = await resUnsold.json();
          const dataSold = await resSold.json();

          if (dataUnsold.success && dataSold.success) {
            unsoldKeys = (dataUnsold.items || []).map(i => ({ id: i.id, key_data: i.credential_data, created_at: i.created_at }));
            soldKeys = (dataSold.items || []).map(i => ({ id: i.id, key_data: i.credential_data, order_id: i.order_id, sold_at: i.sold_at }));
            if (unsoldCount) unsoldCount.textContent = dataUnsold.available_count ?? unsoldKeys.length;
            if (soldCount) soldCount.textContent = dataSold.sold_count ?? soldKeys.length;
            loadedViaApi = true;
          }
        }
      } catch (apiErr) {
        console.warn("[Vault View] Stock API fallback to Supabase RPC:", apiErr.message);
      }

      if (!loadedViaApi) {
        const res = await this.apiClient.rpc("admin_get_inventory_keys", {
          p_product_id: productId
        });

        if (res.error || !res.data || !res.data.success) {
          unsoldList.innerHTML = `<div class="text-center py-4 text-red-400 text-xs">${res.data?.message || res.error?.message || 'ไม่สามารถโหลดคีย์ได้'}</div>`;
          return;
        }

        unsoldKeys = res.data.unsold_keys || [];
        soldKeys = res.data.sold_keys || [];
        if (unsoldCount) unsoldCount.textContent = unsoldKeys.length;
        if (soldCount) soldCount.textContent = soldKeys.length;
      }

      // Render Unsold
      unsoldList.innerHTML = "";
      if (unsoldKeys.length === 0) {
        unsoldList.innerHTML = `<div class="text-center py-8 text-amber-400/80 text-xs">คลังสินค้านี้ยังไม่มีคีย์พร้อมขาย (กรุณาเติมคีย์ด้านบน)</div>`;
      } else {
        unsoldKeys.forEach((k, idx) => {
          const item = document.createElement("div");
          item.className = "p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors";
          item.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="text-slate-500 font-mono text-[10px] w-6 shrink-0">#${idx + 1}</span>
              <span class="font-mono text-emerald-300 text-xs truncate select-all">${AdminUI.escapeHtml(k.key_data)}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button onclick="copyToClipboard('${AdminUI.escapeJs(k.key_data)}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer" title="คัดลอกคีย์">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="handleDeleteVaultKey('${k.id}', '${productId}')" class="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 cursor-pointer" title="ลบคีย์นี้ทิ้ง">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          `;
          unsoldList.appendChild(item);
        });
      }

      // Render Sold
      soldList.innerHTML = "";
      if (soldKeys.length === 0) {
        soldList.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">ยังไม่มีประวัติการขายคีย์สำหรับสินค้านี้</div>`;
      } else {
        soldKeys.forEach((k, idx) => {
          const item = document.createElement("div");
          item.className = "p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between gap-2";
          item.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="text-slate-500 font-mono text-[10px] w-6 shrink-0">#${idx + 1}</span>
              <div class="min-w-0">
                <div class="font-mono text-slate-300 text-xs truncate select-all">${AdminUI.escapeHtml(k.key_data)}</div>
                <div class="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>Order: <code class="text-cyan-400">${k.order_id || 'N/A'}</code></span>
                  <span>${k.sold_at ? new Date(k.sold_at).toLocaleString("th-TH") : '-'}</span>
                </div>
              </div>
            </div>
            <button onclick="copyToClipboard('${AdminUI.escapeJs(k.key_data)}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer" title="คัดลอกคีย์">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          `;
          soldList.appendChild(item);
        });
      }
    } catch (err) {
      if (unsoldList) unsoldList.innerHTML = `<div class="text-center py-4 text-red-400 text-xs">เกิดข้อผิดพลาด: ${err.message}</div>`;
    } finally {
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async handleDeleteVaultKey(keyId, productId) {
    if (!confirm("⚠️ ยืนยันการลบคีย์นี้ออกจากคลัง? (ไม่สามารถกู้คืนได้)")) return;
    try {
      let deleted = false;
      try {
        const res = await fetch(`/api/stock-manager?action=delete_item&id=${encodeURIComponent(keyId)}`, {
          method: 'DELETE'
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          deleted = true;
        }
      } catch (apiErr) {
        console.warn("[Vault View] Delete API fallback to Supabase RPC:", apiErr.message);
      }

      if (!deleted) {
        const res = await this.apiClient.rpc("admin_delete_inventory_key", {
          p_key_id: keyId
        });
        if (res.data && res.data.success) {
          deleted = true;
        } else {
          alert("ไม่สามารถลบคีย์ได้: " + (res.data?.message || res.error?.message));
          return;
        }
      }

      await this.loadVaultViewKeys(productId);
      if (window.AdminAppInstance) await window.AdminAppInstance.loadDashboardData();
    } catch (e) {
      alert("ข้อผิดพลาด: " + e.message);
    }
  }

  async handleVaultViewQuickAdd() {
    const select = document.getElementById("vault-view-product-select");
    const textarea = document.getElementById("vault-view-quick-input");
    const feedback = document.getElementById("vault-view-feedback");
    const btn = document.getElementById("btn-vault-view-quick-add");

    const productId = select?.value;
    const raw = textarea?.value?.trim();
    if (!raw || !productId) return;

    const keysArray = raw.split("\n").map(k => k.trim()).filter(k => k.length > 0);
    if (keysArray.length === 0) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังบันทึก...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      let success = false;
      let successMessage = "";

      try {
        const res = await fetch("/api/stock-manager?action=bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            keys: keysArray
          })
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          success = true;
          successMessage = `✅ ${resData.message} | สต็อกปัจจุบัน: ${resData.current_stock} ชิ้น`;
        }
      } catch (apiErr) {
        console.warn("[Vault View] Stock API fallback to Supabase RPC:", apiErr.message);
      }

      if (!success) {
        const res = await this.apiClient.rpc("admin_bulk_restock", {
          p_product_id: productId,
          p_keys: keysArray
        });

        if (res.error || !res.data || !res.data.success) {
          if (feedback) {
            feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
            feedback.textContent = res.data?.message || res.error?.message || "เติมคีย์ไม่สำเร็จ";
            feedback.classList.remove("hidden");
          }
          return;
        }
        successMessage = `✅ ${res.data.message}`;
      }

      if (feedback) {
        feedback.className = "text-xs p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200";
        feedback.textContent = successMessage;
        feedback.classList.remove("hidden");
      }
      if (textarea) textarea.value = "";

      await this.loadVaultViewKeys(productId);
      if (window.AdminAppInstance) await window.AdminAppInstance.loadDashboardData();
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = err.message;
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="upload" class="w-3.5 h-3.5"></i> <span>เติมคีย์</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  handleVaultViewFileUpload(event) {
    const file = event?.target?.files && event.target.files[0];
    if (!file) return;

    const textarea = document.getElementById("vault-view-quick-input");
    const feedback = document.getElementById("vault-view-feedback");
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target.result || "";
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length === 0) {
        alert("ไฟล์ว่างเปล่า ไม่มีรายการคีย์");
        return;
      }

      if (lines.length > 100) {
        if (confirm(`พบรายการคีย์ทั้งหมด ${lines.length} รายการจากไฟล์ "${file.name}"\nต้องการเติมเข้าสต็อกทันทีหรือไม่?`)) {
          if (textarea) textarea.value = lines.join("\n");
          await this.handleVaultViewQuickAdd();
          return;
        }
      }

      if (textarea) textarea.value = lines.join("\n");
      if (feedback) {
        feedback.className = "text-xs p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200";
        feedback.textContent = `📂 โหลดคีย์จากไฟล์ "${file.name}" จำนวน ${lines.length} รายการเรียบร้อย กด "เติมคีย์" เพื่อบันทึก`;
        feedback.classList.remove("hidden");
      }
    };

    reader.onerror = () => {
      alert("ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
    };

    reader.readAsText(file);
    if (event.target) event.target.value = "";
  }

  async handleVaultViewSyncStock() {
    const select = document.getElementById("vault-view-product-select");
    const btn = document.getElementById("btn-vault-sync");
    if (!select || !select.value) return;

    const productId = select.value;
    const originalText = btn?.innerHTML || "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-cyan-400"></i> <span>กำลังซิงก์...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await fetch("/api/stock-manager?action=sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ ${data.message} | สต็อกจริงในคลัง: ${data.current_stock} ชิ้น`);
      } else {
        alert(`⚠️ การซิงก์ไม่สำเร็จ: ${data.message || 'เกิดข้อผิดพลาด'}`);
      }
      await this.loadVaultViewKeys(productId);
      if (window.AdminAppInstance) await window.AdminAppInstance.loadDashboardData();
    } catch (err) {
      alert("ข้อผิดพลาดในการซิงก์: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleVaultViewClearStock() {
    const select = document.getElementById("vault-view-product-select");
    if (!select || !select.value) return;

    const productId = select.value;
    const productName = select.options[select.selectedIndex]?.text || productId;

    if (!confirm(`⚠️ ยืนยันการล้างสต็อกคงเหลือ (ที่ยังไม่ได้ขาย) ทั้งหมดของ:\n"${productName}"\n\nการกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

    const btn = document.getElementById("btn-vault-clear");
    const originalText = btn?.innerHTML || "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-red-400"></i> <span>กำลังล้าง...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await fetch(`/api/stock-manager?action=clear&product_id=${encodeURIComponent(productId)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ ${data.message}`);
      } else {
        alert(`⚠️ ไม่สามารถล้างสต็อกได้: ${data.message || 'เกิดข้อผิดพลาด'}`);
      }
      await this.loadVaultViewKeys(productId);
      if (window.AdminAppInstance) await window.AdminAppInstance.loadDashboardData();
    } catch (err) {
      alert("ข้อผิดพลาดในการล้างสต็อก: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  openBulkRestockModal(productId = null) {
    this.populateRestockSelect();
    const modal = document.getElementById("modal-bulk-restock");
    const select = document.getElementById("restock-product-select");
    const feedback = document.getElementById("restock-feedback");
    const textarea = document.getElementById("restock-keys-input");
    
    if (feedback) feedback.classList.add("hidden");
    if (textarea) textarea.value = "";

    if (productId && select) {
      select.value = productId;
    }
    if (modal) modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  closeBulkRestockModal() {
    const modal = document.getElementById("modal-bulk-restock");
    if (modal) modal.classList.add("hidden");
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.InventoryService = InventoryService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = InventoryService;
}
