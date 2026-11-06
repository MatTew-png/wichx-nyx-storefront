const fs = require('fs');
const path = require('path');

// 1. Update index.html
const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Target Zone A to Zone C in navbar
const targetRegex = /<!-- ==========================================\s*ZONE A: SERVICES & SUPPORT[\s\S]*?<!-- Mobile Search Bar/;

const replacement = `<!-- ==========================================
             ZONE A: SERVICES & UTILITIES (Clean Minimalist)
             ========================================== -->
        <div class="hidden lg:flex items-center gap-1">
          <!-- Discord Services Calculator -->
          <button onclick="openDiscordServicesModal()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer font-medium" title="คำนวณราคา Discord Boost, Quests & Members">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-[#5865F2]"></i>
            <span>บริการดิสคอร์ด</span>
          </button>
        </div>

        <!-- Subtle Dot Separator -->
        <span class="hidden lg:inline-block w-1 h-1 rounded-full bg-slate-700/60 mx-1"></span>

        <!-- ==========================================
             ZONE B: COMMERCE & FINANCIAL CORE (Soft Integrated Surfaces)
             ========================================== -->
        <div class="flex items-center gap-1.5 sm:gap-2">
          <!-- Shopping Cart (Clean Tactile Action) -->
          <button onclick="toggleCartDrawer()" class="relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer group active:scale-95" title="ตะกร้าสินค้า">
            <div class="relative flex items-center justify-center">
              <i data-lucide="shopping-cart" class="w-4 h-4 text-[var(--accent)] group-hover:scale-110 transition-transform"></i>
              <span id="cart-badge-count" class="hidden">0</span>
            </div>
            <span class="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors hidden sm:inline">ตะกร้า</span>
          </button>

          <!-- Wallet Balance & Top-Up Pill -->
          <button onclick="openTopUpModal()" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(0,242,255,0.06)] hover:bg-[rgba(0,242,255,0.12)] transition-all group cursor-pointer active:scale-95" title="คลิกเพื่อเปิดหน้าเติมเงิน">
            <div class="w-5 h-5 rounded-md bg-[rgba(0,242,255,0.15)] text-[var(--accent)] flex items-center justify-center">
              <i data-lucide="wallet" class="w-3 h-3"></i>
            </div>
            <div class="text-left">
              <div class="text-[9px] text-slate-400 font-mono-val leading-none">กระเป๋าเงิน</div>
              <div id="user-wallet-balance" class="text-xs font-mono-val font-extrabold text-[var(--accent)] leading-tight">฿500.00</div>
            </div>
            <span class="w-4 h-4 rounded-md bg-[var(--accent)] text-[#06080C] text-[10px] font-extrabold flex items-center justify-center ml-0.5 group-hover:scale-110 transition-transform">+</span>
          </button>
        </div>

        <!-- Subtle Dot Separator -->
        <span class="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-700/60 mx-1"></span>

        <!-- ==========================================
             ZONE C: IDENTITY & USER ACCOUNT DROPDOWN
             ========================================== -->
        <div class="flex items-center gap-1.5">
          <!-- Discord Auth Section (Login Button / Profile Dropdown) -->
          <div id="auth-section" class="relative flex items-center">
            <!-- Unauthenticated: Login with Discord -->
            <button id="btn-discord-login" onclick="handleDiscordLogin()" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all text-xs font-bold shadow-sm shadow-[#5865F2]/20 group cursor-pointer active:scale-95" title="เข้าสู่ระบบด้วย Discord">
              <svg class="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.288a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span class="hidden sm:inline">เข้าสู่ระบบด้วย Discord</span>
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
                <!-- Wallet Balance Row inside Dropdown -->
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
                <button onclick="window.handleMenuAction('history')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-left group">
                  <div class="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <i data-lucide="history" class="w-3.5 h-3.5"></i>
                  </div>
                  <div class="flex-1">
                    <div class="text-white font-semibold">ประวัติคำสั่งซื้อ & คลังรหัส</div>
                    <div class="text-[10px] text-slate-400">ดูรหัสสินค้าและใบเสร็จย้อนหลัง</div>
                  </div>
                </button>

                <!-- แจ้งเคลมสินค้า -->
                <button onclick="window.handleMenuAction('claim')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-left group">
                  <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
                  </div>
                  <div class="flex-1">
                    <div class="text-white font-semibold">แจ้งเคลมสินค้า (ประกัน)</div>
                    <div class="text-[10px] text-slate-400">ส่งเคลมรหัสที่มีปัญหาได้ทันที</div>
                  </div>
                </button>

                <!-- เติมเงินเข้ากระเป๋า -->
                <button onclick="window.handleMenuAction('topup')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-left group">
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
    </div>
  </header>

  <!-- Mobile Search Bar`;

if (!targetRegex.test(html)) {
  console.error('Target regex not matched in index.html');
  process.exit(1);
}

html = html.replace(targetRegex, replacement);
fs.writeFileSync(indexHtmlPath, html, 'utf8');

// Also update 200.html
const p200Path = path.join(__dirname, '..', '200.html');
fs.writeFileSync(p200Path, html, 'utf8');
console.log('✓ index.html and 200.html updated with Dropdown Menu & "ชุมชน" removed');

