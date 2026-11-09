/**
 * ==============================================================================
 * 🔐 ADMIN AUTH & ACCESS CONTROL SERVICE
 * ==============================================================================
 * Handles Administrator Whitelist, Discord OAuth, Master PIN Gate, and Session
 * ==============================================================================
 */

class AdminAuth {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.isVerifyingAdmin = false;
    this.defaultWhitelist = [
      "483398326159671326",
      "422611554475835394"
    ];
  }

  getWhitelist() {
    return (window.storeConfig && window.storeConfig.adminDiscordIds) || this.defaultWhitelist;
  }

  extractDiscordId(user) {
    if (!user) return "";
    const meta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};
    const identities = Array.isArray(user.identities) ? user.identities : [];
    const discordIdentity = identities.find(i => i.provider === 'discord') || identities[0];

    const candidates = [
      meta.provider_id,
      meta.sub,
      discordIdentity?.id,
      discordIdentity?.identity_data?.provider_id,
      discordIdentity?.identity_data?.sub,
      meta.custom_claims?.sub,
      appMeta.provider_id
    ];

    for (const c of candidates) {
      if (c && typeof c === 'string' && /^\d{17,20}$/.test(c.trim())) {
        return c.trim();
      }
    }
    return String(meta.provider_id || meta.sub || (discordIdentity && discordIdentity.id) || "").trim();
  }

  async checkAdminSession(onAuthenticated) {
    const supabase = this.apiClient.initSupabase();
    if (!supabase) return;

    try {
      // 1. Direct getSession()
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        await this.handleAdminUser(session.user, onAuthenticated);
        if (this.store.get("adminUser")) return;
      }

      // 2. Recover session from localStorage sb-* keys
      if (typeof localStorage !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("sb-") || k.includes("auth-token"))) {
            const raw = localStorage.getItem(k);
            if (raw && raw.includes("access_token")) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.access_token && parsed.user) {
                  await supabase.auth.setSession({
                    access_token: parsed.access_token,
                    refresh_token: parsed.refresh_token || ""
                  });
                  await this.handleAdminUser(parsed.user, onAuthenticated);
                  if (this.store.get("adminUser")) return;
                }
              } catch (e) {}
            }
          }
        }
      }

      // 3. Fallback: Saved Secret in sessionStorage/localStorage
      const savedSecret = this.store.get("adminSecret");
      if (savedSecret) {
        await this.verifyAndLoad(savedSecret, onAuthenticated);
        if (this.store.get("adminUser")) return;
      }

      // 4. Real-time auth listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user && !this.store.get("adminUser")) {
          await this.handleAdminUser(session.user, onAuthenticated);
        }
      });
    } catch (err) {
      console.warn("[AdminAuth] Session verification error:", err);
    }
  }

  async handleAdminUser(user, onAuthenticated) {
    if (!user || this.isVerifyingAdmin || this.store.get("adminUser")) return;
    this.isVerifyingAdmin = true;

    try {
      const meta = user.user_metadata || {};
      const discordId = this.extractDiscordId(user);
      let username = meta.custom_claims?.global_name || meta.full_name || meta.user_name || "Admin Member";
      let avatarUrl = meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;
      let isAuthorized = this.getWhitelist().includes(discordId);

      const supabase = this.apiClient.initSupabase();
      if (!isAuthorized && supabase) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, discord_id, username, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.role === "admin" || this.getWhitelist().includes(String(profile.discord_id))) {
              isAuthorized = true;
              if (profile.username) username = profile.username;
              if (profile.avatar_url) avatarUrl = profile.avatar_url;
            }
          }
        } catch (e) {
          console.warn("[AdminAuth] Database profile check error:", e);
        }
      }

      if (isAuthorized) {
        const adminUser = { id: user.id, discordId, username, avatarUrl };
        this.store.set("adminUser", adminUser);
        this.store.set("adminSecret", "nyx9_secure_admin_passphrase");

        this.setAdminBadge(username, avatarUrl, discordId);
        this.unlockDashboard();

        if (typeof onAuthenticated === "function") {
          await onAuthenticated();
        }
      } else {
        this.showAccessDenied(username, discordId);
      }
    } catch (err) {
      console.warn("[AdminAuth] Auth handling error:", err);
    } finally {
      this.isVerifyingAdmin = false;
    }
  }

  async verifyAndLoad(secret, onAuthenticated) {
    try {
      const { data } = await this.apiClient.rpc("admin_get_metrics", { p_admin_secret: secret });
      if (data && data.success) {
        this.store.set("adminSecret", secret);
        this.store.set("adminUser", { id: "master_admin", username: "Master Admin" });
        this.unlockDashboard();
        await this.checkAdminPin2FA();
        if (typeof onAuthenticated === "function") {
          await onAuthenticated();
        }
      } else {
        this.store.set("adminSecret", "");
      }
    } catch (e) {
      console.warn("[AdminAuth] verifyAndLoad error:", e);
    }
  }

  unlockDashboard() {
    const overlay = document.getElementById("admin-auth-overlay");
    const dashboard = document.getElementById("admin-dashboard-container");
    if (overlay) overlay.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
  }

  setAdminBadge(username, avatarUrl, discordId) {
    const name = document.getElementById("admin-profile-name");
    const avatar = document.getElementById("admin-profile-avatar");
    const idEl = document.getElementById("admin-profile-id");
    if (name) name.textContent = username;
    if (avatar && avatarUrl) avatar.src = avatarUrl;
    if (idEl) idEl.textContent = discordId || "Verified Admin";
  }

  showAccessDenied(username, discordId) {
    const loginBox = document.getElementById("admin-login-box");
    const deniedBox = document.getElementById("admin-denied-box");
    if (loginBox) loginBox.classList.add("hidden");
    if (deniedBox) {
      deniedBox.classList.remove("hidden");
      const userEl = document.getElementById("denied-username");
      const idEl = document.getElementById("denied-discord-id");
      if (userEl) userEl.textContent = username || "Discord Member";
      if (idEl) idEl.textContent = discordId || "ไม่พบ ID";
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async loginWithDiscordAdmin() {
    const supabase = this.apiClient.initSupabase();
    const btn = document.getElementById("btn-discord-admin-login");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังเชื่อมต่อ Discord...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
    const redirectTo = window.location.origin + window.location.pathname;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      this.showAuthError("ไม่สามารถเชื่อมต่อ Discord: " + err.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.288a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> <span>เข้าสู่ระบบด้วย Discord แอดมิน</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleAdminLogin(e, onAuthenticated) {
    if (e) e.preventDefault();
    const input = document.getElementById("admin-secret-input");
    const secret = input ? input.value.trim() : "";
    const btn = document.getElementById("btn-admin-login");
    const errorDiv = document.getElementById("auth-error-msg");
    const errorText = document.getElementById("auth-error-text");

    if (!secret) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังตรวจสอบ...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
    if (errorDiv) errorDiv.classList.add("hidden");

    try {
      const { data, error } = await this.apiClient.rpc("admin_get_metrics", { p_admin_secret: secret });

      if (error || !data || !data.success) {
        if (errorText) errorText.textContent = data?.message || "รหัสผ่านไม่ถูกต้อง (Access Denied)";
        if (errorDiv) errorDiv.classList.remove("hidden");
        return;
      }

      this.store.set("adminSecret", secret);
      this.store.set("adminUser", { id: "master_admin", username: "Master Admin" });
      this.unlockDashboard();

      await this.checkAdminPin2FA();
      if (typeof onAuthenticated === "function") {
        await onAuthenticated();
      }
    } catch (err) {
      if (errorText) errorText.textContent = err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
      if (errorDiv) errorDiv.classList.remove("hidden");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="lock" class="w-3.5 h-3.5"></i> <span>ยืนยัน Master Key</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  async handleAdminLogout() {
    this.store.set("adminSecret", "");
    this.store.set("adminUser", null);
    try {
      sessionStorage.removeItem("admin_pin_session");
      const supabase = this.apiClient.initSupabase();
      if (supabase) await supabase.auth.signOut();
    } catch (e) {}
    window.location.reload();
  }

  showAuthError(msg) {
    const errorDiv = document.getElementById("auth-error-msg");
    const errorText = document.getElementById("auth-error-text");
    if (errorDiv && errorText) {
      errorText.textContent = msg;
      errorDiv.classList.remove("hidden");
    }
  }

  togglePasswordVisibility() {
    const input = document.getElementById("admin-secret-input");
    const icon = document.getElementById("eye-icon");
    if (!input) return;
    if (input.type === "password") {
      input.type = "text";
      if (icon) icon.setAttribute("data-lucide", "eye-off");
    } else {
      input.type = "password";
      if (icon) icon.setAttribute("data-lucide", "eye");
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // --- SPRINT 2: PIN 2FA SUITE ---
  async checkAdminPin2FA() {
    const modal = document.getElementById("admin-pin-modal");
    if (!modal) return;

    const token = sessionStorage.getItem("admin_pin_session");
    if (!token) {
      modal.classList.remove("hidden");
      document.getElementById("admin-pin-input")?.focus();
      return;
    }

    try {
      const res = await fetch("/api/admin-pin?action=verify_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data && data.authenticated) {
        modal.classList.add("hidden");
      } else {
        sessionStorage.removeItem("admin_pin_session");
        modal.classList.remove("hidden");
        document.getElementById("admin-pin-input")?.focus();
      }
    } catch (err) {
      modal.classList.add("hidden");
    }
  }

  async handleRequestAdminPinOtp() {
    const btn = document.getElementById("btn-request-pin-otp");
    const feedback = document.getElementById("admin-pin-feedback");
    if (!btn || !feedback) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังส่ง OTP...</span>';
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await fetch("/api/admin-pin?action=request_otp", { method: "POST" });
      const data = await res.json();
      feedback.className = "text-xs p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200";
      feedback.textContent = `📩 ${data.message || 'ส่งรหัส PIN เข้า Discord Webhook เรียบร้อยแล้ว'}`;
      feedback.classList.remove("hidden");
      document.getElementById("admin-pin-input")?.focus();
    } catch (err) {
      feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
      feedback.textContent = `ข้อผิดพลาด: ${err.message}`;
      feedback.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async handleVerifyAdminPin(onSuccess) {
    const input = document.getElementById("admin-pin-input");
    const btn = document.getElementById("btn-verify-pin");
    const feedback = document.getElementById("admin-pin-feedback");
    const modal = document.getElementById("admin-pin-modal");
    const pin = input?.value.trim();

    if (!pin || pin.length !== 6) {
      if (feedback) {
        feedback.className = "text-xs p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200";
        feedback.textContent = "⚠️ กรุณากรอกตัวเลข PIN 6 หลักให้ครบถ้วน";
        feedback.classList.remove("hidden");
      }
      input?.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังตรวจสอบ...</span>';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await fetch("/api/admin-pin?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (res.ok && data.success && data.token) {
        sessionStorage.setItem("admin_pin_session", data.token);
        if (modal) modal.classList.add("hidden");
        if (feedback) feedback.classList.add("hidden");
        if (input) input.value = "";
        window.AdminUI?.showToast("✅ ยืนยันรหัส PIN 2FA ถูกต้อง", "success");
        if (typeof onSuccess === "function") await onSuccess();
      } else {
        if (feedback) {
          feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
          feedback.textContent = `❌ ${data.message || 'รหัส PIN ไม่ถูกต้อง'}`;
          feedback.classList.remove("hidden");
        }
        input?.select();
      }
    } catch (err) {
      if (feedback) {
        feedback.className = "text-xs p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200";
        feedback.textContent = `ข้อผิดพลาด: ${err.message}`;
        feedback.classList.remove("hidden");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="key-round" class="w-4 h-4"></i> <span>ยืนยันรหัสความปลอดภัย</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AdminAuth = AdminAuth;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminAuth;
}
