const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'admin.html');
let content = fs.readFileSync(adminPath, 'utf8');

// Normalize line endings to \n for consistent processing
const isCrlf = content.includes('\r\n');
if (isCrlf) {
  content = content.replace(/\r\n/g, '\n');
}

// 1. Add Nav Button
const navTarget = `<button onclick="switchAdminTab('analytics')" id="nav-btn-analytics" class="nav-item active w-full text-left">
                <i data-lucide="bar-chart-3" class="w-4 h-4 text-cyan-400"></i>
                <span>สถิติ & ภาพรวมธุรกิจ</span>
              </button>`;

const navReplacement = `<button onclick="switchAdminTab('analytics')" id="nav-btn-analytics" class="nav-item active w-full text-left">
                <i data-lucide="bar-chart-3" class="w-4 h-4 text-cyan-400"></i>
                <span>สถิติ & ภาพรวมธุรกิจ</span>
              </button>
              <button onclick="switchAdminTab('visitors')" id="nav-btn-visitors" class="nav-item w-full text-left">
                <i data-lucide="globe" class="w-4 h-4 text-sky-400"></i>
                <span>ผู้เข้าชม & บันทึก IP (Live)</span>
              </button>`;

if (!content.includes('id="nav-btn-visitors"')) {
  if (content.includes(navTarget)) {
    content = content.replace(navTarget, navReplacement);
    console.log('✅ [NAV] Added visitors nav button');
  } else {
    console.warn('⚠️ [NAV] navTarget not found');
  }
}

// 2. Add tab-pane-visitors
const paneVisitorsHtml = `
        <!-- ==============================================================================
             PANE: VISITOR TRAFFIC & IP TRACKER (LIVE)
             ============================================================================== -->
        <div id="tab-pane-visitors" class="hidden space-y-6">

          <!-- KPI Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div class="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div class="flex items-center justify-between text-slate-400 mb-1">
                <span class="text-xs font-medium">ผู้เข้าชมไม่ซ้ำ (24 ชม.)</span>
                <i data-lucide="users" class="w-4 h-4 text-cyan-400"></i>
              </div>
              <div id="stat-unique-visitors" class="text-xl font-heading font-extrabold text-white">0 คน</div>
            </div>

            <div class="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div class="flex items-center justify-between text-slate-400 mb-1">
                <span class="text-xs font-medium">เปิดดูทั้งหมด (24 ชม.)</span>
                <i data-lucide="eye" class="w-4 h-4 text-emerald-400"></i>
              </div>
              <div id="stat-total-visits" class="text-xl font-heading font-extrabold text-emerald-400">0 ครั้ง</div>
            </div>

            <div class="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div class="flex items-center justify-between text-slate-400 mb-1">
                <span class="text-xs font-medium">ประเทศเข้าชมหลัก</span>
                <i data-lucide="globe" class="w-4 h-4 text-indigo-400"></i>
              </div>
              <div id="stat-top-country" class="text-xl font-heading font-extrabold text-indigo-300">-</div>
            </div>

            <div class="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div class="flex items-center justify-between text-slate-400 mb-1">
                <span class="text-xs font-medium">ระบบตรวจจับ Edge</span>
                <i data-lucide="shield-check" class="w-4 h-4 text-amber-400"></i>
              </div>
              <div class="text-sm font-heading font-bold text-amber-300 mt-1 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Cloudflare CF-IP</span>
              </div>
            </div>
          </div>

          <!-- Controls Toolbar -->
          <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div class="relative flex-1 min-w-[220px]">
                <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input type="text" id="visitor-search-input" oninput="filterVisitorTable()" placeholder="ค้นหา IP, หน้าเว็บ, ประเทศ..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono" />
              </div>
              <select id="visitor-filter-device" onchange="filterVisitorTable()" class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-400">
                <option value="all">ทุกอุปกรณ์ (All Devices)</option>
                <option value="desktop">💻 Desktop</option>
                <option value="mobile">📱 Mobile / Tablet</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 cursor-pointer select-none">
                <input type="checkbox" id="visitor-auto-refresh" checked onchange="toggleVisitorAutoRefresh()" class="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0" />
                <span>รีเฟรชสด (Auto 15s)</span>
              </label>
              <button onclick="loadVisitorLogs(true)" class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer">
                <i data-lucide="refresh-cw" id="visitor-refresh-icon" class="w-3.5 h-3.5"></i>
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>
          </div>

          <!-- Visitors Table -->
          <div class="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono">
                    <th class="py-3 px-4">วัน-เวลา (TIMESTAMP)</th>
                    <th class="py-3 px-4">IP ADDRESS</th>
                    <th class="py-3 px-4">ประเทศ (COUNTRY)</th>
                    <th class="py-3 px-4">หน้าเว็บที่เข้า (PATH)</th>
                    <th class="py-3 px-4">อุปกรณ์ (DEVICE)</th>
                    <th class="py-3 px-4 text-center">จัดการ (ACTION)</th>
                  </tr>
                </thead>
                <tbody id="visitor-logs-tbody" class="divide-y divide-slate-800/60 font-sans">
                  <tr>
                    <td colspan="6" class="text-center py-10 text-slate-500">
                      กำลังโหลดข้อมูลผู้เข้าชม...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>\n`;

