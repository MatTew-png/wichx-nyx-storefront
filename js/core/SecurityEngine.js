/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — CLIENT SECURITY & ANTI-TAMPER ENGINE v1.0
 * ==============================================================================
 * - บล็อกการคลิกขวา (Disable Context Menu) ยกเว้นช่องกรอกข้อมูล (Input/Textarea)
 * - บล็อกปุ่มลัด DevTools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
 * - ระบบแจ้งเตือน Cyber Security HUD เมื่อมีคนพยายามแกะโค้ด
 * - ระบบ Self-XSS Warning ใน Console ป้องกันโดนหลอกขโมย Token
 * - ข้อยกเว้นพิเศษสำหรับแอดมิน (Admin Bypass): เมื่อล็อกอินไอดีแอดมิน จะเปิดให้ใช้ได้ตามปกติ
 * ==============================================================================
 */

class SecurityEngine {
  constructor(store) {
    this.store = store;
    this.lastToastTime = 0;
    this.init();
  }

  init() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    this.initContextMenuBlocker();
    this.initKeyboardBlocker();
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
    // Throttle alert to prevent spamming
    if (now - this.lastToastTime < 2500) return;
    this.lastToastTime = now;

    if (window.UI && typeof window.UI.toast === "function") {
      window.UI.toast(`🛡️ ${msg}`, "warning");
    }
  }

  initContextMenuBlocker() {
    document.addEventListener("contextmenu", (e) => {
      // แอดมินสามารถคลิกขวาได้ตามปกติ
      if (this.isAdmin()) return;

      // อนุญาตให้คลิกขวาใน input และ textarea เพื่อ copy/paste ข้อมูลได้
      const targetTag = e.target.tagName ? e.target.tagName.toLowerCase() : "";
      if (targetTag === "input" || targetTag === "textarea" || e.target.isContentEditable) {
        return;
      }

      e.preventDefault();
      this.triggerSecurityAlert("คลิกขวาถูกจำกัดสิทธิ์ (Right-Click Disabled)");
    }, { passive: false });
  }

  initKeyboardBlocker() {
    document.addEventListener("keydown", (e) => {
      // แอดมินสามารถกดปุ่ม DevTools ได้ตามปกติ
      if (this.isAdmin()) return;

      const key = e.key ? e.key.toLowerCase() : "";
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. บล็อก F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert("ปุ่ม F12 (Inspect) ถูกระงับการใช้งาน");
        return;
      }

      // 2. บล็อก Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools Shortcuts)
      if (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert("ไม่อนุญาตให้เปิด Developer Console");
        return;
      }

      // 3. บล็อก Ctrl+U (View Source)
      if (isCtrlOrMeta && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityAlert("ไม่อนุญาตให้เปิดดู Source Code (Ctrl+U)");
        return;
      }

      // 4. บล็อก Ctrl+S (Save Page)
      if (isCtrlOrMeta && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }, { capture: true });
  }

  initConsoleProtection() {
    try {
      const bannerStyle = "color: #00F2FF; font-size: 20px; font-weight: 900; text-shadow: 0 0 10px rgba(0,242,255,0.8);";
      const warningStyle = "color: #FF3366; font-size: 14px; font-weight: bold;";
      const subStyle = "color: #94A3B8; font-size: 12px;";

      console.log("%c🛡️ NYX9 STUDIO SECURITY PROTOCOL v1.0", bannerStyle);
      console.log("%c⚠️ คำเตือน: ห้ามวางโค้ดสคริปต์ใด ๆ ที่ผู้อื่นส่งมาลงในช่องนี้เด็ดขาด!", warningStyle);
      console.log("%cหากคุณวางโค้ดแปลกปลอม อาจทำให้สูญเสียบัญชี Discord หรือเงินในกระเป๋าของคุณได้ (Self-XSS Attack)", subStyle);
    } catch (e) {}
  }
}

window.SecurityEngine = SecurityEngine;
