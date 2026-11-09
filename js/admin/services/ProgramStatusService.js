/**
 * ==============================================================================
 * 🛡️ PROGRAM STATUS HUB SERVICE (EXECUTORS & SCRIPT RADAR)
 * ==============================================================================
 * Tracks Script & Executor Online/Updating/Detected Status
 * ==============================================================================
 */

class ProgramStatusService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  async loadAdminProgramStatuses() {
    const container = document.getElementById("admin-program-status-list");
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs"><i data-lucide="loader-2" class="w-4 h-4 animate-spin mx-auto mb-2 text-cyan-400"></i>กำลังโหลดรายการสถานะโปรแกรม...</div>';
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await this.apiClient.fetchApi("/api/program-statuses?all=true");
      const data = await res.json();

      if (!data || !data.success) {
        container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">${data?.message || 'ไม่สามารถโหลดสถานะโปรแกรมได้'}</div>`;
        return;
      }

      const statuses = data.statuses || [];
      this.store.set("currentProgramStatuses", statuses);

      if (statuses.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-amber-400/80 text-xs">ยังไม่มีรายการโปรแกรมในระบบ กดปุ่ม "เพิ่มโปรแกรม" เพื่อเริ่มเพิ่ม</div>';
        return;
      }

      const statusBadges = {
        online: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE</span>',
        updating: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> UPDATING</span>',
        maintenance: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> MAINTENANCE</span>',
        detected: '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 font-bold text-[11px]"><span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span> DETECTED</span>'
      };

      container.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th class="py-2.5 px-3">ชื่อโปรแกรม / สคริปต์</th>
                <th class="py-2.5 px-3">เวอร์ชัน</th>
                <th class="py-2.5 px-3">สถานะปัจจุบัน</th>
                <th class="py-2.5 px-3">ปรับเปลี่ยนสถานะ</th>
                <th class="py-2.5 px-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${statuses.map(p => `
                <tr class="hover:bg-slate-900/40 transition-colors">
                  <td class="py-3 px-3">
                    <div class="font-bold text-white">${AdminUI.escapeHtml(p.name)}</div>
                    <div class="text-[10px] text-slate-500 font-mono">slug: ${AdminUI.escapeHtml(p.slug || '-')}</div>
                  </td>
                  <td class="py-3 px-3 font-mono text-cyan-300">
                    ${AdminUI.escapeHtml(p.version || 'v1.0')}
                  </td>
                  <td class="py-3 px-3">
                    ${statusBadges[p.status] || p.status}
                  </td>
                  <td class="py-3 px-3">
                    <select onchange="handleUpdateProgramStatus(${p.id}, this.value)" class="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[var(--accent)] font-semibold cursor-pointer">
                      <option value="online" ${p.status === 'online' ? 'selected' : ''}>🟢 Online</option>
                      <option value="updating" ${p.status === 'updating' ? 'selected' : ''}>🟡 Updating</option>
                      <option value="maintenance" ${p.status === 'maintenance' ? 'selected' : ''}>🟠 Maintenance</option>
                      <option value="detected" ${p.status === 'detected' ? 'selected' : ''}>🔴 Detected</option>
                    </select>
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button onclick="handleDeleteProgramStatus(${p.id})" class="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 cursor-pointer transition-colors" title="ลบรายการ">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">เกิดข้อผิดพลาด: ${err.message}</div>`;
    } finally {
      if (window.lucide) window.lucide.createIcons();
    }
  }

  openAddProgramStatusModal() {
    const modal = document.getElementById("modal-program-status");
    if (modal) {
      document.getElementById("status-input-name").value = "";
      document.getElementById("status-input-version").value = "";
      document.getElementById("status-input-download").value = "";
      document.getElementById("status-input-status").value = "online";
      modal.classList.remove("hidden");
      document.getElementById("status-input-name")?.focus();
    }
  }

  closeProgramStatusModal() {
    const modal = document.getElementById("modal-program-status");
    if (modal) modal.classList.add("hidden");
  }

  async handleSaveProgramStatus() {
    const name = document.getElementById("status-input-name")?.value.trim();
    const status = document.getElementById("status-input-status")?.value;
    const version = document.getElementById("status-input-version")?.value.trim();
    const download_url = document.getElementById("status-input-download")?.value.trim();
    const btn = document.getElementById("btn-save-program-status");

    if (!name) {
      alert("กรุณาระบุชื่อโปรแกรม");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> บันทึก...';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await this.apiClient.fetchApi("/api/program-statuses", {
        method: "POST",
        body: JSON.stringify({ name, status, version, download_url })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast(`เพิ่มโปรแกรม "${name}" สำเร็จ`, "success");
        this.closeProgramStatusModal();
        await this.loadAdminProgramStatuses();
      } else {
        alert("ไม่สามารถบันทึกได้: " + (data.message || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      alert("ข้อผิดพลาด: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "บันทึก";
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleUpdateProgramStatus(id, newStatus) {
    try {
      const res = await this.apiClient.fetchApi("/api/program-statuses", {
        method: "PUT",
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast(`อัปเดตสถานะเป็น ${newStatus.toUpperCase()} สำเร็จ`, "success");
        await this.loadAdminProgramStatuses();
      } else {
        alert("ไม่สามารถอัปเดตสถานะได้: " + (data.message || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      alert("ข้อผิดพลาด: " + err.message);
    }
  }

  async handleDeleteProgramStatus(id) {
    if (!confirm("⚠️ ยืนยันการลบรายการสถานะโปรแกรมนี้ออกจากระบบ?")) return;
    try {
      const res = await this.apiClient.fetchApi(`/api/program-statuses?id=${id}&hard=true`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast("ลบรายการโปรแกรมเรียบร้อย", "success");
        await this.loadAdminProgramStatuses();
      } else {
        alert("ไม่สามารถลบได้: " + (data.message || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      alert("ข้อผิดพลาด: " + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.ProgramStatusService = ProgramStatusService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ProgramStatusService;
}
