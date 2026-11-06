/**
 * ==============================================================================
 * 📜 HISTORY & ORDER VAULT COMPONENT (OOP MODAL CONTROLLER)
 * ==============================================================================
 */

class HistoryModalComponent {
  constructor(store, historyService) {
    this.store = store;
    this.historyService = historyService;
    this.orders = [];
    this.activeSearch = "";
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    // ตรวจสอบว่ามี Container ของ Modal อยู่ในหน้าเว็บหรือยัง ถ้ายังไม่มีให้สร้างขึ้นอัตโนมัติ
    if (!document.getElementById("history-modal")) {
      const modalEl = document.createElement("div");
      modalEl.id = "history-modal";
      modalEl.className = "fixed inset-0 z-50 hidden items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all";
      modalEl.innerHTML = `
        <div class="relative modal-spring-dialog w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0B0F19]/95 border border-slate-800 shadow-2xl shadow-[var(--accent)]/10 overflow-hidden">
          
          <!-- Header -->
          <div class="p-5 md:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/10">
                <i data-lucide="history" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base md:text-lg font-heading font-extrabold text-white flex items-center gap-2">
                  ประวัติการสั่งซื้อ & คลังคีย์
                  <span id="history-total-badge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30">0 รายการ</span>
                </h3>
                <p class="text-xs text-slate-400 font-body">ตรวจสอบคีย์และรายการสั่งซื้อย้อนหลังของคุณได้ตลอด 24 ชั่วโมง</p>
              </div>
            </div>
            <button onclick="window.closeHistoryModal()" class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Search Filter Bar with Cloud Lookup Button -->
          <div class="px-5 md:px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input 
                type="text" 
                id="history-search-input"
                oninput="window.handleHistorySearch(event)"
                onkeydown="if(event.key==='Enter') window.Shop?.historyModal?.searchCloudOrder()"
                placeholder="ค้นหาด้วยรหัสออเดอร์ (เช่น WX-371156) หรือชื่อสินค้า..." 
                class="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] transition-all font-body font-mono"
              />
            </div>
            <button 
              onclick="window.Shop?.historyModal?.searchCloudOrder()" 
              class="px-3.5 py-2 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="ค้นหาออเดอร์จากฐานข้อมูลเซิร์ฟเวอร์"
            >
              <i data-lucide="cloud" class="w-3.5 h-3.5"></i>
              <span>ค้นหาในระบบ</span>
            </button>
          </div>

          <!-- Order List Body (Scrollable) -->
          <div id="history-orders-container" class="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 max-h-[58vh]">
            <!-- Dynamic Content -->
          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
            <div class="flex items-center gap-1.5 font-mono text-[11px]">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
              <span>ระบบรับประกันและประวัติความปลอดภัย 100%</span>
            </div>
            <button onclick="window.closeHistoryModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all">
              ปิดหน้าต่าง
            </button>
          </div>

        </div>
      `;
      document.body.appendChild(modalEl);
    }
  }

