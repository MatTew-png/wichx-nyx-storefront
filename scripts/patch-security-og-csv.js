const fs = require('fs');
const path = require('path');

function patchAll() {
  console.log('🛡️ [PATCH] Applying Zero-Latency Anti-Context & DevTools Security Shield...');

  // 1. Prepare Head Security Script Snippet
  const HEAD_SECURITY_SNIPPET = `
  <!-- ==============================================================================
       🛡️ ZERO-LATENCY BROWSER ANTI-TAMPER & CONTEXT MENU SHIELD (HEAD-LEVEL)
       Synchronous execution before any external resource loads (0.00s instant lock)
       ============================================================================== -->
  <script>
    (function() {
      window.__nyxAdminUnlocked = false;
      function isInputTarget(el) {
        if (!el) return false;
        var tag = (el.tagName || '').toLowerCase();
        return tag === 'input' || tag === 'textarea' || el.isContentEditable;
      }
      window.__nyxBlockCtx = function(e) {
        if (window.__nyxAdminUnlocked) return true;
        if (isInputTarget(e.target)) return true;
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (e) e.returnValue = false;
        return false;
      };

      // 1. Chromium priority property overrides
      window.oncontextmenu = window.__nyxBlockCtx;
      document.oncontextmenu = window.__nyxBlockCtx;

      // 2. Capture-phase interception across window and document
      window.addEventListener('contextmenu', window.__nyxBlockCtx, { capture: true, passive: false });
      document.addEventListener('contextmenu', window.__nyxBlockCtx, { capture: true, passive: false });
      window.addEventListener('auxclick', function(e) {
        if (e.button === 2) window.__nyxBlockCtx(e);
      }, { capture: true, passive: false });

      // 3. DevTools & Inspection Keyboard Shortcuts Interceptors
      function blockDevKeys(e) {
        var key = (e.key || '').toLowerCase();
        var code = e.keyCode || e.which;
        var isCtrlOrMeta = e.ctrlKey || e.metaKey;

        // Admin Secret Unlock: Ctrl + Alt + D
        if (isCtrlOrMeta && e.altKey && key === 'd') {
          if (window.Shop && window.Shop.security && window.Shop.security.isAdmin && window.Shop.security.isAdmin()) {
            window.__nyxAdminUnlocked = !window.__nyxAdminUnlocked;
            return;
          }
        }

        if (window.__nyxAdminUnlocked) return;

        // F12 or code 123
        if (key === 'f12' || code === 123) {
          e.preventDefault(); e.stopPropagation(); e.returnValue = false; return false;
        }
        // Shift + F10 (Context Menu Shortcut) or ContextMenu physical key
        if ((e.shiftKey && (key === 'f10' || code === 121)) || key === 'contextmenu' || code === 93) {
          e.preventDefault(); e.stopPropagation(); e.returnValue = false; return false;
        }
        // Ctrl+Shift+I / J / C (DevTools Inspect & Console)
        if (isCtrlOrMeta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c' || code === 73 || code === 74 || code === 67)) {
          e.preventDefault(); e.stopPropagation(); e.returnValue = false; return false;
        }
        // Ctrl+U (View Source)
        if (isCtrlOrMeta && (key === 'u' || code === 85)) {
          e.preventDefault(); e.stopPropagation(); e.returnValue = false; return false;
        }
        // Ctrl+S (Save Page) & Ctrl+P (Print Page)
        if (isCtrlOrMeta && (key === 's' || key === 'p' || code === 83 || code === 80)) {
          if (!isInputTarget(e.target)) {
            e.preventDefault(); e.stopPropagation(); e.returnValue = false; return false;
          }
        }
      }

      window.addEventListener('keydown', blockDevKeys, { capture: true, passive: false });
      document.addEventListener('keydown', blockDevKeys, { capture: true, passive: false });
    })();
  </script>`;

  // 2. Prepare OpenGraph & Discord Metadata Snippet
  const OG_DISCORD_SNIPPET = `
  <!-- Discord & OpenGraph Rich Embed Metadata -->
  <meta name="theme-color" content="#00F2FF" />
  <meta property="og:site_name" content="NYX9 STUDIO" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://nyxning.shop/" />
  <meta property="og:title" content="NYX9 STUDIO — ร้านค้าบริการ Discord Nitro & Gaming Accounts ส่งออโต้ 24 ชม." />
  <meta property="og:description" content="⚡ ศูนย์รวมบริการดิจิทัล Discord Nitro, บูสต์เซิร์ฟเวอร์, FiveM, Steam & แอพพรีเมียม ตัดยอดและจัดส่งรหัสทันทีใน 1 วินาที การันตีมากกว่า 660,000 ออเดอร์" />
  <meta property="og:image" content="https://nyxning.shop/assets/og-banner.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="NYX9 STUDIO Cyberpunk Storefront" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="NYX9 STUDIO — ร้านค้าบริการ Discord Nitro & Gaming Accounts ส่งออโต้ 24 ชม." />
  <meta name="twitter:description" content="⚡ ศูนย์รวมบริการดิจิทัล Discord Nitro, บูสต์เซิร์ฟเวอร์, FiveM, Steam & แอพพรีเมียม ตัดยอดและจัดส่งรหัสทันทีใน 1 วินาที การันตีมากกว่า 660,000 ออเดอร์" />
  <meta name="twitter:image" content="https://nyxning.shop/assets/og-banner.png" />`;

  // Patch index.html & 200.html
  ['index.html', '200.html'].forEach(filename => {
    const filePath = path.join(__dirname, '..', filename);
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');

    // 1. Replace OpenGraph and Twitter tags
    const ogRegex = /<!-- OpenGraph \/ Social Sharing -->[\s\S]*?<!-- Twitter Card -->[\s\S]*?<meta name="twitter:description"[^>]*\/>/i;
    if (ogRegex.test(html)) {
      html = html.replace(ogRegex, OG_DISCORD_SNIPPET.trim());
      console.log(`✅ [${filename}] Replaced OpenGraph & Twitter tags with Discord 1200x630 banner & #00F2FF theme`);
    }

    // 2. Inject Head Security Script if not present
    if (!html.includes('__nyxBlockCtx')) {
      // Insert right after <head> and <meta viewport>
      const headPos = html.indexOf('<head>');
      if (headPos !== -1) {
        const nextTagPos = html.indexOf('>', headPos) + 1;
        html = html.slice(0, nextTagPos) + '\n' + HEAD_SECURITY_SNIPPET + '\n' + html.slice(nextTagPos);
        console.log(`✅ [${filename}] Injected zero-latency Head Security Shield`);
      }
    }

    // 3. Add oncontextmenu to <body> if not present
    if (!html.includes('oncontextmenu="return window.__nyxBlockCtx')) {
      html = html.replace(/<body([^>]*)>/i, '<body$1 oncontextmenu="return window.__nyxBlockCtx ? window.__nyxBlockCtx(event) : false;">');
      console.log(`✅ [${filename}] Added oncontextmenu attribute to <body> tag`);
    }

    fs.writeFileSync(filePath, html, 'utf8');
  });

  // 3. Patch styles.css for anti-callout
  const stylesPath = path.join(__dirname, '..', 'styles.css');
  if (fs.existsSync(stylesPath)) {
    let css = fs.readFileSync(stylesPath, 'utf8');
    if (!css.includes('-webkit-touch-callout')) {
      const antiCalloutCSS = `
/* ==============================================================================
   🛡️ ANTI-CALLOUT & ASSET EXTRACTION SHIELD
   ============================================================================== */
html, body {
  -webkit-touch-callout: none;
}
img, canvas, svg, button {
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}
input, textarea {
  -webkit-touch-callout: default !important;
  user-select: text !important;
}
`;
      css = css + '\n' + antiCalloutCSS;
      fs.writeFileSync(stylesPath, css, 'utf8');
      console.log('✅ [styles.css] Added -webkit-touch-callout: none rules');
    }
  }

  // 4. Update js/core/SecurityEngine.js
  const secPath = path.join(__dirname, '..', 'js', 'core', 'SecurityEngine.js');
  if (fs.existsSync(secPath)) {
    let secCode = fs.readFileSync(secPath, 'utf8');
    // Ensure admin unlock syncs with window.__nyxAdminUnlocked
    if (!secCode.includes('window.__nyxAdminUnlocked = this.adminUnlocked;')) {
      secCode = secCode.replace(
        'this.adminUnlocked = !this.adminUnlocked;',
        'this.adminUnlocked = !this.adminUnlocked;\n          window.__nyxAdminUnlocked = this.adminUnlocked;'
      );
      fs.writeFileSync(secPath, secCode, 'utf8');
      console.log('✅ [SecurityEngine.js] Synced admin unlock state to window.__nyxAdminUnlocked');
    }
  }

  // 5. Patch admin.html with CSV export & Head Security
  const adminPath = path.join(__dirname, '..', 'admin.html');
  if (fs.existsSync(adminPath)) {
    let adminHtml = fs.readFileSync(adminPath, 'utf8');

    // Add head security if not present
    if (!adminHtml.includes('__nyxBlockCtx')) {
      const headPos = adminHtml.indexOf('<head>');
      if (headPos !== -1) {
        const nextTagPos = adminHtml.indexOf('>', headPos) + 1;
        adminHtml = adminHtml.slice(0, nextTagPos) + '\n' + HEAD_SECURITY_SNIPPET + '\n' + adminHtml.slice(nextTagPos);
        console.log('✅ [admin.html] Injected zero-latency Head Security Shield');
      }
    }

    // Add oncontextmenu to <body> in admin.html
    if (!adminHtml.includes('oncontextmenu="return window.__nyxBlockCtx')) {
      adminHtml = adminHtml.replace(/<body([^>]*)>/i, '<body$1 oncontextmenu="return window.__nyxBlockCtx ? window.__nyxBlockCtx(event) : false;">');
      console.log('✅ [admin.html] Added oncontextmenu attribute to <body> tag');
    }

    // Add CSV Export Button in Orders Tab header
    if (!adminHtml.includes('exportOrdersToCSV')) {
      // Find orders tab header
      const targetHeader = `<span class="text-xs text-slate-400">แสดง 10 รายการล่าสุดจากฐานข้อมูลจริง</span>`;
      const replacementHeader = `<div class="flex items-center gap-3">
            <button onclick="exportOrdersToCSV()" class="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>📥 ดาวน์โหลดรายงานยอดขาย (.CSV)</span>
            </button>
            <span class="text-xs text-slate-400 hidden sm:inline">ดึงข้อมูลคำสั่งซื้อทั้งหมด</span>
          </div>`;
      if (adminHtml.includes(targetHeader)) {
        adminHtml = adminHtml.replace(targetHeader, replacementHeader);
        console.log('✅ [admin.html] Added CSV export button to Orders Explorer tab');
      }

      // Add exportOrdersToCSV() script and save window.currentDashboardData
      adminHtml = adminHtml.replace(
        'function renderDashboard(data) {',
        'function renderDashboard(data) {\n      window.currentDashboardData = data;'
      );

      const csvScript = `
    // ==============================================================================
    // 📊 EXCEL / CSV REPORT EXPORTER FOR ADMIN (UTF-8 BOM FOR THAI LANGUAGE)
    // ==============================================================================
    async function exportOrdersToCSV() {
      try {
        let orders = [];
        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data && data.length > 0) {
            orders = data;
          }
        }
        if (orders.length === 0 && window.currentDashboardData && window.currentDashboardData.recent_orders) {
          orders = window.currentDashboardData.recent_orders;
        }

        if (!orders || orders.length === 0) {
          alert('ไม่พบข้อมูลคำสั่งซื้อสำหรับส่งออก CSV');
          return;
        }

        // CSV Headers
        const headers = [
          'ลำดับ',
          'รหัสคำสั่งซื้อ (Order ID)',
          'วันที่-เวลา (Date Time)',
          'ผู้สั่งซื้อ (Discord ID / User)',
          'สินค้า (Items)',
          'จำนวน (Qty)',
          'ยอดชำระสุทธิ (Total THB)',
          'ช่องทางชำระ (Payment Method)',
          'สถานะ (Status)'
        ];

        const rows = orders.map((ord, idx) => {
          let itemsStr = '-';
          let qty = 1;
          if (Array.isArray(ord.items)) {
            itemsStr = ord.items.map(it => (it.title || it.name || 'สินค้า') + ' x' + (it.quantity || 1)).join('; ');
            qty = ord.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
          } else if (typeof ord.items === 'object' && ord.items !== null) {
            itemsStr = JSON.stringify(ord.items);
          } else if (ord.items) {
            itemsStr = String(ord.items);
          }

          const dateStr = new Date(ord.created_at).toLocaleString('th-TH');
          const safe = (val) => '"' + String(val || '').replace(/"/g, '""') + '"';

          return [
            idx + 1,
            safe(ord.id),
            safe(dateStr),
            safe(ord.discord_id || ord.user_id || 'Guest'),
            safe(itemsStr),
            qty,
            parseFloat(ord.total_amount || 0).toFixed(2),
            safe(ord.payment_method || 'wallet'),
            safe(ord.status || 'PAID')
          ].join(',');
        });

        // Prepend UTF-8 BOM (\\uFEFF) so Excel on Windows opens Thai characters correctly
        const csvContent = '\\uFEFF' + [headers.join(','), ...rows].join('\\r\\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateToday = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = 'NYX9_Sales_Report_' + dateToday + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export CSV Error:', err);
        alert('เกิดข้อผิดพลาดในการดาวน์โหลด CSV: ' + err.message);
      }
    }
`;
      // Insert csvScript before </script>
      const lastScriptClose = adminHtml.lastIndexOf('</script>');
      if (lastScriptClose !== -1) {
        adminHtml = adminHtml.slice(0, lastScriptClose) + csvScript + '\n' + adminHtml.slice(lastScriptClose);
        console.log('✅ [admin.html] Injected exportOrdersToCSV() implementation with UTF-8 BOM');
      }
    }

    fs.writeFileSync(adminPath, adminHtml, 'utf8');
  }

  console.log('✨ [PATCH] All patches applied successfully!');
}

patchAll();
