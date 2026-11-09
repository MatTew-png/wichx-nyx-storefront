/**
 * ==============================================================================
 * 🎟️ VOUCHERS & PROMO CODES SERVICE
 * ==============================================================================
 * Shopee & TikTok Style Discount Vouchers & Usage Quotas
 * ==============================================================================
 */

class VoucherService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  generateRandomPromoCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "NYX";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const codeInput = document.getElementById("voucher-input-code");
    if (codeInput) {
      codeInput.value = code;
      codeInput.focus();
    }
    return code;
  }

  async loadAdminVouchers() {
    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "list",
        p_code_data: {}
      });

      if (res.error) throw res.error;
      if (res.data && res.data.success) {
        const vouchers = res.data.vouchers || [];
        this.store.set("currentVouchersList", vouchers);
        this.renderVouchersStats(vouchers);
        this.renderVouchersTable(vouchers);
      }
    } catch (err) {
      console.error("[VoucherService] Error loading vouchers:", err);
    }
  }

  renderVouchersStats(vouchers) {
    const activeCount = vouchers.filter(v => v.is_active).length;
    const totalUses = vouchers.reduce((acc, v) => acc + (Number(v.used_count) || 0), 0);

    const statActive = document.getElementById("stat-active-vouchers");
    const statUses = document.getElementById("stat-total-voucher-uses");
    const statTotal = document.getElementById("stat-total-vouchers");

    if (statActive) statActive.textContent = `${activeCount} โค้ด`;
    if (statUses) statUses.textContent = `${totalUses.toLocaleString()} ครั้ง`;
    if (statTotal) statTotal.textContent = `${vouchers.length} รายการ`;
  }

  renderVouchersTable(vouchers) {
    const tbody = document.getElementById("vouchers-table-body");
    if (!tbody) return;

    if (!vouchers || vouchers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-10 text-slate-500">
            ยังไม่มีโค้ดส่วนลดในระบบ กดปุ่มสร้างโค้ดด้านบนเพื่อเริ่มต้นได้ทันที
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = vouchers.map(v => {
      const isPercent = v.discount_type === "percent";
      const discBadge = isPercent 
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-mono bg-pink-500/10 text-pink-400 border border-pink-500/30 font-bold">ลด ${v.discount_value}%${v.max_discount ? ` (สูงสุด ฿${v.max_discount})` : ''}</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">ลด ฿${Number(v.discount_value).toFixed(2)}</span>`;

      const minSpendText = Number(v.min_spend) > 0 
        ? `<span class="text-white font-mono">฿${Number(v.min_spend).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>`
        : `<span class="text-slate-500">ไม่มีขั้นต่ำ</span>`;

      const usageText = v.usage_limit 
        ? `<span class="font-mono text-white">${v.used_count || 0}</span><span class="text-slate-500 font-mono"> / ${v.usage_limit}</span>`
        : `<span class="font-mono text-white">${v.used_count || 0}</span><span class="text-slate-500 font-mono"> / ∞</span>`;

      const statusBadge = v.is_active
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1 w-fit mx-auto"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>เปิดใช้งาน</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center gap-1 w-fit mx-auto"><span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>ปิดใช้งาน</span>`;

      return `
        <tr class="hover:bg-slate-900/40 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-white px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-xs tracking-wider">${AdminUI.escapeHtml(v.code)}</span>
              <button onclick="AdminUI.copyToClipboard('${AdminUI.escapeJs(v.code)}')" class="text-slate-500 hover:text-white transition-colors cursor-pointer" title="คัดลอกโค้ด">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="text-slate-200 font-medium">${AdminUI.escapeHtml(v.label || '-')}</span>
          </td>
          <td class="py-3 px-4">${discBadge}</td>
          <td class="py-3 px-4">${minSpendText}</td>
          <td class="py-3 px-4">${usageText}</td>
          <td class="py-3 px-4 text-center">${statusBadge}</td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="toggleAdminVoucher('${AdminUI.escapeJs(v.code)}')" class="p-1.5 rounded-lg ${v.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'} transition-all cursor-pointer" title="${v.is_active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}">
                <i data-lucide="${v.is_active ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="deleteAdminVoucher('${AdminUI.escapeJs(v.code)}')" class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer" title="ลบโค้ด">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  }

  async handleCreateVoucher(event) {
    if (event) event.preventDefault();
    const code = document.getElementById("voucher-input-code").value.trim().toUpperCase();
    const label = document.getElementById("voucher-input-label").value.trim();
    const discount_type = document.getElementById("voucher-input-type").value;
    const discount_value = parseFloat(document.getElementById("voucher-input-value").value) || 0;
    const min_spend = parseFloat(document.getElementById("voucher-input-minspend").value) || 0;
    const max_discount = document.getElementById("voucher-input-maxdisc").value ? parseFloat(document.getElementById("voucher-input-maxdisc").value) : null;
    const usage_limit = document.getElementById("voucher-input-limit").value ? parseInt(document.getElementById("voucher-input-limit").value, 10) : null;

    if (!code || code.length < 3) {
      alert("รหัสโค้ดต้องมีความยาวอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (discount_value <= 0) {
      alert("มูลค่าส่วนลดต้องมากกว่า 0");
      return;
    }

    const btn = document.getElementById("btn-submit-voucher");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังบันทึก...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "create",
        p_code_data: {
          code,
          label,
          discount_type,
          discount_value,
          min_spend,
          max_discount,
          usage_limit,
          is_active: true
        }
      });

      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถสร้างโค้ดได้");

      AdminUI.showToast(`สร้างโค้ด "${code}" สำเร็จแล้ว!`, "success");
      document.getElementById("form-create-voucher")?.reset();
      const minEl = document.getElementById("voucher-input-minspend");
      if (minEl) minEl.value = "0";
      await this.loadAdminVouchers();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i> <span>สร้างโค้ด</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async toggleAdminVoucher(code) {
    if (!confirm(`ต้องการเปลี่ยนสถานะเปิด/ปิดโค้ด "${code}"?`)) return;
    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "toggle",
        p_code_data: { code }
      });
      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถเปลี่ยนสถานะได้");
      await this.loadAdminVouchers();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  }

  async deleteAdminVoucher(code) {
    if (!confirm(`⚠️ ยืนยันการลบโค้ด "${code}" อย่างถาวร? ลูกค้าจะไม่สามารถใช้โค้ดนี้ได้อีก`)) return;
    try {
      const res = await this.apiClient.rpc("admin_manage_promo_code", {
        p_action: "delete",
        p_code_data: { code }
      });
      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถลบโค้ดได้");
      await this.loadAdminVouchers();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.VoucherService = VoucherService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = VoucherService;
}
