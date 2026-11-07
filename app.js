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
    this.reviewService = window.ReviewService ? new window.ReviewService(this.store) : null;

    // Components
    this.navbar = new window.NavbarComponent(this.store);
    this.hero = new window.HeroSectionComponent(this.store);
    this.catalogView = new window.CatalogViewComponent(this.store);
    this.reviewsSection = window.ReviewsSectionComponent ? new window.ReviewsSectionComponent(this.store, this.reviewService) : null;
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
    
    // 1. เรนเดอร์ UI ทันทีไม่ต้องรอ Network (Defensive Component Isolation)
    const safeRun = (name, fn) => {
      try {
        fn();
      } catch (err) {
        console.error(`[COMP_INIT_ERROR] ${name} failed to render:`, err);
      }
    };

    safeRun("HeroSection", () => this.hero?.render());
    safeRun("CatalogView", () => this.catalogView?.render());
    safeRun("ReviewsSection", () => this.reviewsSection?.render());
    safeRun("NavbarWallet", () => this.navbar?.updateWalletUI());
    safeRun("NavbarCart", () => this.navbar?.updateCartBadge());
    safeRun("AcceptedPaymentsFooter", () => this.renderAcceptedPaymentsFooter());
    safeRun("AnnouncementsTicker", () => this.renderAnnouncementsTicker(window.storeConfig?.announcements || []));
    safeRun("LucideIcons", () => { if (window.lucide) lucide.createIcons(); });

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
    // Telemetry count-up disabled per unslop policy
  }

  applyDynamicSettings(settings) {
    if (!settings || typeof settings !== 'object') return;

    if (settings.store_profile) {
      const sp = settings.store_profile;
      if (sp.storeName) window.storeConfig.storeName = sp.storeName;
      if (sp.brandShort) window.storeConfig.brandShort = sp.brandShort;
      if (sp.tagline) window.storeConfig.tagline = sp.tagline;
      if (sp.subTagline) window.storeConfig.subTagline = sp.subTagline;
      if (sp.logoUrl) window.storeConfig.logoUrl = sp.logoUrl;
      if (sp.faviconUrl) window.storeConfig.faviconUrl = sp.faviconUrl;
      if (sp.discordCommunityUrl) window.storeConfig.discordCommunityUrl = sp.discordCommunityUrl;
      if (sp.discordCommunitySecondaryUrl) window.storeConfig.discordCommunitySecondaryUrl = sp.discordCommunitySecondaryUrl;
      if (sp.contactLine !== undefined) window.storeConfig.contactLine = sp.contactLine;
      if (sp.contactFacebook !== undefined) window.storeConfig.contactFacebook = sp.contactFacebook;
      if (sp.supportEmail) window.storeConfig.supportEmail = sp.supportEmail;
      if (sp.metrics) window.storeConfig.metrics = { ...window.storeConfig.metrics, ...sp.metrics };

      document.title = `${window.storeConfig.storeName} — ${window.storeConfig.tagline || ''}`;
      document.querySelectorAll("[data-bind='storeName']").forEach(el => el.textContent = window.storeConfig.storeName);
      document.querySelectorAll("[data-bind='brandShort']").forEach(el => el.textContent = window.storeConfig.brandShort || window.storeConfig.storeName);
      document.querySelectorAll("[data-bind='tagline']").forEach(el => el.textContent = window.storeConfig.tagline);
      document.querySelectorAll("[data-bind='subTagline']").forEach(el => el.textContent = window.storeConfig.subTagline);
      if (window.storeConfig.discordCommunityUrl) {
        document.querySelectorAll("[data-bind='discordCommunityUrl']").forEach(el => {
          if (el.tagName === 'A') el.href = window.storeConfig.discordCommunityUrl;
        });
      }
      if (window.storeConfig.supportEmail) {
        document.querySelectorAll("[data-bind='supportEmail']").forEach(el => {
          el.textContent = window.storeConfig.supportEmail;
          if (el.tagName === 'A') el.href = `mailto:${window.storeConfig.supportEmail}`;
        });
      }

      if (sp.maintenanceMode) {
        this.renderMaintenanceBanner(sp.maintenanceMessage || 'ร้านค้ากำลังปิดปรับปรุงชั่วคราว');
      }
    }

    if (settings.payment_config) {
      const pc = settings.payment_config;
      if (pc.acceptedPayments) window.storeConfig.acceptedPayments = pc.acceptedPayments;
      if (pc.promptpay) window.storeConfig.paymentDetails.promptpay = { ...window.storeConfig.paymentDetails.promptpay, ...pc.promptpay };
      if (pc.truemoney) window.storeConfig.paymentDetails.truemoney = { ...window.storeConfig.paymentDetails.truemoney, ...pc.truemoney };
      if (pc.bank_transfer) window.storeConfig.paymentDetails.bank_transfer = { ...window.storeConfig.paymentDetails.bank_transfer, ...pc.bank_transfer };
      if (pc.crypto_ltc) window.storeConfig.paymentDetails.crypto_ltc = pc.crypto_ltc;
    }

    if (Array.isArray(settings.announcements) && settings.announcements.length > 0) {
      window.storeConfig.announcements = settings.announcements;
      this.renderAnnouncementsTicker(settings.announcements);
    }

    if (Array.isArray(settings.hero_banners) && settings.hero_banners.length > 0) {
      window.storeConfig.heroBanners = settings.hero_banners;
      this.hero?.renderCarousel();
    }

    if (Array.isArray(settings.discord_stores) && settings.discord_stores.length > 0) {
      window.storeConfig.discordStores = settings.discord_stores;
    }

    if (window.lucide) lucide.createIcons();
  }

  renderAnnouncementsTicker(announcements) {
    const track = document.getElementById('announcements-track');
    if (!track) return;
    const active = (announcements || []).filter(a => a.active !== false);
    if (active.length === 0) return;

    const renderItems = (items) => items.map(item => {
      const colorMap = {
        indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
        emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
        rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
      };
      const badgeStyle = colorMap[item.color] || colorMap.indigo;
      return `
        <div class="marquee-capsule inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono select-none">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}">
            ${item.tag}
          </span>
          <span class="text-slate-300">${item.text}</span>
          ${item.highlight ? `<span class="font-bold text-white font-mono-val">${item.highlight}</span>` : ''}
        </div>
      `;
    }).join('');

    track.innerHTML = renderItems(active) + renderItems(active);
    if (window.lucide) lucide.createIcons();
  }

  renderMaintenanceBanner(message) {
    const existing = document.getElementById('maintenance-banner-overlay');
    if (existing) return;
    const div = document.createElement('div');
    div.id = 'maintenance-banner-overlay';
    div.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 rounded-2xl bg-amber-950/95 border border-amber-500/50 shadow-2xl backdrop-blur-xl text-amber-100 flex items-start gap-3';
    div.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
        <i data-lucide="alert-triangle" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 text-xs">
        <div class="font-bold text-amber-300 flex items-center justify-between">
          <span>⚠️ ร้านค้ากำลังปิดปรับปรุงชั่วคราว</span>
          <button onclick="this.closest('#maintenance-banner-overlay').remove()" class="text-amber-400 hover:text-white cursor-pointer">&times;</button>
        </div>
        <p class="mt-1 text-amber-200/90 leading-relaxed font-sans">${message}</p>
      </div>
    `;
    document.body.appendChild(div);
    if (window.lucide) lucide.createIcons();
  }

  renderAcceptedPaymentsFooter() {
    const container = document.getElementById("footer-accepted-payments");
    if (!container) return;

    const paymentCards = [
      { name: "PromptPay QR", icon: "qr-code", tag: "สแกนฟรี 0%" },
      { name: "TrueMoney", icon: "wallet", tag: "ซอง/วอลเล็ท" },
      { name: "โอนธนาคาร", icon: "landmark", tag: "ทุกธนาคาร" },
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

// Global Application Instance with safe boot
try {
  window.Shop = new ShopApp();
} catch (e) {
  console.error("❌ [ShopApp] Constructor failed:", e);
}

// Boot immediately or on DOM Ready (Guaranteed Execution)
function bootShopApp() {
  try {
    if (!window.Shop) {
      window.Shop = new ShopApp();
    }
    if (window.Shop && !window.Shop._hasBooted) {
      window.Shop._hasBooted = true;
      window.Shop.init();
    }
  } catch (err) {
    console.error("❌ [ShopApp] Boot failed:", err);
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
      btn.className = "promptpay-preset-btn active h-9 rounded-xl bg-white text-[#0A0D14] font-bold border border-white shadow-sm text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    } else {
      btn.className = "promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    }
  });
};
window.handlePromptPayAmountInput = (amt) => window.Shop.topupModal.updatePromptPayQr(amt);
window.verifyPromptPaySlip = () => window.Shop.topupModal.verifyPromptPay();
window.redeemTrueMoneyVoucher = () => window.Shop.topupModal.redeemTrueMoney();
window.copyTrueMoneyPhone = () => {
  const phone = window.storeConfig?.paymentDetails?.truemoney?.phoneNumber || "0838286508";
  navigator.clipboard.writeText(phone.replace(/-/g, "")).then(() => window.UI?.toast(`📱 คัดลอกเบอร์ TrueMoney ${phone} แล้ว!`, "success"));
};
window.copyBankAccount = () => {
  const acc = window.storeConfig?.paymentDetails?.bank_transfer?.accountNumber || "4140810122";
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
    const discordUrl = window.storeConfig?.discordCommunityUrl || window.storeConfig?.communityLinks?.discord || "https://discord.gg/NTPcxKHrag";
    setTimeout(() => {
      window.open(discordUrl, "_blank");
    }, 600);
  }).catch(() => {
    const discordUrl = window.storeConfig?.discordCommunityUrl || window.storeConfig?.communityLinks?.discord || "https://discord.gg/NTPcxKHrag";
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

  // If clicking "All Products" (#category-filter-bar), ensure category is set to 'all' only if needed
  if (hash === '#category-filter-bar' || hash === '#catalog-container') {
    if (window.Shop?.catalogService && window.Shop?.store) {
      if (window.Shop.store.get('activeCategory') !== 'all') {
        window.Shop.catalogService.setCategoryFilter('all');
      }
    }
  }

  // 1. Toggle Active View Panel
  views.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) {
      if (v === target) {
        el.classList.remove('hidden');
        el.classList.add('block');
        // Only run JulianMotion on dedicated sub-pages, NEVER blank out #view-home
        if (target !== 'home' && window.JulianMotion && typeof window.JulianMotion.animateView === 'function') {
          window.JulianMotion.animateView(el);
        }
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

  // 5. High-Precision Scroll Alignment (Zero-Lag, Sticky Nav Offset Aware)
  if (hash) {
    requestAnimationFrame(() => {
      const el = document.querySelector(hash);
      if (el) {
        const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 85;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      }
    });
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

// Auto-route on initial page load & Bind Contact Page Interactions
document.addEventListener('DOMContentLoaded', () => {
  const initPath = window.location.pathname.replace(/^\//, '').toLowerCase();
  const known = ['topup', 'history', 'claim', 'faq', 'terms', 'privacy', 'contact'];
  if (known.includes(initPath)) {
    window.navigateToPage(initPath);
  }

  // Setup Contact Page Interactive Pills
  document.addEventListener('click', (e) => {
    const pill = e.target.closest('.contact-pill');
    if (pill) {
      document.querySelectorAll('.contact-pill').forEach(p => {
        p.classList.remove('active', 'border-indigo-400/40', 'bg-white/[0.08]', 'text-white');
        p.classList.add('border-white/[0.08]', 'bg-white/[0.02]', 'text-slate-300');
      });
      pill.classList.add('active', 'border-white/40', 'bg-white/[0.08]', 'text-white');
      pill.classList.remove('border-white/[0.08]', 'bg-white/[0.02]', 'text-slate-300');
    }

    const urg = e.target.closest('.urgency-pill');
    if (urg) {
      document.querySelectorAll('.urgency-pill').forEach(u => {
        u.classList.remove('active', 'border-emerald-500/40', 'bg-emerald-500/10', 'text-emerald-300');
        u.classList.add('border-white/[0.08]', 'bg-white/[0.02]', 'text-slate-300');
      });
      urg.classList.add('active', 'border-emerald-500/40', 'bg-emerald-500/10', 'text-emerald-300');
      urg.classList.remove('border-white/[0.08]', 'bg-white/[0.02]', 'text-slate-300');
    }
  });
});

// Contact Ticket Submission & Discord Bridge
window.handleContactSubmit = function() {
  const activeService = document.querySelector('.contact-pill.active')?.textContent?.trim() || 'สอบถามทั่วไป';
  const activeUrgency = document.querySelector('.urgency-pill.active')?.textContent?.trim() || 'ปกติ';
  const orderId = document.getElementById('contact-order-id')?.value?.trim() || 'ไม่ได้ระบุ';
  const message = document.getElementById('contact-message-body')?.value?.trim() || 'ต้องการเปิด Ticket สอบถามข้อมูล';

  const ticketPayload = `📋 [NYX9 STUDIO TICKET]\n` +
    `📌 เรื่อง: ${activeService}\n` +
    `⚡ ความเร่งด่วน: ${activeUrgency}\n` +
    `📦 เลขออเดอร์: ${orderId}\n` +
    `💬 รายละเอียด: ${message}\n` +
    `⏰ เวลาที่ส่ง: ${new Date().toLocaleString('th-TH')}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(ticketPayload).catch(() => {});
  }

  const toast = document.getElementById('contact-status-toast');
  if (toast) {
    toast.classList.remove('hidden');
    toast.textContent = '✓ คัดลอกรายละเอียดแล้ว พร้อมเปิด Discord Ticket!';
    setTimeout(() => toast.classList.add('hidden'), 4000);
  }

  const discordUrl = window.Shop?.store?.get('discordCommunityUrl') || window.storeConfig?.discordCommunityUrl || 'https://discord.gg/NTPcxKHrag';
  setTimeout(() => {
    window.open(discordUrl, '_blank');
  }, 600);
};

