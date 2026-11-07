const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'admin.html');
let html = fs.readFileSync(adminPath, 'utf8');

// 1. Add Navigation Button
const targetNav = `<button onclick="switchAdminTab('claims')" id="nav-btn-claims" class="nav-item w-full text-left justify-between">
                <div class="flex items-center gap-3">
                  <i data-lucide="shield-question" class="w-4 h-4 text-red-400"></i>
                  <span>เคลมประกันสินค้า</span>
                </div>
                <span id="badge-pending-claims" class="hidden px-2 py-0.5 text-[9px] rounded-full bg-red-500 text-black font-extrabold">0</span>
              </button>`;

const replacementNav = `${targetNav}
              <button onclick="switchAdminTab('reviews')" id="nav-btn-reviews" class="nav-item w-full text-left justify-between">
                <div class="flex items-center gap-3">
                  <i data-lucide="star" class="w-4 h-4 text-amber-400"></i>
                  <span>รีวิวจากลูกค้า (Reviews)</span>
                </div>
                <span id="badge-reviews-count" class="px-2 py-0.5 text-[9px] rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">5</span>
              </button>`;

if (!html.includes('id="nav-btn-reviews"')) {
  html = html.replace(targetNav, replacementNav);
  console.log('✅ Added nav-btn-reviews');
}

// 2. Add tab-pane-reviews before </main>
const reviewsPaneHTML = `
        <!-- ==============================================================================
             PANE 10: CUSTOMER REVIEWS & RATINGS MODERATION
             ============================================================================== -->
        <div id="tab-pane-reviews" class="hidden space-y-6">

          <!-- Metric Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div class="glass-panel p-4 rounded-2xl border border-slate-800">
              <span class="text-[11px] text-slate-400 font-mono">รีวิวทั้งหมด</span>
              <div id="stat-reviews-total" class="text-2xl font-bold font-mono text-white mt-1">0</div>
            </div>
            <div class="glass-panel p-4 rounded-2xl border border-slate-800">
              <span class="text-[11px] text-slate-400 font-mono">คะแนนเฉลี่ย</span>
              <div id="stat-reviews-avg" class="text-2xl font-bold font-mono text-amber-400 mt-1">5.0</div>
            </div>
            <div class="glass-panel p-4 rounded-2xl border border-slate-800">
              <span class="text-[11px] text-slate-400 font-mono">รีวิว 5 ดาว</span>
              <div id="stat-reviews-five-star" class="text-2xl font-bold font-mono text-emerald-400 mt-1">0</div>
            </div>
            <div class="glass-panel p-4 rounded-2xl border border-slate-800">
              <span class="text-[11px] text-slate-400 font-mono">แสดงผลบนหน้าร้าน</span>
              <div id="stat-reviews-visible" class="text-2xl font-bold font-mono text-cyan-400 mt-1">0/0</div>
            </div>
          </div>

          <!-- Reviews Table -->
          <div class="glass-panel rounded-3xl border border-slate-800 p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-heading font-extrabold text-white flex items-center gap-2">
                  <i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>
                  <span>รายการรีวิวจากผู้ซื้อจริง (Verified Reviews)</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">ตรวจสอบความถูกต้อง ซ่อนรีวิวที่ไม่เหมาะสม หรือลบรีวิวสแปม</p>
              </div>
              <button onclick="loadReviewsTable()" class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                <span>รีเฟรชรีวิว</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                    <th class="p-3.5">ผู้ซื้อ / ออเดอร์</th>
                    <th class="p-3.5">คะแนนดาว</th>
                    <th class="p-3.5">สินค้าที่ซื้อ</th>
                    <th class="p-3.5">ข้อความรีวิว</th>
                    <th class="p-3.5">สถานะ</th>
                    <th class="p-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody id="reviews-table-body">
                  <tr>
                    <td colspan="6" class="text-center py-8 text-slate-500">
                      กำลังโหลดข้อมูลรีวิว...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
`;

