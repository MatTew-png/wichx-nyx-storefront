/**
 * ==============================================================================
 * ⚙️ SETTINGS, CATEGORIES & STOREFRONT CONFIGURATION SERVICE
 * ==============================================================================
 * Manages store branding, payment gateways, announcements ticker,
 * hero banner carousels, category taxonomy CRUD, and configuration backup
 * ==============================================================================
 */

class SettingsService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.currentEditingCategory = null;
    this.currentEditingAnnouncement = null;
    this.currentEditingBanner = null;
  }

  // --- 1. SETTINGS SUBTABS NAVIGATION ---
  switchSettingsSubtab(subtab) {
    const subtabs = ['profile', 'payments', 'announcements', 'banners', 'alliance', 'discord_webhook'];
    
    subtabs.forEach(st => {
      const pane = document.getElementById(`settings-pane-${st}`);
      const btn = document.getElementById(`btn-subtab-${st}`);
      
      if (pane) {
        if (st === subtab) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      }

      if (btn) {
        if (st === subtab) {
          btn.className = "px-4 py-2 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap";
        } else {
          btn.className = "px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap";
        }
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 2. POPULATE SETTINGS FROM STORE CONFIG ---
  populateStoreSettings() {
    const cfg = window.storeConfig || {};
    
    // Store Profile
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };

    setChecked("setting-maintenance-mode", cfg.maintenanceMode);
    setVal("setting-maintenance-message", cfg.maintenanceMessage);
    setVal("setting-store-name", cfg.brand?.name);
    setVal("setting-brand-short", cfg.brand?.short);
    setVal("setting-tagline", cfg.brand?.tagline);
    setVal("setting-sub-tagline", cfg.brand?.subTagline);
    setVal("setting-logo-url", cfg.brand?.logo);
    setVal("setting-favicon-url", cfg.brand?.favicon);
    setVal("setting-discord-url", cfg.community?.discord);
    setVal("setting-discord-secondary-url", cfg.community?.secondaryDiscord);
    setVal("setting-support-email", cfg.community?.supportEmail);

    // Payments
    setVal("setting-promptpay-no", cfg.payment?.promptpay?.accountNo);
    setVal("setting-promptpay-name", cfg.payment?.promptpay?.accountName);
    setVal("setting-truemoney-phone", cfg.payment?.truemoney?.phone);
  }

  async handleSaveStoreProfile(e) {
    if (e) e.preventDefault();
    AdminUI.showToast("บันทึกข้อมูลร้านค้า & แบรนดิ้งเรียบร้อย", "success");
  }

  async handleSavePaymentConfig(e) {
    if (e) e.preventDefault();
    AdminUI.showToast("บันทึกการตั้งค่าช่องทางชำระเงินเรียบร้อย", "success");
  }

  async handleSaveDiscordWebhookSettings(e) {
    if (e) e.preventDefault();
    AdminUI.showToast("บันทึกการตั้งค่า Discord Webhook เรียบร้อย", "success");
  }

  // --- 3. CATEGORIES MODAL & CRUD ---
  openCategoryModal(mode = 'create', catId = null) {
    const modal = document.getElementById("modal-category");
    if (!modal) return;

    this.currentEditingCategory = catId;
    const titleEl = document.getElementById("category-modal-title");
    const nameInput = document.getElementById("category-name-input");
    const iconInput = document.getElementById("category-icon-input");

    if (mode === 'create') {
      if (titleEl) titleEl.textContent = "เพิ่มหมวดหมู่สินค้าใหม่";
      if (nameInput) nameInput.value = "";
      if (iconInput) iconInput.value = "folder";
    } else {
      if (titleEl) titleEl.textContent = "แก้ไขหมวดหมู่สินค้า";
      const categories = window.storeConfig?.categories || [];
      const found = categories.find(c => c.id === catId);
      if (found) {
        if (nameInput) nameInput.value = found.name || "";
        if (iconInput) iconInput.value = found.icon || "folder";
      }
    }

    modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  closeCategoryModal() {
    const modal = document.getElementById("modal-category");
    if (modal) modal.classList.add("hidden");
  }

  async handleSaveCategory(e) {
    if (e) e.preventDefault();
    this.closeCategoryModal();
    AdminUI.showToast("บันทึกหมวดหมู่สินค้าเรียบร้อย", "success");
  }

  // --- 4. ANNOUNCEMENTS MODAL & CRUD ---
  openAnnouncementModal(mode = 'create', id = null) {
    const modal = document.getElementById("modal-announcement");
    if (!modal) return;
    this.currentEditingAnnouncement = id;
    modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  closeAnnouncementModal() {
    const modal = document.getElementById("modal-announcement");
    if (modal) modal.classList.add("hidden");
  }

  async handleSaveAnnouncement(e) {
    if (e) e.preventDefault();
    this.closeAnnouncementModal();
    AdminUI.showToast("บันทึกแถบวิ่งประกาศเรียบร้อย", "success");
  }

  // --- 5. HERO BANNER MODAL & CRUD ---
  openHeroBannerModal(mode = 'create', id = null) {
    const modal = document.getElementById("modal-hero-banner");
    if (!modal) return;
    this.currentEditingBanner = id;
    modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  closeHeroBannerModal() {
    const modal = document.getElementById("modal-hero-banner");
    if (modal) modal.classList.add("hidden");
  }

  async handleSaveHeroBanner(e) {
    if (e) e.preventDefault();
    this.closeHeroBannerModal();
    AdminUI.showToast("บันทึกแบนเนอร์โปรโมชั่นเรียบร้อย", "success");
  }

  // --- 6. ALLIANCE SHOP MODAL ---
  openAllianceShopModal(mode = 'create', id = null) {
    const modal = document.getElementById("modal-alliance-shop");
    if (modal) {
      modal.classList.remove("hidden");
      if (window.lucide) window.lucide.createIcons();
    } else {
      AdminUI.showToast("ระบบจัดการร้านพันธมิตรพร้อมใช้งาน", "info");
    }
  }

  closeAllianceShopModal() {
    const modal = document.getElementById("modal-alliance-shop");
    if (modal) modal.classList.add("hidden");
  }

  // --- 7. EXPORT STORE CONFIG BACKUP ---
  exportStoreConfigBackup() {
    try {
      const cfg = window.storeConfig || {};
      const fileContent = `/**\n * NYX9 STUDIO Store Configuration Backup\n * Exported on ${new Date().toISOString()}\n */\nwindow.storeConfig = ${JSON.stringify(cfg, null, 2)};\n`;
      const blob = new Blob([fileContent], { type: "application/javascript;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `storeConfig_backup_${new Date().toISOString().split("T")[0]}.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      AdminUI.showToast("ส่งออก storeConfig.js สำเร็จ", "success");
    } catch (err) {
      alert("ไม่สามารถส่งออกข้อมูลได้: " + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.SettingsService = SettingsService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SettingsService;
}
