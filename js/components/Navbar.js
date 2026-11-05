/**
 * ==============================================================================
 * 🧭 NAVBAR COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class NavbarComponent {
  constructor(store) {
    this.store = store;
    this.initListeners();
  }

  initListeners() {
    this.store.on("change:wallet", () => this.updateWalletUI());
    this.store.on("change:user", () => this.updateAuthUI());
    this.store.on("change:cart", () => this.updateCartBadge());
  }

  updateWalletUI() {
    const balance = this.store.get("walletBalance") || 0;
    const el = document.getElementById("user-wallet-balance");
    if (el) el.textContent = `฿${balance.toFixed(2)}`;

    const cartBal = document.getElementById("cart-wallet-balance");
    if (cartBal) cartBal.textContent = `฿${balance.toFixed(2)}`;
  }

  updateAuthUI() {
    const user = this.store.get("user");
    const loginBtn = document.getElementById("btn-discord-login");
    const profileBadge = document.getElementById("user-profile-badge");
    const avatarImg = document.getElementById("user-avatar-img");
    const nameEl = document.getElementById("user-display-name");

    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (profileBadge) {
        profileBadge.classList.remove("hidden");
        profileBadge.classList.add("flex");
      }
      if (avatarImg) avatarImg.src = user.avatarUrl;
      if (nameEl) nameEl.textContent = user.username;
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (profileBadge) {
        profileBadge.classList.add("hidden");
        profileBadge.classList.remove("flex");
      }
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
      badge.className = "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--accent)] text-[#06080C] text-[10px] font-extrabold flex items-center justify-center animate-pulse shadow-lg shadow-[var(--accent)]/40";
    } else {
      badge.className = "hidden";
    }
  }
}

window.NavbarComponent = NavbarComponent;
