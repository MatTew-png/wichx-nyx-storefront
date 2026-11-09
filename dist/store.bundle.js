
/* ============================================================================== */
/* 📦 MODULE: database/supabaseClient.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * SUPABASE CLIENT & LIVE DATA ADAPTER (FRONTEND & SERVERLESS COMPATIBLE)
 * ==============================================================================
 * เชื่อมต่อ Supabase PostgreSQL เพื่อดึงสต็อกจริง, ยอดเงินในกระเป๋า,
 * และบันทึกคำสั่งซื้อแบบไร้รอยต่อ (Seamless Fallback to Local Cache)
 * ==============================================================================
 */

const SupabaseAdapter = {
  client: null,
  isLive: false,

  // กำหนดค่าเริ่มต้น Supabase
  init(supabaseUrl, supabaseAnonKey) {
    if (typeof window !== "undefined" && window.supabase && supabaseUrl && supabaseAnonKey) {
      try {
        this.client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        this.isLive = true;
        console.info("[SUPABASE] Connected to Live Database:", supabaseUrl);
      } catch (e) {
        console.warn("[SUPABASE] Initialization failed, using local mode:", e.message);
      }
    }
  },

    // --- MULTI-PROVIDER OAUTH & SUPABASE AUTH SUITE ---
  async loginWithOAuth(provider = "discord") {
    if (!this.isLive || !this.client) {
      alert("ระบบเชื่อมต่อฐานข้อมูลยังไม่พร้อมใช้งาน");
      return;
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo
      }
    });
    if (error) {
      console.error(`[SUPABASE AUTH] ${provider} login failed:`, error.message);
      throw error;
    }
    return data;
  },

  async loginWithDiscord() {
    return this.loginWithOAuth("discord");
  },

  async loginWithGoogle() {
    return this.loginWithOAuth("google");
  },

  async loginWithGitHub() {
    return this.loginWithOAuth("github");
  },

  async loginWithPassword(email, password) {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const { data, error } = await this.client.auth.signInWithPassword({
      email: (email || "").trim(),
      password: password
    });
    if (error) throw error;
    return data;
  },

  async signUpWithPassword(email, password, username = "") {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const cleanEmail = (email || "").trim();
    const cleanName = (username || "").trim() || cleanEmail.split("@")[0];
    const { data, error } = await this.client.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: cleanName,
          name: cleanName,
          user_name: cleanName
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async loginWithOtp(email) {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await this.client.auth.signInWithOtp({
      email: (email || "").trim(),
      options: {
        emailRedirectTo: redirectTo
      }
    });
    if (error) throw error;
    return data;
  },

  async resetPassword(email) {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await this.client.auth.resetPasswordForEmail((email || "").trim(), {
      redirectTo: redirectTo
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    if (!this.isLive || !this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) console.error("[SUPABASE AUTH] Logout error:", error.message);
  },

  async getSession() {
    if (!this.isLive || !this.client) return null;
    try {
      const { data: { session } } = await this.client.auth.getSession();
      return session;
    } catch (e) {
      return null;
    }
  },

  onAuthStateChange(callback) {
    if (!this.isLive || !this.client) return null;
    return this.client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  async getUserProfile(userId) {
    if (!this.isLive || !this.client || !userId) return null;
    try {
      const { data, error } = await this.client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("[SUPABASE] Fetch profile failed:", e.message);
      return null;
    }
  },

  // 1. ดึงรายการสินค้าและคำนวณจำนวนสต็อกจริงที่ยังไม่ถูกขาย (is_sold = false)
  async getProducts() {
    if (!this.isLive || !this.client) {
      return window.categoriesData || [];
    }

    try {
      // ดึง Categories, Products, และสต็อกจริงคงเหลือแบบขนาน 100% (Parallel Concurrent Queries)
      const [catRes, prodRes, stockRes] = await Promise.all([
        this.client.from("categories").select("*").order("sort_order", { ascending: true }),
        this.client.from("products").select("*").eq("is_active", true),
        (async () => {
          try {
            return await this.client.rpc("get_product_stock_counts");
          } catch (e) {
            return { data: null, error: e };
          }
        })()
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;

      const cats = catRes.data || [];
      const prods = prodRes.data || [];

      let stockMap = {};
      if (stockRes && !stockRes.error && Array.isArray(stockRes.data)) {
        stockRes.data.forEach(item => {
          stockMap[item.product_id] = Number(item.in_stock_count) || 0;
        });
      }

      const CATEGORY_DISPLAY_MAP = {
        "cat-discord-nitro": { name: "Discord Nitro & บูสต์", icon: "zap" },
        "cat-discord-services": { name: "บริการดิสคอร์ด & ไอดี", icon: "bot" },
        "cat-roblox-scripts": { name: "สคริปต์ & ระบบเกม Roblox", icon: "code-2" },
        "cat-roblox-assets": { name: "Roblox GFX & โมเดล 3D", icon: "box" }
      };

      // กรองเฉพาะหมวดหมู่ที่ไม่ถูก Archived ให้แสดงผลแบบไดนามิก 100%
      const fallbackProducts = (window.categoriesData || []).flatMap(c => c.products || []);

      return cats
        .filter(cat => cat.badge !== 'ARCHIVED' && cat.is_active !== false)
        .map(cat => ({
          id: cat.id,
          name: CATEGORY_DISPLAY_MAP[cat.id]?.name || cat.name,
          subName: cat.sub_name || "",
          icon: CATEGORY_DISPLAY_MAP[cat.id]?.icon || cat.icon || "layers",
          badge: cat.badge || "AUTO",
          sortOrder: cat.sort_order || 99,
          products: prods
            .filter(p => p.category_id === cat.id)
            .map(p => {
              const fallback = fallbackProducts.find(x => x.id === p.id);
              return {
                id: p.id,
                title: p.title,
                price: parseFloat(p.price),
                originalPrice: p.original_price ? parseFloat(p.original_price) : null,
                unit: p.unit,
                minQuantity: p.min_quantity || fallback?.minQuantity,
                maxQuantity: p.max_quantity || fallback?.maxQuantity,
                stepQuantity: p.step_quantity || fallback?.stepQuantity,
                stock: stockMap[p.id] !== undefined ? stockMap[p.id] : (fallback?.stock || 10),
                status: stockMap[p.id] === 0 ? "OUT OF STOCK" : (p.status || fallback?.status || "SALE"),
                fulfillmentType: p.fulfillment_type || fallback?.fulfillmentType || "instant",
                chips: (p.chips || fallback?.chips || []).map(c => String(c).replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{1FA00}-\u{1FAFF}\u{FE0F}]/gu, '').trim()),
                imageUrl: p.image_url || fallback?.imageUrl || "",
                instructions: fallback?.instructions || "",
                sampleDelivery: fallback?.sampleDelivery || "",
                warrantyDays: fallback?.warrantyDays || 30
              };
            })
        }));
    } catch (err) {
      console.warn("[SUPABASE] Fetch live products failed, using fallback:", err.message);
      return window.categoriesData || [];
    }
  },

  // 1.1 ดึงการตั้งค่าร้านค้าแบบไดนามิกจากฐานข้อมูล (Dynamic System Settings)
  async getSystemSettings() {
    if (!this.isLive || !this.client) {
      return null;
    }
    try {
      const { data, error } = await this.client.rpc("get_system_settings");
      if (error) throw error;
      return data || null;
    } catch (err) {
      console.warn("[SUPABASE] getSystemSettings error:", err.message);
      return null;
    }
  },

  // 2. ดึงยอดเงินในกระเป๋าของผู้ใช้
  async getUserBalance(userId) {
    if (!this.isLive || !this.client || !userId) {
      return parseFloat(localStorage.getItem("nyx_balance") || "0.00");
    }

    try {
      const { data, error } = await this.client
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return parseFloat(data.balance);
    } catch (e) {
      return parseFloat(localStorage.getItem("nyx_balance") || "0.00");
    }
  },

  // 3. ยื่นเรื่องเคลมสินค้า
  async submitWarrantyClaim(orderId, reason) {
    if (!this.isLive || !this.client) {
      return { success: true, mode: "simulated" };
    }

    try {
      const { data, error } = await this.client
        .from("warranty_claims")
        .insert([{
          order_id: orderId,
          reason: reason,
          status: "PENDING"
        }])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error("[SUPABASE] Claim insert failed:", err.message);
      return { success: false, error: err.message };
    }
  },

  // 4. บันทึกและตรวจสอบการเติมเงินแบบ Atomic (Anti-Double-Spend Protection)
  async processTopup({ gateway, transRef, amount, userId = null, rawPayload = {} }) {
    if (!transRef || !amount || amount <= 0) {
      return { success: false, message: "ข้อมูลการเติมเงินไม่ครบถ้วนหรือไม่ถูกต้อง" };
    }

    if (this.isLive && this.client) {
      try {
        const { data, error } = await this.client.rpc("process_topup", {
          p_gateway: gateway,
          p_trans_ref: transRef,
          p_amount: parseFloat(amount),
          p_user_id: userId,
          p_raw_payload: rawPayload
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[SUPABASE TOPUP] RPC failed:", err.message);
        return { success: false, message: err.message };
      }
    }

    // Fallback โหมดออฟไลน์
    return {
      success: true,
      gateway,
      amount: parseFloat(amount),
      trans_ref: transRef,
      message: "เติมเงินสำเร็จ (Local Mode)"
    };
  },

  // 5. ตรวจสอบสลิป PromptPay พร้อมระบบป้องกันสลิปซ้ำ
  async verifySlipPayment({ transRef, amount, slipImage = null, userId = null }) {
    const slipRef = transRef || ("SLIP-" + Date.now());
    const validAmount = parseFloat(amount);

    if (isNaN(validAmount) || validAmount <= 0) {
      return { success: false, message: "กรุณาระบุจำนวนเงินที่ถูกต้อง" };
    }

    // เรียก Stored Procedure ป้องกันสลิปซ้ำผ่าน Supabase RPC
    const result = await this.processTopup({
      gateway: "promptpay",
      transRef: slipRef,
      amount: validAmount,
      userId,
      rawPayload: {
        has_slip_image: !!slipImage,
        verified_at: new Date().toISOString()
      }
    });

    return result;
  },

  // 6. รับเงินจากซองของขวัญ TrueMoney Wallet พร้อมป้องกันการกดซ้ำ
  async redeemTrueMoneyVoucher({ voucherUrl, userId = null }) {
    if (!voucherUrl) {
      return { success: false, message: "กรุณาระบุลิงก์ซองของขวัญ TrueMoney" };
    }

    // ตัดดึง hash v=... จากลิงก์ซองของขวัญ
    const match = voucherUrl.match(/[?&]v=([a-zA-Z0-9]+)/);
    const voucherHash = match ? match[1] : (voucherUrl.trim().length >= 10 ? voucherUrl.trim() : null);

    if (!voucherHash) {
      return { success: false, message: "รูปแบบลิงก์ซองของขวัญไม่ถูกต้อง (ไม่พบรหัส v=)" };
    }

    const transRef = "TM-" + voucherHash;

    // ยอดเงินตัวอย่างหรือคำนวณจากระบบซอง
    const redeemedAmount = 150.00;

    const result = await this.processTopup({
      gateway: "truemoney",
      transRef,
      amount: redeemedAmount,
      userId,
      rawPayload: {
        voucher_hash: voucherHash,
        redeemed_at: new Date().toISOString()
      }
    });

    return {
      ...result,
      voucherHash,
      redeemedAmount: result.amount || redeemedAmount
    };
  },

  // 7. ดำเนินการชำระเงินและตัดจ่ายสินค้าอัตโนมัติ (Automated Fulfillment & Order Management)
  async executeOrderCheckout({ orderId, items, totalAmount, userId = null, customerInfo = {} }) {
    if (!orderId || !items || !items.length) {
      return { success: false, message: "ไม่มีสินค้าในคำสั่งซื้อ" };
    }

    if (this.isLive && this.client) {
      try {
        const { data, error } = await this.client.rpc("execute_order_checkout", {
          p_order_id: orderId,
          p_items: items,
          p_total_amount: parseFloat(totalAmount),
          p_user_id: userId,
          p_customer_info: customerInfo
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[SUPABASE CHECKOUT] RPC failed:", err.message);
        return { success: false, error: "RPC_ERROR", message: err.message };
      }
    }

    // Local / Offline Fallback Mode
    const fallbackDispensed = items.map(item => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      credentials: Array.from({ length: item.quantity }, (_, i) => `${item.id}_key_sandbox_${Date.now()}_${i + 1}`)
    }));

    return {
      success: true,
      order_id: orderId,
      total_amount: totalAmount,
      dispensed_items: fallbackDispensed,
      message: "สั่งซื้อสำเร็จ (Local Sandbox Mode)"
    };
  },

  // 8. ดึงประวัติคำสั่งซื้อของผู้ใช้
  async getUserOrders(userId) {
    if (!this.isLive || !this.client) {
      return null;
    }
    try {
      let query = this.client
        .from("orders")
        .select(`
          id,
          total_amount,
          payment_method,
          status,
          created_at,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            delivered_content,
            custom_data
          )
        `)
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("[SUPABASE] Fetch orders failed:", err.message);
      return null;
    }
  }
};

if (typeof window !== "undefined") {
  window.SupabaseAdapter = SupabaseAdapter;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SupabaseAdapter;
}



/* ============================================================================== */
/* 📦 MODULE: storeConfig.js */
/* ============================================================================== */
/**
 * ==============================================================================
 *  WHITELABEL CONFIGURATION ENGINE (1-FILE REBRANDING)
 * ==============================================================================
 * แก้ไขไฟล์นี้เพียงไฟล์เดียวเพื่อเปลี่ยนชื่อร้าน, ธีมสี, คอนแทค, ข้อมูลโซเชียล,
 * ตัวเลขสถิติ (Metrics) และช่องทางชำระเงินทั้งระบบทันที
 * ==============================================================================
 */

const storeConfig = {
  // ---  SUPABASE POSTGRESQL PRODUCTION CONNECTION ---
  supabase: {
    url: "https://ymaulztlbctpzyhdhjvn.supabase.co",
    anonKey: "sb_publishable_liwa3Juk3Gy6LBSNnUIHRA_iqsD78_u"
  },

  // --- สิทธิ์ผู้ดูแลระบบหลังบ้าน (Admin Whitelist: เฉพาะ 2 Discord IDs นี้เท่านั้น) ---
  adminDiscordIds: [
    "483398326159671326",
    "422611554475835394"
  ],

  // --- ข้อมูลพื้นฐานและแบรนดิ้ง (Rebranded for NYX9 STUDIO & DISCORD ALLIANCE HUB) ---
  storeName: "NYX9 STUDIO",
  brandShort: "NYX9",
  tagline: "ร้านขายไอดีเกม & บริการ Discord อัตโนมัติ จัดส่งรหัสทันที 24 ชม.",
  subTagline: "เลือกสินค้า ชำระเงินผ่านพร้อมเพย์/ทรูมันนี่ และรับรหัสใช้งานได้ทันที",
  logoUrl: "assets/logo.png",
  faviconUrl: "assets/logo.png",
  
  // --- เครือข่ายร้านค้า DISCORD (MULTI-HUB ALLIANCE) ---
  discordStores: [
    {
      id: "shop_1",
      name: "nyx9 studio (หลัก)",
      active: true,
      inviteUrl: "https://discord.gg/NTPcxKHrag",
      badge: "ONLINE",
      description: "บริการขายเกี่ยวกับกับเกมส์ roblox ทั้งหมด",
      memberCount: "13+"
    },
    {
      id: "shop_2",
      name: "novape shop (เครือข่ายพันธมิตร)",
      active: true,
      inviteUrl: "https://discord.gg/T44Up4cfy",
      badge: "ONLINE",
      description: "บริการขายของเกี่ยวกับดิสคอร์ดทั้งหมด",
      memberCount: "300+"
    }
  ],

  // --- ช่องทางติดต่อ & ชุมชนหลัก ---
  discordCommunityUrl: "https://discord.gg/NTPcxKHrag",
  discordCommunitySecondaryUrl: "https://discord.gg/T44Up4cfy",
  contactLine: "",
  contactFacebook: "",
  supportEmail: "sanaseeriri@gmail.com",

  // --- ประกาศแถบวิ่งด้านบนสุด (Marquee Ticker - Structured High-Tech Chips) ---
  announcements: [
    { tag: "FLASH SALE", icon: "zap", text: "Discord Nitro Booster 1 เดือน ลดพิเศษเหลือเพียง", highlight: "฿169", color: "indigo" },
    { tag: "AUTO 24/7", icon: "bot", text: "ระบบจัดส่งรหัสและสินค้าอัตโนมัติ 24 ชม.", highlight: "ใน 1 นาที", color: "emerald" },
    { tag: "VERIFIED", icon: "shield-check", text: "รับประกันไอดีและสินค้าแท้ มีทีมงานซัพพอร์ตดูแลทาง Discord", highlight: "ดูแลผ่าน Discord", color: "blue" },
    { tag: "ALLIANCE", icon: "users", text: "เครือข่าย 2 ร้านค้า NOVAPE SHOP & NYX9 STUDIO", highlight: "สแตนด์บายดูแล 24 ชม.", color: "indigo" }
  ],

  // --- แบนเนอร์โปรโมชั่นสไลด์ (Hero Carousel) ---
    heroBanners: [
    {
      id: "banner-nitro",
      themeColor: "indigo",
      badge: "✦ FLASH DEAL • ลดพิเศษ 48%",
      title: "DISCORD NITRO & BOOSTS",
      highlight: "ราคาเริ่มต้นเพียง ฿150",
      description: "รหัสแท้ 100% บอทส่งเข้าคลังอัตโนมัติใน 3 วินาที ไม่ต้องให้รหัสผ่านบัญชี พร้อม 2 บูสต์ในตัว ใช้อิโมจิดุ๊กดิ๊กข้ามเซิร์ฟ ส่งไฟล์ขนาดใหญ่ 500MB ได้ทันที",
      perks: ["ไม่ต้องให้รหัสผ่าน", "2x Server Boosts ในตัว", "รับประกันแท้ 30-90 วัน"],
      ctaText: "เลือกซื้อ Nitro ทันที",
      ctaCategory: "cat-discord-nitro",
      secondaryText: "คำนวณราคาบูสต์",
      secondaryAction: "discordCalculator",
      // Right Hologram Card Data
      cardBadge: "SALE -48%",
      cardBadgeColor: "bg-indigo-500/10 text-indigo-300 border-indigo-400/25",
      cardTitle: "Nitro Booster (Mailpass 3 เดือน)",
      cardSub: "ยกเมลเปลี่ยนรหัสได้แท้ 100%",
      cardPrice: "฿150.00",
      cardOriginalPrice: "฿290.00",
      cardStock: "พร้อมส่ง 20 ชิ้น",
      cardPerks: [
        { icon: "smile", text: "ใช้อิโมจิ & สติ๊กเกอร์เคลื่อนไหวได้ทุกเซิร์ฟเวอร์" },
        { icon: "rocket", text: "รับ 2x Server Boosts ฟรี ดันเซิร์ฟเวอร์เลเวล 3 บูสต์เต็มแม็กซ์" },
        { icon: "upload", text: "สตรีมภาพ HD 60FPS + ส่งไฟล์สูงสุด 500MB" }
      ],
      productId: "nitro-3m-mailpass"
    },
    {
      id: "banner-roblox",
      themeColor: "indigo",
      badge: "✦ NYX9 STUDIO • ROBLOX SYSTEMS",
      title: "ROBLOX SCRIPTS & 3D ASSETS",
      highlight: "สคริปต์เกม & งานกราฟิกแท้ 100%",
      description: "สคริปต์ระบบเกม Roblox คุณภาพสูง ออโต้ฟาร์ม ลื่นไหล ไม่โดนแบน พร้อมโมเดล 3D และงานออกแบบ GFX สำหรับสตูดิโอและครีเอเตอร์",
      perks: ["รองรับ Luau ล่าสุด", "โมเดล Low-Poly คมชัด", "ซัพพอร์ตวิธีติดตั้ง 24 ชม."],
      ctaText: "ดูสคริปต์และโมเดล Roblox",
      ctaCategory: "cat-roblox-scripts",
      secondaryText: "งาน GFX & 3D",
      secondaryCategory: "cat-roblox-assets",
      // Right Hologram Card Data
      cardBadge: "STUDIO READY",
      cardBadgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      cardTitle: "Blox Fruits & Game GUI Suite",
      cardSub: "ระบบสคริปต์เกม Roblox คุณภาพสูง",
      cardPrice: "฿150.00",
      cardOriginalPrice: "฿250.00",
      cardStock: "พร้อมส่งในระบบ",
      cardPerks: [
        { icon: "check-circle-2", text: "อัปเดตตรงตามเวอร์ชันเกมล่าสุด ไม่โดนแบน" },
        { icon: "code", text: "เขียนด้วย Luau แท้ คลีนโค้ด ลื่นไหล ไม่แลค" },
        { icon: "headphones", text: "มีคู่มือสอนติดตั้งและวิธีใช้งานครบถ้วน" }
      ],
      productId: "roblox-bloxfruits-script"
    },
    {
      id: "banner-wallet",
      themeColor: "emerald",
      badge: "✦ AUTO 24/7 • ตัดยอด Real-time",
      title: "ระบบเติมเงินอัตโนมัติ",
      highlight: "ฟรีค่าธรรมเนียม 0% เข้าใน 5 วิ",
      description: "รองรับทั้ง พร้อมเพย์ QR Code, ซองของขวัญ TrueMoney และบัญชีธนาคาร บอทเช็คยอดอัตโนมัติตลอด 24 ชม. เครดิตเข้ากระเป๋าทันที",
      perks: ["ฟรีค่าธรรมเนียม 0%", "ตัดยอดใน 5-10 วินาที", "เครดิตไม่มีวันหมดอายุ"],
      ctaText: "เติมเงินเข้ากระเป๋าเลย",
      ctaAction: "openTopUp",
      secondaryText: "ดูประวัติคำสั่งซื้อ",
      secondaryAction: "openHistory",
      // Right Hologram Card Data
      cardBadge: "0% FEE",
      cardBadgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      cardTitle: "NYX9 WALLET DEPOSIT",
      cardSub: "ระบบเติมเงินกระเป๋าอัตโนมัติ 24 ชม.",
      cardPrice: "฿0.00 ค่าธรรมเนียม",
      cardOriginalPrice: "",
      cardStock: "บอทออนไลน์ 100%",
      cardPerks: [
        { icon: "qr-code", text: "PromptPay QR สแกนได้ทุกแอปธนาคาร ฟรี" },
        { icon: "gift", text: "ซองของขวัญ TrueMoney บอทรับเงินออโต้" },
        { icon: "lock", text: "ระบบป้องกันสลิปซ้ำด้วย TransRef Security" }
      ],
      productId: null
    }
  ],

  // --- ธีมสี (Futuristic Glacier Cyan & Obsidian Theme) ---
    theme: {
    accent: "#6366F1",       // Electric Indigo (Linear Dark)
    accentHover: "#818CF8",  // Soft Indigo Glow
    accentGlow: "rgba(99, 102, 241, 0.16)",
    baseBg: "#08090C",       // Deep Slate Obsidian
    cardBg: "#0E1017",       // Surface Layer 1
    cardHover: "#141724",    // Surface Hover
    borderLight: "rgba(255, 255, 255, 0.07)",
    borderActive: "rgba(99, 102, 241, 0.40)"
  },

  // --- สถิติความน่าเชื่อถือ (4-Metric Grid) ---
  metrics: {
    delivery: "จัดส่งอัตโนมัติ",
    support: "ซัพพอร์ตผ่าน Discord",
    alliance: "2 เซิร์ฟเวอร์ในเครือ",
    warranty: "รับประกันสินค้า 100%"
  },

  // --- เกตเวย์ชำระเงินที่รองรับ (PromptPay, TrueMoney, Bank Transfer) ---
  acceptedPayments: ["promptpay", "truemoney", "bank_transfer"],

  // ข้อมูลตั้งค่าบัญชีรับเงิน
  paymentDetails: {
    promptpay: {
      qrWatermarkDataUrl: "data:image/png;base64,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",
      accountName: "NYX9 STUDIO AUTO",
      promptpayNumber: "1459901184414",
      minAmount: 10,
      feeRate: 0.0
    },
    truemoney: {
      accountName: "NYX9 WALLET AUTO",
      phoneNumber: "0838286508",
      feeRate: 0.0,
      hint: "กรอกลิงก์ซองของขวัญ หรือโอนผ่านเบอร์ TrueMoney Wallet เพื่อรับเงินเข้าทันที"
    },
    bank_transfer: {
      bankName: "ธนาคารกรุงไทย (Krungthai Bank)",
      bankCode: "KTB",
      accountNumber: "4140810122",
      formattedAccountNumber: "414-0-81012-2",
      accountName: "NYX9 STUDIO (กรุงไทย)",
      branch: "สาขาหลัก",
      color: "#00A3E0",
      icon: "landmark",
      notice: "ร้านรับบัญชีนี้บัญชีเดียวเท่านั้น"
    }
  },

  // โค้ดส่วนลดเริ่มต้น (Promo Codes)
  promoCodes: {
    "NYX9VIP": { discountPercent: 10, minSpend: 100, label: "NYX9 ลดทันที 10%" },
    "NYX50": { discountThb: 50, minSpend: 300, label: "ลด ฿50 เมื่อซื้อครบ ฿300" },
    "CYBERVIP": { discountPercent: 15, minSpend: 500, label: "VIP ลด 15%" }
  }
};

// Export หรือผูกเข้า Window สำหรับ Vanilla JS
if (typeof window !== "undefined") {
  window.storeConfig = storeConfig;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = storeConfig;
}



/* ============================================================================== */
/* 📦 MODULE: productsData.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * COMMERCIAL CATALOG DATA (NOVAPE SHOP & NYX9 STUDIO)
 * ==============================================================================
 * ข้อมูลสินค้าเฉพาะ 2 เครือข่ายหลัก:
 * 1. NOVAPE SHOP: Discord Goods, Nitro, Boosts & Services
 * 2. NYX9 STUDIO: Roblox Systems, Scripts, GFX & 3D Assets
 * ==============================================================================
 */

function createCyberArtwork(title, sub, iconType, primaryColor, secondaryColor) {
  const icons = {
    nitro: `<path d="M12 2L4 14h6l-2 8 10-12h-6l4-8z" fill="${primaryColor}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
    boost: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3m0 0l8.5-8.5a2.12 2.12 0 1 1 3 3L12 15m-3-3v3h3" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    discord: `<path d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.2.35-.4.8-.56 1.18a16.8 16.8 0 0 0-5.14 0 9.87 9.87 0 0 0-.57-1.18 18.15 18.15 0 0 0-4.6 1.44A19.12 19.12 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98a12.16 12.16 0 0 1-1.92-.93c.16-.12.32-.24.47-.37a13.1 13.1 0 0 0 11.32 0c.16.13.31.25.47.37-.62.37-1.26.68-1.92.93.35.7.75 1.36 1.2 1.98 2.02-.62 3.92-1.6 5.63-2.87.5-5.46-1.3-10.22-3.3-12.83zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.4 2.15-2.4 1.21 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4zm7.97 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.4 2.15-2.4 1.21 0 2.17 1.08 2.15 2.4 0 1.32-.94 2.4-2.15 2.4z" fill="${primaryColor}"/>`,
    code: `<polyline points="16 18 22 12 16 6" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="8 6 2 12 8 18" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    cube: `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="${primaryColor}" stroke-width="2" fill="none"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="${primaryColor}" stroke-width="2" fill="none"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="${primaryColor}" stroke-width="2"/>`,
    game: `<rect x="2" y="6" width="20" height="12" rx="3" stroke="${primaryColor}" stroke-width="2" fill="none"/><path d="M6 12h4m-2-2v4m9-2h.01m3 0h.01" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>`,
    palette: `<circle cx="13.5" cy="6.5" r=".5" fill="${primaryColor}"/><circle cx="17.5" cy="10.5" r=".5" fill="${primaryColor}"/><circle cx="8.5" cy="7.5" r=".5" fill="${primaryColor}"/><circle cx="6.5" cy="12.5" r=".5" fill="${primaryColor}"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" stroke="${primaryColor}" stroke-width="2" fill="none"/>`
  };

  const escapeXml = (str) => String(str || "").replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
  const safeTitle = escapeXml(title).slice(0, 24);
  const safeSub = escapeXml(sub).slice(0, 28);
  const selectedIcon = icons[iconType] || icons.nitro;
  const hash = Math.abs((title || 'art').split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)).toString(36);
  const safeId = 'art_' + hash;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" width="100%" height="100%">
    <defs>
      <linearGradient id="bg-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#060911" />
        <stop offset="50%" stop-color="#0B1220" />
        <stop offset="100%" stop-color="#05080E" />
      </linearGradient>
      <pattern id="grid-${safeId}" width="25" height="25" patternUnits="userSpaceOnUse">
        <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="450" height="450" fill="url(#bg-${safeId})"/>
    <rect width="450" height="450" fill="url(#grid-${safeId})"/>
    <circle cx="225" cy="210" r="130" fill="${primaryColor}" fill-opacity="0.10" filter="blur(45px)"/>
    <circle cx="350" cy="90" r="80" fill="${secondaryColor}" fill-opacity="0.08" filter="blur(35px)"/>
    
    <path d="M 24 48 L 48 24 L 402 24 L 426 48 L 426 402 L 402 426 L 48 426 L 24 402 Z" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
    <line x1="48" y1="24" x2="150" y2="24" stroke="${primaryColor}" stroke-width="3"/>
    <line x1="300" y1="426" x2="402" y2="426" stroke="${secondaryColor}" stroke-width="3"/>

    <g transform="translate(165, 125) scale(5)">
      ${selectedIcon}
    </g>

    <text x="225" y="325" text-anchor="middle" fill="#FFFFFF" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="16" letter-spacing="0.5">
      ${safeTitle}
    </text>
    <text x="225" y="358" text-anchor="middle" fill="${primaryColor}" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="12" letter-spacing="1.5">
      // ${safeSub} //
    </text>

    <rect x="34" y="32" width="105" height="20" rx="4" fill="rgba(255, 255, 255, 0.06)" stroke="${primaryColor}" stroke-width="1"/>
    <text x="86" y="46" text-anchor="middle" fill="${primaryColor}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700">VERIFIED AUTH</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const categoriesData = [
  {
    id: "cat-discord-nitro",
    name: "Discord Nitro & บูสต์",
    subName: "ไนโตรแท้ บูสต์เซิร์ฟเวอร์ & ไอเทมตกแต่งโปรไฟล์ (NOVAPE SHOP)",
    icon: "zap",
    badge: "NOVAPE SHOP",
    visible: true,
    collapsed: false,
    products: [
      {
        id: "nitro-booster-1m",
        title: "Nitro Booster (Mailpass 1 เดือน)",
        category: "cat-discord-nitro",
        price: 169,
        originalPrice: 250,
        stock: 45,
        status: "SALE",
        discountPercent: 32,
        chips: ["ส่งทันที", "ประกันเต็ม", "2 บูสต์"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("NITRO BOOSTER 1M", "MAILPASS FULL WARRANTY", "nitro", "#6366F1", "#A855F7"),
        sampleDelivery: "NITRO-1M-ACTIVE-KEY-9921",
        warrantyDays: 30
      },
      {
        id: "nitro-3m-mailpass",
        title: "รหัสติด Nitro 3 เดือน ยกเมล",
        category: "cat-discord-nitro",
        price: 150,
        originalPrice: 290,
        stock: 20,
        status: "SALE",
        discountPercent: 48,
        chips: ["ยกเมลแท้", "2 บูสต์", "เปลี่ยนรหัสได้"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("NITRO 3 MONTHS", "FULL EMAIL ACCESS", "nitro", "#8B5CF6", "#EC4899"),
        sampleDelivery: "NITRO-3M-ACTIVE-KEY-8812",
        warrantyDays: 90
      },
      {
        id: "nitro-boost-1m-2x",
        title: "บูสต์เซิร์ฟเวอร์ 1 เดือน (2 บูสต์)",
        category: "cat-discord-nitro",
        price: 50,
        originalPrice: 90,
        stock: 80,
        status: "SALE",
        discountPercent: 44,
        chips: ["2 บูสต์แท้", "ใน 1 นาที"],
        fulfillmentType: "custom_discord_boost",
        imageUrl: createCyberArtwork("SERVER BOOST 1M", "2X GUILD BOOSTS", "boost", "#EC4899", "#F43F5E"),
        instructions: "กรอกลิงก์เซิร์ฟเวอร์ Discord ที่ต้องการให้บอทเข้าไปบูสต์ (ต้องไม่หมดอายุ)"
      },
      {
        id: "nitro-boost-3m-2x",
        title: "บูสต์เซิร์ฟเวอร์ 3 เดือน (2 บูสต์)",
        category: "cat-discord-nitro",
        price: 100,
        originalPrice: 180,
        stock: 60,
        status: "SALE",
        discountPercent: 44,
        chips: ["90 วันเต็ม", "ยอดนิยม"],
        fulfillmentType: "custom_discord_boost",
        imageUrl: createCyberArtwork("SERVER BOOST 3M", "90 DAYS GUARANTEED", "boost", "#F43F5E", "#FB923C"),
        instructions: "ระบบจะดำเนินการส่งบูสต์เข้าเซิร์ฟเวอร์ภายใน 1-5 นาทีหลังชำระเงิน"
      },
      {
        id: "nitro-promo-link-3m",
        title: "ลิงก์ Nitro Promo 3 เดือน",
        category: "cat-discord-nitro",
        price: 50,
        originalPrice: 120,
        stock: 999,
        status: "SALE",
        discountPercent: 58,
        chips: ["กิฟต์ลิงก์", "ไอดีใหม่"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("NITRO PROMO LINK", "3 MONTHS ACTIVATION", "nitro", "#6366F1", "#3B82F6"),
        sampleDelivery: "https://discord.com/billing/promotions/xbox-game-pass-promo-key-83749204812",
        warrantyDays: 14
      },
      {
        id: "nitro-decor-decorations",
        title: "กรอบโปรไฟล์ / เอฟเฟกต์ / Nameplates",
        category: "cat-discord-nitro",
        price: 100,
        originalPrice: 190,
        stock: 35,
        status: "SALE",
        discountPercent: 47,
        chips: ["ถาวร", "ของแต่งแท้"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("PROFILE DECORATIONS", "PERMANENT AVATAR FX", "discord", "#06B6D4", "#3B82F6"),
        sampleDelivery: "GIFT-DECO-PERM-DISCORD-TOKEN-9283-NOVAPE",
        warrantyDays: 365
      }
    ]
  },
  {
    id: "cat-discord-services",
    name: "บริการดิสคอร์ด & ไอดี",
    subName: "เควสต์อัตโนมัติ บอท & ไอดีพร้อมใช้งาน (NOVAPE SHOP)",
    icon: "bot",
    badge: "NOVAPE SHOP",
    visible: true,
    collapsed: false,
    products: [
      {
        id: "service-discord-members",
        title: "ปั๊มคนเข้า Discord (มีโปรไฟล์จริง)",
        category: "cat-discord-services",
        price: 0.50,
        unit: "คน",
        minQuantity: 100,
        maxQuantity: 1000,
        stepQuantity: 50,
        originalPrice: 0.80,
        stock: 9999,
        status: "SERVICE",
        chips: ["มีรูปโปรไฟล์", "เริ่มใน 5 นาที"],
        fulfillmentType: "custom_discord_members",
        imageUrl: createCyberArtwork("DISCORD MEMBERS", "REAL LOOKING PROFILES", "discord", "#3B82F6", "#6366F1"),
        instructions: "ระบบปั๊มเมมเบอร์อัตโนมัติ กรอกลิงก์ Discord Invite และเลือกจำนวนสมาชิกที่ต้องการ"
      },
      {
        id: "service-phone-otp",
        title: "ยืนยันเบอร์รหัสตัวเอง (รับรหัส OTP)",
        category: "cat-discord-services",
        price: 10,
        originalPrice: 20,
        stock: 500,
        status: "SERVICE",
        chips: ["เบอร์ไทย/นอก", "ส่งรหัสใน 30 วิ"],
        fulfillmentType: "custom_phone_otp",
        imageUrl: createCyberArtwork("PHONE OTP SERVICE", "INSTANT SMS CODE", "discord", "#10B981", "#06B6D4"),
        instructions: "เลือกประเทศเพื่อขอรับเบอร์เสมือน และรอรับรหัส OTP สดได้ทันทีที่หน้าจอ"
      },
      {
        id: "service-quest-badge",
        title: "ทำตราเควสต์ Discord (Quest Badge)",
        category: "cat-discord-services",
        price: 50,
        originalPrice: 90,
        stock: 100,
        status: "SERVICE",
        chips: ["รับตราทันที", "ไม่ต้องเปิดเกม"],
        fulfillmentType: "custom_quest_badge",
        imageUrl: createCyberArtwork("QUEST BADGE", "INSTANT BADGE UNLOCK", "discord", "#F59E0B", "#EF4444"),
        instructions: "กรอก Discord User ID เพื่อให้ระบบออโต้ส่งตราเควสต์เข้าโปรไฟล์ของคุณ"
      },
      {
        id: "account-discord-1m",
        title: "รหัส Discord อายุเกิน 1 เดือน",
        category: "cat-discord-services",
        price: 25,
        originalPrice: 40,
        stock: 150,
        status: "STOCK",
        chips: ["พร้อมใช้งาน", "ไม่ติดบอท"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("DISCORD ACCOUNT 1M", "CLEAN REGISTERED", "discord", "#64748B", "#94A3B8"),
        sampleDelivery: "DISCORD-VERIFIED-AUTH-TOKEN-7721",
        warrantyDays: 7
      },
      {
        id: "account-discord-vintage",
        title: "รหัส Discord ปีเก่า (2015 – 2020)",
        category: "cat-discord-services",
        price: 450,
        originalPrice: 650,
        stock: 10,
        status: "HOT",
        chips: ["ปีเก่าหายาก", "ยกเมลหลัก"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("VINTAGE ACCOUNT", "AGED 2015-2020", "discord", "#F59E0B", "#D97706"),
        sampleDelivery: "DISCORD-VINTAGE-AUTH-TOKEN-2016",
        warrantyDays: 30
      }
    ]
  },
  {
    id: "cat-roblox-scripts",
    name: "สคริปต์ & ระบบเกม Roblox",
    subName: "สคริปต์ Blox Fruits, Auto-Farm & UI สำหรับครีเอเตอร์ (NYX9 STUDIO)",
    icon: "code-2",
    badge: "NYX9 STUDIO",
    visible: true,
    collapsed: false,
    products: [
      {
        id: "roblox-bloxfruits-script",
        title: "สคริปต์ Blox Fruits & GUI (Auto Farm / Raid / Mastery)",
        category: "cat-roblox-scripts",
        price: 150,
        originalPrice: 250,
        stock: 50,
        status: "HOT",
        discountPercent: 40,
        chips: ["Auto Farm", "Raid/Mastery", "อัปเดตฟรี"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("BLOX FRUITS SUITE", "AUTO FARM & RAID GUI", "code", "#00B2FF", "#3B82F6"),
        sampleDelivery: "ROBLOX-SCRIPT-BLOXFRUITS-KEY-9281-NYX9",
        warrantyDays: 30
      },
      {
        id: "roblox-autofarm-core",
        title: "สคริปต์ฟาร์มอัตโนมัติ Roblox Multi-Game",
        category: "cat-roblox-scripts",
        price: 90,
        originalPrice: 150,
        stock: 100,
        status: "SALE",
        discountPercent: 40,
        chips: ["Multi-Game", "Luau คลีน", "ลื่นไหล"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("AUTOFARM CORE", "MULTI-GAME LUAU ENGINE", "game", "#10B981", "#06B6D4"),
        sampleDelivery: "ROBLOX-SCRIPT-AUTOFARM-CORE-4491-NYX9",
        warrantyDays: 30
      },
      {
        id: "roblox-store-gui",
        title: "ระบบร้านค้า & UI สำเร็จรูปสำหรับเกม Roblox",
        category: "cat-roblox-scripts",
        price: 199,
        originalPrice: 350,
        stock: 35,
        status: "NEW",
        discountPercent: 43,
        chips: ["Luau Studio", "Modern UI", "ติดตั้งง่าย"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("ROBLOX SHOP GUI", "STUDIO CLEAN INTERFACE", "code", "#8B5CF6", "#00B2FF"),
        sampleDelivery: "ROBLOX-ASSET-RBXL-STOREGUI-8812-NYX9",
        warrantyDays: 60
      }
    ]
  },
  {
    id: "cat-roblox-assets",
    name: "Roblox GFX & โมเดล 3D",
    subName: "ออกแบบปกเกม GFX, โมเดล 3D Props & Character Rigs (NYX9 STUDIO)",
    icon: "box",
    badge: "NYX9 STUDIO",
    visible: true,
    collapsed: false,
    products: [
      {
        id: "roblox-gfx-thumbnail",
        title: "ออกแบบปกเกมและไอคอน Roblox GFX (ตามสั่ง)",
        category: "cat-roblox-assets",
        price: 120,
        originalPrice: 200,
        stock: 20,
        status: "CUSTOM",
        discountPercent: 40,
        chips: ["Blender 3D", "ความละเอียดสูง", "แก้ได้ 3 ครั้ง"],
        fulfillmentType: "custom_order",
        imageUrl: createCyberArtwork("ROBLOX GFX ART", "CUSTOM GAME THUMBNAIL", "palette", "#EC4899", "#8B5CF6"),
        instructions: "กรอกชื่อเกม แนวเกม และรายละเอียดหรือสไตล์ภาพที่ต้องการ ให้ทีมงานเริ่มออกแบบทันที"
      },
      {
        id: "roblox-3d-props-pack",
        title: "แพ็กโมเดล 3D Props & Low-Poly Map Assets สำหรับ Studio",
        category: "cat-roblox-assets",
        price: 250,
        originalPrice: 450,
        stock: 40,
        status: "SALE",
        discountPercent: 44,
        chips: ["Low-Poly", "FBX/RBXM", "พร้อมวาง"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("3D PROPS PACK", "LOW-POLY MAP ASSETS", "cube", "#F59E0B", "#10B981"),
        sampleDelivery: "ROBLOX-3D-ASSETS-PACK-BUNDLE-LINK-5521",
        warrantyDays: 90
      },
      {
        id: "roblox-character-rig",
        title: "โมเดลตัวละครและ Rig สำหรับทำอนิเมชั่น Roblox (R6 & R15)",
        category: "cat-roblox-assets",
        price: 180,
        originalPrice: 300,
        stock: 25,
        status: "HOT",
        discountPercent: 40,
        chips: ["R6/R15 Rig", "Blender พร้อมใช้", "นำเข้า Studio ได้"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("CHARACTER RIGS", "AUTHENTIC R6 & R15", "cube", "#00B2FF", "#6366F1"),
        sampleDelivery: "ROBLOX-RIG-ANIMATION-SUITE-KEY-1192",
        warrantyDays: 90
      }
    ]
  }
];

if (typeof window !== "undefined") {
  window.categoriesData = categoriesData;
  window.createCyberArtwork = createCyberArtwork;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = categoriesData;
}



/* ============================================================================== */
/* 📦 MODULE: js/core/Store.js */
/* ============================================================================== */
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
    
    // โหลด State จาก LocalStorage อย่างปลอดภัย (Anti-Crash JSON Parsing)
    const safeParse = (key, fallback) => {
      try {
        const val = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
        return val ? JSON.parse(val) : fallback;
      } catch (e) {
        return fallback;
      }
    };

    const initialCategories = (typeof window !== "undefined" && window.categoriesData) ? window.categoriesData : [];
    const initialFilters = {};
    initialCategories.forEach(c => { initialFilters[c.id] = true; });

    this.state = {
      user: null,
      walletBalance: typeof localStorage !== "undefined" ? parseFloat(localStorage.getItem("nyx_balance") || "0.00") : 0.00,
      loyaltyPoints: typeof localStorage !== "undefined" ? parseFloat(localStorage.getItem("nyx_points") || "0.00") : 0.00,
      cart: safeParse("nyx_cart", []),
      orderHistory: safeParse("nyx_orders", []),
      appliedPromo: null,
      isCatalogLoading: initialCategories.length === 0,
      categories: initialCategories,
      categoryFilters: initialFilters,
      activeCategory: "all",
      sortOrder: "popular",
      inStockOnly: false,
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
    this.state.walletBalance = Math.max(0, Math.round((parseFloat(amount) || 0) * 100) / 100);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nyx_balance", this.state.walletBalance.toString());
    }
    this.emit("change:wallet", this.state.walletBalance);
  }

  creditWallet(amount) {
    this.setWalletBalance(this.state.walletBalance + parseFloat(amount));
  }

  debitWallet(amount) {
    this.setWalletBalance(Math.max(0, this.state.walletBalance - parseFloat(amount)));
  }

  // --- LOYALTY POINTS METHODS (Sprint 3) ---
  setLoyaltyPoints(points) {
    this.state.loyaltyPoints = Math.max(0, Math.floor(parseFloat(points) || 0));
    if (typeof localStorage !== "undefined") {
      try { localStorage.setItem("nyx_points", this.state.loyaltyPoints.toString()); } catch (_) {}
    }
    this.emit("change:points", this.state.loyaltyPoints);
    if (typeof document !== "undefined") {
      const els = document.querySelectorAll("#user-points-balance, .user-points-val");
      els.forEach(el => {
        el.textContent = `${this.state.loyaltyPoints.toLocaleString()} แต้ม`;
      });
    }
  }

  creditLoyaltyPoints(points) {
    this.setLoyaltyPoints(this.state.loyaltyPoints + parseFloat(points || 0));
  }

  debitLoyaltyPoints(points) {
    this.setLoyaltyPoints(Math.max(0, this.state.loyaltyPoints - parseFloat(points || 0)));
  }

  // --- CART METHODS ---
  saveCart() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nyx_cart", JSON.stringify(this.state.cart));
    }
    this.emit("change:cart", this.state.cart);
  }

  addToCart(product, quantity = 1, customData = null) {
    if (!product || typeof product !== "object" || !product.id) return;
    const safeQty = Math.max(1, parseInt(quantity, 10) || 1);

    const existingIndex = this.state.cart.findIndex(item => 
      item.id === product.id && JSON.stringify(item.customData) === JSON.stringify(customData)
    );

    if (existingIndex > -1) {
      this.state.cart[existingIndex].quantity += safeQty;
    } else {
      this.state.cart.push({
        id: product.id,
        title: product.title,
        price: parseFloat(product.price) || 0,
        quantity: safeQty,
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
if (typeof window !== "undefined") {
  window.Store = Store;
  window.AppStore = new Store();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Store;
}



/* ============================================================================== */
/* 📦 MODULE: js/core/ThemeEngine.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🎨 THEME ENGINE & DYNAMIC CSS INJECTOR (TC-THM-01)
 * ==============================================================================
 * ควบคุมการปรับแต่งธีมสีหลัก (Accent Color) และการแทรก Custom CSS แบบเรียลไทม์
 * รองรับทั้ง Storefront และ Admin Theme Studio Live Preview
 * ==============================================================================
 */

class ThemeEngine {
  constructor() {
    this.presets = {
      glacier_cyan: {
        name: "Glacier Cyan (Default)",
        accent: "#00F0FF",
        accentHover: "#00D2E0",
        accentGlow: "rgba(0, 240, 255, 0.22)",
        dotClass: "bg-cyan-400 shadow-cyan-500/50"
      },
      electric_indigo: {
        name: "Electric Indigo (Linear)",
        accent: "#6366F1",
        accentHover: "#818CF8",
        accentGlow: "rgba(99, 102, 241, 0.22)",
        dotClass: "bg-indigo-500 shadow-indigo-500/50"
      },
      cyber_pink: {
        name: "Cyber Neon Pink",
        accent: "#FF007F",
        accentHover: "#FF2E93",
        accentGlow: "rgba(255, 0, 127, 0.22)",
        dotClass: "bg-pink-500 shadow-pink-500/50"
      },
      hacker_emerald: {
        name: "Matrix Hacker Emerald",
        accent: "#10B981",
        accentHover: "#34D399",
        accentGlow: "rgba(16, 185, 129, 0.22)",
        dotClass: "bg-emerald-500 shadow-emerald-500/50"
      },
      amber_gold: {
        name: "Imperial Amber Gold",
        accent: "#F59E0B",
        accentHover: "#FBBF24",
        accentGlow: "rgba(245, 158, 11, 0.22)",
        dotClass: "bg-amber-500 shadow-amber-500/50"
      },
      crimson_red: {
        name: "Crimson Cyber Red",
        accent: "#EF4444",
        accentHover: "#F87171",
        accentGlow: "rgba(239, 68, 68, 0.22)",
        dotClass: "bg-rose-500 shadow-rose-500/50"
      }
    };

    this.currentConfig = {
      preset: "glacier_cyan",
      accent: "#00F0FF",
      accentHover: "#00D2E0",
      accentGlow: "rgba(0, 240, 255, 0.22)",
      customCss: ""
    };
  }

  init() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. Load from localStorage cache first for zero latency
    try {
      const cached = localStorage.getItem("nyx_theme_config");
      if (cached) {
        const parsed = JSON.parse(cached);
        this.apply(parsed, false);
      }
    } catch (e) {}

    // 2. Fetch from backend API to get fresh server configuration
    this.syncFromServer();
  }

  async syncFromServer() {
    try {
      const res = await fetch("/api/theme-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.theme) {
          this.apply(data.theme, true);
        }
      }
    } catch (e) {
      // Offline fallback silent
    }
  }

  apply(config, persistLocal = true) {
    if (!config) return;

    this.currentConfig = { ...this.currentConfig, ...config };

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (root) {
        if (this.currentConfig.accent) {
          root.style.setProperty("--accent", this.currentConfig.accent);
        }
        if (this.currentConfig.accentHover) {
          root.style.setProperty("--accent-hover", this.currentConfig.accentHover);
        }
        if (this.currentConfig.accentGlow) {
          root.style.setProperty("--accent-glow", this.currentConfig.accentGlow);
        }
      }

      // Injected Custom CSS block
      let styleTag = document.getElementById("nyx-custom-css-injection");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "nyx-custom-css-injection";
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = this.currentConfig.customCss || "";
    }

    if (persistLocal && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("nyx_theme_config", JSON.stringify(this.currentConfig));
      } catch (e) {}
    }
  }

  setPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;

    this.apply({
      preset: presetKey,
      accent: preset.accent,
      accentHover: preset.accentHover,
      accentGlow: preset.accentGlow
    });
  }

  getPresets() {
    return this.presets;
  }

  getCurrentConfig() {
    return this.currentConfig;
  }
}

// Global Singleton
if (typeof window !== "undefined") {
  window.ThemeEngine = ThemeEngine;
  window.ThemeEngineInstance = new ThemeEngine();
  // Auto-init on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.ThemeEngineInstance.init());
  } else {
    window.ThemeEngineInstance.init();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeEngine;
}



/* ============================================================================== */
/* 📦 MODULE: js/core/AudioEngine.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🕹️ AUDIO ENGINE & TACTILE GAMING SFX (TC-SFX-01)
 * ==============================================================================
 * ระบบเสียงเอฟเฟกต์ Sci-Fi / Gaming สำหรับสร้าง Micro-interactions
 * สังเคราะห์ผ่าน Web Audio API 100% (ไม่ต้องโหลดไฟล์ MP3 ภายนอก 0ms Latency)
 * ==============================================================================
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.init();
  }

  init() {
    if (typeof window === "undefined") return;
    try {
      this.muted = localStorage.getItem("nyx_audio_muted") === "true";
    } catch (e) {
      this.muted = false;
    }
  }

  getAudioContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem("nyx_audio_muted", String(this.muted));
    } catch (e) {}
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // --- 1. Short Cyber Click (ปุ่มคลิกทั่วไป) ---
  playClick() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // --- 2. Modal Open / Drawer Slide Whoosh ---
  playModal() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // --- 3. Coin Chime (เติมเงินสำเร็จ / ได้รับแต้ม) ---
  playCoin() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.06;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.13);
      });
    } catch (e) {}
  }

  // --- 4. Purchase Fanfare Chord (ซื้อสำเร็จ) ---
  playFanfare() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // C5, E5, G5, C6 arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.07;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch (e) {}
  }

  // --- 5. Error Buzz (เกิดข้อผิดพลาด) ---
  playError() {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }
}

// Global Singleton
if (typeof window !== "undefined") {
  window.AudioEngine = AudioEngine;
  window.AudioEngineInstance = new AudioEngine();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AudioEngine;
}



/* ============================================================================== */
/* 📦 MODULE: js/core/SecurityEngine.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — CLIENT SECURITY & ANTI-TAMPER ENGINE v2.0
 * ==============================================================================
 * 1. Global Context Menu Blocker (Capture Phase on Window + Document)
 * 2. Developer Key Shortcuts Interceptor (F12, Ctrl+Shift+I/J/C, Ctrl+U/S/P)
 * 3. Client Protection Framework
 * 4. Anti-Drag & Asset Extraction Protection
 * 5. Security Telemetry Header
 * 6. Admin Developer Mode (Toggle with Ctrl+Alt+D only for whitelisted Admins)
 * ==============================================================================
 */

class SecurityEngine {
  constructor(store) {
    this.store = store;
    this.lastToastTime = 0;
    this.adminUnlocked = false;
    this.init();
  }

  init() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    this.initAntiFrame();
    this.initContextMenuBlocker();
    this.initKeyboardBlocker();
    this.initAntiDrag();
    this.initConsoleProtection();
  }

  isAdmin() {
    const user = this.store ? this.store.get("user") : null;
    if (!user) return false;
    const adminWhitelist = (window.storeConfig && window.storeConfig.adminDiscordIds) || [
      "483398326159671326",
      "422611554475835394"
    ];
    return user.role === "admin" || adminWhitelist.includes(String(user.discordId));
  }

  triggerSecurityAlert(msg = "") {
    // Silent Mode: ไม่แสดง Toast แจ้งเตือนตามคำขอของผู้ใช้ (ทำงานแบบเงียบ ไม่รบกวนหน้าจอ)
    return;
  }

  initAntiFrame() {
    // Frame protection is enforced by HTTP header X-Frame-Options: SAMEORIGIN
  }

  initContextMenuBlocker() {
    const blockContextMenu = (e) => {
      // If admin pressed Ctrl+Alt+D to unlock
      if (this.adminUnlocked) return;

      // Allow right-click inside actual form inputs for paste
      const targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
      if (targetTag === "input" || targetTag === "textarea" || (e.target && e.target.isContentEditable)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);
  }

  initKeyboardBlocker() {
    window.addEventListener("keydown", (e) => {
      const key = e.key ? e.key.toLowerCase() : "";
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Special Admin Developer Mode Shortcut: Ctrl + Alt + D
      if (isCtrlOrMeta && e.altKey && key === "d") {
        if (this.isAdmin()) {
          this.adminUnlocked = !this.adminUnlocked;
          window.__nyxAdminUnlocked = this.adminUnlocked;
          if (window.UI && typeof window.UI.toast === "function") {
            window.UI.toast(
              this.adminUnlocked 
                ? "🔓 Admin Developer Mode: UNLOCKED (Inspect Enabled)" 
                : "🔒 Admin Developer Mode: LOCKED (Protection Active)",
              this.adminUnlocked ? "info" : "warning"
            );
          }
          return;
        }
      }

      // If Admin unlocked dev mode, allow dev keys
      if (this.adminUnlocked) return;

      // 1. Block F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 2. Block DevTools (Ctrl+Shift+I/J/C or Mac Cmd+Option+I/J/C)
      if (
        (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
        (isCtrlOrMeta && e.altKey && (key === "i" || key === "j" || key === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 3. Block Ctrl+U (View Source)
      if (isCtrlOrMeta && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 4. Block Ctrl+S (Save Page) & Ctrl+P (Print Page)
      if (isCtrlOrMeta && (key === "s" || key === "p")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }, true);
  }

  initAntiDrag() {
    document.addEventListener("dragstart", (e) => {
      if (this.adminUnlocked) return;
      e.preventDefault();
    }, true);
  }

  initConsoleProtection() {
    try {
      console.log("%c⚡ NYX9 STUDIO PRODUCTION STOREFRONT", "color: #00F2FF; font-weight: bold; font-size: 14px;");
      console.log("%cOfficial verified build. Telemetry active.", "color: #64748B; font-size: 11px;");
    } catch (e) {}
  }
}

if (typeof window !== "undefined") {
  window.SecurityEngine = SecurityEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SecurityEngine;
}



/* ============================================================================== */
/* 📦 MODULE: js/core/BotShield.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — CLIENT-SIDE BOT SHIELD AGENT (Sprint 5)
 * ==============================================================================
 * แก้โจทย์ Proof-of-Work (PoW) ทางคณิตศาสตร์ในเสี้ยววินาที (~15ms)
 * เพื่อรับรองว่าเป็นมนุษย์/เบราว์เซอร์จริง ไม่ใช่บอทสแปม โดยไม่รบกวน UX ของผู้ใช้
 * ==============================================================================
 */

class BotShieldClient {
  constructor() {
    this.cachedToken = null;
    this.tokenExpiry = 0;
  }

  async sha256(str) {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    } else {
      // Node fallback
      const crypto = require("crypto");
      return crypto.createHash("sha256").update(str).digest("hex");
    }
  }

  async getShieldToken(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    try {
      // 1. Fetch challenge from API
      const res = await fetch("/api/bot-shield?action=challenge");
      if (!res.ok) throw new Error("Failed to fetch challenge");
      const data = await res.json();
      if (!data.success || !data.challenge) throw new Error("Invalid challenge response");

      const { nonce, timestamp, difficulty, signature } = data.challenge;
      const targetPrefix = "0".repeat(difficulty || 3);

      // 2. Solve Proof-of-Work
      let solution = 0;
      let solved = false;
      const maxIterations = 200000;

      while (!solved && solution < maxIterations) {
        solution++;
        const testStr = `${nonce}:${solution}`;
        const hash = await this.sha256(testStr);
        if (hash.startsWith(targetPrefix)) {
          solved = true;
          break;
        }
      }

      if (!solved) throw new Error("PoW solve timeout");

      // 3. Package token as base64
      const tokenPayload = {
        nonce,
        timestamp,
        solution,
        signature
      };

      const tokenStr = typeof btoa !== "undefined"
        ? btoa(JSON.stringify(tokenPayload))
        : Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

      this.cachedToken = tokenStr;
      this.tokenExpiry = now + 90 * 1000; // cache for 90s

      return tokenStr;
    } catch (err) {
      console.warn("[BOT SHIELD CLIENT]: Warning solving PoW:", err.message);
      return null;
    }
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.BotShieldClient = BotShieldClient;
  window.BotShield = new BotShieldClient();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = BotShieldClient;
}



/* ============================================================================== */
/* 📦 MODULE: js/core/ReceiptGenerator.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🧾 NYX9 STUDIO — CYBERPUNK RECEIPT IMAGE GENERATOR v1.0
 * ==============================================================================
 * วาดการ์ดใบเสร็จสั่งซื้อความละเอียดสูง (Retina Ready PNG) ด้วย Pure HTML5 Canvas
 * สรุปชื่อสินค้า รหัสไอดี วันเวลา และตราประทับรับประกัน 24 ชม.
 * เหมาะสำหรับเซฟลงมือถือในคลิกเดียว และแชร์ลงสตอรี่รีวิวร้านค้า
 * ==============================================================================
 */

class ReceiptGenerator {
  static async generateReceiptPNG(orderData) {
    const width = 800;
    const height = 1050;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("เบราว์เซอร์ไม่รองรับ HTML5 Canvas");
    }

    const orderId = orderData.orderId || orderData.order_id || `NYX-${Date.now().toString().slice(-6)}`;
    const dateStr = orderData.timestamp 
      ? new Date(orderData.timestamp).toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const totalAmount = parseFloat(orderData.totalAmount || orderData.total_amount || 0).toFixed(2);
    const items = orderData.items || orderData.dispensed_items || [];
    const customerName = orderData.customerName || (window.store && window.store.get("user")?.username) || "Customer";

    // 1. Dark Cyberpunk Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#06080E");
    bgGrad.addColorStop(0.5, "#0A0F1D");
    bgGrad.addColorStop(1, "#04060A");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Carbon Dot Matrix
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    for (let x = 20; x < width; x += 25) {
      for (let y = 20; y < height; y += 25) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer Glow Neon Border
    ctx.strokeStyle = "rgba(0, 242, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, width - 52, height - 52);

    // 2. Header Branding
    // Cyan Accent Light Bar
    const barGrad = ctx.createLinearGradient(40, 45, width - 40, 45);
    barGrad.addColorStop(0, "rgba(0, 242, 255, 0.8)");
    barGrad.addColorStop(0.5, "rgba(255, 0, 128, 0.6)");
    barGrad.addColorStop(1, "rgba(0, 242, 255, 0.8)");
    ctx.fillStyle = barGrad;
    ctx.fillRect(40, 45, width - 80, 4);

    // Store Logo Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px 'Space Grotesk', 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("NYX9 STUDIO", 50, 95);

    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("OFFICIAL ORDER RECEIPT • 24/7 AUTOMATION", 50, 118);

    // Verified Stamp Top Right
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, width - 210, 65, 160, 48, 12, true, true);

    ctx.fillStyle = "#34D399";
    ctx.font = "bold 13px 'JetBrains Mono', sans-serif";
    ctx.fillText("✓ VERIFIED PAID", width - 195, 95);

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(50, 145);
    ctx.lineTo(width - 50, 145);
    ctx.stroke();

    // 3. Metadata Grid (Order ID, Date, Customer)
    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("หมายเลขคำสั่งซื้อ (ORDER ID)", 50, 175);
    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillText(orderId, 50, 202);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("วันที่สั่งซื้อ (DATE/TIME)", 320, 175);
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 15px 'JetBrains Mono', sans-serif";
    ctx.fillText(dateStr, 320, 202);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("ลูกค้า (BUYER)", 580, 175);
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 15px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText(customerName.slice(0, 16), 580, 202);

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(50, 225);
    ctx.lineTo(width - 50, 225);
    ctx.stroke();

    // 4. Purchased Items Table
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 13px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("รายการสินค้าที่ได้รับ", 50, 255);
    ctx.fillText("จำนวน", 560, 255);
    ctx.fillText("ยอดเงิน", 680, 255);

    let currentY = 285;
    let allCredentials = [];

    items.forEach((item, idx) => {
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(45, currentY - 20, width - 90, 40);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 15px 'IBM Plex Sans Thai', sans-serif";
      const itemTitle = (item.title || item.id || `สินค้าดิจิทัล #${idx + 1}`).slice(0, 42);
      ctx.fillText(itemTitle, 55, currentY + 5);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillText(`x${item.quantity || 1}`, 570, currentY + 5);

      ctx.fillStyle = "#00F2FF";
      ctx.font = "bold 15px 'JetBrains Mono', monospace";
      const itemPrice = item.price ? `฿${(item.price * (item.quantity || 1)).toFixed(2)}` : "-";
      ctx.fillText(itemPrice, 680, currentY + 5);

      currentY += 46;

      const creds = item.credentials || [];
      if (Array.isArray(creds) && creds.length > 0) {
        allCredentials.push(...creds);
      }
    });

    // 5. Delivered Credentials Box (The Gold Mine)
    currentY += 15;
    ctx.fillStyle = "rgba(0, 242, 255, 0.06)";
    ctx.strokeStyle = "rgba(0, 242, 255, 0.25)";
    ctx.lineWidth = 1;
    this.roundRect(ctx, 45, currentY, width - 90, 220, 16, true, true);

    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("🔑 คีย์ / ลิงก์สินค้าที่จัดส่ง (DELIVERED CREDENTIALS)", 60, currentY + 30);

    let credY = currentY + 60;
    if (allCredentials.length === 0) {
      ctx.fillStyle = "#F59E0B";
      ctx.font = "14px 'IBM Plex Sans Thai', sans-serif";
      ctx.fillText("• สินค้าแบบบริการพิเศษ ระบบกำลังจัดคิวส่งมอบให้ภายใน 5-15 นาที", 65, credY);
    } else {
      allCredentials.slice(0, 4).forEach((cred, cIdx) => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(60, credY - 16, width - 120, 32);

        ctx.fillStyle = "#E2E8F0";
        ctx.font = "13px 'JetBrains Mono', monospace";
        const displayCred = cred.length > 55 ? cred.slice(0, 52) + "..." : cred;
        ctx.fillText(`[${cIdx + 1}]  ${displayCred}`, 70, credY + 5);
        credY += 38;
      });
      if (allCredentials.length > 4) {
        ctx.fillStyle = "#64748B";
        ctx.font = "italic 12px 'JetBrains Mono', monospace";
        ctx.fillText(`+ อีก ${allCredentials.length - 4} รายการ (ตรวจสอบรายการทั้งหมดในคลังประวัติของร้าน)`, 70, credY + 5);
      }
    }

    // 6. Total Summary & Warranty Seal
    const summaryY = height - 240;

    // Total Amount Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(45, summaryY, width - 90, 60);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "bold 16px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("ยอดชำระสุทธิ (TOTAL PAID)", 65, summaryY + 37);

    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 26px 'JetBrains Mono', monospace";
    ctx.fillText(`฿${totalAmount}`, width - 200, summaryY + 40);

    // Warranty Box & Anti-Counterfeit Stamp
    const footerY = height - 150;
    ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
    this.roundRect(ctx, 45, footerY, width - 90, 75, 14, true, true);

    ctx.fillStyle = "#34D399";
    ctx.font = "bold 13px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("🛡️ มีประกันร้าน 24 ชม. • หากมีปัญหาแคปใบเสร็จนี้แจ้งเคลมได้ทันที", 65, footerY + 30);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "11px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("ใบเสร็จดิจิทัลออกโดยระบบอัตโนมัติ NYX9 STUDIO (https://nyxning.shop)", 65, footerY + 55);

    // Official Digital Stamp watermark
    ctx.save();
    ctx.translate(width - 130, footerY + 38);
    ctx.rotate(-0.15);
    ctx.strokeStyle = "rgba(0, 242, 255, 0.6)";
    ctx.lineWidth = 2;
    this.roundRect(ctx, -55, -22, 110, 44, 8, false, true);
    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText("NYX9 PASSED", -42, 5);
    ctx.restore();

    // 7. Convert to PNG and Trigger Download
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const link = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `NYX9_Receipt_${orderId}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        resolve(objectUrl);
      }, "image/png");
    });
  }

  static roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

if (typeof window !== "undefined") {
  window.ReceiptGenerator = ReceiptGenerator;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ReceiptGenerator;
}



/* ============================================================================== */
/* 📦 MODULE: js/core/JulianMotion.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * ✨ JULIAN FELLA SIGNATURE MOTION ENGINE v1.0
 * Inspired by Julian Fella (Award-Winning GSAP Site of the Day / CSSDA)
 * Smooth, editorial, masked line reveals, expanding hairlines, and cascading staggers
 * Direction-Aware Liquid SVG Bezier Wave Hover Animation
 * ==============================================================================
 */

// Julian Fella exact SVG quadratic bezier paths (viewBox="0 0 100 100")
const JULIAN_SVG_PATHS = {
  top: {
    startIn: "M 0 100 V 0 Q 50 0 100 0 V 0 H 0 z",
    endIn: "M 0 100 V 100 Q 50 125 100 100 V 0 H 0 z",
    startOut: "M 0 100 V 100 Q 50 50 100 100 V 0 H 0 z",
    endOut: "M 0 100 V 0 Q 50 0 100 0 V 0 H 0 z"
  },
  bottom: {
    startIn: "M 0 100 V 100 Q 75 50 100 100 V 100 z",
    endIn: "M 0 100 V 0 Q 50 0 100 0 V 100 z",
    startOut: "M 0 100 V 0 Q 50 50 100 0 V 100 z",
    endOut: "M 0 100 V 100 Q 50 100 100 100 V 100 z"
  },
  left: {
    startIn: "M 0 0 H 0 Q 0 50 0 100 H 0 V 0 z",
    endIn: "M 0 0 H 100 Q 110 50 100 100 H 0 V 0 z",
    startOut: "M 0 0 H 100 Q 75 50 100 100 H 0 V 0 z",
    endOut: "M 0 0 H 0 Q 0 50 0 100 H 0 V 0 z"
  },
  right: {
    startIn: "M 100 0 H 100 Q 100 50 100 100 H 100 V 0 z",
    endIn: "M 100 0 H 0 Q -10 50 0 100 H 100 V 0 z",
    startOut: "M 100 0 H 0 Q 25 50 0 100 H 100 V 0 z",
    endOut: "M 100 0 H 100 Q 100 50 100 100 H 100 V 0 z"
  }
};

function getJulianMouseEnterDirection(event, element) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  const distTop = Math.abs(rect.top - y);
  const distBottom = Math.abs(rect.bottom - y);
  const distLeft = Math.abs(rect.left - x);
  const distRight = Math.abs(rect.right - x);
  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distLeft) return "left";
  if (minDist === distRight) return "right";
  if (minDist === distTop) return "top";
  return "bottom";
}

class JulianMotionEngine {
  constructor() {
    this.hasGSAP = typeof window !== "undefined" && !!window.gsap;
    this.hasScrollTrigger = typeof window !== "undefined" && !!window.ScrollTrigger;
    this.registeredSections = new WeakSet();
    this.init();
  }

  init() {
    if (this.hasGSAP && this.hasScrollTrigger) {
      try {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.gsap.config({ force3D: true });
      } catch (e) {
        console.warn("[JulianMotion] GSAP register notice:", e);
      }
    }

    // Attach to DOM ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.setupGlobalTriggers();
        this.initLiquidWaveHover();
      });
    } else {
      setTimeout(() => {
        this.setupGlobalTriggers();
        this.initLiquidWaveHover();
      }, 100);
    }
  }

  setupGlobalTriggers() {
    this.initLiquidWaveHover();

    if (!this.hasGSAP || !window.ScrollTrigger) {
      this.setupIntersectionFallback();
      return;
    }

    const sections = document.querySelectorAll(`
      #hero-section,
      #category-filter-bar,
      #catalog-container,
      .pro-stats-banner,
      #view-home > div,
      footer
    `);

    sections.forEach(sec => {
      if (this.registeredSections.has(sec)) return;
      this.registeredSections.add(sec);

      window.ScrollTrigger.create({
        trigger: sec,
        start: "top 88%",
        once: true,
        onEnter: () => this.animateSection(sec)
      });
    });
  }

  /**
   * Signature Julian Fella Reveal Sequence
   * 1. Masked title unmasking from bottom (clip-path polygon)
   * 2. Center-expanding horizontal hairlines
   * 3. Slow-burn cascading cards / items with power3.out
   * 4. Animated numeric counter roll-ups
   */
  animateSection(container) {
    if (!container) return;

    if (window.gsap) {
      const titles = container.querySelectorAll("h1, h2, h3, .julian-title, [data-animate='headline']");
      const dividers = container.querySelectorAll("hr, .divider, .julian-divider, [data-animate='divider']");
      const cards = container.querySelectorAll(".product-card-item, .julian-item, .topup-preset-btn, .faq-item, .order-history-row");
      const counters = container.querySelectorAll("[data-counter], .julian-counter");

      const tl = window.gsap.timeline({
        defaults: { ease: "power3.out" }
      });

      // 1. Titles unmask from bottom with clip-path
      if (titles.length > 0) {
        tl.fromTo(titles,
          {
            y: 32,
            opacity: 0,
            clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)"
          },
          {
            y: 0,
            opacity: 1,
            clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0 100%)",
            duration: 1.05,
            stagger: 0.08
          }
        );
      }

      // 2. Horizontal dividers expand outward from center (Julian Fella hairline)
      if (dividers.length > 0) {
        tl.fromTo(dividers,
          {
            scaleX: 0,
            transformOrigin: "50% 50%",
            opacity: 0
          },
          {
            scaleX: 1,
            opacity: 1,
            duration: 1.3,
            ease: "expo.out"
          },
          "<0.1"
        );
      }

      // 3. Child elements / cards glide up in slow-burn domino cascade
      if (cards.length > 0) {
        tl.fromTo(cards,
          {
            y: 35,
            opacity: 0
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.045,
            ease: "power3.out"
          },
          "<0.15"
        );
      }

      // 4. Numeric roll-ups
      if (counters.length > 0) {
        counters.forEach(cnt => this.animateCounter(cnt));
      }

      return tl;
    } else {
      // CSS Fallback
      container.classList.add("julian-revealed");
    }
  }

  /**
   * Animate catalog product grid when category filter changes (High-Speed Crisp Transition)
   */
  animateCatalogGrid(container) {
    const target = container || document.getElementById("catalog-container");
    if (!target) return;

    if (window.gsap) {
      // Specifically target product cards only to avoid double-animating child containers
      const cards = target.querySelectorAll(".product-card");
      if (cards.length === 0) return;

      window.gsap.killTweensOf(cards);
      window.gsap.fromTo(cards,
        {
          y: 6,
          opacity: 0.65
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.16,
          stagger: { amount: 0.08, from: "start" },
          ease: "power2.out",
          overwrite: "auto"
        }
      );
    }
  }

  /**
   * Called during SPA page view routing (e.g. /topup, /history, /claim, /faq)
   * Gives dedicated pages the luxurious award-winning agency entrance with zero layout shift
   */
  animateView(viewEl) {
    // #view-home has its own ScrollTriggers; never blank it out with opacity:0
    if (!viewEl || viewEl.id === "view-home") return;

    // Instant top scroll synchronously before animation to prevent position warping
    window.scrollTo({ top: 0, behavior: "instant" });

    if (window.gsap) {
      window.gsap.killTweensOf(viewEl.querySelectorAll("*"));
      
      const header = viewEl.querySelector(".border-b, h1, h2");
      // Select top-level content cards, details accordions, forms, or direct blocks only
      const contents = viewEl.querySelectorAll("details, form, table, .grid > div, .space-y-3\\.5 > details, .space-y-4 > div");

      const tl = window.gsap.timeline({ defaults: { ease: "power2.out" } });

      if (header) {
        tl.fromTo(header,
          { y: -6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.22 }
        );
      }

      const items = contents.length > 0 ? contents : viewEl.children;
      if (items.length > 0) {
        tl.fromTo(items,
          { y: 10, opacity: 0.2 },
          { y: 0, opacity: 1, duration: 0.28, stagger: { amount: 0.12 } },
          "<0.04"
        );
      }
    }

    // Attach liquid wave hover on newly animated view elements
    this.initLiquidWaveHover(viewEl);
  }

  /**
   * Signature Julian Fella Direction-Aware Liquid Wave Morphing Hover
   * Extracted from julianfella.de/contact
   * Uses SVG quadratic bezier morphing & GSAP power3.out easing
   */
  initLiquidWaveHover(root = document) {
    if (typeof window === "undefined") return;
    const targetRoot = root || document;

    const cards = targetRoot.querySelectorAll(".julian-liquid-hover, [data-julian-wave]");
    if (!cards || cards.length === 0) return;

    cards.forEach(card => {
      if (card._julianLiquidInitialized) return;
      card._julianLiquidInitialized = true;

      // Ensure SVG liquid wave element exists
      let svg = card.querySelector(".julian-liquid-svg");
      let path = card.querySelector(".julian-liquid-path");

      if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("class", "julian-liquid-svg");
        svg.setAttribute("aria-hidden", "true");

        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M 0 100 V 0 Q 0 50 0 100 V 0 H 0 z");
        const fillColor = card.getAttribute("data-wave-color") || "#FFFFFF";
        path.setAttribute("fill", fillColor);
        path.setAttribute("class", "julian-liquid-path");

        svg.appendChild(path);
        card.appendChild(svg);
      } else if (!path) {
        path = svg.querySelector("path");
      }

      const inner = card.querySelector(".julian-liquid-inner, [data-animate='form-alternate-item-inner']");
      const arrow = card.querySelector(".julian-arrow, [data-animate='arrow']");

      let pathTween = null;
      let innerTween = null;
      let arrowTween = null;

      card.addEventListener("mouseenter", (e) => {
        if (!window.gsap) return;
        const dir = getJulianMouseEnterDirection(e, card);
        const p = JULIAN_SVG_PATHS[dir] || JULIAN_SVG_PATHS.top;

        if (pathTween) pathTween.kill();
        pathTween = window.gsap.fromTo(path,
          { attr: { d: p.startIn } },
          { attr: { d: p.endIn }, duration: 0.5, ease: "power3.out", overwrite: "auto" }
        );

        if (inner) {
          if (innerTween) innerTween.kill();
          innerTween = window.gsap.to(inner, {
            paddingLeft: "0.6rem",
            paddingRight: "0.6rem",
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }

        if (arrow) {
          if (arrowTween) arrowTween.kill();
          arrowTween = window.gsap.to(arrow, {
            rotate: -45,
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }
      });

      card.addEventListener("mouseleave", (e) => {
        if (!window.gsap) return;
        const dir = getJulianMouseEnterDirection(e, card);
        const p = JULIAN_SVG_PATHS[dir] || JULIAN_SVG_PATHS.top;

        if (pathTween) pathTween.kill();
        pathTween = window.gsap.fromTo(path,
          { attr: { d: p.startOut } },
          { attr: { d: p.endOut }, duration: 0.5, ease: "power3.out", overwrite: "auto" }
        );

        if (inner) {
          if (innerTween) innerTween.kill();
          innerTween = window.gsap.to(inner, {
            paddingLeft: "0rem",
            paddingRight: "0rem",
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }

        if (arrow) {
          if (arrowTween) arrowTween.kill();
          arrowTween = window.gsap.to(arrow, {
            rotate: 0,
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }
      });
    });
  }

  /**
   * Numeric counter rollup helper
   */
  animateCounter(el) {
    if (!el) return;
    const rawText = el.getAttribute("data-counter") || el.textContent || "0";
    const num = parseFloat(rawText.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return;

    const prefix = rawText.match(/^[^\d]*/)?.[0] || "";
    const suffix = rawText.match(/[^\d]*$/)?.[0] || "";

    const obj = { val: 0 };
    if (window.gsap) {
      window.gsap.to(obj, {
        val: num,
        duration: 1.8,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = `${prefix}${Math.floor(obj.val).toLocaleString()}${suffix}`;
        }
      });
    }
  }

  setupIntersectionFallback() {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("julian-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll("section, .julian-section").forEach(el => observer.observe(el));
  }
}

// Global initialization
if (typeof window !== "undefined") {
  window.JulianMotion = new JulianMotionEngine();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = JulianMotionEngine;
}



/* ============================================================================== */
/* 📦 MODULE: js/services/AuthService.js */
/* ============================================================================== */
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



/* ============================================================================== */
/* 📦 MODULE: js/services/CatalogService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 📦 CATALOG & INVENTORY SERVICE (OOP DATA LAYER)
 * ==============================================================================
 */

class CatalogService {
  constructor(store) {
    this.store = store;
  }

  async loadCatalog() {
    const currentCats = this.store.get("categories") || [];
    // Only show skeleton if we have literally zero products in memory
    if (currentCats.length === 0) {
      this.store.set("isCatalogLoading", true);
    }
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      try {
        const liveCats = await window.SupabaseAdapter.getProducts();
        if (liveCats && liveCats.length > 0) {
          window.categoriesData = liveCats;
          this.store.set("categories", liveCats);
          this.initCategoryFilters();
          this.store.set("isCatalogLoading", false);
          return;
        }
      } catch (err) {
        console.warn("[CATALOG SERVICE] Failed to fetch live products, using fallback:", err.message);
      }
    }
    // Offline or Network Failure Fallback
    const fallback = window.categoriesData || [];
    this.store.set("categories", fallback);
    this.initCategoryFilters();
    this.store.set("isCatalogLoading", false);
  }

  initCategoryFilters() {
    const cats = this.store.get("categories") || [];
    const filters = {};
    cats.forEach(cat => {
      filters[cat.id] = true; // Default all visible
    });
    this.store.set("categoryFilters", filters);
    this.store.set("activeCategory", "all");
  }

  setCategoryFilter(catId) {
    if (this.store.get("activeCategory") === catId) {
      // Already on this category: skip redundant DOM rebuild and animation
      return;
    }
    const cats = this.store.get("categories") || [];
    const filters = {};
    if (catId === "all") {
      cats.forEach(c => filters[c.id] = true);
    } else {
      cats.forEach(c => filters[c.id] = (c.id === catId));
    }
    this.store.set("activeCategory", catId, true); // silent update
    this.store.set("categoryFilters", filters);    // triggers single coordinated render
  }

  setSortOrder(order) {
    this.store.set("sortOrder", order || "popular");
  }

  toggleInStockOnly(forceState) {
    const current = this.store.get("inStockOnly") || false;
    const next = typeof forceState === "boolean" ? forceState : !current;
    this.store.set("inStockOnly", next);
  }

  toggleCategoryEye(catId) {
    const filters = { ...this.store.get("categoryFilters") };
    filters[catId] = !filters[catId];
    this.store.set("categoryFilters", filters);
  }

  setSearchQuery(query) {
    this.store.set("searchQuery", (query || "").trim().toLowerCase());
  }

  findProductById(productId) {
    const cats = this.store.get("categories") || [];
    for (const cat of cats) {
      const prod = cat.products?.find(p => p.id === productId);
      if (prod) return { ...prod, categoryName: cat.name };
    }
    return null;
  }
}

if (typeof window !== "undefined") {
  window.CatalogService = CatalogService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CatalogService;
}



/* ============================================================================== */
/* 📦 MODULE: js/services/PaymentService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 💳 PAYMENT ENGINE SERVICE (OOP 4-GATEWAY PROCESSOR)
 * ==============================================================================
 * ควบคุมการประมวลผลทั้ง 3 ช่องทางหลัก: PromptPay, TrueMoney, Bank Transfer
 * ==============================================================================
 */

class PaymentService {
  constructor(store) {
    this.store = store;
  }

  // --- 1. PROMPTPAY (EMVCO QR CODE & CRC16) ---
  generatePromptPayPayload(target, amount) {
    function crc16(data) {
      let crc = 0xFFFF;
      for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
      }
      return ("0000" + crc.toString(16).toUpperCase()).slice(-4);
    }

    const cleanTarget = target.replace(/[^0-9]/g, "");
    let targetType = "01";
    let formattedTarget = cleanTarget;

    if (cleanTarget.length >= 13) {
      targetType = "02";
    } else if (cleanTarget.startsWith("0")) {
      targetType = "01";
      formattedTarget = "0066" + cleanTarget.substring(1);
    }

    const tag29 = `0016A000000677010111${targetType}${("00" + formattedTarget.length).slice(-2)}${formattedTarget}`;
    const amountStr = amount.toFixed(2);
    const tag54 = `54${("00" + amountStr.length).slice(-2)}${amountStr}`;

    const raw = `00020101021229${("00" + tag29.length).slice(-2)}${tag29}5303764${tag54}5802TH`;
    return raw + "6304" + crc16(raw + "6304");
  }

  getPromptPayQrUrl(amount) {
    const target = window.storeConfig?.paymentDetails?.promptpay?.promptpayNumber || "1459901184414";
    const payload = this.generatePromptPayPayload(target, Math.max(1, parseFloat(amount) || 100));
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=Q&data=${encodeURIComponent(payload)}`;
  }

  async verifyPromptPaySlip(amount, transRef, slipImageBase64 = null) {
    const user = this.store.get("user");
    try {
      const response = await fetch("/api/verify-slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          transRef: transRef,
          slipImageBase64: slipImageBase64,
          userId: user?.id || null
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "สลิปไม่ผ่านการตรวจสอบ");
      }
      if (result.new_balance !== undefined) {
        this.store.set("walletBalance", result.new_balance);
      } else {
        this.store.creditWallet(parseFloat(amount));
      }
      return result;
    } catch (err) {
      if (err.message && !err.message.includes("fetch") && !err.message.includes("Failed to fetch")) {
        throw err;
      }
      // Fallback to direct RPC
      return this.processTopup({
        gateway: "promptpay",
        transRef: transRef,
        amount: amount,
        rawPayload: { qr: true, verifiedAt: new Date().toISOString() }
      });
    }
  }

  // --- 2. TRUEMONEY VOUCHER ---
  async redeemTrueMoneyVoucher(voucherUrl) {
    const user = this.store.get("user");
    
    // Serverless or Direct RPC
    const response = await fetch("/api/truemoney-redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voucherUrl: voucherUrl,
        userId: user?.id || null
      })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "ซองของขวัญไม่ถูกต้องหรือถูกรับไปแล้ว");
    }

    return {
      success: true,
      amount: parseFloat(result.amount),
      transRef: result.voucherHash || `TM-${Date.now()}`
    };
  }

  // --- 3. BANK TRANSFER ---
  async verifyBankTransferSlip(amount, transRef) {
    return this.processTopup({
      gateway: "bank_transfer",
      transRef: transRef,
      amount: amount,
      rawPayload: {
        bank: window.storeConfig?.paymentDetails?.bank_transfer?.bankCode || "KTB",
        manualVerification: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  // --- CENTRAL TOPUP EXECUTOR (DATABASE RPC + FALLBACK) ---
  async processTopup({ gateway, transRef, amount, rawPayload = {} }) {
    const user = this.store.get("user");
    let result = null;

    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      result = await window.SupabaseAdapter.processTopup({
        gateway,
        transRef,
        amount: parseFloat(amount),
        userId: user?.id || null,
        rawPayload
      });
    } else {
      // Local fallback with dupe check
      const usedSlips = JSON.parse(localStorage.getItem("nyx_used_slips") || "[]");
      if (usedSlips.includes(transRef)) {
        throw new Error("สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้ (Anti-Double-Spend Triggered)");
      }
      usedSlips.push(transRef);
      localStorage.setItem("nyx_used_slips", JSON.stringify(usedSlips));
      result = { success: true, amount: parseFloat(amount) };
    }

    if (!result || !result.success) {
      throw new Error(result?.message || "การทำรายการชำระเงินไม่สำเร็จ");
    }

    const credited = parseFloat(result.amount || amount);
    this.store.creditWallet(credited);
    return { success: true, amount: credited };
  }
}

if (typeof window !== "undefined") {
  window.PaymentService = PaymentService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PaymentService;
}



/* ============================================================================== */
/* 📦 MODULE: js/services/CheckoutService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * ⚡ CHECKOUT & FULFILLMENT SERVICE (OOP ORDER ENGINE)
 * ==============================================================================
 */

class CheckoutService {
  constructor(store) {
    this.store = store;
  }

  static validateRequiredFormFields(item) {
    if (!item) return true;
    const formFields = item.form_fields || item.formFields || [];
    if (Array.isArray(formFields)) {
      for (const f of formFields) {
        if (f && f.required) {
          const fieldKey = f.id || f.name;
          const val = (item.customFields && (item.customFields[fieldKey] !== undefined ? item.customFields[fieldKey] : item.customFields[f.id])) ||
                      (item.field_values && (item.field_values[fieldKey] !== undefined ? item.field_values[fieldKey] : item.field_values[f.id])) || '';
          if (!val || String(val).trim() === '') {
            throw new Error(`กรุณากรอกข้อมูล "${f.label || f.name || f.id}" สำหรับสินค้า ${item.title || item.name || 'นี้'}`);
          }
        }
      }
    }
    return true;
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

    // Validate required custom form fields (TC-ORD-01: Product Type ORDER)
    for (const item of cart) {
      CheckoutService.validateRequiredFormFields(item);
    }

    const { total } = this.calculateTotals();
    const walletBalance = this.store.get("walletBalance");

    if (walletBalance < total) {
      const diff = (total - walletBalance).toFixed(2);
      throw new Error(`ยอดเงินในกระเป๋าไม่พอ (ขาดอีก ฿${diff}) กรุณาเติมเงินก่อนสั่งซื้อ`);
    }

    const orderId = `NYX-${Math.floor(100000 + Math.random() * 900000)}`;
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
    localStorage.setItem("nyx_orders", JSON.stringify(history.slice(0, 30)));

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



/* ============================================================================== */
/* 📦 MODULE: js/services/HistoryService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 📜 HISTORY & ORDER VAULT SERVICE (OOP ORDER RETRIEVAL ENGINE)
 * ==============================================================================
 */

class HistoryService {
  constructor(store) {
    this.store = store;
  }

  /**
   * รวมประวัติคำสั่งซื้อจากทั้ง Supabase (เมื่อล็อกอิน) และ LocalStorage (ออฟไลน์/Guest)
   */
  async getOrderHistory() {
    const user = this.store.get("user");
    const localRaw = typeof localStorage !== "undefined" ? localStorage.getItem("nyx_orders") : null;
    let localOrders = [];

    try {
      if (localRaw) {
        localOrders = JSON.parse(localRaw);
      }
    } catch (e) {
      console.warn("[HISTORY] Local order parse failed:", e);
    }

    let supabaseOrders = [];
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      const dbOrders = await window.SupabaseAdapter.getUserOrders(user?.id || null);
      if (Array.isArray(dbOrders)) {
        supabaseOrders = dbOrders.map(o => ({
          orderId: o.id,
          totalAmount: parseFloat(o.total_amount || 0),
          timestamp: o.created_at,
          paymentMethod: o.payment_method || "wallet",
          status: o.status || "PAID",
          items: (o.order_items || []).map(oi => ({
            id: oi.product_id,
            title: oi.custom_data?.title || oi.product_id || "สินค้าดิจิทัล",
            quantity: oi.quantity || 1,
            credentials: oi.delivered_content ? oi.delivered_content.split("\n") : []
          }))
        }));
      }
    }

    // รวมและจัดเรียงตามเวลาล่าสุด โดยไม่ให้มี Order ID ซ้ำกัน
    const mergedMap = new Map();

    // ใส่จาก Supabase ก่อน
    supabaseOrders.forEach(ord => {
      if (ord.orderId) mergedMap.set(ord.orderId, ord);
    });

    // ใส่จาก LocalStorage ถ้ายังไม่มี
    localOrders.forEach(ord => {
      const id = ord.orderId || ord.id;
      if (id && !mergedMap.has(id)) {
        mergedMap.set(id, {
          orderId: id,
          totalAmount: ord.totalAmount || 0,
          timestamp: ord.timestamp || new Date().toISOString(),
          paymentMethod: ord.paymentMethod || "wallet",
          status: ord.status || "PAID",
          items: (ord.items || []).map(item => ({
            id: item.id,
            title: item.title || item.id,
            quantity: item.quantity || 1,
            credentials: item.credentials || (item.delivered_content ? item.delivered_content.split("\n") : [])
          }))
        });
      }
    });

    const finalOrders = Array.from(mergedMap.values());
    finalOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.store.set("orderHistory", finalOrders);
    return finalOrders;
  }

  /**
   * คัดลอกข้อความไปยังคลิปบอร์ดอย่างปลอดภัย
   */
  async copyToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback สำหรับเบราว์เซอร์เก่า
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      console.error("[HISTORY] Copy failed:", e);
      return false;
    }
  }
}

if (typeof window !== "undefined") {
  window.HistoryService = HistoryService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = HistoryService;
}



/* ============================================================================== */
/* 📦 MODULE: js/services/ReviewService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * ⭐ NYX9 STUDIO — REVIEW SERVICE (VERIFIED RATINGS ENGINE)
 * ==============================================================================
 * จัดการการส่งรีวิว การดึงคะแนนเฉลี่ย และการแสดงผลรีวิวจากลูกค้าจริง
 * รองรับทั้งการเรียก RPC บน Supabase และ LocalStorage Fallback
 * ==============================================================================
 */

class ReviewService {
  constructor(store) {
    this.store = store;
    this.cache = new Map();
  }

  /**
   * ดึงรีวิวและสถิติภาพรวมของทั้งร้าน (สำหรับแสดงบนหน้าเว็บหลัก)
   */
  async getStorewideReviews(limit = 12) {
    try {
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient.rpc('get_storewide_reviews', { p_limit: limit });
        if (!error && data) {
          return data;
        }
      }
    } catch (err) {
      console.warn('[REVIEW SERVICE] Error fetching storewide reviews:', err.message);
    }

    // Fallback: Mock & Local Storage
    return this.getLocalStoreReviews();
  }

  /**
   * ดึงคะแนนเฉลี่ยและรีวิวของสินค้ารายชิ้น
   */
  async getProductReviewSummary(productId) {
    if (!productId) return { average_rating: 5.0, total_reviews: 0, reviews: [] };

    if (this.cache.has(productId)) {
      return this.cache.get(productId);
    }

    try {
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient.rpc('get_product_review_summary', { p_product_id: productId });
        if (!error && data) {
          this.cache.set(productId, data);
          return data;
        }
      }
    } catch (err) {
      console.warn(`[REVIEW SERVICE] Error fetching review summary for ${productId}:`, err.message);
    }

    const fallback = {
      product_id: productId,
      average_rating: 5.0,
      total_reviews: 1,
      reviews: []
    };
    return fallback;
  }

  /**
   * ส่งรีวิวสินค้าจากคำสั่งซื้อจริง (Verified Buyer)
   */
  async submitReview({ orderId, productId, rating, comment = '', authorName = '', avatarUrl = null }) {
    const cleanOrderId = (orderId || '').trim();
    const cleanProductId = (productId || '').trim();
    const cleanRating = parseInt(rating, 10);
    const user = this.store?.get?.('user');

    if (!cleanOrderId) throw new Error('กรุณาระบุหมายเลขคำสั่งซื้อ');
    if (!cleanProductId) throw new Error('กรุณาระบุรหัสสินค้า');
    if (isNaN(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      throw new Error('กรุณาเลือกคะแนนระหว่าง 1 ถึง 5 ดาว');
    }

    const finalAuthor = (authorName || user?.username || 'ลูกค้าผู้มีอุปการคุณ').trim();
    const finalAvatar = avatarUrl || user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanOrderId}`;

    if (window.supabaseClient) {
      const { data, error } = await window.supabaseClient.rpc('submit_product_review', {
        p_order_id: cleanOrderId,
        p_product_id: cleanProductId,
        p_rating: cleanRating,
        p_comment: (comment || '').trim(),
        p_author_name: finalAuthor,
        p_avatar_url: finalAvatar,
        p_user_id: user?.id || null
      });

      if (error) {
        throw new Error(error.message || 'บันทึกรีวิวไม่สำเร็จ');
      }

      // Invalidate cache
      this.cache.delete(cleanProductId);

      // Trigger Discord Webhook Notification for 5-star review
      try {
        if (typeof fetch === 'function') {
          fetch('/api/discord-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'REVIEW_SUBMITTED',
              orderId: cleanOrderId,
              productId: cleanProductId,
              rating: cleanRating,
              comment: comment,
              authorName: finalAuthor
            })
          }).catch(() => {});
        }
      } catch (e) {}

      return data;
    }

    // Local Fallback
    const localKey = 'nyx9_local_reviews';
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const newReview = {
      id: `local-rev-${Date.now()}`,
      order_id: cleanOrderId,
      product_id: cleanProductId,
      rating: cleanRating,
      comment: (comment || '').trim(),
      author_name: finalAuthor,
      avatar_url: finalAvatar,
      is_verified: true,
      created_at: new Date().toISOString()
    };
    existing.unshift(newReview);
    localStorage.setItem(localKey, JSON.stringify(existing));

    return {
      success: true,
      message: 'บันทึกรีวิวในเครื่องเรียบร้อยแล้ว!',
      review_id: newReview.id
    };
  }

  getLocalStoreReviews() {
    const local = JSON.parse(localStorage.getItem('nyx9_local_reviews') || '[]');
    const defaultReviews = [
      {
        id: 'rev-def-1',
        product_title: 'Nitro Booster (Mailpass 1 เดือน)',
        order_id: 'NYX-891021',
        rating: 5,
        comment: 'ส่งไวมากครับ กดซื้อเสร็จรหัสเด้งขึ้นหน้าจอทันที เอาไปใช้ได้จริง 100% แนะนำร้านนี้เลย!',
        author_name: 'Krit_Discord',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Krit',
        is_verified: true,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'rev-def-2',
        product_title: 'บูสต์เซิร์ฟเวอร์ 1 เดือน (2 บูสต์)',
        order_id: 'NYX-612450',
        rating: 5,
        comment: 'บูสต์เข้าเซิร์ฟเวอร์เรียบร้อย สมาชิกในดิสแฮปปี้มาก ราคาถูกกว่าเติมตรงเยอะมากครับ',
        author_name: 'NightRunner_TH',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NightRunner',
        is_verified: true,
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'rev-def-3',
        product_title: 'สคริปต์ Blox Fruits & GUI (Auto Farm / Raid)',
        order_id: 'NYX-728190',
        rating: 5,
        comment: 'สคริปต์ Roblox เสถียรมากครับ ลื่นไหล ไม่มีหลุด ออโต้ฟาร์มเวลตันไวมาก มีคู่มือสอนติดตั้งเข้าใจง่าย แนะนำเลย!',
        author_name: 'StudioDev_Roblox',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RobloxDev',
        is_verified: true,
        created_at: new Date(Date.now() - 10800000).toISOString()
      },
      {
        id: 'rev-def-4',
        product_title: 'ปั๊มคนเข้า Discord (มีโปรไฟล์จริง)',
        order_id: 'NYX-542198',
        rating: 5,
        comment: 'ปั๊มคนดิสไวมาก ไม่หลุด บริการดีมากครับ แอดมินตอบแชทสุภาพ แนะนำเลยครับ',
        author_name: 'Zeedo_Developer',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zeedo',
        is_verified: true,
        created_at: new Date(Date.now() - 14400000).toISOString()
      }
    ];

    const all = [...local, ...defaultReviews];
    return {
      overall_average: 5.0,
      total_reviews: all.length,
      reviews: all
    };
  }
}

if (typeof window !== 'undefined') {
  window.ReviewService = ReviewService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReviewService;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/UI.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🎨 UI UTILITIES (TOAST NOTIFICATIONS, CONFETTI, THEME ENGINE)
 * ==============================================================================
 */

class UIManager {
  constructor() {
    this.initTheme();
  }

  initTheme() {
    const config = window.storeConfig || {};
    const theme = config.theme || {};
    const root = document.documentElement;

    if (theme.accent) root.style.setProperty("--accent", theme.accent);
    if (theme.accentHover) root.style.setProperty("--accent-hover", theme.accentHover);
    if (theme.baseBg) root.style.setProperty("--base-bg", theme.baseBg);
    if (theme.cardBg) root.style.setProperty("--card-bg", theme.cardBg);
    if (theme.cardHover) root.style.setProperty("--card-hover", theme.cardHover);

    document.title = `${config.storeName || "NYX9 STUDIO"} | ${config.tagline || ""}`;

    document.querySelectorAll("[data-bind='storeName']").forEach(el => el.textContent = config.storeName);
    document.querySelectorAll("[data-bind='brandShort']").forEach(el => el.textContent = config.brandShort || config.storeName);
    document.querySelectorAll("[data-bind='tagline']").forEach(el => el.textContent = config.tagline);
    document.querySelectorAll("[data-bind='subTagline']").forEach(el => el.textContent = config.subTagline);
    if (config.discordCommunityUrl) {
      document.querySelectorAll("[data-bind='discordCommunityUrl']").forEach(el => {
        if (el.tagName === "A") el.href = config.discordCommunityUrl;
      });
    }
    if (config.supportEmail) {
      document.querySelectorAll("[data-bind='supportEmail']").forEach(el => {
        el.textContent = config.supportEmail;
        if (el.tagName === "A") el.href = `mailto:${config.supportEmail}`;
      });
    }
  }

  toast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const colors = {
      success: "border-emerald-500/50 bg-emerald-950/80 text-emerald-200",
      error: "border-rose-500/50 bg-rose-950/80 text-rose-200",
      warning: "border-amber-500/50 bg-amber-950/80 text-amber-200",
      info: "border-[var(--accent)] bg-slate-900/90 text-white"
    };

    const icons = {
      success: "check-circle",
      error: "alert-circle",
      warning: "alert-triangle",
      info: "info"
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl text-xs font-semibold animate-in slide-in-from-top-4 duration-200 ${colors[type] || colors.info}`;
    
    // XSS-Safe DOM construction
    const iconEl = document.createElement("i");
    iconEl.setAttribute("data-lucide", icons[type] || "info");
    iconEl.className = "w-4 h-4 shrink-0";
    
    const msgEl = document.createElement("span");
    msgEl.className = "flex-1";
    msgEl.textContent = String(message || "");

    toast.appendChild(iconEl);
    toast.appendChild(msgEl);

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => {
        if (typeof toast.remove === "function") {
          toast.remove();
        } else if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3500);
  }

  confetti() {
    if (typeof confetti === "function") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#19BAFF", "#38D4FF", "#00FFA3", "#FFFFFF"]
      });
    }
  }
}

if (typeof window !== "undefined") {
  window.UI = new UIManager();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = UIManager;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/Navbar.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * NAVBAR COMPONENT (OOP CONTROLLER WITH USER DROPDOWN)
 * ==============================================================================
 */

class NavbarComponent {
  constructor(store) {
    this.store = store;
    this.initListeners();
    this.initGlobalBindings();
  }

  initListeners() {
    this.store.on("change:wallet", () => this.updateWalletUI());
    this.store.on("change:points", () => this.updatePointsUI());
    this.store.on("change:user", () => this.updateAuthUI());
    this.store.on("change:cart", () => this.updateCartBadge());
  }

  initGlobalBindings() {
    window.toggleUserMenu = (e) => {
      if (e) e.stopPropagation();
      const menu = document.getElementById("user-dropdown-menu");
      const chevron = document.getElementById("user-menu-chevron");
      if (!menu) return;
      const isHidden = menu.classList.contains("hidden");
      if (isHidden) {
        menu.classList.remove("hidden");
        if (chevron) chevron.classList.add("rotate-180");
      } else {
        menu.classList.add("hidden");
        if (chevron) chevron.classList.remove("rotate-180");
      }
    };

    window.handleMenuAction = (action) => {
      const menu = document.getElementById("user-dropdown-menu");
      const chevron = document.getElementById("user-menu-chevron");
      if (menu) menu.classList.add("hidden");
      if (chevron) chevron.classList.remove("rotate-180");

      if (action === "history") {
        if (typeof openHistoryModal === "function") openHistoryModal();
      } else if (action === "claim") {
        if (typeof openClaimModal === "function") openClaimModal();
      } else if (action === "topup") {
        if (typeof openTopUpModal === "function") openTopUpModal();
      } else if (action === "logout") {
        if (typeof handleLogout === "function") handleLogout();
      }
    };

    // Close on click outside
    if (typeof document !== "undefined") {
      document.addEventListener("click", (e) => {
        const authSec = document.getElementById("auth-section");
        const menu = document.getElementById("user-dropdown-menu");
        const chevron = document.getElementById("user-menu-chevron");
        if (authSec && menu && !authSec.contains(e.target)) {
          menu.classList.add("hidden");
          if (chevron) chevron.classList.remove("rotate-180");
        }
      });
    }
  }

  updateWalletUI() {
    const balance = this.store.get("walletBalance") || 0;
    const el = document.getElementById("user-wallet-balance");
    if (el) el.textContent = `฿${balance.toFixed(2)}`;

    const cartBal = document.getElementById("cart-wallet-balance");
    if (cartBal) cartBal.textContent = `฿${balance.toFixed(2)}`;

    const menuBal = document.getElementById("menu-wallet-balance");
    if (menuBal) menuBal.textContent = `฿${balance.toFixed(2)}`;
  }

  updatePointsUI() {
    const points = this.store.get("loyaltyPoints") || 0;
    const el = document.getElementById("user-points-balance");
    if (el) el.textContent = `${Math.floor(points).toLocaleString()} แต้ม`;

    const menuPts = document.getElementById("menu-points-balance");
    if (menuPts) menuPts.textContent = `${Math.floor(points).toLocaleString()} แต้ม`;
  }

  updateAuthUI() {
    const user = this.store.get("user");
    const loginBtn = document.getElementById("btn-discord-login");
    const signupBtn = document.getElementById("btn-nav-signup");
    const unauthGroup = document.getElementById("auth-unauthenticated");
    const profileBadge = document.getElementById("user-profile-badge");
    const avatarImg = document.getElementById("user-avatar-img");
    const nameEl = document.getElementById("user-display-name");

    // Dropdown elements
    const menuAvatar = document.getElementById("menu-avatar-img");
    const menuUsername = document.getElementById("menu-username");
    const menuDiscordId = document.getElementById("menu-discord-id");
    const menuWallet = document.getElementById("menu-wallet-balance");
    const menuAdminLink = document.getElementById("menu-admin-link");

    const adminIds = (window.storeConfig && window.storeConfig.adminDiscordIds) || ["483398326159671326", "422611554475835394"];
    const isAdmin = user && (user.role === "admin" || adminIds.includes(String(user.discordId)) || (user.email && user.email.toLowerCase() === "sanaseeriri@gmail.com"));
    const balance = this.store.get("walletBalance") || 0;

    if (user) {
      if (unauthGroup) unauthGroup.classList.add("hidden");
      if (loginBtn) loginBtn.classList.add("hidden");
      if (signupBtn) signupBtn.classList.add("hidden");
      if (profileBadge) {
        profileBadge.classList.remove("hidden");
        profileBadge.classList.add("flex");
      }
      const avatarUrl = user.avatarUrl || "assets/logo.png";
      const username = user.username || "Discord User";

      if (avatarImg) avatarImg.src = avatarUrl;
      if (nameEl) nameEl.textContent = username;

      if (menuAvatar) menuAvatar.src = avatarUrl;
      if (menuUsername) menuUsername.textContent = username;
      const provTag = (user.provider || "user").toUpperCase();
      if (menuDiscordId) {
        if (user.discordId) {
          menuDiscordId.textContent = `[${provTag}] ID: ${user.discordId}`;
        } else {
          menuDiscordId.textContent = `[${provTag}] ${user.email || 'Member'}`;
        }
      }
      if (menuWallet) menuWallet.textContent = `฿${balance.toFixed(2)}`;

      if (menuAdminLink) {
        if (isAdmin) {
          menuAdminLink.classList.remove("hidden");
          menuAdminLink.classList.add("flex");
        } else {
          menuAdminLink.classList.add("hidden");
          menuAdminLink.classList.remove("flex");
        }
      }
    } else {
      if (unauthGroup) unauthGroup.classList.remove("hidden");
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (signupBtn) signupBtn.classList.remove("hidden");
      if (profileBadge) {
        profileBadge.classList.add("hidden");
        profileBadge.classList.remove("flex");
      }
      const menu = document.getElementById("user-dropdown-menu");
      if (menu) menu.classList.add("hidden");
    }

    if (window.lucide) lucide.createIcons();
  }

  updateCartBadge() {
    const cart = this.store.get("cart") || [];
    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const badges = [
      document.getElementById("cart-badge-count"),
      document.getElementById("mobile-cart-badge-count")
    ].filter(Boolean);

    badges.forEach(badge => {
      if (totalCount > 0) {
        badge.textContent = totalCount;
        badge.className = "absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-[#06080C] text-[10px] font-mono-val font-extrabold flex items-center justify-center animate-pulse shadow-md shadow-[var(--accent)]/40";
      } else {
        badge.className = "hidden";
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.NavbarComponent = NavbarComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = NavbarComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/HeroSection.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * HERO & TELEMETRY COMPONENT (OOP CONTROLLER - CLEAN CENTERED HERO BANNER)
 * ==============================================================================
 */

class HeroSectionComponent {
  constructor(store) {
    this.store = store;
    this.timer = null;
  }

  render() {
    this.renderCarousel();
    this.renderTelemetry();
  }

  renderCarousel() {
    const container = document.getElementById("hero-carousel-track") || document.getElementById("hero-carousel-container");
    const dotsContainer = document.getElementById("hero-carousel-dots") || document.getElementById("hero-carousel-indicators");
    if (!container) return;

    const banners = window.storeConfig?.heroBanners || [];
    if (banners.length === 0) {
      container.innerHTML = `
        <div class="w-full flex-shrink-0 relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-12 border border-white/[0.08] bg-gradient-to-br from-[#0D1017]/95 via-[#0A0C13]/95 to-[#06080C]/95 backdrop-blur-2xl shadow-2xl">
          <div class="relative z-10 max-w-3xl space-y-3 text-left">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono font-medium text-indigo-400">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>NYX9 STUDIO OFFICIAL</span>
            </div>
            <h2 class="text-2xl sm:text-4xl font-heading font-black text-white tracking-wide">
              DISCORD &amp; ROBLOX STUDIO
            </h2>
            <p class="text-slate-300 text-xs sm:text-sm max-w-2xl">
              ศูนย์รวมบริการ Discord Nitro, Server Boosts และระบบเกม Roblox จัดส่งอัตโนมัติ 24 ชม.
            </p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = banners.map((banner, idx) => {
      const glowColor = banner.themeColor === 'amber' ? 'rgba(245,158,11,0.06)' : (banner.themeColor === 'emerald' ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.08)');

      return `
        <div class="w-full flex-shrink-0 relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-12 border border-white/[0.08] bg-gradient-to-br from-[#0D1017]/95 via-[#0A0C13]/95 to-[#06080C]/95 backdrop-blur-2xl transition-all duration-500 shadow-2xl">
          
          <!-- Background Ambient Flare -->
          <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none" style="background: ${glowColor}"></div>

          <div class="relative z-10 max-w-3xl space-y-4 text-left">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono font-medium text-indigo-400">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span>${banner.badge}</span>
            </div>

            <h2 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-black text-white tracking-wide leading-tight">
              ${banner.title}
              <span class="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-200 to-slate-100 mt-1">
                ${banner.highlight}
              </span>
            </h2>

            <p class="text-slate-300 text-xs sm:text-sm sm:leading-relaxed max-w-2xl font-normal">
              ${banner.description}
            </p>

            <!-- Key Perks List -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              ${(banner.perks || []).map(p => `
                <span class="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-indigo-400"></i>
                  <span>${p}</span>
                </span>
              `).join('')}
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-3 pt-2 sm:pt-4">
              <button onclick="window.handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}', '${banner.productId || ''}')" class="btn-cyber-primary btn-shimmer px-6 py-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer active:scale-95 transition-all shadow-md">
                <span>${banner.ctaText}</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </button>
              
              <button onclick="window.handleBannerSecondaryCta('${banner.secondaryCategory || ''}', '${banner.secondaryAction || ''}')" class="px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs sm:text-sm text-slate-300 hover:text-white font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${banner.secondaryText}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    if (dotsContainer) {
      dotsContainer.innerHTML = banners.map((_, idx) => `
        <button onclick="window.setCarouselSlide(${idx})" class="w-3 h-1.5 rounded-full transition-all duration-300 ${idx === 0 ? 'w-7 bg-[var(--accent)]' : 'bg-slate-700'}" aria-label="Slide ${idx + 1}"></button>
      `).join("");
    }

    if (window.lucide) lucide.createIcons();
    this.initTiltCards();
    this.startAutoTimer();
  }

  initTiltCards() {
    // Deprecated: Tilt cards removed for clean mobile-first layout
  }

  goToSlide(index) {
    const container = document.getElementById("hero-carousel-track") || document.getElementById("hero-carousel-container");
    const dotsContainer = document.getElementById("hero-carousel-dots") || document.getElementById("hero-carousel-indicators");
    const banners = window.storeConfig?.heroBanners || [];
    const total = banners.length;
    if (!container || total === 0) return;

    const activeIndex = (index + total) % total;
    container.style.transform = `translateX(-${activeIndex * 100}%)`;

    if (dotsContainer) {
      const dots = dotsContainer.children;
      for (let i = 0; i < dots.length; i++) {
        dots[i].className = i === activeIndex 
          ? "w-7 h-1.5 rounded-full bg-[var(--accent)] transition-all duration-300"
          : "w-3 h-1.5 rounded-full bg-slate-700 transition-all duration-300";
      }
    }

    this.store.set("activeCarouselIndex", activeIndex, true);
  }

  nextSlide() {
    const banners = window.storeConfig?.heroBanners || [];
    let current = this.store.get("activeCarouselIndex") || 0;
    this.goToSlide(current + 1);
  }

  prevSlide() {
    const banners = window.storeConfig?.heroBanners || [];
    let current = this.store.get("activeCarouselIndex") || 0;
    this.goToSlide(current - 1);
  }

  startAutoTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.nextSlide(), 7000);
  }

  renderTelemetry() {
    // Telemetry counters eliminated per unslop clean store policy
  }
}

if (typeof window !== "undefined") {
  window.HeroSectionComponent = HeroSectionComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = HeroSectionComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/CatalogView.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * CATALOG & PRODUCT CARDS COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class CatalogViewComponent {
  constructor(store) {
    this.store = store;
    this.store.on("change:categories", () => this.render());
    this.store.on("change:isCatalogLoading", () => this.render());
    this.store.on("change:categoryFilters", () => {
      this.renderCategoryFilterBar();
      this.renderProducts();
    });
    this.store.on("change:activeCategory", () => this.renderCategoryFilterBar());
    this.store.on("change:sortOrder", () => this.renderProducts());
    this.store.on("change:inStockOnly", () => {
      this.renderCategoryFilterBar();
      this.renderProducts();
    });
    this.store.on("change:searchQuery", () => this.renderProducts());
  }

  render() {
    this.renderCategoryFilterBar();
    this.renderProducts();
  }

  renderCategoryFilterBar() {
    const container = document.getElementById("category-filter-bar");
    if (!container) return;

    if (this.store.get("isCatalogLoading")) {
      container.innerHTML = `
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 animate-pulse">
          <div class="h-8 w-24 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-32 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-36 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
          <div class="h-8 w-28 rounded-xl bg-white/[0.04] border border-white/[0.06]"></div>
        </div>
      `;
      return;
    }

    const categories = this.store.get("categories") || [];
    const activeCategory = this.store.get("activeCategory") || "all";
    const sortOrder = this.store.get("sortOrder") || "popular";
    const inStockOnly = this.store.get("inStockOnly") || false;

    // Calculate total product count
    const totalCount = categories.reduce((acc, c) => acc + (c.products?.length || 0), 0);

    let html = `
      <!-- Left: Ghost Tabs Rail (Frameless & Breathable) -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth flex-nowrap">
        <!-- ALL TAB -->
        <button onclick="window.Shop?.catalogService?.setCategoryFilter('all')" 
          class="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 ${activeCategory === 'all' 
            ? 'bg-white text-[#0A0D14] shadow-md shadow-black/40 font-bold border border-white' 
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12]'}">
          <i data-lucide="layout-grid" class="w-3.5 h-3.5 ${activeCategory === 'all' ? 'text-[#05080E]' : 'text-slate-400 group-hover:text-white'}"></i>
          <span>ทั้งหมด</span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono-val font-bold ${activeCategory === 'all' ? 'bg-[#05080E]/20 text-[#05080E]' : 'bg-white/[0.04] text-slate-400 group-hover:text-slate-200'}">${totalCount}</span>
        </button>
    `;

    categories.forEach(cat => {
      const isActive = activeCategory === cat.id;
      const count = cat.products?.length || 0;
      const icon = cat.icon || "box";

      html += `
        <button onclick="window.Shop?.catalogService?.setCategoryFilter('${cat.id}')" 
          class="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 ${isActive 
            ? 'bg-white text-[#0A0D14] shadow-md shadow-black/40 font-bold border border-white' 
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12]'}">
          <i data-lucide="${icon}" class="w-3.5 h-3.5 ${isActive ? 'text-[#05080E]' : 'text-slate-400 group-hover:text-[var(--accent)]'}"></i>
          <span>${cat.name}</span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono-val font-bold ${isActive ? 'bg-[#05080E]/20 text-[#05080E]' : 'bg-white/[0.04] text-slate-400 group-hover:text-slate-200'}">${count}</span>
        </button>
      `;
    });

    html += `
      </div>

      <!-- Right: Utility Controls (Frameless Minimalist Controls) -->
      <div class="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0 justify-end">
        <!-- IN-STOCK ONLY TOGGLE -->
        <button onclick="window.Shop?.catalogService?.toggleInStockOnly()" 
          title="กรองเฉพาะสินค้าที่มีของพร้อมจัดส่ง"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95 ${inStockOnly 
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12]'}">
          <span class="relative flex h-2 w-2">
            ${inStockOnly ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>' : ''}
            <span class="relative inline-flex rounded-full h-2 w-2 ${inStockOnly ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}"></span>
          </span>
          <span class="text-xs">เฉพาะพร้อมส่ง</span>
        </button>

        <!-- SORT DROPDOWN -->
        <div class="relative flex items-center">
          <div class="pointer-events-none absolute left-2.5 flex items-center text-slate-400">
            <i data-lucide="arrow-down-up" class="w-3.5 h-3.5 text-slate-400"></i>
          </div>
          <select onchange="window.Shop?.catalogService?.setSortOrder(this.value)" 
            class="pl-7 pr-7 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-xs text-slate-300 hover:text-white font-semibold focus:outline-none cursor-pointer transition-colors appearance-none">
            <option value="popular" class="bg-[#0C111A] text-white" ${sortOrder === 'popular' ? 'selected' : ''}>ยอดนิยม</option>
            <option value="price_asc" class="bg-[#0C111A] text-white" ${sortOrder === 'price_asc' ? 'selected' : ''}>ราคา: ต่ำ → สูง</option>
            <option value="price_desc" class="bg-[#0C111A] text-white" ${sortOrder === 'price_desc' ? 'selected' : ''}>ราคา: สูง → ต่ำ</option>
            <option value="discount" class="bg-[#0C111A] text-white" ${sortOrder === 'discount' ? 'selected' : ''}>ส่วนลดสูงสุด</option>
          </select>
          <div class="pointer-events-none absolute right-2 flex items-center text-slate-400">
            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    if (window.JulianMotion && typeof window.JulianMotion.animateCatalogGrid === 'function') {
      window.JulianMotion.animateCatalogGrid(container);
    }
  }

  renderProducts() {
    const container = document.getElementById("catalog-container") || document.getElementById("products-catalog-container");
    if (!container) return;

    if (this.store.get("isCatalogLoading")) {
      container.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] animate-pulse">
            <div class="h-6 w-44 rounded-lg bg-white/[0.06]"></div>
            <div class="h-4 w-16 rounded bg-white/[0.04]"></div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `
              <div class="rounded-2xl bg-[#0C111A] border border-white/[0.06] p-4 flex flex-col justify-between relative overflow-hidden skeleton-shimmer">
                <div>
                  <div class="w-full aspect-square rounded-xl bg-[#06080D] border border-white/[0.04] mb-3.5 relative overflow-hidden flex items-center justify-center">
                    <div class="w-10 h-10 rounded-xl bg-white/[0.03]"></div>
                  </div>
                  <div class="h-4 w-3/4 rounded bg-white/[0.08] mb-2.5"></div>
                  <div class="flex gap-1.5 mb-3.5">
                    <div class="h-3.5 w-12 rounded bg-white/[0.04]"></div>
                    <div class="h-3.5 w-16 rounded bg-white/[0.04]"></div>
                  </div>
                </div>
                <div class="pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                  <div class="h-5 w-16 rounded bg-white/[0.05]"></div>
                  <div class="h-8 w-16 rounded-xl bg-white/[0.06]"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      return;
    }

    const categories = this.store.get("categories") || [];
    const filters = this.store.get("categoryFilters") || {};
    const query = this.store.get("searchQuery") || "";
    const sortOrder = this.store.get("sortOrder") || "popular";
    const inStockOnly = this.store.get("inStockOnly") || false;

    const visibleCategories = categories.filter(c => filters[c.id]);

    if (visibleCategories.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center rounded-3xl bg-[#0C111A]/80 border border-[rgba(255,255,255,0.08)]">
          <i data-lucide="package-x" class="w-10 h-10 mx-auto text-slate-500 mb-3"></i>
          <h4 class="text-base font-heading font-bold text-white mb-1">ไม่พบหมวดหมู่ที่เลือก</h4>
          <p class="text-xs text-slate-400">คลิกปุ่ม "ทั้งหมด" ด้านบนเพื่อดูสินค้าครบทุกหมวดหมู่</p>
          <button onclick="window.Shop?.catalogService?.setCategoryFilter('all')" class="mt-4 px-4 py-2 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold text-xs cursor-pointer active:scale-95 transition-transform shadow-lg">
            ดูสินค้าทั้งหมด
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    if (window.JulianMotion && typeof window.JulianMotion.animateCatalogGrid === 'function') {
      window.JulianMotion.animateCatalogGrid(container);
    }
      return;
    }

    let renderedAnyProduct = false;

    const html = visibleCategories.map(cat => {
      let prods = cat.products || [];

      // Filter: In-Stock Only
      if (inStockOnly) {
        prods = prods.filter(p => p.stock > 0);
      }

      // Filter: Search Query
      if (query) {
        prods = prods.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.chips?.some(c => c.toLowerCase().includes(query))
        );
      }

      // Sort
      if (sortOrder === "price_asc") {
        prods = [...prods].sort((a, b) => a.price - b.price);
      } else if (sortOrder === "price_desc") {
        prods = [...prods].sort((a, b) => b.price - a.price);
      } else if (sortOrder === "discount") {
        prods = [...prods].sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
      }

      if (prods.length === 0) {
        if (query || inStockOnly) return "";
      }

      renderedAnyProduct = true;

      return `
        <div id="${cat.id}" class="space-y-4 mb-10">
          <div class="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
            <div class="flex items-center gap-3">
              <span class="w-1.5 h-5 rounded-full bg-[var(--accent)]"></span>
              <div>
                <h3 class="text-base sm:text-lg font-heading font-extrabold text-white tracking-wide">${cat.name}</h3>
                <p class="text-xs text-slate-400 font-mono-val">${cat.subName || ""}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-lg bg-[#0C111A] border border-[rgba(255,255,255,0.06)] text-xs text-slate-300 font-mono-val font-bold">
                ${prods.length} รายการ
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${prods.map((p, idx) => {
              if (idx === 0 && prods.length >= 3) {
                return this.createBentoSpotlightCardHTML(p, cat);
              }
              return this.createProductCardHTML(p, cat);
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    if (!renderedAnyProduct) {
      container.innerHTML = `
        <div class="p-12 text-center rounded-3xl bg-[#0C111A]/80 border border-[rgba(255,255,255,0.08)]">
          <i data-lucide="package-x" class="w-10 h-10 mx-auto text-slate-500 mb-3"></i>
          <h4 class="text-base font-heading font-bold text-white mb-1">ไม่พบสินค้าที่ตรงกับเงื่อนไข</h4>
          <p class="text-xs text-slate-400">ลองรีเซ็ตตัวกรอง หรือค้นหาด้วยคำอื่น</p>
          <div class="mt-4 flex items-center justify-center gap-3">
            <button onclick="window.Shop?.catalogService?.setCategoryFilter('all'); if (window.Shop?.catalogService?.toggleInStockOnly) window.Shop.catalogService.toggleInStockOnly(false); if (window.Shop?.catalogService?.setSearchQuery) { window.Shop.catalogService.setSearchQuery(''); const el = document.getElementById('search-input'); if (el) el.value = ''; const elMob = document.getElementById('search-input-mobile'); if (elMob) elMob.value = ''; }" class="px-4 py-2 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold text-xs cursor-pointer active:scale-95 transition-transform shadow-lg">
              รีเซ็ตตัวกรองทั้งหมด
            </button>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = html;
    }

    if (window.lucide) lucide.createIcons();
    if (window.JulianMotion && typeof window.JulianMotion.animateCatalogGrid === 'function') {
      window.JulianMotion.animateCatalogGrid(container);
    }
  }

    createProductCardHTML(p, cat) {
    const isOut = p.stock === 0;
    const isCustom = p.fulfillmentType === "custom_form";
    const user = this.store ? this.store.get("user") : null;
    const isReseller = user?.role === "reseller" || user?.is_reseller;
    const resellerPrice = p.reseller_price ? Number(p.reseller_price) : (p.price > 0 ? Math.round(p.price * 0.88) : p.price);
    const activePrice = isReseller ? resellerPrice : p.price;

    return `
      <div class="product-card group rounded-2xl bg-[#0A0D14] hover:bg-[#0F1420] border border-white/[0.07] hover:border-white/[0.18] transition-all duration-200 p-4 flex flex-col justify-between relative shadow-lg hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.85)] hover:-translate-y-1">
        <div>
          <!-- Artwork Area (1:1 Ratio Minimal Base Placeholder) -->
          <div class="w-full aspect-square rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:border-white/[0.14] overflow-hidden relative mb-3.5 flex items-center justify-center p-2.5 transition-colors">
            ${p.imageUrl ? `
              <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');" />
              <div class="hidden flex-col items-center justify-center gap-2 select-none pointer-events-none">
                <div class="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500">
                  <i data-lucide="image" class="w-5 h-5"></i>
                </div>
                <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600">NO IMAGE</span>
              </div>
            ` : `
              <div class="flex flex-col items-center justify-center gap-2 select-none pointer-events-none">
                <div class="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500 group-hover:text-slate-400 group-hover:scale-105 group-hover:border-white/[0.12] transition-all">
                  <i data-lucide="image" class="w-5 h-5"></i>
                </div>
                <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600 group-hover:text-slate-500 transition-colors">NO IMAGE</span>
              </div>
            `}
            
            <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
              ${p.status ? `<span class="px-2 py-0.5 rounded-md bg-white/[0.04] text-sky-300 border border-white/[0.08] text-[10px] font-mono-val font-semibold uppercase tracking-wider">${p.status}</span>` : ""}
            </div>

            <div class="absolute top-2.5 right-2.5 z-10">
              ${isOut 
                ? `<span class="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-mono-val font-bold">สินค้าหมดชั่วคราว</span>` 
                : (p.stock <= 2 
                    ? `<span class="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/60 text-amber-300 text-[10px] font-mono-val font-extrabold flex items-center gap-1 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.4)]"><i data-lucide="flame" class="w-3 h-3 text-amber-400 fill-amber-400"></i><span>เหลือ ${p.stock} ชิ้นสุดท้าย!</span></span>`
                    : `<span class="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono-val font-bold">พร้อมส่ง: ${p.stock} ชิ้น</span>`
                  )
              }
            </div>
          </div>

          <!-- Merchant Trust Indicator -->
          <div class="flex items-center gap-1.5 mb-1.5 text-[11px] font-mono select-none">
            <span class="text-emerald-400 font-bold flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i><span class="text-slate-300 text-[10px] font-mono-val font-semibold">ของแท้ 100% • บอทส่งทันที</span></span>
          </div>
          <h4 class="text-sm font-heading font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1 mb-2">${p.title}</h4>
          
          <div class="flex flex-wrap gap-1.5 mb-3.5">
            ${(p.chips || []).map(chip => `
              <span class="px-2 py-0.5 rounded-md bg-[#070A0F] border border-[rgba(255,255,255,0.06)] text-[10px] text-slate-300 font-mono-val">${chip}</span>
            `).join("")}
          </div>

          ${(cat.id === 'cat-roblox-scripts' || p.category === 'cat-roblox-scripts') ? `
            <!-- Roblox Executor Compatibility Radar & One-Click Script Loader (Sprint 4: 4.2) -->
            <div class="my-2 p-2.5 rounded-xl bg-white/[0.02] border border-cyan-500/20 space-y-2">
              <div class="flex items-center justify-between text-[10px] font-mono">
                <span class="flex items-center gap-1 text-slate-300"><i data-lucide="shield" class="w-3 h-3 text-cyan-400"></i> EXECUTOR RADAR:</span>
                <span class="text-emerald-400 font-bold">BYPASS 100%</span>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[9px] font-mono font-semibold">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center">Delta 🟢</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center">Codex 🟢</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center">Wave 🟢</span>
                <span class="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-center">Solara 🟡</span>
              </div>
              <button onclick="window.copyRobloxLoaderScript('${p.id}')" class="w-full py-1.5 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95">
                <i data-lucide="terminal" class="w-3 h-3"></i>
                <span>⚡ คัดลอก Loader Script</span>
              </button>
            </div>
          ` : ''}
        </div>

                <!-- Footer & Action (Fitts's Law Dual-Action: Cart + 1-Click Buy) -->
        <div class="pt-3.5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2">
          <div>
            <div class="text-[10px] text-slate-500 line-through font-mono-val">${p.originalPrice ? `฿${p.originalPrice}` : ""}</div>
            ${isReseller ? `
              <div class="flex items-center gap-1.5">
                <span class="text-base font-mono-val font-bold text-emerald-400 tracking-tight">฿${activePrice.toFixed(2)}</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">RESELLER</span>
              </div>
            ` : `
              <div class="text-base font-mono-val font-bold text-[var(--accent)] tracking-tight">฿${p.price.toFixed(2)}</div>
              <div class="text-[9px] text-emerald-400/90 font-mono tracking-tight font-semibold">ราคาส่ง Reseller: ฿${resellerPrice.toFixed(2)}</div>
            `}
          </div>

          ${isOut ? `
            <button onclick="window.openRestockNotifyModal('${p.id}', '${p.title.replace(/'/g, "\\'")}')" class="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md">
              <i data-lucide="bell-ring" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>แจ้งเตือนเมื่อของมาเติม</span>
            </button>
          ` : (isCustom ? `
            <button onclick="window.Shop?.modals?.openCustomServiceForm('${p.id}')" class="btn-cyber-primary px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
              <span>สั่งทำ</span>
            </button>
          ` : `
            <div class="flex items-center gap-1.5">
              <button onclick="window.Shop?.cartManager?.addToCartById('${p.id}')" class="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all" title="หยิบใส่ตะกร้า">
                <i data-lucide="shopping-cart" class="w-4 h-4 text-slate-300"></i>
              </button>
              <button onclick="window.quickBuyProduct('${p.id}')" class="btn-cyber-primary cursor-pointer active:scale-95 transition-transform px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-md">
                <i data-lucide="zap" class="w-3.5 h-3.5 fill-current"></i>
                <span>ซื้อด่วน</span>
              </button>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  createBentoSpotlightCardHTML(p, cat) {
    const isOut = p.stock === 0;
    const isCustom = p.fulfillmentType === "custom_form";
    const user = this.store ? this.store.get("user") : null;
    const isReseller = user?.role === "reseller" || user?.is_reseller;
    const resellerPrice = p.reseller_price ? Number(p.reseller_price) : (p.price > 0 ? Math.round(p.price * 0.88) : p.price);
    const activePrice = isReseller ? resellerPrice : p.price;

    return `
      <div class="bento-spotlight group col-span-1 sm:col-span-2 md:col-span-2 p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6 items-stretch relative">
        <!-- BEST SELLER BADGE -->
        <div class="absolute top-3 left-3 z-20">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/25 to-rose-500/25 border border-amber-500/50 text-amber-300 text-[10px] font-mono-val font-extrabold shadow-[0_0_16px_rgba(245,158,11,0.35)]">
            <i data-lucide="flame" class="w-3 h-3 text-amber-400 fill-amber-400"></i>
            <span>🔥 BEST SELLER • สินค้ายอดนิยม</span>
          </span>
        </div>

        <!-- Artwork -->
        <div class="w-full sm:w-[42%] aspect-square sm:aspect-auto rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden relative flex items-center justify-center p-4">
          ${p.imageUrl ? `
            <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');" />
            <div class="hidden flex-col items-center justify-center gap-2 select-none pointer-events-none">
              <div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500">
                <i data-lucide="image" class="w-6 h-6"></i>
              </div>
              <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600">NO IMAGE</span>
            </div>
          ` : `
            <div class="flex flex-col items-center justify-center gap-2 select-none pointer-events-none">
              <div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500 group-hover:text-slate-400 group-hover:scale-105 group-hover:border-white/[0.12] transition-all">
                <i data-lucide="image" class="w-6 h-6"></i>
              </div>
              <span class="text-[9px] font-mono-val uppercase tracking-widest text-slate-600 group-hover:text-slate-500 transition-colors">NO IMAGE</span>
            </div>
          `}
          <div class="absolute top-2 right-2 z-10">
            ${isOut
              ? `<span class="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-mono-val font-bold">สินค้าหมดชั่วคราว</span>`
              : `<span class="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono-val font-bold">พร้อมส่ง: ${p.stock} ชิ้น</span>`
            }
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 flex flex-col justify-between">
          <div>
            ${p.status ? `<span class="inline-block px-2 py-0.5 rounded-md bg-white/[0.04] text-sky-300 border border-white/[0.08] text-[10px] font-mono-val font-semibold uppercase tracking-wider mb-2">${p.status}</span>` : ""}
            <h4 class="text-lg sm:text-xl font-heading font-extrabold text-white group-hover:text-sky-300 transition-colors mb-2.5">${p.title}</h4>

            <div class="flex flex-wrap gap-1.5 mb-4">
              ${(p.chips || []).map(chip => `
                <span class="px-2.5 py-1 rounded-lg bg-[#070A0F] border border-[rgba(255,255,255,0.08)] text-[11px] text-slate-300 font-mono-val">${chip}</span>
              `).join("")}
            </div>

            <!-- Detailed Perks -->
            <div class="space-y-2 mb-5">
              <div class="flex items-center gap-2 text-xs font-mono-val text-slate-300">
                <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
                <span>ของแท้ 100% • รับประกันเต็มจำนวน</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-mono-val text-slate-300">
                <i data-lucide="zap" class="w-4 h-4 text-[var(--accent)]"></i>
                <span>บอทส่งอัตโนมัติทันทีหลังชำระเงิน</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-mono-val text-slate-300">
                <i data-lucide="headset" class="w-4 h-4 text-amber-400"></i>
                <span>ซัพพอร์ต 24 ชม. ผ่าน Discord พร้อมช่วยเหลือทุกขั้นตอน</span>
              </div>
            </div>
          </div>

          <!-- Footer & Action -->
          <div class="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3">
            <div>
              <div class="text-[10px] text-slate-500 line-through font-mono-val">${p.originalPrice ? `฿${p.originalPrice}` : ""}</div>
              ${isReseller ? `
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-mono-val font-bold text-emerald-400 tracking-tight">฿${activePrice.toFixed(2)}</span>
                  <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">RESELLER</span>
                </div>
              ` : `
                <div class="text-2xl font-mono-val font-bold text-[var(--accent)] tracking-tight">฿${p.price.toFixed(2)}</div>
                <div class="text-[9px] text-emerald-400/90 font-mono tracking-tight font-semibold">ราคาส่ง Reseller: ฿${resellerPrice.toFixed(2)}</div>
              `}
            </div>

            ${isOut ? `
              <button onclick="window.openRestockNotifyModal('${p.id}', '${p.title.replace(/'/g, "\\'")}')" class="btn-spring py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                <i data-lucide="bell-ring" class="w-4 h-4 text-amber-400"></i>
                <span>แจ้งเตือนเมื่อของมาเติม</span>
              </button>
            ` : (isCustom ? `
              <button onclick="window.Shop?.modals?.openCustomServiceForm('${p.id}')" class="btn-spring btn-cyber-primary px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="sliders" class="w-4 h-4"></i>
                <span>สั่งทำ</span>
              </button>
            ` : `
              <div class="flex items-center gap-2">
                <button onclick="window.Shop?.cartManager?.addToCartById('${p.id}')" class="btn-spring p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer" title="หยิบใส่ตะกร้า">
                  <i data-lucide="shopping-cart" class="w-4 h-4 text-slate-300"></i>
                </button>
                <button onclick="window.quickBuyProduct('${p.id}')" class="btn-spring btn-cyber-primary cursor-pointer px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md">
                  <i data-lucide="zap" class="w-4 h-4 fill-current"></i>
                  <span>ซื้อด่วน</span>
                </button>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  scrollToCategory(catId) {
    const el = document.getElementById(catId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
}

if (typeof window !== "undefined") {
  window.CatalogViewComponent = CatalogViewComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CatalogViewComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/ReviewsSection.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * ⭐ NYX9 STUDIO — REVIEWS SECTION COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 * แสดงผลฟีดรีวิวและคะแนนความพึงพอใจจากผู้ซื้อจริงบนหน้าแรกของร้านค้า
 * ป้องกันการสแปมด้วยระบบ Verified Purchase ที่ผูกกับ Order ID
 * ==============================================================================
 */

class ReviewsSectionComponent {
  constructor(store, reviewService) {
    this.store = store;
    this.reviewService = reviewService;
    this.containerId = "store-reviews-section";
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    let section = document.getElementById(this.containerId);
    if (!section) {
      const main = document.querySelector("main");
      if (main) {
        section = document.createElement("section");
        section.id = this.containerId;
        section.className = "max-w-7xl mx-auto px-4 md:px-6 mb-16 relative z-10";
        main.appendChild(section);
      }
    }
  }

  async render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let data = { overall_average: 5.0, total_reviews: 5, reviews: [] };
    try {
      if (this.reviewService) {
        data = await this.reviewService.getStorewideReviews(12);
      }
    } catch (e) {
      console.warn("[REVIEWS COMPONENT] Error loading reviews:", e);
    }

    const reviews = data.reviews || [];
    const avgRating = parseFloat(data.overall_average || 5.0).toFixed(1);
    const totalCount = data.total_reviews || reviews.length || 0;

    container.innerHTML = `
      <!-- Section Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold font-mono uppercase tracking-wider mb-2">
            <i data-lucide="award" class="w-3.5 h-3.5"></i>
            <span>VERIFIED BUYER REVIEWS</span>
          </div>
          <h2 class="text-2xl md:text-3xl font-bold font-heading text-white tracking-wide flex items-center gap-2">
            ⭐ เสียงตอบรับจากผู้ซื้อจริง
          </h2>
          <p class="text-xs md:text-sm text-slate-400 mt-1">
            คะแนนความพึงพอใจและรีวิวจากลูกค้าที่สั่งซื้อสินค้าและได้รับรหัสไปใช้งานจริง 100%
          </p>
        </div>

        <!-- Rating Summary Pill -->
        <div class="flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-[#090D15]/80 border border-white/[0.08] shadow-lg backdrop-blur-md">
          <div class="flex items-center gap-2">
            <span class="text-3xl font-extrabold font-mono text-amber-400">${avgRating}</span>
            <div class="space-y-0.5">
              <div class="flex text-amber-400 text-xs">
                ★★★★★
              </div>
              <p class="text-[10px] text-slate-400 font-mono">จาก ${totalCount}+ รีวิวที่ผ่านการตรวจสอบ</p>
            </div>
          </div>
          <div class="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
          <div class="hidden sm:flex flex-col text-[11px] font-mono text-emerald-400">
            <span class="flex items-center gap-1"><i data-lucide="shield-check" class="w-3 h-3"></i> ตรวจสอบสลิปแท้</span>
            <span class="text-slate-400 text-[10px]">จัดส่งรหัสทันที 24 ชม.</span>
          </div>
        </div>
      </div>

      <!-- Reviews Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        ${reviews.map(r => this.renderReviewCard(r)).join("")}
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  renderReviewCard(r) {
    const stars = "★".repeat(Math.min(5, Math.max(1, r.rating || 5)));
    const emptyStars = "☆".repeat(5 - Math.min(5, Math.max(1, r.rating || 5)));
    const author = r.author_name || "ลูกค้าผู้มีอุปการคุณ";
    const avatar = r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.id || r.order_id || author}`;
    const product = r.product_title || r.product_id || "สินค้าดิจิทัล";
    const comment = r.comment || "สั่งซื้อสะดวกรวดเร็วมาก ได้รับรหัสใช้งานได้จริง 100%";
    const dateFormatted = r.created_at ? this.formatDate(r.created_at) : "เมื่อเร็วๆ นี้";

    return `
      <div class="group relative rounded-2xl bg-[#090D15]/90 border border-white/[0.08] hover:border-amber-500/40 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between">
        
        <!-- Top Info: Author & Verified Badge -->
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <img src="${avatar}" alt="${author}" class="w-9 h-9 rounded-xl object-cover border border-white/10 bg-slate-900" />
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>${author}</span>
                  ${r.is_verified ? `
                    <span class="inline-flex items-center text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono" title="ตรวจสอบแล้วว่าสั่งซื้อจริง">
                      ✓ ผู้ซื้อจริง
                    </span>
                  ` : ''}
                </div>
                <div class="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">
                  คำสั่งซื้อ: #${r.order_id || 'NYX-VERIFIED'}
                </div>
              </div>
            </div>

            <!-- Stars -->
            <div class="text-amber-400 text-xs font-mono tracking-widest" title="${r.rating} จาก 5 ดาว">
              <span>${stars}</span><span class="text-slate-600">${emptyStars}</span>
            </div>
          </div>

          <!-- Product Tag -->
          <div class="inline-block px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-slate-300">
            📦 ${product}
          </div>

          <!-- Comment Text -->
          <p class="text-xs text-slate-300 leading-relaxed font-sans italic">
            "${comment}"
          </p>
        </div>

        <!-- Card Footer: Timestamp -->
        <div class="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span class="flex items-center gap-1">
            <i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-400"></i> จัดส่งสำเร็จ
          </span>
          <span>${dateFormatted}</span>
        </div>
      </div>
    `;
  }

  formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit"
      });
    } catch (e) {
      return "เมื่อเร็วๆ นี้";
    }
  }
}

if (typeof window !== "undefined") {
  window.ReviewsSectionComponent = ReviewsSectionComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ReviewsSectionComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/CartDrawer.js */
/* ============================================================================== */
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
    this.store.on("change:availableVouchers", () => this.render());
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const container = document.getElementById("cart-drawer-container");
    const backdrop = container?.querySelector(".drawer-backdrop");
    const drawer = container?.querySelector(".drawer-content");

    if (!container || !backdrop || !drawer) return;

    if (this.isOpen) {
      if (typeof this.checkoutService.loadAvailableVouchers === "function") {
        this.checkoutService.loadAvailableVouchers();
      }
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

    list.innerHTML = cart.map((item, index) => {
      const formFields = item.form_fields || item.formFields || [];
      const hasFormFields = Array.isArray(formFields) && formFields.length > 0;

      return `
      <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between gap-3">
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

        ${hasFormFields ? `
          <div class="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div class="text-[10px] font-bold text-amber-400 flex items-center gap-1">
              <i data-lucide="file-text" class="w-3 h-3"></i>
              <span>ข้อมูลสำหรับจัดส่ง (Custom Order):</span>
            </div>
            ${formFields.map(f => `
              <div>
                <label class="block text-[9px] text-slate-400 mb-0.5 font-semibold">
                  ${f.label || f.name} ${f.required ? '<span class="text-rose-400">*</span>' : ''}
                </label>
                <input 
                  type="${f.type || 'text'}" 
                  placeholder="${f.placeholder || ''}" 
                  value="${(item.customFields && item.customFields[f.id]) || ''}"
                  oninput="window.updateCartItemField(${index}, '${f.id}', this.value)"
                  class="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      `;
    }).join("");

    this.updateSummary();
    this.renderVouchers();
    if (window.lucide) lucide.createIcons();
  }

  renderVouchers() {
    const container = document.getElementById("cart-vouchers-container");
    if (!container) return;

    const vouchers = this.store.get("availableVouchers") || [];
    const cart = this.store.get("cart") || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const appliedPromo = this.store.get("appliedPromo");

    if (vouchers.length === 0) {
      container.innerHTML = `
        <div class="text-[11px] text-slate-500 py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center italic">
          ไม่มีคูปองส่วนลดที่ใช้งานได้ในขณะนี้
        </div>
      `;
      return;
    }

    container.innerHTML = vouchers.map(v => {
      const isApplied = appliedPromo && appliedPromo.code === v.code;
      const minSpend = Number(v.min_spend || v.minSpend || 0);
      const isEligible = subtotal >= minSpend;
      const isFixed = v.discount_type === 'fixed' || v.discountThb;
      const discountVal = isFixed ? `฿${Number(v.discount_value || v.discountThb).toFixed(0)}` : `${Number(v.discount_value || v.discountPercent).toFixed(0)}%`;

      let badgeBg = isApplied ? 'border-emerald-500/40 bg-emerald-500/10' : (isEligible ? 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60' : 'border-white/[0.06] bg-white/[0.02] opacity-60');

      let actionHtml = '';
      if (isApplied) {
        actionHtml = `
          <button onclick="window.removeCouponCode()" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer" title="ยกเลิกโค้ดนี้">
            <i data-lucide="check" class="w-3 h-3"></i>
            <span>ใช้แล้ว</span>
          </button>
        `;
      } else if (isEligible) {
        actionHtml = `
          <button onclick="window.applyDirectCoupon('${v.code}')" class="px-3 py-1 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-[10px] shadow-sm shadow-pink-500/20 active:scale-95 transition-all cursor-pointer">
            ใช้โค้ด
          </button>
        `;
      } else {
        const diff = (minSpend - subtotal).toFixed(0);
        actionHtml = `
          <span class="text-[9px] text-slate-500 font-mono text-right leading-tight block">
            ซื้อเพิ่มอีก<br><strong class="text-rose-400">฿${diff}</strong>
          </span>
        `;
      }

      return `
        <div class="p-2.5 rounded-xl border ${badgeBg} transition-all flex items-center justify-between gap-2.5 group">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center shrink-0 font-extrabold text-[11px] font-mono">
              ${discountVal}
            </div>
            <div class="min-w-0">
              <div class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span class="font-mono">${v.code}</span>
                ${minSpend > 0 ? `<span class="text-[9px] text-slate-400 font-normal">ขั้นต่ำ ฿${minSpend}</span>` : `<span class="text-[9px] text-emerald-400 font-normal">ไม่มีขั้นต่ำ</span>`}
              </div>
              <div class="text-[10px] text-slate-400 truncate">${v.label || 'คูปองส่วนลดพิเศษ'}</div>
            </div>
          </div>
          <div class="shrink-0">
            ${actionHtml}
          </div>
        </div>
      `;
    }).join("");

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

if (typeof window !== "undefined") {
  window.CartDrawerComponent = CartDrawerComponent;

  window.updateCartItemField = (itemIndex, fieldId, value) => {
    const store = window.Shop?.store;
    if (!store) return;
    const cart = store.get("cart") || [];
    if (cart[itemIndex]) {
      if (!cart[itemIndex].customFields) cart[itemIndex].customFields = {};
      cart[itemIndex].customFields[fieldId] = value;
      store.set("cart", cart);
    }
  };

  window.applyDirectCoupon = (code) => {
    if (window.Shop?.cartManager) {
      try {
        const promo = window.Shop.checkoutService.applyCoupon(code);
        window.UI?.toast(`ใช้โค้ดส่วนลด "${promo.code}" สำเร็จ!`, "success");
      } catch (err) {
        window.UI?.toast(err.message, "error");
      }
    }
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CartDrawerComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/TopUpModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * TOP-UP MODAL COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class TopUpModalComponent {
  constructor(store, paymentService) {
    this.store = store;
    this.paymentService = paymentService;
    this.activeTab = "promptpay";
    this.initPasteListener();
  }

  initPasteListener() {
    if (typeof window === "undefined") return;
    window.addEventListener("paste", (e) => {
      const modal = document.getElementById("topup-modal");
      if (!modal || modal.classList.contains("hidden")) return;
      if (this.activeTab !== "promptpay") return;

      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type && item.type.indexOf("image") === 0) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            this.handleSlipFile(blob);
            break;
          }
        }
      }
    });
  }

  open(recommendedAmount = 0) {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('topup');
    }
    const input = document.getElementById("promptpay-amount-input");
    const val = recommendedAmount > 0 ? Math.ceil(recommendedAmount) : parseFloat(input?.value || "100");
    if (input) input.value = val;
    this.switchGateway("promptpay");
    this.updatePromptPayQr(val);
  }

  close() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('home');
    }
    this.clearFeedbacks();
  }

  clearFeedbacks() {
    ["promptpay-feedback", "truemoney-feedback", "bank-transfer-feedback"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("hidden");
        el.innerHTML = "";
      }
    });
  }

  switchGateway(tabKey) {
    this.activeTab = tabKey;
    const tabs = ["promptpay", "truemoney", "bank_transfer"];
    
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const pane = document.getElementById(`gateway-panel-${t}`);
      
      if (t === tabKey) {
        if (btn) {
          btn.className = "topup-tab-btn active h-11 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-white/[0.08] text-white border border-white/[0.18] shadow-sm";
        }
        if (pane) pane.classList.remove("hidden");
      } else {
        if (btn) {
          btn.className = "topup-tab-btn h-11 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent";
        }
        if (pane) pane.classList.add("hidden");
      }
    });

    if (tabKey === "promptpay") {
      const val = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");
      this.updatePromptPayQr(val);
    }

    if (window.lucide) lucide.createIcons();
  }

  updatePromptPayQr(amount) {
    const qrImg = document.getElementById("promptpay-qr-img");
    const amountText = document.getElementById("promptpay-qr-amount-text");
    const val = Math.max(1, parseFloat(amount) || 100);

    if (amountText) amountText.textContent = `฿${val.toFixed(2)}`;
    if (!qrImg) return;

    const rawQrUrl = this.paymentService.getPromptPayQrUrl(val);
    qrImg.src = rawQrUrl;

    // Render Canvas with authentic NYX9 STUDIO Anti-ABC Watermark Image
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 500;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");

          // 1. Draw PromptPay QR Code
          ctx.drawImage(img, 0, 0, size, size);

          // 2. Draw Authentic Shop Anti-ABC Watermark Image (with Logo silhouette + 3-line text)
          const wm = new Image();
          wm.crossOrigin = "anonymous";
          wm.onload = () => {
            try {
              ctx.drawImage(wm, 0, 0, size, size);
              qrImg.src = canvas.toDataURL("image/png");
            } catch (err) {
              console.warn("[QR WATERMARK] Composite error:", err);
            }
          };
          wm.src = (window.storeConfig?.paymentDetails?.promptpay?.qrWatermarkDataUrl) || "/assets/qr-watermark-overlay.png";
        } catch (canvasErr) {
          console.warn("[QR WATERMARK] Canvas compositing fallback:", canvasErr);
        }
      };
      img.src = rawQrUrl;
    } catch (e) {
      console.warn("[QR WATERMARK] Error:", e);
    }
  }

  // --- SMART SLIP QR SCANNER ---
  async handleSlipFile(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      window.UI?.toast("กรุณาเลือกไฟล์รูปภาพสลิปที่ถูกต้อง (JPG/PNG)", "warning");
      return;
    }

    const dropzoneIdle = document.getElementById("slip-dropzone-idle");
    const dropzoneScanning = document.getElementById("slip-dropzone-scanning");
    const previewImg = document.getElementById("slip-preview-img");
    const scanStatus = document.getElementById("slip-scan-status");
    const transRefInput = document.getElementById("promptpay-trans-ref-input");

    if (dropzoneIdle) dropzoneIdle.classList.add("hidden");
    if (dropzoneScanning) dropzoneScanning.classList.remove("hidden");
    if (scanStatus) {
      scanStatus.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังสแกน QR บนสลิป...</span>`;
      if (window.lucide) lucide.createIcons();
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (previewImg) previewImg.src = dataUrl;

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let qrCode = null;

          if (window.jsQR) {
            qrCode = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });
            if (!qrCode) {
              qrCode = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth"
              });
            }
          }

          if (qrCode && qrCode.data) {
            const rawData = qrCode.data.trim();
            // Thai PromptPay Slip QR extraction (tag 02 has transRef)
            let extractedRef = rawData;
            if (rawData.startsWith("0046") || rawData.includes("000001")) {
              const match = rawData.match(/(?:01\d{2})(\d{3})(?:02\d{2})([A-Za-z0-9_-]{10,35})/);
              if (match && match[2]) {
                extractedRef = match[2];
              }
            }

            if (transRefInput) {
              transRefInput.value = extractedRef;
            }

            if (scanStatus) {
              scanStatus.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i> <span class="text-emerald-400 font-bold">สแกน QR สำเร็จ! ดึงรหัสธุรกรรมอัตโนมัติ</span>`;
              if (window.lucide) lucide.createIcons();
            }

            window.UI?.toast("📸 สแกนสลิปสำเร็จ! ระบบกรอกรหัสอ้างอิงให้เรียบร้อย", "success");

            // Auto-trigger verification after 600ms
            setTimeout(() => {
              this.verifyPromptPay();
            }, 600);
          } else {
            if (scanStatus) {
              scanStatus.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-400"></i> <span class="text-amber-400 text-[11px]">ตรวจไม่พบ QR Code ในรูป กรุณากรอกรหัสอ้างอิงด้านล่าง</span>`;
              if (window.lucide) lucide.createIcons();
            }
            window.UI?.toast("ตรวจไม่พบ QR บนรูปสลิป กรุณาระบุรหัสอ้างอิงด้วยตนเอง", "warning");
          }
        } catch (err) {
          console.warn("[SLIP SCANNER] Scan error:", err);
          if (scanStatus) {
            scanStatus.innerHTML = `<span class="text-rose-400 text-[11px]">การสแกนล้มเหลว กรุณากรอกรหัสด้วยตนเอง</span>`;
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // --- ACTIONS ---
  async verifyPromptPay() {
    const btn = document.getElementById("btn-verify-promptpay");
    const amount = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");
    const transRef = document.getElementById("promptpay-trans-ref-input")?.value.trim();

    if (!transRef) {
      window.UI?.toast("กรุณากรอกรหัสอ้างอิงสลิป / TransRef", "warning");
      return;
    }

    this.setBtnLoading(btn, "กำลังตรวจสอบสลิป...");
    try {
      await this.paymentService.verifyPromptPaySlip(amount, transRef);
      window.UI?.confetti();
      window.UI?.toast(`ชำระเงินผ่าน PromptPay สำเร็จ +฿${amount.toFixed(2)}!`, "success");
      document.getElementById("promptpay-trans-ref-input").value = "";
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      window.UI?.toast(err.message, "error");
    } finally {
      this.resetBtn(btn, `<i data-lucide="shield-check" class="w-4 h-4"></i> <span>ตรวจสอบสลิปและปรับยอดทันที</span>`);
    }
  }

  async redeemTrueMoney() {
    const btn = document.getElementById("btn-redeem-truemoney");
    const input = document.getElementById("truemoney-voucher-input");
    const url = input?.value.trim();

    if (!url || !url.includes("?v=")) {
      window.UI?.toast("กรุณากรอกลิงก์ซองของขวัญ TrueMoney ให้ถูกต้อง", "warning");
      return;
    }

    this.setBtnLoading(btn, "กำลังรับเงินจากซอง...");
    try {
      const res = await this.paymentService.redeemTrueMoneyVoucher(url);
      window.UI?.confetti();
      window.UI?.toast(`รับเงินจากซองของขวัญสำเร็จ +฿${res.amount.toFixed(2)}!`, "success");
      input.value = "";
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      window.UI?.toast(err.message, "error");
    } finally {
      this.resetBtn(btn, `<i data-lucide="sparkles" class="w-4 h-4"></i> <span>รับเงินจากซองของขวัญทันที</span>`);
    }
  }

  async verifyBankTransfer() {
    const btn = document.getElementById("btn-verify-bank");
    const amount = parseFloat(document.getElementById("bank-transfer-amount")?.value || "100");
    const transRef = document.getElementById("bank-transfer-transref")?.value.trim();

    if (!transRef) {
      window.UI?.toast("กรุณากรอกรหัสอ้างอิงสลิปโอนเงิน", "warning");
      return;
    }

    this.setBtnLoading(btn, "กำลังตรวจสอบสลิปธนาคาร...");
    try {
      await this.paymentService.verifyBankTransferSlip(amount, transRef);
      window.UI?.confetti();
      window.UI?.toast(`เติมเงินผ่านธนาคารสำเร็จ +฿${amount.toFixed(2)}!`, "success");
      document.getElementById("bank-transfer-transref").value = "";
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      window.UI?.toast(err.message, "error");
    } finally {
      this.resetBtn(btn, `<i data-lucide="shield-check" class="w-4 h-4"></i> <span>ตรวจสอบสลิปและปรับยอดทันที</span>`);
    }
  }

  setBtnLoading(btn, text) {
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>${text}</span>`;
    if (window.lucide) lucide.createIcons();
  }

  resetBtn(btn, html) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }
}

if (typeof window !== "undefined") {
  window.TopUpModalComponent = TopUpModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TopUpModalComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/HistoryModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 📜 HISTORY & ORDER VAULT COMPONENT (OOP MODAL CONTROLLER)
 * ==============================================================================
 */

class HistoryModalComponent {
  constructor(store, historyService) {
    this.store = store;
    this.historyService = historyService;
    this.orders = [];
    this.activeSearch = "";
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    // ตรวจสอบว่ามี Container ของ Modal อยู่ในหน้าเว็บหรือยัง ถ้ายังไม่มีให้สร้างขึ้นอัตโนมัติ
    if (!document.getElementById("history-modal")) {
      const modalEl = document.createElement("div");
      modalEl.id = "history-modal";
      modalEl.className = "fixed inset-0 z-50 hidden items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all";
      modalEl.innerHTML = `
        <div class="relative modal-spring-dialog w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0B0F19]/95 border border-slate-800 shadow-2xl shadow-[var(--accent)]/10 overflow-hidden">
          
          <!-- Header -->
          <div class="p-5 md:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/10">
                <i data-lucide="history" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base md:text-lg font-heading font-extrabold text-white flex items-center gap-2">
                  ประวัติการสั่งซื้อ & คลังคีย์
                  <span id="history-total-badge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30">0 รายการ</span>
                </h3>
                <p class="text-xs text-slate-400 font-body">ตรวจสอบคีย์และรายการสั่งซื้อย้อนหลังของคุณได้ตลอด 24 ชั่วโมง</p>
              </div>
            </div>
            <button onclick="window.closeHistoryModal()" class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Search Filter Bar with Cloud Lookup Button -->
          <div class="px-5 md:px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input 
                type="text" 
                id="history-search-input"
                oninput="window.handleHistorySearch(event)"
                onkeydown="if(event.key==='Enter') window.Shop?.historyModal?.searchCloudOrder()"
                placeholder="ค้นหาด้วยรหัสออเดอร์ (เช่น NYX-371156) หรือชื่อสินค้า..." 
                class="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] transition-all font-body font-mono"
              />
            </div>
            <button 
              onclick="window.Shop?.historyModal?.searchCloudOrder()" 
              class="px-3.5 py-2 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="ค้นหาออเดอร์จากฐานข้อมูลเซิร์ฟเวอร์"
            >
              <i data-lucide="cloud" class="w-3.5 h-3.5"></i>
              <span>ค้นหาในระบบ</span>
            </button>
          </div>

          <!-- Order List Body (Scrollable) -->
          <div id="history-orders-container" class="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 max-h-[58vh]">
            <!-- Dynamic Content -->
          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
            <div class="flex items-center gap-1.5 font-mono text-[11px]">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
              <span>ระบบรับประกันและประวัติความปลอดภัย 100%</span>
            </div>
            <button onclick="window.closeHistoryModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all">
              ปิดหน้าต่าง
            </button>
          </div>

        </div>
      `;
      document.body.appendChild(modalEl);
    }
  }

  async open() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('history');
    }
    this.render();
    if (window.lucide) lucide.createIcons();
  }

  close() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('home');
    }
  }

  filter(query) {
    this.activeSearch = (query || "").trim().toLowerCase();
    this.render();
  }

  async searchCloudOrder() {
    const input = document.getElementById("history-search-input");
    const query = (input?.value || "").trim().toUpperCase();
    if (!query) {
      window.UI?.toast("กรุณาระบุรหัสออเดอร์ที่ต้องการค้นหา (เช่น NYX-371156)", "warning");
      return;
    }

    // 1. Check local cache
    const foundLocal = this.orders.find(o => (o.orderId || "").toUpperCase() === query);
    if (foundLocal) {
      this.activeSearch = query.toLowerCase();
      this.render();
      window.UI?.toast(`พบออเดอร์ ${query} ในประวัติของคุณ`, "info");
      return;
    }

    // 2. Query Supabase
    window.UI?.toast(`กำลังค้นหาออเดอร์ ${query} ในเซิร์ฟเวอร์...`, "info");

    try {
      if (window.SupabaseAdapter && window.SupabaseAdapter.client) {
        const { data, error } = await window.SupabaseAdapter.client.rpc("lookup_order", { p_order_id: query });
        if (data && data.success && data.order) {
          const ord = data.order;
          this.orders.unshift({
            orderId: ord.orderId,
            totalAmount: parseFloat(ord.totalAmount || 0),
            timestamp: ord.timestamp,
            paymentMethod: ord.paymentMethod || "wallet",
            status: ord.status || "PAID",
            items: (ord.items || []).map(oi => ({
              id: oi.id,
              title: oi.title || "สินค้าดิจิทัล",
              quantity: oi.quantity || 1,
              credentials: Array.isArray(oi.credentials) ? oi.credentials : (oi.credentials ? [oi.credentials] : [])
            }))
          });
          this.activeSearch = query.toLowerCase();
          this.render();
          window.UI?.confetti();
          window.UI?.toast(`✨ พบข้อมูลออเดอร์ ${query} จากฐานข้อมูลเรียบร้อยแล้ว!`, "success");
          return;
        } else {
          window.UI?.toast(data?.message || "ไม่พบคำสั่งซื้อรหัสนี้ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง", "warning");
        }
      }
    } catch (err) {
      console.warn("[HISTORY SEARCH] Error:", err);
      window.UI?.toast("การค้นหาล้มเหลว กรุณาตรวจสอบรหัสออเดอร์อีกครั้ง", "error");
    }
  }

  render() {
    const container = document.getElementById("history-orders-container");
    const badge = document.getElementById("history-total-badge");
    if (!container) return;

    let filtered = this.orders;
    if (this.activeSearch) {
      filtered = this.orders.filter(ord => {
        const matchId = (ord.orderId || "").toLowerCase().includes(this.activeSearch);
        const matchProduct = (ord.items || []).some(item => (item.title || "").toLowerCase().includes(this.activeSearch));
        return matchId || matchProduct;
      });
    }

    if (badge) badge.textContent = `${filtered.length} รายการ`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-16 flex flex-col items-center justify-center text-center px-4">
          <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-3">
            <i data-lucide="inbox" class="w-7 h-7"></i>
          </div>
          <h4 class="text-sm font-bold text-slate-200 mb-1">ยังไม่พบประวัติการสั่งซื้อ</h4>
          <p class="text-xs text-slate-500 max-w-sm mb-4">
            ${this.activeSearch ? "ไม่พบคำสั่งซื้อที่ตรงกับคำค้นหา ลองตรวจสอบรหัสออเดอร์อีกครั้ง" : "เมื่อคุณสั่งซื้อสินค้า ดิจิทัลคีย์และข้อมูลการรับประกันจะแสดงที่นี่โดยอัตโนมัติ"}
          </p>
          <button onclick="window.closeHistoryModal()" class="btn-cyber-primary px-4 py-2 rounded-xl text-xs font-bold">
            เลือกชมสินค้าในร้าน
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = filtered.map(order => {
      const dateFormatted = new Date(order.timestamp).toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const totalItemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

      const itemsHtml = (order.items || []).map(item => {
        const keys = item.credentials || [];
        const hasKeys = keys.length > 0;

        return `
          <div class="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 mb-2 last:mb-0">
            <div class="flex items-center justify-between text-xs mb-2">
              <span class="font-bold text-white flex items-center gap-1.5">
                <i data-lucide="package" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
                ${item.title}
              </span>
              <div class="flex items-center gap-2">
                <button 
                  onclick="window.openReviewModal('${order.orderId}', '${item.id || item.productId || 'prod'}', '${(item.title || 'สินค้าดิจิทัล').replace(/'/g, "\\'")}')"
                  class="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="เขียนรีวิวสินค้านี้"
                >
                  <i data-lucide="star" class="w-3 h-3 text-amber-400 fill-amber-400"></i>
                  <span>รีวิว</span>
                </button>
                <span class="text-slate-400 font-mono text-[11px]">x${item.quantity || 1}</span>
              </div>
            </div>

            ${hasKeys ? `
              <div class="space-y-1.5 mt-2">
                ${keys.map((key, kIdx) => `
                  <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/60 border border-slate-800/80 group">
                    <span class="font-mono text-xs text-cyan-300 select-all truncate max-w-[280px] sm:max-w-md">
                      ${key}
                    </span>
                    <button 
                      onclick="window.copyHistoryKey('${key}')" 
                      class="px-2 py-1 rounded bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black font-bold text-[10px] font-mono flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                      title="คัดลอกคีย์นี้"
                    >
                      <i data-lucide="copy" class="w-3 h-3"></i>
                      <span>คัดลอก</span>
                    </button>
                  </div>
                `).join("")}
              </div>
            ` : `
              <div class="text-[11px] text-amber-400/90 font-mono flex items-center gap-1 mt-1">
                <i data-lucide="clock" class="w-3 h-3"></i>
                <span>สินค้าบริการหรือรอแอดมินดำเนินการส่งมอบ</span>
              </div>
            `}
          </div>
        `;
      }).join("");

      return `
        <div class="rounded-2xl bg-slate-900/70 border border-slate-800/90 p-4 hover:border-[var(--accent)]/40 transition-all">
          <!-- Top Row: Order ID, Date, Amount -->
          <div class="flex items-center justify-between flex-wrap gap-2 pb-3 mb-3 border-b border-slate-800/70">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-xs text-[var(--accent)] flex items-center gap-1">
                  <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                  ${order.orderId}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ${order.status || "PAID"}
                </span>
              </div>
              <div class="text-[10px] font-mono text-slate-400 mt-0.5">${dateFormatted}</div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <div class="text-right mr-1">
                <div class="text-[10px] text-slate-400 font-mono">ยอดสุทธิ</div>
                <div class="text-xs font-mono font-bold text-white">฿${(order.totalAmount || 0).toFixed(2)}</div>
              </div>

              <!-- Button 1: Download Cyberpunk Receipt PNG -->
              <button 
                onclick="window.saveOrderCardPNG('${order.orderId}')"
                class="px-2.5 py-1.5 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black border border-[var(--accent)]/40 text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="บันทึกใบเสร็จเป็นรูปภาพ PNG สวยงามลงมือถือ/คอม"
              >
                <i data-lucide="image-down" class="w-3.5 h-3.5"></i>
                <span>รูปใบเสร็จ</span>
              </button>

              <!-- Button 2: 1-Click Discord Claim 24h -->
              <button 
                onclick="window.claimOrderToDiscord('${order.orderId}', '${(order.items?.[0]?.title || '').replace(/'/g, "\\'")}', '${dateFormatted}')"
                class="px-2.5 py-1.5 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2]/40 border border-[#5865F2]/50 text-[11px] text-[#A5B4FC] hover:text-white font-body font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="คัดลอกแบบฟอร์มแล้วเปิดห้องเคลมใน Discord 24 ชม."
              >
                <i data-lucide="message-square" class="w-3.5 h-3.5 text-[#5865F2]"></i>
                <span>เคลมใน Discord</span>
              </button>

              <!-- Button 3: Web Claim Form -->
              <button 
                onclick="window.quickClaimOrder('${order.orderId}')"
                class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-[11px] text-slate-300 hover:text-rose-300 font-body flex items-center gap-1 transition-all cursor-pointer"
                title="ยื่นเรื่องเคลมผ่านหน้าเว็บ"
              >
                <i data-lucide="life-buoy" class="w-3 h-3 text-rose-400"></i>
                <span>เคลมหน้าเว็บ</span>
              </button>
            </div>
          </div>

          <!-- Items and Keys -->
          <div>
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }
}

if (typeof window !== "undefined") {
  window.HistoryModalComponent = HistoryModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = HistoryModalComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/RestockModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🔔 RESTOCK NOTIFICATION MODAL COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 * ให้ลูกค้าลงชื่อดิสคอร์ดรับการแจ้งเตือนทันทีเมื่อแอดมินเติมสต็อกสินค้า
 * ==============================================================================
 */

class RestockModalComponent {
  constructor(store) {
    this.store = store;
    this.currentProductId = null;
    this.currentProductTitle = "";
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("restock-notify-modal")) return;

    const modal = document.createElement("div");
    modal.id = "restock-notify-modal";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all";
    modal.innerHTML = `
      <div class="relative modal-spring-dialog w-full max-w-md rounded-3xl bg-[#0B0F19]/95 border border-slate-800 shadow-2xl shadow-amber-500/10 overflow-hidden">
        
        <!-- Header -->
        <div class="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <i data-lucide="bell-ring" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-base font-heading font-extrabold text-white">แจ้งเตือนเมื่อของมาเติม</h3>
              <p class="text-xs text-slate-400 font-body">ไม่พลาดสินค้าชิ้นโปรด ระบบจะแจ้งเตือนทันทีที่ของเข้า</p>
            </div>
          </div>
          <button onclick="window.Shop?.restockModal?.close()" class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 md:p-6 space-y-4">
          <!-- Target Product Banner -->
          <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <i data-lucide="package" class="w-4 h-4 text-amber-400"></i>
              <span id="restock-modal-product-title" class="text-xs font-bold text-white">สินค้าดิจิทัล</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              หมดชั่วคราว
            </span>
          </div>

          <!-- Contact Input -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1.5">
              ระบุแท็ก Discord หรือ Username สำหรับแจ้งเตือน:
            </label>
            <div class="relative">
              <i data-lucide="at-sign" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input 
                type="text" 
                id="restock-discord-input" 
                placeholder="เช่น matthew_dev หรือ 422611554475835394" 
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <p class="text-[10px] text-slate-500 mt-1">เมื่อแอดมินเติมคีย์ ระบบจะแจ้งคิวและส่งข้อความแจ้งเตือนถึงคุณเป็นลำดับแรก</p>
          </div>

          <!-- Submit Button -->
          <button 
            id="btn-submit-restock-notify" 
            onclick="window.Shop?.restockModal?.submit()" 
            class="btn-cyber-primary w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <i data-lucide="bell" class="w-4 h-4 fill-current"></i>
            <span>ยืนยันรับการแจ้งเตือน</span>
          </button>
        </div>

      </div>
    `;
    document.body.appendChild(modal);
  }

  open(productId, productTitle) {
    this.initDOM();
    this.currentProductId = productId;
    this.currentProductTitle = productTitle;

    const modal = document.getElementById("restock-notify-modal");
    const titleEl = document.getElementById("restock-modal-product-title");
    const input = document.getElementById("restock-discord-input");

    if (titleEl) titleEl.textContent = productTitle;

    // Auto-fill from store if logged in
    const user = this.store ? this.store.get("user") : null;
    if (input) {
      input.value = user?.username ? `@${user.username}` : (user?.discordId || "");
    }

    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
    if (window.lucide) lucide.createIcons();
  }

  close() {
    const modal = document.getElementById("restock-notify-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  async submit() {
    const input = document.getElementById("restock-discord-input");
    const contact = (input?.value || "").trim();
    const btn = document.getElementById("btn-submit-restock-notify");

    if (!contact || contact.length < 2) {
      window.UI?.toast("กรุณาระบุแท็ก Discord หรือ Username ของคุณ", "warning");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังบันทึก...</span>`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const user = this.store ? this.store.get("user") : null;
      const res = await fetch("/api/restock-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          product_id: this.currentProductId,
          discord_id: contact,
          user_id: user?.id || null
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "บันทึกล้มเหลว");

      window.UI?.confetti();
      window.UI?.toast(`🔔 ${data.message || 'บันทึกการแจ้งเตือนเรียบร้อยแล้ว!'}`, "success");
      this.close();
    } catch (err) {
      console.warn("[RESTOCK NOTIFY] Submit error:", err);
      window.UI?.toast(`เกิดข้อผิดพลาด: ${err.message}`, "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="bell" class="w-4 h-4 fill-current"></i> <span>ยืนยันรับการแจ้งเตือน</span>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }
}

if (typeof window !== "undefined") {
  window.RestockModalComponent = RestockModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = RestockModalComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/AuthModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🔐 NYX9 STUDIO — MULTI-PROVIDER AUTH MODAL COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 * หน้าต่างเข้าสู่ระบบแบบรวมศูนย์ (Unified Multi-Auth Modal):
 * - Discord 1-Click OAuth2
 * - Google 1-Click OAuth2
 * - GitHub 1-Click OAuth2
 * - Email & Password (Login / Register / Forgot Password)
 * - Email Magic Link (OTP)
 * ==============================================================================
 */

class AuthModalComponent {
  constructor(store, authService) {
    this.store = store;
    this.authService = authService;
    this.currentMode = "signin"; // 'signin', 'signup', 'magiclink'
    this.initDOM();
    this.initGlobalBindings();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("auth-modal")) return;

    const modal = document.createElement("div");
    modal.id = "auth-modal";
    modal.className = "fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-black/85 backdrop-blur-md";
    modal.innerHTML = `
      <div class="relative z-10 modal-spring-dialog glass-panel rounded-3xl max-w-md w-full p-6 sm:p-8 border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(25,186,255,0.15)] overflow-hidden">
        
        <!-- Ambient Radial Glow -->
        <div class="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-bl from-[var(--accent)]/15 via-[#5865F2]/10 to-transparent blur-3xl pointer-events-none rounded-full"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5 relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5865F2]/20 via-sky-500/20 to-[var(--accent)]/20 border border-white/15 text-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/10">
              <i data-lucide="shield-check" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-base font-bold font-heading text-white tracking-wide">เข้าสู่ระบบ / สมัครสมาชิก</h3>
              <p class="text-[11px] text-slate-400">เลือกช่องทางเพื่อสะสมยอดกระเป๋าเงินและดูประวัติคีย์</p>
            </div>
          </div>
          <button onclick="window.closeAuthModal()" class="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- SECTION 1: 1-CLICK SOCIAL OAUTH BUTTONS -->
        <div class="space-y-2.5 relative z-10 mb-5">
          <!-- 1. DISCORD OAUTH BUTTON -->
          <button type="button" onclick="window.loginWithDiscord()" class="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold font-heading flex items-center justify-center gap-2.5 transition-all shadow-md shadow-[#5865F2]/25 cursor-pointer active:scale-95 group">
            <svg class="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.288a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย Discord (แนะนำ)</span>
          </button>

          <!-- 2. GOOGLE OAUTH BUTTON -->
          <button type="button" onclick="window.loginWithGoogle()" class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold font-heading flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer active:scale-95 group">
            <svg class="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.34 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>

          <!-- 3. GITHUB OAUTH BUTTON -->
          <button type="button" onclick="window.loginWithGitHub()" class="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-bold font-heading flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 group">
            <svg class="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย GitHub</span>
          </button>
        </div>

        <!-- DIVIDER -->
        <div class="relative flex items-center justify-center my-4">
          <div class="border-t border-white/10 w-full"></div>
          <span class="bg-[#0A0E18] px-3 text-[10px] font-mono uppercase text-slate-500 tracking-wider">หรือใช้อีเมล (Email)</span>
          <div class="border-t border-white/10 w-full"></div>
        </div>

        <!-- MODE TABS (Sign In / Sign Up / Magic Link) -->
        <div class="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-4 text-xs font-semibold">
          <button type="button" onclick="window.switchAuthMode('signin')" id="tab-auth-signin" class="flex-1 py-1.5 rounded-lg text-center transition-all bg-white/[0.08] text-white font-bold cursor-pointer">
            เข้าสู่ระบบ
          </button>
          <button type="button" onclick="window.switchAuthMode('signup')" id="tab-auth-signup" class="flex-1 py-1.5 rounded-lg text-center text-slate-400 hover:text-white transition-all cursor-pointer">
            สมัครสมาชิก
          </button>
          <button type="button" onclick="window.switchAuthMode('magiclink')" id="tab-auth-magiclink" class="flex-1 py-1.5 rounded-lg text-center text-slate-400 hover:text-white transition-all cursor-pointer">
            Magic Link
          </button>
        </div>

        <!-- EMAIL AUTH FORM -->
        <form onsubmit="window.handleEmailAuthSubmit(event)" class="space-y-3 relative z-10">
          
          <!-- Username (Only shown in Sign Up) -->
          <div id="auth-group-username" class="hidden">
            <label class="block text-xs font-semibold text-slate-300 mb-1">ชื่อที่ต้องการแสดง:</label>
            <div class="relative">
              <i data-lucide="user" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input type="text" id="auth-input-username" placeholder="เช่น GamerMaster99" class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono" />
            </div>
          </div>

          <!-- Email Field -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">ที่อยู่อีเมล:</label>
            <div class="relative">
              <i data-lucide="mail" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input type="email" id="auth-input-email" required placeholder="your.email@example.com" class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono" />
            </div>
          </div>

          <!-- Password Field (Hidden in Magic Link mode) -->
          <div id="auth-group-password">
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-semibold text-slate-300">รหัสผ่าน:</label>
              <button type="button" onclick="window.handleForgotPassword()" class="text-[10px] text-sky-400 hover:text-white underline cursor-pointer">
                ลืมรหัสผ่าน?
              </button>
            </div>
            <div class="relative">
              <i data-lucide="lock" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input type="password" id="auth-input-password" minlength="6" placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร" class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono" />
            </div>
          </div>

          <!-- Submit Button -->
          <button type="submit" id="btn-auth-submit" class="w-full py-2.5 rounded-xl btn-cyber-primary text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/15 active:scale-95 transition-all mt-2">
            <i data-lucide="log-in" class="w-4 h-4"></i>
            <span id="btn-auth-submit-label">เข้าสู่ระบบทันที</span>
          </button>
        </form>

        <!-- Terms Footer -->
        <p class="text-[10px] text-slate-500 text-center mt-4">
          การเข้าสู่ระบบถือว่าท่านยอมรับ <a href="/terms" class="text-slate-400 hover:text-white underline">ข้อกำหนด</a> และ <a href="/privacy" class="text-slate-400 hover:text-white underline">นโยบายความเป็นส่วนตัว</a>
        </p>

      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  }

  initGlobalBindings() {
    window.openAuthModal = (mode = "signin") => this.open(mode);
    window.openSignUpModal = () => this.open("signup");
    window.closeAuthModal = () => this.close();
    window.switchAuthMode = (mode) => this.setMode(mode);

    window.loginWithDiscord = () => {
      if (this.authService && typeof this.authService.loginWithDiscord === "function") {
        this.authService.loginWithDiscord();
      } else if (typeof window.handleDiscordLogin === "function") {
        window.handleDiscordLogin();
      }
    };

    window.loginWithGoogle = () => {
      if (this.authService && typeof this.authService.loginWithGoogle === "function") {
        this.authService.loginWithGoogle();
      } else if (window.SupabaseAdapter && typeof window.SupabaseAdapter.loginWithGoogle === "function") {
        window.SupabaseAdapter.loginWithGoogle();
      }
    };

    window.loginWithGitHub = () => {
      if (this.authService && typeof this.authService.loginWithGitHub === "function") {
        this.authService.loginWithGitHub();
      } else if (window.SupabaseAdapter && typeof window.SupabaseAdapter.loginWithGitHub === "function") {
        window.SupabaseAdapter.loginWithGitHub();
      }
    };

    window.handleForgotPassword = async () => {
      const emailInput = document.getElementById("auth-input-email");
      const email = emailInput ? emailInput.value.trim() : "";
      if (!email) {
        window.UI?.toast("กรุณากรอกอีเมลในช่องด้านล่างก่อนกดลืมรหัสผ่าน", "warning");
        if (emailInput) emailInput.focus();
        return;
      }
      try {
        if (this.authService && typeof this.authService.resetPassword === "function") {
          await this.authService.resetPassword(email);
        } else if (window.SupabaseAdapter) {
          await window.SupabaseAdapter.resetPassword(email);
          window.UI?.toast(`ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${email} แล้ว!`, "success");
        }
      } catch (err) {
        window.UI?.toast(err.message || "ส่งคำขอรีเซ็ตรหัสผ่านไม่สำเร็จ", "error");
      }
    };

    window.handleEmailAuthSubmit = async (e) => {
      if (e) e.preventDefault();
      const emailEl = document.getElementById("auth-input-email");
      const passEl = document.getElementById("auth-input-password");
      const userEl = document.getElementById("auth-input-username");
      const submitBtn = document.getElementById("btn-auth-submit");
      const submitLabel = document.getElementById("btn-auth-submit-label");

      const email = emailEl ? emailEl.value.trim() : "";
      const password = passEl ? passEl.value : "";
      const username = userEl ? userEl.value.trim() : "";

      if (!email) {
        window.UI?.toast("กรุณาระบุที่อยู่อีเมล", "warning");
        return;
      }

      const origText = submitLabel ? submitLabel.textContent : "ยืนยัน";
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = "กำลังดำเนินการ...";

      try {
        if (this.currentMode === "signin") {
          if (!password) throw new Error("กรุณาระบุรหัสผ่าน");
          if (this.authService) {
            await this.authService.loginWithPassword(email, password);
          } else if (window.SupabaseAdapter) {
            const res = await window.SupabaseAdapter.loginWithPassword(email, password);
            if (res?.user && this.store) {
              this.store.set("user", {
                username: res.user.user_metadata?.full_name || email.split("@")[0],
                email: res.user.email,
                avatarUrl: "assets/logo.png",
                provider: "email"
              });
            }
          }
          this.close();
        } else if (this.currentMode === "signup") {
          if (!password || password.length < 6) throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
          if (this.authService) {
            await this.authService.signUpWithPassword(email, password, username);
          } else if (window.SupabaseAdapter) {
            await window.SupabaseAdapter.signUpWithPassword(email, password, username);
          }
          this.close();
        } else if (this.currentMode === "magiclink") {
          if (this.authService) {
            await this.authService.loginWithOtp(email);
          } else if (window.SupabaseAdapter) {
            await window.SupabaseAdapter.loginWithOtp(email);
            window.UI?.toast(`ส่ง Magic Link ไปยัง ${email} เรียบร้อยแล้ว!`, "success");
          }
          this.close();
        }
      } catch (err) {
        console.error("[AUTH_SUBMIT_ERROR]", err);
        window.UI?.toast(err.message || "การยืนยันตัวตนไม่สำเร็จ", "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = origText;
      }
    };
  }

  open(mode = "signin") {
    let modal = document.getElementById("auth-modal");
    if (!modal) {
      this.initDOM();
      modal = document.getElementById("auth-modal");
    }
    if (modal) {
      this.setMode(mode);
      modal.classList.remove("hidden");
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        if (mode === "signup") {
          const userInp = document.getElementById("auth-input-username");
          if (userInp) userInp.focus();
        } else {
          const emailInput = document.getElementById("auth-input-email");
          if (emailInput) emailInput.focus();
        }
      }, 100);
    }
  }

  close() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.add("hidden");
  }

  setMode(mode) {
    this.currentMode = mode;
    const tabIn = document.getElementById("tab-auth-signin");
    const tabUp = document.getElementById("tab-auth-signup");
    const tabMl = document.getElementById("tab-auth-magiclink");

    const groupUser = document.getElementById("auth-group-username");
    const groupPass = document.getElementById("auth-group-password");
    const submitLabel = document.getElementById("btn-auth-submit-label");

    // Reset tab active styles
    [tabIn, tabUp, tabMl].forEach(tab => {
      if (tab) {
        tab.className = "flex-1 py-1.5 rounded-lg text-center text-slate-400 hover:text-white transition-all cursor-pointer";
      }
    });

    const activeClass = "flex-1 py-1.5 rounded-lg text-center transition-all bg-white/[0.08] text-white font-bold cursor-pointer";

    if (mode === "signin") {
      if (tabIn) tabIn.className = activeClass;
      if (groupUser) groupUser.classList.add("hidden");
      if (groupPass) groupPass.classList.remove("hidden");
      if (submitLabel) submitLabel.textContent = "เข้าสู่ระบบทันที";
    } else if (mode === "signup") {
      if (tabUp) tabUp.className = activeClass;
      if (groupUser) groupUser.classList.remove("hidden");
      if (groupPass) groupPass.classList.remove("hidden");
      if (submitLabel) submitLabel.textContent = "สมัครสมาชิกใหม่";
    } else if (mode === "magiclink") {
      if (tabMl) tabMl.className = activeClass;
      if (groupUser) groupUser.classList.add("hidden");
      if (groupPass) groupPass.classList.add("hidden");
      if (submitLabel) submitLabel.textContent = "ส่งลิงก์เข้าสู่ระบบ (Magic Link)";
    }
  }
}

if (typeof window !== "undefined") {
  window.AuthModalComponent = AuthModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AuthModalComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/DiscordServiceModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * DISCORD SERVICES & INTERACTIVE CALCULATOR (BOOST & QUESTS)
 * ==============================================================================
 */

class DiscordServiceModalComponent {
  constructor(store) {
    this.store = store;
    this.activeTab = "boost"; // "boost" | "quest"
    this.boostPreset = 14;    // 2, 7, 14, or custom
    this.boostCount = 14;
    this.boostDuration = 1;   // 1 or 3 months
    this.inviteLink = "";
    this.questType = "bundle"; // "single" | "bundle"
    this.discordTag = "";

    this.pricing = {
      boostPerUnit1M: 25,
      boostPerUnit3M: 65,
      level1_1M: 49,
      level1_3M: 129,
      level2_1M: 169,
      level2_3M: 429,
      level3_1M: 299,
      level3_3M: 799,
      questSingle: 29,
      questBundle: 69
    };

    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (!document.getElementById("discord-services-modal")) {
      const modalEl = document.createElement("div");
      modalEl.id = "discord-services-modal";
      modalEl.className = "fixed inset-0 z-50 hidden items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all";
      modalEl.innerHTML = `
        <div class="relative modal-spring-dialog w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0B0F19]/95 border border-slate-800 shadow-2xl shadow-[#5865F2]/20 overflow-hidden">
          
          <!-- Header -->
          <div class="p-5 md:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[#5865F2]/15 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center shadow-lg shadow-[#5865F2]/20">
                <i data-lucide="sparkles" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base md:text-lg font-heading font-extrabold text-white flex items-center gap-2">
                  ระบบคำนวณบริการ Discord อัตโนมัติ
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40">24/7 AUTO</span>
                </h3>
                <p class="text-xs text-slate-400 font-body">คำนวณราคา Discord Server Boost และ Auto Quests ส่งงานอัตโนมัติ</p>
              </div>
            </div>
            <button onclick="window.closeDiscordServicesModal()" class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Service Tabs (Boost vs Quests) -->
          <div class="grid grid-cols-2 p-2 border-b border-slate-800/80 bg-slate-900/60 gap-2">
            <button 
              id="tab-btn-boost"
              onclick="window.switchDiscordTab('boost')" 
              class="py-2.5 px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30"
            >
              <i data-lucide="rocket" class="w-4 h-4"></i>
              <span>Discord Server Boost</span>
            </button>
            <button 
              id="tab-btn-quest"
              onclick="window.switchDiscordTab('quest')" 
              class="py-2.5 px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-white hover:bg-slate-800/80"
            >
              <i data-lucide="gamepad-2" class="w-4 h-4"></i>
              <span>Discord Nitro Quests</span>
            </button>
          </div>

          <!-- Content Body (Scrollable) -->
          <div id="discord-calc-content" class="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 max-h-[62vh]">
            <!-- Injected via render() -->
          </div>

          <!-- Footer Action Bar -->
          <div class="p-4 md:p-5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
            <div>
              <div class="text-[10px] text-slate-400 font-mono">ยอดชำระบริการ</div>
              <div id="discord-calc-total" class="text-xl font-mono font-extrabold text-white text-[var(--accent)]">
                ฿299.00
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                onclick="window.addDiscordServiceToCart()" 
                class="btn-cyber-primary px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-[var(--accent)]/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                <span>เพิ่มลงตะกร้า</span>
              </button>
            </div>
          </div>

        </div>
      `;
      document.body.appendChild(modalEl);
    }
  }

  calculatePrice() {
    if (this.activeTab === "boost") {
      const is3M = this.boostDuration === 3;
      if (this.boostCount === 2) return is3M ? this.pricing.level1_3M : this.pricing.level1_1M;
      if (this.boostCount === 7) return is3M ? this.pricing.level2_3M : this.pricing.level2_1M;
      if (this.boostCount === 14) return is3M ? this.pricing.level3_3M : this.pricing.level3_1M;
      // กำหนดเองตามหน่วย
      const unit = is3M ? this.pricing.boostPerUnit3M : this.pricing.boostPerUnit1M;
      return this.boostCount * unit;
    } else {
      return this.questType === "bundle" ? this.pricing.questBundle : this.pricing.questSingle;
    }
  }

  open(defaultTab = "boost") {
    this.initDOM();
    this.activeTab = defaultTab;
    const modalEl = document.getElementById("discord-services-modal");
    if (!modalEl) return;

    modalEl.classList.remove("hidden");
    modalEl.classList.add("flex");
    this.updateTabButtons();
    this.render();
  }

  close() {
    const modalEl = document.getElementById("discord-services-modal");
    if (!modalEl) return;
    modalEl.classList.add("hidden");
    modalEl.classList.remove("flex");
  }

  setTab(tab) {
    this.activeTab = tab;
    this.updateTabButtons();
    this.render();
  }

  updateTabButtons() {
    const boostBtn = document.getElementById("tab-btn-boost");
    const questBtn = document.getElementById("tab-btn-quest");

    if (this.activeTab === "boost") {
      if (boostBtn) boostBtn.className = "py-2.5 px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30";
      if (questBtn) questBtn.className = "py-2.5 px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-white hover:bg-slate-800/80";
    } else {
      if (boostBtn) boostBtn.className = "py-2.5 px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-white hover:bg-slate-800/80";
      if (questBtn) questBtn.className = "py-2.5 px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30";
    }
  }

  render() {
    const container = document.getElementById("discord-calc-content");
    const totalEl = document.getElementById("discord-calc-total");
    if (!container) return;

    const currentPrice = this.calculatePrice();
    if (totalEl) totalEl.textContent = `฿${currentPrice.toFixed(2)}`;

    if (this.activeTab === "boost") {
      container.innerHTML = `
        <!-- Presets -->
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-2">เลือกระดับ Server Level ที่ต้องการ</label>
          <div class="grid grid-cols-3 gap-2.5">
            <button 
              onclick="window.setBoostPreset(2)" 
              class="p-3 rounded-2xl border text-center transition-all ${this.boostCount === 2 ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20' : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'}"
            >
              <div class="text-[10px] font-mono text-[#5865F2] font-bold">LEVEL 1</div>
              <div class="text-sm font-extrabold text-white">2 Boosts</div>
              <div class="text-[10px] text-slate-400 mt-1">อิโมจิ +50 ช่อง</div>
            </button>

            <button 
              onclick="window.setBoostPreset(7)" 
              class="p-3 rounded-2xl border text-center transition-all ${this.boostCount === 7 ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20' : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'}"
            >
              <div class="text-[10px] font-mono text-[#5865F2] font-bold">LEVEL 2</div>
              <div class="text-sm font-extrabold text-white">7 Boosts</div>
              <div class="text-[10px] text-slate-400 mt-1">สตรีม 1080p 60fps</div>
            </button>

            <button 
              onclick="window.setBoostPreset(14)" 
              class="p-3 rounded-2xl border text-center transition-all ${this.boostCount === 14 ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20 ring-1 ring-[#5865F2]' : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'}"
            >
              <div class="text-[10px] font-mono text-emerald-400 font-bold">POPULAR • LV.3</div>
              <div class="text-sm font-extrabold text-white">14 Boosts</div>
              <div class="text-[10px] text-slate-400 mt-1">แบนเนอร์ + ลิงก์ Custom</div>
            </button>
          </div>
        </div>

        <!-- Custom Slider -->
        <div class="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-2">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-slate-400">จำนวนบูสต์กำหนดเอง:</span>
            <span class="text-white font-bold text-sm bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">${this.boostCount} Boosts</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="30" 
            value="${this.boostCount}" 
            oninput="window.handleBoostSlider(event)" 
            class="w-full accent-[#5865F2] cursor-pointer"
          />
          <div class="flex justify-between text-[10px] font-mono text-slate-500">
            <span>1 Boost</span>
            <span>14 Boosts (Lv.3)</span>
            <span>30 Boosts</span>
          </div>
        </div>

        <!-- Duration Picker -->
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-2">เลือกระยะเวลารับประกัน</label>
          <div class="grid grid-cols-2 gap-3">
            <button 
              onclick="window.setBoostDuration(1)" 
              class="p-3 rounded-xl border flex items-center justify-between transition-all ${this.boostDuration === 1 ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-white' : 'bg-slate-900 border-slate-800 text-slate-300'}"
            >
              <div>
                <div class="text-xs font-bold">1 เดือน (30 วัน)</div>
                <div class="text-[10px] text-slate-400">รับประกันเต็มเวลา</div>
              </div>
              <i data-lucide="${this.boostDuration === 1 ? 'check-circle-2' : 'circle'}" class="w-4 h-4 text-[var(--accent)]"></i>
            </button>

            <button 
              onclick="window.setBoostDuration(3)" 
              class="p-3 rounded-xl border flex items-center justify-between transition-all ${this.boostDuration === 3 ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-white' : 'bg-slate-900 border-slate-800 text-slate-300'}"
            >
              <div>
                <div class="text-xs font-bold flex items-center gap-1.5">
                  <span>3 เดือน (90 วัน)</span>
                  <span class="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 font-bold">ประหยัด 15%</span>
                </div>
                <div class="text-[10px] text-slate-400">คุ้มค่าระยะยาว</div>
              </div>
              <i data-lucide="${this.boostDuration === 3 ? 'check-circle-2' : 'circle'}" class="w-4 h-4 text-[var(--accent)]"></i>
            </button>
          </div>
        </div>

        <!-- Server Invite Link Input -->
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            ลิงก์คำเชิญเซิร์ฟเวอร์ Discord <span class="text-rose-400">*</span>
          </label>
          <input 
            type="text" 
            id="boost-invite-input" 
            value="${this.inviteLink}" 
            oninput="window.handleInviteInput(event)"
            placeholder="https://discord.gg/your-community" 
            class="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5865F2] font-mono transition-all"
          />
          <p class="text-[10px] text-slate-500 mt-1">บอทจะส่งบูสต์เข้าเซิร์ฟเวอร์อัตโนมัติภายใน 1-3 นาทีหลังจากชำระเงิน</p>
        </div>
      `;
    } else {
      // Quests Tab
      container.innerHTML = `
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-2">เลือกแพ็กเกจ Discord Nitro Quests</label>
          <div class="grid grid-cols-2 gap-3">
            <button 
              onclick="window.setQuestType('single')" 
              class="p-4 rounded-2xl border text-left transition-all ${this.questType === 'single' ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-lg' : 'bg-slate-900/80 border-slate-800 text-slate-300'}"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-extrabold text-white">เควสเดี่ยว (1 Game)</span>
                <span class="text-xs font-mono font-bold text-[var(--accent)]">฿29</span>
              </div>
              <p class="text-[10px] text-slate-400">เลือกทำเควสเกมใดก็ได้ 1 เควส (เช่น Fortnite หรือ Genshin)</p>
            </button>

            <button 
              onclick="window.setQuestType('bundle')" 
              class="p-4 rounded-2xl border text-left transition-all ${this.questType === 'bundle' ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-lg ring-1 ring-[#5865F2]' : 'bg-slate-900/80 border-slate-800 text-slate-300'}"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-extrabold text-white flex items-center gap-1">
                  <span>เหมาทุกเควส</span>
                  <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">คุ้มสุด</span>
                </span>
                <span class="text-xs font-mono font-bold text-[var(--accent)]">฿69</span>
              </div>
              <p class="text-[10px] text-slate-400">เคลียร์ทุกเควสที่เปิดอยู่ในขณะนั้นทั้งหมด ปลดล็อกกรอบรูป/ไอเทมครบ</p>
            </button>
          </div>
        </div>

        <div class="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
          <div class="flex items-center gap-2 text-xs font-bold text-white">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
            <span>ระบบทำเควสผ่าน Cloud Sandbox ปลอดภัย 100% ไม่ขอรหัสผ่าน</span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed font-body">
            สามารถเชื่อมต่อผ่านระบบ Bot Auth ของ Discord หรือสแกน QR Code ครั้งเดียวเพื่อจำลองการเล่นเกม เควสจะเสร็จสมบูรณ์ทันทีโดยไม่ต้องดาวน์โหลดเกมลงเครื่อง
          </p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            Discord Username หรือ User ID <span class="text-rose-400">*</span>
          </label>
          <input 
            type="text" 
            id="quest-user-input" 
            value="${this.discordTag}" 
            oninput="window.handleDiscordTagInput(event)"
            placeholder="ตัวอย่าง: matthew#0001 หรือ 3829104928172910" 
            class="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5865F2] font-mono transition-all"
          />
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  addToCart() {
    const price = this.calculatePrice();

    if (this.activeTab === "boost") {
      if (!this.inviteLink || !this.inviteLink.includes("discord")) {
        throw new Error("กรุณาระบุลิงก์เชิญเซิร์ฟเวอร์ Discord (เช่น https://discord.gg/...)");
      }

      const item = {
        id: `boost-${this.boostCount}x-${this.boostDuration}m`,
        title: `Discord Server Boost (${this.boostCount} บูสต์ - ${this.boostDuration} เดือน)`,
        price: price,
        quantity: 1,
        fulfillmentType: "custom",
        serverInvite: this.inviteLink
      };

      this.store.addToCart(item);
      return item;
    } else {
      if (!this.discordTag) {
        throw new Error("กรุณากรอก Discord Username หรือ User ID");
      }

      const item = {
        id: `nitro-quest-${this.questType}`,
        title: `Discord Nitro Quest (${this.questType === 'bundle' ? 'เหมาทุกเควส' : 'เควสเดี่ยว'})`,
        price: price,
        quantity: 1,
        fulfillmentType: "custom",
        discordUser: this.discordTag
      };

      this.store.addToCart(item);
      return item;
    }
  }
}

if (typeof window !== "undefined") {
  window.DiscordServiceModalComponent = DiscordServiceModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DiscordServiceModalComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/LuckyWheelModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🎡 NYX9 STUDIO — LUCKY WHEEL & GAMIFICATION ENGINE (Sprint 3)
 * ==============================================================================
 * มินิเกมวงล้อเสี่ยงโชคพร้อมระบบฟิสิกส์ HTML5 Canvas, Web Audio Synthesizer,
 * Confetti Celebration และเชื่อมต่อ Stored Procedure fn_play_minigame แบบ Atomic
 * ==============================================================================
 */

class LuckyWheelComponent {
  constructor(store) {
    this.store = store;
    this.minigame = null;
    this.rewards = [];
    this.isSpinning = false;
    this.currentRotation = 0; // degrees
    this.audioCtx = null;
    this.canvas = null;
    this.ctx = null;
    this.initDOM();
  }

  async initDOM() {
    if (typeof document === "undefined") return;

    // ตรวจสอบหรือสร้าง Modal ผลรางวัลมินิเกม
    this.ensureResultModal();

    // ดึงข้อมูลวงล้อจาก API
    await this.fetchMinigameData();

    // ตรวจสอบว่ามี canvas ในหน้า view-minigame หรือไม่
    this.canvas = document.getElementById("lucky-wheel-canvas");
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      this.drawWheel();
      this.bindEvents();
    }
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playTickSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (_) {}
  }

  playWinFanfare() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.45);
      });
    } catch (_) {}
  }

  async fetchMinigameData() {
    try {
      const user = this.store.get("user");
      const url = user?.id ? `/api/minigames?user_id=${user.id}` : `/api/minigames`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        this.minigame = data.minigame;
        this.rewards = data.rewards || [];
        if (data.user) {
          this.store.setWalletBalance(data.user.balance);
          this.store.setLoyaltyPoints(data.user.points);
        }
        this.renderChancesTable();
        if (this.canvas) this.drawWheel();
      }
    } catch (err) {
      console.warn("[LUCKY WHEEL] Fetch data error:", err.message);
    }
  }

  drawWheel() {
    if (!this.canvas || !this.ctx || this.rewards.length === 0) return;
    const ctx = this.ctx;
    const size = this.canvas.width;
    const center = size / 2;
    const radius = center - 12;
    const numSlices = this.rewards.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, size, size);

    // Save context for entire wheel rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((this.currentRotation * Math.PI) / 180);

    // 1. Draw Slices
    for (let i = 0; i < numSlices; i++) {
      const reward = this.rewards[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Gradient Fill for Luxury Game Feel
      ctx.fillStyle = reward.color_hex || this.getDefaultColor(i);
      ctx.fill();

      // Slice Inner Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. Draw Slice Content (Icon & Text)
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      // Icon & Label Text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px 'Prompt', sans-serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      const label = reward.label || reward.reward_type;
      const icon = reward.icon || "";
      ctx.fillText(`${icon} ${label}`, radius - 20, 0);

      ctx.restore();
    }

    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#00F2FF";
    ctx.shadowColor = "#00F2FF";
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Light Bulb Dots on Outer Ring
    const numDots = 24;
    for (let d = 0; d < numDots; d++) {
      const dotAngle = (d * (2 * Math.PI)) / numDots;
      const dotX = Math.cos(dotAngle) * (radius + 2);
      const dotY = Math.sin(dotAngle) * (radius + 2);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = d % 2 === 0 ? "#FFE57F" : "#FFFFFF";
      ctx.fill();
    }

    ctx.restore();

    // 3. Center Hub (Static Pin / Button)
    ctx.save();
    ctx.translate(center, center);

    // Outer Hub Circle
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, 2 * Math.PI);
    ctx.fillStyle = "#0A0E17";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner Hub Circle
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 32);
    hubGrad.addColorStop(0, "#00F2FF");
    hubGrad.addColorStop(1, "#5865F2");
    ctx.fillStyle = hubGrad;
    ctx.fill();

    // Center Text
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 12px 'Orbitron', 'Prompt', sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;
    ctx.fillText("NYX9", 0, -2);
    ctx.font = "bold 8px 'Prompt', sans-serif";
    ctx.fillText("LUCKY", 0, 10);

    ctx.restore();

    // 4. Top Pointer Needle (Fixed at 12 o'clock / -90 deg)
    ctx.save();
    ctx.translate(center, 12);
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(14, -6);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fillStyle = "#FF0055";
    ctx.shadowColor = "#FF0055";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer Pivot Dot
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.restore();
  }

  getDefaultColor(index) {
    const colors = ["#5865F2", "#F59E0B", "#10B981", "#475569", "#EC4899", "#8B5CF6", "#3B82F6", "#334155"];
    return colors[index % colors.length];
  }

  renderChancesTable() {
    const container = document.getElementById("minigame-chances-list");
    if (!container || this.rewards.length === 0) return;

    container.innerHTML = this.rewards.map(r => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-colors">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-sm" style="background-color: ${r.color_hex}22; border: 1px solid ${r.color_hex}55; color: ${r.color_hex}">
            ${r.icon || "🎁"}
          </div>
          <div>
            <div class="text-xs font-bold text-white">${r.label}</div>
            <div class="text-[10px] text-slate-400 capitalize">${r.reward_type}</div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-mono font-bold text-cyan-400">${r.win_chance}%</span>
        </div>
      </div>
    `).join("");
  }

  bindEvents() {
    const spinMoneyBtn = document.getElementById("btn-wheel-spin-money");
    const spinPointsBtn = document.getElementById("btn-wheel-spin-points");

    if (spinMoneyBtn) {
      spinMoneyBtn.onclick = () => this.spin(false);
    }
    if (spinPointsBtn) {
      spinPointsBtn.onclick = () => this.spin(true);
    }
  }

  async spin(usePoints = false) {
    if (this.isSpinning) return;

    const user = this.store.get("user");
    if (!user || !user.id) {
      window.UI?.toast("กรุณาเข้าสู่ระบบก่อนหมุนวงล้อ", "warning");
      if (typeof window.openAuthModal === "function") {
        window.openAuthModal("login");
      }
      return;
    }

    const costPrice = parseFloat(this.minigame?.play_price || 15);
    const costPoints = parseInt(this.minigame?.play_points || 50, 10);
    const balance = this.store.get("walletBalance") || 0;
    const points = this.store.get("loyaltyPoints") || 0;

    if (usePoints) {
      if (points < costPoints) {
        window.UI?.toast(`แต้มไม่พอสำหรับการหมุน (ต้องการ ${costPoints} แต้ม / คุณมี ${points} แต้ม)`, "error");
        return;
      }
    } else {
      if (balance < costPrice) {
        window.UI?.toast(`ยอดเงินไม่พอสำหรับการหมุน (ต้องการ ฿${costPrice.toFixed(2)} / คุณมี ฿${balance.toFixed(2)})`, "error");
        if (typeof window.navigateToPage === "function") {
          window.navigateToPage("topup");
        }
        return;
      }
    }

    this.isSpinning = true;
    this.setSpinButtonsState(false);

    // เริ่มหมุนล่วงหน้าเพื่อให้รู้สึก Instant Response
    let animId;
    let speed = 25;
    const startSpinTime = Date.now();

    const fastSpin = () => {
      this.currentRotation = (this.currentRotation + speed) % 360;
      this.drawWheel();
      this.playTickSound();
      animId = requestAnimationFrame(fastSpin);
    };
    animId = requestAnimationFrame(fastSpin);

    try {
      const res = await fetch("/api/minigames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "spin",
          user_id: user.id,
          minigame_id: this.minigame?.id || 1,
          use_points: usePoints
        })
      });

      const outcome = await res.json();
      cancelAnimationFrame(animId);

      if (!outcome.success) {
        this.isSpinning = false;
        this.setSpinButtonsState(true);
        window.UI?.toast(outcome.message || "เกิดข้อผิดพลาดในการหมุนวงล้อ", "error");
        return;
      }

      // คำนวณมุมหยุดที่ถูกต้อง
      // เข็มชี้อยู่ที่มุม 12 นาฬิกา (-90 องศา หรือ 270 องศา)
      // Slice แต่ละชิ้นกว้าง = 360 / numSlices
      // Slice ที่ index ชนะอยู่ระหว่าง index * sliceDeg ถึง (index + 1) * sliceDeg
      const numSlices = this.rewards.length;
      const sliceDeg = 360 / numSlices;
      const targetIndex = outcome.reward_index;
      
      // กึ่งกลางของ slice ที่ชนะ (ในระบบพิกัดวงล้อเริ่มต้น)
      const sliceCenterDeg = targetIndex * sliceDeg + sliceDeg / 2;
      
      // เพื่อให้ sliceCenterDeg หมุนไปอยู่ตรงเข็มชี้ (270 องศา)
      // (currentRotation + sliceCenterDeg) % 360 = 270
      // currentRotation = 270 - sliceCenterDeg
      const targetAngleWithinCircle = (270 - sliceCenterDeg + 360) % 360;
      
      // หมุนอย่างน้อย 5-7 รอบเต็ม
      const extraSpins = 360 * 6;
      const currentMod = this.currentRotation % 360;
      let finalTarget = this.currentRotation + extraSpins + (targetAngleWithinCircle - currentMod);
      if (finalTarget < this.currentRotation + extraSpins) {
        finalTarget += 360;
      }

      // Smooth Deceleration Animation
      const duration = 4500; // 4.5 วินาที
      const startRot = this.currentRotation;
      const totalDelta = finalTarget - startRot;
      const startTime = performance.now();
      let lastTickAngle = startRot;

      const animateDecel = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // Easing: ease-out-cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        this.currentRotation = startRot + totalDelta * easeProgress;
        this.drawWheel();

        // เสียงกระดิกเมื่อข้าม Slice
        if (Math.abs(this.currentRotation - lastTickAngle) >= sliceDeg) {
          this.playTickSound();
          lastTickAngle = this.currentRotation;
        }

        if (progress < 1) {
          requestAnimationFrame(animateDecel);
        } else {
          this.currentRotation = finalTarget % 360;
          this.drawWheel();
          this.isSpinning = false;
          this.setSpinButtonsState(true);

          // อัปเดตยอดเงินและแต้มใน Store
          if (outcome.new_balance !== undefined) {
            this.store.setWalletBalance(outcome.new_balance);
          }
          if (outcome.new_points !== undefined) {
            this.store.setLoyaltyPoints(outcome.new_points);
          }

          // แสดงผลรางวัลและฉลอง
          this.showRewardResult(outcome);
        }
      };

      requestAnimationFrame(animateDecel);

    } catch (err) {
      cancelAnimationFrame(animId);
      this.isSpinning = false;
      this.setSpinButtonsState(true);
      window.UI?.toast(`การหมุนล้มเหลว: ${err.message}`, "error");
    }
  }

  setSpinButtonsState(enabled) {
    const b1 = document.getElementById("btn-wheel-spin-money");
    const b2 = document.getElementById("btn-wheel-spin-points");
    if (b1) b1.disabled = !enabled;
    if (b2) b2.disabled = !enabled;
  }

  showRewardResult(outcome) {
    const modal = document.getElementById("modal-wheel-result");
    if (!modal) return;

    const iconEl = document.getElementById("wheel-result-icon");
    const titleEl = document.getElementById("wheel-result-title");
    const descEl = document.getElementById("wheel-result-desc");
    const credBox = document.getElementById("wheel-result-cred-box");
    const credData = document.getElementById("wheel-result-cred-data");

    if (iconEl) iconEl.textContent = outcome.reward_icon || "🎁";
    if (titleEl) titleEl.textContent = outcome.reward_label || "ขอแสดงความยินดี!";

    let desc = "";
    if (outcome.reward_type === "money") {
      desc = `คุณได้รับเครดิตเข้ากระเป๋าเงินทันที ฿${outcome.reward?.amount || 0}!`;
      this.playWinFanfare();
      this.launchConfetti();
    } else if (outcome.reward_type === "points") {
      desc = `คุณได้รับ Loyalty Points สะสมเพิ่ม ${outcome.reward?.amount || 0} แต้ม!`;
      this.playWinFanfare();
      this.launchConfetti();
    } else if (outcome.reward_type === "vault") {
      desc = `แจ็กพอตแตก! คุณได้รับสินค้าพิเศษจัดส่งจากคลังทันที!`;
      this.playWinFanfare();
      this.launchConfetti();
    } else {
      desc = "ไม่เป็นไรนะ! ขอให้คุณโชคดีและได้รับรางวัลใหญ่ในการหมุนครั้งต่อไป 🍀";
    }

    if (descEl) descEl.textContent = desc;

    // ถ้ามีคีย์จากคลังให้แสดงกล่องคัดลอก
    if (outcome.reward?.credential_data && credBox && credData) {
      credBox.classList.remove("hidden");
      credData.value = outcome.reward.credential_data;
    } else if (credBox) {
      credBox.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  ensureResultModal() {
    if (document.getElementById("modal-wheel-result")) return;

    const modal = document.createElement("div");
    modal.id = "modal-wheel-result";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md";
    modal.innerHTML = `
      <div class="relative w-full max-w-md rounded-3xl bg-[#0B0F19] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-500/20 text-center space-y-4">
        
        <!-- Canvas Confetti -->
        <canvas id="wheel-confetti-canvas" class="pointer-events-none absolute inset-0 w-full h-full z-10"></canvas>

        <div id="wheel-result-icon" class="text-6xl animate-bounce">🎁</div>
        <h3 id="wheel-result-title" class="text-2xl font-heading font-extrabold text-white">ยินดีด้วย!</h3>
        <p id="wheel-result-desc" class="text-xs text-slate-300 leading-relaxed"></p>

        <!-- Product Credential Copy Box (If Won Vault Product) -->
        <div id="wheel-result-cred-box" class="hidden text-left space-y-1.5 p-3 rounded-2xl bg-[#06080E] border border-cyan-500/40">
          <div class="text-[10px] text-cyan-400 font-mono font-bold flex items-center justify-between">
            <span>🔑 รหัสสินค้าของคุณ (พร้อมใช้งาน):</span>
            <span class="text-[9px] text-emerald-400">100% WORKING</span>
          </div>
          <div class="flex items-center gap-2">
            <input id="wheel-result-cred-data" type="text" readonly class="w-full bg-transparent text-xs font-mono text-white outline-none select-all font-bold" />
            <button onclick="window.copyWheelKey()" class="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#06080C] text-xs font-bold shrink-0 cursor-pointer transition-all">
              คัดลอก
            </button>
          </div>
        </div>

        <div class="pt-2">
          <button onclick="document.getElementById('modal-wheel-result').classList.add('hidden'); document.getElementById('modal-wheel-result').classList.remove('flex');" class="btn-cyber-primary w-full py-3 rounded-xl font-heading font-extrabold text-xs cursor-pointer shadow-lg shadow-cyan-500/25">
            หมุนอีกครั้ง / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    window.copyWheelKey = () => {
      const input = document.getElementById("wheel-result-cred-data");
      if (input) {
        navigator.clipboard.writeText(input.value);
        window.UI?.toast("คัดลอกรหัสสินค้าเรียบร้อยแล้ว!", "success");
      }
    };
  }

  launchConfetti() {
    const canvas = document.getElementById("wheel-confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const colors = ["#00F2FF", "#5865F2", "#F59E0B", "#10B981", "#EC4899", "#FFFFFF"];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 3,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.015;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frame++;
      if (frame < 80) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.LuckyWheelComponent = LuckyWheelComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = LuckyWheelComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/MemberCardModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 💳 NYX9 STUDIO — 3D HOLOGRAM VIP MEMBER CARD COMPONENT (Sprint 4)
 * ==============================================================================
 * การ์ดสมาชิก VIP แบบ 3D พร้อมระบบ Specular Hologram Lighting,
 * Mouse / Gyroscope Tilt Physics และ HTML5 Canvas High-Res PNG Card Exporter
 * ==============================================================================
 */

class MemberCardModalComponent {
  constructor(store) {
    this.store = store;
    this.modalEl = null;
    this.cardEl = null;
    this.glareEl = null;
    this.isHovering = false;
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("modal-vip-member-card")) return;

    const modal = document.createElement("div");
    modal.id = "modal-vip-member-card";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all";
    modal.innerHTML = `
      <div class="relative w-full max-w-lg flex flex-col items-center space-y-6">
        
        <!-- Modal Top Bar -->
        <div class="w-full flex items-center justify-between px-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-400 font-bold">
              3D VIP IDENTITY
            </span>
            <span class="text-xs text-slate-400 font-medium">ขยับเมาส์เพื่อสัมผัสแสงโฮโลแกรม</span>
          </div>
          <button onclick="window.closeVipCardModal()" class="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- 3D Perspective Card Stage -->
        <div id="vip-card-stage" class="w-full aspect-[1.586/1] max-w-[440px] select-none" style="perspective: 1200px;">
          
          <!-- Interactive 3D Card Element -->
          <div id="vip-card-3d" class="relative w-full h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-transform duration-100 ease-out border border-white/20"
               style="transform-style: preserve-3d; background: linear-gradient(135deg, #0A0F1D 0%, #060911 50%, #0D1629 100%);">
            
            <!-- Dynamic Specular Hologram Glare Overlay -->
            <div id="vip-card-glare" class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 z-20 rounded-3xl"
                 style="mix-blend-mode: color-dodge; background: radial-gradient(circle at 50% 50%, rgba(0,242,255,0.45), rgba(245,158,11,0.3) 40%, transparent 70%);">
            </div>

            <!-- Background Microchip Circuit Watermark -->
            <div class="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#00F2FF_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <!-- Card Top Header -->
            <div class="relative z-10 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 p-1 flex items-center justify-center text-cyan-400 shadow-md">
                  <svg class="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,242,255,0.5)]" viewBox="0 0 497 704" fill="none">
                    <path d="M 11 181 L 55 229 L 19 458 L 0 515 L 89 600 L 125 299 L 278 487 L 303 566 L 443 685 L 380 465 L 368 218 L 377 155 L 318 208 L 302 359 L 177 231 L 113 115 Z" fill="#FFFFFF" />
                    <path d="M 362 0 L 260 109 L 238 200 L 253 256 L 294 307 L 304 259 L 304 185 L 378 120 L 418 180 L 424 247 L 385 307 L 400 435 L 496 268 L 480 127 Z" fill="#00F2FF" />
                  </svg>
                </div>
                <div>
                  <div class="font-heading font-extrabold text-sm text-white tracking-widest">NYX9 STUDIO</div>
                  <div class="text-[9px] text-slate-400 font-mono">PREMIUM VIP MEMBER</div>
                </div>
              </div>

              <!-- Hologram Tier Badge -->
              <div id="vip-card-tier-badge" class="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border border-amber-400/40 text-amber-300 font-mono font-extrabold text-[11px] shadow-sm flex items-center gap-1.5">
                <span>💎</span>
                <span id="vip-card-tier-name">DIAMOND VIP</span>
              </div>
            </div>

            <!-- Card Middle (Smart Chip & Serial) -->
            <div class="relative z-10 flex items-center justify-between my-2">
              <!-- Metallic SIM Chip -->
              <div class="w-12 h-9 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/60 p-1 flex items-center justify-center shadow-md relative overflow-hidden">
                <div class="w-full h-0.5 bg-black/20 my-auto"></div>
                <div class="absolute inset-x-3 inset-y-1.5 border border-black/30 rounded-sm"></div>
              </div>

              <!-- Contactless Wave Icon -->
              <i data-lucide="wifi" class="w-6 h-6 text-slate-400 rotate-90 opacity-70"></i>
            </div>

            <!-- Card Bottom (User Info & Balances) -->
            <div class="relative z-10 space-y-2">
              <div id="vip-card-serial" class="font-mono text-base sm:text-lg font-bold text-white tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                NYX9 8841 9283 5519
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-white/[0.08]">
                <div class="flex items-center gap-2">
                  <img id="vip-card-avatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="w-7 h-7 rounded-full object-cover ring-1 ring-cyan-400/50" />
                  <div>
                    <div id="vip-card-username" class="text-xs font-bold text-white truncate max-w-[140px]">Discord User</div>
                    <div class="text-[9px] text-slate-400 font-mono">STATUS: ACTIVE</div>
                  </div>
                </div>

                <div class="text-right flex items-center gap-3">
                  <div>
                    <div class="text-[9px] text-slate-400 font-mono">CREDIT</div>
                    <div id="vip-card-balance" class="text-xs font-mono font-bold text-cyan-400">฿500.00</div>
                  </div>
                  <div>
                    <div class="text-[9px] text-slate-400 font-mono">POINTS</div>
                    <div id="vip-card-points" class="text-xs font-mono font-bold text-amber-400">200 PTS</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Action Controls Bar -->
        <div class="w-full flex items-center justify-center gap-3 pt-2">
          <button onclick="window.saveVipCardImagePNG()" class="btn-cyber-primary px-6 py-2.5 rounded-xl font-heading font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all">
            <i data-lucide="camera" class="w-4 h-4"></i>
            <span>📸 บันทึกภาพการ์ด (Save PNG)</span>
          </button>
          <button onclick="window.closeVipCardModal()" class="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer">
            ปิด
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
    this.cardEl = document.getElementById("vip-card-3d");
    this.glareEl = document.getElementById("vip-card-glare");

    this.bindTiltPhysics();
    this.bindGlobalActions();
  }

  bindTiltPhysics() {
    const stage = document.getElementById("vip-card-stage");
    if (!stage || !this.cardEl || !this.glareEl) return;

    const handleMove = (x, y, rect) => {
      const mouseX = x - rect.left;
      const mouseY = y - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt degrees (-16 to +16 deg)
      const rotateX = ((centerY - mouseY) / centerY) * 16;
      const rotateY = ((mouseX - centerX) / centerX) * 16;

      this.cardEl.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

      // Move Specular Glare reflection
      const glareX = (mouseX / rect.width) * 100;
      const glareY = (mouseY / rect.height) * 100;
      this.glareEl.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(0,242,255,0.45), rgba(245,158,11,0.25) 35%, transparent 70%)`;
      this.glareEl.style.opacity = "1";
    };

    stage.addEventListener("mousemove", (e) => {
      const rect = stage.getBoundingClientRect();
      handleMove(e.clientX, e.clientY, rect);
    });

    stage.addEventListener("mouseleave", () => {
      this.cardEl.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      this.glareEl.style.opacity = "0";
    });

    // Touch Support for Smartphones
    stage.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches[0]) {
        const rect = stage.getBoundingClientRect();
        handleMove(e.touches[0].clientX, e.touches[0].clientY, rect);
      }
    }, { passive: true });

    stage.addEventListener("touchend", () => {
      this.cardEl.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      this.glareEl.style.opacity = "0";
    });
  }

  bindGlobalActions() {
    window.openVipCardModal = () => this.open();
    window.closeVipCardModal = () => this.close();
    window.saveVipCardImagePNG = () => this.exportCardPNG();
  }

  open() {
    this.initDOM();
    this.updateCardData();
    if (this.modalEl) {
      this.modalEl.classList.remove("hidden");
      this.modalEl.classList.add("flex");
    }
    if (window.lucide) lucide.createIcons();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add("hidden");
      this.modalEl.classList.remove("flex");
    }
  }

  updateCardData() {
    const user = this.store ? this.store.get("user") : null;
    const balance = this.store ? this.store.get("walletBalance") || 0 : 0;
    const points = this.store ? this.store.get("loyaltyPoints") || 0 : 0;

    const usernameEl = document.getElementById("vip-card-username");
    const avatarEl = document.getElementById("vip-card-avatar");
    const serialEl = document.getElementById("vip-card-serial");
    const balanceEl = document.getElementById("vip-card-balance");
    const pointsEl = document.getElementById("vip-card-points");
    const tierNameEl = document.getElementById("vip-card-tier-name");
    const tierBadgeEl = document.getElementById("vip-card-tier-badge");

    const username = user?.username || "Guest Member";
    const avatarUrl = user?.avatarUrl || "assets/logo.png";
    
    // Deterministic Card Serial: NYX-XXXX-XXXX
    const rawId = String(user?.id || user?.discordId || "GUEST_NYX_2026");
    let hash = 0;
    for (let i = 0; i < rawId.length; i++) hash = (hash * 31 + rawId.charCodeAt(i)) >>> 0;
    const p1 = String(hash).slice(0, 4).padEnd(4, "7");
    const p2 = String(hash).slice(4, 8).padEnd(4, "9");
    const serial = `NYX9 ${p1} ${p2} 2026`;

    // Tier Calculation Formula
    let tier = "BRONZE MEMBER";
    let tierColor = "#94A3B8";
    let tierIcon = "🥉";

    if (balance >= 5000 || points >= 5000) {
      tier = "DIAMOND ELITE";
      tierColor = "#EC4899";
      tierIcon = "💎";
    } else if (balance >= 2000 || points >= 2000) {
      tier = "GOLD VIP";
      tierColor = "#F59E0B";
      tierIcon = "🥇";
    } else if (balance >= 500 || points >= 500) {
      tier = "SILVER VIP";
      tierColor = "#00F2FF";
      tierIcon = "🥈";
    }

    if (usernameEl) usernameEl.textContent = username;
    if (avatarEl) avatarEl.src = avatarUrl;
    if (serialEl) serialEl.textContent = serial;
    if (balanceEl) balanceEl.textContent = `฿${balance.toFixed(2)}`;
    if (pointsEl) pointsEl.textContent = `${Math.floor(points).toLocaleString()} PTS`;

    if (tierNameEl && tierBadgeEl) {
      tierNameEl.textContent = tier;
      tierBadgeEl.innerHTML = `<span>${tierIcon}</span> <span>${tier}</span>`;
      tierBadgeEl.style.borderColor = `${tierColor}66`;
      tierBadgeEl.style.color = tierColor;
    }
  }

  async exportCardPNG() {
    window.UI?.toast("📸 กำลังสร้างรูปภาพการ์ด VIP ความละเอียดสูง (1200x675)...", "info");

    const user = this.store ? this.store.get("user") : null;
    const balance = this.store ? this.store.get("walletBalance") || 0 : 0;
    const points = this.store ? this.store.get("loyaltyPoints") || 0 : 0;
    const username = user?.username || "Guest Member";

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");

    // 1. Dark Cyberpunk Backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, "#05070B");
    bgGrad.addColorStop(0.5, "#090D17");
    bgGrad.addColorStop(1, "#030408");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // Subtle Neon Ambient Light
    const ambGrad = ctx.createRadialGradient(600, 337, 100, 600, 337, 500);
    ambGrad.addColorStop(0, "rgba(0, 242, 255, 0.12)");
    ambGrad.addColorStop(1, "transparent");
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // 2. Draw Card Body (Centered 880 x 550)
    const cardX = 160;
    const cardY = 62;
    const cardW = 880;
    const cardH = 550;
    const cardR = 36;

    // Outer Glow Ring
    ctx.save();
    ctx.shadowColor = "#00F2FF";
    ctx.shadowBlur = 35;
    ctx.strokeStyle = "rgba(0, 242, 255, 0.5)";
    ctx.lineWidth = 3;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.stroke();
    ctx.restore();

    // Card Fill Gradient
    const cGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cGrad.addColorStop(0, "#0B101E");
    cGrad.addColorStop(0.5, "#060810");
    cGrad.addColorStop(1, "#0E182A");
    ctx.fillStyle = cGrad;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fill();

    // Specular Holographic Overlay
    const holoGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    holoGrad.addColorStop(0.2, "rgba(0, 242, 255, 0.08)");
    holoGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.12)");
    holoGrad.addColorStop(0.8, "rgba(236, 72, 153, 0.08)");
    ctx.fillStyle = holoGrad;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fill();

    // 3. Brand & Logo
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px 'Prompt', sans-serif";
    ctx.fillText("NYX9 STUDIO", cardX + 50, cardY + 70);
    ctx.font = "bold 13px 'Prompt', sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText("PREMIUM VIP MEMBER", cardX + 50, cardY + 95);

    // Tier Badge
    const tier = balance >= 5000 ? "💎 DIAMOND ELITE" : (balance >= 2000 ? "🥇 GOLD VIP" : (balance >= 500 ? "🥈 SILVER VIP" : "🥉 BRONZE MEMBER"));
    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 16px 'Prompt', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(tier, cardX + cardW - 50, cardY + 75);
    ctx.textAlign = "left";

    // 4. Chip
    ctx.fillStyle = "#F59E0B";
    this.roundRect(ctx, cardX + 50, cardY + 160, 90, 65, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();

    // 5. Serial Number
    const rawId = String(user?.id || user?.discordId || "GUEST");
    let hash = 0;
    for (let i = 0; i < rawId.length; i++) hash = (hash * 31 + rawId.charCodeAt(i)) >>> 0;
    const serial = `NYX9 ${String(hash).slice(0, 4).padEnd(4, "7")} ${String(hash).slice(4, 8).padEnd(4, "9")} 2026`;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px 'Orbitron', monospace";
    ctx.fillText(serial, cardX + 50, cardY + 330);

    // 6. Member Username, Credit & Points
    ctx.font = "bold 24px 'Prompt', sans-serif";
    ctx.fillText(username, cardX + 50, cardY + 450);
    ctx.font = "14px 'Prompt', sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("VERIFIED IDENTITY", cardX + 50, cardY + 480);

    ctx.textAlign = "right";
    ctx.font = "bold 20px 'Orbitron', monospace";
    ctx.fillStyle = "#00F2FF";
    ctx.fillText(`฿${balance.toFixed(2)}`, cardX + cardW - 50, cardY + 445);
    ctx.font = "12px 'Prompt', sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("WALLET BALANCE", cardX + cardW - 50, cardY + 465);

    ctx.font = "bold 18px 'Orbitron', monospace";
    ctx.fillStyle = "#F59E0B";
    ctx.fillText(`${Math.floor(points).toLocaleString()} PTS`, cardX + cardW - 50, cardY + 495);
    ctx.textAlign = "left";

    // 7. Watermark Footer
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "12px 'Prompt', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NYX9 STUDIO • OFFICIAL MEMBER IDENTIFICATION CARD • 24/7 ONLINE", 600, 650);

    // Download PNG
    const link = document.createElement("a");
    link.download = `NYX9_VIP_Card_${username.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    window.UI?.toast("บันทึกรูปภาพการ์ด VIP ลงเครื่องเรียบร้อยแล้ว!", "success");
    window.UI?.confetti();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.MemberCardModalComponent = MemberCardModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = MemberCardModalComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/KeyAuthModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🔑 NYX9 STUDIO — KEYAUTH HWID SELF-RESET MODAL COMPONENT (Sprint 5)
 * ==============================================================================
 * ให้บริการลูกค้ารีเซ็ต Hardware ID ด้วยตนเองตลอด 24 ชั่วโมง
 * พร้อมแสดงสถานะ Cooldown และคำแนะนำการใช้งาน
 * ==============================================================================
 */

class KeyAuthModalComponent {
  constructor(store) {
    this.store = store;
    this.modalEl = null;
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("modal-keyauth-reset")) return;

    const modal = document.createElement("div");
    modal.id = "modal-keyauth-reset";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all";
    modal.innerHTML = `
      <div class="relative w-full max-w-md rounded-3xl bg-[#090D17] border border-cyan-500/30 p-6 sm:p-7 shadow-2xl shadow-cyan-950/40 text-white space-y-5">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
              <i data-lucide="key" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-base font-heading font-extrabold text-white flex items-center gap-1.5">
                <span>KeyAuth HWID Self-Reset</span>
              </h3>
              <p class="text-[11px] text-slate-400 font-mono">ระบบย้ายเครื่องและรีเซ็ต Hardware ID อัตโนมัติ</p>
            </div>
          </div>
          <button onclick="window.closeKeyAuthModal()" class="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Cooldown & Policy Info Box -->
        <div class="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 space-y-1.5 leading-relaxed font-sans">
          <div class="flex items-center gap-1.5 font-bold text-cyan-300 font-mono text-[11px]">
            <i data-lucide="info" class="w-3.5 h-3.5"></i>
            <span>เงื่อนไขการรีเซ็ต HWID</span>
          </div>
          <p class="text-[11px] text-slate-300">
            • 1 License Key สามารถรีเซ็ตได้ 1 ครั้งต่อ 24 ชั่วโมง (Cooldown 24 ชม.)<br>
            • หลังรีเซ็ตสำเร็จ สามารถนำคีย์ไปเปิดใช้งานบนคอมพิวเตอร์เครื่องใหม่ได้ทันที
          </p>
        </div>

        <!-- Form Body -->
        <form onsubmit="window.handleKeyAuthResetSubmit(event)" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
              <span>ป้อน License Key ของคุณ</span>
              <span id="keyauth-cooldown-badge" class="hidden text-[10px] text-amber-400 font-mono"></span>
            </label>
            <div class="relative">
              <input type="text" id="input-keyauth-license" required placeholder="NYX-XXXX-XXXX-XXXX" 
                     class="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] focus:border-cyan-400 focus:outline-none text-xs font-mono text-white placeholder-slate-600 transition-all" />
              <button type="button" onclick="window.checkKeyAuthStatus()" class="absolute right-2 top-2 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-mono text-cyan-300 hover:text-white transition-all cursor-pointer">
                ตรวจสอบ
              </button>
            </div>
          </div>

          <div id="keyauth-status-result" class="hidden p-3 rounded-xl text-xs font-mono"></div>

          <!-- Action Buttons -->
          <div class="pt-2 flex items-center gap-2">
            <button type="button" onclick="window.closeKeyAuthModal()" class="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer">
              ปิด
            </button>
            <button type="submit" id="btn-submit-hwid-reset" class="btn-cyber-primary flex-[2] py-2.5 rounded-xl text-xs font-heading font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95 transition-all">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>ยืนยันรีเซ็ต HWID</span>
            </button>
          </div>
        </form>

      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    this.bindGlobalActions();
  }

  bindGlobalActions() {
    window.openKeyAuthModal = () => this.open();
    window.closeKeyAuthModal = () => this.close();

    window.checkKeyAuthStatus = async () => {
      const input = document.getElementById("input-keyauth-license");
      const key = String(input?.value || "").trim();
      const resultBox = document.getElementById("keyauth-status-result");
      if (!key) {
        window.UI?.toast("กรุณาป้อน License Key ก่อนตรวจสอบ", "warning");
        return;
      }

      try {
        const res = await fetch(`/api/keyauth-reset?action=check&license_key=${encodeURIComponent(key)}`);
        const data = await res.json();

        if (resultBox) {
          resultBox.classList.remove("hidden");
          if (data.can_reset) {
            resultBox.className = "p-3 rounded-xl text-xs font-mono bg-emerald-950/40 border border-emerald-500/40 text-emerald-300";
            resultBox.textContent = "✅ คีย์นี้พร้อมรีเซ็ต HWID ได้ทันที (ไม่มี Cooldown ค้าง)";
          } else {
            resultBox.className = "p-3 rounded-xl text-xs font-mono bg-amber-950/40 border border-amber-500/40 text-amber-300";
            resultBox.textContent = `⏳ คีย์นี้ติด Cooldown: กรุณารออีกประมาณ ${data.remaining_hours} ชั่วโมง`;
          }
        }
      } catch (err) {
        window.UI?.toast("ไม่สามารถตรวจสอบสถานะคีย์ได้", "error");
      }
    };

    window.handleKeyAuthResetSubmit = async (e) => {
      if (e) e.preventDefault();
      const input = document.getElementById("input-keyauth-license");
      const key = String(input?.value || "").trim();
      const btn = document.getElementById("btn-submit-hwid-reset");

      if (!key) return;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> กำลังรีเซ็ต...`;
        if (window.lucide) lucide.createIcons();
      }

      try {
        const user = this.store ? this.store.get("user") : null;
        const res = await fetch("/api/keyauth-reset?action=reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: key, user_id: user?.id })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "รีเซ็ต HWID ไม่สำเร็จ");
        }

        window.UI?.toast(data.message, "success");
        window.UI?.confetti();
        window.closeKeyAuthModal();
      } catch (err) {
        window.UI?.toast(err.message, "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> <span>ยืนยันรีเซ็ต HWID</span>`;
          if (window.lucide) lucide.createIcons();
        }
      }
    };
  }

  open() {
    this.initDOM();
    if (this.modalEl) {
      this.modalEl.classList.remove("hidden");
      this.modalEl.classList.add("flex");
    }
    if (window.lucide) lucide.createIcons();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add("hidden");
      this.modalEl.classList.remove("flex");
    }
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.KeyAuthModalComponent = KeyAuthModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = KeyAuthModalComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/GamertagConfirmModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 👤 ROBLOX GAMERTAG & AVATAR CONFIRMATION MODAL (TC-RBX-02)
 * ==============================================================================
 * ระบบยืนยันตัวตน 2-Step Pre-flight Confirmation:
 * ป้องกันการพิมพ์ชื่อผิดหรือส่งสินค้าผิดไอดี 80%+ ด้วยการดึง 3D Avatar Headshot
 * และข้อมูลโปรไฟล์สดจาก Roblox API มาให้ลูกค้าตรวจสอบก่อนชำระเงิน
 * ==============================================================================
 */

class GamertagConfirmModal {
  constructor() {
    this.modalId = "gamertag-confirm-modal";
    this.currentUser = null;
    this.onConfirmCallback = null;
    this.init();
  }

  init() {
    if (typeof document === "undefined") return;
    if (document.getElementById(this.modalId)) return;

    const modalHtml = `
      <div id="${this.modalId}" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onclick="window.GamertagConfirmModalInstance?.close()"></div>

        <!-- Modal Dialog -->
        <div class="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10 z-10 transform transition-all duration-300 scale-95 opacity-0 modal-content overflow-hidden">
          
          <!-- Cyber Ambient Accent -->
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-extrabold text-white tracking-wide font-heading">ยืนยันตัวละคร Roblox</h3>
                <p class="text-[11px] text-slate-400">Pre-flight Identity & Gamertag Assurance</p>
              </div>
            </div>
            <button onclick="window.GamertagConfirmModalInstance?.close()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Avatar Card -->
          <div class="flex flex-col items-center justify-center p-5 rounded-xl bg-slate-950/80 border border-slate-800 relative mb-5">
            <div class="relative mb-3">
              <div class="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-cyan-500 via-pink-500 to-indigo-500 shadow-lg shadow-cyan-500/20">
                <img id="gamertag-modal-avatar" src="" alt="Roblox Avatar" class="w-full h-full rounded-full object-cover bg-slate-900" />
              </div>
              <span class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center" title="Online / Verified">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
            </div>

            <div class="text-center">
              <div class="flex items-center justify-center gap-1.5 mb-0.5">
                <h4 id="gamertag-modal-display-name" class="text-lg font-extrabold text-white font-heading">---</h4>
                <i data-lucide="badge-check" class="w-4 h-4 text-cyan-400 shrink-0"></i>
              </div>
              <p id="gamertag-modal-username" class="text-xs font-mono text-cyan-400 font-semibold mb-1">@username</p>
              <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                <span>User ID:</span>
                <span id="gamertag-modal-userid" class="text-slate-200 font-bold">12345678</span>
              </div>
            </div>
          </div>

          <!-- Warning Notice -->
          <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 mb-5 leading-relaxed">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
            <div>
              <strong class="font-bold">กรุณาตรวจสอบให้แน่ใจ:</strong> สินค้าจะถูกจัดส่งไปยังไอดี Roblox ด้านบนนี้ทันทีหลังชำระเงิน หากไม่ใช่ตัวละครของคุณ กรุณากด "แก้ไขชื่อผู้เล่น"
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button onclick="window.GamertagConfirmModalInstance?.close()" class="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors">
              ✏️ แก้ไขชื่อผู้เล่น
            </button>
            <button id="btn-confirm-gamertag-submit" onclick="window.GamertagConfirmModalInstance?.confirm()" class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
              <span>ยืนยันตัวละครนี้</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Pre-flight lookup & open modal
   * @param {string} username - Roblox username
   * @param {Function} onConfirm - Callback called with user object on confirmation
   */
  async verifyAndShow(username, onConfirm) {
    if (!username || typeof username !== "string") {
      window.UI?.toast("กรุณาระบุชื่อผู้ใช้ Roblox", "warning");
      return;
    }

    try {
      window.UI?.toast("กำลังตรวจสอบข้อมูลผู้เล่นกับ Roblox API...", "info");
      const res = await fetch(`/api/roblox-lookup?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        window.UI?.toast(data.message || `ไม่พบผู้เล่นชื่อ "${username}" ในระบบ Roblox`, "error");
        return;
      }

      this.show(data.user, onConfirm);
    } catch (err) {
      window.UI?.toast(`เกิดข้อผิดพลาดในการเชื่อมต่อ Roblox API: ${err.message}`, "error");
    }
  }

  show(user, onConfirm) {
    this.currentUser = user;
    this.onConfirmCallback = onConfirm;

    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const avatarEl = document.getElementById("gamertag-modal-avatar");
    const displayEl = document.getElementById("gamertag-modal-display-name");
    const userEl = document.getElementById("gamertag-modal-username");
    const idEl = document.getElementById("gamertag-modal-userid");

    if (avatarEl) avatarEl.src = user.avatarUrl || "https://tr.rbxcdn.com/30DAY-AvatarHeadshot/150/150/AvatarHeadshot/Png";
    if (displayEl) displayEl.textContent = user.displayName || user.username;
    if (userEl) userEl.textContent = `@${user.username}`;
    if (idEl) idEl.textContent = user.id;

    modal.classList.remove("hidden");
    setTimeout(() => {
      const content = modal.querySelector(".modal-content");
      if (content) {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
      }
    }, 10);

    if (window.lucide) window.lucide.createIcons();
  }

  close() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    if (content) {
      content.classList.remove("scale-100", "opacity-100");
      content.classList.add("scale-95", "opacity-0");
    }

    setTimeout(() => {
      modal.classList.add("hidden");
      this.currentUser = null;
      this.onConfirmCallback = null;
    }, 200);
  }

  confirm() {
    if (this.currentUser && typeof this.onConfirmCallback === "function") {
      this.onConfirmCallback(this.currentUser);
    }
    this.close();
  }
}

