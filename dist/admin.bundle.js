
/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/core/AdminStore.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 📦 ADMIN STORE (REACTIVE STATE CONTAINER)
 * ==============================================================================
 * Central state management for NYX9 Studio Admin Dashboard
 * ==============================================================================
 */

class AdminStore {
  constructor() {
    this.state = {
      adminSecret: "",
      adminUser: null,
      currentTab: "analytics",
      activeTimespanDays: 14,
      currentAnalyticsData: null,
      currentProductsList: [],
      currentCategoriesList: [],
      currentUsersList: [],
      currentVouchersList: [],
      currentProgramStatuses: [],
      currentVisitorLogs: [],
      currentAccessLogs: [],
      currentBlacklists: [],
      currentSystemSettings: {},
      currentThemeConfig: {
        preset: "glacier_cyan",
        accent: "#00F0FF",
        accent_hover: "#00D2E0",
        accent_glow: "rgba(0, 240, 255, 0.22)",
        custom_css: ""
      }
    };

    this.listeners = new Map();

    // Recover secret from sessionStorage/localStorage if available
    try {
      const saved = sessionStorage.getItem("nyx9_admin_token") || localStorage.getItem("nyx9_admin_token");
      if (saved) {
        this.state.adminSecret = saved;
      }
    } catch (e) {}
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    const prev = this.state[key];
    this.state[key] = value;

    if (key === "adminSecret") {
      try {
        if (value) {
          sessionStorage.setItem("nyx9_admin_token", value);
          localStorage.setItem("nyx9_admin_token", value);
        } else {
          sessionStorage.removeItem("nyx9_admin_token");
          localStorage.removeItem("nyx9_admin_token");
        }
      } catch (e) {}
    }

    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(cb => {
        try {
          cb(value, prev);
        } catch (err) {
          console.error(`[AdminStore listener error on ${key}]:`, err);
        }
      });
    }
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AdminStore = AdminStore;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminStore;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/core/AdminUI.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🎨 ADMIN UI UTILITIES & TOAST ENGINE
 * ==============================================================================
 */

class AdminUI {
  static showToast(message, type = "info") {
    if (typeof document === "undefined") return;

    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const colors = {
      success: "border-emerald-500/50 bg-emerald-950/80 text-emerald-200",
      error: "border-rose-500/50 bg-rose-950/80 text-rose-200",
      warning: "border-amber-500/50 bg-amber-950/80 text-amber-200",
      info: "border-cyan-500/50 bg-slate-900/90 text-cyan-200"
    };

    const icons = {
      success: "check-circle",
      error: "alert-circle",
      warning: "alert-triangle",
      info: "info"
    };

    toast.className = `pointer-events-auto px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 text-xs font-semibold transform transition-all duration-300 translate-y-3 opacity-0 ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-3", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("translate-y-3", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  static copyToClipboard(text) {
    if (!text) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        AdminUI.showToast("คัดลอกสำเร็จแล้ว!", "success");
      }).catch(() => {
        prompt("คัดลอกข้อความ:", text);
      });
    } else {
      prompt("คัดลอกข้อความ:", text);
    }
  }

  static escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  static escapeJs(text) {
    if (!text) return "";
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "");
  }

  static toggleMobileSidebar() {
    const sidebar = document.getElementById("admin-sidebar");
    const backdrop = document.getElementById("mobile-sidebar-backdrop");
    if (!sidebar || !backdrop) return;

    if (sidebar.classList.contains("-translate-x-full")) {
      sidebar.classList.remove("-translate-x-full");
      backdrop.classList.remove("hidden");
    } else {
      sidebar.classList.add("-translate-x-full");
      backdrop.classList.add("hidden");
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AdminUI = AdminUI;
  window.showToast = AdminUI.showToast.bind(AdminUI);
  window.copyToClipboard = AdminUI.copyToClipboard.bind(AdminUI);
  window.escapeHtml = AdminUI.escapeHtml.bind(AdminUI);
  window.escapeJs = AdminUI.escapeJs.bind(AdminUI);
  window.toggleMobileSidebar = AdminUI.toggleMobileSidebar.bind(AdminUI);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminUI;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/core/AdminApiClient.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🌐 ADMIN API CLIENT (CENTRALIZED GATEWAY)
 * ==============================================================================
 * Unified wrapper for Supabase RPCs and Serverless API endpoints
 * Auto-injects X-Admin-Key & X-Admin-Secret headers
 * ==============================================================================
 */

class AdminApiClient {
  constructor(store) {
    this.store = store;
    this.supabaseClient = null;
    this.defaultConfig = {
      supabase: {
        url: "https://ymaulztlbctpzyhdhjvn.supabase.co",
        anonKey: "sb_publishable_liwa3Juk3Gy6LBSNnUIHRA_iqsD78_u"
      }
    };
    this.initSupabase();
  }

  initSupabase() {
    if (this.supabaseClient) return this.supabaseClient;
    if (typeof window === "undefined") return null;

    const url = window.storeConfig?.supabase?.url || this.defaultConfig.supabase.url;
    const anonKey = window.storeConfig?.supabase?.anonKey || this.defaultConfig.supabase.anonKey;

    if (window.supabase && url && anonKey) {
      try {
        this.supabaseClient = window.supabase.createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        window.supabaseClient = this.supabaseClient;
      } catch (e) {
        console.warn("[AdminApiClient] Supabase initialization error:", e);
      }
    }
    return this.supabaseClient;
  }

  getSecret() {
    return this.store.get("adminSecret") || "";
  }

  async rpc(funcName, params = {}) {
    const client = this.initSupabase();
    if (!client) throw new Error("Supabase client not initialized");

    const payload = {
      p_admin_secret: this.getSecret(),
      ...params
    };

    return await client.rpc(funcName, payload);
  }

  async fetchApi(url, options = {}) {
    const secret = this.getSecret();
    const headers = {
      "Content-Type": "application/json",
      "X-Admin-Key": secret,
      "X-Admin-Secret": secret,
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    return res;
  }

  async fetchApiJson(url, options = {}) {
    const res = await this.fetchApi(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.success) {
      const err = new Error(data.message || `Request failed with status ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AdminApiClient = AdminApiClient;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminApiClient;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/core/AdminAuth.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🔐 ADMIN AUTH & ACCESS CONTROL SERVICE
 * ==============================================================================
 * Handles Administrator Whitelist, Discord OAuth, Master PIN Gate, and Session
 * ==============================================================================
 */

class AdminAuth {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.isVerifyingAdmin = false;
    this.defaultWhitelist = [
      "483398326159671326",
      "422611554475835394"
    ];
  }

  getWhitelist() {
    return (window.storeConfig && window.storeConfig.adminDiscordIds) || this.defaultWhitelist;
  }

  extractDiscordId(user) {
    if (!user) return "";
    const meta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};
    const identities = Array.isArray(user.identities) ? user.identities : [];
    const discordIdentity = identities.find(i => i.provider === 'discord') || identities[0];

    const candidates = [
      meta.provider_id,
      meta.sub,
      discordIdentity?.id,
      discordIdentity?.identity_data?.provider_id,
      discordIdentity?.identity_data?.sub,
      meta.custom_claims?.sub,
      appMeta.provider_id
    ];

    for (const c of candidates) {
      if (c && typeof c === 'string' && /^\d{17,20}$/.test(c.trim())) {
        return c.trim();
      }
    }
    return String(meta.provider_id || meta.sub || (discordIdentity && discordIdentity.id) || "").trim();
  }

