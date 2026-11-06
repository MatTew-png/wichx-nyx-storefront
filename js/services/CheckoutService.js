/**
 * ==============================================================================
 * ⚡ CHECKOUT & FULFILLMENT SERVICE (OOP ORDER ENGINE)
 * ==============================================================================
 */

class CheckoutService {
  constructor(store) {
    this.store = store;
  }

  calculateTotals() {
    const cart = this.store.get("cart") || [];
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    subtotal = Math.round(subtotal * 100) / 100;
    const promo = this.store.get("appliedPromo");

    let discount = 0;
    if (promo) {
      if (promo.discount_type === 'percent' || promo.discountPercent) {
        const pct = promo.discount_value || promo.discountPercent;
        discount = (subtotal * pct) / 100;
        if (promo.max_discount && discount > promo.max_discount) {
          discount = promo.max_discount;
        }
      } else if (promo.discount_type === 'fixed' || promo.discountThb) {
        discount = promo.discount_value || promo.discountThb;
      }
      discount = Math.min(discount, subtotal);
    }
    discount = Math.round(discount * 100) / 100;

    const total = Math.round(Math.max(0, subtotal - discount) * 100) / 100;
    return { subtotal, discount, total };
  }

  async loadAvailableVouchers() {
    try {
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient.rpc("get_available_vouchers");
        if (!error && Array.isArray(data) && data.length > 0) {
          this.store.set("availableVouchers", data);
          return data;
        }
      }
    } catch (e) {
      console.warn("[CHECKOUT SERVICE] Error loading vouchers:", e.message);
    }

    // Fallback to storeConfig.promoCodes
    const configCodes = window.storeConfig?.promoCodes || {};
    const fallback = Object.entries(configCodes).map(([code, c]) => ({
      code,
      label: c.label || code,
      discount_type: c.discountPercent ? 'percent' : 'fixed',
      discount_value: c.discountPercent || c.discountThb,
      min_spend: c.minSpend || 0,
      max_discount: null
    }));
    this.store.set("availableVouchers", fallback);
    return fallback;
  }

  applyCoupon(code) {
    const cleanCode = (code || "").trim().toUpperCase();
    const vouchers = this.store.get("availableVouchers") || [];
    let promo = vouchers.find(v => v.code === cleanCode);

    if (!promo) {
      const configCodes = window.storeConfig?.promoCodes || {};
      const cfg = configCodes[cleanCode];
      if (cfg) {
        promo = {
          code: cleanCode,
          label: cfg.label || cleanCode,
          discount_type: cfg.discountPercent ? 'percent' : 'fixed',
          discount_value: cfg.discountPercent || cfg.discountThb,
          min_spend: cfg.minSpend || 0
        };
      }
    }

    if (!promo) {
      throw new Error("โค้ดส่วนลดนี้ไม่ถูกต้องหรือหมดอายุแล้ว");
    }

    const cart = this.store.get("cart") || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const minSpend = Number(promo.min_spend || promo.minSpend || 0);
    if (minSpend > 0 && subtotal < minSpend) {
      const diff = (minSpend - subtotal).toFixed(2);
      throw new Error(`โค้ดนี้ใช้ได้เมื่อมียอดสั่งซื้อขั้นต่ำ ฿${minSpend.toFixed(2)} (ขาดอีก ฿${diff})`);
    }

    this.store.set("appliedPromo", { ...promo, code: cleanCode });
    return promo;
  }

  removeCoupon() {
    this.store.set("appliedPromo", null);
  }

  async executeCheckout() {
    const cart = this.store.get("cart") || [];
    if (cart.length === 0) {
      throw new Error("ตะกร้าสินค้าว่างเปล่า กรุณาเลือกสินค้าก่อน");
    }

    const { total } = this.calculateTotals();
    const walletBalance = this.store.get("walletBalance");

    if (walletBalance < total) {
      const diff = (total - walletBalance).toFixed(2);
      throw new Error(`ยอดเงินในกระเป๋าไม่พอ (ขาดอีก ฿${diff}) กรุณาเติมเงินก่อนสั่งซื้อ`);
    }

    const orderId = `WX-${Math.floor(100000 + Math.random() * 900000)}`;
    const user = this.store.get("user");
    const promo = this.store.get("appliedPromo");
    const { discount } = this.calculateTotals();
    let result = null;

    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      result = await window.SupabaseAdapter.executeOrderCheckout({
        orderId,
        items: cart,
        totalAmount: total,
        userId: user?.id || null,
        customerInfo: {
          clientTimestamp: new Date().toISOString(),
          username: user?.username || "Guest",
          discordId: user?.discordId || null,
          promoCode: promo?.code || null,
          discountAmount: discount || 0
        }
      });
    } else {
      // Local sandbox fallback
      const fallbackDispensed = cart.map(item => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        credentials: Array.from({ length: item.quantity }, (_, i) => `${item.id}_key_sandbox_${Date.now()}_${i + 1}`)
      }));
      result = {
        success: true,
        order_id: orderId,
        total_amount: total,
        dispensed_items: fallbackDispensed
      };
    }

    if (!result || !result.success) {
      if (result?.error === "OUT_OF_STOCK") {
        throw new Error("ขออภัย สินค้าบางรายการในสต็อกหมดชั่วคราว");
      }
      throw new Error(result?.message || "การสั่งซื้อล้มเหลว");
    }

    // Debit wallet & clear cart
    this.store.debitWallet(total);
    this.store.clearCart();
    this.store.set("appliedPromo", null);

    // Save to order history
    const history = this.store.get("orderHistory") || [];
    history.unshift({
      orderId: result.order_id || orderId,
      items: result.dispensed_items || cart,
      totalAmount: total,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem("wichx_orders", JSON.stringify(history.slice(0, 30)));

    return result;
  }

  async submitClaim(orderId, reason) {
    if (!orderId || !reason) {
      throw new Error("กรุณากรอกรหัสคำสั่งซื้อและสาเหตุการเคลม");
    }

    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      const res = await window.SupabaseAdapter.submitWarrantyClaim(orderId, reason);
      if (!res.success) throw new Error(res.error || "ยื่นเรื่องไม่สำเร็จ");
      return res;
    }
    return { success: true, mode: "simulated" };
  }
}

if (typeof window !== "undefined") {
  window.CheckoutService = CheckoutService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CheckoutService;
}
