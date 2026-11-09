/**
 * ==============================================================================
 * 🛡️ SECURITY SENTINEL & AUDIT TRAIL SERVICE
 * ==============================================================================
 * Monitors Real-time Access Logs, Visitor Analytics, and IP Blacklisting
 * ==============================================================================
 */

class SecuritySentinelService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
  }

  getCountryEmoji(countryCode) {
    if (!countryCode || countryCode === 'XX' || countryCode === 'Unknown') return '🌐';
    const code = countryCode.toUpperCase();
    if (code.length !== 2) return '🌐';
    const offset = 127397;
    return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
  }

  // --- 1. ACCESS SENTINEL LOGS ---
  async loadAccessSentinelLogs() {
    const tbody = document.getElementById("access-sentinel-tbody");
    const countEl = document.getElementById("access-logs-count");
    if (!tbody) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=list&limit=50");
      const data = await res.json();

      if (!data.success || !Array.isArray(data.logs)) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
        return;
      }

      this.store.set("currentAccessLogs", data.logs);
      if (countEl) countEl.textContent = `${data.logs.length} รายการ`;

      if (data.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500">ยังไม่มีบันทึกเหตุการณ์ความปลอดภัย</td></tr>`;
        return;
      }

      const badgeStyles = {
        ADMIN_LOGIN_SUCCESS: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        ADMIN_LOGIN_FAILED: "bg-red-500/20 text-red-300 border-red-500/40",
        ADMIN_PIN_ATTEMPT: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        ADMIN_BLOCKED_ATTEMPT: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        BOT_SHIELD_VIOLATION: "bg-amber-500/20 text-amber-300 border-amber-500/40"
      };

      tbody.innerHTML = data.logs.map(log => {
        const bStyle = badgeStyles[log.event_type] || "bg-slate-800 text-slate-300 border-slate-700";
        const timeStr = new Date(log.created_at).toLocaleString("th-TH");
        const shortAgent = String(log.user_agent || "Unknown").slice(0, 45);

        return `
          <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="p-3">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${bStyle}">${log.event_type}</span>
            </td>
            <td class="p-3">
              <span class="text-[10px] ${log.severity === 'CRITICAL' ? 'text-red-400 font-bold' : log.severity === 'WARNING' ? 'text-amber-400' : 'text-slate-400'}">${log.severity || 'INFO'}</span>
            </td>
            <td class="p-3 font-bold text-white">${AdminUI.escapeHtml(log.ip_address || '127.0.0.1')}</td>
            <td class="p-3 text-[10px] text-slate-400 truncate max-w-xs" title="${AdminUI.escapeHtml(log.user_agent || '')}">${AdminUI.escapeHtml(shortAgent)}...</td>
            <td class="p-3 text-[10px] text-slate-500">${timeStr}</td>
            <td class="p-3 text-right">
              <button onclick="blacklistIpFromSentinel('${AdminUI.escapeJs(log.ip_address)}')" class="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer transition-all active:scale-95">
                🚫 บล็อก IP
              </button>
            </td>
          </tr>
        `;
      }).join("");

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400">Error: ${err.message}</td></tr>`;
    }
  }

  // --- 2. VISITOR LOGS ---
  async loadVisitorLogs(showToastFeedback = false) {
    const icon = document.getElementById("visitor-refresh-icon");
    if (icon) icon.classList.add("animate-spin");

    try {
      const res = await this.apiClient.rpc("admin_get_visitor_logs", { p_limit: 150 });

      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถดึงข้อมูลได้");

      const stats = res.data.stats || {};
      const statUnique = document.getElementById("stat-unique-visitors");
      const statTotal = document.getElementById("stat-total-visits");
      const statCountry = document.getElementById("stat-top-country");

      if (statUnique) statUnique.textContent = (stats.unique_24h || 0) + " คน";
      if (statTotal) statTotal.textContent = (stats.total_24h || 0) + " ครั้ง";

      const topC = stats.top_countries && stats.top_countries[0];
      if (statCountry) {
        statCountry.textContent = topC ? `${this.getCountryEmoji(topC.country)} ${topC.country} (${topC.count})` : "ยังไม่มีข้อมูล";
      }

      const logs = res.data.logs || [];
      this.store.set("currentVisitorLogs", logs);
      this.renderVisitorTable(logs);

      if (showToastFeedback) {
        AdminUI.showToast("อัปเดตข้อมูลผู้เข้าชมล่าสุดแล้ว", "success");
      }
    } catch (err) {
      console.error("[SecuritySentinelService] Visitor logs error:", err);
      if (showToastFeedback) alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      if (icon) icon.classList.remove("animate-spin");
    }
  }

  renderVisitorTable(logs) {
    const tbody = document.getElementById("visitor-logs-tbody");
    if (!tbody) return;

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-12 text-slate-500">
            <div class="flex flex-col items-center justify-center gap-2">
              <i data-lucide="inbox" class="w-8 h-8 text-slate-600"></i>
              <span>ยังไม่มีประวัติการเข้าชมในช่วงนี้</span>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const timeFormatted = new Date(l.created_at).toLocaleString('th-TH', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const flag = this.getCountryEmoji(l.country);
      const isMobile = l.device_type === 'mobile' || l.device_type === 'tablet';
      const deviceIcon = isMobile ? 'smartphone' : 'monitor';

      return `
        <tr class="hover:bg-slate-800/30 transition-colors">
          <td class="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
            ${timeFormatted}
          </td>
          <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700/60">${AdminUI.escapeHtml(l.ip_address)}</span>
              <button onclick="AdminUI.copyToClipboard('${AdminUI.escapeJs(l.ip_address)}')" title="คัดลอก IP" class="text-slate-500 hover:text-white transition-colors cursor-pointer">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              <span class="text-base">${flag}</span>
              <span class="font-bold text-slate-300">${AdminUI.escapeHtml(l.country || 'XX')}</span>
            </div>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <span class="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[11px]">
              ${AdminUI.escapeHtml(l.path || '/')}
            </span>
          </td>
          <td class="py-3 px-4 whitespace-nowrap text-slate-400">
            <div class="flex items-center gap-1.5">
              <i data-lucide="${deviceIcon}" class="w-3.5 h-3.5 text-slate-400"></i>
              <span class="capitalize text-xs">${AdminUI.escapeHtml(l.device_type || 'desktop')}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="blacklistIpFromSentinel('${AdminUI.escapeJs(l.ip_address)}')" class="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer transition-all">
              บล็อก IP
            </button>
          </td>
        </tr>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 3. BLACKLIST ENGINE ---
  async blacklistIpFromSentinel(ip) {
    if (!ip) return;
    if (!confirm(`คุณต้องการขึ้นบัญชีดำ (Blacklist) IP: ${ip} ทันทีใช่หรือไม่?`)) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=blacklist_ip", {
        method: "POST",
        body: JSON.stringify({ ip, reason: "Manual 1-Click Blacklist via Admin Sentinel" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed");

      AdminUI.showToast(data.message || "บล็อก IP สำเร็จ", "success");
      await this.loadAccessSentinelLogs();
      await this.loadBlacklistList();
    } catch (err) {
      alert("ไม่สามารถบล็อก IP ได้: " + err.message);
    }
  }

  async blacklistManualIp() {
    const input = document.getElementById("manual-blacklist-ip");
    const ip = String(input?.value || "").trim();
    if (!ip) {
      alert("กรุณากรอก IP Address ที่ต้องการบล็อก");
      return;
    }
    await this.blacklistIpFromSentinel(ip);
    if (input) input.value = "";
  }

  async loadBlacklistList() {
    const tbody = document.getElementById("active-blacklists-tbody");
    const countEl = document.getElementById("blacklist-items-count");
    if (!tbody) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=blacklists");
      const data = await res.json();

      if (!data.success || !Array.isArray(data.blacklists)) return;
      this.store.set("currentBlacklists", data.blacklists);
      if (countEl) countEl.textContent = `${data.blacklists.length} รายการ`;

      if (data.blacklists.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">ไม่มีรายการบัญชีดำในขณะนี้</td></tr>`;
        return;
      }

      tbody.innerHTML = data.blacklists.map(item => {
        const timeStr = new Date(item.created_at).toLocaleString("th-TH");
        const val = item.target_value || item.value;
        return `
          <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="p-3 uppercase text-[10px] font-bold text-slate-400">${item.target_type || item.type || 'IP'}</td>
            <td class="p-3 font-bold text-rose-400">${AdminUI.escapeHtml(val)}</td>
            <td class="p-3 text-slate-300 text-xs">${AdminUI.escapeHtml(item.reason || '-')}</td>
            <td class="p-3 text-slate-500 text-[10px]">${timeStr}</td>
            <td class="p-3 text-right">
              <button onclick="removeBlacklistFromSentinel('${AdminUI.escapeJs(val)}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer transition-all active:scale-95">
                ปลดแบน
              </button>
            </td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.warn("[SecuritySentinelService] Error loading blacklists:", err);
    }
  }

  async removeBlacklistFromSentinel(ip) {
    if (!ip) return;
    if (!confirm(`ต้องการปลดแบน IP: ${ip} ใช่หรือไม่?`)) return;

    try {
      const res = await this.apiClient.fetchApi("/api/admin-audit?action=remove_blacklist", {
        method: "POST",
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      AdminUI.showToast(data.message || "ปลดแบนสำเร็จ", "success");
      await this.loadBlacklistList();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // --- 4. VISITOR FILTER & QUICK BLACKLIST & AUTO REFRESH ---
  filterVisitorTable() {
    const query = (document.getElementById("visitor-search-input")?.value || "").toLowerCase().trim();
    const device = document.getElementById("visitor-filter-device")?.value || "all";
    const logs = this.store.get("currentVisitorLogs") || [];

    const filtered = logs.filter(l => {
      const matchQuery = !query || 
        (l.ip_address && l.ip_address.toLowerCase().includes(query)) ||
        (l.path && l.path.toLowerCase().includes(query)) ||
        (l.country && l.country.toLowerCase().includes(query));

      const matchDevice = device === "all" || 
        (device === "mobile" && (l.device_type === "mobile" || l.device_type === "tablet")) ||
        (device === "desktop" && l.device_type === "desktop");

      return matchQuery && matchDevice;
    });

    this.renderVisitorTable(filtered);
  }

  async handleQuickBlacklistIp(ip) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการแบน IP: ${ip} จากการเข้าใช้งานร้านค้า?`)) return;

    try {
      const res = await this.apiClient.rpc("admin_blacklist_ip", {
        p_ip: ip,
        p_reason: "แบนโดยแอดมินผ่านหน้ารายการ IP ผู้เข้าชม"
      });

      if (res.error) throw res.error;
      if (!res.data || !res.data.success) throw new Error(res.data?.message || "ไม่สามารถแบน IP ได้");

      alert(`✅ แบน IP ${ip} เข้าสู่บัญชีดำเรียบร้อยแล้ว!`);
      await this.loadVisitorLogs();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการแบน IP: " + err.message);
    }
  }

  toggleVisitorAutoRefresh() {
    const isChecked = document.getElementById("visitor-auto-refresh")?.checked;
    if (this.visitorAutoRefreshTimer) {
      clearInterval(this.visitorAutoRefreshTimer);
      this.visitorAutoRefreshTimer = null;
    }
    if (isChecked) {
      this.visitorAutoRefreshTimer = setInterval(() => {
        const btn = document.getElementById("nav-btn-visitors");
        if (btn && btn.classList.contains("active")) {
          this.loadVisitorLogs(false);
        }
      }, 15000);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.SecuritySentinelService = SecuritySentinelService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SecuritySentinelService;
}
