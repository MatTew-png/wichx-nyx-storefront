/**
 * ==============================================================================
 * 🚀 NYX9 STUDIO — MAIN APPLICATION BOOTSTRAPPER (OOP COORDINATOR)
 * ==============================================================================
 * สถาปัตยกรรม Modular OOP & Component-Based:
 * - js/core/Store.js               -> Reactive State Container
 * - js/services/AuthService.js     -> Discord OAuth & Profiles
 * - js/services/CatalogService.js  -> Live Products & Filters
 * - js/services/PaymentService.js  -> 4-Gateway Engine (PromptPay, TrueMoney, Bank, Card)
 * - js/services/CheckoutService.js -> Atomic Orders & Claims
 * - js/components/*.js             -> Isolated UI Components
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

    // Components
    this.navbar = new window.NavbarComponent(this.store);
    this.hero = new window.HeroSectionComponent(this.store);
    this.catalogView = new window.CatalogViewComponent(this.store);
    this.cartManager = new window.CartDrawerComponent(this.store, this.checkoutService);
    this.topupModal = new window.TopUpModalComponent(this.store, this.paymentService);
    this.modals = new window.ModalsComponent(this.store, this.checkoutService);
    this.socialProof = new window.SocialProofComponent();
  }

  async init() {
    console.info("⚡ [NYX9 STUDIO] Initializing Modular OOP Storefront...");
    
    // 1. เชื่อมต่อ Supabase
    if (window.storeConfig?.supabase && window.SupabaseAdapter) {
      const { url, anonKey } = window.storeConfig.supabase;
      window.SupabaseAdapter.init(url, anonKey);
    }

    // 2. เริ่มต้น Services & โหลดข้อมูลสินค้า
    await this.catalogService.loadCatalog();
    await this.auth.init();

    // 3. เรนเดอร์ส่วนประกอบ UI
    this.hero.render();
    this.catalogView.render();
    this.navbar.updateWalletUI();
    this.navbar.updateCartBadge();
    this.renderAcceptedPaymentsFooter();
    this.socialProof.init();

    if (window.lucide) lucide.createIcons();
    console.info("✅ [NYX9 STUDIO] Storefront Ready!");
  }

  renderAcceptedPaymentsFooter() {
    const container = document.getElementById("footer-accepted-payments");
    if (!container) return;

    const payments = window.storeConfig?.acceptedPayments || [];
    const paymentLabels = {
      promptpay: { name: "PromptPay QR", icon: "qr-code" },
      truemoney: { name: "TrueMoney Wallet", icon: "wallet" },
      bank_transfer: { name: "โอนผ่านธนาคาร", icon: "landmark" },
      card_payment: { name: "บัตรเครดิต/เดบิต (Visa/MC)", icon: "credit-card" },
      crypto_ltc: { name: "Litecoin (LTC)", icon: "coins" }
    };

    container.innerHTML = payments.map(p => {
      const info = paymentLabels[p] || { name: p, icon: "credit-card" };
      return `
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono-val text-slate-300">
          <i data-lucide="${info.icon}" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
          <span>${info.name}</span>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }
}

// Global Application Instance
window.Shop = new ShopApp();

// Boot on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  window.Shop.init();
});

// ==============================================================================
// 🔗 BACKWARD-COMPATIBLE GLOBAL BRIDGES (FOR HTML ONCLICK HANDLERS)
// ==============================================================================
window.openTopUpModal = (amt) => window.Shop.topupModal.open(amt);
window.closeTopUpModal = () => window.Shop.topupModal.close();
window.switchTopUpGateway = (tab) => window.Shop.topupModal.switchGateway(tab);
window.switchTopUpTab = window.switchTopUpGateway;
window.setPromptPayPreset = (amt) => {
  const el = document.getElementById("promptpay-amount-input");
  if (el) el.value = amt;
  window.Shop.topupModal.updatePromptPayQr(amt);
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

// Card Helpers
window.setCardAmountPreset = (amt) => {
  const el = document.getElementById("card-topup-amount");
  if (el) el.value = amt;
};
window.handleCardNumberInput = (input) => {
  let val = input.value.replace(/\D/g, "").substring(0, 16);
  let formatted = val.match(/.{1,4}/g)?.join(" ") || val;
  input.value = formatted;
  const p = document.getElementById("preview-card-number");
  if (p) p.textContent = formatted || "•••• •••• •••• ••••";
};
window.handleCardExpiryInput = (input) => {
  let val = input.value.replace(/\D/g, "").substring(0, 4);
  if (val.length >= 2) val = val.substring(0, 2) + "/" + val.substring(2);
  input.value = val;
  const p = document.getElementById("preview-card-expiry");
  if (p) p.textContent = val || "MM/YY";
};
window.handleCardHolderInput = (input) => {
  const p = document.getElementById("preview-card-name");
  if (p) p.textContent = input.value.trim().toUpperCase() || "YOUR NAME";
};
window.processCardPayment = () => window.Shop.topupModal.processCard();

// Auth Helpers
window.handleDiscordLogin = () => window.Shop.auth.loginWithDiscord();
window.handleLogout = () => window.Shop.auth.logout();

// Cart & Checkout Helpers
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
window.openClaimModal = () => window.Shop.modals.openClaim();
window.closeClaimModal = () => window.Shop.modals.closeClaim();
window.submitClaimTicket = () => window.Shop.modals.submitClaim();
window.handleSearchInput = (e) => window.Shop.catalogService.setSearchQuery(e.target.value);
window.showToast = (msg, type) => window.UI?.toast(msg, type);
window.triggerConfetti = () => window.UI?.confetti();