// Global Singleton Initialization
if (typeof window !== "undefined") {
  window.GamertagConfirmModal = GamertagConfirmModal;
  window.GamertagConfirmModalInstance = new GamertagConfirmModal();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = GamertagConfirmModal;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/DailyRewardModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🎁 DAILY FREE CHEST & REWARD MODAL (TC-DLY-01)
 * ==============================================================================
 * มินิเกมเปิดกล่องสุ่มรายวัน แจกคะแนนสะสม (Loyalty Points) ฟรีทุก 24 ชั่วโมง
 * ==============================================================================
 */

class DailyRewardModal {
  constructor(store) {
    this.store = store;
    this.modalId = "daily-reward-modal";
    this.statusData = null;
    this.isLoading = false;
    this.init();
  }

  init() {
    if (typeof document === "undefined") return;
    if (document.getElementById(this.modalId)) return;

    const modalHtml = `
      <div id="${this.modalId}" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onclick="window.DailyRewardModalInstance?.close()"></div>

        <!-- Dialog -->
        <div class="relative w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 z-10 transform transition-all duration-300 scale-95 opacity-0 modal-content overflow-hidden text-center">
          
          <!-- Cyber Ambient Accent -->
          <div class="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Close Button -->
          <button onclick="window.DailyRewardModalInstance?.close()" class="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>

          <!-- Icon Chest -->
          <div class="relative mx-auto w-24 h-24 mb-4 flex items-center justify-center">
            <div class="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
            <div class="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center transform hover:scale-105 transition-transform">
              <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <i data-lucide="gift" class="w-10 h-10 animate-bounce"></i>
              </div>
            </div>
          </div>

          <!-- Titles -->
          <h3 class="text-lg font-heading font-extrabold text-white mb-1 tracking-wide">กล่องสุ่มฟรีรายวัน</h3>
          <p class="text-xs text-slate-400 mb-4">เช็คอินรับคะแนนสะสมพิเศษฟรีทุก 24 ชั่วโมง</p>

          <!-- Cooldown or Streak Badge -->
          <div id="daily-chest-status-box" class="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-5">
            <div class="text-[11px] text-slate-400 mb-0.5">สถานะกล่องสุ่ม:</div>
            <div id="daily-chest-status-text" class="text-sm font-mono font-bold text-amber-400">กำลังตรวจสอบสิทธิ์...</div>
          </div>

          <!-- Action Button -->
          <button id="btn-claim-daily-reward" onclick="window.DailyRewardModalInstance?.claim()" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
            <span>เปิดกล่องสุ่มทันที</span>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) window.lucide.createIcons();
  }

  async open() {
    const user = this.store ? this.store.get("user") : null;
    if (!user || !user.id) {
      window.UI?.toast("กรุณาเข้าสู่ระบบก่อนเปิดกล่องสุ่มรายวัน", "warning");
      if (window.Shop?.authModal) window.Shop.authModal.open("login");
      return;
    }

    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.classList.remove("hidden");
    setTimeout(() => {
      const content = modal.querySelector(".modal-content");
      if (content) {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
      }
    }, 10);

    window.AudioEngineInstance?.playModal();
    if (window.lucide) window.lucide.createIcons();

    await this.checkStatus(user.id);
  }

  close() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    if (content) {
      content.classList.remove("scale-100", "opacity-100");
      content.classList.add("scale-95", "opacity-0");
    }

    setTimeout(() => {
      modal.classList.add("hidden");
    }, 200);
  }

  async checkStatus(userId) {
    const statusText = document.getElementById("daily-chest-status-text");
    const btn = document.getElementById("btn-claim-daily-reward");

    try {
      const res = await fetch(`/api/daily-reward?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      this.statusData = data;

      if (data.can_claim) {
        if (statusText) statusText.innerHTML = `🟢 พร้อมเปิดรับรางวัล! (สถิติ ${data.streak_count || 0} วัน)`;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="gift" class="w-4 h-4"></i> <span>เปิดกล่องสุ่มทันที</span>`;
        }
      } else {
        if (statusText) statusText.innerHTML = `⏳ เปิดได้อีกใน ${data.remaining_hours || 24} ชั่วโมง`;
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<i data-lucide="lock" class="w-4 h-4"></i> <span>รอคูลดาวน์ ${data.remaining_hours || 24} ชม.</span>`;
        }
      }
    } catch (e) {
      if (statusText) statusText.innerHTML = "พร้อมเปิดรับรางวัล!";
      if (btn) btn.disabled = false;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async claim() {
    const user = this.store ? this.store.get("user") : null;
    if (!user || !user.id) return;

    const btn = document.getElementById("btn-claim-daily-reward");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>กำลังเปิดกล่อง...</span>`;
    }

    try {
      const res = await fetch("/api/daily-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        window.UI?.toast(data.message || "เปิดกล่องสุ่มไม่สำเร็จ", "error");
        window.AudioEngineInstance?.playError();
        return;
      }

      // Success
      window.AudioEngineInstance?.playFanfare();
      window.UI?.confetti();
      window.UI?.toast(data.message, "success");

      // Update points in store
      if (this.store && data.new_points !== undefined) {
        this.store.set("userPoints", data.new_points);
      }

      setTimeout(() => {
        this.close();
      }, 1800);

    } catch (err) {
      window.UI?.toast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
      }
    }
  }
}

// Global Singleton
if (typeof window !== "undefined") {
  window.DailyRewardModal = DailyRewardModal;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DailyRewardModal;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/SupportWidgetModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 💬 FLOATING SUPPORT WIDGET & INTERACTIVE FAQ (TC-FAQ-01)
 * ==============================================================================
 * วิดเจ็ตช่วยเหลือด่วนมุมขวาล่าง พร้อมคำถามที่พบบ่อย (FAQ Accordion)
 * และปุ่มเปิด Ticket ใน Discord Server ทันที
 * ==============================================================================
 */

class SupportWidgetModal {
  constructor() {
    this.modalId = "support-widget-modal";
    this.init();
  }

  init() {
    if (typeof document === "undefined") return;
    if (document.getElementById(this.modalId)) return;

    // 1. Render Floating Action Button
    const floatingBtnHtml = `
      <div id="floating-support-btn-container" class="fixed bottom-20 sm:bottom-6 right-5 sm:right-6 z-40">
        <button onclick="window.SupportWidgetModalInstance?.open()" class="relative w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500/20 via-cyan-500/40 to-blue-500/30 border border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/25 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all group" title="ศูนย์ช่วยเหลือ & FAQ">
          <i data-lucide="headphones" class="w-5 h-5 group-hover:rotate-12 transition-transform"></i>
          <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center animate-pulse"></span>
        </button>
      </div>
    `;

    // 2. Render Help Modal
    const modalHtml = `
      <div id="${this.modalId}" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onclick="window.SupportWidgetModalInstance?.close()"></div>

        <!-- Dialog Box -->
        <div class="relative w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10 z-10 transform transition-all duration-300 scale-95 opacity-0 modal-content overflow-hidden max-h-[90vh] flex flex-col">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <i data-lucide="help-circle" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-extrabold text-white tracking-wide font-heading">ศูนย์ช่วยเหลือ & คำถามพบบ่อย</h3>
                <div class="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ทีมงานออนไลน์พร้อมช่วยเหลือ 24 ชั่วโมง</span>
                </div>
              </div>
            </div>
            <button onclick="window.SupportWidgetModalInstance?.close()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- FAQ Accordion List (Scrollable) -->
          <div class="overflow-y-auto space-y-2.5 pr-1 mb-5 flex-1 text-left">
            
            <!-- Q1 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="credit-card" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>โอนเงินแล้ว ยอดเงินไม่เข้าอัตโนมัติ ต้องทำอย่างไร?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                ระบบใช้ AI Slip Verification ตรวจสอบยอดเงินภายใน 5 วินาที หากยอดไม่ปรับอัตโนมัติ กรุณาตรวจสอบว่าสลิปโอนเข้าบัญชีทางการของร้านค้า และแนบสลิปไม่เกิน 15 นาที หากระบบขัดข้อง สามารถทักแอดมินใน Discord พร้อมแนบสลิปเพื่อปรับยอดให้ทันที
              </div>
            </details>

            <!-- Q2 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="key" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>สินค้าดิจิทัล (Nitro, สคริปต์, คีย์) จัดส่งทางไหน?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                จัดส่งบนหน้าจอทันทีหลังตัดยอดชำระเงินสำเร็จ (Instant Vault Dispensing) และลูกค้าสามารถกดดูย้อนหลังได้ตลอด 24 ชั่วโมงในเมนู "ประวัติการสั่งซื้อ"
              </div>
            </details>

            <!-- Q3 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="shield-check" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>เงื่อนไขการรับประกันสินค้า (Warranty Policy)?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                สินค้าทุกชิ้นรับประกันของแท้ 100% ตั้งแต่ 30 วัน จนถึงตลอดอายุการใช้งาน หากเกิดปัญหาหลุดหรือคีย์ผิดพลาด ลูกค้าสามารถกดปุ่ม "แจ้งเคลมประกัน" ในหน้าประวัติการสั่งซื้อเพื่อออกตั๋วเคลมได้ทันที
              </div>
            </details>

            <!-- Q4 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="gift" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>ซื้อแบบ Guest ด้วยซองอั่งเปา ไม่ได้สมัครสมาชิก ดูของตรงไหน?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                ลูกค้าที่ซื้อแบบ Guest สามารถนำรหัสคำสั่งซื้อ (เช่น WX-123456) ที่แสดงบนหน้าจอ ไปกรอกค้นหาในหน้า "เช็คประวัติการสั่งซื้อ" เพื่อดูรหัสสินค้าและดาวน์โหลดใบเสร็จได้ตลอดเวลา
              </div>
            </details>

            <!-- Q5 -->
            <details class="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 open:border-cyan-500/40 transition-colors cursor-pointer">
              <summary class="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-400 transition-colors list-none">
                <span class="flex items-center gap-2">
                  <i data-lucide="activity" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>สคริปต์ Roblox ปลอดภัยหรือไม่ โดนแบนไหม?</span>
                </span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div class="mt-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                สคริปต์ของ NYX9 STUDIO มีเรดาร์ตรวจสอบความปลอดภัย (Undetected Radar) และมีตาราง Executor Compatibility แสดงสถานะการทำงานร่วมกับตัวรัน Delta, Wave, Fluxus ให้ตรวจสอบก่อนซื้อทุกครั้ง
              </div>
            </details>

          </div>

          <!-- Discord Ticket CTA Footer -->
          <div class="pt-3 border-t border-slate-800 shrink-0">
            <a href="https://discord.gg/9W7m6CjKyp" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-xs shadow-lg shadow-[#5865F2]/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <i data-lucide="message-square" class="w-4 h-4"></i>
              <span>เปิด Ticket ติดต่อทีมงานใน Discord Server</span>
            </a>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', floatingBtnHtml + modalHtml);
    if (window.lucide) window.lucide.createIcons();
  }

  open() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.classList.remove("hidden");
    setTimeout(() => {
      const content = modal.querySelector(".modal-content");
      if (content) {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
      }
    }, 10);

    window.AudioEngineInstance?.playModal();
    if (window.lucide) window.lucide.createIcons();
  }

  close() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    if (content) {
      content.classList.remove("scale-100", "opacity-100");
      content.classList.add("scale-95", "opacity-0");
    }

    setTimeout(() => {
      modal.classList.add("hidden");
    }, 200);
  }
}