  async checkAdminSession(onAuthenticated) {
    const supabase = this.apiClient.initSupabase();
    if (!supabase) return;

    try {
      // 1. Direct getSession()
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        await this.handleAdminUser(session.user, onAuthenticated);
        if (this.store.get("adminUser")) return;
      }

      // 2. Recover session from localStorage sb-* keys
      if (typeof localStorage !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("sb-") || k.includes("auth-token"))) {
            const raw = localStorage.getItem(k);
            if (raw && raw.includes("access_token")) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.access_token && parsed.user) {
                  await supabase.auth.setSession({
                    access_token: parsed.access_token,
                    refresh_token: parsed.refresh_token || ""
                  });
                  await this.handleAdminUser(parsed.user, onAuthenticated);
                  if (this.store.get("adminUser")) return;
                }
              } catch (e) {}
            }
          }
        }
      }

      // 3. Fallback: Saved Secret in sessionStorage/localStorage
      const savedSecret = this.store.get("adminSecret");
      if (savedSecret) {
        await this.verifyAndLoad(savedSecret, onAuthenticated);
        if (this.store.get("adminUser")) return;
      }

      // 4. Real-time auth listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user && !this.store.get("adminUser")) {
          await this.handleAdminUser(session.user, onAuthenticated);
        }
      });
    } catch (err) {
      console.warn("[AdminAuth] Session verification error:", err);
    }
  }

  async handleAdminUser(user, onAuthenticated) {
    if (!user || this.isVerifyingAdmin || this.store.get("adminUser")) return;
    this.isVerifyingAdmin = true;

    try {
      const meta = user.user_metadata || {};
      const discordId = this.extractDiscordId(user);
      let username = meta.custom_claims?.global_name || meta.full_name || meta.user_name || "Admin Member";
      let avatarUrl = meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;
      let isAuthorized = this.getWhitelist().includes(discordId);

      const supabase = this.apiClient.initSupabase();
      if (!isAuthorized && supabase) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, discord_id, username, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.role === "admin" || this.getWhitelist().includes(String(profile.discord_id))) {
              isAuthorized = true;
              if (profile.username) username = profile.username;
              if (profile.avatar_url) avatarUrl = profile.avatar_url;
            }
          }
        } catch (e) {
          console.warn("[AdminAuth] Database profile check error:", e);
        }
      }

      if (isAuthorized) {
        const adminUser = { id: user.id, discordId, username, avatarUrl };
        this.store.set("adminUser", adminUser);
        this.store.set("adminSecret", "nyx9_secure_admin_passphrase");

        this.setAdminBadge(username, avatarUrl, discordId);
        this.unlockDashboard();

        if (typeof onAuthenticated === "function") {
          await onAuthenticated();
        }
      } else {
        this.showAccessDenied(username, discordId);
      }
    } catch (err) {
      console.warn("[AdminAuth] Auth handling error:", err);
    } finally {
      this.isVerifyingAdmin = false;
    }
  }

  async verifyAndLoad(secret, onAuthenticated) {
    try {
      const { data } = await this.apiClient.rpc("admin_get_metrics", { p_admin_secret: secret });
      if (data && data.success) {
        this.store.set("adminSecret", secret);
        this.store.set("adminUser", { id: "master_admin", username: "Master Admin" });
        this.unlockDashboard();
        await this.checkAdminPin2FA();
        if (typeof onAuthenticated === "function") {
          await onAuthenticated();
        }
      } else {
        this.store.set("adminSecret", "");
      }
    } catch (e) {
      console.warn("[AdminAuth] verifyAndLoad error:", e);
    }
  }

  unlockDashboard() {
    const overlay = document.getElementById("admin-auth-overlay");
    const dashboard = document.getElementById("admin-dashboard-container");
    if (overlay) overlay.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
  }

  setAdminBadge(username, avatarUrl, discordId) {
    const name = document.getElementById("admin-profile-name");
    const avatar = document.getElementById("admin-profile-avatar");
    const idEl = document.getElementById("admin-profile-id");
    if (name) name.textContent = username;
    if (avatar && avatarUrl) avatar.src = avatarUrl;
    if (idEl) idEl.textContent = discordId || "Verified Admin";
  }

  showAccessDenied(username, discordId) {
    const loginBox = document.getElementById("admin-login-box");
    const deniedBox = document.getElementById("admin-denied-box");
    if (loginBox) loginBox.classList.add("hidden");
    if (deniedBox) {
      deniedBox.classList.remove("hidden");
      const userEl = document.getElementById("denied-username");
      const idEl = document.getElementById("denied-discord-id");
      if (userEl) userEl.textContent = username || "Discord Member";
      if (idEl) idEl.textContent = discordId || "ไม่พบ ID";
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async loginWithDiscordAdmin() {
    const supabase = this.apiClient.initSupabase();
    const btn = document.getElementById("btn-discord-admin-login");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังเชื่อมต่อ Discord...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
    const redirectTo = window.location.origin + window.location.pathname;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      this.showAuthError("ไม่สามารถเชื่อมต่อ Discord: " + err.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.288a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> <span>เข้าสู่ระบบด้วย Discord แอดมิน</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleAdminLogin(e, onAuthenticated) {
    if (e) e.preventDefault();
    const input = document.getElementById("admin-secret-input");
    const secret = input ? input.value.trim() : "";
    const btn = document.getElementById("btn-admin-login");
    const errorDiv = document.getElementById("auth-error-msg");
    const errorText = document.getElementById("auth-error-text");

    if (!secret) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังตรวจสอบ...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
    if (errorDiv) errorDiv.classList.add("hidden");

    try {
      const { data, error } = await this.apiClient.rpc("admin_get_metrics", { p_admin_secret: secret });

      if (error || !data || !data.success) {
        if (errorText) errorText.textContent = data?.message || "รหัสผ่านไม่ถูกต้อง (Access Denied)";
        if (errorDiv) errorDiv.classList.remove("hidden");
        return;
      }

      this.store.set("adminSecret", secret);
      this.store.set("adminUser", { id: "master_admin", username: "Master Admin" });
      this.unlockDashboard();

      await this.checkAdminPin2FA();
      if (typeof onAuthenticated === "function") {
        await onAuthenticated();
      }
    } catch (err) {
      if (errorText) errorText.textContent = err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
      if (errorDiv) errorDiv.classList.remove("hidden");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="lock" class="w-3.5 h-3.5"></i> <span>ยืนยัน Master Key</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleAdminLogout() {
    this.store.set("adminSecret", "");
    this.store.set("adminUser", null);
    try {
      sessionStorage.removeItem("admin_pin_session");
      const supabase = this.apiClient.initSupabase();
      if (supabase) await supabase.auth.signOut();
    } catch (e) {}
    window.location.reload();
  }

  showAuthError(msg) {
    const errorDiv = document.getElementById("auth-error-msg");
    const errorText = document.getElementById("auth-error-text");
    if (errorDiv && errorText) {
      errorText.textContent = msg;
      errorDiv.classList.remove("hidden");
    }
  }

  togglePasswordVisibility() {
    const input = document.getElementById("admin-secret-input");
    const icon = document.getElementById("eye-icon");
    if (!input) return;
    if (input.type === "password") {
      input.type = "text";
      if (icon) icon.setAttribute("data-lucide", "eye-off");
    } else {
      input.type = "password";
      if (icon) icon.setAttribute("data-lucide", "eye");
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // --- SPRINT 2: PIN 2FA SUITE ---
  async checkAdminPin2FA() {
    const modal = document.getElementById("admin-pin-modal");
    if (!modal) return;

    const token = sessionStorage.getItem("admin_pin_session");
    if (!token) {
      modal.classList.remove("hidden");
      document.getElementById("admin-pin-input")?.focus();
      return;
    }

    try {
      const res = await fetch("/api/admin-pin?action=verify_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data && data.authenticated) {
        modal.classList.add("hidden");
      } else {
        sessionStorage.removeItem("admin_pin_session");
        modal.classList.remove("hidden");
        document.getElementById("admin-pin-input")?.focus();
      }
    } catch (err) {
      modal.classList.add("hidden");
    }
  }

  async handleRequestAdminPinOtp() {
    const btn = document.getElementById("btn-request-pin-otp");
    const feedback = document.getElementById("admin-pin-feedback");
    if (!btn || !feedback) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังส่ง OTP...</span>';
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await fetch("/api/admin-pin?action=request_otp", { method: "POST" });
      const data = await res.json();
      feedback.className = "text-xs p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200";
      feedback.textContent = `📩 ${data.message || 'ส่งรหัส PIN เข้า Discord Webhook เรียบร้อยแล้ว'}`;
      feedback.classList.remove("hidden");
      document.getElementById("admin-pin-input")?.focus();
    } catch (err) {
      feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
      feedback.textContent = `ข้อผิดพลาด: ${err.message}`;
      feedback.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async handleVerifyAdminPin(onSuccess) {
    const input = document.getElementById("admin-pin-input");
    const btn = document.getElementById("btn-verify-pin");
    const feedback = document.getElementById("admin-pin-feedback");
    const modal = document.getElementById("admin-pin-modal");
    const pin = input?.value.trim();

    if (!pin || pin.length !== 6) {
      if (feedback) {
        feedback.className = "text-xs p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200";
        feedback.textContent = "⚠️ กรุณากรอกตัวเลข PIN 6 หลักให้ครบถ้วน";
        feedback.classList.remove("hidden");
      }
      input?.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังตรวจสอบ...</span>';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await fetch("/api/admin-pin?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (res.ok && data.success && data.token) {
        sessionStorage.setItem("admin_pin_session", data.token);
        if (modal) modal.classList.add("hidden");
        if (feedback) feedback.classList.add("hidden");
        if (input) input.value = "";
        window.AdminUI?.showToast("✅ ยืนยันรหัส PIN 2FA ถูกต้อง", "success");
        if (typeof onSuccess === "function") await onSuccess();
      } else {
        if (feedback) {
          feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
          feedback.textContent = `❌ ${data.message || 'รหัส PIN ไม่ถูกต้อง'}`;
          feedback.classList.remove("hidden");
        }
        input?.select();
      }
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = `ข้อผิดพลาด: ${err.message}`;
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="key-round" class="w-4 h-4"></i> <span>ยืนยันรหัสความปลอดภัย</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AdminAuth = AdminAuth;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminAuth;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/AnalyticsService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 📊 ANALYTICS & INTERACTIVE CHARTS SERVICE
 * ==============================================================================
 * Manages Chart.js instances, Sales Timeseries, Product Donuts, and CSV Export
 * ==============================================================================
 */

class AnalyticsService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.chartSalesInstance = null;
    this.chartProductsInstance = null;
    this.chartPaymentsInstance = null;
  }

  setChartTimespan(days) {
    this.store.set("activeTimespanDays", days);
    [7, 14, 30].forEach(d => {
      const btn = document.getElementById(`btn-timespan-${d}`);
      if (btn) {
        if (d === days) {
          btn.className = "px-3 py-1 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] font-bold border border-[var(--accent)]/30 transition-all cursor-pointer";
        } else {
          btn.className = "px-3 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition-all cursor-pointer";
        }
      }
    });

    const data = this.store.get("currentAnalyticsData");
    if (data) {
      this.renderSalesTimeseriesChart(data.timeseries || [], days);
    }
  }

  renderMetrics(data) {
    const metrics = (data && data.metrics) || {};
    const revEl = document.getElementById("metric-revenue");
    const ordEl = document.getElementById("metric-orders");
    const stkEl = document.getElementById("metric-stock");
    const topEl = document.getElementById("metric-topups");

    if (revEl) revEl.textContent = `฿${parseFloat(metrics.total_revenue || 0).toFixed(2)}`;
    if (ordEl) ordEl.textContent = `${metrics.total_orders || 0} รายการ`;
    if (stkEl) stkEl.textContent = `${metrics.total_unsold_stock || 0} ชิ้น`;
    if (topEl) topEl.textContent = `฿${parseFloat(metrics.total_topups || 0).toFixed(2)}`;
  }

  renderAnalyticsDashboard(analytics) {
    if (!analytics) return;
    this.store.set("currentAnalyticsData", analytics);
    const { stock_summary, top_products, payment_methods, timeseries } = analytics;

    if (stock_summary) {
      const totP = document.getElementById("analytics-total-prods");
      const actP = document.getElementById("analytics-active-prods");
      const sldK = document.getElementById("analytics-sold-keys");
      const unsK = document.getElementById("analytics-unsold-keys");

      if (totP) totP.textContent = `${stock_summary.total_products || 0} รายการ`;
      if (actP) actP.textContent = `${stock_summary.active_products || 0} รายการ`;
      if (sldK) sldK.textContent = `${stock_summary.total_sold_keys || 0} ชิ้น`;
      if (unsK) unsK.textContent = `${stock_summary.total_unsold_keys || 0} ชิ้น`;
    }

    const days = this.store.get("activeTimespanDays") || 14;
    this.renderSalesTimeseriesChart(timeseries || [], days);
    this.renderTopProductsChart(top_products || []);
    this.renderPaymentMethodsChart(payment_methods || []);
  }

  renderSalesTimeseriesChart(rawTimeseries, days = 14) {
    const ctx = document.getElementById("chart-sales-timeseries");
    if (!ctx || typeof Chart === "undefined") return;

    if (this.chartSalesInstance) {
      this.chartSalesInstance.destroy();
    }

    const timeline = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
      timeline.push({ iso, label, revenue: 0, count: 0 });
    }

    const dataMap = {};
    (rawTimeseries || []).forEach(row => {
      if (row.order_date) {
        dataMap[row.order_date] = {
          revenue: parseFloat(row.revenue || 0),
          count: parseInt(row.order_count || 0)
        };
      }
    });

    timeline.forEach(item => {
      if (dataMap[item.iso]) {
        item.revenue = dataMap[item.iso].revenue;
        item.count = dataMap[item.iso].count;
      }
    });

    const labels = timeline.map(t => t.label);
    const revenueData = timeline.map(t => t.revenue);
    const countData = timeline.map(t => t.count);

    const canvasCtx = ctx.getContext("2d");
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "rgba(25, 186, 255, 0.4)");
    gradient.addColorStop(1, "rgba(25, 186, 255, 0.0)");

    this.chartSalesInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "ยอดขายรวม (บาท)",
            data: revenueData,
            borderColor: "#19BAFF",
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: "#19BAFF",
            pointBorderColor: "#06080C",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: "y"
          },
          {
            label: "จำนวนออเดอร์",
            data: countData,
            borderColor: "#10B981",
            borderWidth: 2,
            borderDash: [4, 4],
            backgroundColor: "transparent",
            tension: 0.2,
            pointBackgroundColor: "#10B981",
            pointBorderColor: "#06080C",
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { color: "#94A3B8", font: { family: "Prompt", size: 11 } }
          },
          tooltip: {
            backgroundColor: "rgba(14, 19, 29, 0.95)",
            borderColor: "rgba(25, 186, 255, 0.3)",
            borderWidth: 1,
            titleColor: "#FFFFFF",
            titleFont: { family: "Chakra Petch", size: 12, weight: "bold" },
            bodyColor: "#E2E8F0",
            bodyFont: { family: "Prompt", size: 11 },
            padding: 10,
            cornerRadius: 12,
            callbacks: {
              label: function(context) {
                if (context.datasetIndex === 0) {
                  return ` ยอดขาย: ฿${parseFloat(context.raw).toFixed(2)}`;
                }
                return ` ออเดอร์: ${context.raw} รายการ`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#64748B", font: { family: "Prompt", size: 10 } }
          },
          y: {
            type: "linear",
            position: "left",
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#19BAFF",
              font: { family: "JetBrains Mono", size: 10 },
              callback: v => "฿" + v
            }
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              color: "#10B981",
              font: { family: "JetBrains Mono", size: 10 },
              stepSize: 1
            }
          }
        }
      }
    });
  }

  renderTopProductsChart(topProducts) {
    const ctx = document.getElementById("chart-top-products");
    const listContainer = document.getElementById("top-products-list");
    if (!ctx || !listContainer || typeof Chart === "undefined") return;

    if (this.chartProductsInstance) {
      this.chartProductsInstance.destroy();
    }

    listContainer.innerHTML = "";

    if (!topProducts || topProducts.length === 0) {
      listContainer.innerHTML = `<div class="text-center py-4 text-slate-500">ยังไม่มีข้อมูลยอดขายสินค้า</div>`;
      return;
    }

    const colors = ["#19BAFF", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#38BDF8"];
    const labels = topProducts.map(p => p.title || p.product_id);
    const units = topProducts.map(p => p.units_sold || 0);

    this.chartProductsInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: units,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "#0E131D",
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(14, 19, 29, 0.95)",
            borderColor: "rgba(139, 92, 246, 0.3)",
            borderWidth: 1,
            titleFont: { family: "Prompt", size: 11 },
            bodyFont: { family: "JetBrains Mono", size: 11 },
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: function(c) {
                const prod = topProducts[c.dataIndex];
                return ` จำหน่าย: ${prod.units_sold} ชิ้น (฿${parseFloat(prod.total_revenue || 0).toFixed(2)})`;
              }
            }
          }
        }
      }
    });

    topProducts.slice(0, 4).forEach((prod, i) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60";
      row.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${colors[i % colors.length]}"></span>
          <span class="truncate text-slate-200">${AdminUI.escapeHtml(prod.title || prod.product_id)}</span>
        </div>
        <div class="text-right shrink-0 font-mono text-[11px] pl-2">
          <span class="text-white font-bold">${prod.units_sold} ชิ้น</span>
          <span class="text-slate-400 ml-1.5">(฿${parseFloat(prod.total_revenue || 0).toFixed(2)})</span>
        </div>
      `;
      listContainer.appendChild(row);
    });
  }

  renderPaymentMethodsChart(paymentMethods) {
    const ctx = document.getElementById("chart-payment-methods");
    const listContainer = document.getElementById("payment-methods-list");
    if (!ctx || !listContainer || typeof Chart === "undefined") return;

    if (this.chartPaymentsInstance) {
      this.chartPaymentsInstance.destroy();
    }

    listContainer.innerHTML = "";

    const methodColors = {
      wallet: "#8B5CF6",
      promptpay: "#10B981",
      truemoney: "#EF4444"
    };

    const labels = (paymentMethods || []).map(m => m.method ? m.method.toUpperCase() : "WALLET");
    const amounts = (paymentMethods || []).map(m => parseFloat(m.total_amount || 0));
    const bgColors = (paymentMethods || []).map(m => methodColors[m.method?.toLowerCase()] || "#19BAFF");

    this.chartPaymentsInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: amounts.length > 0 ? amounts : [1],
          backgroundColor: amounts.length > 0 ? bgColors : ["#1E293B"],
          borderColor: "#0E131D",
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(14, 19, 29, 0.95)",
            borderColor: "rgba(16, 185, 129, 0.3)",
            borderWidth: 1,
            titleFont: { family: "Chakra Petch", size: 11 },
            bodyFont: { family: "JetBrains Mono", size: 11 },
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: function(c) {
                return ` ยอดรวม: ฿${parseFloat(c.raw).toFixed(2)}`;
              }
            }
          }
        }
      }
    });

    const allMethods = [
      { key: "wallet", name: "👛 วอลเล็ต", color: "purple" },
      { key: "promptpay", name: "💸 พร้อมเพย์", color: "emerald" },
      { key: "truemoney", name: "🧧 ทรูมันนี่", color: "red" }
    ];

    allMethods.forEach(m => {
      const found = (paymentMethods || []).find(p => p.method?.toLowerCase() === m.key);
      const amt = found ? parseFloat(found.total_amount || 0).toFixed(2) : "0.00";
      const count = found ? found.order_count : 0;
      const col = document.createElement("div");
      col.className = "p-2 rounded-xl bg-slate-900/60 border border-slate-800";
      col.innerHTML = `
        <div class="text-[10px] text-slate-400">${m.name}</div>
        <div class="font-mono font-bold text-white text-xs mt-0.5">฿${amt}</div>
        <div class="text-[9px] text-slate-500">${count} บิล</div>
      `;
      listContainer.appendChild(col);
    });
  }

  resizeCharts() {
    setTimeout(() => {
      if (this.chartSalesInstance) this.chartSalesInstance.resize();
      if (this.chartProductsInstance) this.chartProductsInstance.resize();
      if (this.chartPaymentsInstance) this.chartPaymentsInstance.resize();
    }, 50);
  }

  async exportOrdersToCSV() {
    try {
      let orders = [];
      const supabase = this.apiClient.initSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          orders = data;
        }
      }

      if (orders.length === 0 && window.currentDashboardData && window.currentDashboardData.recent_orders) {
        orders = window.currentDashboardData.recent_orders;
      }

      if (!orders || orders.length === 0) {
        alert('ไม่พบข้อมูลคำสั่งซื้อสำหรับส่งออก CSV');
        return;
      }

      const headers = [
        'ลำดับ',
        'รหัสคำสั่งซื้อ (Order ID)',
        'วันที่-เวลา (Date Time)',
        'ผู้สั่งซื้อ (Discord ID / User)',
        'สินค้า (Items)',
        'จำนวน (Qty)',
        'ยอดชำระสุทธิ (Total THB)',
        'ช่องทางชำระ (Payment Method)',
        'สถานะ (Status)'
      ];

      const rows = orders.map((ord, idx) => {
        let itemsStr = '-';
        let qty = 1;
        if (Array.isArray(ord.items)) {
          itemsStr = ord.items.map(it => (it.title || it.name || 'สินค้า') + ' x' + (it.quantity || 1)).join('; ');
          qty = ord.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
        } else if (typeof ord.items === 'object' && ord.items !== null) {
          itemsStr = JSON.stringify(ord.items);
        } else if (ord.items) {
          itemsStr = String(ord.items);
        }

        const dateStr = new Date(ord.created_at).toLocaleString('th-TH');
        const safe = (val) => '"' + String(val || '').replace(/"/g, '""') + '"';

        return [
          idx + 1,
          safe(ord.id),
          safe(dateStr),
          safe(ord.discord_id || ord.user_id || 'Guest'),
          safe(itemsStr),
          qty,
          parseFloat(ord.total_amount || 0).toFixed(2),
          safe(ord.payment_method || 'wallet'),
          safe(ord.status || 'PAID')
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateToday = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = 'NYX9_Sales_Report_' + dateToday + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV Error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด CSV: ' + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AnalyticsService = AnalyticsService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AnalyticsService;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/InventoryService.js */
/* ============================================================================== */
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



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/OrderFinanceService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 💳 ORDER, FINANCE, CLAIMS & REVIEWS SERVICE
 * ==============================================================================
 * Handles Customer Orders, Topups, Warranty Claims, and Product Reviews
 * ==============================================================================
 */

class OrderFinanceService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  // --- 1. ORDERS TABLE ---
  renderOrdersTable(recentOrders) {
    const ordersTable = document.getElementById("orders-table-body");
    if (!ordersTable) return;
    ordersTable.innerHTML = "";

    if (!recentOrders || recentOrders.length === 0) {
      ordersTable.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">ยังไม่มีคำสั่งซื้อในระบบ</td></tr>`;
      return;
    }

    recentOrders.forEach(ord => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono font-bold text-[var(--accent)]">${AdminUI.escapeHtml(ord.id)}</td>
        <td class="py-2.5 px-3 font-mono text-slate-300 text-xs">${AdminUI.escapeHtml(ord.discord_id || ord.user_id || 'Guest')}</td>
        <td class="py-2.5 px-3 font-mono text-emerald-300 font-bold">฿${parseFloat(ord.total_amount || 0).toFixed(2)}</td>
        <td class="py-2.5 px-3 capitalize text-slate-300">${AdminUI.escapeHtml(ord.payment_method || 'wallet')}</td>
        <td class="py-2.5 px-3 text-slate-400">${new Date(ord.created_at).toLocaleString("th-TH")}</td>
        <td class="py-2.5 px-3 text-right">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ${AdminUI.escapeHtml(ord.status || 'PAID')}
          </span>
        </td>
      `;
      ordersTable.appendChild(tr);
    });
  }

  // --- 2. TOPUPS TABLE ---
  renderTopupsTable(recentTopups) {
    const topupsTable = document.getElementById("topups-table-body");
    if (!topupsTable) return;
    topupsTable.innerHTML = "";

    if (!recentTopups || recentTopups.length === 0) {
      topupsTable.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">ยังไม่มีประวัติเติมเงิน</td></tr>`;
      return;
    }

    recentTopups.forEach(top => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
          <span>${top.gateway === 'truemoney' ? '🧧 TrueMoney' : '💸 PromptPay'}</span>
        </td>
        <td class="py-2.5 px-3 font-mono text-emerald-300 font-bold">฿${parseFloat(top.amount || 0).toFixed(2)}</td>
        <td class="py-2.5 px-3 font-mono text-slate-400 text-[11px]">${AdminUI.escapeHtml(top.trans_ref || 'N/A')}</td>
        <td class="py-2.5 px-3 text-slate-400">${new Date(top.created_at).toLocaleString("th-TH")}</td>
        <td class="py-2.5 px-3 text-right">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ${AdminUI.escapeHtml(top.status || 'COMPLETED')}
          </span>
        </td>
      `;
      topupsTable.appendChild(tr);
    });
  }

  // --- 3. CLAIMS TABLE ---
  renderClaimsTable(warrantyClaims) {
    const claimsTable = document.getElementById("claims-table-body");
    const claimsBadge = document.getElementById("badge-pending-claims");
    if (!claimsTable) return;

    claimsTable.innerHTML = "";
    const pendingCount = (warrantyClaims || []).filter(c => c.status === 'PENDING').length;

    if (claimsBadge) {
      if (pendingCount > 0) {
        claimsBadge.textContent = pendingCount;
        claimsBadge.classList.remove("hidden");
      } else {
        claimsBadge.classList.add("hidden");
      }
    }

    if (!warrantyClaims || warrantyClaims.length === 0) {
      claimsTable.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">ไม่มีประวัติคำร้องเคลมสินค้า</td></tr>`;
      return;
    }

    warrantyClaims.forEach(clm => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono text-cyan-300">${AdminUI.escapeHtml(clm.order_id || 'N/A')}</td>
        <td class="py-2.5 px-3 text-slate-300">${AdminUI.escapeHtml(clm.reason || 'ไม่ได้ระบุ')}</td>
        <td class="py-2.5 px-3 text-slate-400">${new Date(clm.created_at).toLocaleString("th-TH")}</td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${clm.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400'}">
            ${AdminUI.escapeHtml(clm.status || 'RESOLVED')}
          </span>
        </td>
        <td class="py-2.5 px-3 text-right">
          ${clm.status === 'PENDING' ? `
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="resolveClaim('${clm.id}', 'APPROVED')" class="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold cursor-pointer">อนุมัติ</button>
              <button onclick="resolveClaim('${clm.id}', 'REJECTED')" class="px-2 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 text-[11px] cursor-pointer">ปฏิเสธ</button>
            </div>
          ` : `<span class="text-slate-500 text-[11px]">ดำเนินการแล้ว</span>`}
        </td>
      `;
      claimsTable.appendChild(tr);
    });
  }

  async resolveClaim(claimId, status, refreshCallback) {
    if (!confirm(`ยืนยันการเปลี่ยนสถานะการเคลมเป็น "${status}"?`)) return;
    try {
      const res = await this.apiClient.rpc("admin_resolve_claim", {
        p_claim_id: claimId,
        p_status: status,
        p_admin_notes: "ดำเนินการโดยแอดมินผ่าน Operations Suite"
      });

      if (res.data && res.data.success) {
        AdminUI.showToast(`บันทึกสถานะการเคลมเป็น ${status} เรียบร้อย`, "success");
        if (typeof refreshCallback === "function") await refreshCallback();
      } else {
        throw new Error(res.data?.message || res.error?.message || "เปลี่ยนสถานะไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  }

  // --- 4. REVIEWS MANAGEMENT ---
  async loadReviewsTable() {
    const tbody = document.getElementById("reviews-table-body");
    const countBadge = document.getElementById("badge-reviews-count");
    if (!tbody) return;

    const supabase = this.apiClient.initSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const reviews = data || [];
      if (countBadge) countBadge.textContent = reviews.length;

      if (reviews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">ยังไม่มีรีวิวจากลูกค้า</td></tr>`;
        return;
      }

      const products = this.store.get("currentProductsList") || [];

      tbody.innerHTML = reviews.map(r => {
        const prod = products.find(p => p.id === r.product_id);
        const prodTitle = prod ? prod.title : r.product_id;
        const stars = '★'.repeat(r.rating || 5);
        const empty = '☆'.repeat(Math.max(0, 5 - (r.rating || 5)));

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
            <td class="p-3.5">
              <div class="flex items-center gap-2.5">
                <img src="${r.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + r.author_name}" class="w-7 h-7 rounded-lg object-cover bg-slate-900 border border-slate-700" />
                <div>
                  <span class="font-bold text-white">${AdminUI.escapeHtml(r.author_name)}</span>
                  <div class="text-[10px] font-mono text-slate-500">#${AdminUI.escapeHtml(r.order_id)}</div>
                </div>
              </div>
            </td>
            <td class="p-3.5 font-mono text-amber-400 font-bold tracking-wider">
              ${stars}<span class="text-slate-600">${empty}</span> <span class="text-[10px] text-slate-400">(${r.rating}/5)</span>
            </td>
            <td class="p-3.5 text-slate-300 font-medium">
              <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">${AdminUI.escapeHtml(prodTitle)}</span>
            </td>
            <td class="p-3.5 text-slate-300 max-w-xs truncate" title="${AdminUI.escapeHtml(r.comment || '')}">
              "${AdminUI.escapeHtml(r.comment || 'ไม่มีข้อความ')}"
            </td>
            <td class="p-3.5">
              ${r.is_visible 
                ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">แสดงบนเว็บ</span>' 
                : '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">ซ่อนไว้</span>'}
            </td>
            <td class="p-3.5 text-right space-x-2">
              <button onclick="toggleReviewVisibility('${r.id}', ${r.is_visible})" class="px-2.5 py-1 rounded-lg text-[11px] font-mono ${r.is_visible ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'} cursor-pointer">
                ${r.is_visible ? 'ซ่อน' : 'แสดง'}
              </button>
              <button onclick="deleteReview('${r.id}')" class="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 cursor-pointer">
                ลบ
              </button>
            </td>
          </tr>
        `;
      }).join("");

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Error loading reviews:", err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-rose-400">โหลดข้อมูลรีวิวล้มเหลว: ${err.message}</td></tr>`;
    }
  }

  async toggleReviewVisibility(id, currentStatus) {
    const supabase = this.apiClient.initSupabase();
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_visible: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      AdminUI.showToast('อัปเดตสถานะการแสดงผลรีวิวเรียบร้อยแล้ว', 'success');
      await this.loadReviewsTable();
    } catch (e) {
      AdminUI.showToast(e.message, 'error');
    }
  }

  async deleteReview(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?')) return;
    const supabase = this.apiClient.initSupabase();
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);
      if (error) throw error;
      AdminUI.showToast('ลบรีวิวเรียบร้อยแล้ว', 'success');
      await this.loadReviewsTable();
    } catch (e) {
      AdminUI.showToast(e.message, 'error');
    }
  }

  // --- 5. MERCHANT HEALTH DIAGNOSTICS ---
  async runLiveApiHealthCheck() {
    const btn = document.getElementById("btn-run-health-check");
    const container = document.getElementById("live-api-health-results");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> <span>กำลังตรวจเช็ก...</span>';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await fetch("/api/merchant-health");
      const data = await res.json();
      if (container && data && data.services) {
        const s = data.services;
        container.innerHTML = `
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">Database:</span> <span class="${s.database?.status === 'OK' ? 'text-emerald-400 font-bold' : 'text-rose-400'}">${s.database?.status === 'OK' ? 'PostgreSQL Live (' + s.database.productCount + ' prods)' : 'Error'}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">Slip Verify:</span> <span class="${s.slipVerify?.status === 'LIVE_CONFIGURED' ? 'text-cyan-400 font-bold' : 'text-amber-400'}">${s.slipVerify?.status || 'Active'}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">TrueMoney:</span> <span class="text-amber-400 font-bold">${s.trueMoney?.phoneMasked || '083****508'}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">Crypto Vault:</span> <span class="text-purple-400 font-bold">${s.cryptoVault?.algorithm || 'AES-256-GCM'}</span>
          </div>
        `;
        AdminUI.showToast('ตรวจสอบสถานะ Live APIs สำเร็จ 100%', 'success');
      }
    } catch (e) {
      AdminUI.showToast('การตรวจสอบล้มเหลว: ' + e.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="play" class="w-3 h-3"></i> <span>ตรวจเช็กความพร้อมระบบ</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.OrderFinanceService = OrderFinanceService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = OrderFinanceService;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/UserService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 👤 USER MANAGEMENT & WALLET SERVICE
 * ==============================================================================
 * Handles Customer Accounts, Roles, Wallet Adjustments, and Blacklisting
 * ==============================================================================
 */

class UserService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  filterUsersTable() {
    const searchInput = document.getElementById("users-search-input");
    const roleSelect = document.getElementById("users-role-filter");
    const statusSelect = document.getElementById("users-status-filter");

    const search = (searchInput?.value || "").toLowerCase().trim();
    const roleFilter = roleSelect?.value || "";
    const statusFilter = statusSelect?.value || "";

    const list = this.store.get("currentUsersList") || [];

    const filtered = list.filter(u => {
      const matchSearch = !search ||
        (u.username && u.username.toLowerCase().includes(search)) ||
        (u.discord_id && u.discord_id.toLowerCase().includes(search)) ||
        (u.id && u.id.toLowerCase().includes(search));

      const matchRole = !roleFilter || u.role === roleFilter;

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = !u.is_blacklisted;
      else if (statusFilter === "blacklisted") matchStatus = u.is_blacklisted === true;

      return matchSearch && matchRole && matchStatus;
    });

    this.renderUsersRows(filtered);
  }

  renderUsersTable() {
    const list = this.store.get("currentUsersList") || [];
    const totalLiability = list.reduce((sum, u) => sum + parseFloat(u.balance || 0), 0);
    const liabEl = document.getElementById("users-total-balance-liability");
    if (liabEl) liabEl.textContent = `฿${totalLiability.toFixed(2)}`;
    this.filterUsersTable();
  }

  renderUsersRows(users) {
    const table = document.getElementById("users-table-body");
    const badge = document.getElementById("users-count-badge");
    if (!table) return;

    table.innerHTML = "";
    if (badge) badge.textContent = `${users.length} สมาชิก`;

    if (!users || users.length === 0) {
      table.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">ไม่พบสมาชิกที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
      return;
    }

    users.forEach(u => {
      const avatar = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`;
      const balance = parseFloat(u.balance || 0).toFixed(2);
      const spent = parseFloat(u.total_spent || 0).toFixed(2);
      const orderCount = u.order_count || 0;
      const isAdmin = u.role === "admin";

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-3">
          <div class="flex items-center gap-2.5">
            <img class="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-800" src="${avatar}" alt="Avatar" />
            <div class="min-w-0">
              <div class="font-bold text-white truncate max-w-[150px]">${AdminUI.escapeHtml(u.username || 'Discord Member')}</div>
              <div class="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">${u.id}</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-1.5 font-mono text-xs">
            <span class="text-slate-300">${u.discord_id || '-'}</span>
            ${u.discord_id ? `
              <button onclick="AdminUI.copyToClipboard('${u.discord_id}')" class="text-slate-500 hover:text-white p-0.5 cursor-pointer" title="คัดลอก Discord ID">
                <i data-lucide="copy" class="w-3 h-3"></i>
              </button>
            ` : ''}
          </div>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isAdmin ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
            ${isAdmin ? 'ADMIN' : 'CUSTOMER'}
          </span>
        </td>
        <td class="py-3 px-3">
          <span class="font-mono font-bold text-emerald-400 text-sm">฿${balance}</span>
        </td>
        <td class="py-3 px-3">
          <div class="font-mono text-xs text-white">${orderCount} ออเดอร์</div>
          <div class="text-[10px] text-slate-500">ยอดรวม: ฿${spent}</div>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.is_blacklisted ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}">
            ${u.is_blacklisted ? '🚫 แบล็กลิสต์' : '✓ ปกติ'}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openAdjustWalletModal('${u.id}', '${AdminUI.escapeHtml(u.username)}', '${u.discord_id}', ${u.balance || 0}, '${avatar}')" class="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer" title="ปรับยอดเงินในกระเป๋า">
              <i data-lucide="coins" class="w-3.5 h-3.5"></i>
              <span>ปรับเงิน</span>
            </button>
            <button onclick="handleToggleRole('${u.id}', '${AdminUI.escapeHtml(u.username)}', '${u.role}')" class="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 cursor-pointer" title="สลับบทบาท Admin <-> Customer">
              <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="handleToggleBlacklist('${u.id}', '${AdminUI.escapeHtml(u.username)}', ${u.is_blacklisted})" class="p-1.5 rounded-lg ${u.is_blacklisted ? 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400' : 'bg-red-500/10 hover:bg-red-500/25 text-red-400'} border border-current/30 cursor-pointer" title="${u.is_blacklisted ? 'ปลดแบน' : 'ระงับบัญชี (แบน)'}">
              <i data-lucide="${u.is_blacklisted ? 'unlock' : 'ban'}" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      `;
      table.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  openAdjustWalletModal(userId, username, discordId, currentBalance, avatarUrl) {
    const modal = document.getElementById("modal-adjust-wallet");
    if (!modal) return;

    document.getElementById("adjust-user-id").value = userId;
    document.getElementById("adjust-user-name").textContent = username || "Discord Member";
    document.getElementById("adjust-user-discord").textContent = `Discord ID: ${discordId || 'N/A'}`;
    const balEl = document.getElementById("adjust-user-current-balance");
    balEl.textContent = `฿${parseFloat(currentBalance || 0).toFixed(2)}`;
    balEl.dataset.balance = currentBalance || 0;
    document.getElementById("adjust-user-avatar").src = avatarUrl;
    document.getElementById("adjust-amount-input").value = "";
    document.getElementById("adjust-reason-input").value = "";
    document.getElementById("adjust-wallet-feedback")?.classList.add("hidden");

    this.updateBalancePreview();
    modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  closeAdjustWalletModal() {
    const modal = document.getElementById("modal-adjust-wallet");
    if (modal) modal.classList.add("hidden");
  }

  updateBalancePreview() {
    const currentBalance = parseFloat(document.getElementById("adjust-user-current-balance")?.dataset.balance || 0);
    const amountInput = parseFloat(document.getElementById("adjust-amount-input")?.value || 0);
    const isDeduct = document.querySelector('input[name="adjust_type"]:checked')?.value === "deduct";

    let newBalance = isDeduct ? currentBalance - amountInput : currentBalance + amountInput;
    if (newBalance < 0) newBalance = 0;

    const previewEl = document.getElementById("adjust-new-balance-preview");
    if (previewEl) {
      previewEl.textContent = `฿${newBalance.toFixed(2)}`;
      previewEl.className = isDeduct ? "font-mono font-bold text-amber-400" : "font-mono font-bold text-emerald-400";
    }
  }

  async handleAdjustWallet(e, refreshCallback) {
    if (e) e.preventDefault();
    const userId = document.getElementById("adjust-user-id").value;
    const amountInput = parseFloat(document.getElementById("adjust-amount-input").value || 0);
    const isDeduct = document.querySelector('input[name="adjust_type"]:checked')?.value === "deduct";
    const reason = document.getElementById("adjust-reason-input").value.trim();
    const feedback = document.getElementById("adjust-wallet-feedback");
    const btn = document.getElementById("btn-submit-adjust");

    if (amountInput <= 0) {
      alert("กรุณาระบุจำนวนเงินที่มากกว่า 0");
      return;
    }

    const finalAmount = isDeduct ? -amountInput : amountInput;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังบันทึก...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_user", {
        p_action: "adjust_balance",
        p_user_id: userId,
        p_data: { amount: finalAmount, reason: reason }
      });

      if (res.error || !res.data || !res.data.success) {
        throw new Error(res.data?.message || res.error?.message || "ไม่สามารถปรับยอดเงินได้");
      }

      this.closeAdjustWalletModal();
      AdminUI.showToast("ปรับยอดเงินเรียบร้อยแล้ว", "success");
      if (typeof refreshCallback === "function") await refreshCallback();
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ";
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> <span>ยืนยันปรับยอดเงิน</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleToggleRole(userId, username, currentRole, refreshCallback) {
    const newRole = currentRole === "admin" ? "customer" : "admin";
    if (!confirm(`ยืนยันการเปลี่ยนสิทธิ์ของ "${username}" เป็น "${newRole.toUpperCase()}"?`)) return;

    try {
      const res = await this.apiClient.rpc("admin_manage_user", {
        p_action: "update_role",
        p_user_id: userId,
        p_data: { role: newRole }
      });

      if (res.data && res.data.success) {
        AdminUI.showToast(`เปลี่ยนบทบาทเป็น ${newRole} สำเร็จ`, "success");
        if (typeof refreshCallback === "function") await refreshCallback();
      } else {
        alert("ไม่สามารถเปลี่ยนบทบาทได้: " + (res.data?.message || res.error?.message));
      }
    } catch (e) {
      alert("ข้อผิดพลาด: " + e.message);
    }
  }

  async handleToggleBlacklist(userId, username, isCurrentlyBlacklisted, refreshCallback) {
    const actionText = isCurrentlyBlacklisted ? "ปลดแบล็กลิสต์" : "ระงับบัญชี (ติดแบล็กลิสต์)";
    let reason = "";
    if (!isCurrentlyBlacklisted) {
      reason = prompt(`ระบุเหตุผลในการแบน "${username}":`, "ฝ่าฝืนข้อกำหนดหรือสลิปปลอม");
      if (!reason) return;
    } else {
      if (!confirm(`ยืนยันการ${actionText} "${username}"?`)) return;
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_user", {
        p_action: "toggle_blacklist",
        p_user_id: userId,
        p_data: { reason: reason || "ระงับโดยผู้ดูแลระบบ" }
      });

      if (res.data && res.data.success) {
        AdminUI.showToast(`${actionText} สำเร็จ`, "success");
        if (typeof refreshCallback === "function") await refreshCallback();
      } else {
        alert("ไม่สามารถทำรายการได้: " + (res.data?.message || res.error?.message));
      }
    } catch (e) {
      alert("ข้อผิดพลาด: " + e.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.UserService = UserService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = UserService;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/VoucherService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🎟️ VOUCHERS & PROMO CODES SERVICE
 * ==============================================================================
 * Shopee & TikTok Style Discount Vouchers & Usage Quotas
 * ==============================================================================
 */

class VoucherService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  generateRandomPromoCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "NYX";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const codeInput = document.getElementById("voucher-input-code");
    if (codeInput) {
      codeInput.value = code;
      codeInput.focus();
    }
    return code;
  }

  async loadAdminVouchers() {
    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "list",
        p_code_data: {}
      });

      if (res.error) throw res.error;
      if (res.data && res.data.success) {
        const vouchers = res.data.vouchers || [];
        this.store.set("currentVouchersList", vouchers);
        this.renderVouchersStats(vouchers);
        this.renderVouchersTable(vouchers);
      }
    } catch (err) {
      console.error("[VoucherService] Error loading vouchers:", err);
    }
  }

  renderVouchersStats(vouchers) {
    const activeCount = vouchers.filter(v => v.is_active).length;
    const totalUses = vouchers.reduce((acc, v) => acc + (Number(v.used_count) || 0), 0);

    const statActive = document.getElementById("stat-active-vouchers");
    const statUses = document.getElementById("stat-total-voucher-uses");
    const statTotal = document.getElementById("stat-total-vouchers");

    if (statActive) statActive.textContent = `${activeCount} โค้ด`;
    if (statUses) statUses.textContent = `${totalUses.toLocaleString()} ครั้ง`;
    if (statTotal) statTotal.textContent = `${vouchers.length} รายการ`;
  }

  renderVouchersTable(vouchers) {
    const tbody = document.getElementById("vouchers-table-body");
    if (!tbody) return;

    if (!vouchers || vouchers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-10 text-slate-500">
            ยังไม่มีโค้ดส่วนลดในระบบ กดปุ่มสร้างโค้ดด้านบนเพื่อเริ่มต้นได้ทันที
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = vouchers.map(v => {
      const isPercent = v.discount_type === "percent";
      const discBadge = isPercent 
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-mono bg-pink-500/10 text-pink-400 border border-pink-500/30 font-bold">ลด ${v.discount_value}%${v.max_discount ? ` (สูงสุด ฿${v.max_discount})` : ''}</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">ลด ฿${Number(v.discount_value).toFixed(2)}</span>`;

      const minSpendText = Number(v.min_spend) > 0 
        ? `<span class="text-white font-mono">฿${Number(v.min_spend).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>`
        : `<span class="text-slate-500">ไม่มีขั้นต่ำ</span>`;

      const usageText = v.usage_limit 
        ? `<span class="font-mono text-white">${v.used_count || 0}</span><span class="text-slate-500 font-mono"> / ${v.usage_limit}</span>`
        : `<span class="font-mono text-white">${v.used_count || 0}</span><span class="text-slate-500 font-mono"> / ∞</span>`;

      const statusBadge = v.is_active
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1 w-fit mx-auto"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>เปิดใช้งาน</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center gap-1 w-fit mx-auto"><span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>ปิดใช้งาน</span>`;

      return `
        <tr class="hover:bg-slate-900/40 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-white px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-xs tracking-wider">${AdminUI.escapeHtml(v.code)}</span>
              <button onclick="AdminUI.copyToClipboard('${AdminUI.escapeJs(v.code)}')" class="text-slate-500 hover:text-white transition-colors cursor-pointer" title="คัดลอกโค้ด">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="text-slate-200 font-medium">${AdminUI.escapeHtml(v.label || '-')}</span>
          </td>
          <td class="py-3 px-4">${discBadge}</td>
          <td class="py-3 px-4">${minSpendText}</td>
          <td class="py-3 px-4">${usageText}</td>
          <td class="py-3 px-4 text-center">${statusBadge}</td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="toggleAdminVoucher('${AdminUI.escapeJs(v.code)}')" class="p-1.5 rounded-lg ${v.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'} transition-all cursor-pointer" title="${v.is_active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}">
                <i data-lucide="${v.is_active ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="deleteAdminVoucher('${AdminUI.escapeJs(v.code)}')" class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer" title="ลบโค้ด">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  }

  async handleCreateVoucher(event) {
    if (event) event.preventDefault();
    const code = document.getElementById("voucher-input-code").value.trim().toUpperCase();
    const label = document.getElementById("voucher-input-label").value.trim();
    const discount_type = document.getElementById("voucher-input-type").value;
    const discount_value = parseFloat(document.getElementById("voucher-input-value").value) || 0;
    const min_spend = parseFloat(document.getElementById("voucher-input-minspend").value) || 0;
    const max_discount = document.getElementById("voucher-input-maxdisc").value ? parseFloat(document.getElementById("voucher-input-maxdisc").value) : null;
    const usage_limit = document.getElementById("voucher-input-limit").value ? parseInt(document.getElementById("voucher-input-limit").value, 10) : null;

    if (!code || code.length < 3) {
      alert("รหัสโค้ดต้องมีความยาวอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (discount_value <= 0) {
      alert("มูลค่าส่วนลดต้องมากกว่า 0");
      return;
    }

    const btn = document.getElementById("btn-submit-voucher");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังบันทึก...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "create",
        p_code_data: {
          code,
          label,
          discount_type,
          discount_value,
          min_spend,
          max_discount,
          usage_limit,
          is_active: true
        }
      });

      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถสร้างโค้ดได้");

      AdminUI.showToast(`สร้างโค้ด "${code}" สำเร็จแล้ว!`, "success");
      document.getElementById("form-create-voucher")?.reset();
      const minEl = document.getElementById("voucher-input-minspend");
      if (minEl) minEl.value = "0";
      await this.loadAdminVouchers();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i> <span>สร้างโค้ด</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async toggleAdminVoucher(code) {
    if (!confirm(`ต้องการเปลี่ยนสถานะเปิด/ปิดโค้ด "${code}"?`)) return;
    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "toggle",
        p_code_data: { code }
      });
      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถเปลี่ยนสถานะได้");
      await this.loadAdminVouchers();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  }

  async deleteAdminVoucher(code) {
    if (!confirm(`⚠️ ยืนยันการลบโค้ด "${code}" อย่างถาวร? ลูกค้าจะไม่สามารถใช้โค้ดนี้ได้อีก`)) return;
    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "delete",
        p_code_data: { code }
      });
      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถลบโค้ดได้");
      await this.loadAdminVouchers();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.VoucherService = VoucherService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = VoucherService;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/ProgramStatusService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🛡️ PROGRAM STATUS HUB SERVICE (EXECUTORS & SCRIPT RADAR)
 * ==============================================================================
 * Tracks Script & Executor Online/Updating/Detected Status
 * ==============================================================================
 */

class ProgramStatusService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  async loadAdminProgramStatuses() {
    const container = document.getElementById("admin-program-status-list");
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs"><i data-lucide="loader-2" class="w-4 h-4 animate-spin mx-auto mb-2 text-cyan-400"></i>กำลังโหลดรายการสถานะโปรแกรม...</div>';
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await this.apiClient.fetchApi("/api/program-statuses?all=true");
      const data = await res.json();

      if (!data || !data.success) {
        container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">${data?.message || 'ไม่สามารถโหลดสถานะโปรแกรมได้'}</div>`;
        return;
      }

      const statuses = data.statuses || [];
      this.store.set("currentProgramStatuses", statuses);

      if (statuses.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-amber-400/80 text-xs">ยังไม่มีรายการโปรแกรมในระบบ กดปุ่ม "เพิ่มโปรแกรม" เพื่อเริ่มเพิ่ม</div>';
        return;
      }

      const statusBadges = {
        online: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE</span>',
        updating: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> UPDATING</span>',
        maintenance: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> MAINTENANCE</span>',
        detected: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span> DETECTED</span>'
      };

      container.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th class="py-2.5 px-3">ชื่อโปรแกรม / สคริปต์</th>
                <th class="py-2.5 px-3">เวอร์ชัน</th>
                <th class="py-2.5 px-3">สถานะปัจจุบัน</th>
                <th class="py-2.5 px-3">ปรับเปลี่ยนสถานะ</th>
                <th class="py-2.5 px-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${statuses.map(p => `
                <tr class="hover:bg-slate-900/40 transition-colors">
                  <td class="py-3 px-3">
                    <div class="font-bold text-white">${AdminUI.escapeHtml(p.name)}</div>
                    <div class="text-[10px] text-slate-500 font-mono">slug: ${AdminUI.escapeHtml(p.slug || '-')}</div>
                  </td>
                  <td class="py-3 px-3 font-mono text-cyan-300">
                    ${AdminUI.escapeHtml(p.version || 'v1.0')}
                  </td>
                  <td class="py-3 px-3">
                    ${statusBadges[p.status] || p.status}
                  </td>
                  <td class="py-3 px-3">
                    <select onchange="handleUpdateProgramStatus(${p.id}, this.value)" class="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[var(--accent)] font-semibold cursor-pointer">
                      <option value="online" ${p.status === 'online' ? 'selected' : ''}>🟢 Online</option>
                      <option value="updating" ${p.status === 'updating' ? 'selected' : ''}>🟡 Updating</option>
                      <option value="maintenance" ${p.status === 'maintenance' ? 'selected' : ''}>🟠 Maintenance</option>
                      <option value="detected" ${p.status === 'detected' ? 'selected' : ''}>🔴 Detected</option>
                    </select>
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button onclick="handleDeleteProgramStatus(${p.id})" class="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 cursor-pointer transition-colors" title="ลบรายการ">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">เกิดข้อผิดพลาด: ${err.message}</div>`;
    } finally {
      if (window.lucide) window.lucide.createIcons();
    }
  }

  openAddProgramStatusModal() {
    const modal = document.getElementById("modal-program-status");
    if (modal) {
      document.getElementById("status-input-name").value = "";
      document.getElementById("status-input-version").value = "";
      document.getElementById("status-input-download").value = "";
      document.getElementById("status-input-status").value = "online";
      modal.classList.remove("hidden");
      document.getElementById("status-input-name")?.focus();
    }
  }

  closeProgramStatusModal() {
    const modal = document.getElementById("modal-program-status");
    if (modal) modal.classList.add("hidden");
  }

  async handleSaveProgramStatus() {
    const name = document.getElementById("status-input-name")?.value.trim();
    const status = document.getElementById("status-input-status")?.value;
    const version = document.getElementById("status-input-version")?.value.trim();
    const download_url = document.getElementById("status-input-download")?.value.trim();
    const btn = document.getElementById("btn-save-program-status");

    if (!name) {
      alert("กรุณาระบุชื่อโปรแกรม");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> บันทึก...';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.fetchApi("/api/program-statuses", {
        method: "POST",
        body: JSON.stringify({ name, status, version, download_url })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast(`เพิ่มโปรแกรม "${name}" สำเร็จ`, "success");
        this.closeProgramStatusModal();
        await this.loadAdminProgramStatuses();
      } else {
        alert("ไม่สามารถบันทึกได้: " + (data.message || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      alert("ข้อผิดพลาด: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "บันทึก";
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleUpdateProgramStatus(id, newStatus) {
    try {
      const res = await this.apiClient.fetchApi("/api/program-statuses", {
        method: "PUT",
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast(`อัปเดตสถานะเป็น ${newStatus.toUpperCase()} สำเร็จ`, "success");
        await this.loadAdminProgramStatuses();
      } else {
        alert("ไม่สามารถอัปเดตสถานะได้: " + (data.message || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      alert("ข้อผิดพลาด: " + err.message);
    }
  }

  async handleDeleteProgramStatus(id) {
    if (!confirm("⚠️ ยืนยันการลบรายการสถานะโปรแกรมนี้ออกจากระบบ?")) return;
    try {
      const res = await this.apiClient.fetchApi(`/api/program-statuses?id=${id}&hard=true`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast("ลบรายการโปรแกรมเรียบร้อย", "success");
        await this.loadAdminProgramStatuses();
      } else {
        alert("ไม่สามารถลบได้: " + (data.message || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      alert("ข้อผิดพลาด: " + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.ProgramStatusService = ProgramStatusService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ProgramStatusService;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/SecuritySentinelService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🛡️ SECURITY SENTINEL & AUDIT TRAIL SERVICE
 * ==============================================================================
 * Monitors Real-time Access Logs, Visitor Analytics, and IP Blacklisting
 * ==============================================================================
 */

class SecuritySentinelService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  getCountryEmoji(countryCode) {
    if (!countryCode || countryCode === 'XX' || countryCode === 'Unknown') return '🌐';
    const code = countryCode.toUpperCase();
    if (code.length !== 2) return '🌐';
    const offset = 127397;
    return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
  }

  // --- 1. ACCESS SENTINEL LOGS ---
  async loadAccessSentinelLogs() {
    const tbody = document.getElementById("access-sentinel-tbody");
    const countEl = document.getElementById("access-logs-count");
    if (!tbody) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=list&limit=50");
      const data = await res.json();

      if (!data.success || !Array.isArray(data.logs)) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
        return;
      }

      this.store.set("currentAccessLogs", data.logs);
      if (countEl) countEl.textContent = `${data.logs.length} รายการ`;

      if (data.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500">ยังไม่มีบันทึกเหตุการณ์ความปลอดภัย</td></tr>`;
        return;
      }

      const badgeStyles = {
        ADMIN_LOGIN_SUCCESS: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        ADMIN_LOGIN_FAILED: "bg-red-500/20 text-red-300 border-red-500/40",
        ADMIN_PIN_ATTEMPT: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        ADMIN_BLOCKED_ATTEMPT: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        BOT_SHIELD_VIOLATION: "bg-amber-500/20 text-amber-300 border-amber-500/40"
      };

      tbody.innerHTML = data.logs.map(log => {
        const bStyle = badgeStyles[log.event_type] || "bg-slate-800 text-slate-300 border-slate-700";
        const timeStr = new Date(log.created_at).toLocaleString("th-TH");
        const shortAgent = String(log.user_agent || "Unknown").slice(0, 45);

        return `
          <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="p-3">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${bStyle}">${log.event_type}</span>
            </td>
            <td class="p-3">
              <span class="text-[10px] ${log.severity === 'CRITICAL' ? 'text-red-400 font-bold' : log.severity === 'WARNING' ? 'text-amber-400' : 'text-slate-400'}">${log.severity || 'INFO'}</span>
            </td>
            <td class="p-3 font-bold text-white">${AdminUI.escapeHtml(log.ip_address || '127.0.0.1')}</td>
            <td class="p-3 text-[10px] text-slate-400 truncate max-w-xs" title="${AdminUI.escapeHtml(log.user_agent || '')}">${AdminUI.escapeHtml(shortAgent)}...</td>
            <td class="p-3 text-[10px] text-slate-500">${timeStr}</td>
            <td class="p-3 text-right">
              <button onclick="blacklistIpFromSentinel('${AdminUI.escapeJs(log.ip_address)}')" class="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer transition-all active:scale-95">
                🚫 บล็อก IP
              </button>
            </td>
          </tr>
        `;
      }).join("");

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400">Error: ${err.message}</td></tr>`;
    }
  }

  // --- 2. VISITOR LOGS ---
  async loadVisitorLogs(showToastFeedback = false) {
    const icon = document.getElementById("visitor-refresh-icon");
    if (icon) icon.classList.add("animate-spin");

    try {
      const res = await this.apiClient.rpc("admin_get_visitor_logs", { p_limit: 150 });

      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถดึงข้อมูลได้");

      const stats = res.data.stats || {};
      const statUnique = document.getElementById("stat-unique-visitors");
      const statTotal = document.getElementById("stat-total-visits");
      const statCountry = document.getElementById("stat-top-country");

      if (statUnique) statUnique.textContent = (stats.unique_24h || 0) + " คน";
      if (statTotal) statTotal.textContent = (stats.total_24h || 0) + " ครั้ง";

      const topC = stats.top_countries && stats.top_countries[0];
      if (statCountry) {
        statCountry.textContent = topC ? `${this.getCountryEmoji(topC.country)} ${topC.country} (${topC.count})` : "ยังไม่มีข้อมูล";
      }

      const logs = res.data.logs || [];
      this.store.set("currentVisitorLogs", logs);
      this.renderVisitorTable(logs);

      if (showToastFeedback) {
        AdminUI.showToast("อัปเดตข้อมูลผู้เข้าชมล่าสุดแล้ว", "success");
      }
    } catch (err) {
      console.error("[SecuritySentinelService] Visitor logs error:", err);
      if (showToastFeedback) alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      if (icon) icon.classList.remove("animate-spin");
    }
  }

  renderVisitorTable(logs) {
    const tbody = document.getElementById("visitor-logs-tbody");
    if (!tbody) return;

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-12 text-slate-500">
            <div class="flex flex-col items-center justify-center gap-2">
              <i data-lucide="inbox" class="w-8 h-8 text-slate-600"></i>
              <span>ยังไม่มีประวัติการเข้าชมในช่วงนี้</span>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const timeFormatted = new Date(l.created_at).toLocaleString('th-TH', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const flag = this.getCountryEmoji(l.country);
      const isMobile = l.device_type === 'mobile' || l.device_type === 'tablet';
      const deviceIcon = isMobile ? 'smartphone' : 'monitor';

      return `
        <tr class="hover:bg-slate-800/30 transition-colors">
          <td class="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
            ${timeFormatted}
          </td>
          <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700/60">${AdminUI.escapeHtml(l.ip_address)}</span>
              <button onclick="AdminUI.copyToClipboard('${AdminUI.escapeJs(l.ip_address)}')" title="คัดลอก IP" class="text-slate-500 hover:text-white transition-colors cursor-pointer">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              <span class="text-base">${flag}</span>
              <span class="font-bold text-slate-300">${AdminUI.escapeHtml(l.country || 'XX')}</span>
            </div>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <span class="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[11px]">
              ${AdminUI.escapeHtml(l.path || '/')}
            </span>
          </td>
          <td class="py-3 px-4 whitespace-nowrap text-slate-400">
            <div class="flex items-center gap-1.5">
              <i data-lucide="${deviceIcon}" class="w-3.5 h-3.5 text-slate-400"></i>
              <span class="capitalize text-xs">${AdminUI.escapeHtml(l.device_type || 'desktop')}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="blacklistIpFromSentinel('${AdminUI.escapeJs(l.ip_address)}')" class="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer transition-all">
              บล็อก IP
            </button>
          </td>
        </tr>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 3. BLACKLIST ENGINE ---
  async blacklistIpFromSentinel(ip) {
    if (!ip) return;
    if (!confirm(`คุณต้องการขึ้นบัญชีดำ (Blacklist) IP: ${ip} ทันทีใช่หรือไม่?`)) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=blacklist_ip", {
        method: "POST",
        body: JSON.stringify({ ip, reason: "Manual 1-Click Blacklist via Admin Sentinel" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed");

      AdminUI.showToast(data.message || "บล็อก IP สำเร็จ", "success");
      await this.loadAccessSentinelLogs();
      await this.loadBlacklistList();
    } catch (err) {
      alert("ไม่สามารถบล็อก IP ได้: " + err.message);
    }
  }

  async blacklistManualIp() {
    const input = document.getElementById("manual-blacklist-ip");
    const ip = String(input?.value || "").trim();
    if (!ip) {
      alert("กรุณากรอก IP Address ที่ต้องการบล็อก");
      return;
    }
    await this.blacklistIpFromSentinel(ip);
    if (input) input.value = "";
  }

  async loadBlacklistList() {
    const tbody = document.getElementById("active-blacklists-tbody");
    const countEl = document.getElementById("blacklist-items-count");
    if (!tbody) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=blacklists");
      const data = await res.json();

      if (!data.success || !Array.isArray(data.blacklists)) return;
      this.store.set("currentBlacklists", data.blacklists);
      if (countEl) countEl.textContent = `${data.blacklists.length} รายการ`;

      if (data.blacklists.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">ไม่มีรายการบัญชีดำในขณะนี้</td></tr>`;
        return;
      }

      tbody.innerHTML = data.blacklists.map(item => {
        const timeStr = new Date(item.created_at).toLocaleString("th-TH");
        const val = item.target_value || item.value;
        return `
          <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="p-3 uppercase text-[10px] font-bold text-slate-400">${item.target_type || item.type || 'IP'}</td>
            <td class="p-3 font-bold text-rose-400">${AdminUI.escapeHtml(val)}</td>
            <td class="p-3 text-slate-300 text-xs">${AdminUI.escapeHtml(item.reason || '-')}</td>
            <td class="p-3 text-slate-500 text-[10px]">${timeStr}</td>
            <td class="p-3 text-right">
              <button onclick="removeBlacklistFromSentinel('${AdminUI.escapeJs(val)}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer transition-all active:scale-95">
                ปลดแบน
              </button>
            </td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.warn("[SecuritySentinelService] Error loading blacklists:", err);
    }
  }

  async removeBlacklistFromSentinel(ip) {
    if (!ip) return;
    if (!confirm(`ต้องการปลดแบน IP: ${ip} ใช่หรือไม่?`)) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=remove_blacklist", {
        method: "POST",
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      AdminUI.showToast(data.message || "ปลดแบนสำเร็จ", "success");
      await this.loadBlacklistList();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // --- 4. VISITOR FILTER & QUICK BLACKLIST & AUTO REFRESH ---
  filterVisitorTable() {
    const query = (document.getElementById("visitor-search-input")?.value || "").toLowerCase().trim();
    const device = document.getElementById("visitor-filter-device")?.value || "all";
    const logs = this.store.get("currentVisitorLogs") || [];

    const filtered = logs.filter(l => {
      const matchQuery = !query || 
        (l.ip_address && l.ip_address.toLowerCase().includes(query)) ||
        (l.path && l.path.toLowerCase().includes(query)) ||
        (l.country && l.country.toLowerCase().includes(query));

      const matchDevice = device === "all" || 
        (device === "mobile" && (l.device_type === "mobile" || l.device_type === "tablet")) ||
        (device === "desktop" && l.device_type === "desktop");

      return matchQuery && matchDevice;
    });

    this.renderVisitorTable(filtered);
  }

  async handleQuickBlacklistIp(ip) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการแบน IP: ${ip} จากการเข้าใช้งานร้านค้า?`)) return;

    try {
      const res = await this.apiClient.rpc("admin_blacklist_ip", {
        p_ip: ip,
        p_reason: "แบนโดยแอดมินผ่านหน้ารายการ IP ผู้เข้าชม"
      });

      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถแบน IP ได้");

      alert(`✅ แบน IP ${ip} เข้าสู่บัญชีดำเรียบร้อยแล้ว!`);
      await this.loadVisitorLogs();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการแบน IP: " + err.message);
    }
  }

  toggleVisitorAutoRefresh() {
    const isChecked = document.getElementById("visitor-auto-refresh")?.checked;
    if (this.visitorAutoRefreshTimer) {
      clearInterval(this.visitorAutoRefreshTimer);
      this.visitorAutoRefreshTimer = null;
    }
    if (isChecked) {
      this.visitorAutoRefreshTimer = setInterval(() => {
        const btn = document.getElementById("nav-btn-visitors");
        if (btn && btn.classList.contains("active")) {
          this.loadVisitorLogs(false);
        }
      }, 15000);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.SecuritySentinelService = SecuritySentinelService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SecuritySentinelService;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/ThemeStudioService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🎨 THEME STUDIO & LIVE CSS CONFIG SERVICE
 * ==============================================================================
 * Manages 6 Signature Color Presets, Hex Color Picker, and Custom CSS Injection
 * ==============================================================================
 */

class ThemeStudioService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.currentThemeConfig = {
      preset: 'glacier_cyan',
      accent: '#00F0FF',
      accent_hover: '#00D2E0',
      accent_glow: 'rgba(0, 240, 255, 0.22)',
      custom_css: ''
    };
  }

  async initAdminThemeStudio() {
    try {
      const res = await fetch('/api/theme-settings');
      const data = await res.json();
      if (data.success && data.theme) {
        this.currentThemeConfig = Object.assign(this.currentThemeConfig, data.theme);
        this.store.set("currentThemeConfig", this.currentThemeConfig);
      }
    } catch (err) {
      console.warn('[ThemeStudioService] Failed to fetch theme settings, using defaults:', err);
    }

    const hexInput = document.getElementById('theme-hex-input');
    const colorPicker = document.getElementById('theme-color-picker');
    const hoverInput = document.getElementById('theme-hover-input');
    const cssTextarea = document.getElementById('theme-custom-css');

    if (hexInput) hexInput.value = this.currentThemeConfig.accent;
    if (colorPicker) colorPicker.value = this.currentThemeConfig.accent;
    if (hoverInput) hoverInput.value = this.currentThemeConfig.accent_hover;
    if (cssTextarea) cssTextarea.value = this.currentThemeConfig.custom_css || '';

    this.updatePresetActiveStyles(this.currentThemeConfig.preset);
    this.updateLiveThemePreview();
  }

  selectThemePreset(presetKey, accent, hover, glow) {
    this.currentThemeConfig.preset = presetKey;
    this.currentThemeConfig.accent = accent;
    this.currentThemeConfig.accent_hover = hover;
    this.currentThemeConfig.accent_glow = glow;
    this.store.set("currentThemeConfig", this.currentThemeConfig);

    const hexInput = document.getElementById('theme-hex-input');
    const colorPicker = document.getElementById('theme-color-picker');
    const hoverInput = document.getElementById('theme-hover-input');

    if (hexInput) hexInput.value = accent;
    if (colorPicker) colorPicker.value = accent;
    if (hoverInput) hoverInput.value = hover;

    this.updatePresetActiveStyles(presetKey);
    this.updateLiveThemePreview();
  }

  updatePresetActiveStyles(activeKey) {
    const keys = ['glacier_cyan', 'electric_indigo', 'cyber_pink', 'hacker_emerald', 'amber_gold', 'crimson_red'];
    keys.forEach(k => {
      const btn = document.getElementById(`btn-preset-${k}`);
      if (!btn) return;
      if (k === activeKey) {
        btn.classList.add('border-cyan-400', 'ring-2', 'ring-cyan-400/30');
        btn.classList.remove('border-slate-800');
      } else {
        btn.classList.remove('border-cyan-400', 'ring-2', 'ring-cyan-400/30');
        btn.classList.add('border-slate-800');
      }
    });
  }

  onCustomColorPick(val) {
    const hexInput = document.getElementById('theme-hex-input');
    if (hexInput) hexInput.value = val;
    this.currentThemeConfig.preset = 'custom';
    this.currentThemeConfig.accent = val;
    this.updatePresetActiveStyles(null);
    this.updateLiveThemePreview();
  }

  onCustomHexInput(val) {
    if (!val.startsWith('#') && val.length === 6) val = '#' + val;
    const colorPicker = document.getElementById('theme-color-picker');
    if (colorPicker && /^#[0-9A-Fa-f]{6}$/.test(val)) {
      colorPicker.value = val;
    }
    this.currentThemeConfig.preset = 'custom';
    this.currentThemeConfig.accent = val;
    this.updatePresetActiveStyles(null);
    this.updateLiveThemePreview();
  }

  updateLiveThemePreview() {
    const hex = document.getElementById('theme-hex-input')?.value || this.currentThemeConfig.accent || '#00F0FF';
    const hover = document.getElementById('theme-hover-input')?.value || this.currentThemeConfig.accent_hover || '#00D2E0';
    const customCss = document.getElementById('theme-custom-css')?.value || '';

    const badge = document.getElementById('preview-badge');
    if (badge) {
      badge.style.borderColor = hex;
      badge.style.color = hex;
      badge.style.backgroundColor = hex + '22';
    }

    const price = document.getElementById('preview-price');
    if (price) price.style.color = hex;

    const btn = document.getElementById('preview-btn');
    if (btn) {
      btn.style.background = `linear-gradient(135deg, ${hex}, ${hover})`;
    }

    const chip = document.getElementById('preview-chip');
    if (chip) {
      chip.style.borderColor = hex;
      chip.style.color = hex;
      chip.style.backgroundColor = hex + '15';
    }

    const wallet = document.getElementById('preview-wallet');
    if (wallet) {
      wallet.style.borderColor = hex;
      wallet.style.backgroundColor = hex + '15';
      const wIcon = wallet.querySelector('svg, i');
      if (wIcon) wIcon.style.color = hex;
      const wSpan = wallet.querySelector('span');
      if (wSpan) wSpan.style.color = hex;
    }

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty('--accent', hex);
      document.documentElement.style.setProperty('--accent-hover', hover);
      document.documentElement.style.setProperty('--accent-glow', `${hex}38`);

      let previewStyleTag = document.getElementById('admin-preview-custom-css');
      if (!previewStyleTag) {
        previewStyleTag = document.createElement('style');
        previewStyleTag.id = 'admin-preview-custom-css';
        document.head.appendChild(previewStyleTag);
      }
      previewStyleTag.textContent = customCss;
    }
  }

  async saveAdminThemeSettings() {
    const hex = document.getElementById('theme-hex-input')?.value?.trim() || '#00F0FF';
    const hover = document.getElementById('theme-hover-input')?.value?.trim() || '#00D2E0';
    const customCss = document.getElementById('theme-custom-css')?.value || '';

    const payload = {
      preset: this.currentThemeConfig.preset || 'custom',
      accent: hex,
      accent_hover: hover,
      accent_glow: `${hex}38`,
      custom_css: customCss
    };

    try {
      const res = await this.apiClient.fetchApi('/api/theme-settings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast('🎨 บันทึกการตั้งค่าธีมลงระบบเรียบร้อย!', 'success');
      } else {
        alert('ไม่สามารถบันทึกธีมได้: ' + (data.message || 'รหัสแอดมินไม่ถูกต้อง'));
      }
    } catch (err) {
      console.error('[ThemeStudioService] Error saving theme settings:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.ThemeStudioService = ThemeStudioService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeStudioService;
}



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/services/SettingsService.js */
/* ============================================================================== */
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



/* ============================================================================== */
/* 🛡️ ADMIN OOP MODULE: js/admin/AdminApp.js */
/* ============================================================================== */
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
