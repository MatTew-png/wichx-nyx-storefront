/**
 * ==============================================================================
 * 🧠 CENTRAL REACTIVE STORE (OOP STATE MANAGEMENT)
 * ==============================================================================
 * จัดการ State ทั้งหมดของร้านค้า (Cart, Wallet, User, Filter, Promos)
 * พร้อมระบบ Event Emitter สำหรับแจ้งเตือน Components อื่นแบบ Pub/Sub
 * ==============================================================================
 */

class Store {
  constructor() {
    this.events = {};
    
    // โหลด State จาก LocalStorage
    this.state = {
      user: null,
      walletBalance: parseFloat(localStorage.getItem("wichx_balance") || "500.00"),
      cart: JSON.parse(localStorage.getItem("wichx_cart") || "[]"),
      orderHistory: JSON.parse(localStorage.getItem("wichx_orders") || "[]"),
      appliedPromo: null,
      categories: window.categoriesData || [],
      categoryFilters: {},
      categoryCollapses: {},
      searchQuery: "",
      activeCarouselIndex: 0
    };
  }

  // --- PUB/SUB EVENT EMITTER ---
  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(h => h !== handler);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(handler => handler(data));
    }
  }

  // --- STATE ACCESSORS ---
  get(key) {
    return this.state[key];
  }

  set(key, value, silent = false) {
    this.state[key] = value;
    if (!silent) {
      this.emit(`change:${key}`, value);
      this.emit("change", { key, value });
    }
  }

  // --- WALLET METHODS ---
  setWalletBalance(amount) {
    this.state.walletBalance = parseFloat(amount) || 0;
    localStorage.setItem("wichx_balance", this.state.walletBalance.toString());
    this.emit("change:wallet", this.state.walletBalance);
  }

  creditWallet(amount) {
    this.setWalletBalance(this.state.walletBalance + parseFloat(amount));
  }

  debitWallet(amount) {
    this.setWalletBalance(Math.max(0, this.state.walletBalance - parseFloat(amount)));
  }

  // --- CART METHODS ---
  saveCart() {
    localStorage.setItem("wichx_cart", JSON.stringify(this.state.cart));
    this.emit("change:cart", this.state.cart);
  }

  addToCart(product, quantity = 1, customData = null) {
    const existingIndex = this.state.cart.findIndex(item => 
      item.id === product.id && JSON.stringify(item.customData) === JSON.stringify(customData)
    );

    if (existingIndex > -1) {
      this.state.cart[existingIndex].quantity += quantity;
    } else {
      this.state.cart.push({
        id: product.id,
        title: product.title,
        price: parseFloat(product.price),
        quantity: quantity,
        fulfillmentType: product.fulfillmentType || "instant",
        customData: customData,
        chips: product.chips || []
      });
    }

    this.saveCart();
  }

  updateCartQuantity(index, newQty) {
    if (newQty <= 0) {
      this.removeFromCart(index);
    } else {
      this.state.cart[index].quantity = newQty;
      this.saveCart();
    }
  }

  removeFromCart(index) {
    this.state.cart.splice(index, 1);
    this.saveCart();
  }

  clearCart() {
    this.state.cart = [];
    this.saveCart();
  }

  // --- USER AUTH METHODS ---
  setUser(user) {
    this.state.user = user;
    this.emit("change:user", user);
  }
}

// Global Singleton Instance
window.AppStore = new Store();