  async open() {
    this.initDOM();
    const modalEl = document.getElementById("history-modal");
    if (!modalEl) return;

    modalEl.classList.remove("hidden");
    modalEl.classList.add("flex");

    const container = document.getElementById("history-orders-container");
    container.innerHTML = `
      <div class="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div class="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs font-mono">กำลังโหลดประวัติคำสั่งซื้อ...</p>
      </div>
    `;

    try {
      this.orders = await this.historyService.getOrderHistory();
      this.render();
    } catch (e) {
      container.innerHTML = `
        <div class="py-8 text-center text-rose-400 text-xs font-body">
          เกิดข้อผิดพลาดในการโหลดประวัติ: ${e.message}
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  close() {
    const modalEl = document.getElementById("history-modal");
    if (!modalEl) return;
    modalEl.classList.add("hidden");
    modalEl.classList.remove("flex");
  }

  filter(query) {
    this.activeSearch = (query || "").trim().toLowerCase();
    this.render();
  }

  async searchCloudOrder() {
    const input = document.getElementById("history-search-input");
    const query = (input?.value || "").trim().toUpperCase();
    if (!query) {
      window.UI?.toast("กรุณาระบุรหัสออเดอร์ที่ต้องการค้นหา (เช่น WX-371156)", "warning");
      return;
    }

    // 1. Check local cache
    const foundLocal = this.orders.find(o => (o.orderId || "").toUpperCase() === query);
    if (foundLocal) {
      this.activeSearch = query.toLowerCase();
      this.render();
      window.UI?.toast(`พบออเดอร์ ${query} ในประวัติของคุณ`, "info");
      return;
    }

    // 2. Query Supabase
    window.UI?.toast(`กำลังค้นหาออเดอร์ ${query} ในเซิร์ฟเวอร์...`, "info");

    try {
      if (window.SupabaseAdapter && window.SupabaseAdapter.client) {
        const { data, error } = await window.SupabaseAdapter.client.rpc("lookup_order", { p_order_id: query });
        if (data && data.success && data.order) {
          const ord = data.order;
          this.orders.unshift({
            orderId: ord.orderId,
            totalAmount: parseFloat(ord.totalAmount || 0),
            timestamp: ord.timestamp,
            paymentMethod: ord.paymentMethod || "wallet",
            status: ord.status || "PAID",
            items: (ord.items || []).map(oi => ({
              id: oi.id,
              title: oi.title || "สินค้าดิจิทัล",
              quantity: oi.quantity || 1,
              credentials: Array.isArray(oi.credentials) ? oi.credentials : (oi.credentials ? [oi.credentials] : [])
            }))
          });
          this.activeSearch = query.toLowerCase();
          this.render();
          window.UI?.confetti();
          window.UI?.toast(`✨ พบข้อมูลออเดอร์ ${query} จากฐานข้อมูลเรียบร้อยแล้ว!`, "success");
          return;
        } else {
          window.UI?.toast(data?.message || "ไม่พบคำสั่งซื้อรหัสนี้ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง", "warning");
        }
      }
    } catch (err) {
      console.warn("[HISTORY SEARCH] Error:", err);
      window.UI?.toast("การค้นหาล้มเหลว กรุณาตรวจสอบรหัสออเดอร์อีกครั้ง", "error");
    }
  }

  render() {
    const container = document.getElementById("history-orders-container");
    const badge = document.getElementById("history-total-badge");
    if (!container) return;

    let filtered = this.orders;
    if (this.activeSearch) {
      filtered = this.orders.filter(ord => {
        const matchId = (ord.orderId || "").toLowerCase().includes(this.activeSearch);
        const matchProduct = (ord.items || []).some(item => (item.title || "").toLowerCase().includes(this.activeSearch));
        return matchId || matchProduct;
      });
    }

    if (badge) badge.textContent = `${filtered.length} รายการ`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-16 flex flex-col items-center justify-center text-center px-4">
          <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-3">
            <i data-lucide="inbox" class="w-7 h-7"></i>
          </div>
          <h4 class="text-sm font-bold text-slate-200 mb-1">ยังไม่พบประวัติการสั่งซื้อ</h4>
          <p class="text-xs text-slate-500 max-w-sm mb-4">
            ${this.activeSearch ? "ไม่พบคำสั่งซื้อที่ตรงกับคำค้นหา ลองตรวจสอบรหัสออเดอร์อีกครั้ง" : "เมื่อคุณสั่งซื้อสินค้า ดิจิทัลคีย์และข้อมูลการรับประกันจะแสดงที่นี่โดยอัตโนมัติ"}
          </p>
          <button onclick="window.closeHistoryModal()" class="btn-cyber-primary px-4 py-2 rounded-xl text-xs font-bold">
            เลือกชมสินค้าในร้าน
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = filtered.map(order => {
      const dateFormatted = new Date(order.timestamp).toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const totalItemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

      const itemsHtml = (order.items || []).map(item => {
        const keys = item.credentials || [];
        const hasKeys = keys.length > 0;

        return `
          <div class="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 mb-2 last:mb-0">
            <div class="flex items-center justify-between text-xs mb-2">
              <span class="font-bold text-white flex items-center gap-1.5">
                <i data-lucide="package" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
                ${item.title}
              </span>
              <span class="text-slate-400 font-mono text-[11px]">จำนวน: x${item.quantity || 1}</span>
            </div>

            ${hasKeys ? `
              <div class="space-y-1.5 mt-2">
                ${keys.map((key, kIdx) => `
                  <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/60 border border-slate-800/80 group">
                    <span class="font-mono text-xs text-cyan-300 select-all truncate max-w-[280px] sm:max-w-md">
                      ${key}
                    </span>
                    <button 
                      onclick="window.copyHistoryKey('${key}')" 
                      class="px-2 py-1 rounded bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black font-bold text-[10px] font-mono flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                      title="คัดลอกคีย์นี้"
                    >
                      <i data-lucide="copy" class="w-3 h-3"></i>
                      <span>คัดลอก</span>
                    </button>
                  </div>
                `).join("")}
              </div>
            ` : `
              <div class="text-[11px] text-amber-400/90 font-mono flex items-center gap-1 mt-1">
                <i data-lucide="clock" class="w-3 h-3"></i>
                <span>สินค้าบริการหรือรอแอดมินดำเนินการส่งมอบ</span>
              </div>
            `}
          </div>
        `;
      }).join("");

      return `
        <div class="rounded-2xl bg-slate-900/70 border border-slate-800/90 p-4 hover:border-[var(--accent)]/40 transition-all">
          <!-- Top Row: Order ID, Date, Amount -->
          <div class="flex items-center justify-between flex-wrap gap-2 pb-3 mb-3 border-b border-slate-800/70">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-xs text-[var(--accent)] flex items-center gap-1">
                  <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                  ${order.orderId}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ${order.status || "PAID"}
                </span>
              </div>
              <div class="text-[10px] font-mono text-slate-400 mt-0.5">${dateFormatted}</div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <div class="text-right mr-1">
                <div class="text-[10px] text-slate-400 font-mono">ยอดสุทธิ</div>
                <div class="text-xs font-mono font-bold text-white">฿${(order.totalAmount || 0).toFixed(2)}</div>
              </div>

              <!-- Button 1: Download Cyberpunk Receipt PNG -->
              <button 
                onclick="window.saveOrderCardPNG('${order.orderId}')"
                class="px-2.5 py-1.5 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black border border-[var(--accent)]/40 text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="บันทึกใบเสร็จเป็นรูปภาพ PNG สวยงามลงมือถือ/คอม"
              >
                <i data-lucide="image-down" class="w-3.5 h-3.5"></i>
                <span>รูปใบเสร็จ</span>
              </button>

              <!-- Button 2: 1-Click Discord Claim 24h -->
              <button 
                onclick="window.claimOrderToDiscord('${order.orderId}', '${(order.items?.[0]?.title || '').replace(/'/g, "\\'")}', '${dateFormatted}')"
                class="px-2.5 py-1.5 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2]/40 border border-[#5865F2]/50 text-[11px] text-[#A5B4FC] hover:text-white font-body font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="คัดลอกแบบฟอร์มแล้วเปิดห้องเคลมใน Discord 24 ชม."
              >
                <i data-lucide="message-square" class="w-3.5 h-3.5 text-[#5865F2]"></i>
                <span>เคลมใน Discord</span>
              </button>

              <!-- Button 3: Web Claim Form -->
              <button 
                onclick="window.quickClaimOrder('${order.orderId}')"
                class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-[11px] text-slate-300 hover:text-rose-300 font-body flex items-center gap-1 transition-all cursor-pointer"
                title="ยื่นเรื่องเคลมผ่านหน้าเว็บ"
              >
                <i data-lucide="life-buoy" class="w-3 h-3 text-rose-400"></i>
                <span>เคลมหน้าเว็บ</span>
              </button>
            </div>
          </div>

          <!-- Items and Keys -->
          <div>
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }
}

window.HistoryModalComponent = HistoryModalComponent;

if (typeof module !== "undefined" && module.exports) {
  module.exports = HistoryModalComponent;
}
