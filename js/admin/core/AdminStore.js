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