const paneTarget = '<div id="tab-pane-products" class="hidden space-y-6">';
if (!content.includes('id="tab-pane-visitors"')) {
  if (content.includes(paneTarget)) {
    content = content.replace(paneTarget, paneVisitorsHtml + '\n        ' + paneTarget);
    console.log('✅ [PANE] Added tab-pane-visitors');
  } else {
    console.warn('⚠️ [PANE] tab-pane-products not found');
  }
}

// 3. Update TAB_METADATA
const metaTarget = `analytics: {
        title: "📊 สถิติ & ภาพรวมธุรกิจ (Analytics)",
        desc: "สรุปยอดขาย คำสั่งซื้อ สต็อก และแนวโน้ม 24 ชม."
      },`;

const metaReplacement = `analytics: {
        title: "📊 สถิติ & ภาพรวมธุรกิจ (Analytics)",
        desc: "สรุปยอดขาย คำสั่งซื้อ สต็อก และแนวโน้ม 24 ชม."
      },
      visitors: {
        title: "🌐 ผู้เข้าชม & บันทึก IP (Visitor Logs & Telemetry)",
        desc: "ตรวจสอบ IP จริง ประเทศ อุปกรณ์ และสถิติการเข้าชมเว็บ nyxning.shop แบบเรียลไทม์"
      },`;

if (!content.includes('visitors: {')) {
  if (content.includes(metaTarget)) {
    content = content.replace(metaTarget, metaReplacement);
    console.log('✅ [METADATA] Added visitors metadata');
  } else {
    console.warn('⚠️ [METADATA] metaTarget not found');
  }
}

// 4. Update switchAdminTab
const tabsTarget = 'const tabs = ["analytics", "products", "vault", "users", "orders", "topups", "claims", "discord"];';
const tabsReplacement = 'const tabs = ["analytics", "visitors", "products", "vault", "users", "orders", "topups", "claims", "discord"];';

if (content.includes(tabsTarget)) {
  content = content.replace(tabsTarget, tabsReplacement);
  console.log('✅ [TABS] Updated tabs array in switchAdminTab');
}

const tabHookTarget = `// If switching to vault tab, trigger initial load
      if (tabKey === "vault") {
        onVaultProductSelectChange();
      }`;

const tabHookReplacement = `// If switching to visitors tab, trigger initial load
      if (tabKey === "visitors") {
        loadVisitorLogs();
      }

      // If switching to vault tab, trigger initial load
      if (tabKey === "vault") {
        onVaultProductSelectChange();
      }`;

if (!content.includes('if (tabKey === "visitors") {')) {
  if (content.includes(tabHookTarget)) {
    content = content.replace(tabHookTarget, tabHookReplacement);
    console.log('✅ [HOOK] Added visitors tab hook');
  }
}

