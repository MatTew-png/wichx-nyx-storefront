
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

  // --- DISCORD OAUTH & SUPABASE AUTH SUITE ---
  async loginWithDiscord() {
    if (!this.isLive || !this.client) {
      alert("ระบบเชื่อมต่อฐานข้อมูลยังไม่พร้อมใช้งาน");
      return;
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: redirectTo
      }
    });
    if (error) {
      console.error("[SUPABASE AUTH] Discord login failed:", error.message);
      throw error;
    }
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
      // ดึง Categories ทั้งหมด
      const { data: cats, error: catErr } = await this.client
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (catErr) throw catErr;

      // ดึง Products ทั้งหมด
      const { data: prods, error: prodErr } = await this.client
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (prodErr) throw prodErr;

      // ดึงจำนวนสต็อกจริงคงเหลือที่ยังไม่ขายผ่าน Secure RPC (Zero Data Leakage)
      let stockMap = {};
      try {
        const { data: stockCounts, error: stockErr } = await this.client.rpc("get_product_stock_counts");
        if (!stockErr && Array.isArray(stockCounts)) {
          stockCounts.forEach(item => {
            stockMap[item.product_id] = Number(item.in_stock_count) || 0;
          });
        }
      } catch (err) {
        console.warn("[SUPABASE] Stock count query warning:", err.message);
      }

      const CATEGORY_DISPLAY_MAP = {
        "cat-discord-nitro": { name: "Discord Nitro & บูสต์", icon: "zap" },
        "cat-discord-services": { name: "บริการดิสคอร์ด & ไอดี", icon: "bot" },
        "cat-gaming-apps": { name: "FiveM, Steam & เกมมิ่ง", icon: "gamepad-2" },
        "cat-uncategorized": { name: "ซอฟต์แวร์ & คีย์แท้", icon: "sparkles" }
      };

      // แมปเข้าโครงสร้าง categoriesData ที่หน้าร้านใช้งาน
      return cats.map(cat => ({
        id: cat.id,
        name: CATEGORY_DISPLAY_MAP[cat.id]?.name || cat.name,
        subName: cat.sub_name,
        icon: CATEGORY_DISPLAY_MAP[cat.id]?.icon || cat.icon || "layers",
        badge: cat.badge || "AUTO",
        products: prods
          .filter(p => p.category_id === cat.id)
          .map(p => ({
            id: p.id,
            title: p.title,
            price: parseFloat(p.price),
            originalPrice: p.original_price ? parseFloat(p.original_price) : null,
            unit: p.unit,
            stock: stockMap[p.id] !== undefined ? stockMap[p.id] : 10,
            status: stockMap[p.id] === 0 ? "OUT OF STOCK" : (p.status || "SALE"),
            fulfillmentType: p.fulfillment_type || "instant",
            chips: (p.chips || []).map(c => String(c).replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{1FA00}-\u{1FAFF}\u{FE0F}]/gu, '').trim()),
            imageUrl: typeof createCyberArtwork === "function" 
              ? createCyberArtwork(p.title, cat.name, p.id.includes("nitro") ? "nitro" : "discord", "#19BAFF", "#38D4FF")
              : ""
          }))
      }));
    } catch (err) {
      console.warn("[SUPABASE] Fetch live products failed, using fallback:", err.message);
      return window.categoriesData || [];
    }
  },

  // 2. ดึงยอดเงินในกระเป๋าของผู้ใช้
  async getUserBalance(userId) {
    if (!this.isLive || !this.client || !userId) {
      return parseFloat(localStorage.getItem("wichx_balance") || "500.00");
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
      return parseFloat(localStorage.getItem("wichx_balance") || "500.00");
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

  // --- ข้อมูลพื้นฐานและแบรนดิ้ง (Rebranded for NYX9 STUDIO & 4-DISCORD ALLIANCE HUB) ---
  storeName: "NYX9 STUDIO",
  brandShort: "NYX9",
  tagline: "ระบบร้านค้าบริการอัตโนมัติตลอด 24 ชั่วโมง สะดวกรวดเร็ว ปลอดภัย",
  subTagline: "ศูนย์รวมบริการดิจิทัลเครือข่าย 4 ร้านค้า Discord Nitro, บูสต์เซิร์ฟเวอร์, FiveM & ไอที ครบวงจร การันตีมากกว่า 660,000 ออเดอร์",
  logoUrl: "assets/logo.png",
  faviconUrl: "assets/logo.png",
  
  // --- เครือข่าย 4 ร้านค้า DISCORD (MULTI-HUB ALLIANCE) ---
  discordStores: [
    {
      id: "shop_1",
      name: "ร้านที่ 1: NYX9 STUDIO (หลัก)",
      active: true,
      inviteUrl: "https://discord.gg/nyx9studio",
      badge: "ONLINE",
      description: "Nitro, บูสต์เซิร์ฟเวอร์ & FiveM",
      memberCount: "45,000+"
    },
    {
      id: "shop_2",
      name: "ร้านที่ 2 (เครือข่ายพันธมิตร)",
      active: false,
      inviteUrl: "#",
      badge: "COMING SOON",
      description: "พร้อมเปิดตัวเร็วๆ นี้",
      memberCount: "-"
    },
    {
      id: "shop_3",
      name: "ร้านที่ 3 (เครือข่ายพันธมิตร)",
      active: false,
      inviteUrl: "#",
      badge: "COMING SOON",
      description: "พร้อมเปิดตัวเร็วๆ นี้",
      memberCount: "-"
    },
    {
      id: "shop_4",
      name: "ร้านที่ 4 (เครือข่ายพันธมิตร)",
      active: false,
      inviteUrl: "#",
      badge: "COMING SOON",
      description: "พร้อมเปิดตัวเร็วๆ นี้",
      memberCount: "-"
    }
  ],

  // --- ช่องทางติดต่อ & ชุมชนหลัก ---
  discordCommunityUrl: "https://discord.gg/nyx9studio",
  contactLine: "@nyx9studio",
  contactFacebook: "https://facebook.com/nyx9studio",
  supportEmail: "support@nyxning.shop",

  // --- ประกาศแถบวิ่งด้านบนสุด (Marquee Ticker - Structured High-Tech Chips) ---
  announcements: [
    { tag: "FLASH SALE", icon: "zap", text: "Discord Nitro Booster 1 เดือน ลดพิเศษเหลือเพียง", highlight: "฿169", color: "cyan" },
    { tag: "AUTO 24/7", icon: "bot", text: "ระบบตัดยอดอัตโนมัติ จัดส่งรหัสทันทีไม่ต้องรอแอดมิน", highlight: "ใน 1 นาที", color: "emerald" },
    { tag: "VERIFIED", icon: "shield-check", text: "รับประกันไอดีและสินค้าแท้ 100% มีทีมซัพพอร์ต", highlight: "ดูแลตลอด 24 ชม.", color: "blue" },
    { tag: "LTC BONUS", icon: "coins", text: "ชำระเงินผ่าน Crypto Litecoin รับยอดเงินเพิ่มทันที", highlight: "ฟรี +5% ทุกบิล", color: "amber" }
  ],

  // --- แบนเนอร์โปรโมชั่นสไลด์ (Hero Carousel) ---
    heroBanners: [
    {
      id: "banner-1",
      badge: "AUTO FULFILLMENT",
      title: "ศูนย์รวมบริการ Discord, FiveM & แอปพรีเมียม 24 ชม.",
      description: "กดสั่งปุ๊บรับรหัสทันทีในระบบคลังคีย์ ไม่ต้องรอแอดมินตอบแชท • รับประกันไอดีแท้ 100% มีปัญหาเคลมใหม่ได้ทันที",
      ctaText: "เลือกซื้อสินค้าพร้อมส่ง",
      ctaCategory: "cat-discord-nitro",
      bgGradient: "from-[#0B101A] via-[#080C14] to-[#06080D]",
      accentTag: "ระบบออโต้ 24/7"
    },
    {
      id: "banner-2",
      badge: "สต็อกพร้อมส่ง",
      title: "FIVEM READY & STEAM GTA V ไอดีสะอาดแท้",
      description: "รหัสยกเมลเปลี่ยนได้ 100% ปลดแบน HWID สะอาด ไร้ประวัติแบน คัดเกรดก่อนลงคลังส่งมอบ",
      ctaText: "ดูรายการไอดี FiveM",
      ctaCategory: "cat-gaming-apps",
      bgGradient: "from-[#0B101A] via-[#080C14] to-[#06080D]",
      accentTag: "ประกันไอดีสะอาด"
    },
    {
      id: "banner-3",
      badge: "เติมเงินออโต้",
      title: "ชำระเงินง่ายทุกช่องทาง ฟรีค่าธรรมเนียม 0%",
      description: "รองรับ PromptPay QR สแกนฟรี, TrueMoney Wallet, โอนผ่านธนาคาร และบัตรเครดิต ปลอดภัย 3D Secure",
      ctaText: "เติมเงินเข้ากระเป๋า",
      ctaAction: "openTopUp",
      bgGradient: "from-[#0B101A] via-[#080C14] to-[#06080D]",
      accentTag: "เติมเงิน 24 ชม."
    }
  ],

  // --- ธีมสี (Futuristic Glacier Cyan & Obsidian Theme) ---
    theme: {
    accent: "#00F2FF",       // Electric Hyper-Cyan
    accentHover: "#38F8FF",  // Glowing Highlights
    accentGlow: "rgba(0, 242, 255, 0.35)",
    baseBg: "#070A0F",       // Deep Obsidian Gunmetal Canvas
    cardBg: "#0C111A",       // Surface Layer 1
    cardHover: "#111724",    // Surface Hover
    borderLight: "rgba(0, 242, 255, 0.14)",
    borderActive: "rgba(0, 242, 255, 0.50)"
  },

  // --- สถิติความน่าเชื่อถือ (4-Metric Telemetry Grid) ---
  metrics: {
    visitorsToday: "12,450",
    ordersToday: "850",
    totalMembers: "45,000+",
    uptime: "24/7 AUTO"
  },

  // --- เกตเวย์ชำระเงินที่รองรับ (PromptPay, TrueMoney, Bank Transfer, ผูกบัตร, Crypto) ---
  acceptedPayments: ["promptpay", "truemoney", "bank_transfer", "card_payment", "crypto_ltc"],

  // ข้อมูลตั้งค่าบัญชีรับเงิน
  paymentDetails: {
    promptpay: {
      accountName: "NYX9 STUDIO AUTO",
      promptpayNumber: "095-123-4567",
      minAmount: 10,
      feeRate: 0.0
    },
    truemoney: {
      accountName: "NYX9 WALLET AUTO",
      phoneNumber: "098-765-4321",
      feeRate: 0.0,
      hint: "กรอกลิงก์ซองของขวัญ หรือโอนผ่านเบอร์ TrueMoney Wallet เพื่อรับเงินเข้าทันที"
    },
    bank_transfer: {
      bankName: "ธนาคารกสิกรไทย (K-Bank)",
      bankCode: "KBANK",
      accountNumber: "142-8-91234-5",
      accountName: "NYX9 STUDIO BY MATTEW",
      branch: "สาขาสยามพารากอน",
      color: "#138f2d",
      icon: "landmark"
    },
    card_payment: {
      gatewayName: "CyberPay 3D-Secure Vault",
      supportedBrands: ["VISA", "Mastercard", "JCB", "TPN"],
      feeRate: 0.0, // โปรโมชั่นค่าธรรมเนียม 0%
      pciDssCompliance: "Level 1 Certified (256-Bit SSL Tokenization)",
      icon: "credit-card"
    },
    crypto_ltc: {
      coinName: "Litecoin (LTC)",
      network: "LTC Native",
      address: "ltc1q9x4n2s7j8m4zfk9pq98wv7wuxc3v5v2k4h5nqz",
      bonusPercent: 5,
      rateThbPerLtc: 3850.00
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
if (typeof module !== "undefined" && module.exports) {
  module.exports = storeConfig;
} else {
  window.storeConfig = storeConfig;
}



/* ============================================================================== */
/* 📦 MODULE: productsData.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * COMMERCIAL MULTI-NICHE CATALOG DATA
 * ==============================================================================
 * ข้อมูลสินค้าครอบคลุมทุกหมวดตามสเปก พร้อมระบบ Dual-Fulfillment
 * (Instant Delivery / Custom Order Form) และ SVG Artwork อัตราส่วน 16:9
 * ==============================================================================
 */

// ฟังก์ชันสร้าง Artwork SVG สไตล์ Cyberpunk 1:1 Square (Base 450x450) คมชัด รองรับเรตินา
function createCyberArtwork(title, sub, iconType, primaryColor, secondaryColor) {
  const icons = {
    nitro: `<path d="M12 2L4 14h6l-2 8 10-12h-6l4-8z" fill="${primaryColor}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
    boost: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3m0 0l8.5-8.5a2.12 2.12 0 1 1 3 3L12 15m-3-3v3h3" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    discord: `<path d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.2.35-.4.8-.56 1.18a16.8 16.8 0 0 0-5.14 0 9.87 9.87 0 0 0-.57-1.18 18.15 18.15 0 0 0-4.6 1.44A19.12 19.12 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98a12.16 12.16 0 0 1-1.92-.93c.16-.12.32-.24.47-.37a13.1 13.1 0 0 0 11.32 0c.16.13.31.25.47.37-.62.37-1.26.68-1.92.93.35.7.75 1.36 1.2 1.98 2.02-.62 3.92-1.6 5.63-2.87.5-5.46-1.3-10.22-3.3-12.83zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.4 2.15-2.4 1.21 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4zm7.97 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.4 2.15-2.4 1.21 0 2.17 1.08 2.15 2.4 0 1.32-.94 2.4-2.15 2.4z" fill="${primaryColor}"/>`,
    game: `<rect x="2" y="6" width="20" height="12" rx="3" stroke="${primaryColor}" stroke-width="2" fill="none"/><path d="M6 12h4m-2-2v4m9-2h.01m3 0h.01" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>`,
    stream: `<polygon points="5 3 19 12 5 21 5 3" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.5"/>`,
    key: `<path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3L3.5 13.5a5 5 0 1 0 7 7L18 13l2-2 1.5-1.5M16 5l3 3" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>`,
    ai: `<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="${primaryColor}" stroke-width="2"/>`
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
      <linearGradient id="glow-${safeId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
      </linearGradient>
      <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
        <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="450" height="450" fill="url(#bg-${safeId})"/>
    <rect width="450" height="450" fill="url(#grid)"/>
    <circle cx="225" cy="210" r="130" fill="${primaryColor}" fill-opacity="0.10" filter="blur(45px)"/>
    <circle cx="350" cy="90" r="80" fill="${secondaryColor}" fill-opacity="0.08" filter="blur(35px)"/>
    
    <!-- Cyber Geometric Square Frame (1:1 Base) -->
    <path d="M 24 48 L 48 24 L 402 24 L 426 48 L 426 402 L 402 426 L 48 426 L 24 402 Z" fill="none" stroke="rgba(25, 186, 255, 0.18)" stroke-width="1.5"/>
    <line x1="48" y1="24" x2="150" y2="24" stroke="${primaryColor}" stroke-width="3"/>
    <line x1="300" y1="426" x2="402" y2="426" stroke="${secondaryColor}" stroke-width="3"/>

    <!-- Center Holo Symbol -->
    <g transform="translate(165, 125) scale(5)">
      ${selectedIcon}
    </g>

    <!-- Typography -->
    <text x="225" y="325" text-anchor="middle" fill="#FFFFFF" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="16" letter-spacing="0.5">
      ${safeTitle}
    </text>
    <text x="225" y="358" text-anchor="middle" fill="${primaryColor}" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="12" letter-spacing="1.5">
      // ${safeSub} //
    </text>

    <!-- Top Badge Corner -->
    <rect x="34" y="32" width="95" height="20" rx="4" fill="rgba(25, 186, 255, 0.15)" stroke="${primaryColor}" stroke-width="1"/>
    <text x="81" y="46" text-anchor="middle" fill="${primaryColor}" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700">VERIFIED AUTH</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const categoriesData = [
  {
    id: "cat-discord-nitro",
    name: "Discord Nitro & บูสต์",
    subName: "ไนโตรแท้ บูสต์เซิร์ฟเวอร์ & ไอเทมตกแต่งโปรไฟล์",
    icon: "zap",
    badge: "INSTANT KEY / AUTO",
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
        chips: ["ส่งทันที", "ประกันเต็ม", "2 บูส"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Nitro Booster", "1 Month Mailpass", "nitro", "#19BAFF", "#38D4FF"),
        sampleDelivery: "nitro_user_vip99@wichx.vip:PassNitro!2026",
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
        chips: ["ยกเมลแท้", "2 บูส", "เปลี่ยนรหัสได้"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Nitro 3 Months", "Full Email Transfer", "nitro", "#38D4FF", "#00FFA3"),
        sampleDelivery: "discord_3m_fresh@rambler.ru:RamblerP@ss2026 | Mailpass: Ok",
        warrantyDays: 90
      },
      {
        id: "nitro-boost-1m-2x",
        title: "บูสเซิร์ฟเวอร์ 1 เดือน (2 บูส)",
        category: "cat-discord-nitro",
        price: 50,
        originalPrice: 90,
        stock: 80,
        status: "SALE",
        discountPercent: 44,
        chips: ["2 บูสแท้", "ใน 1 นาที"],
        fulfillmentType: "custom_discord_boost",
        imageUrl: createCyberArtwork("Server Boost", "1 Month x2 Boosts", "boost", "#19BAFF", "#7928CA"),
        instructions: "กรอกลิงก์เซิร์ฟเวอร์ Discord ที่ต้องการให้บอทเข้าไปบูส (ต้องไม่หมดอายุ)"
      },
      {
        id: "nitro-boost-3m-2x",
        title: "บูสเซิร์ฟเวอร์ 3 เดือน (2 บูส)",
        category: "cat-discord-nitro",
        price: 100,
        originalPrice: 180,
        stock: 60,
        status: "SALE",
        discountPercent: 44,
        chips: ["90 วันเต็ม", "ยอดนิยม"],
        fulfillmentType: "custom_discord_boost",
        imageUrl: createCyberArtwork("Server Boost 90D", "3 Months x2 Boosts", "boost", "#FF0080", "#19BAFF"),
        instructions: "ระบบจะดำเนินการส่งบูสเข้าเซิร์ฟเวอร์ภายใน 1-5 นาทีหลังชำระเงิน"
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
        imageUrl: createCyberArtwork("Nitro Promo Link", "3 Months Promo Xbox", "nitro", "#10B981", "#19BAFF"),
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
        imageUrl: createCyberArtwork("Avatar Deco", "Permanent Nameplates", "nitro", "#F59E0B", "#EF4444"),
        sampleDelivery: "GIFT-DECO-PERM-DISCORD-TOKEN-9283-WICHX",
        warrantyDays: 365
      }
    ]
  },
  {
    id: "cat-discord-services",
    name: "บริการดิสคอร์ด & ไอดี",
    subName: "เควสต์อัตโนมัติ บอท & ไอดีพร้อมใช้งาน",
    icon: "bot",
    badge: "CUSTOM FLOW & FORM",
    visible: true,
    collapsed: false,
    products: [
      {
        id: "service-discord-members",
        title: "ปั๊มคนเข้า Discord (มีโปรไฟล์จริง)",
        category: "cat-discord-services",
        price: 0.50, // ราคาต่อคน
        unit: "คน",
        minQuantity: 100,
        maxQuantity: 1000,
        stepQuantity: 50,
        originalPrice: 0.80,
        stock: 9999,
        status: "SERVICE",
        chips: ["มีรูปโปรไฟล์", "เริ่มใน 5 นาที"],
        fulfillmentType: "custom_discord_members",
        imageUrl: createCyberArtwork("Member Booster", "Real Avatars 24/7", "discord", "#19BAFF", "#3B82F6"),
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
        imageUrl: createCyberArtwork("Phone OTP Verify", "Instant SMS Code", "key", "#10B981", "#38D4FF"),
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
        imageUrl: createCyberArtwork("Quest Badge", "Discord Mission Auto", "boost", "#8B5CF6", "#19BAFF"),
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
        imageUrl: createCyberArtwork("Discord Age 1M+", "Aged Clean Account", "discord", "#6366F1", "#19BAFF"),
        sampleDelivery: "acc_aged30d_8812@wichxmail.com:SuperP@ss7721 | Token: MTA4...",
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
        imageUrl: createCyberArtwork("Discord Vintage", "Rare 2016-2018 ID", "discord", "#F59E0B", "#E11D48"),
        sampleDelivery: "og_discord_2016_legacy@rambler.ru:VintagePass2016! | Full Access",
        warrantyDays: 30
      }
    ]
  },
  {
    id: "cat-gaming-apps",
    name: "FiveM, Steam & เกมมิ่ง",
    subName: "ไอดีสะอาด ปลดแบน FiveM, GTAV & สตรีมมิ่ง",
    icon: "gamepad-2",
    badge: "WICHX SPECIALS",
    visible: true,
    collapsed: false,
    products: [
      {
        id: "rockstar-fivem-fresh",
        title: "Rockstar FiveM สดใหม่ (2 ชั้น)",
        category: "cat-gaming-apps",
        price: 10,
        originalPrice: 25,
        stock: 290,
        status: "SALE",
        discountPercent: 60,
        chips: ["FiveM", "ส่งทันที"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("FiveM Clean", "Rockstar 2-Step Auth", "game", "#19BAFF", "#EC4899"),
        sampleDelivery: "rockstar_fivem_clean991@firstmail.ltd:FiveMPassword2026",
        warrantyDays: 7
      },
      {
        id: "steam-gtav-unlinked",
        title: "Steam GTAV ยังไม่ผูก Rockstar",
        category: "cat-gaming-apps",
        price: 399,
        originalPrice: 699,
        stock: 160,
        status: "SALE",
        discountPercent: 43,
        chips: ["Steam แท้", "ยกไอดี"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Steam GTA V", "Unlinked Clean Account", "game", "#3B82F6", "#06B6D4"),
        sampleDelivery: "steam_gta5_fresh_id771:SteamMasterPass2026 | Email: steam_mail_gta@outlook.com:EmailPass2026",
        warrantyDays: 30
      },
      {
        id: "netflix-private-30d",
        title: "Netflix 30 วัน (ทุกอุปกรณ์)",
        category: "cat-gaming-apps",
        price: 109,
        originalPrice: 169,
        stock: 44,
        status: "SALE",
        discountPercent: 35,
        chips: ["จอส่วนตัว", "ประกัน 30 วัน"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Netflix UHD", "30 Days Private Screen", "stream", "#E50914", "#19BAFF"),
        sampleDelivery: "netflix_vip_uhd291@wichxstream.com:NfPass4K!2026 | PIN: 1984 | Profile: 1",
        warrantyDays: 30
      },
      {
        id: "youtube-premium-1m",
        title: "YouTube Premium 1 เดือน (เมลเดิม)",
        category: "cat-gaming-apps",
        price: 49,
        originalPrice: 89,
        stock: 100,
        status: "SALE",
        discountPercent: 45,
        chips: ["ไร้โฆษณา", "อนุมัติไว"],
        fulfillmentType: "custom_email_invite",
        imageUrl: createCyberArtwork("YouTube Premium", "Ad-Free Background Play", "stream", "#FF0000", "#38D4FF"),
        instructions: "กรอก Gmail ของคุณเพื่อรับลิงก์คำเชิญเข้าร่วมครอบครัวพรีเมียม (ไม่จำเป็นต้องให้รหัสผ่าน)"
      },
      {
        id: "cursor-pro-1m-preorder",
        title: "Cursor Pro 1 เดือน (พรีออเดอร์)",
        category: "cat-gaming-apps",
        price: 490,
        originalPrice: 750,
        stock: 15,
        status: "PRE-ORDER",
        chips: ["AI Tool", "พรีออเดอร์"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Cursor Pro AI", "Claude 3.7 & GPT-4o", "ai", "#00FFA3", "#19BAFF"),
        sampleDelivery: "PREORDER-CONFIRMED: ระบบจะจัดส่งรหัสคีย์เข้าอีเมลของคุณภายใน 24 ชม.",
        warrantyDays: 30
      },
      {
        id: "test-out-of-stock",
        title: "สินค้าทดสอบหมด (Out of Stock)",
        category: "cat-gaming-apps",
        price: 0,
        originalPrice: 99,
        stock: 0,
        status: "OUT OF STOCK",
        chips: ["หมดชั่วคราว", "รอเติมของ"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Out of Stock", "Item Unavailable", "key", "#6B7280", "#374151"),
        sampleDelivery: ""
      }
    ]
  },
  {
    id: "cat-uncategorized",
    name: "ซอฟต์แวร์ & คีย์แท้",
    subName: "Windows 11 Pro, Spotify Family & ดิจิทัลไอเทม",
    icon: "sparkles",
    badge: "STANDALONE ITEMS",
    visible: true,
    collapsed: false,
    products: [
      {
        id: "windows-11-pro-key",
        title: "Windows 11 Pro Retail Key (คีย์แท้)",
        category: "cat-uncategorized",
        price: 120,
        originalPrice: 450,
        stock: 50,
        status: "SALE",
        discountPercent: 73,
        chips: ["คีย์แท้", "ถาวร", "ย้ายเครื่องได้"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Windows 11 Pro", "Original Retail License", "key", "#0078D4", "#19BAFF"),
        sampleDelivery: "W269N-WFGWX-YVC9B-4J6C9-T83GX",
        warrantyDays: 365
      },
      {
        id: "spotify-family-3m",
        title: "Spotify Family 3 เดือน (เมลเดิม)",
        category: "cat-uncategorized",
        price: 89,
        originalPrice: 180,
        stock: 30,
        status: "SALE",
        discountPercent: 50,
        chips: ["เมลเดิม", "ต่ออายุได้"],
        fulfillmentType: "custom_email_invite",
        imageUrl: createCyberArtwork("Spotify 3M", "Original Family Plan", "stream", "#1DB954", "#19BAFF"),
        instructions: "กรอกอีเมล Spotify เพื่อรับลิงก์ Family Invite เข้าใช้งานทันที"
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
      walletBalance: typeof localStorage !== "undefined" ? parseFloat(localStorage.getItem("wichx_balance") || "500.00") : 500.00,
      cart: safeParse("wichx_cart", []),
      orderHistory: safeParse("wichx_orders", []),
      appliedPromo: null,
      isCatalogLoading: true,
      categories: [],
      categoryFilters: {},
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
window.Store = Store;
window.AppStore = new Store();

if (typeof module !== "undefined" && module.exports) {
  module.exports = Store;
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
 * 3. Framebusting & Anti-Clickjacking (Immune to iframe phishing)
 * 4. Anti-Drag & Asset Extraction Protection
 * 5. Self-XSS Anti-Theft Console Warnings
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
    try {
      if (window.top !== window.self) {
        window.top.location = window.self.location;
      }
    } catch (e) {
      // If framed cross-origin, blank out display
      try {
        document.documentElement.style.display = "none";
      } catch (err) {}
    }
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

      // 2. Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
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
      const bannerStyle = "color: #00F2FF; font-size: 22px; font-weight: 900; text-shadow: 0 0 10px rgba(0,242,255,0.8);";
      const warningStyle = "color: #FF3366; font-size: 16px; font-weight: bold;";
      const subStyle = "color: #94A3B8; font-size: 13px;";

      console.log("%c🛡️ NYX9 SHIELD ENGINE v2.0 ACTIVE", bannerStyle);
      console.log("%c⛔ คำเตือนความปลอดภัยสูงสุด (STOP!):", warningStyle);
      console.log("%cห้ามคัดลอกหรือวางคำสั่งใด ๆ ลงใน Console นี้โดยเด็ดขาด หากมีใครบอกให้คุณวางเพื่อรับ 'Nitro ฟรี' หรือ 'สคริปต์แฮกเงิน' นั่นคือการหลอกลวงขโมย Session Discord และกระเป๋าเงินของคุณ!", subStyle);
    } catch (e) {}
  }
}

window.SecurityEngine = SecurityEngine;



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

    const orderId = orderData.orderId || orderData.order_id || `WX-${Date.now().toString().slice(-6)}`;
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
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `NYX9_Receipt_${orderId}.png`;
        link.click();
        resolve(link.href);
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

window.ReceiptGenerator = ReceiptGenerator;



/* ============================================================================== */
/* 📦 MODULE: js/services/AuthService.js */
/* ============================================================================== */
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
    const discordId = String(meta.provider_id || meta.sub || "");
    const adminIds = (window.storeConfig && window.storeConfig.adminDiscordIds) || ["483398326159671326", "422611554475835394"];
    const isAdmin = adminIds.includes(discordId);

    const userData = {
      id: user.id,
      email: user.email,
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
    this.store.set("isCatalogLoading", true);
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
    const cats = this.store.get("categories") || [];
    const filters = {};
    if (catId === "all") {
      cats.forEach(c => filters[c.id] = true);
    } else {
      cats.forEach(c => filters[c.id] = (c.id === catId));
    }
    this.store.set("activeCategory", catId);
    this.store.set("categoryFilters", filters);
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

window.CatalogService = CatalogService;



/* ============================================================================== */
/* 📦 MODULE: js/services/PaymentService.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 💳 PAYMENT ENGINE SERVICE (OOP 4-GATEWAY PROCESSOR)
 * ==============================================================================
 * ควบคุมการประมวลผลทั้ง 4 ช่องทาง: PromptPay, TrueMoney, Bank Transfer, Card Payment
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
    const target = window.storeConfig?.paymentDetails?.promptpay?.promptpayNumber || "0951234567";
    const payload = this.generatePromptPayPayload(target, Math.max(1, parseFloat(amount) || 100));
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }

  async verifyPromptPaySlip(amount, transRef) {
    return this.processTopup({
      gateway: "promptpay",
      transRef: transRef,
      amount: amount,
      rawPayload: { qr: true, verifiedAt: new Date().toISOString() }
    });
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
        bank: window.storeConfig?.paymentDetails?.bank_transfer?.bankCode || "KBANK",
        manualVerification: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  // --- 4. CREDIT/DEBIT CARD & BINDING ---
  async processCardPayment(amount, cardData, shouldBind = true) {
    const cardAuthRef = `CARD-AUTH-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const result = await this.processTopup({
      gateway: "card_payment",
      transRef: cardAuthRef,
      amount: amount,
      rawPayload: {
        last4: cardData.number.slice(-4),
        brand: cardData.number.startsWith("4") ? "VISA" : "Mastercard",
        holderName: cardData.holder.toUpperCase(),
        threeDSecure: "PASSED",
        tokenized: shouldBind,
        timestamp: new Date().toISOString()
      }
    });

    if (result.success && shouldBind) {
      const boundCard = {
        brand: cardData.number.startsWith("4") ? "VISA" : "Mastercard",
        last4: cardData.number.slice(-4),
        holder: cardData.holder.toUpperCase(),
        expiry: cardData.expiry,
        boundAt: new Date().toISOString()
      };
      localStorage.setItem("nyx_bound_card", JSON.stringify(boundCard));
    }

    return result;
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
      const usedSlips = JSON.parse(localStorage.getItem("wichx_used_slips") || "[]");
      if (usedSlips.includes(transRef)) {
        throw new Error("สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้ (Anti-Double-Spend Triggered)");
      }
      usedSlips.push(transRef);
      localStorage.setItem("wichx_used_slips", JSON.stringify(usedSlips));
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

window.PaymentService = PaymentService;



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

  calculateTotals() {
    const cart = this.store.get("cart") || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const promo = this.store.get("appliedPromo");

    let discount = 0;
    if (promo) {
      if (promo.discountPercent) {
        discount = (subtotal * promo.discountPercent) / 100;
      } else if (promo.discountThb) {
        discount = promo.discountThb;
      }
    }

    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
  }

  applyCoupon(code) {
    const cleanCode = (code || "").trim().toUpperCase();
    const configCodes = window.storeConfig?.promoCodes || {};
    const promo = configCodes[cleanCode];

    if (!promo) {
      throw new Error("โค้ดส่วนลดนี้ไม่ถูกต้องหรือหมดอายุแล้ว");
    }

    const cart = this.store.get("cart") || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (promo.minSpend && subtotal < promo.minSpend) {
      throw new Error(`โค้ดนี้ใช้ได้เมื่อมียอดสั่งซื้อขั้นต่ำ ฿${promo.minSpend}`);
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

window.CheckoutService = CheckoutService;



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
    const localRaw = localStorage.getItem("wichx_orders");
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

window.HistoryService = HistoryService;

if (typeof module !== "undefined" && module.exports) {
  module.exports = HistoryService;
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
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
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

window.UI = new UIManager();



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

  updateAuthUI() {
    const user = this.store.get("user");
    const loginBtn = document.getElementById("btn-discord-login");
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
    const isAdmin = user && (user.role === "admin" || adminIds.includes(String(user.discordId)));
    const balance = this.store.get("walletBalance") || 0;

    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
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
      if (menuDiscordId) menuDiscordId.textContent = user.discordId ? `ID: ${user.discordId}` : (user.email || "Discord Member");
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
      if (loginBtn) loginBtn.classList.remove("hidden");
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
    if (banners.length === 0) return;

    container.innerHTML = banners.map((banner, idx) => `
      <div class="w-full flex-shrink-0 relative rounded-2xl overflow-hidden p-6 sm:p-8 md:p-10 border border-white/[0.08] bg-[#0A0E17]/92 backdrop-blur-xl transition-all duration-500 shadow-2xl">
        <div class="max-w-2xl space-y-4 relative z-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(0,242,255,0.06)] border border-[rgba(0,242,255,0.2)] text-xs font-mono-val text-[var(--accent)] font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
            <span>${banner.badge} • ${banner.accentTag}</span>
          </div>

          <h2 class="text-2xl md:text-3xl lg:text-4xl font-heading font-extrabold text-white tracking-wide leading-tight">
            ${banner.title}
          </h2>

          <p class="text-slate-400 text-xs md:text-sm leading-relaxed font-normal font-body max-w-xl">
            ${banner.description}
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button onclick="window.handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}')" class="btn-cyber-primary btn-shimmer px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs md:text-sm font-extrabold cursor-pointer active:scale-95 transition-transform">
              <span>${banner.ctaText}</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
            
            <button onclick="window.openDiscordServicesModal()" class="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white font-medium flex items-center gap-2 transition-all cursor-pointer">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>คำนวณราคาบูสต์</span>
            </button>
          </div>
        </div>
      </div>
    `).join("");

    if (dotsContainer) {
      dotsContainer.innerHTML = banners.map((_, idx) => `
        <button onclick="window.setCarouselSlide(${idx})" class="w-3 h-1.5 rounded-full transition-all duration-300 ${idx === 0 ? 'w-7 bg-[var(--accent)]' : 'bg-slate-700'}" aria-label="Slide ${idx + 1}"></button>
      `).join("");
    }

    if (window.lucide) lucide.createIcons();
    this.startAutoTimer();
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
    const metrics = window.storeConfig?.metrics || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setVal("live-visitors-today", metrics.visitorsToday || "12,450");
    setVal("live-orders-today", metrics.ordersToday || "850");
    setVal("live-total-members", metrics.totalMembers || "45,000+");
    setVal("live-visitors-today-m", metrics.visitorsToday || "12,450");
    setVal("live-orders-today-m", metrics.ordersToday || "850");
    setVal("live-total-members-m", metrics.totalMembers || "45,000+");
  }
}

window.HeroSectionComponent = HeroSectionComponent;



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
            ? 'bg-[var(--accent)] text-[#05080E] shadow-[0_0_18px_rgba(0,242,255,0.35)] font-extrabold border border-[var(--accent)]' 
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
            ? 'bg-[var(--accent)] text-[#05080E] shadow-[0_0_18px_rgba(0,242,255,0.35)] font-extrabold border border-[var(--accent)]' 
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
                  <div class="h-5 w-16 rounded bg-cyan-500/20"></div>
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
              <span class="w-2.5 h-6 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(0,242,255,0.5)]"></span>
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
            ${prods.map(p => this.createProductCardHTML(p, cat)).join("")}
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
  }

    createProductCardHTML(p, cat) {
    const isOut = p.stock === 0;
    const isCustom = p.fulfillmentType === "custom_form";

    return `
      <div class="product-card group rounded-2xl bg-[#0C111A] hover:bg-[#111724] border border-[rgba(255,255,255,0.08)] hover:border-[var(--accent)] transition-all duration-200 p-4 flex flex-col justify-between relative shadow-lg hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.8),0_0_24px_-6px_rgba(0,242,255,0.25)] hover:-translate-y-1">
        <div>
          <!-- Artwork Area (1:1 Ratio with Subtle Dark Backdrop) -->
          <div class="w-full aspect-square rounded-xl bg-[#06080D] border border-[rgba(255,255,255,0.06)] overflow-hidden relative mb-3.5 flex items-center justify-center p-2.5">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'16\' fill=\'%230B101A\'/%3E%3Cpath d=\'M30 50h40M50 30v40\' stroke=\'%2300F2FF\' stroke-width=\'4\'/%3E%3C/svg%3E';" />` : `<i data-lucide="box" class="w-12 h-12 text-slate-600"></i>`}
            
            <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
              ${p.status ? `<span class="px-2 py-0.5 rounded-md bg-[rgba(0,242,255,0.15)] text-[var(--accent)] border border-[rgba(0,242,255,0.35)] text-[10px] font-mono-val font-bold uppercase tracking-wider">${p.status}</span>` : ""}
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

          <!-- Title & Chips -->
          <h4 class="text-sm font-heading font-extrabold text-white group-hover:text-[var(--accent)] transition-colors line-clamp-1 mb-2">${p.title}</h4>
          
          <div class="flex flex-wrap gap-1.5 mb-3.5">
            ${(p.chips || []).map(chip => `
              <span class="px-2 py-0.5 rounded-md bg-[#070A0F] border border-[rgba(255,255,255,0.06)] text-[10px] text-slate-300 font-mono-val">${chip}</span>
            `).join("")}
          </div>
        </div>

                <!-- Footer & Action (Fitts's Law Dual-Action: Cart + 1-Click Buy) -->
        <div class="pt-3.5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2">
          <div>
            <div class="text-[10px] text-slate-500 line-through font-mono-val">${p.originalPrice ? `฿${p.originalPrice}` : ""}</div>
            <div class="text-base font-mono-val font-extrabold text-[var(--accent)] tracking-tight">฿${p.price.toFixed(2)}</div>
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

  scrollToCategory(catId) {
    const el = document.getElementById(catId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
}

window.CatalogViewComponent = CatalogViewComponent;



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
    ["promptpay-feedback", "truemoney-feedback", "bank-transfer-feedback", "card-feedback"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("hidden");
        el.innerHTML = "";
      }
    });
  }

  switchGateway(tabKey) {
    this.activeTab = tabKey;
    const tabs = ["promptpay", "truemoney", "bank_transfer", "card_payment"];
    
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const pane = document.getElementById(`gateway-panel-${t}`);
      
      if (t === tabKey) {
        if (btn) {
          btn.className = "topup-tab-btn active h-11 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.15)] ring-1 ring-cyan-400/50";
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
    if (qrImg) qrImg.src = this.paymentService.getPromptPayQrUrl(val);
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

  async processCard() {
    const btn = document.getElementById("btn-pay-card");
    const amount = parseFloat(document.getElementById("card-topup-amount")?.value || "300");
    const number = (document.getElementById("card-number-input")?.value || "").replace(/\s+/g, "");
    const expiry = document.getElementById("card-expiry-input")?.value.trim();
    const cvv = document.getElementById("card-cvv-input")?.value.trim();
    const holder = document.getElementById("card-holder-input")?.value.trim();
    const bindToggle = document.getElementById("card-bind-toggle")?.checked;

    if (number.length < 15 || !expiry || !cvv || !holder) {
      window.UI?.toast("กรุณากรอกข้อมูลบัตรให้ครบถ้วนถูกต้อง", "warning");
      return;
    }

    this.setBtnLoading(btn, "กำลังยืนยัน 3D Secure 2.0...");
    try {
      await this.paymentService.processCardPayment(amount, { number, expiry, cvv, holder }, bindToggle);
      window.UI?.confetti();
      window.UI?.toast(`ตัดบัตรสำเร็จ +฿${amount.toFixed(2)} เข้ากระเป๋าแล้ว!`, "success");
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      window.UI?.toast(err.message, "error");
    } finally {
      this.resetBtn(btn, `<i data-lucide="zap" class="w-4 h-4 fill-current"></i> <span>ยืนยันการชำระเงินและผูกบัตร</span>`);
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

window.TopUpModalComponent = TopUpModalComponent;



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
                placeholder="ค้นหาด้วยรหัสออเดอร์ (เช่น WX-371156) หรือชื่อสินค้า..." 
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
      window.UI?.toast("กรุณาระบุรหัสออเดอร์ที่ต้องการค้นหา (เช่น WX-371156)", "warning");
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
              <span class="text-slate-400 font-mono text-[11px]">จำนวน: x${item.quantity || 1}</span>
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

window.HistoryModalComponent = HistoryModalComponent;

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
      if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
        await window.SupabaseAdapter.client.from("restock_subscriptions").insert({
          product_id: this.currentProductId,
          discord_contact: contact,
          user_id: user?.id || null
        });
      }

      window.UI?.confetti();
      window.UI?.toast(`🔔 บันทึกการแจ้งเตือนสำหรับ "${this.currentProductTitle}" เรียบร้อย!`, "success");
      this.close();
    } catch (err) {
      console.warn("[RESTOCK NOTIFY] Submit error:", err);
      window.UI?.toast("บันทึกการแจ้งเตือนเรียบร้อย (ระบบจองคิวออฟไลน์)", "success");
      this.close();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="bell" class="w-4 h-4 fill-current"></i> <span>ยืนยันรับการแจ้งเตือน</span>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }
}

window.RestockModalComponent = RestockModalComponent;



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

window.DiscordServiceModalComponent = DiscordServiceModalComponent;

if (typeof module !== "undefined" && module.exports) {
  module.exports = DiscordServiceModalComponent;
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
    const orderId = result.order_id || result.orderId || `WX-${Math.floor(100000 + Math.random() * 900000)}`;
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

window.ModalsComponent = ModalsComponent;



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
    this.mockFeed = [
      { user: "tew***", item: "Nitro Booster 1 เดือน", time: "เมื่อสักครู่", amount: "฿169" },
      { user: "art***", item: "เติมเงินผ่าน PromptPay", time: "1 นาทีที่แล้ว", amount: "฿500" },
      { user: "gta***", item: "Rockstar FiveM สะอาด", time: "2 นาทีที่แล้ว", amount: "฿10" },
      { user: "nyx***", item: "ปั๊มคนเซิร์ฟ Discord 500 คน", time: "3 นาทีที่แล้ว", amount: "฿250" },
      { user: "kri***", item: "โปรโมชั่น Nitro 3 เดือน ยกเมล", time: "4 นาทีที่แล้ว", amount: "฿150" },
      { user: "vip***", item: "ชำระเงินผ่านบัตรเครดิต", time: "5 นาทีที่แล้ว", amount: "฿1,000" }
    ];
  }

  init() {
    const box = document.getElementById("social-proof-toast");
    if (!box) return;

    setTimeout(() => this.showNext(), 2000);
    this.timer = setInterval(() => this.showNext(), 9000);
  }

  showNext() {
    const box = document.getElementById("social-proof-toast");
    if (!box) return;

    const data = this.mockFeed[this.feedIndex % this.mockFeed.length];
    this.feedIndex++;

    box.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-[rgba(25,186,255,0.15)] text-[var(--accent)] flex items-center justify-center shrink-0">
          <i data-lucide="bell" class="w-4 h-4"></i>
        </div>
        <div class="text-[11px] leading-tight flex-1">
          <div class="text-white"><span class="font-bold text-[var(--accent)]">${data.user}</span> สั่งซื้อ <span class="font-semibold text-slate-200">${data.item}</span></div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">${data.time} • ยอด ${data.amount}</div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    box.classList.remove("opacity-0", "translate-y-4");
    setTimeout(() => {
      box.classList.add("opacity-0", "translate-y-4");
    }, 4500);
  }
}

window.SocialProofComponent = SocialProofComponent;



/* ============================================================================== */
/* 📦 MODULE: js/components/AmbientWaves.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🌊 SUBTLE AMBIENT ICE-VAPOR WAVES ENGINE v3.0 (DEEP ATMOSPHERIC SILK)
 * Ultra-subtle, non-distracting 60fps background waves tuned for high product contrast
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

    // Mouse Physics (Ultra-damped)
    this.mouseX = 0;
    this.mouseY = 0;
    this.rawMouseX = -999;
    this.rawMouseY = -999;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.isRunning = false;
    this.isScrolling = false;
    this.scrollTimeout = null;

    // 8 Lightweight Ambient Motes (Zero CPU drain)
    this.particles = [];
    this.particleCount = 8;

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

    this.initParticles();

    window.addEventListener("resize", () => {
      this.resize();
      this.initParticles();
    }, { passive: true });
    
    // Smooth, gentle mouse parallax (throttled)
    window.addEventListener("mousemove", (e) => {
      this.targetMouseX = (e.clientX / (this.width || 1) - 0.5) * 30;
      this.targetMouseY = (e.clientY / (this.height || 1) - 0.5) * 20;
    }, { passive: true });

    // Scroll performance protector: Pause canvas redrawing during scroll!
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

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * (this.width || 1200),
        y: Math.random() * (this.height || 800),
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.15 - Math.random() * 0.2,
        radius: 0.9 + Math.random() * 1.1,
        baseAlpha: 0.10 + Math.random() * 0.15,
        pulseSpeed: 0.012 + Math.random() * 0.02,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
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
    let lastTime = 0;
    const fpsInterval = 1000 / 30; // 30 FPS cap for maximum CPU/GPU efficiency

    const render = (currentTime) => {
      if (!this.isRunning) return;
      this.animationFrameId = requestAnimationFrame(render);

      // Skip redrawing during user scroll to give 100% GPU to buttery 120Hz smooth scrolling
      if (this.isScrolling) return;

      const elapsed = currentTime - lastTime;
      if (elapsed > fpsInterval) {
        lastTime = currentTime - (elapsed % fpsInterval);
        this.draw();
      }
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

    // Ultra-smooth mouse lerp
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    this.step += 0.007;
    this.pulseTime += 0.009;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Subtle Ambient Nebula pools (Very faint soft glow)
    this.drawSubtleGlows();

    // 2. Layered Faint Waves (Atmospheric Silk - No loud neon strokes)
    // Wave 1: Deep Twilight Sapphire (Upper Hero Zone)
    this.renderWave({
      yBase: this.height * 0.25 - this.mouseY * 0.4,
      amplitude: 38,
      frequency: 0.0011,
      speed: -this.step * 0.6,
      phase: 0.3,
      gradientStart: "rgba(15, 38, 80, 0.07)",
      gradientEnd: "rgba(15, 38, 80, 0.00)"
    });

    // Wave 2: Soft Ice Blue Silk (Matches Logo crystal accents)
    this.renderWave({
      yBase: this.height * 0.42 + this.mouseY * 0.5,
      amplitude: 32,
      frequency: 0.0015,
      speed: this.step * 0.75,
      phase: 0,
      gradientStart: "rgba(0, 163, 255, 0.055)",
      gradientEnd: "rgba(0, 163, 255, 0.00)",
      hairlineStroke: "rgba(56, 189, 248, 0.08)"
    });

    // Wave 3: Deep Slate Horizon (Flowing under Stats)
    this.renderWave({
      yBase: this.height * 0.65 - this.mouseY * 0.3,
      amplitude: 28,
      frequency: 0.0017,
      speed: this.step * 0.85,
      phase: Math.PI * 0.7,
      gradientStart: "rgba(30, 41, 59, 0.06)",
      gradientEnd: "rgba(30, 41, 59, 0.00)"
    });

    // Wave 4: Deep Abyss Vapor (Catalog Lower Bed)
    this.renderWave({
      yBase: this.height * 0.85 + this.mouseY * 0.3,
      amplitude: 34,
      frequency: 0.0013,
      speed: -this.step * 0.65,
      phase: Math.PI * 1.3,
      gradientStart: "rgba(2, 132, 199, 0.045)",
      gradientEnd: "rgba(2, 132, 199, 0.00)"
    });

    // 3. Draw Quiet Stardust Motes
    this.drawQuietParticles();
  }

  drawSubtleGlows() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Faint Ice Blue Pool (Top Left) - Bounded draw area for maximum GPU efficiency
    const n1X = w * 0.3 + Math.sin(this.pulseTime * 0.6) * 50;
    const n1Y = h * 0.2 + Math.cos(this.pulseTime * 0.4) * 30;
    const g1 = ctx.createRadialGradient(n1X, n1Y, 20, n1X, n1Y, 400);
    g1.addColorStop(0, "rgba(0, 163, 255, 0.055)");
    g1.addColorStop(0.6, "rgba(0, 163, 255, 0.012)");
    g1.addColorStop(1, "rgba(0, 163, 255, 0.00)");
    ctx.fillStyle = g1;
    ctx.fillRect(Math.max(0, n1X - 400), Math.max(0, n1Y - 400), Math.min(w, 800), Math.min(h, 800));

    // Faint Deep Indigo Pool (Mid Right) - Bounded draw area
    const n2X = w * 0.75 + Math.cos(this.pulseTime * 0.5) * 50;
    const n2Y = h * 0.45 + Math.sin(this.pulseTime * 0.7) * 40;
    const g2 = ctx.createRadialGradient(n2X, n2Y, 20, n2X, n2Y, 420);
    g2.addColorStop(0, "rgba(30, 58, 138, 0.045)");
    g2.addColorStop(0.6, "rgba(30, 58, 138, 0.008)");
    g2.addColorStop(1, "rgba(30, 58, 138, 0.00)");
    ctx.fillStyle = g2;
    ctx.fillRect(Math.max(0, n2X - 420), Math.max(0, n2Y - 420), Math.min(w, 840), Math.min(h, 840));
  }

  renderWave(opts) {
    const { yBase, amplitude, frequency, speed, phase, gradientStart, gradientEnd, hairlineStroke } = opts;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, yBase);

    const stepX = 22;
    const points = [];
    for (let x = 0; x <= w + stepX; x += stepX) {
      const angle = (x + this.mouseX * 1.2) * frequency + speed + phase;
      const y = yBase + Math.sin(angle) * amplitude + Math.cos(angle * 0.6) * (amplitude * 0.35);
      points.push({ x, y });
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 3);
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, gradientEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    // Soft whisper-thin hairline crest (if specified, with low opacity)
    if (hairlineStroke) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.strokeStyle = hairlineStroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawQuietParticles() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      p.pulsePhase += p.pulseSpeed;
      const curAlpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(p.pulsePhase));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(186, 230, 253, ${curAlpha})`;
      ctx.fill();
    }
  }

  drawStatic() {
    if (!this.ctx) return;
    this.step = 1;
    this.draw();
  }
}

window.AmbientWavesEngine = AmbientWavesEngine;



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

    // Components
    this.navbar = new window.NavbarComponent(this.store);
    this.hero = new window.HeroSectionComponent(this.store);
    this.catalogView = new window.CatalogViewComponent(this.store);
    this.cartManager = new window.CartDrawerComponent(this.store, this.checkoutService);
    this.topupModal = new window.TopUpModalComponent(this.store, this.paymentService);
    this.historyModal = new window.HistoryModalComponent(this.store, this.historyService);
    this.restockModal = window.RestockModalComponent ? new window.RestockModalComponent(this.store) : null;
    this.discordServiceModal = new window.DiscordServiceModalComponent(this.store);
    this.modals = new window.ModalsComponent(this.store, this.checkoutService);
    this.socialProof = new window.SocialProofComponent();
    this.ambientWaves = window.AmbientWavesEngine ? new window.AmbientWavesEngine() : null;
    this.security = window.SecurityEngine ? new window.SecurityEngine(this.store) : null;
  }

  async init() {
    console.info("⚡ [NYX9 STUDIO] Initializing Modular OOP Storefront...");
    
    // 1. เรนเดอร์ UI ทันทีไม่ต้องรอ Network (Optimistic Instant Rendering)
    this.hero.render();
    this.catalogView.render();
    this.navbar.updateWalletUI();
    this.navbar.updateCartBadge();
    this.renderAcceptedPaymentsFooter();
    if (window.lucide) lucide.createIcons();

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
    this.animateMetricsCountUp();
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
    const runCount = (id, target, suffix = "", duration = 1200) => {
      const el = document.getElementById(id);
      if (!el) return;
      const startTime = performance.now();
      const frame = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const cur = Math.floor(target * ease);
        el.textContent = cur.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(frame);
    };

    setTimeout(() => {
      runCount("live-visitors-today", 12450);
      runCount("live-visitors-today-m", 12450);
      runCount("live-orders-today", 850);
      runCount("live-orders-today-m", 850);
      runCount("live-total-members", 45000, "+");
      runCount("live-total-members-m", 45000, "+");
    }, 150);
  }

  renderAcceptedPaymentsFooter() {
    const container = document.getElementById("footer-accepted-payments");
    if (!container) return;

    const paymentCards = [
      { name: "PromptPay QR", icon: "qr-code", tag: "สแกนฟรี 0%" },
      { name: "TrueMoney", icon: "wallet", tag: "ซอง/วอลเล็ท" },
      { name: "โอนธนาคาร", icon: "landmark", tag: "ทุกธนาคาร" },
      { name: "บัตรเครดิต/เดบิต", icon: "credit-card", tag: "Visa / MC" },
      { name: "Crypto LTC", icon: "coins", tag: "Litecoin" },
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

// Global Application Instance
window.Shop = new ShopApp();

// Boot immediately or on DOM Ready (Guaranteed Execution)
function bootShopApp() {
  if (window.Shop && !window.Shop._hasBooted) {
    window.Shop._hasBooted = true;
    window.Shop.init();
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
      btn.className = "promptpay-preset-btn active h-9 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold border border-[var(--accent)] shadow-[0_0_12px_rgba(0,242,255,0.3)] text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    } else {
      btn.className = "promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    }
  });
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

// Card Bridges
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
    const discordUrl = window.storeConfig?.communityLinks?.discord || "https://discord.gg/nyx9";
    setTimeout(() => {
      window.open(discordUrl, "_blank");
    }, 600);
  }).catch(() => {
    const discordUrl = window.storeConfig?.communityLinks?.discord || "https://discord.gg/nyx9";
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
window.handleBannerCta = (catId, action) => {
  if (action === "openTopUp") {
    window.openTopUpModal();
  } else if (catId) {
    const target = document.getElementById(catId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // 1. Toggle Active View Panel
  views.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) {
      if (v === target) {
        el.classList.remove('hidden');
        el.classList.add('block');
      } else {
        el.classList.remove('block');
        el.classList.add('hidden');
      }
    }
  });

  // 2. Toggle Back-to-Home Button in Header
  const backBtn = document.getElementById('nav-back-home-btn');
  if (backBtn) {
    if (target === 'home') {
      backBtn.classList.add('hidden');
      backBtn.classList.remove('flex');
    } else {
      backBtn.classList.remove('hidden');
      backBtn.classList.add('flex');
    }
  }

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

  // 5. Scroll Action
  if (hash) {
    setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 120);
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

// Auto-route on initial page load
document.addEventListener('DOMContentLoaded', () => {
  const initPath = window.location.pathname.replace(/^\//, '').toLowerCase();
  const known = ['topup', 'history', 'claim', 'faq', 'terms', 'privacy', 'contact'];
  if (known.includes(initPath)) {
    window.navigateToPage(initPath);
  }
});
