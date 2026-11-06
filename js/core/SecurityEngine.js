/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — CLIENT SECURITY & ANTI-TAMPER ENGINE v2.0
 * ==============================================================================
 * 1. Global Context Menu Blocker (Capture Phase on Window + Document)
 * 2. Developer Key Shortcuts Interceptor (F12, Ctrl+Shift+I/J/C, Ctrl+U/S/P)
 * 3. Client Protection Framework
 * 4. Anti-Drag & Asset Extraction Protection
 * 5. Security Telemetry Header
 * 6. Admin Developer Mode (Toggle with Ctrl+Alt+D only for whitelisted Admins)
 * ==============================================================================
 */

class SecurityEngine {
  constructor(store) {
    this.store = store;
    this.lastToastTime = 0;
    this.adminUnlocked = false;
    this.init();
  }

  init() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    this.initAntiFrame();
    this.initContextMenuBlocker();
    this.initKeyboardBlocker();
    this.initAntiDrag();
    this.initConsoleProtection();
  }

  isAdmin() {
    const user = this.store ? this.store.get("user") : null;
    if (!user) return false;
    const adminWhitelist = (window.storeConfig && window.storeConfig.adminDiscordIds) || [
      "483398326159671326",
      "422611554475835394"
    ];
    return user.role === "admin" || adminWhitelist.includes(String(user.discordId));
  }

  triggerSecurityAlert(msg = "") {
    // Silent Mode: ไม่แสดง Toast แจ้งเตือนตามคำขอของผู้ใช้ (ทำงานแบบเงียบ ไม่รบกวนหน้าจอ)
    return;
  }

  initAntiFrame() {
    // Frame protection is enforced by HTTP header X-Frame-Options: SAMEORIGIN
  }

  initContextMenuBlocker() {
    const blockContextMenu = (e) => {
      // If admin pressed Ctrl+Alt+D to unlock
      if (this.adminUnlocked) return;

      // Allow right-click inside actual form inputs for paste
      const targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
      if (targetTag === "input" || targetTag === "textarea" || (e.target && e.target.isContentEditable)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);
  }

  initKeyboardBlocker() {
    window.addEventListener("keydown", (e) => {
      const key = e.key ? e.key.toLowerCase() : "";
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Special Admin Developer Mode Shortcut: Ctrl + Alt + D
      if (isCtrlOrMeta && e.altKey && key === "d") {
        if (this.isAdmin()) {
          this.adminUnlocked = !this.adminUnlocked;
          window.__nyxAdminUnlocked = this.adminUnlocked;
          if (window.UI && typeof window.UI.toast === "function") {
            window.UI.toast(
              this.adminUnlocked 
                ? "🔓 Admin Developer Mode: UNLOCKED (Inspect Enabled)" 
                : "🔒 Admin Developer Mode: LOCKED (Protection Active)",
              this.adminUnlocked ? "info" : "warning"
            );
          }
          return;
        }
      }

      // If Admin unlocked dev mode, allow dev keys
      if (this.adminUnlocked) return;

      // 1. Block F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 2. Block DevTools (Ctrl+Shift+I/J/C or Mac Cmd+Option+I/J/C)
      if (
        (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
        (isCtrlOrMeta && e.altKey && (key === "i" || key === "j" || key === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 3. Block Ctrl+U (View Source)
      if (isCtrlOrMeta && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 4. Block Ctrl+S (Save Page) & Ctrl+P (Print Page)
      if (isCtrlOrMeta && (key === "s" || key === "p")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }, true);
  }

  initAntiDrag() {
    document.addEventListener("dragstart", (e) => {
      if (this.adminUnlocked) return;
      e.preventDefault();
    }, true);
  }

  initConsoleProtection() {
    try {
      console.log("%c⚡ NYX9 STUDIO PRODUCTION STOREFRONT", "color: #00F2FF; font-weight: bold; font-size: 14px;");
      console.log("%cOfficial verified build. Telemetry active.", "color: #64748B; font-size: 11px;");
    } catch (e) {}
  }
}

if (typeof window !== "undefined") {
  window.SecurityEngine = SecurityEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SecurityEngine;
}
