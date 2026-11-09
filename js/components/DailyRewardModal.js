/**
 * ==============================================================================
 * 🎁 DAILY FREE CHEST & REWARD MODAL (TC-DLY-01)
 * ==============================================================================
 * มินิเกมเปิดกล่องสุ่มรายวัน แจกคะแนนสะสม (Loyalty Points) ฟรีทุก 24 ชั่วโมง
 * ==============================================================================
 */

class DailyRewardModal {
  constructor(store) {
    this.store = store;
    this.modalId = "daily-reward-modal";
    this.statusData = null;
    this.isLoading = false;
    this.init();
  }

  init() {
    if (typeof document === "undefined") return;
    if (document.getElementById(this.modalId)) return;

    const modalHtml = `
      <div id="${this.modalId}" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onclick="window.DailyRewardModalInstance?.close()"></div>

        <!-- Dialog -->
        <div class="relative w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 z-10 transform transition-all duration-300 scale-95 opacity-0 modal-content overflow-hidden text-center">
          
          <!-- Cyber Ambient Accent -->
          <div class="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Close Button -->
          <button onclick="window.DailyRewardModalInstance?.close()" class="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>

          <!-- Icon Chest -->
          <div class="relative mx-auto w-24 h-24 mb-4 flex items-center justify-center">
            <div class="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
            <div class="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center transform hover:scale-105 transition-transform">
              <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <i data-lucide="gift" class="w-10 h-10 animate-bounce"></i>
              </div>
            </div>
          </div>

          <!-- Titles -->
          <h3 class="text-lg font-heading font-extrabold text-white mb-1 tracking-wide">กล่องสุ่มฟรีรายวัน</h3>
          <p class="text-xs text-slate-400 mb-4">เช็คอินรับคะแนนสะสมพิเศษฟรีทุก 24 ชั่วโมง</p>

          <!-- Cooldown or Streak Badge -->
          <div id="daily-chest-status-box" class="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-5">
            <div class="text-[11px] text-slate-400 mb-0.5">สถานะกล่องสุ่ม:</div>
            <div id="daily-chest-status-text" class="text-sm font-mono font-bold text-amber-400">กำลังตรวจสอบสิทธิ์...</div>
          </div>

          <!-- Action Button -->
          <button id="btn-claim-daily-reward" onclick="window.DailyRewardModalInstance?.claim()" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
            <span>เปิดกล่องสุ่มทันที</span>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) window.lucide.createIcons();
  }

  async open() {
    const user = this.store ? this.store.get("user") : null;
    if (!user || !user.id) {
      window.UI?.toast("กรุณาเข้าสู่ระบบก่อนเปิดกล่องสุ่มรายวัน", "warning");
      if (window.Shop?.authModal) window.Shop.authModal.open("login");
      return;
    }

    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.classList.remove("hidden");
    setTimeout(() => {
      const content = modal.querySelector(".modal-content");
      if (content) {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
      }
    }, 10);

    window.AudioEngineInstance?.playModal();
    if (window.lucide) window.lucide.createIcons();

    await this.checkStatus(user.id);
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
    }, 200);
  }

  async checkStatus(userId) {
    const statusText = document.getElementById("daily-chest-status-text");
    const btn = document.getElementById("btn-claim-daily-reward");

    try {
      const res = await fetch(`/api/daily-reward?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      this.statusData = data;

      if (data.can_claim) {
        if (statusText) statusText.innerHTML = `🟢 พร้อมเปิดรับรางวัล! (สถิติ ${data.streak_count || 0} วัน)`;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="gift" class="w-4 h-4"></i> <span>เปิดกล่องสุ่มทันที</span>`;
        }
      } else {
        if (statusText) statusText.innerHTML = `⏳ เปิดได้อีกใน ${data.remaining_hours || 24} ชั่วโมง`;
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<i data-lucide="lock" class="w-4 h-4"></i> <span>รอคูลดาวน์ ${data.remaining_hours || 24} ชม.</span>`;
        }
      }
    } catch (e) {
      if (statusText) statusText.innerHTML = "พร้อมเปิดรับรางวัล!";
      if (btn) btn.disabled = false;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async claim() {
    const user = this.store ? this.store.get("user") : null;
    if (!user || !user.id) return;

    const btn = document.getElementById("btn-claim-daily-reward");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>กำลังเปิดกล่อง...</span>`;
    }

    try {
      const res = await fetch("/api/daily-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        window.UI?.toast(data.message || "เปิดกล่องสุ่มไม่สำเร็จ", "error");
        window.AudioEngineInstance?.playError();
        return;
      }

      // Success
      window.AudioEngineInstance?.playFanfare();
      window.UI?.confetti();
      window.UI?.toast(data.message, "success");

      // Update points in store
      if (this.store && data.new_points !== undefined) {
        this.store.set("userPoints", data.new_points);
      }

      setTimeout(() => {
        this.close();
      }, 1800);

    } catch (err) {
      window.UI?.toast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
      }
    }
  }
}

// Global Singleton
if (typeof window !== "undefined") {
  window.DailyRewardModal = DailyRewardModal;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DailyRewardModal;
}