// 2. Update Navbar.js
const navbarJsPath = path.join(__dirname, '..', 'js', 'components', 'Navbar.js');
const newNavbarJs = `/**
 * ==============================================================================
 * NAVBAR COMPONENT (OOP CONTROLLER WITH USER DROPDOWN)
 * ==============================================================================
 */

class NavbarComponent {
  constructor(store) {
    this.store = store;
    this.initListeners();
    this.initGlobalBindings();
  }

  initListeners() {
    this.store.on("change:wallet", () => this.updateWalletUI());
    this.store.on("change:user", () => this.updateAuthUI());
    this.store.on("change:cart", () => this.updateCartBadge());
  }

  initGlobalBindings() {
    window.toggleUserMenu = (e) => {
      if (e) e.stopPropagation();
      const menu = document.getElementById("user-dropdown-menu");
      const chevron = document.getElementById("user-menu-chevron");
      if (!menu) return;
      const isHidden = menu.classList.contains("hidden");
      if (isHidden) {
        menu.classList.remove("hidden");
        if (chevron) chevron.classList.add("rotate-180");
      } else {
        menu.classList.add("hidden");
        if (chevron) chevron.classList.remove("rotate-180");
      }
    };

    window.handleMenuAction = (action) => {
      const menu = document.getElementById("user-dropdown-menu");
      const chevron = document.getElementById("user-menu-chevron");
      if (menu) menu.classList.add("hidden");
      if (chevron) chevron.classList.remove("rotate-180");

      if (action === "history") {
        if (typeof openHistoryModal === "function") openHistoryModal();
      } else if (action === "claim") {
        if (typeof openClaimModal === "function") openClaimModal();
      } else if (action === "topup") {
        if (typeof openTopUpModal === "function") openTopUpModal();
      } else if (action === "logout") {
        if (typeof handleLogout === "function") handleLogout();
      }
    };

    // Close on click outside
    if (typeof document !== "undefined") {
      document.addEventListener("click", (e) => {
        const authSec = document.getElementById("auth-section");
        const menu = document.getElementById("user-dropdown-menu");
        const chevron = document.getElementById("user-menu-chevron");
        if (authSec && menu && !authSec.contains(e.target)) {
          menu.classList.add("hidden");
          if (chevron) chevron.classList.remove("rotate-180");
        }
      });
    }
  }

  updateWalletUI() {
    const balance = this.store.get("walletBalance") || 0;
    const el = document.getElementById("user-wallet-balance");
    if (el) el.textContent = \`฿\${balance.toFixed(2)}\`;

    const cartBal = document.getElementById("cart-wallet-balance");
    if (cartBal) cartBal.textContent = \`฿\${balance.toFixed(2)}\`;

    const menuBal = document.getElementById("menu-wallet-balance");
    if (menuBal) menuBal.textContent = \`฿\${balance.toFixed(2)}\`;
  }

  updateAuthUI() {
    const user = this.store.get("user");
    const loginBtn = document.getElementById("btn-discord-login");
    const profileBadge = document.getElementById("user-profile-badge");
    const avatarImg = document.getElementById("user-avatar-img");
    const nameEl = document.getElementById("user-display-name");

    // Dropdown elements
    const menuAvatar = document.getElementById("menu-avatar-img");
    const menuUsername = document.getElementById("menu-username");
    const menuDiscordId = document.getElementById("menu-discord-id");
    const menuWallet = document.getElementById("menu-wallet-balance");
    const menuAdminLink = document.getElementById("menu-admin-link");

    const adminIds = (window.storeConfig && window.storeConfig.adminDiscordIds) || ["483398326159671326", "422611554475835394"];
    const isAdmin = user && (user.role === "admin" || adminIds.includes(String(user.discordId)));
    const balance = this.store.get("walletBalance") || 0;

    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (profileBadge) {
        profileBadge.classList.remove("hidden");
        profileBadge.classList.add("flex");
      }
      const avatarUrl = user.avatarUrl || "assets/logo.png";
      const username = user.username || "Discord User";

      if (avatarImg) avatarImg.src = avatarUrl;
      if (nameEl) nameEl.textContent = username;

      if (menuAvatar) menuAvatar.src = avatarUrl;
      if (menuUsername) menuUsername.textContent = username;
      if (menuDiscordId) menuDiscordId.textContent = user.discordId ? \`ID: \${user.discordId}\` : (user.email || "Discord Member");
      if (menuWallet) menuWallet.textContent = \`฿\${balance.toFixed(2)}\`;

      if (menuAdminLink) {
        if (isAdmin) {
          menuAdminLink.classList.remove("hidden");
          menuAdminLink.classList.add("flex");
        } else {
          menuAdminLink.classList.add("hidden");
          menuAdminLink.classList.remove("flex");
        }
      }
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (profileBadge) {
        profileBadge.classList.add("hidden");
        profileBadge.classList.remove("flex");
      }
      const menu = document.getElementById("user-dropdown-menu");
      if (menu) menu.classList.add("hidden");
    }

    if (window.lucide) lucide.createIcons();
  }

  updateCartBadge() {
    const cart = this.store.get("cart") || [];
    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const badge = document.getElementById("cart-badge-count");
    if (!badge) return;

    if (totalCount > 0) {
      badge.textContent = totalCount;
      badge.className = "absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-[#06080C] text-[10px] font-mono-val font-extrabold flex items-center justify-center animate-pulse shadow-md shadow-[var(--accent)]/40";
    } else {
      badge.className = "hidden";
    }
  }
}

window.NavbarComponent = NavbarComponent;
`;

fs.writeFileSync(navbarJsPath, newNavbarJs, 'utf8');
console.log('✓ Navbar.js updated with dropdown controller');
