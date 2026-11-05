/**
 * ==============================================================================
 * 🛒 CART DRAWER COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class CartDrawerComponent {
  constructor(store, checkoutService) {
    this.store = store;
    this.checkoutService = checkoutService;
    this.isOpen = false;

    this.store.on("change:cart", () => this.render());
    this.store.on("change:appliedPromo", () => this.render());
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const container = document.getElementById("cart-drawer-container");
    const backdrop = container?.querySelector(".drawer-backdrop");
    const drawer = container?.querySelector(".drawer-content");

    if (!container || !backdrop || !drawer) return;

    if (this.isOpen) {
      container.classList.remove("hidden");
      setTimeout(() => {
        backdrop.classList.remove("opacity-0");
        drawer.classList.remove("translate-x-full");
      }, 10);
      this.render();
    } else {
      backdrop.classList.add("opacity-0");
      drawer.classList.add("translate-x-full");
      setTimeout(() => container.classList.add("hidden"), 300);
    }
  }

  addToCartById(productId, qty = 1) {
    const prod = window.Shop?.catalogService?.findProductById(productId);
    if (!prod) return;

    if (prod.stock === 0) {
      window.UI?.toast("ขออภัย สินค้านี้หมดชั่วคราว", "warning");
      return;
    }

    this.store.addToCart(prod, qty);
    window.UI?.toast(`เพิ่ม "${prod.title}" ลงตะกร้าแล้ว!`, "success");

    // Tactile Cart Badge Pop
    const cartBtn = document.querySelector('[onclick="toggleCartDrawer()"]');
    if (cartBtn) {
      cartBtn.classList.remove('animate-cart-pop');
      void cartBtn.offsetWidth;
      cartBtn.classList.add('animate-cart-pop');
    }
  }

  render() {
    const list = document.getElementById("cart-items-list");
    if (!list) return;

    const cart = this.store.get("cart") || [];

    if (cart.length === 0) {
      list.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
          <i data-lucide="shopping-bag" class="w-12 h-12 mb-3 text-slate-700"></i>
          <p class="text-sm font-semibold">ไม่มีสินค้าในตะกร้า</p>
          <p class="text-xs text-slate-600 mt-1">เลือกสินค้าจากแคตตาล็อกเพื่อสั่งซื้อ</p>
        </div>
      `;
      this.updateSummary();
      if (window.lucide) lucide.createIcons();
      return;
    }

    list.innerHTML = cart.map((item, index) => `
      <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-white truncate">${item.title}</div>
          <div class="text-xs font-mono font-bold text-[var(--accent)] mt-0.5">฿${item.price.toFixed(2)}</div>
          ${item.customData ? `<div class="text-[10px] text-slate-400 font-mono mt-1">${JSON.stringify(item.customData).substring(0, 30)}...</div>` : ""}
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
            <button onclick="window.Shop?.cartManager?.updateQty(${index}, ${item.quantity - 1})" class="px-2 py-1 text-slate-400 hover:text-white text-xs cursor-pointer">-</button>
            <span class="px-2 text-xs font-mono font-bold text-white">${item.quantity}</span>
            <button onclick="window.Shop?.cartManager?.updateQty(${index}, ${item.quantity + 1})" class="px-2 py-1 text-slate-400 hover:text-white text-xs cursor-pointer">+</button>
          </div>
          <button onclick="window.Shop?.cartManager?.removeItem(${index})" class="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join("");

    this.updateSummary();
    if (window.lucide) lucide.createIcons();
  }

  updateQty(index, newQty) {
    this.store.updateCartQuantity(index, newQty);
  }

  removeItem(index) {
    this.store.removeFromCart(index);
    window.UI?.toast("นำสินค้าออกจากตะกร้าแล้ว", "info");
  }

  updateSummary() {
    const { subtotal, discount, total } = this.checkoutService.calculateTotals();

    const subEl = document.getElementById("cart-subtotal");
    const totalEl = document.getElementById("cart-total");
    const discRow = document.getElementById("cart-discount-row");
    const discEl = document.getElementById("cart-discount");
    const promo = this.store.get("appliedPromo");

    if (subEl) subEl.textContent = `฿${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `฿${total.toFixed(2)}`;

    if (promo && discount > 0) {
      if (discRow) discRow.classList.remove("hidden");
      if (discEl) discEl.textContent = `-฿${discount.toFixed(2)}`;
    } else {
      if (discRow) discRow.classList.add("hidden");
    }

    // Coupon UI
    const appliedTag = document.getElementById("coupon-applied-tag");
    const label = document.getElementById("coupon-label");
    if (promo) {
      if (appliedTag) appliedTag.classList.remove("hidden");
      if (label) label.textContent = `${promo.code} (${promo.label})`;
    } else {
      if (appliedTag) appliedTag.classList.add("hidden");
    }
  }

  applyCoupon() {
    const input = document.getElementById("coupon-input");
    const code = input?.value.trim();
    if (!code) return;

    try {
      const promo = this.checkoutService.applyCoupon(code);
      window.UI?.toast(`ใช้โค้ดส่วนลด "${promo.code}" สำเร็จ!`, "success");
      if (input) input.value = "";
    } catch (err) {
      window.UI?.toast(err.message, "error");
    }
  }

  removeCoupon() {
    this.checkoutService.removeCoupon();
    window.UI?.toast("ยกเลิกโค้ดส่วนลดแล้ว", "info");
  }
}

window.CartDrawerComponent = CartDrawerComponent;
