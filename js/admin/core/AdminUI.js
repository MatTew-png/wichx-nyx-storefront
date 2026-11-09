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