// 5. Append Visitor Functions before ending script tag
const visitorFunctions = `
    // ==============================================================================
    // 13. VISITOR LOGS & IP TRACKER CONTROLLER
    // ==============================================================================
    let currentVisitorLogs = [];
    let visitorAutoRefreshTimer = null;

    function getCountryEmoji(countryCode) {
      if (!countryCode || countryCode === 'XX' || countryCode === 'Unknown') return '🌐';
      const code = countryCode.toUpperCase();
      if (code.length !== 2) return '🌐';
      const offset = 127397;
      return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
    }

    async function loadVisitorLogs(showToast = false) {
      const icon = document.getElementById("visitor-refresh-icon");
      if (icon) icon.classList.add("animate-spin");

      try {
        const client = initSupabase();
        if (!client) throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");

        const { data, error } = await client.rpc("admin_get_visitor_logs", {
          p_admin_secret: currentAdminSecret,
          p_limit: 150
        });

        if (error) throw error;
        if (!data || !data.success) throw new Error(data?.message || "ไม่สามารถดึงข้อมูลได้");

        const stats = data.stats || {};
        const statUnique = document.getElementById("stat-unique-visitors");
        const statTotal = document.getElementById("stat-total-visits");
        const statCountry = document.getElementById("stat-top-country");

        if (statUnique) statUnique.textContent = (stats.unique_24h || 0) + " คน";
        if (statTotal) statTotal.textContent = (stats.total_24h || 0) + " ครั้ง";

        const topC = stats.top_countries && stats.top_countries[0];
        if (statCountry) {
          statCountry.textContent = topC ? \`\${getCountryEmoji(topC.country)} \${topC.country} (\${topC.count})\` : "ยังไม่มีข้อมูล";
        }

        currentVisitorLogs = data.logs || [];
        renderVisitorTable(currentVisitorLogs);

        if (showToast && typeof showToastSuccess === 'function') {
          showToastSuccess("อัปเดตข้อมูลผู้เข้าชมล่าสุดแล้ว");
        }
      } catch (err) {
        console.error("[VISITOR LOGS] Error:", err);
        if (showToast) alert("เกิดข้อผิดพลาด: " + err.message);
      } finally {
        if (icon) icon.classList.remove("animate-spin");
      }
    }

    function renderVisitorTable(logs) {
      const tbody = document.getElementById("visitor-logs-tbody");
      if (!tbody) return;

      if (!logs || logs.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="6" class="text-center py-12 text-slate-500">
              <div class="flex flex-col items-center justify-center gap-2">
                <i data-lucide="inbox" class="w-8 h-8 text-slate-600"></i>
                <span>ยังไม่มีประวัติการเข้าชมในช่วงนี้</span>
              </div>
            </td>
          </tr>
        \`;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      tbody.innerHTML = logs.map(l => {
        const timeFormatted = new Date(l.created_at).toLocaleString('th-TH', {
          day: '2-digit', month: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const flag = getCountryEmoji(l.country);
        const isMobile = l.device_type === 'mobile' || l.device_type === 'tablet';
        const deviceIcon = isMobile ? 'smartphone' : 'monitor';
        const isBanned = l.is_blacklisted;

        return \`
          <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
              \${timeFormatted}
            </td>
            <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700/60">\${escapeHtml(l.ip_address)}</span>
                <button onclick="navigator.clipboard.writeText('\${escapeHtml(l.ip_address)}'); alert('คัดลอก IP แล้ว: \${escapeHtml(l.ip_address)}')" title="คัดลอก IP" class="text-slate-500 hover:text-white transition-colors cursor-pointer">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
            <td class="py-3 px-4 whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <span class="text-base">\${flag}</span>
                <span class="font-bold text-slate-300">\${escapeHtml(l.country || 'XX')}</span>
              </div>
            </td>
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[11px]">
                \${escapeHtml(l.path || '/')}
              </span>
            </td>
            <td class="py-3 px-4 whitespace-nowrap text-slate-400">
              <div class="flex items-center gap-1.5">
                <i data-lucide="\${deviceIcon}" class="w-3.5 h-3.5 text-slate-400"></i>
                <span class="capitalize">\${escapeHtml(l.device_type || 'desktop')}</span>
              </div>
            </td>
            <td class="py-3 px-4 text-center whitespace-nowrap">
              \${isBanned 
                ? \`<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                     <i data-lucide="ban" class="w-3 h-3"></i> แบนแล้ว
                   </span>\`
                : \`<button onclick="handleQuickBlacklistIp('\${escapeHtml(l.ip_address)}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold transition-all cursor-pointer">
                     <i data-lucide="shield-alert" class="w-3 h-3"></i> แบน IP
                   </button>\`
              }
            </td>
          </tr>
        \`;
      }).join('');

      if (window.lucide) window.lucide.createIcons();
    }

    function filterVisitorTable() {
      const query = (document.getElementById("visitor-search-input")?.value || "").toLowerCase().trim();
      const device = document.getElementById("visitor-filter-device")?.value || "all";

      const filtered = currentVisitorLogs.filter(l => {
        const matchQuery = !query || 
          (l.ip_address && l.ip_address.toLowerCase().includes(query)) ||
          (l.path && l.path.toLowerCase().includes(query)) ||
          (l.country && l.country.toLowerCase().includes(query));

        const matchDevice = device === "all" || 
          (device === "mobile" && (l.device_type === "mobile" || l.device_type === "tablet")) ||
          (device === "desktop" && l.device_type === "desktop");

        return matchQuery && matchDevice;
      });

      renderVisitorTable(filtered);
    }

    async function handleQuickBlacklistIp(ip) {
      if (!confirm(\`คุณแน่ใจหรือไม่ว่าต้องการแบน IP: \${ip} จากการเข้าใช้งานร้านค้า?\`)) return;

      try {
        const client = initSupabase();
        const { data, error } = await client.rpc("admin_blacklist_ip", {
          p_admin_secret: currentAdminSecret,
          p_ip: ip,
          p_reason: "แบนโดยแอดมินผ่านหน้ารายการ IP ผู้เข้าชม"
        });

        if (error) throw error;
        if (!data || !data.success) throw new Error(data?.message || "ไม่สามารถแบน IP ได้");

        alert(\`✅ แบน IP \${ip} เข้าสู่บัญชีดำเรียบร้อยแล้ว!\`);
        loadVisitorLogs();
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการแบน IP: " + err.message);
      }
    }

    function toggleVisitorAutoRefresh() {
      const isChecked = document.getElementById("visitor-auto-refresh")?.checked;
      if (visitorAutoRefreshTimer) {
        clearInterval(visitorAutoRefreshTimer);
        visitorAutoRefreshTimer = null;
      }
      if (isChecked) {
        visitorAutoRefreshTimer = setInterval(() => {
          const btn = document.getElementById("nav-btn-visitors");
          if (btn && btn.classList.contains("active")) {
            loadVisitorLogs(false);
          }
        }, 15000);
      }
    }

    // Start auto-refresh polling by default
    toggleVisitorAutoRefresh();
`;

if (!content.includes('function loadVisitorLogs(')) {
  const scriptEnd = '</script>\n</body>';
  const altScriptEnd = '</script>\r\n</body>';
  if (content.includes(scriptEnd)) {
    content = content.replace(scriptEnd, visitorFunctions + '\n  ' + scriptEnd);
    console.log('✅ [FUNCTIONS] Appended visitor functions');
  } else if (content.includes('</script>')) {
    const lastScriptIdx = content.lastIndexOf('</script>');
    content = content.slice(0, lastScriptIdx) + visitorFunctions + '\n  ' + content.slice(lastScriptIdx);
    console.log('✅ [FUNCTIONS] Inserted before last </script>');
  }
}

fs.writeFileSync(adminPath, content, 'utf8');
console.log('✨ [COMPLETE] admin.html updated successfully!');
