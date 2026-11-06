const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const p200Path = path.join(__dirname, '..', '200.html');
const appJsPath = path.join(__dirname, '..', 'app.js');

let html = fs.readFileSync(indexHtmlPath, 'utf8');

// ==============================================================================
// 1. UPDATE HEADER: Back to Home Button & Desktop Nav Links
// ==============================================================================
// Target Header Branding & Zone A
const headerRegex = /<header class="sticky top-0 z-40 w-full bg-\[#070A0F\]\/90 backdrop-blur-2xl border-b border-\[rgba\(255,255,255,0\.08\)\]">[\s\S]*?<\/header>/;

const newHeaderHTML = `<header class="sticky top-0 z-40 w-full bg-[#070A0F]/90 backdrop-blur-2xl border-b border-[rgba(255,255,255,0.08)]">
    <div class="max-w-7xl mx-auto px-4 md:px-8 h-18 py-3 flex items-center justify-between gap-3 sm:gap-4">
      
      <!-- Store Branding & Dynamic Back Navigation -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <a href="javascript:void(0)" onclick="window.navigateToPage('home')" class="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div class="relative w-10 h-10 rounded-xl bg-[#090D15] border border-white/[0.1] flex items-center justify-center overflow-hidden p-1.5 shadow-[0_0_15px_rgba(0,163,255,0.2)] transition-all group-hover:scale-105 group-hover:border-[var(--accent)]/50">
            <img src="assets/logo.png" alt="NYX9 STUDIO" class="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,163,255,0.35)]" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Cpolygon points=\\'50,5 90,25 90,75 50,95 10,75 10,25\\' fill=\\'%230A0E17\\' stroke=\\'%2300F2FF\\' stroke-width=\\'4\\'/%3E%3Cpath d=\\'M50,22 L35,52 L48,52 L42,78 L65,44 L52,44 Z\\' fill=\\'%2300F2FF\\'/%3E%3C/svg%3E';" />
          </div>
          <div>
            <div class="text-base md:text-lg font-heading font-extrabold tracking-wider text-white group-hover:text-[var(--accent)] transition-colors" data-bind="storeName">
              NYX9 STUDIO
            </div>
            <div class="text-[10px] font-mono-val text-slate-400 -mt-0.5 tracking-tight flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ออนไลน์ 24 ชม.</span>
            </div>
          </div>
        </a>

        <!-- Back to Home Action Button (Shown on sub-pages) -->
        <button id="nav-back-home-btn" onclick="window.navigateToPage('home')" class="hidden items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-[var(--accent)] transition-all cursor-pointer group active:scale-95 shadow-sm ml-1 sm:ml-2">
          <i data-lucide="arrow-left" class="w-4 h-4 group-hover:-translate-x-1 transition-transform"></i>
          <span>กลับหน้าหลัก</span>
        </button>
      </div>

      <!-- Quick Desktop Page Navigation Links -->
      <nav class="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-300">
        <button onclick="window.navigateToPage('home', '#category-filter-bar')" class="px-2.5 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
          สินค้าทั้งหมด
        </button>
        <button onclick="window.navigateToPage('topup')" class="px-2.5 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
          เติมเงิน
        </button>
        <button onclick="window.navigateToPage('history')" class="px-2.5 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
          ประวัติคำสั่งซื้อ
        </button>
        <button onclick="window.navigateToPage('claim')" class="px-2.5 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
          แจ้งเคลม
        </button>
        <button onclick="window.navigateToPage('faq')" class="px-2.5 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
          คำถามที่พบบ่อย
        </button>
      </nav>

      <!-- Action Buttons & User Telemetry -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        <!-- Shopping Cart -->
        <button onclick="toggleCartDrawer()" class="relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer group active:scale-95" title="ตะกร้าสินค้า">
          <div class="relative flex items-center justify-center">
            <i data-lucide="shopping-cart" class="w-4 h-4 text-[var(--accent)] group-hover:scale-110 transition-transform"></i>
            <span id="cart-badge-count" class="hidden">0</span>
          </div>
          <span class="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors hidden sm:inline">ตะกร้า</span>
        </button>

        <!-- Wallet Balance & Top-Up Pill (Direct Navigation to /topup) -->
        <button onclick="window.navigateToPage('topup')" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(0,242,255,0.06)] hover:bg-[rgba(0,242,255,0.12)] border border-[rgba(0,242,255,0.15)] hover:border-[rgba(0,242,255,0.35)] transition-all group cursor-pointer active:scale-95 shadow-sm" title="คลิกเพื่อไปหน้าเติมเงิน">
          <div class="w-5 h-5 rounded-md bg-[rgba(0,242,255,0.15)] text-[var(--accent)] flex items-center justify-center">
            <i data-lucide="wallet" class="w-3 h-3"></i>
          </div>
          <div class="text-left">
            <div class="text-[9px] text-slate-400 font-mono-val leading-none">กระเป๋าเงิน</div>
            <div id="user-wallet-balance" class="text-xs font-mono-val font-extrabold text-[var(--accent)] leading-tight">฿500.00</div>
          </div>
          <span class="w-4 h-4 rounded-md bg-[var(--accent)] text-[#06080C] text-[10px] font-extrabold flex items-center justify-center ml-0.5 group-hover:scale-110 transition-transform">+</span>
        </button>

        <!-- Subtle Dot Separator -->
        <span class="inline-block w-1 h-1 rounded-full bg-slate-700/60 mx-0.5 sm:mx-1"></span>

        <!-- Discord Auth Section (Login Button / Profile Dropdown) -->
        <div id="auth-section" class="relative flex items-center">
          <!-- Unauthenticated: Login with Discord -->
          <button id="btn-discord-login" onclick="handleDiscordLogin()" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all text-xs font-bold shadow-sm shadow-[#5865F2]/20 group cursor-pointer active:scale-95" title="เข้าสู่ระบบด้วย Discord">
            <svg class="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.288a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span class="hidden sm:inline">เข้าสู่ระบบ Discord</span>
          </button>

          <!-- Authenticated: Profile Badge Trigger Button -->
          <button id="user-profile-badge" onclick="window.toggleUserMenu(event)" class="hidden items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.18] transition-all cursor-pointer group select-none">
            <img id="user-avatar-img" src="" alt="Avatar" class="w-6 h-6 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-[var(--accent)] transition-all" />
            <div class="text-left hidden md:block">
              <div id="user-display-name" class="text-xs font-bold text-white leading-tight max-w-[110px] truncate">Discord</div>
            </div>
            <i data-lucide="chevron-down" id="user-menu-chevron" class="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200"></i>
          </button>

          <!-- Dropdown Menu Box -->
          <div id="user-dropdown-menu" class="hidden absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[#090D14]/95 backdrop-blur-2xl border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,242,255,0.1)] p-2 z-[200]">
            <!-- User Info Card Header -->
            <div class="p-3 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] mb-1.5">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <img id="menu-avatar-img" src="" alt="Avatar" class="w-10 h-10 rounded-xl object-cover ring-2 ring-[#5865F2]/50" />
                  <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#090D14]"></span>
                </div>
                <div class="flex-1 min-w-0">
                  <div id="menu-username" class="text-xs font-heading font-extrabold text-white truncate">Discord User</div>
                  <div id="menu-discord-id" class="text-[10px] text-slate-400 font-mono truncate">ID: -</div>
                </div>
              </div>
              <div class="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span class="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <i data-lucide="wallet" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
                  ยอดเงินคงเหลือ
                </span>
                <span id="menu-wallet-balance" class="text-xs font-mono font-bold text-[var(--accent)]">฿0.00</span>
              </div>
            </div>

            <!-- Action Menu Items -->
            <div class="space-y-0.5 text-xs font-medium">
              <!-- ประวัติคำสั่งซื้อ -->
              <button onclick="window.navigateToPage('history')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-left group">
                <div class="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i data-lucide="history" class="w-3.5 h-3.5"></i>
                </div>
                <div class="flex-1">
                  <div class="text-white font-semibold">ประวัติคำสั่งซื้อ & คลังรหัส</div>
                  <div class="text-[10px] text-slate-400">ดูรหัสสินค้าและใบเสร็จย้อนหลัง</div>
                </div>
              </button>

              <!-- แจ้งเคลมสินค้า -->
              <button onclick="window.navigateToPage('claim')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-left group">
                <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
                </div>
                <div class="flex-1">
                  <div class="text-white font-semibold">แจ้งเคลมสินค้า (ประกัน)</div>
                  <div class="text-[10px] text-slate-400">ส่งเคลมรหัสที่มีปัญหาได้ทันที</div>
                </div>
              </button>

              <!-- เติมเงินเข้ากระเป๋า -->
              <button onclick="window.navigateToPage('topup')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-left group">
                <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                </div>
                <div class="flex-1">
                  <div class="text-white font-semibold">เติมเงินเข้ากระเป๋า</div>
                  <div class="text-[10px] text-slate-400">พร้อมเพย์, TrueMoney, ธนาคาร</div>
                </div>
              </button>

              <!-- Admin Link -->
              <a id="menu-admin-link" href="admin.html" class="hidden items-center gap-2.5 px-3 py-2 rounded-xl text-amber-300 hover:bg-amber-500/10 transition-all group">
                <div class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                </div>
                <div class="flex-1">
                  <div class="text-amber-300 font-bold">ระบบจัดการหลังบ้าน (Admin)</div>
                  <div class="text-[10px] text-amber-400/70">จัดการสต็อกและสมาชิก</div>
                </div>
              </a>
            </div>

            <!-- Divider -->
            <div class="my-1.5 border-t border-white/[0.06]"></div>

            <!-- Logout -->
            <button onclick="window.handleMenuAction('logout')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer text-left group font-medium">
              <div class="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
              </div>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>`;

