/**
 * ==============================================================================
 * 🚀 NYX9 STUDIO — MAIN APPLICATION BOOTSTRAPPER (OOP COORDINATOR)
 * ==============================================================================
 * สถาปัตยกรรม Modular OOP & Component-Based:
 * - js/core/Store.js                     -> Reactive State Container
 * - js/services/AuthService.js           -> Discord OAuth & Profiles
 * - js/services/CatalogService.js        -> Live Products & Filters
 * - js/services/PaymentService.js        -> 4-Gateway Engine (PromptPay, TrueMoney, Bank, Card)
 * - js/services/CheckoutService.js       -> Atomic Orders & Claims
 * - js/services/HistoryService.js        -> Order History & Vault Retrieval
 * - js/components/Navbar.js              -> Capsule Navigation & User Telemetry
 * - js/components/HeroSection.js         -> Carousel & Metric Highlights
 * - js/components/CatalogView.js         -> Filter Pills & Product Cards
 * - js/components/CartDrawer.js          -> Slide-out Drawer & Promo Code Engine
 * - js/components/TopUpModal.js          -> 4-Gateway Top-Up Modal
 * - js/components/HistoryModal.js        -> Past Keys & Receipt Vault Modal
 * - js/components/DiscordServiceModal.js -> Boost & Nitro Quests Calculator
 * - js/components/Modals.js              -> Instant Delivery, Custom Order, Claims
 * - js/components/SocialProof.js         -> Recent Order Notifications Ticker
 * ==============================================================================
 */

class ShopApp {
  constructor() {
    this.store = window.AppStore;
    
    // Services
    this.auth = new window.AuthService(this.store);
    this.catalogService = new window.CatalogService(this.store);
    this.paymentService = new window.PaymentService(this.store);
    this.checkoutService = new window.CheckoutService(this.store);
    this.historyService = new window.HistoryService(this.store);

    // Components
    this.navbar = new window.NavbarComponent(this.store);
    this.hero = new window.HeroSectionComponent(this.store);
    this.catalogView = new window.CatalogViewComponent(this.store);
    this.cartManager = new window.CartDrawerComponent(this.store, this.checkoutService);
    this.topupModal = new window.TopUpModalComponent(this.store, this.paymentService);
    this.historyModal = new window.HistoryModalComponent(this.store, this.historyService);
    this.restockModal = window.RestockModalComponent ? new window.RestockModalComponent(this.store) : null;
    this.discordServiceModal = new window.DiscordServiceModalComponent(this.store);
    this.modals = new window.ModalsComponent(this.store, this.checkoutService);
    this.socialProof = new window.SocialProofComponent();
    this.ambientWaves = window.AmbientWavesEngine ? new window.AmbientWavesEngine() : null;
    this.security = window.SecurityEngine ? new window.SecurityEngine(this.store) : null;
  }

  async init() {
    console.info("⚡ [NYX9 STUDIO] Initializing Modular OOP Storefront...");
    
    // 1. เรนเดอร์ UI ทันทีไม่ต้องรอ Network (Optimistic Instant Rendering)
    this.hero.render();
    this.catalogView.render();
    this.navbar.updateWalletUI();
    this.navbar.updateCartBadge();
    this.renderAcceptedPaymentsFooter();
    if (window.lucide) lucide.createIcons();

    // 2. เชื่อมต่อ Supabase
    if (window.storeConfig?.supabase && window.SupabaseAdapter) {
      const { url, anonKey } = window.storeConfig.supabase;
      window.SupabaseAdapter.init(url, anonKey);
    }

    // 3. ซิงค์ข้อมูลสินค้าและเซสชันใน Background อย่างปลอดภัย
    try {
      await this.catalogService.loadCatalog();
    } catch (e) {
      console.warn("[BACKGROUND SYNC] Catalog fetch error:", e);
    }

    try {
      await this.auth.init();
    } catch (e) {
      console.warn("[BACKGROUND SYNC] Auth session error:", e);
    }

    this.socialProof.init();
    this.initCardSpotlight();
    this.animateMetricsCountUp();
    if (window.lucide) lucide.createIcons();
    console.info("✅ [NYX9 STUDIO] Storefront Ready!");
  }

