/**
 * ==============================================================================
 * 👾 DISCORD AUTH SERVICE (OOP AUTHENTICATION & PROFILES)
 * ==============================================================================
 */

class AuthService {
  constructor(store) {
    this.store = store;
  }

  async init() {
    if (!window.SupabaseAdapter || !window.SupabaseAdapter.isLive) return;

    // 1. ตรวจสอบ Session เดิม
    const session = await window.SupabaseAdapter.getSession();
    if (session && session.user) {
      await this.applyUserSession(session.user);
    } else {
      this.applyGuestSession();
    }

    // 2. ดักฟัง Event จาก Supabase Auth
    window.SupabaseAdapter.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        await this.applyUserSession(session.user);
        if (event === "SIGNED_IN") {
          window.UI?.toast(`ยินดีต้อนรับ ${this.store.get("user")?.username || "Discord Member"} เข้าสู่ระบบ!`, "success");
        }
      } else if (event === "SIGNED_OUT") {
        this.applyGuestSession();
        window.UI?.toast("ออกจากระบบเรียบร้อยแล้ว", "info");
      }
    });
  }

  async applyUserSession(user) {
    const meta = user.user_metadata || {};
    const userData = {
      id: user.id,
      email: user.email,
      discordId: meta.provider_id || meta.sub || null,
      username: meta.custom_claims?.global_name || meta.full_name || meta.user_name || meta.name || user.email?.split("@")[0] || "Member",
      avatarUrl: meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`
    };

    // ดึงยอดเงินจริงจากตาราง profiles
    try {
      const profile = await window.SupabaseAdapter.getUserProfile(user.id);
      if (profile) {
        if (profile.username) userData.username = profile.username;
        if (profile.avatar_url) userData.avatarUrl = profile.avatar_url;
        this.store.setWalletBalance(parseFloat(profile.balance || 0));
      }
    } catch (err) {
      console.warn("[AUTH SERVICE] Profile balance warning:", err.message);
    }

    this.store.setUser(userData);
  }

  applyGuestSession() {
    this.store.setUser(null);
    this.store.setWalletBalance(parseFloat(localStorage.getItem("wichx_balance") || "500.00"));
  }

  async loginWithDiscord() {
    if (!window.SupabaseAdapter || !window.SupabaseAdapter.isLive) {
      window.UI?.toast("ระบบยังไม่ได้เชื่อมต่อกับ Supabase", "error");
      return;
    }
    try {
      await window.SupabaseAdapter.loginWithDiscord();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("provider is not enabled") || msg.includes("validation_failed")) {
        window.UI?.toast("ยังไม่ได้เปิดใช้งาน Discord ใน Supabase Dashboard (ไปที่ Authentication -> Providers -> Discord เพื่อใส่ Client ID & Secret)", "warning");
      } else {
        window.UI?.toast(`เกิดข้อผิดพลาด: ${msg}`, "error");
      }
    }
  }

  async logout() {
    if (!window.SupabaseAdapter) return;
    await window.SupabaseAdapter.logout();
  }
}

window.AuthService = AuthService;