html = html.replace(headerRegex, newHeaderHTML);
console.log('✓ Header updated with Back button and direct route links');

// ==============================================================================
// 2. WRAP MAIN CONTENT & INSERT DEDICATED PAGE VIEWS
// ==============================================================================
// Find <main class="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full flex-1 relative z-10">
const mainStartTag = '<main class="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full flex-1 relative z-10">';
const mainStartIndex = html.indexOf(mainStartTag);
const mainEndIndex = html.indexOf('</main>', mainStartIndex);

if (mainStartIndex === -1 || mainEndIndex === -1) {
  console.error('Could not find <main> tags');
  process.exit(1);
}

const currentMainContent = html.substring(mainStartIndex + mainStartTag.length, mainEndIndex);

const viewsHTML = `
    <!-- ============================================================================
         VIEW 1: HOME CATALOG (STOREFRONT)
         ============================================================================ -->
    <div id="view-home" class="view-panel block">
      ${currentMainContent.trim()}
    </div>

    <!-- ============================================================================
         VIEW 2: DEDICATED TOP-UP FINTECH DASHBOARD (/topup)
         ============================================================================ -->
    <div id="view-topup" class="view-panel hidden py-4 sm:py-6">
      
      <!-- Top Title Strip -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.15)] shrink-0">
            <i data-lucide="wallet" class="w-6 h-6"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center gap-2">
              เติมเงินเข้ากระเป๋า
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold tracking-wider">AUTO 24/7 ONLINE</span>
            </h2>
            <p class="text-xs text-slate-400">ระบบตัดยอดอัตโนมัติ เครดิตเข้ากระเป๋าทันทีใน 5-10 วินาที</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.navigateToPage('home')" class="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            <span>กลับไปเลือกสินค้า</span>
          </button>
        </div>
      </div>

      <!-- 2-Column Responsive Fintech Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Left Column: Payment Gateways (7 Cols) -->
        <div class="lg:col-span-7 bg-[#090D15]/95 rounded-3xl border border-white/[0.1] shadow-2xl p-5 sm:p-7 relative overflow-hidden backdrop-blur-2xl">
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70"></div>

          <!-- Segmented Gateway Tab Track (100% Equal Heights & Alignment) -->
          <div class="bg-[#05080E] p-1.5 rounded-2xl border border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-6 shadow-inner">
            <button id="tab-btn-promptpay" onclick="switchTopUpGateway('promptpay')" class="topup-tab-btn active h-12 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.15)] ring-1 ring-cyan-400/50">
              <i data-lucide="qr-code" class="w-4 h-4 text-cyan-400"></i>
              <span>พร้อมเพย์</span>
            </button>
            <button id="tab-btn-truemoney" onclick="switchTopUpGateway('truemoney')" class="topup-tab-btn h-12 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
              <i data-lucide="gift" class="w-4 h-4 text-amber-400"></i>
              <span>ทรูมันนี่</span>
            </button>
            <button id="tab-btn-bank_transfer" onclick="switchTopUpGateway('bank_transfer')" class="topup-tab-btn h-12 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
              <i data-lucide="landmark" class="w-4 h-4 text-emerald-400"></i>
              <span>ธนาคาร</span>
            </button>
            <button id="tab-btn-card_payment" onclick="switchTopUpGateway('card_payment')" class="topup-tab-btn h-12 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
              <i data-lucide="credit-card" class="w-4 h-4 text-indigo-400"></i>
              <span>บัตรเครดิต</span>
            </button>
          </div>

          <!-- PANEL 1: PROMPTPAY -->
          <div id="gateway-panel-promptpay" class="space-y-4">
            <div>
              <div class="flex items-center justify-between text-xs text-slate-300 font-semibold mb-2">
                <span>เลือกจำนวนเงินที่ต้องการเติม:</span>
                <span class="text-[11px] text-slate-500 font-mono">ขั้นต่ำ ฿1 • ฟรีค่าธรรมเนียม</span>
              </div>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2.5">
                <button type="button" onclick="setPromptPayPreset(50)" data-amount="50" class="promptpay-preset-btn h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿50</button>
                <button type="button" onclick="setPromptPayPreset(100)" data-amount="100" class="promptpay-preset-btn active h-10 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold border border-[var(--accent)] shadow-[0_0_12px_rgba(0,242,255,0.3)] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿100</button>
                <button type="button" onclick="setPromptPayPreset(150)" data-amount="150" class="promptpay-preset-btn h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿150</button>
                <button type="button" onclick="setPromptPayPreset(300)" data-amount="300" class="promptpay-preset-btn h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿300</button>
                <button type="button" onclick="setPromptPayPreset(500)" data-amount="500" class="promptpay-preset-btn h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿500</button>
                <button type="button" onclick="setPromptPayPreset(1000)" data-amount="1000" class="promptpay-preset-btn h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿1,000</button>
              </div>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--accent)] font-mono font-bold">฿</span>
                <input type="number" id="promptpay-amount-input" oninput="handlePromptPayAmountInput(this.value)" value="100" min="1" step="1" placeholder="ระบุจำนวนเงินเอง" class="w-full h-11 pl-9 pr-4 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-[var(--accent)] text-sm font-mono font-bold text-white focus:outline-none transition-all shadow-inner" />
              </div>
            </div>

            <!-- PromptPay QR Card -->
            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#070B12] to-[#04060A] border border-white/[0.08] shadow-xl flex flex-col items-center">
              <div class="w-full flex items-center justify-between text-xs pb-3 border-b border-white/[0.06] mb-3">
                <div class="flex items-center gap-1.5 font-bold text-slate-300">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  พร้อมเพย์ QR พร้อมสแกน
                </div>
                <div class="text-right">
                  <span class="text-[10px] text-slate-500 uppercase">ยอดชำระ: </span>
                  <span id="promptpay-qr-amount-text" class="text-base font-mono font-extrabold text-[var(--accent)]">฿100.00</span>
                </div>
              </div>

              <!-- QR Frame -->
              <div class="p-3.5 rounded-2xl bg-white shadow-2xl relative">
                <div id="promptpay-qr-display" class="w-44 h-44 flex items-center justify-center">
                  <img id="promptpay-qr-img" src="" alt="PromptPay QR" class="w-full h-full object-contain" />
                </div>
              </div>

              <div class="mt-3 text-center">
                <div class="text-xs font-semibold text-white flex items-center justify-center gap-1.5">
                  <span>ชื่อบัญชี:</span>
                  <span class="text-[var(--accent)] font-bold">NYX9 STUDIO AUTO</span>
                  <i data-lucide="badge-check" class="w-3.5 h-3.5 text-cyan-400"></i>
                </div>
                <p class="text-[10px] text-slate-500 mt-0.5">เปิดแอปธนาคารใดก็ได้ แล้วสแกน QR Code ด้านบน</p>
              </div>
            </div>

            <!-- Slip Input -->
            <div class="space-y-2 pt-2 border-t border-white/[0.06]">
              <div class="flex items-center justify-between text-[11px]">
                <label class="text-slate-300 font-semibold">ตรวจสอบสลิปโอนเงิน (TransRef / รหัสอ้างอิง):</label>
              </div>
              <div class="relative">
                <input type="text" id="promptpay-trans-ref-input" placeholder="กรอกเลขสลิป หรือ TransRef (เช่น 014022511...)" class="w-full h-11 px-3.5 pr-20 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-[var(--accent)] text-xs text-white font-mono focus:outline-none transition-all" />
                <button type="button" onclick="navigator.clipboard.readText().then(t => { if(t) document.getElementById('promptpay-trans-ref-input').value = t.trim(); })" class="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer">
                  วางรหัส
                </button>
              </div>
              <div id="promptpay-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
              <button id="btn-verify-promptpay" onclick="verifyPromptPaySlip()" class="btn-cyber-primary w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>ตรวจสอบสลิปและปรับยอดทันที</span>
              </button>
            </div>
          </div>

          <!-- PANEL 2: TRUEMONEY -->
          <div id="gateway-panel-truemoney" class="hidden space-y-4">
            <div class="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 text-xs space-y-3">
              <div class="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <i data-lucide="gift" class="w-4 h-4 text-amber-400"></i>
                <span>เติมเงินผ่านซองของขวัญ TrueMoney (ฟรีค่าธรรมเนียม)</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
                  <div class="text-white font-bold mb-0.5">1. สร้างซอง</div>
                  <div class="text-[10px]">เลือกแบ่ง 1 คน</div>
                </div>
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
                  <div class="text-white font-bold mb-0.5">2. คัดลอกลิงก์</div>
                  <div class="text-[10px]">gift.truemoney.com</div>
                </div>
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
                  <div class="text-white font-bold mb-0.5">3. รับเงินทันที</div>
                  <div class="text-[10px]">บอทตัดยอดออโต้</div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-[11px] font-semibold text-slate-300">วางลิงก์ซองของขวัญที่นี่:</label>
              <div class="relative">
                <input type="text" id="truemoney-voucher-input" placeholder="https://gift.truemoney.com/campaign/?v=..." class="w-full h-11 px-3.5 pr-20 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-amber-400 text-xs text-white font-mono focus:outline-none transition-all" />
                <button type="button" onclick="navigator.clipboard.readText().then(t => { if(t) document.getElementById('truemoney-voucher-input').value = t.trim(); })" class="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer">
                  วางลิงก์
                </button>
              </div>
              <div id="truemoney-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
              <button id="btn-redeem-truemoney" onclick="redeemTrueMoneyVoucher()" class="w-full h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95 transition-all">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
                <span>รับเงินเข้ากระเป๋าทันที</span>
              </button>
            </div>

            <div class="pt-2 border-t border-white/[0.06]">
              <div class="p-3.5 rounded-xl bg-[#060910] border border-white/[0.06] flex items-center justify-between text-xs">
                <div>
                  <div class="text-[10px] text-slate-400">โอนตรงเข้าเบอร์ TrueMoney Wallet:</div>
                  <div class="text-sm font-mono font-bold text-amber-300">098-765-4321</div>
                  <div class="text-[10px] text-slate-400">ชื่อบัญชี: NYX9 WALLET AUTO</div>
                </div>
                <button type="button" onclick="copyTrueMoneyPhone()" class="px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  <span>คัดลอกเบอร์</span>
                </button>
              </div>
            </div>
          </div>

          <!-- PANEL 3: BANK TRANSFER -->
          <div id="gateway-panel-bank_transfer" class="hidden space-y-4">
            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-[#070D14] to-[#04080D] border border-emerald-500/30 text-xs text-white space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-[#138f2d] flex items-center justify-center font-bold text-xs text-white shadow-md">K</div>
                  <div>
                    <div class="font-bold text-sm text-white">ธนาคารกสิกรไทย (K-Bank)</div>
                    <div class="text-[10px] text-emerald-400 font-mono">บัญชีพร้อมเพย์ / นิติบุคคล</div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">บอทเช็คยอด 24 ชม.</span>
              </div>

              <div class="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div class="text-[10px] text-slate-400">เลขที่บัญชี:</div>
                  <div id="bank-acc-number" class="text-base sm:text-lg font-mono font-extrabold text-emerald-300 tracking-wider">142-8-91234-5</div>
                  <div class="text-[10px] text-slate-300 mt-0.5">ชื่อบัญชี: <span class="font-bold text-white">NYX9 STUDIO BY MATTEW</span></div>
                </div>
                <button type="button" onclick="copyBankAccount()" class="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  <span>คัดลอก</span>
                </button>
              </div>
            </div>

            <div class="space-y-2.5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-300 mb-1">ยอดเงินที่โอน (บาท):</label>
                  <input type="number" id="bank-transfer-amount" value="100" min="1" step="1" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-emerald-400 text-xs text-white font-mono font-bold focus:outline-none" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-slate-300 mb-1">เลขสลิป / TransRef:</label>
                  <input type="text" id="bank-transfer-transref" placeholder="เช่น 014022511..." class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-emerald-400 text-xs text-white font-mono focus:outline-none" />
                </div>
              </div>
              <div id="bank-transfer-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
              <button id="btn-verify-bank" onclick="verifyBankTransferSlip()" class="w-full h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>ตรวจสอบยอดโอนธนาคาร</span>
              </button>
            </div>
          </div>

          <!-- PANEL 4: CARD PAYMENT -->
          <div id="gateway-panel-card_payment" class="hidden space-y-4">
            <div class="p-4 rounded-2xl bg-gradient-to-tr from-[#0F1422] via-[#141C30] to-[#0A0E18] border border-cyan-500/25 text-white relative shadow-xl overflow-hidden">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-5 rounded bg-amber-400/80 border border-amber-300/60 flex items-center justify-center shadow-inner">
                    <div class="w-3.5 h-2.5 border border-amber-800/40 rounded-sm"></div>
                  </div>
                  <i data-lucide="wifi" class="w-3.5 h-3.5 text-slate-400 rotate-90"></i>
                </div>
                <span class="text-xs font-mono font-extrabold italic tracking-wider text-cyan-400">VISA / MC</span>
              </div>

              <div class="mb-2.5">
                <div class="text-[9px] text-slate-400 font-mono">CARD NUMBER</div>
                <div id="preview-card-number" class="text-base font-mono font-bold tracking-widest text-slate-100">•••• •••• •••• ••••</div>
              </div>

              <div class="flex items-center justify-between text-xs font-mono">
                <div>
                  <div class="text-[9px] text-slate-400">CARDHOLDER</div>
                  <div id="preview-card-name" class="font-bold truncate max-w-[150px] uppercase text-cyan-200 text-[11px]">YOUR NAME</div>
                </div>
                <div class="text-right">
                  <div class="text-[9px] text-slate-400">EXPIRES</div>
                  <div id="preview-card-expiry" class="font-bold text-slate-200 text-[11px]">MM/YY</div>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1.5">เลือกจำนวนเงิน:</label>
              <div class="grid grid-cols-4 gap-1.5 mb-2">
                <button type="button" onclick="setCardAmountPreset(100)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿100</button>
                <button type="button" onclick="setCardAmountPreset(300)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿300</button>
                <button type="button" onclick="setCardAmountPreset(500)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿500</button>
                <button type="button" onclick="setCardAmountPreset(1000)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿1,000</button>
              </div>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-cyan-400 font-mono font-bold">฿</span>
                <input type="number" id="card-topup-amount" value="300" min="50" step="1" class="w-full h-11 pl-9 pr-4 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-sm font-bold focus:outline-none focus:border-cyan-400" />
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">หมายเลขบัตร (16 หลัก):</label>
              <div class="relative">
                <input type="text" id="card-number-input" oninput="handleCardNumberInput(this)" maxlength="19" placeholder="4111 2222 3333 4444" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
                <i data-lucide="credit-card" class="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2"></i>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">วันหมดอายุ (MM/YY):</label>
                <input type="text" id="card-expiry-input" oninput="handleCardExpiryInput(this)" maxlength="5" placeholder="12/28" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">รหัส CVV / CVC:</label>
                <input type="password" id="card-cvv-input" maxlength="4" placeholder="123" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">ชื่อบนบัตร (ภาษาอังกฤษ):</label>
              <input type="text" id="card-holder-input" oninput="handleCardHolderInput(this)" placeholder="SOMCHAI DEE" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white text-xs uppercase focus:outline-none focus:border-cyan-400" />
            </div>

            <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#060910] border border-white/[0.06] cursor-pointer hover:border-cyan-500/40 transition-all">
              <input type="checkbox" id="card-bind-toggle" checked class="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0" />
              <div class="text-[11px] text-slate-300">
                <span class="font-bold text-white">บันทึกข้อมูลบัตรไว้ใช้ครั้งถัดไป (1-Click Binding)</span>
                <div class="text-[10px] text-slate-500">เข้ารหัส Tokenized 256-Bit ปลอดภัยตามมาตรฐานสากล</div>
              </div>
            </label>

            <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/[0.06]">
              <span class="flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-cyan-400"></i> 3D Secure 2.0</span>
              <span class="flex items-center gap-1"><i data-lucide="lock" class="w-3.5 h-3.5 text-emerald-400"></i> PCI-DSS Level 1</span>
              <span>ค่าธรรมเนียม 0%</span>
            </div>

            <div id="card-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
            <button id="btn-pay-card" onclick="processCardPayment()" class="btn-cyber-primary w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 transition-all">
              <i data-lucide="lock" class="w-4 h-4"></i>
              <span>ชำระเงินปลอดภัยผ่าน 3D Secure</span>
            </button>
          </div>

        </div>

        <!-- Right Column: Wallet Telemetry & Service Status (5 Cols) -->
        <div class="lg:col-span-5 space-y-4">
          
          <!-- Wallet Card -->
          <div class="p-6 rounded-3xl bg-gradient-to-br from-[#0C1220] via-[#090D17] to-[#060910] border border-white/[0.1] shadow-xl relative overflow-hidden">
            <div class="absolute -right-10 -bottom-10 w-36 h-36 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
            
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs text-slate-400 font-medium">ยอดเงินคงเหลือในกระเป๋า</span>
              <span class="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px]">LIVE WALLET</span>
            </div>
            
            <div class="text-3xl font-heading font-black text-white mb-4">
              <span id="page-wallet-balance" class="text-[var(--accent)] font-mono">฿0.00</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
              <div class="flex items-center gap-2.5">
                <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
                <span class="text-slate-300">ความปลอดภัยของยอดเงิน</span>
              </div>
              <span class="text-emerald-400 font-bold font-mono">100% PROTECTED</span>
            </div>

            <div class="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <button onclick="window.navigateToPage('history')" class="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer">
                <i data-lucide="history" class="w-3.5 h-3.5 text-cyan-400"></i>
                <span>ดูประวัติการสั่งซื้อ</span>
              </button>
              <button onclick="window.navigateToPage('claim')" class="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer">
                <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-amber-400"></i>
                <span>แจ้งเคลมสินค้า</span>
              </button>
            </div>
          </div>

          <!-- Auto-Fulfillment Feature Card -->
          <div class="p-5 rounded-3xl bg-[#090D15]/80 border border-white/[0.08] space-y-3 text-xs">
            <h4 class="font-heading font-bold text-white flex items-center gap-2">
              <i data-lucide="zap" class="w-4 h-4 text-[var(--accent)]"></i>
              <span>ข้อดีของการเติมเงินเข้ากระเป๋า</span>
            </h4>
            <ul class="space-y-2 text-slate-400 text-[11px] leading-relaxed">
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"></i>
                <span>กดซื้อสินค้าได้ใน 1 วินาที ไม่ต้องรอสแกนจ่ายทีละชิ้น</span>
              </li>
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"></i>
                <span>ยอดเงินไม่มีวันหมดอายุ ใช้งานได้ตลอด 24 ชั่วโมง</span>
              </li>
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"></i>
                <span>บอทเช็คยอดเงินและสลิปอัตโนมัติ 0 วินาที</span>
              </li>
            </ul>
          </div>

          <!-- Need Help Card -->
          <div class="p-4 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/20 text-xs flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center font-bold">
                <i data-lucide="message-square" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="text-white font-bold">พบปัญหายอดเงินไม่เข้า?</div>
                <div class="text-[10px] text-slate-400">ทักหาแอดมินใน Discord ได้ตลอด 24 ชม.</div>
              </div>
            </div>
            <button onclick="window.navigateToPage('contact')" class="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs transition-all cursor-pointer">
              ติดต่อแอดมิน
            </button>
          </div>

        </div>

      </div>

    </div>

    <!-- ============================================================================
         VIEW 3: DEDICATED ORDER HISTORY & KEY VAULT (/history)
         ============================================================================ -->
    <div id="view-history" class="view-panel hidden py-4 sm:py-6">
      
      <!-- Top Title Strip -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.15)] shrink-0">
            <i data-lucide="history" class="w-6 h-6"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center gap-2">
              ประวัติการสั่งซื้อ & คลังคีย์
              <span id="history-total-badge" class="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold tracking-wider">0 รายการ</span>
            </h2>
            <p class="text-xs text-slate-400">ตรวจสอบคีย์ รหัสไอดีเกม และดาวน์โหลดใบเสร็จย้อนหลังได้ตลอด 24 ชั่วโมง</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.navigateToPage('home')" class="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            <span>กลับหน้าหลัก</span>
          </button>
        </div>
      </div>

      <!-- Search & Cloud Lookup Bar -->
      <div class="p-3 sm:p-4 rounded-2xl bg-[#090D15]/95 border border-white/[0.1] shadow-xl mb-6 flex flex-col sm:flex-row items-center gap-2.5">
        <div class="relative flex-1 w-full">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          <input 
            type="text" 
            id="history-search-input"
            oninput="window.handleHistorySearch(event)"
            onkeydown="if(event.key==='Enter') window.Shop?.historyModal?.searchCloudOrder()"
            placeholder="ค้นหาด้วยรหัสออเดอร์ (เช่น WX-371156) หรือชื่อสินค้า..." 
            class="w-full h-11 pl-10 pr-4 rounded-xl bg-[#060910] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] transition-all font-mono"
          />
        </div>
        <button 
          onclick="window.Shop?.historyModal?.searchCloudOrder()" 
          class="w-full sm:w-auto h-11 px-5 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-sm"
          title="ค้นหาออเดอร์จากฐานข้อมูลเซิร์ฟเวอร์"
        >
          <i data-lucide="cloud" class="w-4 h-4"></i>
          <span>ค้นหาในระบบคลาวด์</span>
        </button>
      </div>

      <!-- Orders List Container -->
      <div id="history-orders-container" class="space-y-4">
        <!-- Rendered via HistoryModalComponent or renderFullHistoryPage -->
      </div>

    </div>

    <!-- ============================================================================
         VIEW 4: DEDICATED WARRANTY CLAIMS PORTAL (/claim)
         ============================================================================ -->
    <div id="view-claim" class="view-panel hidden py-4 sm:py-6 max-w-4xl mx-auto">
      
      <!-- Top Title Strip -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)] shrink-0">
            <i data-lucide="shield-alert" class="w-6 h-6"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center gap-2">
              ศูนย์บริการแจ้งเคลม & ประกันสินค้า
              <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold tracking-wider">WARRANTY 24/7</span>
            </h2>
            <p class="text-xs text-slate-400">ระบบส่งเรื่องเคลมสินค้าอัตโนมัติ รวดเร็ว ติดตามสถานะได้ตลอด 24 ชม.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.navigateToPage('home')" class="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            <span>กลับหน้าหลัก</span>
          </button>
        </div>
      </div>

      <!-- Warranty Guarantee Alert -->
      <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/20 mb-6 flex items-start gap-3.5 text-xs text-slate-300">
        <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
        </div>
        <div>
          <div class="font-bold text-white mb-0.5">รับประกันคุ้มครอง 100% ตามเงื่อนไขของแต่ละสินค้า</div>
          <div class="text-[11px] text-slate-400 leading-relaxed">
            หากรหัสที่ได้รับใช้งานไม่ได้ หรือมีปัญหาภายในระยะเวลารับประกัน กรุณากรอกรหัสคำสั่งซื้อด้านล่างเพื่อส่งเรื่องตรวจสอบ แอดมินจะเปลี่ยนรหัสใหม่ให้โดยเร็วที่สุด
          </div>
        </div>
      </div>

      <!-- Claim Form Card -->
      <div class="bg-[#090D15]/95 rounded-3xl border border-white/[0.1] shadow-2xl p-6 sm:p-8 space-y-5 backdrop-blur-2xl">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">รหัสคำสั่งซื้อ (Order ID):</label>
          <input type="text" id="claim-order-id" placeholder="เช่น WX-371156" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-amber-400 text-xs text-white font-mono focus:outline-none transition-all" />
          <p class="text-[10px] text-slate-500 mt-1">สามารถดูรหัสออเดอร์ได้จากหน้า "ประวัติคำสั่งซื้อ"</p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">หมวดหมู่ปัญหา:</label>
          <select id="claim-reason" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-amber-400 text-xs text-white focus:outline-none transition-all">
            <option value="รหัสใช้งานไม่ได้ / รหัสไม่ถูกต้อง">รหัสใช้งานไม่ได้ / รหัสไม่ถูกต้อง (Invalid Key)</option>
            <option value="สินค้าโดนดึงคืนก่อนหมดอายุ">สินค้าโดนดึงคืนก่อนหมดอายุ (Account Revoked)</option>
            <option value="ลิงก์ Nitro ไม่สามารถเปิดรับได้">ลิงก์ Nitro ไม่สามารถเปิดรับได้ (Invalid Gift Link)</option>
            <option value="บริการปั๊ม / บูสต์ไม่ครบตามจำนวน">บริการปั๊ม / บูสต์ไม่ครบตามจำนวน (Service Incomplete)</option>
            <option value="ปัญหาด้านการชำระเงิน / ยอดเงิน">ปัญหาด้านการชำระเงิน / ยอดเงิน (Payment Issue)</option>
            <option value="อื่นๆ">อื่นๆ (โปรดระบุรายละเอียดเพิ่มเติม)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">รายละเอียดปัญหาที่พบ:</label>
          <textarea id="claim-details" rows="4" placeholder="โปรดอธิบายปัญหาที่พบ เช่น รหัสขึ้นแจ้งเตือนว่าอย่างไร เพื่อให้ทีมงานแก้ไขได้รวดเร็วที่สุด..." class="w-full p-3.5 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-amber-400 text-xs text-white focus:outline-none transition-all resize-none"></textarea>
        </div>

        <button onclick="window.Shop?.modals?.submitClaim()" class="btn-cyber-primary w-full h-12 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95 transition-all">
          <i data-lucide="send" class="w-4 h-4"></i>
          <span>ส่งเรื่องเคลมประกันทันที</span>
        </button>
      </div>

    </div>

    <!-- ============================================================================
         VIEW 5: FREQUENTLY ASKED QUESTIONS (/faq)
         ============================================================================ -->
    <div id="view-faq" class="view-panel hidden py-4 sm:py-6 max-w-4xl mx-auto">
      
      <!-- Top Title Strip -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.15)] shrink-0">
            <i data-lucide="help-circle" class="w-6 h-6"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-heading font-extrabold text-white">คำถามที่พบบ่อย (FAQ)</h2>
            <p class="text-xs text-slate-400">รวบรวมคำตอบสำหรับทุกข้อสงสัยเกี่ยวกับการใช้งาน การชำระเงิน และการรับประกัน</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.navigateToPage('home')" class="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            <span>กลับหน้าหลัก</span>
          </button>
        </div>
      </div>

      <!-- FAQ Accordions -->
      <div class="space-y-3.5 text-xs">
        
        <details class="group p-5 rounded-2xl bg-[#090D15]/90 border border-white/[0.08] transition-all open:border-cyan-500/40 open:bg-[#0B111D]">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none">
            <span class="flex items-center gap-2.5">
              <i data-lucide="zap" class="w-4 h-4 text-[var(--accent)]"></i>
              <span>สั่งซื้อสินค้าแล้วได้รับสินค้าอย่างไร และใช้เวลานานแค่ไหน?</span>
            </span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
          </summary>
          <div class="mt-3.5 pt-3.5 border-t border-white/[0.06] text-slate-300 leading-relaxed text-[11px] space-y-1.5">
            <p>ระบบของ NYX9 STUDIO เป็นระบบตัดยอดและจัดส่งอัตโนมัติ (Instant Auto-Delivery) 100%</p>
            <p>เมื่อทำรายการชำระเงินเรียบร้อย รหัสคีย์ ดิจิทัลไอดี หรือลิงก์รับสินค้าจะปรากฏขึ้นบนหน้าจอทันทีใน 1-3 วินาที และจะถูกบันทึกไว้ในหน้า <b>"ประวัติการสั่งซื้อ"</b> ของคุณตลอดไป สามารถกลับมาคัดลอกได้ตลอด 24 ชม.</p>
          </div>
        </details>

        <details class="group p-5 rounded-2xl bg-[#090D15]/90 border border-white/[0.08] transition-all open:border-cyan-500/40 open:bg-[#0B111D]">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none">
            <span class="flex items-center gap-2.5">
              <i data-lucide="wallet" class="w-4 h-4 text-emerald-400"></i>
              <span>เติมเงินรองรับช่องทางใดบ้าง และมีค่าธรรมเนียมหรือไม่?</span>
            </span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
          </summary>
          <div class="mt-3.5 pt-3.5 border-t border-white/[0.06] text-slate-300 leading-relaxed text-[11px] space-y-1.5">
            <p>เรารองรับ 4 ช่องทางหลัก ได้แก่ <b>พร้อมเพย์ QR Code</b>, <b>ซองของขวัญ TrueMoney Wallet</b>, <b>โอนผ่านบัญชีธนาคาร (กสิกรไทย)</b>, และ <b>โอนผ่านบัญชีธนาคาร</b></p>
            <p>ทุกช่องทาง <b>ฟรีค่าธรรมเนียม 0%</b> ยอดเงินเข้ากระเป๋าเต็มจำนวนไม่มีหัก</p>
          </div>
        </details>

        <details class="group p-5 rounded-2xl bg-[#090D15]/90 border border-white/[0.08] transition-all open:border-cyan-500/40 open:bg-[#0B111D]">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none">
            <span class="flex items-center gap-2.5">
              <i data-lucide="shield-check" class="w-4 h-4 text-cyan-400"></i>
              <span>การรับประกันสินค้าครอบคลุมอะไรบ้าง และเคลมได้อย่างไร?</span>
            </span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
          </summary>
          <div class="mt-3.5 pt-3.5 border-t border-white/[0.06] text-slate-300 leading-relaxed text-[11px] space-y-1.5">
            <p>สินค้าทุกรายการรับประกันของแท้ 100% ตลอดระยะเวลาที่ระบุไว้ในรายละเอียดสินค้า หากได้รับรหัสที่ใช้งานไม่ได้ หรือเกิดปัญหาจากการทำงานของระบบ สามารถเข้าไปที่หน้า <b>"แจ้งเคลม & ประกัน"</b> เพื่อระบุ Order ID และรับการเปลี่ยนสินค้าใหม่ได้ทันที</p>
          </div>
        </details>

        <details class="group p-5 rounded-2xl bg-[#090D15]/90 border border-white/[0.08] transition-all open:border-cyan-500/40 open:bg-[#0B111D]">
          <summary class="flex items-center justify-between font-bold text-white cursor-pointer list-none">
            <span class="flex items-center gap-2.5">
              <i data-lucide="sparkles" class="w-4 h-4 text-indigo-400"></i>
              <span>Discord Nitro และบริการปั๊มคน ต้องให้รหัสผ่านบัญชีหรือไม่?</span>
            </span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
          </summary>
          <div class="mt-3.5 pt-3.5 border-t border-white/[0.06] text-slate-300 leading-relaxed text-[11px] space-y-1.5">
            <p><b>ไม่ต้องให้รหัสผ่านบัญชีเด็ดขาด!</b> ปลอดภัยต่อบัญชี 100%</p>
            <p>Discord Nitro จะจัดส่งในรูปแบบ Gift Link อย่างเป็นทางการ ลูกค้าสามารถกดรับเข้าบัญชีตัวเองได้โดยตรง ส่วนบริการบูสต์หรือดึงคนเข้าเซิร์ฟเวอร์ ใช้เพียงลิงก์คำเชิญ (Invite Link) เท่านั้น</p>
          </div>
        </details>

      </div>

    </div>

    <!-- ============================================================================
         VIEW 6: TERMS & CONDITIONS (/terms)
         ============================================================================ -->
    <div id="view-terms" class="view-panel hidden py-4 sm:py-6 max-w-4xl mx-auto">
      
      <!-- Top Title Strip -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.15)] shrink-0">
            <i data-lucide="file-text" class="w-6 h-6"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-heading font-extrabold text-white">เงื่อนไขและข้อตกลง (Terms of Service)</h2>
            <p class="text-xs text-slate-400">ข้อกำหนดในการสั่งซื้อและการใช้งานระบบของ NYX9 STUDIO</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.navigateToPage('home')" class="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            <span>กลับหน้าหลัก</span>
          </button>
        </div>
      </div>

      <div class="bg-[#090D15]/95 rounded-3xl border border-white/[0.1] p-6 sm:p-8 space-y-6 text-xs text-slate-300 leading-relaxed backdrop-blur-2xl">
        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-[var(--accent)]">1. บทนำและขอบเขตการให้บริการ</h4>
          <p class="text-slate-400">การเข้าถึงหรือใช้งานเว็บไซต์ NYX9 STUDIO ถือว่าท่านตกลงและยอมรับข้อกำหนดทั้งหมดในเอกสารฉบับนี้ หากท่านไม่เห็นด้วย โปรดยุติการทำรายการบนระบบ</p>
        </section>

        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-[var(--accent)]">2. การจัดส่งสินค้าดิจิทัลและการชำระเงิน</h4>
          <p class="text-slate-400">สินค้าทั้งหมดในระบบเป็นสินค้าดิจิทัล (Digital Goods) จัดส่งผ่านระบบคลังคีย์อัตโนมัติทันทีหลังยืนยันการชำระเงิน เมื่อสินค้าได้รับการส่งมอบและเข้าสู่คลังรหัสของท่านแล้ว จะไม่สามารถยกเลิกคำสั่งซื้อได้ เว้นแต่สินค้าชำรุดและอยู่ภายใต้เงื่อนไขการรับประกัน</p>
        </section>

        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-[var(--accent)]">3. นโยบายการรับประกันและการเปลี่ยนสินค้า</h4>
          <p class="text-slate-400">สินค้ามีระยะเวลารับประกันตามที่ระบุไว้ในหน้ารายการสินค้าแต่ละชนิด การเคลมต้องยื่นผ่านระบบ "แจ้งเคลม & ประกัน" พร้อมระบุ Order ID ที่ถูกต้อง ทางร้านขอสงวนสิทธิ์ไม่รับเคลมในกรณีที่ลูกค้านำรหัสไปแจกจ่าย หรือใช้งานผิดวัตถุประสงค์จนถูกระงับจากทางผู้ให้บริการภายนอก</p>
        </section>

        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-[var(--accent)]">4. การป้องกันการทุจริต (Anti-Fraud Policy)</h4>
          <p class="text-slate-400">ห้ามมิให้ผู้ใช้งานนำสลิปปลอม สลิปซ้ำ หรือพยายามใช้สคริปต์อัตโนมัติในการโจมตีระบบ ระบบมีกลไกตรวจสอบรหัสอ้างอิงธุรกรรม (TransRef) แบบ Real-time การพยายามทุจริตจะส่งผลให้ถูกระงับบัญชีถาวรและดำเนินคดีตามกฎหมาย</p>
        </section>
      </div>

    </div>

    <!-- ============================================================================
         VIEW 7: PRIVACY POLICY (/privacy)
         ============================================================================ -->
    <div id="view-privacy" class="view-panel hidden py-4 sm:py-6 max-w-4xl mx-auto">
      
      <!-- Top Title Strip -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] shrink-0">
            <i data-lucide="lock" class="w-6 h-6"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-heading font-extrabold text-white">นโยบายความเป็นส่วนตัว (Privacy Policy)</h2>
            <p class="text-xs text-slate-400">มาตรฐานการปกป้องและคุ้มครองข้อมูลส่วนบุคคลของลูกค้า</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.navigateToPage('home')" class="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            <span>กลับหน้าหลัก</span>
          </button>
        </div>
      </div>

      <div class="bg-[#090D15]/95 rounded-3xl border border-white/[0.1] p-6 sm:p-8 space-y-6 text-xs text-slate-300 leading-relaxed backdrop-blur-2xl">
        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-emerald-400">1. ข้อมูลที่เราจัดเก็บ</h4>
          <p class="text-slate-400">เมื่อท่านเข้าสู่ระบบด้วย Discord เราจะจัดเก็บเฉพาะ Discord Username, Discord ID, และ Avatar URL สำหรับแสดงผลเท่านั้น เราไม่มีสิทธิ์เข้าถึงรหัสผ่านหรือข้อความส่วนตัวของท่าน และสำหรับข้อมูลการชำระเงิน เราจัดเก็บเฉพาะรหัสอ้างอิงสลิป (TransRef) เพื่อตรวจสอบความถูกต้อง</p>
        </section>

        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-emerald-400">2. วัตถุประสงค์ในการประมวลผลข้อมูล</h4>
          <p class="text-slate-400">ข้อมูลของท่านถูกนำไปใช้เพื่อ: (1) ยืนยันคำสั่งซื้อและจัดส่งสินค้าดิจิทัลไปยังคลังรหัสของท่าน (2) จัดการยอดเงินในกระเป๋าเงิน (Wallet) (3) ให้บริการหลังการขายและการเคลมประกันสินค้า</p>
        </section>

        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-emerald-400">3. การรักษาความปลอดภัยของข้อมูล</h4>
          <p class="text-slate-400">ระบบทำงานบนมาตรฐานความปลอดภัยระดับสูง การเชื่อมต่อทั้งหมดเข้ารหัสผ่าน SSL/TLS 256-bit และข้อมูลในฐานข้อมูลถูกจำกัดสิทธิ์การเข้าถึงผ่าน Row Level Security (RLS) อย่างเข้มงวด</p>
        </section>

        <section class="space-y-2">
          <h4 class="font-bold text-white text-sm text-emerald-400">4. การไม่เปิดเผยข้อมูลแก่บุคคลภายนอก</h4>
          <p class="text-slate-400">เรายึดมั่นในนโยบายไม่ขาย ไม่เผยแพร่ และไม่ส่งต่อข้อมูลส่วนบุคคลของท่านให้แก่บุคคลภายนอกโดยเด็ดขาด</p>
        </section>
      </div>

    </div>

    <!-- ============================================================================
         VIEW 8: CONTACT & COMMUNITY (/contact)
         ============================================================================ -->
    <div id="view-contact" class="view-panel hidden py-4 sm:py-6 max-w-4xl mx-auto">
      
      <!-- Top Title Strip -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.15)] shrink-0">
            <i data-lucide="message-circle" class="w-6 h-6"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-heading font-extrabold text-white">ติดต่อแอดมิน & คอมมูนิตี้</h2>
            <p class="text-xs text-slate-400">ทีมงาน NYX9 STUDIO พร้อมดูแลและให้ความช่วยเหลือตลอด 24 ชั่วโมง</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.navigateToPage('home')" class="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
            <span>กลับหน้าหลัก</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <!-- Discord Card -->
        <div class="p-6 rounded-3xl bg-[#090D15]/95 border border-[#5865F2]/30 shadow-2xl space-y-4 flex flex-col justify-between backdrop-blur-2xl">
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
              <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.288a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <h4 class="text-base font-bold text-white">Discord Official Server</h4>
            <p class="text-xs text-slate-400 leading-relaxed">
              ช่องทางหลักสำหรับการพูดคุย แจ้งปัญหา เปิด Ticket ขอความช่วยเหลือ และติดตามโปรโมชั่นอัปเดตใหม่ๆ แบบเรียลไทม์
            </p>
          </div>
          <a href="https://discord.gg/NTPcxKHrag" target="_blank" data-bind="discordCommunityUrl" class="w-full h-11 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#5865F2]/25">
            <i data-lucide="external-link" class="w-4 h-4"></i>
            <span>เข้าร่วม Discord Official</span>
          </a>
        </div>

        <!-- Working Hours & Guidelines Card -->
        <div class="p-6 rounded-3xl bg-[#090D15]/95 border border-white/[0.08] shadow-2xl space-y-4 flex flex-col justify-between backdrop-blur-2xl">
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <i data-lucide="clock" class="w-6 h-6"></i>
            </div>
            <h4 class="text-base font-bold text-white">เวลาทำการและการให้บริการ</h4>
            <ul class="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>ระบบตัดยอด & สั่งซื้ออัตโนมัติ: <strong class="text-white">24 ชั่วโมง</strong></span>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>แอดมินตอบแชท & ตรวจสอบการเคลม: <strong class="text-white">ทุกวัน 10:00 - 02:00 น.</strong></span>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>ระยะเวลาตอบกลับเฉลี่ย: <strong class="text-white">ภายใน 5-15 นาที</strong></span>
              </li>
            </ul>
          </div>

          <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-slate-400">
            💡 คำแนะนำ: หากติดต่อเรื่องออเดอร์ โปรดเตรียมรหัสคำสั่งซื้อ (เช่น WX-xxxxxx) ไว้ล่วงหน้า
          </div>
        </div>

      </div>

    </div>
`;