  initCardSpotlight() {
    // ข้ามคำนวณบนมือถือ/แท็บเล็ตเพื่อประหยัดทรัพยากร 100%
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let rafId = null;
    document.addEventListener("mousemove", (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const card = e.target.closest?.(".product-card");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      });
    }, { passive: true });
  }

  animateMetricsCountUp() {
    const runCount = (id, target, suffix = "", duration = 1200) => {
      const el = document.getElementById(id);
      if (!el) return;
      const startTime = performance.now();
      const frame = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const cur = Math.floor(target * ease);
        el.textContent = cur.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(frame);
    };

    setTimeout(() => {
      runCount("live-visitors-today", 12450);
      runCount("live-visitors-today-m", 12450);
      runCount("live-orders-today", 850);
      runCount("live-orders-today-m", 850);
      runCount("live-total-members", 45000, "+");
      runCount("live-total-members-m", 45000, "+");
    }, 150);
  }

  renderAcceptedPaymentsFooter() {
    const container = document.getElementById("footer-accepted-payments");
    if (!container) return;

    const paymentCards = [
      { name: "PromptPay QR", icon: "qr-code", tag: "สแกนฟรี 0%" },
      { name: "TrueMoney", icon: "wallet", tag: "ซอง/วอลเล็ท" },
      { name: "โอนธนาคาร", icon: "landmark", tag: "ทุกธนาคาร" },
      { name: "บัตรเครดิต/เดบิต", icon: "credit-card", tag: "Visa / MC" },
      { name: "Crypto LTC", icon: "coins", tag: "Litecoin" },
      { name: "e-Receipt", icon: "receipt", tag: "ใบเสร็จออโต้" }
    ];

    container.innerHTML = paymentCards.map(p => `
      <div class="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[var(--accent)]/40 hover:bg-white/[0.06] transition-all group cursor-default">
        <div class="w-6 h-6 rounded-lg bg-[rgba(0,242,255,0.08)] group-hover:bg-[rgba(0,242,255,0.18)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
          <i data-lucide="${p.icon}" class="w-3.5 h-3.5"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-bold text-white truncate leading-tight">${p.name}</div>
          <div class="text-[9px] text-slate-400 font-mono-val truncate">${p.tag}</div>
        </div>
      </div>
    `).join("");

    if (window.lucide) lucide.createIcons();
  }
}

// Global Application Instance
window.Shop = new ShopApp();

// Boot immediately or on DOM Ready (Guaranteed Execution)
function bootShopApp() {
  if (window.Shop && !window.Shop._hasBooted) {
    window.Shop._hasBooted = true;
    window.Shop.init();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootShopApp);
} else {
  bootShopApp();
}

// ==============================================================================
// 🔗 BACKWARD-COMPATIBLE GLOBAL BRIDGES (FOR HTML ONCLICK HANDLERS)
// ==============================================================================