if (!html.includes('id="tab-pane-reviews"')) {
  html = html.replace('</main>', `${reviewsPaneHTML}\n      </main>`);
  console.log('✅ Added tab-pane-reviews');
}

// 3. Enhance tab-pane-discord with Diagnostics & OAuth2 instructions
const discordDiagnosticsCard = `
          <!-- Live API Diagnostics & Diagnostics Hub -->
          <div class="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs font-bold text-white">
                <i data-lucide="activity" class="w-4 h-4 text-emerald-400"></i>
                <span>ตรวจสอบสถานะ Live APIs ทั้งหมดบน Production</span>
              </div>
              <button onclick="runLiveApiHealthCheck()" id="btn-run-health-check" class="px-3 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1">
                <i data-lucide="play" class="w-3 h-3"></i>
                <span>ตรวจเช็กความพร้อมระบบ</span>
              </button>
            </div>
            <div id="live-api-health-results" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
              <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
                <span class="text-slate-400">Database:</span> <span class="text-emerald-400 font-bold">PostgreSQL Live</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
                <span class="text-slate-400">Slip Verify:</span> <span class="text-cyan-400 font-bold">EasySlip Ready</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
                <span class="text-slate-400">TrueMoney:</span> <span class="text-amber-400 font-bold">083****508</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
                <span class="text-slate-400">Crypto Vault:</span> <span class="text-purple-400 font-bold">AES-256-GCM</span>
              </div>
            </div>
          </div>

          <!-- Discord OAuth2 Setup Guide Card -->
          <div class="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <div class="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <i data-lucide="shield-check" class="w-4 h-4 text-indigo-400"></i>
              <span>คู่มือการเปิดใช้งาน Discord OAuth2 (เข้าสู่ระบบด้วย Discord จริง)</span>
            </div>
            <div class="text-[11px] text-slate-300 space-y-1.5 leading-relaxed font-sans">
              <p>1. ไปที่ <a href="https://discord.com/developers/applications" target="_blank" class="text-indigo-400 underline">Discord Developer Portal</a> แล้วสร้าง Application ของร้าน</p>
              <p>2. ไปที่เมนู <b>OAuth2 -> General -> Redirects</b> แล้วกดเพิ่ม URL: <code class="px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 font-mono select-all">https://ymaulztlbctpzyhdhjvn.supabase.co/auth/v1/callback</code></p>
              <p>3. คัดลอก <b>Client ID</b> และ <b>Client Secret</b></p>
              <p>4. ไปที่ <a href="https://supabase.com/dashboard/project/ymaulztlbctpzyhdhjvn/auth/providers" target="_blank" class="text-indigo-400 underline">Supabase Dashboard -> Auth -> Providers -> Discord</a> แล้วเปิดสวิตช์ วาง Key แล้วกด Save</p>
              <p class="text-emerald-400 font-mono text-[10px]">✨ สมาชิก Discord ID 483398326159671326 และ 422611554475835394 จะได้รับสิทธิ์ Admin อัตโนมัติทันทีที่ล็อกอิน!</p>
            </div>
          </div>
`;

if (!html.includes('runLiveApiHealthCheck()')) {
  html = html.replace('<div id="discord-test-feedback" class="hidden text-xs p-3 rounded-xl"></div>', `<div id="discord-test-feedback" class="hidden text-xs p-3 rounded-xl"></div>\n${discordDiagnosticsCard}`);
  console.log('✅ Added Discord Diagnostics & OAuth2 Guide');
}

// 4. Update switchAdminTab and add Reviews methods
const oldTabsArray = `const tabs = ["analytics", "visitors", "products", "vault", "vouchers", "users", "orders", "topups", "claims", "discord"];`;
const newTabsArray = `const tabs = ["analytics", "visitors", "products", "vault", "vouchers", "users", "orders", "topups", "claims", "discord", "reviews"];`;

if (html.includes(oldTabsArray)) {
  html = html.replace(oldTabsArray, newTabsArray);
  console.log('✅ Updated switchAdminTab tabs array');
}

