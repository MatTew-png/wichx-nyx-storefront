/**
 * ==============================================================================
 * 👤 USER MANAGEMENT & WALLET SERVICE
 * ==============================================================================
 * Handles Customer Accounts, Roles, Wallet Adjustments, and Blacklisting
 * ==============================================================================
 */

class UserService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  filterUsersTable() {
    const searchInput = document.getElementById("users-search-input");
    const roleSelect = document.getElementById("users-role-filter");
    const statusSelect = document.getElementById("users-status-filter");

    const search = (searchInput?.value || "").toLowerCase().trim();
    const roleFilter = roleSelect?.value || "";
    const statusFilter = statusSelect?.value || "";

    const list = this.store.get("currentUsersList") || [];

    const filtered = list.filter(u => {
      const matchSearch = !search ||
        (u.username && u.username.toLowerCase().includes(search)) ||
        (u.discord_id && u.discord_id.toLowerCase().includes(search)) ||
        (u.id && u.id.toLowerCase().includes(search));

      const matchRole = !roleFilter || u.role === roleFilter;

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = !u.is_blacklisted;
      else if (statusFilter === "blacklisted") matchStatus = u.is_blacklisted === true;

      return matchSearch && matchRole && matchStatus;
    });

    this.renderUsersRows(filtered);
  }

  renderUsersTable() {
    const list = this.store.get("currentUsersList") || [];
    const totalLiability = list.reduce((sum, u) => sum + parseFloat(u.balance || 0), 0);
    const liabEl = document.getElementById("users-total-balance-liability");
    if (liabEl) liabEl.textContent = `฿${totalLiability.toFixed(2)}`;
    this.filterUsersTable();
  }

  renderUsersRows(users) {
    const table = document.getElementById("users-table-body");
    const badge = document.getElementById("users-count-badge");
    if (!table) return;

    table.innerHTML = "";
    if (badge) badge.textContent = `${users.length} สมาชิก`;

    if (!users || users.length === 0) {
      table.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">ไม่พบสมาชิกที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
      return;
    }

    users.forEach(u => {
      const avatar = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`;
      const balance = parseFloat(u.balance || 0).toFixed(2);
      const spent = parseFloat(u.total_spent || 0).toFixed(2);
      const orderCount = u.order_count || 0;
      const isAdmin = u.role === "admin";

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-900/50 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-3">
          <div class="flex items-center gap-2.5">
            <img class="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-800" src="${avatar}" alt="Avatar" />
            <div class="min-w-0">
              <div class="font-bold text-white truncate max-w-[150px]">${AdminUI.escapeHtml(u.username || 'Discord Member')}</div>
              <div class="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">${u.id}</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-1.5 font-mono text-xs">
            <span class="text-slate-300">${u.discord_id || '-'}</span>
            ${u.discord_id ? `
              <button onclick="AdminUI.copyToClipboard('${u.discord_id}')" class="text-slate-500 hover:text-white p-0.5 cursor-pointer" title="คัดลอก Discord ID">
                <i data-lucide="copy" class="w-3 h-3"></i>
              </button>
            ` : ''}
          </div>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isAdmin ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
            ${isAdmin ? 'ADMIN' : 'CUSTOMER'}
          </span>
        </td>
        <td class="py-3 px-3">
          <span class="font-mono font-bold text-emerald-400 text-sm">฿${balance}</span>
        </td>
        <td class="py-3 px-3">
          <div class="font-mono text-xs text-white">${orderCount} ออเดอร์</div>
          <div class="text-[10px] text-slate-500">ยอดรวม: ฿${spent}</div>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.is_blacklisted ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}">
            ${u.is_blacklisted ? '🚫 แบล็กลิสต์' : '✓ ปกติ'}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openAdjustWalletModal('${u.id}', '${AdminUI.escapeHtml(u.username)}', '${u.discord_id}', ${u.balance || 0}, '${avatar}')" class="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer" title="ปรับยอดเงินในกระเป๋า">
              <i data-lucide="coins" class="w-3.5 h-3.5"></i>
              <span>ปรับเงิน</span>
            </button>
            <button onclick="handleToggleRole('${u.id}', '${AdminUI.escapeHtml(u.username)}', '${u.role}')" class="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 cursor-pointer" title="สลับบทบาท Admin <-> Customer">
              <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="handleToggleBlacklist('${u.id}', '${AdminUI.escapeHtml(u.username)}', ${u.is_blacklisted})" class="p-1.5 rounded-lg ${u.is_blacklisted ? 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400' : 'bg-red-500/10 hover:bg-red-500/25 text-red-400'} border border-current/30 cursor-pointer" title="${u.is_blacklisted ? 'ปลดแบน' : 'ระงับบัญชี (แบน)'}">
              <i data-lucide="${u.is_blacklisted ? 'unlock' : 'ban'}" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      `;
      table.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  openAdjustWalletModal(userId, username, discordId, currentBalance, avatarUrl) {
    const modal = document.getElementById("modal-adjust-wallet");
    if (!modal) return;

    document.getElementById("adjust-user-id").value = userId;
    document.getElementById("adjust-user-name").textContent = username || "Discord Member";
    document.getElementById("adjust-user-discord").textContent = `Discord ID: ${discordId || 'N/A'}`;
    const balEl = document.getElementById("adjust-user-current-balance");
    balEl.textContent = `฿${parseFloat(currentBalance || 0).toFixed(2)}`;
    balEl.dataset.balance = currentBalance || 0;
    document.getElementById("adjust-user-avatar").src = avatarUrl;
    document.getElementById("adjust-amount-input").value = "";
    document.getElementById("adjust-reason-input").value = "";
    document.getElementById("adjust-wallet-feedback")?.classList.add("hidden");

    this.updateBalancePreview();
    modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }

  closeAdjustWalletModal() {
    const modal = document.getElementById("modal-adjust-wallet");
    if (modal) modal.classList.add("hidden");
  }

  updateBalancePreview() {
    const currentBalance = parseFloat(document.getElementById("adjust-user-current-balance")?.dataset.balance || 0);
    const amountInput = parseFloat(document.getElementById("adjust-amount-input")?.value || 0);
    const isDeduct = document.querySelector('input[name="adjust_type"]:checked')?.value === "deduct";

    let newBalance = isDeduct ? currentBalance - amountInput : currentBalance + amountInput;
    if (newBalance < 0) newBalance = 0;

    const previewEl = document.getElementById("adjust-new-balance-preview");
    if (previewEl) {
      previewEl.textContent = `฿${newBalance.toFixed(2)}`;
      previewEl.className = isDeduct ? "font-mono font-bold text-amber-400" : "font-mono font-bold text-emerald-400";
    }
  }

  async handleAdjustWallet(e, refreshCallback) {
    if (e) e.preventDefault();
    const userId = document.getElementById("adjust-user-id").value;
    const amountInput = parseFloat(document.getElementById("adjust-amount-input").value || 0);
    const isDeduct = document.querySelector('input[name="adjust_type"]:checked')?.value === "deduct";
    const reason = document.getElementById("adjust-reason-input").value.trim();
    const feedback = document.getElementById("adjust-wallet-feedback");
    const btn = document.getElementById("btn-submit-adjust");

    if (amountInput <= 0) {
      alert("กรุณาระบุจำนวนเงินที่มากกว่า 0");
      return;
    }

    const finalAmount = isDeduct ? -amountInput : amountInput;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังบันทึก...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_user", {
        p_action: "adjust_balance",
        p_user_id: userId,
        p_data: { amount: finalAmount, reason: reason }
      });

      if (res.error || !res.data || !res.data.success) {
        throw new Error(res.data?.message || res.error?.message || "ไม่สามารถปรับยอดเงินได้");
      }

      this.closeAdjustWalletModal();
      AdminUI.showToast("ปรับยอดเงินเรียบร้อยแล้ว", "success");
      if (typeof refreshCallback === "function") await refreshCallback();
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ";
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> <span>ยืนยันปรับยอดเงิน</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleToggleRole(userId, username, currentRole, refreshCallback) {
    const newRole = currentRole === "admin" ? "customer" : "admin";
    if (!confirm(`ยืนยันการเปลี่ยนสิทธิ์ของ "${username}" เป็น "${newRole.toUpperCase()}"?`)) return;

    try {
      const res = await this.apiClient.rpc("admin_manage_user", {
        p_action: "update_role",
        p_user_id: userId,
        p_data: { role: newRole }
      });

      if (res.data && res.data.success) {
        AdminUI.showToast(`เปลี่ยนบทบาทเป็น ${newRole} สำเร็จ`, "success");
        if (typeof refreshCallback === "function") await refreshCallback();
      } else {
        alert("ไม่สามารถเปลี่ยนบทบาทได้: " + (res.data?.message || res.error?.message));
      }
    } catch (e) {
      alert("ข้อผิดพลาด: " + e.message);
    }
  }

  async handleToggleBlacklist(userId, username, isCurrentlyBlacklisted, refreshCallback) {
    const actionText = isCurrentlyBlacklisted ? "ปลดแบล็กลิสต์" : "ระงับบัญชี (ติดแบล็กลิสต์)";
    let reason = "";
    if (!isCurrentlyBlacklisted) {
      reason = prompt(`ระบุเหตุผลในการแบน "${username}":`, "ฝ่าฝืนข้อกำหนดหรือสลิปปลอม");
      if (!reason) return;
    } else {
      if (!confirm(`ยืนยันการ${actionText} "${username}"?`)) return;
    }

    try {
      const res = await this.apiClient.rpc("admin_manage_user", {
        p_action: "toggle_blacklist",
        p_user_id: userId,
        p_data: { reason: reason || "ระงับโดยผู้ดูแลระบบ" }
      });

      if (res.data && res.data.success) {
        AdminUI.showToast(`${actionText} สำเร็จ`, "success");
        if (typeof refreshCallback === "function") await refreshCallback();
      } else {
        alert("ไม่สามารถทำรายการได้: " + (res.data?.message || res.error?.message));
      }
    } catch (e) {
      alert("ข้อผิดพลาด: " + e.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.UserService = UserService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = UserService;
}