// Top-Up Bridges
window.openTopUpModal = (amt) => window.Shop?.topupModal?.open(amt);
window.closeTopUpModal = () => window.Shop?.topupModal?.close();
window.switchTopUpGateway = (tab) => window.Shop.topupModal.switchGateway(tab);
window.switchTopUpTab = window.switchTopUpGateway;
window.setPromptPayPreset = (amt) => {
  const el = document.getElementById("promptpay-amount-input");
  if (el) el.value = amt;
  window.Shop.topupModal.updatePromptPayQr(amt);
  document.querySelectorAll(".promptpay-preset-btn").forEach(btn => {
    const val = parseFloat(btn.getAttribute("data-amount"));
    if (val === amt) {
      btn.className = "promptpay-preset-btn active h-9 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold border border-[var(--accent)] shadow-[0_0_12px_rgba(0,242,255,0.3)] text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    } else {
      btn.className = "promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    }
  });
};
window.handlePromptPayAmountInput = (amt) => window.Shop.topupModal.updatePromptPayQr(amt);
window.verifyPromptPaySlip = () => window.Shop.topupModal.verifyPromptPay();
window.redeemTrueMoneyVoucher = () => window.Shop.topupModal.redeemTrueMoney();
window.copyTrueMoneyPhone = () => {
  const phone = window.storeConfig?.paymentDetails?.truemoney?.phoneNumber || "098-765-4321";
  navigator.clipboard.writeText(phone.replace(/-/g, "")).then(() => window.UI?.toast(`📱 คัดลอกเบอร์ TrueMoney ${phone} แล้ว!`, "success"));
};
window.copyBankAccount = () => {
  const acc = window.storeConfig?.paymentDetails?.bank_transfer?.accountNumber || "142-8-91234-5";
  navigator.clipboard.writeText(acc.replace(/-/g, "")).then(() => window.UI?.toast(`📋 คัดลอกเลขบัญชี ${acc} แล้ว!`, "success"));
};
window.verifyBankTransferSlip = () => window.Shop.topupModal.verifyBankTransfer();

// Auth Bridges
window.handleDiscordLogin = () => window.Shop.auth.loginWithDiscord();
window.handleLogout = () => window.Shop.auth.logout();

// Cart & Checkout Bridges
window.toggleCartDrawer = () => window.Shop.cartManager.toggle();
window.applyCouponCode = () => window.Shop.cartManager.applyCoupon();
window.removeCouponCode = () => window.Shop.cartManager.removeCoupon();
window.executeCheckout = async () => {
  const btn = document.getElementById("btn-checkout-submit");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังตัดสต็อกและส่งมอบ...</span>`;
    if (window.lucide) lucide.createIcons();
  }
  try {
    const res = await window.Shop.checkoutService.executeCheckout();
    window.Shop.cartManager.toggle(); // Close drawer
    window.Shop.modals.showInstantDelivery(res);
  } catch (err) {
    window.UI?.toast(err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>ยืนยันการสั่งซื้อทันที</span> <i data-lucide="zap" class="w-4 h-4 fill-current"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }
};

// History & Key Vault Bridges
window.openHistoryModal = () => window.Shop?.historyModal?.open();
window.closeHistoryModal = () => window.Shop?.historyModal?.close();
window.handleHistorySearch = (e) => window.Shop.historyModal.filter(e.target.value);
window.copyHistoryKey = (key) => {
  window.Shop.historyService.copyToClipboard(key).then(() => {
    window.UI?.toast("คัดลอกคีย์เรียบร้อยแล้ว!", "success");
  });
};
window.quickClaimOrder = (orderId) => {
  window.Shop.historyModal.close();
  window.Shop.modals.openClaim();
  const input = document.getElementById("claim-order-id");
  if (input) input.value = orderId;
};

// --- NEW 4-KILLER BRIDGES ---

// 1. Restock Notification Bridge
window.openRestockNotifyModal = (id, title) => {
  if (window.Shop && window.Shop.restockModal) {
    window.Shop.restockModal.open(id, title);
  }
};

// 2. Smart Slip Reader Bridge
window.handleSlipFileSelect = (e) => {
  const file = e.target?.files?.[0];
  if (file && window.Shop?.topupModal) {
    window.Shop.topupModal.handleSlipFile(file);
  }
};

// 3. Cyberpunk Receipt Generator Bridges (Save PNG)
window.saveOrderReceiptPNG = async () => {
  const order = window.lastDeliveredOrder;
  if (!order) {
    window.UI?.toast("ไม่พบข้อมูลคำสั่งซื้อล่าสุด", "warning");
    return;
  }
  window.UI?.toast("📸 กำลังสร้างรูปภาพใบเสร็จความละเอียดสูง...", "info");
  try {
    if (window.ReceiptGenerator) {
      await window.ReceiptGenerator.generateReceiptPNG(order);
      window.UI?.toast("บันทึกรูปภาพใบเสร็จลงเครื่องเรียบร้อยแล้ว!", "success");
    }
  } catch (err) {
    window.UI?.toast("ไม่สามารถสร้างรูปภาพได้: " + err.message, "error");
  }
};

window.saveOrderCardPNG = async (orderId) => {
  const orders = window.Shop?.historyModal?.orders || [];
  const order = orders.find(o => (o.orderId || "").toUpperCase() === (orderId || "").toUpperCase());
  if (!order) {
    window.UI?.toast("ไม่พบข้อมูลออเดอร์ " + orderId, "warning");
    return;
  }
  window.UI?.toast("📸 กำลังสร้างรูปภาพใบเสร็จ...", "info");
  try {
    if (window.ReceiptGenerator) {
      await window.ReceiptGenerator.generateReceiptPNG(order);
      window.UI?.toast(`บันทึกรูปใบเสร็จ ${orderId} เรียบร้อย!`, "success");
    }
  } catch (err) {
    window.UI?.toast("ไม่สามารถสร้างรูปภาพได้: " + err.message, "error");
  }
};

// 4. 1-Click Discord Warranty Claim Bridge
window.claimOrderToDiscord = (orderId, title, date) => {
  const ticketText = `📋 [แบบฟอร์มยื่นเคลมประกันอัตโนมัติ - NYX9 STUDIO]\n• หมายเลขคำสั่งซื้อ: ${orderId}\n• รายการสินค้า: ${title || "สินค้าดิจิทัล"}\n• วันที่สั่งซื้อ: ${date || "-"}\n• สถานะ: ยื่นเรื่องเคลมประกัน 24 ชั่วโมง\n• อาการปัญหาที่พบ: (โปรดระบุปัญหาที่นี่เพื่อความรวดเร็วในการเคลม)`;

  navigator.clipboard.writeText(ticketText).then(() => {
    window.UI?.toast("📋 คัดลอกแบบฟอร์มเคลมแล้ว! กำลังเปิดห้อง Ticket ใน Discord...", "success");
    const discordUrl = window.storeConfig?.communityLinks?.discord || "https://discord.gg/nyx9";
    setTimeout(() => {
      window.open(discordUrl, "_blank");
    }, 600);
  }).catch(() => {
    const discordUrl = window.storeConfig?.communityLinks?.discord || "https://discord.gg/nyx9";
    window.open(discordUrl, "_blank");
  });
};

// Discord Boost & Quests Calculator Bridges
window.openDiscordServicesModal = (tab) => window.Shop.discordServiceModal.open(tab);
window.closeDiscordServicesModal = () => window.Shop.discordServiceModal.close();
window.switchDiscordTab = (tab) => window.Shop.discordServiceModal.setTab(tab);
window.setBoostPreset = (count) => {
  window.Shop.discordServiceModal.boostCount = count;
  window.Shop.discordServiceModal.render();
};
window.handleBoostSlider = (e) => {
  window.Shop.discordServiceModal.boostCount = parseInt(e.target.value, 10);
  window.Shop.discordServiceModal.render();
};
window.setBoostDuration = (dur) => {
  window.Shop.discordServiceModal.boostDuration = dur;
  window.Shop.discordServiceModal.render();
};
window.handleInviteInput = (e) => {
  window.Shop.discordServiceModal.inviteLink = e.target.value;
};
window.setQuestType = (type) => {
  window.Shop.discordServiceModal.questType = type;
  window.Shop.discordServiceModal.render();
};
window.handleDiscordTagInput = (e) => {
  window.Shop.discordServiceModal.discordTag = e.target.value;
};
window.addDiscordServiceToCart = () => {
  try {
    const item = window.Shop.discordServiceModal.addToCart();
    window.Shop.discordServiceModal.close();
    window.UI?.toast(`เพิ่ม "${item.title}" ลงในตะกร้าแล้ว`, "success");
    window.UI?.confetti();
  } catch (err) {
    window.UI?.toast(err.message, "error");
  }
};

// Carousel Bridges
window.prevCarouselSlide = () => window.Shop?.hero?.prevSlide();
window.nextCarouselSlide = () => window.Shop?.hero?.nextSlide();
window.setCarouselSlide = (idx) => window.Shop?.hero?.goToSlide(idx);
window.handleBannerCta = (catId, action, productId) => {
  if (action === "openTopUp") {
    window.navigateToPage('topup');
  } else if (action === "openHistory") {
    window.navigateToPage('history');
  } else if (action === "openProduct" && productId) {
    window.quickBuyProduct(productId);
  } else if (catId) {
    window.navigateToPage('home');
    setTimeout(() => {
      const target = document.getElementById(catId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  }
};

window.handleBannerSecondaryCta = (catId, action) => {
  if (action === "discordCalculator") {
    window.openDiscordServicesModal();
  } else if (action === "openHistory") {
    window.navigateToPage('history');
  } else if (action === "openTopUp") {
    window.navigateToPage('topup');
  } else if (catId) {
    window.navigateToPage('home');
    setTimeout(() => {
      const target = document.getElementById(catId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  } else {
    window.navigateToPage('home', '#category-filter-bar');
  }
};

// Modal Helpers
window.copyCredentials = () => {
  const el = document.getElementById("delivery-items-container");
  if (el) window.Shop.modals.copyText(el.innerText);
};
window.downloadReceipt = () => window.Shop.modals.downloadReceipt();
window.closeDeliveryModal = () => window.Shop.modals.closeDelivery();
window.openCustomServiceForm = (id) => window.Shop.modals.openCustomServiceForm(id);
window.closeCustomServiceModal = () => window.Shop.modals.closeCustomService();
window.submitCustomServiceOrder = (id) => window.Shop.modals.submitCustomService(id);
window.openClaimModal = () => window.Shop?.modals?.openClaim();
window.closeClaimModal = () => window.Shop?.modals?.closeClaim();
window.submitClaimTicket = () => window.Shop.modals.submitClaim();
window.handleSearchInput = (e) => window.Shop.catalogService.setSearchQuery(e.target.value);
window.showToast = (msg, type) => window.UI?.toast(msg, type);
window.triggerConfetti = () => window.UI?.confetti();

// ==============================================================================
// ⚡ EXPRESS 1-CLICK FAST BUY ENGINE
// ==============================================================================
window.quickBuyProduct = async (productId) => {
  const store = window.AppStore;
  const categories = store.get("categories") || [];
  let found = null;
  for (const cat of categories) {
    const p = (cat.products || []).find(x => x.id === productId);
    if (p) { found = p; break; }
  }
  if (!found) return;

  const currentBalance = store.get("walletBalance") || 0;
  if (currentBalance < found.price) {
    const deficit = found.price - currentBalance;
    window.UI?.toast(`ยอดเงินในกระเป๋าไม่พอ (ขาด ฿${deficit.toFixed(2)}) เติมเงินเพื่อซื้อทันที`, "warning");
    window.openTopUpModal(Math.ceil(deficit));
    return;
  }

  try {
    store.addToCart(found);
    const res = await window.Shop.checkoutService.executeCheckout();
    window.Shop.modals.showInstantDelivery(res);
    window.UI?.toast(`⚡ ซื้อด่วนสำเร็จ! ส่งมอบรหัส "${found.title}" ในระบบคลังเรียบร้อย`, "success");
    window.UI?.confetti();
  } catch (err) {
    window.UI?.toast(err.message, "error");
  }
};

// ==============================================================================
// ⌨️ GLOBAL KEYBOARD SHORTCUTS (LINEAR / DISCORD STYLE)
// ==============================================================================
document.addEventListener("keydown", (e) => {
  if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA")) {
    e.preventDefault();
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  if (e.key === "Escape") {
    const searchInput = document.getElementById("search-input");
    if (searchInput && document.activeElement === searchInput) {
      searchInput.blur();
    }
  }
});


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

  // 2. Nav Back Home Cleaned (User prefers direct branding click)

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
  const p = window.location.pathname.replace(/^\//, '').toLowerCase();
  window.navigateToPage(p || 'home');
});

// Auto-route on initial page load
document.addEventListener('DOMContentLoaded', () => {
  const initPath = window.location.pathname.replace(/^\//, '').toLowerCase();
  const known = ['topup', 'history', 'claim', 'faq', 'terms', 'privacy', 'contact'];
  if (known.includes(initPath)) {
    window.navigateToPage(initPath);
  }
});
