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
    const adminLink = document.getElementById("nav-admin-link");

    const adminIds = (window.storeConfig && window.storeConfig.adminDiscordIds) || ["483398326159671326", "422611554475835394"];
    const isAdmin = user && (user.role === "admin" || adminIds.includes(String(user.discordId)));

    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (profileBadge) {
        profileBadge.classList.remove("hidden");
        profileBadge.classList.add("flex");
      }
      if (avatarImg) avatarImg.src = user.avatarUrl;
      if (nameEl) nameEl.textContent = user.username;

      // แสดงปุ่มเข้าหลังบ้านเฉพาะแอดมิน 2 ไอดี
      if (adminLink) {
        if (isAdmin) {
          adminLink.classList.remove("hidden");
          adminLink.classList.add("inline-flex");
        } else {
          adminLink.classList.add("hidden");
          adminLink.classList.remove("inline-flex");
        }
      }
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (profileBadge) {
        profileBadge.classList.add("hidden");
        profileBadge.classList.remove("flex");
      }
      if (adminLink) {
        adminLink.classList.add("hidden");
        adminLink.classList.remove("inline-flex");
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
      badge.className = "absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-[#06080C] text-[10px] font-mono-val font-extrabold flex items-center justify-center animate-pulse shadow-md shadow-[var(--accent)]/40";
    } else {
      badge.className = "hidden";
    }
  }
}

window.NavbarComponent = NavbarComponent;
