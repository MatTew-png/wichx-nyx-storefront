/**
 * ==============================================================================
 * 🚀 NYX9 STUDIO — MASTER ADMIN OOP COORDINATOR (AdminApp)
 * ==============================================================================
 * Central bootstrapper and orchestrator for all admin services:
 * - js/admin/core/AdminStore.js              -> Reactive State Container
 * - js/admin/core/AdminUI.js                 -> Toast & Utility Helpers
 * - js/admin/core/AdminApiClient.js          -> Centralized API & RPC Client
 * - js/admin/core/AdminAuth.js               -> Whitelist, Discord OAuth & 2FA Gate
 * - js/admin/services/AnalyticsService.js    -> Charts, Metrics & CSV Export
 * - js/admin/services/InventoryService.js    -> Products, Categories, Vault & Restock
 * - js/admin/services/OrderFinanceService.js -> Orders, Topups, Claims & Reviews
 * - js/admin/services/UserService.js         -> Users, Roles, Wallets & Blacklist
 * - js/admin/services/VoucherService.js      -> Vouchers & Promo Codes Engine
 * - js/admin/services/ProgramStatusService.js-> Script Status Radar & Executors
 * - js/admin/services/SecuritySentinelService.js -> Access Logs & IP Blacklist
 * - js/admin/services/ThemeStudioService.js  -> Theme Studio & Live CSS Injection
 * ==============================================================================
 */

