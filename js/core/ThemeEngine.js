/**
 * ==============================================================================
 * 🎨 THEME ENGINE & DYNAMIC CSS INJECTOR (TC-THM-01)
 * ==============================================================================
 * ควบคุมการปรับแต่งธีมสีหลัก (Accent Color) และการแทรก Custom CSS แบบเรียลไทม์
 * รองรับทั้ง Storefront และ Admin Theme Studio Live Preview
 * ==============================================================================
 */

class ThemeEngine {
  constructor() {
    this.presets = {
      glacier_cyan: {
        name: "Glacier Cyan (Default)",
        accent: "#00F0FF",
        accentHover: "#00D2E0",
        accentGlow: "rgba(0, 240, 255, 0.22)",
        dotClass: "bg-cyan-400 shadow-cyan-500/50"
      },
      electric_indigo: {
        name: "Electric Indigo (Linear)",
        accent: "#6366F1",
        accentHover: "#818CF8",
        accentGlow: "rgba(99, 102, 241, 0.22)",
        dotClass: "bg-indigo-500 shadow-indigo-500/50"
      },
      cyber_pink: {
        name: "Cyber Neon Pink",
        accent: "#FF007F",
        accentHover: "#FF2E93",
        accentGlow: "rgba(255, 0, 127, 0.22)",
        dotClass: "bg-pink-500 shadow-pink-500/50"
      },
      hacker_emerald: {
        name: "Matrix Hacker Emerald",
        accent: "#10B981",
        accentHover: "#34D399",
        accentGlow: "rgba(16, 185, 129, 0.22)",
        dotClass: "bg-emerald-500 shadow-emerald-500/50"
      },
      amber_gold: {
        name: "Imperial Amber Gold",
        accent: "#F59E0B",
        accentHover: "#FBBF24",
        accentGlow: "rgba(245, 158, 11, 0.22)",
        dotClass: "bg-amber-500 shadow-amber-500/50"
      },
      crimson_red: {
        name: "Crimson Cyber Red",
        accent: "#EF4444",
        accentHover: "#F87171",
        accentGlow: "rgba(239, 68, 68, 0.22)",
        dotClass: "bg-rose-500 shadow-rose-500/50"
      }
    };

    this.currentConfig = {
      preset: "glacier_cyan",
      accent: "#00F0FF",
      accentHover: "#00D2E0",
      accentGlow: "rgba(0, 240, 255, 0.22)",
      customCss: ""
    };
  }

  init() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. Load from localStorage cache first for zero latency
    try {
      const cached = localStorage.getItem("nyx_theme_config");
      if (cached) {
        const parsed = JSON.parse(cached);
        this.apply(parsed, false);
      }
    } catch (e) {}

    // 2. Fetch from backend API to get fresh server configuration
    this.syncFromServer();
  }

  async syncFromServer() {
    try {
      const res = await fetch("/api/theme-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.theme) {
          this.apply(data.theme, true);
        }
      }
    } catch (e) {
      // Offline fallback silent
    }
  }

  apply(config, persistLocal = true) {
    if (!config) return;

    this.currentConfig = { ...this.currentConfig, ...config };

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (root) {
        if (this.currentConfig.accent) {
          root.style.setProperty("--accent", this.currentConfig.accent);
        }
        if (this.currentConfig.accentHover) {
          root.style.setProperty("--accent-hover", this.currentConfig.accentHover);
        }
        if (this.currentConfig.accentGlow) {
          root.style.setProperty("--accent-glow", this.currentConfig.accentGlow);
        }
      }

      // Injected Custom CSS block
      let styleTag = document.getElementById("nyx-custom-css-injection");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "nyx-custom-css-injection";
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = this.currentConfig.customCss || "";
    }

    if (persistLocal && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("nyx_theme_config", JSON.stringify(this.currentConfig));
      } catch (e) {}
    }
  }

  setPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;

    this.apply({
      preset: presetKey,
      accent: preset.accent,
      accentHover: preset.accentHover,
      accentGlow: preset.accentGlow
    });
  }

  getPresets() {
    return this.presets;
  }

  getCurrentConfig() {
    return this.currentConfig;
  }
}

// Global Singleton
if (typeof window !== "undefined") {
  window.ThemeEngine = ThemeEngine;
  window.ThemeEngineInstance = new ThemeEngine();
  // Auto-init on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.ThemeEngineInstance.init());
  } else {
    window.ThemeEngineInstance.init();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeEngine;
}