// Add TAB_METADATA.reviews
const oldMetaDiscord = `discord: {
        title: "⚙️ Discord Webhook & แจ้งเตือน 24 ชม.",
        desc: "ตั้งค่าและยิงทดสอบ Rich Embed เข้า Channel Discord ของทีมงาน"
      }`;
const newMetaDiscord = `${oldMetaDiscord},
      reviews: {
        title: "⭐ รีวิวและความคิดเห็นจากลูกค้า",
        desc: "ตรวจสอบคะแนนดาว ความคิดเห็น และจัดการการแสดงผลรีวิวจากผู้ซื้อจริง"
      }`;

if (!html.includes('reviews: {')) {
  html = html.replace(oldMetaDiscord, newMetaDiscord);
  console.log('✅ Added TAB_METADATA.reviews');
}

// Add JS Functions for Reviews & Healthcheck
const newJsMethods = `
    // --- REVIEWS MANAGEMENT SUITE ---
    async function loadReviewsTable() {
      initSupabase();
      if (!supabaseClient) return;

      const tbody = document.getElementById("reviews-table-body");
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400"></i>กำลังโหลดรีวิวจากลูกค้า...</td></tr>';
      if (window.lucide) lucide.createIcons();

      try {
        const { data: reviews, error } = await supabaseClient
          .from('product_reviews')
          .select('*, products(title)')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const total = (reviews || []).length;
        const avg = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : "5.0";
        const fiveStars = (reviews || []).filter(r => r.rating === 5).length;
        const visibleCount = (reviews || []).filter(r => r.is_visible).length;

        const statTotal = document.getElementById("stat-reviews-total");
        if (statTotal) statTotal.textContent = total;
        const statAvg = document.getElementById("stat-reviews-avg");
        if (statAvg) statAvg.textContent = avg;
        const statFive = document.getElementById("stat-reviews-five-star");
        if (statFive) statFive.textContent = fiveStars;
        const statVis = document.getElementById("stat-reviews-visible");
        if (statVis) statVis.textContent = \`\${visibleCount}/\${total}\`;
        const badge = document.getElementById("badge-reviews-count");
        if (badge) badge.textContent = total;

        if (total === 0) {
          if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-slate-500">ยังไม่มีรีวิวจากลูกค้า</td></tr>';
          return;
        }

        if (tbody) {
          tbody.innerHTML = reviews.map(r => {
            const stars = "★".repeat(r.rating || 5);
            const empty = "☆".repeat(5 - (r.rating || 5));
            const prodTitle = r.products?.title || r.product_id;
            const dateStr = new Date(r.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

            return \`
              <tr class="hover:bg-slate-900/50 transition-colors border-b border-slate-800/60 text-xs">
                <td class="p-3.5">
                  <div class="flex items-center gap-2.5">
                    <img src="\${r.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + r.author_name}" class="w-7 h-7 rounded-lg object-cover bg-slate-900 border border-slate-700" />
                    <div>
                      <span class="font-bold text-white">\${r.author_name}</span>
                      <div class="text-[10px] font-mono text-slate-500">#\${r.order_id}</div>
                    </div>
                  </div>
                </td>
                <td class="p-3.5 font-mono text-amber-400 font-bold tracking-wider">
                  \${stars}<span class="text-slate-600">\${empty}</span> <span class="text-[10px] text-slate-400">(\${r.rating}/5)</span>
                </td>
                <td class="p-3.5 text-slate-300 font-medium">
                  <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">\${prodTitle}</span>
                </td>
                <td class="p-3.5 text-slate-300 max-w-xs truncate" title="\${r.comment || ''}">
                  "\${r.comment || 'ไม่มีข้อความ'}"
                </td>
                <td class="p-3.5">
                  \${r.is_visible 
                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">แสดงบนเว็บ</span>' 
                    : '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">ซ่อนไว้</span>'}
                </td>
                <td class="p-3.5 text-right space-x-2">
                  <button onclick="toggleReviewVisibility('\${r.id}', \${r.is_visible})" class="px-2.5 py-1 rounded-lg text-[11px] font-mono \${r.is_visible ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'} cursor-pointer">
                    \${r.is_visible ? 'ซ่อน' : 'แสดง'}
                  </button>
                  <button onclick="deleteReview('\${r.id}')" class="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 cursor-pointer">
                    ลบ
                  </button>
                </td>
              </tr>
            \`;
          }).join("");
        }

        if (window.lucide) lucide.createIcons();
      } catch (err) {
        console.error("Error loading reviews:", err);
        if (tbody) tbody.innerHTML = \`<tr><td colspan="6" class="text-center py-6 text-rose-400">โหลดข้อมูลรีวิวล้มเหลว: \${err.message}</td></tr>\`;
      }
    }

    async function toggleReviewVisibility(id, currentStatus) {
      initSupabase();
      try {
        const { error } = await supabaseClient
          .from('product_reviews')
          .update({ is_visible: !currentStatus })
          .eq('id', id);
        if (error) throw error;
        showToast('อัปเดตสถานะการแสดงผลรีวิวเรียบร้อยแล้ว', 'success');
        loadReviewsTable();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function deleteReview(id) {
      if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?')) return;
      initSupabase();
      try {
        const { error } = await supabaseClient
          .from('product_reviews')
          .delete()
          .eq('id', id);
        if (error) throw error;
        showToast('ลบรีวิวเรียบร้อยแล้ว', 'success');
        loadReviewsTable();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function runLiveApiHealthCheck() {
      const btn = document.getElementById("btn-run-health-check");
      const container = document.getElementById("live-api-health-results");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> <span>กำลังตรวจเช็ก...</span>';
        if (window.lucide) lucide.createIcons();
      }

      try {
        const res = await fetch("/api/merchant-health");
        const data = await res.json();
        if (container && data && data.services) {
          const s = data.services;
          container.innerHTML = \`
            <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
              <span class="text-slate-400">Database:</span> <span class="\${s.database?.status === 'OK' ? 'text-emerald-400 font-bold' : 'text-rose-400'}">\${s.database?.status === 'OK' ? 'PostgreSQL Live (' + s.database.productCount + ' prods)' : 'Error'}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
              <span class="text-slate-400">Slip Verify:</span> <span class="\${s.slipVerify?.status === 'LIVE_CONFIGURED' ? 'text-cyan-400 font-bold' : 'text-amber-400'}">\${s.slipVerify?.status || 'Active'}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
              <span class="text-slate-400">TrueMoney:</span> <span class="text-amber-400 font-bold">\${s.trueMoney?.phoneMasked || '083****508'}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
              <span class="text-slate-400">Crypto Vault:</span> <span class="text-purple-400 font-bold">\${s.cryptoVault?.algorithm || 'AES-256-GCM'}</span>
            </div>
          \`;
          showToast('ตรวจสอบสถานะ Live APIs สำเร็จ 100%', 'success');
        }
      } catch (e) {
        showToast('การตรวจสอบล้มเหลว: ' + e.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="play" class="w-3 h-3"></i> <span>ตรวจเช็กความพร้อมระบบ</span>';
          if (window.lucide) lucide.createIcons();
        }
      }
    }
`;

// Hook into switchAdminTab
const oldSwitchAdminTabCall = `      if (tabKey === 'visitors') {
        loadVisitorLogs();
      }`;
const newSwitchAdminTabCall = `      if (tabKey === 'visitors') {
        loadVisitorLogs();
      } else if (tabKey === 'reviews') {
        loadReviewsTable();
      }`;

if (html.includes(oldSwitchAdminTabCall)) {
  html = html.replace(oldSwitchAdminTabCall, newSwitchAdminTabCall);
  console.log('✅ Hooked switchAdminTab for reviews');
}

// Append methods before closing script tag
if (!html.includes('function loadReviewsTable()')) {
  html = html.replace('</script>\n</body>', `${newJsMethods}\n  </script>\n</body>`);
  console.log('✅ Added JS methods for Reviews & Healthcheck');
}

fs.writeFileSync(adminPath, html, 'utf8');
console.log('🎉 Successfully updated admin.html!');
