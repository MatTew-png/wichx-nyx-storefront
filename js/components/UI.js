/**
 * ==============================================================================
 * 🎨 UI UTILITIES (TOAST NOTIFICATIONS, CONFETTI, THEME ENGINE)
 * ==============================================================================
 */

class UIManager {
  constructor() {
    this.initTheme();
  }

  initTheme() {
    const config = window.storeConfig || {};
    const theme = config.theme || {};
    const root = document.documentElement;

    if (theme.accent) root.style.setProperty("--accent", theme.accent);
    if (theme.accentHover) root.style.setProperty("--accent-hover", theme.accentHover);
    if (theme.baseBg) root.style.setProperty("--base-bg", theme.baseBg);
    if (theme.cardBg) root.style.setProperty("--card-bg", theme.cardBg);
    if (theme.cardHover) root.style.setProperty("--card-hover", theme.cardHover);

    document.title = `${config.storeName || "NYX9 STUDIO"} | ${config.tagline || ""}`;

    document.querySelectorAll("[data-bind='storeName']").forEach(el => el.textContent = config.storeName);
    document.querySelectorAll("[data-bind='brandShort']").forEach(el => el.textContent = config.brandShort || config.storeName);
    document.querySelectorAll("[data-bind='tagline']").forEach(el => el.textContent = config.tagline);
    document.querySelectorAll("[data-bind='subTagline']").forEach(el => el.textContent = config.subTagline);
  }

  toast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const colors = {
      success: "border-emerald-500/50 bg-emerald-950/80 text-emerald-200",
      error: "border-rose-500/50 bg-rose-950/80 text-rose-200",
      warning: "border-amber-500/50 bg-amber-950/80 text-amber-200",
      info: "border-[var(--accent)] bg-slate-900/90 text-white"
    };

    const icons = {
      success: "check-circle",
      error: "alert-circle",
      warning: "alert-triangle",
      info: "info"
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl text-xs font-semibold animate-in slide-in-from-top-4 duration-200 ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  confetti() {
    if (typeof confetti === "function") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#19BAFF", "#38D4FF", "#00FFA3", "#FFFFFF"]
      });
    }
  }
}

window.UI = new UIManager();
