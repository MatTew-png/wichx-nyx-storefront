/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — CLIENT SECURITY & ANTI-TAMPER ENGINE v2.0
 * ==============================================================================
 * 1. Global Context Menu Blocker (Capture Phase on Window + Document)
 * 2. Developer Key Shortcuts Interceptor (F12, Ctrl+Shift+I/J/C, Ctrl+U/S/P)
 * 3. Framebusting & Anti-Clickjacking (Immune to iframe phishing)
 * 4. Anti-Drag & Asset Extraction Protection
 * 5. Self-XSS Anti-Theft Console Warnings
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

  triggerSecurityAlert(msg = "ระบบรักษาความปลอดภัย: ไม่อนุญาตให้ตรวจสอบโค้ดหรือคลิกขวา") {
    const now = Date.now();
    if (now - this.lastToastTime < 2000) return;
    this.lastToastTime = now;

    if (window.UI && typeof window.UI.toast === "function") {
      window.UI.toast(`🛡️ ${msg}`, "warning");
    }
  }

  initAntiFrame() {
    try {
      if (window.top !== window.self) {
        window.top.location = window.self.location;
      }
    } catch (e) {
      // If framed cross-origin, blank out display
      try {
        document.documentElement.style.display = "none";
      } catch (err) {}
    }
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
      this.triggerSecurityAlert("คลิกขวาถูกจำกัดสิทธิ์ (Right-Click Disabled)");
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
        this.triggerSecurityAlert("ปุ่ม F12 (Inspect) ถูกระงับการใช้งาน");
        return;
      }

      // 2. Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert("ไม่อนุญาตให้เปิด Developer Console");
        return;
      }

      // 3. Block Ctrl+U (View Source)
      if (isCtrlOrMeta && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert("ไม่อนุญาตให้เปิดดู Source Code (Ctrl+U)");
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
      const bannerStyle = "color: #00F2FF; font-size: 22px; font-weight: 900; text-shadow: 0 0 10px rgba(0,242,255,0.8);";
      const warningStyle = "color: #FF3366; font-size: 16px; font-weight: bold;";
      const subStyle = "color: #94A3B8; font-size: 13px;";

      console.log("%c🛡️ NYX9 SHIELD ENGINE v2.0 ACTIVE", bannerStyle);
      console.log("%c⛔ คำเตือนความปลอดภัยสูงสุด (STOP!):", warningStyle);
      console.log("%cห้ามคัดลอกหรือวางคำสั่งใด ๆ ลงใน Console นี้โดยเด็ดขาด หากมีใครบอกให้คุณวางเพื่อรับ 'Nitro ฟรี' หรือ 'สคริปต์แฮกเงิน' นั่นคือการหลอกลวงขโมย Session Discord และกระเป๋าเงินของคุณ!", subStyle);
    } catch (e) {}
  }
}

window.SecurityEngine = SecurityEngine;
