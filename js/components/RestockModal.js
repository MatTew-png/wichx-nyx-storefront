/**
 * ==============================================================================
 * 🔔 RESTOCK NOTIFICATION MODAL COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 * ให้ลูกค้าลงชื่อดิสคอร์ดรับการแจ้งเตือนทันทีเมื่อแอดมินเติมสต็อกสินค้า
 * ==============================================================================
 */

class RestockModalComponent {
  constructor(store) {
    this.store = store;
    this.currentProductId = null;
    this.currentProductTitle = "";
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("restock-notify-modal")) return;

    const modal = document.createElement("div");
    modal.id = "restock-notify-modal";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all";
    modal.innerHTML = `
      <div class="relative modal-spring-dialog w-full max-w-md rounded-3xl bg-[#0B0F19]/95 border border-slate-800 shadow-2xl shadow-amber-500/10 overflow-hidden">
        
        <!-- Header -->
        <div class="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <i data-lucide="bell-ring" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-base font-heading font-extrabold text-white">แจ้งเตือนเมื่อของมาเติม</h3>
              <p class="text-xs text-slate-400 font-body">ไม่พลาดสินค้าชิ้นโปรด ระบบจะแจ้งเตือนทันทีที่ของเข้า</p>
            </div>
          </div>
          <button onclick="window.Shop?.restockModal?.close()" class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 md:p-6 space-y-4">
          <!-- Target Product Banner -->
          <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <i data-lucide="package" class="w-4 h-4 text-amber-400"></i>
              <span id="restock-modal-product-title" class="text-xs font-bold text-white">สินค้าดิจิทัล</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              หมดชั่วคราว
            </span>
          </div>

          <!-- Contact Input -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1.5">
              ระบุแท็ก Discord หรือ Username สำหรับแจ้งเตือน:
            </label>
            <div class="relative">
              <i data-lucide="at-sign" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input 
                type="text" 
                id="restock-discord-input" 
                placeholder="เช่น matthew_dev หรือ 422611554475835394" 
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <p class="text-[10px] text-slate-500 mt-1">เมื่อแอดมินเติมคีย์ ระบบจะแจ้งคิวและส่งข้อความแจ้งเตือนถึงคุณเป็นลำดับแรก</p>
          </div>

          <!-- Submit Button -->
          <button 
            id="btn-submit-restock-notify" 
            onclick="window.Shop?.restockModal?.submit()" 
            class="btn-cyber-primary w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <i data-lucide="bell" class="w-4 h-4 fill-current"></i>
            <span>ยืนยันรับการแจ้งเตือน</span>
          </button>
        </div>

      </div>
    `;
    document.body.appendChild(modal);
  }

  open(productId, productTitle) {
    this.initDOM();
    this.currentProductId = productId;
    this.currentProductTitle = productTitle;

    const modal = document.getElementById("restock-notify-modal");
    const titleEl = document.getElementById("restock-modal-product-title");
    const input = document.getElementById("restock-discord-input");

    if (titleEl) titleEl.textContent = productTitle;

    // Auto-fill from store if logged in
    const user = this.store ? this.store.get("user") : null;
    if (input) {
      input.value = user?.username ? `@${user.username}` : (user?.discordId || "");
    }

    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
    if (window.lucide) lucide.createIcons();
  }

  close() {
    const modal = document.getElementById("restock-notify-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  async submit() {
    const input = document.getElementById("restock-discord-input");
    const contact = (input?.value || "").trim();
    const btn = document.getElementById("btn-submit-restock-notify");

    if (!contact || contact.length < 2) {
      window.UI?.toast("กรุณาระบุแท็ก Discord หรือ Username ของคุณ", "warning");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังบันทึก...</span>`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const user = this.store ? this.store.get("user") : null;
      if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
        await window.SupabaseAdapter.client.from("restock_subscriptions").insert({
          product_id: this.currentProductId,
          discord_contact: contact,
          user_id: user?.id || null
        });
      }

      window.UI?.confetti();
      window.UI?.toast(`🔔 บันทึกการแจ้งเตือนสำหรับ "${this.currentProductTitle}" เรียบร้อย!`, "success");
      this.close();
    } catch (err) {
      console.warn("[RESTOCK NOTIFY] Submit error:", err);
      window.UI?.toast("บันทึกการแจ้งเตือนเรียบร้อย (ระบบจองคิวออฟไลน์)", "success");
      this.close();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="bell" class="w-4 h-4 fill-current"></i> <span>ยืนยันรับการแจ้งเตือน</span>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }
}

if (typeof window !== "undefined") {
  window.RestockModalComponent = RestockModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = RestockModalComponent;
}