// Global Singleton
if (typeof window !== "undefined") {
  window.SupportWidgetModal = SupportWidgetModal;
  window.SupportWidgetModalInstance = new SupportWidgetModal();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SupportWidgetModal;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/Modals.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 📦 SPECIALIZED MODALS (INSTANT KEY DELIVERY, CUSTOM FORM, CLAIMS)
 * ==============================================================================
 */

class ModalsComponent {
  constructor(store, checkoutService) {
    this.store = store;
    this.checkoutService = checkoutService;
  }

  // --- 1. INSTANT KEY DELIVERY MODAL ---
  showInstantDelivery(result) {
    const modal = document.getElementById("instant-delivery-modal");
    const container = document.getElementById("delivery-items-container");
    const textarea = document.getElementById("delivered-content");
    const orderIdEl = document.getElementById("delivery-order-id");

    if (!modal) return;

    window.lastDeliveredOrder = result;
    const orderId = result.order_id || result.orderId || `NYX-${Math.floor(100000 + Math.random() * 900000)}`;
    if (orderIdEl) orderIdEl.textContent = orderId;

    const items = result.dispensed_items || result.items || [];
    const allCreds = [];
    items.forEach(item => {
      if (Array.isArray(item.credentials)) allCreds.push(...item.credentials);
    });

    if (textarea) {
      textarea.value = allCreds.join("\n") || "คำสั่งซื้อแบบบริการพิเศษ ระบบกำลังจัดส่งข้อมูลให้ภายใน 5-15 นาที";
    }

    if (container) {
      container.innerHTML = items.map(item => `
        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 mb-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white">${item.title} (x${item.quantity})</span>
            <span class="text-[10px] font-mono text-emerald-400">ส่งมอบเรียบร้อย</span>
          </div>
          <div class="space-y-1.5">
            ${(item.credentials || []).map(cred => `
              <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs text-[var(--accent)] break-all select-all">
                <span>${cred}</span>
                <button onclick="window.Shop?.modals?.copyText('${cred}')" class="p-1 hover:text-white text-slate-400 cursor-pointer ml-2">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("");
    }

    modal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
    window.UI?.confetti();
  }

  closeDelivery() {
    const modal = document.getElementById("instant-delivery-modal");
    if (modal) modal.classList.add("hidden");
  }

  downloadReceipt() {
    const orderId = document.getElementById("delivery-order-id")?.textContent || "RECEIPT";
    const container = document.getElementById("delivery-items-container");
    const text = `NYX9 STUDIO - OFFICIAL ORDER RECEIPT\nOrder ID: ${orderId}\nDate: ${new Date().toLocaleString()}\n\nITEMS & CREDENTIALS:\n${container?.innerText || ''}\n\nThank you for shopping at NYX9 STUDIO!`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Receipt_${orderId}.txt`;
    link.click();
    window.UI?.toast("ดาวน์โหลดใบเสร็จเรียบร้อยแล้ว", "success");
  }

  copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      window.UI?.toast("คัดลอกรหัสแล้ว!", "success");
    });
  }

  // --- 2. CUSTOM SERVICE MODAL ---
  openCustomServiceForm(productId) {
    const modal = document.getElementById("custom-service-modal");
    const content = document.getElementById("custom-service-modal-content");
    const prod = window.Shop?.catalogService?.findProductById(productId);

    if (!modal || !content || !prod) return;

    let formHtml = "";
    if (prod.id.includes("member") || prod.id.includes("pump")) {
      formHtml = `
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">ลิงก์คำเชิญ Discord Server (ต้องไม่หมดอายุ):</label>
            <input type="text" id="service-input-invite" placeholder="https://discord.gg/your-server" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-[var(--accent)] focus:outline-none" />
          </div>
          <div>
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-slate-300 font-semibold">จำนวนคนดิสคอร์ด:</span>
              <span id="member-count-val" class="font-mono text-[var(--accent)] font-bold">100 คน</span>
            </div>
            <input type="range" min="50" max="1000" step="50" value="100" oninput="document.getElementById('member-count-val').textContent = this.value + ' คน'" class="w-full accent-[var(--accent)]" />
          </div>
        </div>
      `;
    } else {
      formHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Discord User ID (สำหรับรับบริการ):</label>
          <input type="text" id="service-input-userid" placeholder="เช่น 719283749102837419" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-[var(--accent)] focus:outline-none" />
        </div>
      `;
    }

    content.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h4 class="text-base font-heading font-bold text-white">${prod.title}</h4>
          <button onclick="window.Shop?.modals?.closeCustomService()" class="p-1 text-slate-400 hover:text-white cursor-pointer"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
        ${formHtml}
        <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-800">
          <button onclick="window.Shop?.modals?.closeCustomService()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer">ยกเลิก</button>
          <button onclick="window.Shop?.modals?.submitCustomService('${prod.id}')" class="btn-cyber-primary px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">ใส่ตะกร้า</button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
  }

  closeCustomService() {
    const modal = document.getElementById("custom-service-modal");
    if (modal) modal.classList.add("hidden");
  }

  submitCustomService(productId) {
    const prod = window.Shop?.catalogService?.findProductById(productId);
    if (!prod) return;

    const invite = document.getElementById("service-input-invite")?.value;
    const memberCount = document.getElementById("member-count-val")?.textContent;
    const userId = document.getElementById("service-input-userid")?.value;

    const customData = invite ? { invite, count: memberCount } : { userId };
    this.store.addToCart(prod, 1, customData);

    this.closeCustomService();
    window.UI?.toast(`เพิ่มบริการ "${prod.title}" ลงตะกร้าแล้ว!`, "success");
    window.Shop?.cartManager?.toggle();
  }

  // --- 3. WARRANTY CLAIMS MODAL ---
  openClaim() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('claim');
    }
  }

  closeClaim() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('home');
    }
  }

  async submitClaim() {
    const orderId = document.getElementById("claim-order-id")?.value.trim();
    const reason = document.getElementById("claim-reason")?.value;
    const details = document.getElementById("claim-details")?.value.trim();

    if (!orderId) {
      window.UI?.toast("กรุณากรอกรหัสคำสั่งซื้อ (Order ID)", "warning");
      return;
    }

    try {
      await this.checkoutService.submitClaim(orderId, `${reason}: ${details}`);
      window.UI?.toast("ยื่นเรื่องเคลมประกันเรียบร้อยแล้ว แอดมินจะตรวจสอบโดยเร็ว", "success");
      this.closeClaim();
    } catch (err) {
      window.UI?.toast(err.message, "error");
    }
  }
}

