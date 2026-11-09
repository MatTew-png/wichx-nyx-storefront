/**
 * ==============================================================================
 * 💳 ORDER, FINANCE, CLAIMS & REVIEWS SERVICE
 * ==============================================================================
 * Handles Customer Orders, Topups, Warranty Claims, and Product Reviews
 * ==============================================================================
 */

class OrderFinanceService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  // --- 1. ORDERS TABLE ---
  renderOrdersTable(recentOrders) {
    const ordersTable = document.getElementById("orders-table-body");
    if (!ordersTable) return;
    ordersTable.innerHTML = "";

    if (!recentOrders || recentOrders.length === 0) {
      ordersTable.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">ยังไม่มีคำสั่งซื้อในระบบ</td></tr>`;
      return;
    }

    recentOrders.forEach(ord => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono font-bold text-[var(--accent)]">${AdminUI.escapeHtml(ord.id)}</td>
        <td class="py-2.5 px-3 font-mono text-slate-300 text-xs">${AdminUI.escapeHtml(ord.discord_id || ord.user_id || 'Guest')}</td>
        <td class="py-2.5 px-3 font-mono text-emerald-300 font-bold">฿${parseFloat(ord.total_amount || 0).toFixed(2)}</td>
        <td class="py-2.5 px-3 capitalize text-slate-300">${AdminUI.escapeHtml(ord.payment_method || 'wallet')}</td>
        <td class="py-2.5 px-3 text-slate-400">${new Date(ord.created_at).toLocaleString("th-TH")}</td>
        <td class="py-2.5 px-3 text-right">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ${AdminUI.escapeHtml(ord.status || 'PAID')}
          </span>
        </td>
      `;
      ordersTable.appendChild(tr);
    });
  }

  // --- 2. TOPUPS TABLE ---
  renderTopupsTable(recentTopups) {
    const topupsTable = document.getElementById("topups-table-body");
    if (!topupsTable) return;
    topupsTable.innerHTML = "";

    if (!recentTopups || recentTopups.length === 0) {
      topupsTable.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">ยังไม่มีประวัติเติมเงิน</td></tr>`;
      return;
    }

    recentTopups.forEach(top => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
          <span>${top.gateway === 'truemoney' ? '🧧 TrueMoney' : '💸 PromptPay'}</span>
        </td>
        <td class="py-2.5 px-3 font-mono text-emerald-300 font-bold">฿${parseFloat(top.amount || 0).toFixed(2)}</td>
        <td class="py-2.5 px-3 font-mono text-slate-400 text-[11px]">${AdminUI.escapeHtml(top.trans_ref || 'N/A')}</td>
        <td class="py-2.5 px-3 text-slate-400">${new Date(top.created_at).toLocaleString("th-TH")}</td>
        <td class="py-2.5 px-3 text-right">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ${AdminUI.escapeHtml(top.status || 'COMPLETED')}
          </span>
        </td>
      `;
      topupsTable.appendChild(tr);
    });
  }

  // --- 3. CLAIMS TABLE ---
  renderClaimsTable(warrantyClaims) {
    const claimsTable = document.getElementById("claims-table-body");
    const claimsBadge = document.getElementById("badge-pending-claims");
    if (!claimsTable) return;

    claimsTable.innerHTML = "";
    const pendingCount = (warrantyClaims || []).filter(c => c.status === 'PENDING').length;

    if (claimsBadge) {
      if (pendingCount > 0) {
        claimsBadge.textContent = pendingCount;
        claimsBadge.classList.remove("hidden");
      } else {
        claimsBadge.classList.add("hidden");
      }
    }

    if (!warrantyClaims || warrantyClaims.length === 0) {
      claimsTable.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">ไม่มีประวัติคำร้องเคลมสินค้า</td></tr>`;
      return;
    }

    warrantyClaims.forEach(clm => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono text-cyan-300">${AdminUI.escapeHtml(clm.order_id || 'N/A')}</td>
        <td class="py-2.5 px-3 text-slate-300">${AdminUI.escapeHtml(clm.reason || 'ไม่ได้ระบุ')}</td>
        <td class="py-2.5 px-3 text-slate-400">${new Date(clm.created_at).toLocaleString("th-TH")}</td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${clm.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400'}">
            ${AdminUI.escapeHtml(clm.status || 'RESOLVED')}
          </span>
        </td>
        <td class="py-2.5 px-3 text-right">
          ${clm.status === 'PENDING' ? `
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="resolveClaim('${clm.id}', 'APPROVED')" class="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold cursor-pointer">อนุมัติ</button>
              <button onclick="resolveClaim('${clm.id}', 'REJECTED')" class="px-2 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 text-[11px] cursor-pointer">ปฏิเสธ</button>
            </div>
          ` : `<span class="text-slate-500 text-[11px]">ดำเนินการแล้ว</span>`}
        </td>
      `;
      claimsTable.appendChild(tr);
    });
  }

  async resolveClaim(claimId, status, refreshCallback) {
    if (!confirm(`ยืนยันการเปลี่ยนสถานะการเคลมเป็น "${status}"?`)) return;
    try {
      const res = await this.apiClient.rpc("admin_resolve_claim", {
        p_claim_id: claimId,
        p_status: status,
        p_admin_notes: "ดำเนินการโดยแอดมินผ่าน Operations Suite"
      });

      if (res.data && res.data.success) {
        AdminUI.showToast(`บันทึกสถานะการเคลมเป็น ${status} เรียบร้อย`, "success");
        if (typeof refreshCallback === "function") await refreshCallback();
      } else {
        throw new Error(res.data?.message || res.error?.message || "เปลี่ยนสถานะไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  }

  // --- 4. REVIEWS MANAGEMENT ---
  async loadReviewsTable() {
    const tbody = document.getElementById("reviews-table-body");
    const countBadge = document.getElementById("badge-reviews-count");
    if (!tbody) return;

    const supabase = this.apiClient.initSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const reviews = data || [];
      if (countBadge) countBadge.textContent = reviews.length;

      if (reviews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">ยังไม่มีรีวิวจากลูกค้า</td></tr>`;
        return;
      }

      const products = this.store.get("currentProductsList") || [];

      tbody.innerHTML = reviews.map(r => {
        const prod = products.find(p => p.id === r.product_id);
        const prodTitle = prod ? prod.title : r.product_id;
        const stars = '★'.repeat(r.rating || 5);
        const empty = '☆'.repeat(Math.max(0, 5 - (r.rating || 5)));

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
            <td class="p-3.5">
              <div class="flex items-center gap-2.5">
                <img src="${r.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + r.author_name}" class="w-7 h-7 rounded-lg object-cover bg-slate-900 border border-slate-700" />
                <div>
                  <span class="font-bold text-white">${AdminUI.escapeHtml(r.author_name)}</span>
                  <div class="text-[10px] font-mono text-slate-500">#${AdminUI.escapeHtml(r.order_id)}</div>
                </div>
              </div>
            </td>
            <td class="p-3.5 font-mono text-amber-400 font-bold tracking-wider">
              ${stars}<span class="text-slate-600">${empty}</span> <span class="text-[10px] text-slate-400">(${r.rating}/5)</span>
            </td>
            <td class="p-3.5 text-slate-300 font-medium">
              <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">${AdminUI.escapeHtml(prodTitle)}</span>
            </td>
            <td class="p-3.5 text-slate-300 max-w-xs truncate" title="${AdminUI.escapeHtml(r.comment || '')}">
              "${AdminUI.escapeHtml(r.comment || 'ไม่มีข้อความ')}"
            </td>
            <td class="p-3.5">
              ${r.is_visible 
                ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">แสดงบนเว็บ</span>' 
                : '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">ซ่อนไว้</span>'}
            </td>
            <td class="p-3.5 text-right space-x-2">
              <button onclick="toggleReviewVisibility('${r.id}', ${r.is_visible})" class="px-2.5 py-1 rounded-lg text-[11px] font-mono ${r.is_visible ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'} cursor-pointer">
                ${r.is_visible ? 'ซ่อน' : 'แสดง'}
              </button>
              <button onclick="deleteReview('${r.id}')" class="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 cursor-pointer">
                ลบ
              </button>
            </td>
          </tr>
        `;
      }).join("");

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Error loading reviews:", err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-rose-400">โหลดข้อมูลรีวิวล้มเหลว: ${err.message}</td></tr>`;
    }
  }

  async toggleReviewVisibility(id, currentStatus) {
    const supabase = this.apiClient.initSupabase();
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_visible: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      AdminUI.showToast('อัปเดตสถานะการแสดงผลรีวิวเรียบร้อยแล้ว', 'success');
      await this.loadReviewsTable();
    } catch (e) {
      AdminUI.showToast(e.message, 'error');
    }
  }

  async deleteReview(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?')) return;
    const supabase = this.apiClient.initSupabase();
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);
      if (error) throw error;
      AdminUI.showToast('ลบรีวิวเรียบร้อยแล้ว', 'success');
      await this.loadReviewsTable();
    } catch (e) {
      AdminUI.showToast(e.message, 'error');
    }
  }

  // --- 5. MERCHANT HEALTH DIAGNOSTICS ---
  async runLiveApiHealthCheck() {
    const btn = document.getElementById("btn-run-health-check");
    const container = document.getElementById("live-api-health-results");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> <span>กำลังตรวจเช็ก...</span>';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await fetch("/api/merchant-health");
      const data = await res.json();
      if (container && data && data.services) {
        const s = data.services;
        container.innerHTML = `
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">Database:</span> <span class="${s.database?.status === 'OK' ? 'text-emerald-400 font-bold' : 'text-rose-400'}">${s.database?.status === 'OK' ? 'PostgreSQL Live (' + s.database.productCount + ' prods)' : 'Error'}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">Slip Verify:</span> <span class="${s.slipVerify?.status === 'LIVE_CONFIGURED' ? 'text-cyan-400 font-bold' : 'text-amber-400'}">${s.slipVerify?.status || 'Active'}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">TrueMoney:</span> <span class="text-amber-400 font-bold">${s.trueMoney?.phoneMasked || '083****508'}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
            <span class="text-slate-400">Crypto Vault:</span> <span class="text-purple-400 font-bold">${s.cryptoVault?.algorithm || 'AES-256-GCM'}</span>
          </div>
        `;
        AdminUI.showToast('ตรวจสอบสถานะ Live APIs สำเร็จ 100%', 'success');
      }
    } catch (e) {
      AdminUI.showToast('การตรวจสอบล้มเหลว: ' + e.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="play" class="w-3 h-3"></i> <span>ตรวจเช็กความพร้อมระบบ</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.OrderFinanceService = OrderFinanceService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = OrderFinanceService;
}