// ==============================================================================
// 🌐 LIVE DISCORD COMMUNITY WIDGET AUTO-SYNC (Counts & Badges)
// ==============================================================================
async function initLiveDiscordWidgets() {
  const servers = [
    { code: 'T44Up4cfy', onlineSelector: '.novape-live-online', membersSelector: '.novape-live-members' },
    { code: 'NTPcxKHrag', onlineSelector: '.nyx9-live-online', membersSelector: '.nyx9-live-members' }
  ];

  for (const s of servers) {
    try {
      const res = await fetch(`https://discord.com/api/v9/invites/${s.code}?with_counts=true`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.approximate_presence_count !== undefined) {
        document.querySelectorAll(s.onlineSelector).forEach(el => {
          el.textContent = Number(data.approximate_presence_count).toLocaleString();
        });
      }
      if (data.approximate_member_count !== undefined) {
        document.querySelectorAll(s.membersSelector).forEach(el => {
          el.textContent = Number(data.approximate_member_count).toLocaleString();
        });
      }
    } catch (e) {
      // Fallback values in HTML already rendered smoothly
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLiveDiscordWidgets);
} else {
  initLiveDiscordWidgets();
}

// ==============================================================================
// ⭐ VERIFIED CUSTOMER REVIEW GLOBAL BRIDGES
// ==============================================================================
window.currentReviewRating = 5;

window.openReviewModal = function(orderId, productId, productTitle) {
  let modal = document.getElementById("product-review-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "product-review-modal";
    modal.className = "fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-black/85 backdrop-blur-md";
    modal.innerHTML = `
      <div class="relative z-10 modal-spring-dialog glass-panel rounded-3xl max-w-md w-full p-6 border border-amber-500/30 shadow-2xl shadow-amber-500/10">
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg font-bold">
              ★
            </div>
            <div>
              <h4 class="text-sm font-bold text-white">เขียนรีวิวสินค้า (Verified Buyer)</h4>
              <p id="review-modal-prod-title" class="text-[11px] text-slate-400 truncate max-w-[240px]"></p>
            </div>
          </div>
          <button onclick="window.closeReviewModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <form onsubmit="window.handleReviewSubmit(event)" class="space-y-4">
          <input type="hidden" id="review-modal-order-id" />
          <input type="hidden" id="review-modal-prod-id" />
          <input type="hidden" id="review-modal-rating-val" value="5" />

          <!-- Star Rating Selector -->
          <div class="text-center py-2 bg-slate-950/60 rounded-2xl border border-white/[0.05]">
            <label class="block text-xs font-semibold text-slate-300 mb-1">ให้คะแนนความพึงพอใจ:</label>
            <div id="review-stars-container" class="flex items-center justify-center gap-1.5 text-3xl cursor-pointer select-none">
              <span class="star-item text-amber-400 hover:scale-110 transition-transform" onclick="window.setReviewRating(1)">★</span>
              <span class="star-item text-amber-400 hover:scale-110 transition-transform" onclick="window.setReviewRating(2)">★</span>
              <span class="star-item text-amber-400 hover:scale-110 transition-transform" onclick="window.setReviewRating(3)">★</span>
              <span class="star-item text-amber-400 hover:scale-110 transition-transform" onclick="window.setReviewRating(4)">★</span>
              <span class="star-item text-amber-400 hover:scale-110 transition-transform" onclick="window.setReviewRating(5)">★</span>
            </div>
            <div id="review-rating-label" class="text-[11px] font-mono text-amber-400 mt-1">5 ดาว — ยอดเยี่ยมมากที่สุด</div>
          </div>

          <!-- Author Display Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">ชื่อที่แสดงในรีวิว:</label>
            <input type="text" id="review-modal-author" placeholder="เช่น Krit_Discord (เว้นว่างเพื่อใช้ชื่อสมาชิก)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none" />
          </div>

          <!-- Comment Textarea -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">ข้อความรีวิว / ความเห็น:</label>
            <textarea id="review-modal-comment" rows="3" placeholder="ระบุความประทับใจของคุณ เช่น สั่งซื้อง่าย ได้รับรหัสทันที ใช้งานได้จริง..." class="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none resize-none leading-relaxed" required></textarea>
          </div>

          <div class="pt-2 flex gap-2">
            <button type="button" onclick="window.closeReviewModal()" class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer">
              ยกเลิก
            </button>
            <button type="submit" id="btn-submit-review" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>ส่งรีวิว</span>
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById("review-modal-order-id").value = orderId || "";
  document.getElementById("review-modal-prod-id").value = productId || "";
  document.getElementById("review-modal-prod-title").textContent = productTitle || productId || "สินค้าดิจิทัล";

  const user = window.Shop?.store?.get?.("user");
  const authorInput = document.getElementById("review-modal-author");
  if (authorInput && user?.username) {
    authorInput.value = user.username;
  }

  window.setReviewRating(5);
  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
};

window.closeReviewModal = function() {
  const modal = document.getElementById("product-review-modal");
  if (modal) modal.classList.add("hidden");
};

window.setReviewRating = function(rating) {
  window.currentReviewRating = rating;
  const ratingInput = document.getElementById("review-modal-rating-val");
  if (ratingInput) ratingInput.value = rating;

  const stars = document.querySelectorAll("#review-stars-container .star-item");
  stars.forEach((s, idx) => {
    if (idx < rating) {
      s.className = "star-item text-amber-400 hover:scale-110 transition-transform";
      s.textContent = "★";
    } else {
      s.className = "star-item text-slate-600 hover:scale-110 transition-transform";
      s.textContent = "☆";
    }
  });

  const labels = {
    1: "1 ดาว — ควรปรับปรุง",
    2: "2 ดาว — พอใช้ได้",
    3: "3 ดาว — ปานกลาง",
    4: "4 ดาว — ดีมาก",
    5: "5 ดาว — ยอดเยี่ยมมากที่สุด"
  };
  const labelEl = document.getElementById("review-rating-label");
  if (labelEl) labelEl.textContent = labels[rating] || `${rating} ดาว`;
};

window.handleReviewSubmit = async function(e) {
  if (e) e.preventDefault();
  const orderId = document.getElementById("review-modal-order-id")?.value;
  const productId = document.getElementById("review-modal-prod-id")?.value;
  const rating = parseInt(document.getElementById("review-modal-rating-val")?.value || "5", 10);
  const author = document.getElementById("review-modal-author")?.value;
  const comment = document.getElementById("review-modal-comment")?.value;

  const submitBtn = document.getElementById("btn-submit-review");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังบันทึก...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    if (window.Shop?.reviewService) {
      await window.Shop.reviewService.submitReview({
        orderId,
        productId,
        rating,
        comment,
        authorName: author
      });
      window.UI?.toast("⭐ ขอบคุณสำหรับรีวิวของคุณ! ระบบได้บันทึกเรียบร้อยแล้ว", "success");
      window.UI?.confetti();
      window.closeReviewModal();
      // Re-render reviews section if visible
      if (window.Shop?.reviewsSection) {
        window.Shop.reviewsSection.render();
      }
    }
  } catch (err) {
    window.UI?.toast(err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> <span>ส่งรีวิว</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
};
