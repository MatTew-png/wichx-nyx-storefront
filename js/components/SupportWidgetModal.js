/**
 * ==============================================================================
 * 💬 FLOATING SUPPORT WIDGET & INTERACTIVE FAQ (TC-FAQ-01)
 * ==============================================================================
 * วิดเจ็ตช่วยเหลือด่วนมุมขวาล่าง พร้อมคำถามที่พบบ่อย (FAQ Accordion)
 * และปุ่มเปิด Ticket ใน Discord Server ทันที
 * ==============================================================================
 */

class SupportWidgetModal {
  constructor() {
    this.modalId = "support-widget-modal";
    this.init();
  }

  init() {
    if (typeof document === "undefined") return;
    if (document.getElementById(this.modalId)) return;

    // 1. Render Floating Action Button
    const floatingBtnHtml = `
      <div id="floating-support-btn-container" class="fixed bottom-20 sm:bottom-6 right-5 sm:right-6 z-40">
        <button onclick="window.SupportWidgetModalInstance?.open()" class="relative w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500/20 via-cyan-500/40 to-blue-500/30 border border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/25 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all group" title="ศูนย์ช่วยเหลือ & FAQ">
          <i data-lucide="headphones" class="w-5 h-5 group-hover:rotate-12 transition-transform"></i>
          <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center animate-pulse"></span>
        </button>
      </div>
    `;

    // 2. Render Help Modal
    const modalHtml = `
      <div id="${this.modalId}" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onclick="window.SupportWidgetModalInstance?.close()"></div>

        <!-- Dialog Box -->
        <div class="relative w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10 z-10 transform transition-all duration-300 scale-95 opacity-0 modal-content overflow-hidden max-h-[90vh] flex flex-col">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <i data-lucide="help-circle" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-extrabold text-white tracking-wide font-heading">ศูนย์ช่วยเหลือ & คำถามพบบ่อย</h3>
                <div class="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ทีมงานออนไลน์พร้อมช่วยเหลือ 24 ชั่วโมง</span>
                </div>
              </div>
            </div>
            <button onclick="window.SupportWidgetModalInstance?.close()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- FAQ Accordion List (Scrollable) -->
          <div class="overflow-y-auto space-y-2.5 pr-1 mb-5 flex-1 text-left">
            
            <!-- Q1 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="credit-card" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>โอนเงินแล้ว ยอดเงินไม่เข้าอัตโนมัติ ต้องทำอย่างไร?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                ระบบใช้ AI Slip Verification ตรวจสอบยอดเงินภายใน 5 วินาที หากยอดไม่ปรับอัตโนมัติ กรุณาตรวจสอบว่าสลิปโอนเข้าบัญชีทางการของร้านค้า และแนบสลิปไม่เกิน 15 นาที หากระบบขัดข้อง สามารถทักแอดมินใน Discord พร้อมแนบสลิปเพื่อปรับยอดให้ทันที
              </div>
            </details>

            <!-- Q2 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="key" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>สินค้าดิจิทัล (Nitro, สคริปต์, คีย์) จัดส่งทางไหน?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                จัดส่งบนหน้าจอทันทีหลังตัดยอดชำระเงินสำเร็จ (Instant Vault Dispensing) และลูกค้าสามารถกดดูย้อนหลังได้ตลอด 24 ชั่วโมงในเมนู "ประวัติการสั่งซื้อ"
              </div>
            </details>

            <!-- Q3 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="shield-check" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>เงื่อนไขการรับประกันสินค้า (Warranty Policy)?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                สินค้าทุกชิ้นรับประกันของแท้ 100% ตั้งแต่ 30 วัน จนถึงตลอดอายุการใช้งาน หากเกิดปัญหาหลุดหรือคีย์ผิดพลาด ลูกค้าสามารถกดปุ่ม "แจ้งเคลมประกัน" ในหน้าประวัติการสั่งซื้อเพื่อออกตั๋วเคลมได้ทันที
              </div>
            </details>

            <!-- Q4 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="gift" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>ซื้อแบบ Guest ด้วยซองอั่งเปา ไม่ได้สมัครสมาชิก ดูของตรงไหน?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                ลูกค้าที่ซื้อแบบ Guest สามารถนำรหัสคำสั่งซื้อ (เช่น WX-123456) ที่แสดงบนหน้าจอ ไปกรอกค้นหาในหน้า "เช็คประวัติการสั่งซื้อ" เพื่อดูรหัสสินค้าและดาวน์โหลดใบเสร็จได้ตลอดเวลา
              </div>
            </details>

            <!-- Q5 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="activity" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>สคริปต์ Roblox ปลอดภัยหรือไม่ โดนแบนไหม?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                สคริปต์ของ NYX9 STUDIO มีเรดาร์ตรวจสอบความปลอดภัย (Undetected Radar) และมีตาราง Executor Compatibility แสดงสถานะการทำงานร่วมกับตัวรัน Delta, Wave, Fluxus ให้ตรวจสอบก่อนซื้อทุกครั้ง
              </div>
            </details>

          </div>

          <!-- Discord Ticket CTA Footer -->
          <div class="pt-3 border-t border-slate-800 shrink-0">
            <a href="https://discord.gg/9W7m6CjKyp" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-xs shadow-lg shadow-[#5865F2]/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <i data-lucide="message-square" class="w-4 h-4"></i>
              <span>เปิด Ticket ติดต่อทีมงานใน Discord Server</span>
            </a>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', floatingBtnHtml + modalHtml);
    if (window.lucide) window.lucide.createIcons();
  }

  open() {
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
}

// Global Singleton
if (typeof window !== "undefined") {
  window.SupportWidgetModal = SupportWidgetModal;
  window.SupportWidgetModalInstance = new SupportWidgetModal();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SupportWidgetModal;
}