class AdminApp {
  constructor() {
    this.store = new window.AdminStore();
    this.ui = window.AdminUI;
    this.api = new window.AdminApiClient(this.store);
    this.auth = new window.AdminAuth(this.store, this.api);

    // Services
    this.analytics = new window.AnalyticsService(this.store, this.api);
    this.inventory = new window.InventoryService(this.store, this.api);
    this.orders = new window.OrderFinanceService(this.store, this.api);
    this.users = new window.UserService(this.store, this.api);
    this.vouchers = new window.VoucherService(this.store, this.api);
    this.programStatus = new window.ProgramStatusService(this.store, this.api);
    this.sentinel = new window.SecuritySentinelService(this.store, this.api);
    this.themeStudio = new window.ThemeStudioService(this.store, this.api);
    this.settings = new window.SettingsService(this.store, this.api);

    this.tabMetadata = {
      analytics: {
        title: "📊 สถิติ & ภาพรวมธุรกิจ (Analytics)",
        desc: "สรุปยอดขาย คำสั่งซื้อ สต็อก และแนวโน้ม 24 ชม."
      },
      categories: {
        title: "📁 จัดการหมวดหมู่สินค้าบนหน้าสโตร์ (Categories Manager)",
        desc: "สร้าง แก้ไข จัดลำดับ หรือลบหมวดหมู่สินค้าบนหน้าเว็บ พร้อมไอคอนและป้าย Badge แบบไดนามิก 100%"
      },
      settings: {
        title: "⚙️ ตั้งค่าระบบร้านค้า & มอบหมายงาน Admin (Storefront Control Suite)",
        desc: "ปรับแต่งแบรนดิ้ง, ข้อมูลติดต่อ, ช่องทางชำระเงิน, แถบวิ่งประกาศ, แบนเนอร์สไลด์ และสำรองข้อมูลได้เอง 100%"
      },
      visitors: {
        title: "🌐 ผู้เข้าชม & บันทึก IP (Visitor Logs & Telemetry)",
        desc: "ตรวจสอบ IP จริง ประเทศ อุปกรณ์ และสถิติการเข้าชมเว็บ nyxning.shop แบบเรียลไทม์"
      },
      products: {
        title: "📦 จัดการสินค้าหน้าเว็บ (Products Catalog CRUD)",
        desc: "เพิ่ม แก้ไข ลบ และเปิด-ปิดวางจำหน่ายสินค้าบนสโตร์"
      },
      vault: {
        title: "🔑 คลังคีย์สินค้า (Inventory Key Vault)",
        desc: "ตรวจสอบคีย์คงเหลือ ลบคีย์เสีย และเติมคีย์เข้าคลังแยกรายสินค้า"
      },
      users: {
        title: "👥 รายชื่อสมาชิก & วอลเล็ต (User Management)",
        desc: "ตรวจสอบยอดเงินคงเหลือ ปรับยอดวอลเล็ต และจัดการสิทธิ์ผู้ใช้"
      },
      orders: {
        title: "📑 รายการคำสั่งซื้อ (Orders Explorer)",
        desc: "ประวัติคำสั่งซื้อทั้งหมด พร้อมส่งออกรายงานยอดขาย .CSV สำหรับ Excel"
      },
      topups: {
        title: "💸 ประวัติการเติมเงิน (Top-Up Logs)",
        desc: "บันทึกป้องกันสลิปซ้ำผ่านพร้อมเพย์และซองอั่งเปาทรูมันนี่"
      },
      claims: {
        title: "🛡️ เคลมประกันสินค้า (Warranty Claims)",
        desc: "ศูนย์ดูแลหลังการขาย ตรวจสอบและอนุมัติการเคลมประกัน"
      },
      vouchers: {
        title: "🎫 จัดการคูปอง & โค้ดส่วนลด (Vouchers Engine)",
        desc: "สร้างโค้ดส่วนลดสไตล์ Shopee/TikTok กำหนดเงื่อนไขขั้นต่ำ และเปิด/ปิดการใช้งานได้ทันที"
      },
      status: {
        title: "⚡ ศูนย์ควบคุมสถานะโปรแกรม & สคริปต์ (Program Status Hub)",
        desc: "อัปเดตสถานะ Online, กำลังอัปเดต, บำรุงรักษา หรือติดสถานะตรวจสอบได้แบบเรียลไทม์"
      },
      discord: {
        title: "⚙️ Discord Webhook & แจ้งเตือน 24 ชม.",
        desc: "ตั้งค่าและยิงทดสอบ Rich Embed เข้า Channel Discord ของทีมงาน"
      },
      "access-logs": {
        title: "🛡️ ประวัติการเข้าถึง (Access Sentinel & Audit Trail)",
        desc: "ตรวจสอบบันทึก IP ทุกครั้งที่เข้าหลังบ้าน ตรวจจับการใส่ PIN ผิด สกัดกั้นบอทสแปม และจัดการ Blacklist"
      },
      theme: {
        title: "🎨 Theme Studio & Live CSS Config Preview",
        desc: "ปรับแต่งโทนสีหลัก (Accent Color) และเขียน Custom CSS พร้อมกล่องจำลองพรีวิวแบบเรียลไทม์"
      },
      reviews: {
        title: "⭐ รีวิวและความคิดเห็นจากลูกค้า",
        desc: "ตรวจสอบคะแนนดาว ความคิดเห็น และจัดการการแสดงผลรีวิวจากผู้ซื้อจริง"
      }
    };
  }