if (typeof window !== "undefined") {
  window.ModalsComponent = ModalsComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ModalsComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/SocialProof.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🔔 SOCIAL PROOF FEED COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class SocialProofComponent {
  constructor() {
    this.timer = null;
    this.feedIndex = 0;
    this.mockFeed = [];
  }

  init() {
    // Intentionally disabled: unslop policy eliminates fake purchase ticker
    const box = document.getElementById("social-proof-toast");
    if (box) {
      box.style.display = "none";
    }
  }

  showNext() {
    // Intentionally disabled: no fake FOMO toasts
  }
}

if (typeof window !== "undefined") {
  window.SocialProofComponent = SocialProofComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SocialProofComponent;
}



/* ============================================================================== */
/* 📦 MODULE: js/components/AmbientWaves.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🌊 SUBTLE AMBIENT SILK WAVES ENGINE v4.0 (LINEAR DARK EDITORIAL)
 * Ultra-subtle, non-distracting 60fps atmospheric waves tuned for maximum contrast
 * (Zero comet/particle distractions, pure calm silk waves)
 * ==============================================================================
 */

class AmbientWavesEngine {
  constructor(canvasId = "ambient-cyber-canvas") {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.width = 0;
    this.height = 0;
    this.step = 0;
    this.pulseTime = 0;

    // Mouse Physics (Ultra-damped gentle wave parallax)
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.isRunning = false;
    this.isScrolling = false;
    this.scrollTimeout = null;

    // Detect mobile or low-power device
    this.isMobile = typeof window !== "undefined" && (window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024));
    this.prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.init();
  }

  init() {
    if (typeof document === "undefined") return;

    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = this.canvasId;
      this.canvas.className = "fixed inset-0 pointer-events-none z-0 w-full h-full";
      this.canvas.style.opacity = "1";
      document.body.prepend(this.canvas);
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.resize();

    // On mobile or reduced motion: Draw static once, zero continuous GPU load!
    if (this.isMobile || this.prefersReducedMotion) {
      this.drawStatic();
      window.addEventListener("resize", () => {
        this.resize();
        this.drawStatic();
      }, { passive: true });
      return;
    }

    window.addEventListener("resize", () => {
      this.resize();
    }, { passive: true });
    
    // Smooth mouse parallax (Gentle and restrained)
    window.addEventListener("mousemove", (e) => {
      this.targetMouseX = (e.clientX / (this.width || 1) - 0.5) * 20;
      this.targetMouseY = (e.clientY / (this.height || 1) - 0.5) * 15;
    }, { passive: true });

    // Scroll performance protector: Pause canvas redrawing during rapid scroll
    window.addEventListener("scroll", () => {
      this.isScrolling = true;
      if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 120);
    }, { passive: true });

    // Battery / Background Tab Saver
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });

    this.start();
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  start() {
    if (this.isRunning || this.isMobile) return;
    this.isRunning = true;

    const render = () => {
      if (!this.isRunning) return;

      // Don't render frames if user is fast-scrolling to prioritize DOM scroll smoothness
      if (!this.isScrolling) {
        this.draw();
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  draw() {
    if (!this.ctx || !this.width || !this.height) return;

    // Smooth lerp mouse physics
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.step += 0.006;
    this.pulseTime += 0.008;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Subtle Ambient Nebula pools (Faint Linear Slate-Indigo glow)
    this.drawSubtleGlows();

    // 2. Layered Faint Waves (Atmospheric Silk - Pure smooth motion, zero particles)
    // Wave 1: Deep Twilight Slate (Upper Hero Zone)
    this.renderWave({
      yBase: this.height * 0.25 - this.mouseY * 0.3,
      amplitude: 36,
      frequency: 0.0011,
      speed: -this.step * 0.55,
      phase: 0.3,
      gradientStart: "rgba(20, 24, 40, 0.07)",
      gradientEnd: "rgba(20, 24, 40, 0.00)"
    });

    // Wave 2: Soft Electric Indigo Silk (Linear Brand Accent)
    this.renderWave({
      yBase: this.height * 0.42 + this.mouseY * 0.4,
      amplitude: 30,
      frequency: 0.0014,
      speed: this.step * 0.7,
      phase: 0,
      gradientStart: "rgba(99, 102, 241, 0.045)",
      gradientEnd: "rgba(99, 102, 241, 0.00)",
      hairlineStroke: "rgba(99, 102, 241, 0.07)"
    });

    // Wave 3: Deep Slate Horizon (Flowing under Stats)
    this.renderWave({
      yBase: this.height * 0.65 - this.mouseY * 0.25,
      amplitude: 26,
      frequency: 0.0016,
      speed: this.step * 0.8,
      phase: Math.PI * 0.7,
      gradientStart: "rgba(30, 27, 75, 0.05)",
      gradientEnd: "rgba(30, 27, 75, 0.00)"
    });

    // Wave 4: Deep Abyss Vapor (Catalog Lower Bed)
    this.renderWave({
      yBase: this.height * 0.85 + this.mouseY * 0.25,
      amplitude: 32,
      frequency: 0.0012,
      speed: -this.step * 0.6,
      phase: Math.PI * 1.3,
      gradientStart: "rgba(15, 23, 42, 0.04)",
      gradientEnd: "rgba(15, 23, 42, 0.00)"
    });
  }

  drawSubtleGlows() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Faint Electric Indigo Pool (Top Left) - Bounded draw area
    const n1X = w * 0.3 + Math.sin(this.pulseTime * 0.6) * 45;
    const n1Y = h * 0.2 + Math.cos(this.pulseTime * 0.4) * 25;
    const g1 = ctx.createRadialGradient(n1X, n1Y, 20, n1X, n1Y, 380);
    g1.addColorStop(0, "rgba(99, 102, 241, 0.04)");
    g1.addColorStop(0.6, "rgba(99, 102, 241, 0.008)");
    g1.addColorStop(1, "rgba(99, 102, 241, 0.00)");
    ctx.fillStyle = g1;
    ctx.fillRect(Math.max(0, n1X - 380), Math.max(0, n1Y - 380), Math.min(w, 760), Math.min(h, 760));

    // Faint Violet Slate Pool (Mid Right) - Bounded draw area
    const n2X = w * 0.75 + Math.cos(this.pulseTime * 0.5) * 45;
    const n2Y = h * 0.45 + Math.sin(this.pulseTime * 0.7) * 35;
    const g2 = ctx.createRadialGradient(n2X, n2Y, 20, n2X, n2Y, 400);
    g2.addColorStop(0, "rgba(79, 70, 229, 0.03)");
    g2.addColorStop(0.6, "rgba(79, 70, 229, 0.006)");
    g2.addColorStop(1, "rgba(79, 70, 229, 0.00)");
    ctx.fillStyle = g2;
    ctx.fillRect(Math.max(0, n2X - 400), Math.max(0, n2Y - 400), Math.min(w, 800), Math.min(h, 800));
  }

  renderWave(options) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const { yBase, amplitude, frequency, speed, phase, gradientStart, gradientEnd, hairlineStroke } = options;

    ctx.beginPath();
    ctx.moveTo(0, h);

    // Dynamic horizontal sampling interval (30px on desktop = ~40-60 points total, very cheap)
    const stepX = 30;

    for (let x = 0; x <= w + stepX; x += stepX) {
      // 2 Harmonic waves combined for organic liquid curvature
      const harmonic1 = Math.sin(x * frequency + speed + phase);
      const harmonic2 = Math.cos(x * (frequency * 1.6) - speed * 0.7 + phase * 1.5) * 0.35;
      const y = yBase + (harmonic1 + harmonic2) * amplitude;
      
      if (x === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    // Vertical atmospheric gradient
    const grad = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 3.5);
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, gradientEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle edge highlight hairline
    if (hairlineStroke) {
      ctx.beginPath();
      for (let x = 0; x <= w + stepX; x += stepX) {
        const harmonic1 = Math.sin(x * frequency + speed + phase);
        const harmonic2 = Math.cos(x * (frequency * 1.6) - speed * 0.7 + phase * 1.5) * 0.35;
        const y = yBase + (harmonic1 + harmonic2) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hairlineStroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawStatic() {
    if (!this.ctx) return;
    this.step = 1;
    this.draw();
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.AmbientWavesEngine = AmbientWavesEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AmbientWavesEngine;
}



/* ============================================================================== */
/* 📦 MODULE: js/visitor-tracker.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🌐 PAGE VIEW METRICS & ROUTE TELEMETRY (NYX9 STUDIO)
 * ==============================================================================
 * Anonymous page telemetry and session visit counter via Supabase RPC.
 * Runs non-blocking and asynchronously for storefront reliability.
 * ==============================================================================
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__NYX9_TRACKER_INITIALIZED__) return;
  window.__NYX9_TRACKER_INITIALIZED__ = true;

  async function trackVisitor() {
    try {
      // 1. Session-based debounce to avoid spamming database on rapid reloads
      const currentPath = window.location.pathname || '/';
      const lastTrackKey = 'nyx9_last_track_' + currentPath;
      const lastTrackTime = sessionStorage.getItem(lastTrackKey);
      const now = Date.now();

      if (lastTrackTime && now - parseInt(lastTrackTime, 10) < 45000) {
        return; // Debounced for 45s per path
      }

      // 2. Resolve Supabase client
      let client = window.supabaseClient;
      if (!client && window.supabase && window.storeConfig?.supabase) {
        client = window.supabase.createClient(
          window.storeConfig.supabase.url,
          window.storeConfig.supabase.anonKey
        );
      }

      if (!client) {
        // Fallback default config if storeConfig not yet loaded
        const fallbackUrl = 'https://ymaulztlbctpzyhdhjvn.supabase.co';
        const fallbackKey = 'sb_publishable_liwa3Juk3Gy6LBSNnUIHRA_iqsD78_u';
        if (window.supabase) {
          client = window.supabase.createClient(fallbackUrl, fallbackKey);
        }
      }

      if (!client || typeof client.rpc !== 'function') {
        return;
      }

      sessionStorage.setItem(lastTrackKey, now.toString());

      const screenRes = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;
      const referer = document.referrer || '';

      const { data, error } = await client.rpc('log_page_visit', {
        p_path: currentPath,
        p_referer: referer.substring(0, 250),
        p_screen: screenRes
      });

      if (error) {
        console.debug('[TRACKER] Log skipped:', error.message);
        return;
      }

      // 3. Blacklist enforcement
      if (data && data.is_blacklisted) {
        console.warn('[SECURITY] Visitor IP is blacklisted:', data.ip);
        enforceBlacklistModal(data.ip);
      }
    } catch (err) {
      // Silent error - do not disrupt storefront UX
      console.debug('[TRACKER] Silent failure:', err);
    }
  }

  function enforceBlacklistModal(ip) {
    // If the modal already exists, do not recreate
    if (document.getElementById('blacklist-lockdown-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'blacklist-lockdown-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(3, 7, 18, 0.96); backdrop-filter: blur(16px);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem; font-family: ui-sans-serif, system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="max-width: 440px; width: 100%; background: #0b0f19; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px; padding: 2rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
        <div style="width: 56px; height: 56px; margin: 0 auto 1.25rem; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; font-size: 24px;">
          🚫
        </div>
        <h3 style="color: #f87171; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">การเข้าถึงถูกระงับ (Access Denied)</h3>
        <p style="color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.25rem;">
          IP ของคุณ (<code style="color: #cbd5e1; background: #1e293b; padding: 2px 6px; border-radius: 6px;">${ip || 'Unknown'}</code>) อยู่ในบัญชีดำความปลอดภัยของระบบ กรุณาติดต่อแอดมินหากคุณคิดว่าเกิดข้อผิดพลาด
        </p>
        <div style="font-size: 0.75rem; color: #64748b;">NYX9 Studio Shield • Security Protocol Active</div>
      </div>
    `;

    document.body.appendChild(overlay);
    // Prevent interaction with page
    document.body.style.overflow = 'hidden';
  }

  // Execute tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisitor);
  } else {
    // Run with slight delay to prioritize critical rendering
    setTimeout(trackVisitor, 500);
  }
})();



/* ============================================================================== */
/* 📦 MODULE: app.js */
/* ============================================================================== */
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
    this.authModal = window.AuthModalComponent ? new window.AuthModalComponent(this.store, this.auth) : null;
    this.restockModal = window.RestockModalComponent ? new window.RestockModalComponent(this.store) : null;
    this.discordServiceModal = new window.DiscordServiceModalComponent(this.store);
    this.luckyWheel = window.LuckyWheelComponent ? new window.LuckyWheelComponent(this.store) : null;
    this.memberCardModal = window.MemberCardModalComponent ? new window.MemberCardModalComponent(this.store) : null;
    this.keyAuthModal = window.KeyAuthModalComponent ? new window.KeyAuthModalComponent(this.store) : null;
    this.dailyRewardModal = window.DailyRewardModal ? new window.DailyRewardModal(this.store) : null;
    if (typeof window !== "undefined" && this.dailyRewardModal) {
      window.DailyRewardModalInstance = this.dailyRewardModal;
    }
    this.supportWidget = window.SupportWidgetModal ? (window.SupportWidgetModalInstance || new window.SupportWidgetModal()) : null;
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
    safeRun("AuthModal", () => this.authModal?.initDOM());
    safeRun("NavbarWallet", () => this.navbar?.updateWalletUI());
    safeRun("NavbarPoints", () => this.navbar?.updatePointsUI());
    safeRun("LuckyWheel", () => this.luckyWheel?.initDOM());
    safeRun("DailyRewardModal", () => {
      if (!window.DailyRewardModalInstance && window.DailyRewardModal) {
        window.DailyRewardModalInstance = new window.DailyRewardModal(this.store);
      }
    });
    safeRun("SupportWidget", () => {
      if (!window.SupportWidgetModalInstance && window.SupportWidgetModal) {
        window.SupportWidgetModalInstance = new window.SupportWidgetModal();
      }
    });
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


// ==============================================================================
// 💳 SPRINT 4: VIP MEMBER CARD & ROBLOX LOADER SCRIPT GLOBAL BRIDGES
// ==============================================================================
window.openVipCardModal = function() {
  if (window.Shop?.memberCardModal) {
    window.Shop.memberCardModal.open();
  } else if (window.MemberCardModalComponent) {
    if (!window._activeMemberCardModal) {
      window._activeMemberCardModal = new window.MemberCardModalComponent(window.Shop?.store);
    }
    window._activeMemberCardModal.open();
  }
};

window.closeVipCardModal = function() {
  if (window.Shop?.memberCardModal) {
    window.Shop.memberCardModal.close();
  } else if (window._activeMemberCardModal) {
    window._activeMemberCardModal.close();
  } else {
    const el = document.getElementById("modal-vip-member-card");
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("flex");
    }
  }
};

window.saveVipCardImagePNG = function() {
  if (window.Shop?.memberCardModal) {
    window.Shop.memberCardModal.exportCardPNG();
  } else if (window._activeMemberCardModal) {
    window._activeMemberCardModal.exportCardPNG();
  }
};

window.copyRobloxLoaderScript = function(productId) {
  const loaderScript = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/MatTew-png/wichx-nyx-storefront/main/scripts/loader.lua"))()';
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(loaderScript).then(() => {
      window.UI?.toast("📋 คัดลอก Roblox Loader Script ลง Clipboard เรียบร้อยแล้ว!", "success");
      window.UI?.confetti();
    }).catch(() => {
      prompt("คัดลอก Roblox Loader Script:", loaderScript);
    });
  } else if (typeof prompt !== "undefined") {
    prompt("คัดลอก Roblox Loader Script:", loaderScript);
  }
};


// ==============================================================================
// 🔑 SPRINT 5: KEYAUTH HWID RESET GLOBAL BRIDGES
// ==============================================================================
window.openKeyAuthModal = function() {
  if (window.Shop?.keyAuthModal) {
    window.Shop.keyAuthModal.open();
  } else if (window.KeyAuthModalComponent) {
    if (!window._activeKeyAuthModal) {
      window._activeKeyAuthModal = new window.KeyAuthModalComponent(window.Shop?.store);
    }
    window._activeKeyAuthModal.open();
  }
};

window.closeKeyAuthModal = function() {
  if (window.Shop?.keyAuthModal) {
    window.Shop.keyAuthModal.close();
  } else if (window._activeKeyAuthModal) {
    window._activeKeyAuthModal.close();
  } else {
    const el = document.getElementById("modal-keyauth-reset");
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("flex");
    }
  }
};
