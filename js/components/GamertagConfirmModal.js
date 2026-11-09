/**
 * ==============================================================================
 * 👤 ROBLOX GAMERTAG & AVATAR CONFIRMATION MODAL (TC-RBX-02)
 * ==============================================================================
 * ระบบยืนยันตัวตน 2-Step Pre-flight Confirmation:
 * ป้องกันการพิมพ์ชื่อผิดหรือส่งสินค้าผิดไอดี 80%+ ด้วยการดึง 3D Avatar Headshot
 * และข้อมูลโปรไฟล์สดจาก Roblox API มาให้ลูกค้าตรวจสอบก่อนชำระเงิน
 * ==============================================================================
 */

class GamertagConfirmModal {
  constructor() {
    this.modalId = "gamertag-confirm-modal";
    this.currentUser = null;
    this.onConfirmCallback = null;
    this.init();
  }

  init() {
    if (typeof document === "undefined") return;
    if (document.getElementById(this.modalId)) return;

    const modalHtml = `
      <div id="${this.modalId}" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onclick="window.GamertagConfirmModalInstance?.close()"></div>

        <!-- Modal Dialog -->
        <div class="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10 z-10 transform transition-all duration-300 scale-95 opacity-0 modal-content overflow-hidden">
          
          <!-- Cyber Ambient Accent -->
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-extrabold text-white tracking-wide font-heading">ยืนยันตัวละคร Roblox</h3>
                <p class="text-[11px] text-slate-400">Pre-flight Identity & Gamertag Assurance</p>
              </div>
            </div>
            <button onclick="window.GamertagConfirmModalInstance?.close()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Avatar Card -->
          <div class="flex flex-col items-center justify-center p-5 rounded-xl bg-slate-950/80 border border-slate-800 relative mb-5">
            <div class="relative mb-3">
              <div class="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-cyan-500 via-pink-500 to-indigo-500 shadow-lg shadow-cyan-500/20">
                <img id="gamertag-modal-avatar" src="" alt="Roblox Avatar" class="w-full h-full rounded-full object-cover bg-slate-900" />
              </div>
              <span class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center" title="Online / Verified">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
            </div>

            <div class="text-center">
              <div class="flex items-center justify-center gap-1.5 mb-0.5">
                <h4 id="gamertag-modal-display-name" class="text-lg font-extrabold text-white font-heading">---</h4>
                <i data-lucide="badge-check" class="w-4 h-4 text-cyan-400 shrink-0"></i>
              </div>
              <p id="gamertag-modal-username" class="text-xs font-mono text-cyan-400 font-semibold mb-1">@username</p>
              <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                <span>User ID:</span>
                <span id="gamertag-modal-userid" class="text-slate-200 font-bold">12345678</span>
              </div>
            </div>
          </div>

          <!-- Warning Notice -->
          <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 mb-5 leading-relaxed">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
            <div>
              <strong class="font-bold">กรุณาตรวจสอบให้แน่ใจ:</strong> สินค้าจะถูกจัดส่งไปยังไอดี Roblox ด้านบนนี้ทันทีหลังชำระเงิน หากไม่ใช่ตัวละครของคุณ กรุณากด "แก้ไขชื่อผู้เล่น"
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button onclick="window.GamertagConfirmModalInstance?.close()" class="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors">
              ✏️ แก้ไขชื่อผู้เล่น
            </button>
            <button id="btn-confirm-gamertag-submit" onclick="window.GamertagConfirmModalInstance?.confirm()" class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
              <span>ยืนยันตัวละครนี้</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Pre-flight lookup & open modal
   * @param {string} username - Roblox username
   * @param {Function} onConfirm - Callback called with user object on confirmation
   */
  async verifyAndShow(username, onConfirm) {
    if (!username || typeof username !== "string") {
      window.UI?.toast("กรุณาระบุชื่อผู้ใช้ Roblox", "warning");
      return;
    }

    try {
      window.UI?.toast("กำลังตรวจสอบข้อมูลผู้เล่นกับ Roblox API...", "info");
      const res = await fetch(`/api/roblox-lookup?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        window.UI?.toast(data.message || `ไม่พบผู้เล่นชื่อ "${username}" ในระบบ Roblox`, "error");
        return;
      }

      this.show(data.user, onConfirm);
    } catch (err) {
      window.UI?.toast(`เกิดข้อผิดพลาดในการเชื่อมต่อ Roblox API: ${err.message}`, "error");
    }
  }

  show(user, onConfirm) {
    this.currentUser = user;
    this.onConfirmCallback = onConfirm;

    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const avatarEl = document.getElementById("gamertag-modal-avatar");
    const displayEl = document.getElementById("gamertag-modal-display-name");
    const userEl = document.getElementById("gamertag-modal-username");
    const idEl = document.getElementById("gamertag-modal-userid");

    if (avatarEl) avatarEl.src = user.avatarUrl || "https://tr.rbxcdn.com/30DAY-AvatarHeadshot/150/150/AvatarHeadshot/Png";
    if (displayEl) displayEl.textContent = user.displayName || user.username;
    if (userEl) userEl.textContent = `@${user.username}`;
    if (idEl) idEl.textContent = user.id;

    modal.classList.remove("hidden");
    setTimeout(() => {
      const content = modal.querySelector(".modal-content");
      if (content) {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
      }
    }, 10);

    if (window.lucide) window.lucide.createIcons();
  }

  close() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    if (content) {
      content.classList.remove("scale-100", "opacity-100");
      content.classList.add("scale-95", "opacity-0");
    }

    setTimeout(() => {
      modal.classList.add("hidden");
      this.currentUser = null;
      this.onConfirmCallback = null;
    }, 200);
  }

  confirm() {
    if (this.currentUser && typeof this.onConfirmCallback === "function") {
      this.onConfirmCallback(this.currentUser);
    }
    this.close();
  }
}

// Global Singleton Initialization
if (typeof window !== "undefined") {
  window.GamertagConfirmModal = GamertagConfirmModal;
  window.GamertagConfirmModalInstance = new GamertagConfirmModal();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = GamertagConfirmModal;
}