  async init() {
    this.bindWindowGlobals();
    this.api.initSupabase();

    if (typeof document !== "undefined") {
      if (window.lucide) window.lucide.createIcons();

      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorMsg = urlParams.get("error_description") || hashParams.get("error_description");
      if (errorMsg) {
        this.auth.showAuthError(decodeURIComponent(errorMsg).replace(/\+/g, " "));
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      await this.auth.checkAdminSession(() => this.loadDashboardData());
    }
  }

  async loadDashboardData() {
    const secret = this.store.get("adminSecret");
    if (!secret) return;

    const refreshBtn = document.getElementById("btn-refresh-dashboard");
    if (refreshBtn) refreshBtn.classList.add("animate-spin");

    try {
      const supabase = this.api.initSupabase();
      if (!supabase) return;

      const [metricsRes, analyticsRes, usersRes, productsRes, categoriesRes, settingsRes] = await Promise.all([
        supabase.rpc("admin_get_metrics", { p_admin_secret: secret }),
        supabase.rpc("admin_get_analytics", { p_admin_secret: secret }),
        supabase.rpc("admin_get_users", { p_admin_secret: secret }),
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.rpc("admin_manage_category", { p_admin_secret: secret, p_action: "list" }),
        supabase.rpc("get_system_settings")
      ]);

      if (metricsRes.data && metricsRes.data.success) {
        window.currentDashboardData = metricsRes.data;
        this.analytics.renderMetrics(metricsRes.data);
        this.orders.renderOrdersTable(metricsRes.data.recent_orders || []);
        this.orders.renderTopupsTable(metricsRes.data.recent_topups || []);
        this.orders.renderClaimsTable(metricsRes.data.warranty_claims || []);
      }

      if (analyticsRes.data) {
        this.analytics.renderAnalyticsDashboard(analyticsRes.data);
      }

      if (categoriesRes?.data?.success) {
        const categories = categoriesRes.data.categories || [];
        this.store.set("currentCategoriesList", categories);
        this.inventory.renderCategoriesTable();
        this.inventory.populateCategoryDropdowns();
      }

      if (settingsRes?.data) {
        this.store.set("currentSystemSettings", settingsRes.data);
      }

      if (productsRes.data) {
        this.store.set("currentProductsList", productsRes.data);
        this.inventory.renderProductsTable();
        this.inventory.populateRestockSelect();
        this.inventory.populateVaultViewSelect();
      }

      if (usersRes?.data?.success) {
        const users = usersRes.data.users || [];
        this.store.set("currentUsersList", users);
        this.users.renderUsersTable();
      }

      await this.vouchers.loadAdminVouchers();

      const savedWebhook = localStorage.getItem("nyx9_discord_webhook");
      const webhookInput = document.getElementById("discord-webhook-input");
      if (savedWebhook && webhookInput) {
        webhookInput.value = savedWebhook;
      }
    } catch (err) {
      console.error("[AdminApp] Error loading dashboard data:", err);
    } finally {
      if (refreshBtn) {
        setTimeout(() => refreshBtn.classList.remove("animate-spin"), 400);
      }
      if (window.lucide) window.lucide.createIcons();
    }
  }

  switchTab(tabKey) {
    this.store.set("currentTab", tabKey);
    const tabs = ["analytics", "visitors", "categories", "products", "vault", "vouchers", "status", "users", "orders", "topups", "claims", "reviews", "discord", "settings", "access-logs", "theme"];

    tabs.forEach(t => {
      const btn = document.getElementById(`nav-btn-${t}`);
      const pane = document.getElementById(`tab-pane-${t}`);
      if (t === tabKey) {
        if (btn) btn.classList.add("active");
        if (pane) pane.classList.remove("hidden");
      } else {
        if (btn) btn.classList.remove("active");
        if (pane) pane.classList.add("hidden");
      }
    });

    const meta = this.tabMetadata[tabKey] || this.tabMetadata.analytics;
    const titleEl = document.getElementById("page-current-title");
    const descEl = document.getElementById("page-current-desc");
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.desc;

    // Close mobile drawer if open
    const sidebar = document.getElementById("admin-sidebar");
    const backdrop = document.getElementById("mobile-sidebar-backdrop");
    if (typeof window !== "undefined" && window.innerWidth < 1024 && sidebar && !sidebar.classList.contains("-translate-x-full")) {
      sidebar.classList.add("-translate-x-full");
      if (backdrop) backdrop.classList.add("hidden");
    }

    // Tab-specific trigger loads
    if (tabKey === "access-logs") {
      this.sentinel.loadAccessSentinelLogs();
      this.sentinel.loadBlacklistList();
    } else if (tabKey === "theme") {
      this.themeStudio.initAdminThemeStudio();
    } else if (tabKey === "visitors") {
      this.sentinel.loadVisitorLogs();
    } else if (tabKey === "categories") {
      this.inventory.renderCategoriesTable();
    } else if (tabKey === "vault") {
      this.inventory.onVaultProductSelectChange();
    } else if (tabKey === "vouchers") {
      this.vouchers.loadAdminVouchers();
    } else if (tabKey === "status") {
      this.programStatus.loadAdminProgramStatuses();
    } else if (tabKey === "reviews") {
      this.orders.loadReviewsTable();
    } else if (tabKey === "analytics") {
      this.analytics.resizeCharts();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  saveDiscordWebhook() {
    const input = document.getElementById("discord-webhook-input");
    const url = input?.value?.trim() || "";
    const feedback = document.getElementById("discord-test-feedback");

    if (url && !url.startsWith("http")) {
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = "รูปแบบ Discord Webhook URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)";
        feedback.classList.remove("hidden");
      }
      return;
    }

    localStorage.setItem("nyx9_discord_webhook", url);
    if (feedback) {
      feedback.className = "text-xs p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200";
      feedback.textContent = "✅ บันทึก Discord Webhook URL สำเร็จแล้ว!";
      feedback.classList.remove("hidden");
    }
  }

  async testDiscordWebhook() {
    const input = document.getElementById("discord-webhook-input");
    const url = input?.value?.trim() || localStorage.getItem("nyx9_discord_webhook");
    const btn = document.getElementById("btn-test-webhook");
    const feedback = document.getElementById("discord-test-feedback");

    if (!url || !url.startsWith("http")) {
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = "กรุณาระบุ Discord Webhook URL ให้ถูกต้องก่อนทดสอบ";
        feedback.classList.remove("hidden");
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังส่งข้อความ...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await fetch("/api/discord-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TEST_PING", customWebhookUrl: url })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (feedback) {
          feedback.className = "text-xs p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200";
          feedback.textContent = "🎉 ยิงข้อความทดสอบสำเร็จ! ตรวจสอบที่ Discord Channel ของคุณได้ทันที";
          feedback.classList.remove("hidden");
        }
      } else {
        if (feedback) {
          feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
          feedback.textContent = data.message || "Discord ปฏิเสธการส่ง (ตรวจสอบความถูกต้องของ Webhook URL)";
          feedback.classList.remove("hidden");
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = "เกิดข้อผิดพลาดในการเชื่อมต่อ: " + err.message;
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> <span>ส่งข้อความทดสอบ (Test Ping)</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  bindWindowGlobals() {
    if (typeof window === "undefined") return;

    window.AdminAppInstance = this;
    window.currentAdminSecret = this.store.get("adminSecret");
    this.store.subscribe("adminSecret", (val) => { window.currentAdminSecret = val; });

    // Navigation & General
    window.switchAdminTab = (tab) => this.switchTab(tab);
    window.loadDashboardData = () => this.loadDashboardData();
    window.setChartTimespan = (d) => this.analytics.setChartTimespan(d);
    window.exportOrdersToCSV = () => this.analytics.exportOrdersToCSV();

    // Auth
    window.loginWithDiscordAdmin = () => this.auth.loginWithDiscordAdmin();
    window.handleAdminLogin = (e) => this.auth.handleAdminLogin(e, () => this.loadDashboardData());
    window.handleAdminLogout = () => this.auth.handleAdminLogout();
    window.togglePasswordVisibility = () => this.auth.togglePasswordVisibility();
    window.checkAdminPin2FA = () => this.auth.checkAdminPin2FA();
    window.handleRequestAdminPinOtp = () => this.auth.handleRequestAdminPinOtp();
    window.handleVerifyAdminPin = () => this.auth.handleVerifyAdminPin(() => this.loadDashboardData());

    // Products & Inventory
    window.filterProductsTable = () => this.inventory.filterProductsTable();
    window.openProductModal = (m, id) => this.inventory.openProductModal(m, id);
    window.closeProductModal = () => this.inventory.closeProductModal();
    window.handleSaveProduct = (e) => this.inventory.handleSaveProduct(e, () => this.loadDashboardData());
    window.handleToggleProductActive = (id) => this.inventory.handleToggleProductActive(id, () => this.loadDashboardData());
    window.handleDeleteProduct = (id, title) => this.inventory.handleDeleteProduct(id, title, () => this.loadDashboardData());

    // Vault & Restock
    window.navigateToProductVault = (id) => {
      this.switchTab("vault");
      const sel = document.getElementById("vault-product-select");
      if (sel) {
        sel.value = id;
        this.inventory.onVaultProductSelectChange();
      }
    };
    window.onVaultProductSelectChange = () => this.inventory.onVaultProductSelectChange();
    window.handleDeleteVaultKey = async (id) => {
      if (!confirm("ยืนยันการลบคีย์นี้ออกจากคลัง?")) return;
      try {
        await this.api.rpc("admin_manage_keys", { p_action: "delete", p_product_id: this.inventory.currentVaultProductId, p_keys: [id] });
        AdminUI.showToast("ลบคีย์เรียบร้อย", "success");
        await this.inventory.onVaultProductSelectChange();
        await this.loadDashboardData();
      } catch (e) {
        alert("ข้อผิดพลาด: " + e.message);
      }
    };
    window.handleBulkRestock = (e) => this.inventory.handleBulkRestock(e, () => this.loadDashboardData());

    // Users
    window.filterUsersTable = () => this.users.filterUsersTable();
    window.openAdjustWalletModal = (uid, uname, did, bal, av) => this.users.openAdjustWalletModal(uid, uname, did, bal, av);
    window.closeAdjustWalletModal = () => this.users.closeAdjustWalletModal();
    window.updateBalancePreview = () => this.users.updateBalancePreview();
    window.handleAdjustWallet = (e) => this.users.handleAdjustWallet(e, () => this.loadDashboardData());
    window.handleToggleRole = (uid, uname, r) => this.users.handleToggleRole(uid, uname, r, () => this.loadDashboardData());
    window.handleToggleBlacklist = (uid, uname, bl) => this.users.handleToggleBlacklist(uid, uname, bl, () => this.loadDashboardData());

    // Claims & Reviews
    window.resolveClaim = (cid, st) => this.orders.resolveClaim(cid, st, () => this.loadDashboardData());
    window.loadReviewsTable = () => this.orders.loadReviewsTable();
    window.toggleReviewVisibility = (id, st) => this.orders.toggleReviewVisibility(id, st);
    window.deleteReview = (id) => this.orders.deleteReview(id);
    window.runLiveApiHealthCheck = () => this.orders.runLiveApiHealthCheck();

    // Vouchers
    window.generateRandomPromoCode = () => this.vouchers.generateRandomPromoCode();
    window.loadAdminVouchers = () => this.vouchers.loadAdminVouchers();
    window.handleCreateVoucher = (e) => this.vouchers.handleCreateVoucher(e);
    window.toggleAdminVoucher = (c) => this.vouchers.toggleAdminVoucher(c);
    window.deleteAdminVoucher = (c) => this.vouchers.deleteAdminVoucher(c);

    // Program Status
    window.loadAdminProgramStatuses = () => this.programStatus.loadAdminProgramStatuses();
    window.openAddProgramStatusModal = () => this.programStatus.openAddProgramStatusModal();
    window.closeProgramStatusModal = () => this.programStatus.closeProgramStatusModal();
    window.handleSaveProgramStatus = () => this.programStatus.handleSaveProgramStatus();
    window.handleUpdateProgramStatus = (id, st) => this.programStatus.handleUpdateProgramStatus(id, st);
    window.handleDeleteProgramStatus = (id) => this.programStatus.handleDeleteProgramStatus(id);

    // Sentinel & Visitor
    window.loadAccessSentinelLogs = () => this.sentinel.loadAccessSentinelLogs();
    window.blacklistIpFromSentinel = (ip) => this.sentinel.blacklistIpFromSentinel(ip);
    window.blacklistManualIp = () => this.sentinel.blacklistManualIp();
    window.loadBlacklistList = () => this.sentinel.loadBlacklistList();
    window.removeBlacklistFromSentinel = (ip) => this.sentinel.removeBlacklistFromSentinel(ip);
    window.loadVisitorLogs = (fb) => this.sentinel.loadVisitorLogs(fb);
    window.filterVisitorTable = () => this.sentinel.filterVisitorTable();
    window.handleQuickBlacklistIp = (ip) => this.sentinel.handleQuickBlacklistIp(ip);
    window.toggleVisitorAutoRefresh = () => this.sentinel.toggleVisitorAutoRefresh();

    // Theme Studio
    window.initAdminThemeStudio = () => this.themeStudio.initAdminThemeStudio();
    window.selectThemePreset = (k, a, h, g) => this.themeStudio.selectThemePreset(k, a, h, g);
    window.onCustomColorPick = (val) => this.themeStudio.onCustomColorPick(val);
    window.onCustomHexInput = (val) => this.themeStudio.onCustomHexInput(val);
    window.updateLiveThemePreview = () => this.themeStudio.updateLiveThemePreview();
    window.saveAdminThemeSettings = () => this.themeStudio.saveAdminThemeSettings();

    // Settings & Categories & Banners
    window.switchSettingsSubtab = (s) => this.settings.switchSettingsSubtab(s);
    window.exportStoreConfigBackup = () => this.settings.exportStoreConfigBackup();
    window.handleSaveStoreProfile = (e) => this.settings.handleSaveStoreProfile(e);
    window.handleSavePaymentConfig = (e) => this.settings.handleSavePaymentConfig(e);
    window.handleSaveDiscordWebhookSettings = (e) => this.settings.handleSaveDiscordWebhookSettings(e);
    window.openCategoryModal = (m, id) => this.settings.openCategoryModal(m, id);
    window.closeCategoryModal = () => this.settings.closeCategoryModal();
    window.handleSaveCategory = (e) => this.settings.handleSaveCategory(e);
    window.openAnnouncementModal = (m, id) => this.settings.openAnnouncementModal(m, id);
    window.closeAnnouncementModal = () => this.settings.closeAnnouncementModal();
    window.handleSaveAnnouncement = (e) => this.settings.handleSaveAnnouncement(e);
    window.openHeroBannerModal = (m, id) => this.settings.openHeroBannerModal(m, id);
    window.closeHeroBannerModal = () => this.settings.closeHeroBannerModal();
    window.handleSaveHeroBanner = (e) => this.settings.handleSaveHeroBanner(e);
    window.openAllianceShopModal = (m, id) => this.settings.openAllianceShopModal(m, id);
    window.closeAllianceShopModal = () => this.settings.closeAllianceShopModal();

    // Vault View Advanced Controllers
    window.switchVaultViewSubtab = (t) => this.inventory.switchVaultViewSubtab(t);
    window.loadVaultViewKeys = (id) => this.inventory.loadVaultViewKeys(id);
    window.handleVaultViewQuickAdd = () => this.inventory.handleVaultViewQuickAdd();
    window.handleVaultViewFileUpload = (e) => this.inventory.handleVaultViewFileUpload(e);
    window.handleVaultViewSyncStock = () => this.inventory.handleVaultViewSyncStock();
    window.handleVaultViewClearStock = () => this.inventory.handleVaultViewClearStock();
    window.openBulkRestockModal = (id) => this.inventory.openBulkRestockModal(id);
    window.closeBulkRestockModal = () => this.inventory.closeBulkRestockModal();

    // UI Helpers
    window.copyToClipboard = (text) => AdminUI.copyToClipboard(text);
    window.escapeHtml = (text) => AdminUI.escapeHtml(text);
    window.escapeJs = (text) => AdminUI.escapeJs(text);
    window.toggleMobileSidebar = () => AdminUI.toggleMobileSidebar();

    // Discord Webhook
    window.saveDiscordWebhook = () => this.saveDiscordWebhook();
    window.testDiscordWebhook = () => this.testDiscordWebhook();
  }
}

// Explicit top-level wrapper functions for backwards compatibility and test assertions
function initAdminThemeStudio() {
  return window.AdminAppInstance ? window.AdminAppInstance.themeStudio.initAdminThemeStudio() : null;
}
function saveAdminThemeSettings() {
  return window.AdminAppInstance ? window.AdminAppInstance.themeStudio.saveAdminThemeSettings() : null;
}
function exportOrdersToCSV() {
  return window.AdminAppInstance ? window.AdminAppInstance.analytics.exportOrdersToCSV() : null;
}
function loadAccessSentinelLogs() {
  return window.AdminAppInstance ? window.AdminAppInstance.sentinel.loadAccessSentinelLogs() : null;
}
function switchAdminTab(tabKey) {
  return window.AdminAppInstance ? window.AdminAppInstance.switchTab(tabKey) : null;
}

// Auto-boot on DOM ready
if (typeof window !== "undefined") {
  window.AdminApp = AdminApp;
  const initApp = () => {
    if (!window.AdminAppInstance) {
      const app = new AdminApp();
      app.init();
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminApp;
}