html = html.substring(0, mainStartIndex + mainStartTag.length) + viewsHTML + html.substring(mainEndIndex);
console.log('✓ Main container updated with all 8 dedicated page views');

// ==============================================================================
// 3. UPDATE FOOTER: Wire all 10 items in "เมนูลัดและบริการ"
// ==============================================================================
const footerCol2Regex = /<!-- Col 2 \(md:col-span-4\): เมนูลัดและบริการ[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newFooterCol2HTML = `<!-- Col 2 (md:col-span-4): เมนูลัดและบริการ (Direct SPA Route Links) -->
      <div class="md:col-span-4">
        <div class="flex items-center gap-2 mb-3.5">
          <i data-lucide="compass" class="w-4 h-4 text-[var(--accent)]"></i>
          <h5 class="text-white font-heading font-extrabold uppercase tracking-wider text-[12px]">เมนูลัดและบริการ</h5>
        </div>
        <div class="grid grid-cols-2 gap-4 text-[12px]">
          <!-- Sub-Col 1: เมนูบริการหลัก -->
          <div class="space-y-2.5 font-medium">
            <button onclick="window.navigateToPage('home')" class="w-full text-left text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>หน้าหลัก</span>
            </button>
            <button onclick="window.navigateToPage('home', '#category-filter-bar')" class="w-full text-left text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>รายการสินค้าทั้งหมด</span>
            </button>
            <button onclick="window.navigateToPage('topup')" class="w-full text-left text-slate-400 hover:text-[var(--accent)] hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>เติมเงินเข้าระบบ</span>
            </button>
            <button onclick="window.navigateToPage('history')" class="w-full text-left text-slate-400 hover:text-[var(--accent)] hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>ประวัติการสั่งซื้อ</span>
            </button>
            <button onclick="window.navigateToPage('claim')" class="w-full text-left text-slate-400 hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-amber-400 text-[10px]">&rsaquo;</span>
              <span>แจ้งเคลม &amp; ประกัน</span>
            </button>
          </div>

          <!-- Sub-Col 2: ช่วยเหลือ & ข้อตกลง -->
          <div class="space-y-2.5 font-medium">
            <button onclick="window.navigateToPage('faq')" class="w-full text-left text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>คำถามที่พบบ่อย (FAQ)</span>
            </button>
            <button onclick="window.navigateToPage('terms')" class="w-full text-left text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>เงื่อนไขและข้อตกลง</span>
            </button>
            <button onclick="window.navigateToPage('contact')" class="w-full text-left text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>ติดต่อแอดมิน</span>
            </button>
            <button onclick="window.navigateToPage('privacy')" class="w-full text-left text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>นโยบายความเป็นส่วนตัว</span>
            </button>
            <a href="admin.html" class="w-full text-left text-slate-400 hover:text-[var(--accent)] hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>ระบบหลังบ้านแอดมิน</span>
            </a>
          </div>
        </div>
      </div>`;

html = html.replace(footerCol2Regex, newFooterCol2HTML);
console.log('✓ Footer quick menu wired with all 10 SPA routes');

// Save updated index.html & sync to 200.html
fs.writeFileSync(indexHtmlPath, html, 'utf8');
fs.writeFileSync(p200Path, html, 'utf8');
console.log('✓ Saved to index.html and 200.html (identical)');

// ==============================================================================
// 4. INJECT SPA CLIENT ROUTER INTO app.js
// ==============================================================================
let appJs = fs.readFileSync(appJsPath, 'utf8');

const routerCode = `
// ==============================================================================
// 🌐 SPA CLIENT ROUTER (MULTI-PAGE ARCHITECTURE WITH HISTORY API)
// ==============================================================================
window.navigateToPage = function(page, hash = '') {
  const views = ['home', 'topup', 'history', 'claim', 'faq', 'terms', 'privacy', 'contact'];
  const target = views.includes(page) ? page : 'home';

  // 1. Toggle Active View Panel
  views.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) {
      if (v === target) {
        el.classList.remove('hidden');
        el.classList.add('block');
      } else {
        el.classList.remove('block');
        el.classList.add('hidden');
      }
    }
  });

  // 2. Toggle Back-to-Home Button in Header
  const backBtn = document.getElementById('nav-back-home-btn');
  if (backBtn) {
    if (target === 'home') {
      backBtn.classList.add('hidden');
      backBtn.classList.remove('flex');
    } else {
      backBtn.classList.remove('hidden');
      backBtn.classList.add('flex');
    }
  }

  // 3. Update Browser URL
  const targetPath = target === 'home' ? '/' : '/' + target;
  if (window.location.pathname !== targetPath) {
    try {
      window.history.pushState({ page: target }, '', targetPath);
    } catch(e) {}
  }

  // 4. Update Document Title
  const titles = {
    home: 'ร้านค้าไอดี & บริการ Discord อัตโนมัติ 24 ชม.',
    topup: 'เติมเงินเข้ากระเป๋า (Wallet Top-Up)',
    history: 'ประวัติการสั่งซื้อและคลังคีย์ (Order History)',
    claim: 'ศูนย์บริการแจ้งเคลม & ประกันสินค้า (Warranty & Claims)',
    faq: 'คำถามที่พบบ่อย (FAQ)',
    terms: 'เงื่อนไขและข้อตกลงการให้บริการ (Terms of Service)',
    privacy: 'นโยบายความเป็นส่วนตัว (Privacy Policy)',
    contact: 'ติดต่อแอดมินและฝ่ายบริการลูกค้า (Contact Support)'
  };
  document.title = (titles[target] || 'NYX9 STUDIO') + ' | NYX9 STUDIO';

  // 5. Scroll Action
  if (hash) {
    setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  } else {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // 6. Hook Page-Specific Initializers
  if (target === 'topup') {
    const balance = window.Shop?.store?.get("walletBalance") || 0;
    const pageBal = document.getElementById("page-wallet-balance");
    if (pageBal) pageBal.textContent = '฿' + balance.toFixed(2);
    const amt = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");
    if (window.Shop?.topupModal) window.Shop.topupModal.updatePromptPayQr(amt);
  } else if (target === 'history') {
    if (window.Shop?.historyModal) {
      window.Shop.historyModal.render();
    }
  }

  // 7. Re-initialize Lucide Icons
  if (window.lucide) window.lucide.createIcons();
};

// Listen to browser Back/Forward navigation
window.addEventListener('popstate', (e) => {
  const p = window.location.pathname.replace(/^\\//, '').toLowerCase();
  window.navigateToPage(p || 'home');
});

// Auto-route on initial page load
document.addEventListener('DOMContentLoaded', () => {
  const initPath = window.location.pathname.replace(/^\\//, '').toLowerCase();
  const known = ['topup', 'history', 'claim', 'faq', 'terms', 'privacy', 'contact'];
  if (known.includes(initPath)) {
    window.navigateToPage(initPath);
  }
});
`;

if (!appJs.includes('window.navigateToPage')) {
  appJs += '\n' + routerCode;
  fs.writeFileSync(appJsPath, appJs, 'utf8');
  console.log('✓ SPA Client Router appended to app.js');
} else {
  console.log('• app.js already contains navigateToPage');
}

console.log('🎉 Multi-Page System Deployed Successfully!');
