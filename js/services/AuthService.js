/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — MULTI-PROVIDER AUTH SERVICE (OOP AUTHENTICATION & PROFILES)
 * ==============================================================================
 * รองรับการเข้าสู่ระบบหลากหลายช่องทาง:
 * 1. Discord OAuth2 (สำหรับคีย์ เกมเมอร์ และสมาชิกเซิร์ฟเวอร์)
 * 2. Google OAuth2 (1-Click Login สำหรับลูกค้าทั่วไป)
 * 3. GitHub OAuth2 (สำหรับนักพัฒนาและโปรแกรมเมอร์)
 * 4. Email & Password (สมัครสมาชิกด้วยอีเมลและรหัสผ่าน)
 * 5. Magic Link / Email OTP (เข้าสู่ระบบผ่านลิงก์ยืนยันในอีเมล)
 * ==============================================================================
 */

class AuthService {
  constructor(store) {
    this.store = store;
  }

  async init() {
    // ดักจับและแจ้งเตือน Error จาก OAuth Redirect ถ้ามี
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = urlParams.get("error_description") || hashParams.get("error_description") || urlParams.get("error") || hashParams.get("error");
      if (errorDesc) {
        console.warn("[AUTH OAUTH ERROR]", errorDesc);
        const cleanMsg = decodeURIComponent(errorDesc).replace(/\+/g, " ");
        setTimeout(() => {
          window.UI?.toast(`เข้าสู่ระบบไม่สำเร็จ: ${cleanMsg}`, "error");
        }, 300);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

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
          const u = this.store.get("user");
          const prov = u?.provider ? ` (${u.provider.toUpperCase()})` : "";
          window.UI?.toast(`ยินดีต้อนรับ ${u?.username || "Member"}${prov} เข้าสู่ระบบ!`, "success");
        }
      } else if (event === "SIGNED_OUT") {
        this.applyGuestSession();
        window.UI?.toast("ออกจากระบบเรียบร้อยแล้ว", "info");
      }
    });
  }

  async applyUserSession(user) {
    const meta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};
    const provider = appMeta.provider || (user.identities && user.identities[0]?.provider) || "email";
    
    // Discord ID extraction only if provider is discord
    const discordId = provider === "discord" ? String(meta.provider_id || meta.sub || "") : "";
    
    const adminIds = (window.storeConfig && window.storeConfig.adminDiscordIds) || ["483398326159671326", "422611554475835394"];
    const adminEmails = ["sanaseeriri@gmail.com"];
    
    const isAdmin = (discordId && adminIds.includes(discordId)) || (user.email && adminEmails.includes(user.email.toLowerCase()));

    const userData = {
      id: user.id,
      email: user.email || "",
      provider: provider,
      discordId: discordId,
      username: meta.custom_claims?.global_name || meta.full_name || meta.user_name || meta.name || user.email?.split("@")[0] || "Member",
      avatarUrl: meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
      role: isAdmin ? "admin" : "customer"
    };

    // ดึงยอดเงินจริงจากตาราง profiles
    try {
      const profile = await window.SupabaseAdapter.getUserProfile(user.id);
      if (profile) {
        if (profile.username) userData.username = profile.username;
        if (profile.avatar_url) userData.avatarUrl = profile.avatar_url;
        if (profile.role) userData.role = profile.role;
        this.store.setWalletBalance(parseFloat(profile.balance || 0));
        this.store.setLoyaltyPoints(parseFloat(profile.points || 0));
      }
    } catch (err) {
      console.warn("[AUTH SERVICE] Profile balance warning:", err.message);
    }

    // ซิงค์สิทธิ์แอดมินข้ามหน้าไปยัง /admin และ admin.html อัตโนมัติ (Zero-Friction Admin Bridge)
    if (userData.role === "admin" || (discordId && adminIds.includes(discordId)) || (user.email && adminEmails.includes(user.email.toLowerCase()))) {
      try {
        sessionStorage.setItem("nyx9_admin_token", "nyx9_secure_admin_passphrase");
        localStorage.setItem("nyx9_admin_token", "nyx9_secure_admin_passphrase");
      } catch (e) {}
    }

    this.store.setUser(userData);
  }

  applyGuestSession() {
    try {
      sessionStorage.removeItem("nyx9_admin_token");
      localStorage.removeItem("nyx9_admin_token");
    } catch (e) {}
    this.store.setUser(null);
    this.store.setWalletBalance(parseFloat(localStorage.getItem("nyx_balance") || "0.00"));
    this.store.setLoyaltyPoints(parseFloat(localStorage.getItem("nyx_points") || "0.00"));
  }

  // --- SOCIAL OAUTH LOGINS ---

  async loginWithOAuth(provider = "discord") {
    if (!window.SupabaseAdapter || !window.SupabaseAdapter.isLive) {
      window.UI?.toast("ระบบยังไม่ได้เชื่อมต่อกับ Supabase", "error");
      return;
    }
    try {
      await window.SupabaseAdapter.loginWithOAuth(provider);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("provider is not enabled") || msg.includes("validation_failed")) {
        const provName = provider.charAt(0).toUpperCase() + provider.slice(1);
        window.UI?.toast(`ยังไม่ได้เปิดใช้งาน ${provName} ใน Supabase Dashboard (ไปที่ Authentication -> Providers -> ${provName} เพื่อใส่ Client ID & Secret)`, "warning");
      } else {
        window.UI?.toast(`เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย ${provider}: ${msg}`, "error");
      }
    }
  }

  async loginWithDiscord() {
    return this.loginWithOAuth("discord");
  }

  async loginWithGoogle() {
    return this.loginWithOAuth("google");
  }

  async loginWithGitHub() {
    return this.loginWithOAuth("github");
  }

  // --- EMAIL & PASSWORD AUTH ---

  async loginWithPassword(email, password) {
    if (!email || !password) throw new Error("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
    try {
      const data = await window.SupabaseAdapter.loginWithPassword(email, password);
      if (data?.user) {
        await this.applyUserSession(data.user);
        window.UI?.toast("เข้าสู่ระบบด้วยอีเมลสำเร็จ!", "success");
      }
      return data;
    } catch (err) {
      let msg = err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      if (msg.includes("Invalid login credentials")) {
        msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
      } else if (msg.includes("Email not confirmed")) {
        msg = "กรุณากดยืนยันอีเมลในกล่องข้อความก่อนเข้าสู่ระบบ";
      }
      throw new Error(msg);
    }
  }

  async signUpWithPassword(email, password, username = "") {
    if (!email || !password) throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
    if (password.length < 6) throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");

    try {
      const data = await window.SupabaseAdapter.signUpWithPassword(email, password, username);
      if (data?.user) {
        if (data.session) {
          await this.applyUserSession(data.user);
          window.UI?.toast("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!", "success");
        } else {
          window.UI?.toast("สมัครสมาชิกสำเร็จ! โปรดตรวจสอบอีเมลเพื่อกดยืนยันบัญชี", "info");
        }
      }
      return data;
    } catch (err) {
      let msg = err.message || "สมัครสมาชิกไม่สำเร็จ";
      if (msg.includes("User already registered")) {
        msg = "อีเมลนี้มีผู้ใช้งานแล้ว กรุณากดเข้าสู่ระบบหรือใช้ฟังก์ชันลืมรหัสผ่าน";
      }
      throw new Error(msg);
    }
  }

  async loginWithOtp(email) {
    if (!email || !email.includes("@")) throw new Error("กรุณาระบุอีเมลที่ถูกต้อง");
    try {
      const data = await window.SupabaseAdapter.loginWithOtp(email);
      window.UI?.toast(`ส่ง Magic Link ไปที่ ${email} เรียบร้อยแล้ว! กรุณาเช็กกล่องจดหมาย`, "success");
      return data;
    } catch (err) {
      throw new Error(err.message || "ส่ง Magic Link ไม่สำเร็จ");
    }
  }

  async resetPassword(email) {
    if (!email || !email.includes("@")) throw new Error("กรุณาระบุอีเมลที่ถูกต้อง");
    try {
      const data = await window.SupabaseAdapter.resetPassword(email);
      window.UI?.toast(`ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${email} เรียบร้อยแล้ว!`, "success");
      return data;
    } catch (err) {
      throw new Error(err.message || "ส่งลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ");
    }
  }

  async logout() {
    if (!window.SupabaseAdapter) return;
    await window.SupabaseAdapter.logout();
    this.applyGuestSession();
  }
}

if (typeof window !== "undefined") {
  window.AuthService = AuthService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AuthService;
}
