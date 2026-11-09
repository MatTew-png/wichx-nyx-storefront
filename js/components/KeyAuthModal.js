/**
 * ==============================================================================
 * 🔑 NYX9 STUDIO — KEYAUTH HWID SELF-RESET MODAL COMPONENT (Sprint 5)
 * ==============================================================================
 * ให้บริการลูกค้ารีเซ็ต Hardware ID ด้วยตนเองตลอด 24 ชั่วโมง
 * พร้อมแสดงสถานะ Cooldown และคำแนะนำการใช้งาน
 * ==============================================================================
 */

class KeyAuthModalComponent {
  constructor(store) {
    this.store = store;
    this.modalEl = null;
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("modal-keyauth-reset")) return;

    const modal = document.createElement("div");
    modal.id = "modal-keyauth-reset";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all";
    modal.innerHTML = `
      <div class="relative w-full max-w-md rounded-3xl bg-[#090D17] border border-cyan-500/30 p-6 sm:p-7 shadow-2xl shadow-cyan-950/40 text-white space-y-5">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
              <i data-lucide="key" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-base font-heading font-extrabold text-white flex items-center gap-1.5">
                <span>KeyAuth HWID Self-Reset</span>
              </h3>
              <p class="text-[11px] text-slate-400 font-mono">ระบบย้ายเครื่องและรีเซ็ต Hardware ID อัตโนมัติ</p>
            </div>
          </div>
          <button onclick="window.closeKeyAuthModal()" class="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Cooldown & Policy Info Box -->
        <div class="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 space-y-1.5 leading-relaxed font-sans">
          <div class="flex items-center gap-1.5 font-bold text-cyan-300 font-mono text-[11px]">
            <i data-lucide="info" class="w-3.5 h-3.5"></i>
            <span>เงื่อนไขการรีเซ็ต HWID</span>
          </div>
          <p class="text-[11px] text-slate-300">
            • 1 License Key สามารถรีเซ็ตได้ 1 ครั้งต่อ 24 ชั่วโมง (Cooldown 24 ชม.)<br>
            • หลังรีเซ็ตสำเร็จ สามารถนำคีย์ไปเปิดใช้งานบนคอมพิวเตอร์เครื่องใหม่ได้ทันที
          </p>
        </div>

        <!-- Form Body -->
        <form onsubmit="window.handleKeyAuthResetSubmit(event)" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
              <span>ป้อน License Key ของคุณ</span>
              <span id="keyauth-cooldown-badge" class="hidden text-[10px] text-amber-400 font-mono"></span>
            </label>
            <div class="relative">
              <input type="text" id="input-keyauth-license" required placeholder="NYX-XXXX-XXXX-XXXX" 
                     class="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] focus:border-cyan-400 focus:outline-none text-xs font-mono text-white placeholder-slate-600 transition-all" />
              <button type="button" onclick="window.checkKeyAuthStatus()" class="absolute right-2 top-2 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-mono text-cyan-300 hover:text-white transition-all cursor-pointer">
                ตรวจสอบ
              </button>
            </div>
          </div>

          <div id="keyauth-status-result" class="hidden p-3 rounded-xl text-xs font-mono"></div>

          <!-- Action Buttons -->
          <div class="pt-2 flex items-center gap-2">
            <button type="button" onclick="window.closeKeyAuthModal()" class="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer">
              ปิด
            </button>
            <button type="submit" id="btn-submit-hwid-reset" class="btn-cyber-primary flex-[2] py-2.5 rounded-xl text-xs font-heading font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95 transition-all">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>ยืนยันรีเซ็ต HWID</span>
            </button>
          </div>
        </form>

      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    this.bindGlobalActions();
  }

  bindGlobalActions() {
    window.openKeyAuthModal = () => this.open();
    window.closeKeyAuthModal = () => this.close();

    window.checkKeyAuthStatus = async () => {
      const input = document.getElementById("input-keyauth-license");
      const key = String(input?.value || "").trim();
      const resultBox = document.getElementById("keyauth-status-result");
      if (!key) {
        window.UI?.toast("กรุณาป้อน License Key ก่อนตรวจสอบ", "warning");
        return;
      }

      try {
        const res = await fetch(`/api/keyauth-reset?action=check&license_key=${encodeURIComponent(key)}`);
        const data = await res.json();

        if (resultBox) {
          resultBox.classList.remove("hidden");
          if (data.can_reset) {
            resultBox.className = "p-3 rounded-xl text-xs font-mono bg-emerald-950/40 border border-emerald-500/40 text-emerald-300";
            resultBox.textContent = "✅ คีย์นี้พร้อมรีเซ็ต HWID ได้ทันที (ไม่มี Cooldown ค้าง)";
          } else {
            resultBox.className = "p-3 rounded-xl text-xs font-mono bg-amber-950/40 border border-amber-500/40 text-amber-300";
            resultBox.textContent = `⏳ คีย์นี้ติด Cooldown: กรุณารออีกประมาณ ${data.remaining_hours} ชั่วโมง`;
          }
        }
      } catch (err) {
        window.UI?.toast("ไม่สามารถตรวจสอบสถานะคีย์ได้", "error");
      }
    };

    window.handleKeyAuthResetSubmit = async (e) => {
      if (e) e.preventDefault();
      const input = document.getElementById("input-keyauth-license");
      const key = String(input?.value || "").trim();
      const btn = document.getElementById("btn-submit-hwid-reset");

      if (!key) return;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> กำลังรีเซ็ต...`;
        if (window.lucide) lucide.createIcons();
      }

      try {
        const user = this.store ? this.store.get("user") : null;
        const res = await fetch("/api/keyauth-reset?action=reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: key, user_id: user?.id })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "รีเซ็ต HWID ไม่สำเร็จ");
        }

        window.UI?.toast(data.message, "success");
        window.UI?.confetti();
        window.closeKeyAuthModal();
      } catch (err) {
        window.UI?.toast(err.message, "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> <span>ยืนยันรีเซ็ต HWID</span>`;
          if (window.lucide) lucide.createIcons();
        }
      }
    };
  }

  open() {
    this.initDOM();
    if (this.modalEl) {
      this.modalEl.classList.remove("hidden");
      this.modalEl.classList.add("flex");
    }
    if (window.lucide) lucide.createIcons();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add("hidden");
      this.modalEl.classList.remove("flex");
    }
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.KeyAuthModalComponent = KeyAuthModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = KeyAuthModalComponent;
}
