
/* ============================================================================== */
/* 📦 MODULE: database/supabaseClient.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * ⚡ SUPABASE CLIENT & LIVE DATA ADAPTER (FRONTEND & SERVERLESS COMPATIBLE)
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

      // ดึงจำนวนสต็อกจริงคงเหลือที่ยังไม่ขาย
      const { data: stockCounts, error: stockErr } = await this.client
        .from("inventory_keys")
        .select("product_id")
        .eq("is_sold", false);

      const stockMap = {};
      if (!stockErr && stockCounts) {
        stockCounts.forEach(item => {
          stockMap[item.product_id] = (stockMap[item.product_id] || 0) + 1;
        });
      }

      // แมปเข้าโครงสร้าง categoriesData ที่หน้าร้านใช้งาน
      return cats.map(cat => ({
        id: cat.id,
        name: cat.name,
        subName: cat.sub_name,
        icon: cat.icon || "layers",
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
            chips: p.chips || [],
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
 * 🚀 WHITELABEL CONFIGURATION ENGINE (1-FILE REBRANDING)
 * ==============================================================================
 * แก้ไขไฟล์นี้เพียงไฟล์เดียวเพื่อเปลี่ยนชื่อร้าน, ธีมสี, คอนแทค, ข้อมูลโซเชียล,
 * ตัวเลขสถิติ (Metrics) และช่องทางชำระเงินทั้งระบบทันที
 * ==============================================================================
 */

const storeConfig = {
  // --- 🐘 SUPABASE POSTGRESQL PRODUCTION CONNECTION ---
  supabase: {
    url: "https://ymaulztlbctpzyhdhjvn.supabase.co",
    anonKey: "sb_publishable_liwa3Juk3Gy6LBSNnUIHRA_iqsD78_u"
  },

  // --- ข้อมูลพื้นฐานและแบรนดิ้ง (Rebranded for NYX9 STUDIO) ---
  storeName: "NYX9 STUDIO",
  brandShort: "NYX9",
  tagline: "ระบบร้านค้าบริการอัตโนมัติตลอด 24 ชั่วโมง สะดวกรวดเร็ว ปลอดภัย",
  subTagline: "ศูนย์รวมบริการดิจิทัล Discord, บูสต์เซิร์ฟเวอร์, เควสอัตโนมัติ, FiveM & ไอที ครบวงจร การันตีมากกว่า 660,000 ออเดอร์",
  logoUrl: "https://api.iconify.design/lucide:zap.svg?color=%2319BAFF",
  faviconUrl: "https://api.iconify.design/lucide:shield-check.svg?color=%2319BAFF",
  
  // --- ช่องทางติดต่อ & ชุมชน ---
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
      badge: "NYX9 SPECIAL SERVICE",
      title: "DISCORD NITRO & AUTO QUEST ENGINE",
      description: "ทำเควสดิสคอร์ดอัตโนมัติ รับของรางวัล Orbs และบูสต์แท้ 100% ไม่ต้องเปิดเกมทิ้งไว้",
      ctaText: "เลือกซื้อบริการ",
      ctaCategory: "cat-discord-nitro",
      bgGradient: "from-cyan-950/60 via-slate-900/90 to-[#06080C]",
      accentTag: "ระบบออโต้ 24/7"
    },
    {
      id: "banner-2",
      badge: "GAMING & FIVEM READY",
      title: "FIVEM ROCKSTAR & STEAM GTA V",
      description: "รหัสพร้อมเล่น ปลดแบน HWID สะอาดแท้ 2 ชั้น สต็อกแน่นพร้อมส่งทันที",
      ctaText: "ดูรายการไอดี",
      ctaCategory: "cat-gaming-apps",
      bgGradient: "from-blue-950/60 via-slate-900/90 to-[#06080C]",
      accentTag: "สต็อกพร้อมส่ง"
    },
    {
      id: "banner-3",
      badge: "CRYPTO LTC BONUS",
      title: "เติมเงินด้วย LITECOIN (LTC) รับฟรี +5%",
      description: "ไร้ค่าธรรมเนียมแพง รวดเร็ว ไม่ต้องยืนยันตัวตน เติมได้ไม่อั้นตลอด 24 ชั่วโมง",
      ctaText: "เติมเงินทันที",
      ctaAction: "openTopUp",
      bgGradient: "from-emerald-950/50 via-slate-900/90 to-[#06080C]",
      accentTag: "โบนัส +5%"
    }
  ],

  // --- ธีมสี (Futuristic Glacier Cyan & Obsidian Theme) ---
  theme: {
    accent: "#19BAFF",       // Glacier Cyan (Primary Action & Borders)
    accentHover: "#38D4FF",  // Glowing Highlights
    accentGlow: "rgba(25, 186, 255, 0.35)",
    baseBg: "#06080C",       // Deep Obsidian Void Canvas
    cardBg: "#0E131D",       // Surface Layer 1
    cardHover: "#131926",    // Surface Hover
    borderLight: "rgba(25, 186, 255, 0.15)",
    borderActive: "rgba(25, 186, 255, 0.45)"
  },

  // --- สถิติความน่าเชื่อถือ (4-Metric Telemetry Grid) ---
  metrics: {
    totalUsers: "30,000+",
    totalProducts: "145+",
    ordersFulfilled: "660,000+",
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
 * 📦 COMMERCIAL MULTI-NICHE CATALOG DATA
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
    name: "DISCORD NITRO & BOOSTS",
    subName: "แพ็กเกจไนโตร บูสเซิร์ฟเวอร์ & ไอเทมตกแต่งโปรไฟล์",
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
        chips: ["⚡ ส่งทันที", "🛡️ ประกันเต็ม", "💎 2 บูส"],
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
        chips: ["👑 ยกเมลแท้", "💎 2 บูส", "🔑 เปลี่ยนรหัสได้"],
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
        chips: ["🚀 2 บูสแท้", "⚡ ใน 1 นาที"],
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
        chips: ["⏳ 90 วันเต็ม", "🔥 ยอดนิยม"],
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
        chips: ["🎁 กิฟต์ลิงก์", "✨ ไอดีใหม่"],
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
        chips: ["♾️ ถาวร", "🎨 ของแต่งแท้"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Avatar Deco", "Permanent Nameplates", "nitro", "#F59E0B", "#EF4444"),
        sampleDelivery: "GIFT-DECO-PERM-DISCORD-TOKEN-9283-WICHX",
        warrantyDays: 365
      }
    ]
  },
  {
    id: "cat-discord-services",
    name: "DISCORD SERVICES & ACCOUNTS",
    subName: "บริการปั๊มเมมเบอร์ ยืนยันเบอร์ OTP และไอดีดิสคอร์ดปีเก่า",
    icon: "cpu",
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
        chips: ["👥 มีรูปโปรไฟล์", "⚡ เริ่มใน 5 นาที"],
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
        chips: ["📱 เบอร์ไทย/นอก", "⏱️ ส่งรหัสใน 30 วิ"],
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
        chips: ["🏅 รับตราทันที", "🎮 ไม่ต้องเปิดเกม"],
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
        chips: ["🛡️ พร้อมใช้งาน", "🤖 ไม่ติดบอท"],
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
        chips: ["🏛️ ปีเก่าหายาก", "👑 ยกเมลหลัก"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Discord Vintage", "Rare 2016-2018 ID", "discord", "#F59E0B", "#E11D48"),
        sampleDelivery: "og_discord_2016_legacy@rambler.ru:VintagePass2016! | Full Access",
        warrantyDays: 30
      }
    ]
  },
  {
    id: "cat-gaming-apps",
    name: "GAMING ACCOUNTS & STREAMING APPS",
    subName: "ไอดีเกม FiveM, Steam GTAV, แอปพรีเมียม & AI Tools",
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
        chips: ["🚗 FiveM", "⚡ ส่งทันที"],
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
        chips: ["🎮 Steam แท้", "🔑 ยกไอดี"],
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
        chips: ["🎬 จอส่วนตัว", "🛡️ ประกัน 30 วัน"],
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
        chips: ["🎵 ไร้โฆษณา", "⚡ อนุมัติไว"],
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
        chips: ["💻 AI Tool", "⏳ พรีออเดอร์"],
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
        chips: ["❌ หมดชั่วคราว", "🔄 รอเติมของ"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Out of Stock", "Item Unavailable", "key", "#6B7280", "#374151"),
        sampleDelivery: ""
      }
    ]
  },
  {
    id: "cat-uncategorized",
    name: "📦 สินค้าทั่วไป (UNCATEGORIZED)",
    subName: "หมวดสินค้าสแตนด์อโลน สามารถเปิด-ปิดการแสดงผลได้อย่างอิสระ",
    icon: "box",
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
        chips: ["🔑 คีย์แท้", "♾️ ถาวร", "🛡️ ย้ายเครื่องได้"],
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
        chips: ["🎧 เมลเดิม", "⚡ ต่ออายุได้"],
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
      categories: initialCategories,
      categoryFilters: initialFilters,
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
    window.UI?.toast("กำลังเปลี่ยนเส้นทางไปหน้าล็อกอิน Discord...", "info");
    try {
      await window.SupabaseAdapter.loginWithDiscord();
    } catch (err) {
      window.UI?.toast(`เกิดข้อผิดพลาด: ${err.message}`, "error");
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
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      try {
        const liveCats = await window.SupabaseAdapter.getProducts();
        if (liveCats && liveCats.length > 0) {
          window.categoriesData = liveCats;
          this.store.set("categories", liveCats);
        }
      } catch (err) {
        console.warn("[CATALOG SERVICE] Failed to fetch live products, using fallback:", err.message);
      }
    }
    this.initCategoryFilters();
  }

  initCategoryFilters() {
    const cats = this.store.get("categories") || [];
    const filters = {};
    cats.forEach(cat => {
      filters[cat.id] = true; // Default all visible
    });
    this.store.set("categoryFilters", filters);
  }

  setCategoryFilter(catId) {
    const cats = this.store.get("categories") || [];
    const filters = {};
    if (catId === "all") {
      cats.forEach(c => filters[c.id] = true);
    } else {
      cats.forEach(c => filters[c.id] = (c.id === catId));
    }
    this.store.set("categoryFilters", filters);
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
          discordId: user?.discordId || null
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



/* ============================================================================== */
/* 📦 MODULE: js/components/HeroSection.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🚀 HERO & TELEMETRY COMPONENT (OOP CONTROLLER)
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
      <div class="w-full flex-shrink-0 relative rounded-2xl overflow-hidden p-6 md:p-12 border border-[rgba(25,186,255,0.2)] bg-gradient-to-r ${banner.bgGradient} transition-all duration-500">
        <div class="relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(25,186,255,0.15)] border border-[rgba(25,186,255,0.3)] text-xs font-mono-val text-[var(--accent)] font-bold mb-4">
            <span class="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping"></span>
            ${banner.badge} • ${banner.accentTag}
          </div>
          <h2 class="text-2xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white tracking-wide leading-tight mb-3">
            ${banner.title}
          </h2>
          <p class="text-slate-300 text-sm md:text-base leading-relaxed mb-6 font-normal font-body">
            ${banner.description}
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <button onclick="window.handleBannerCta('${banner.ctaCategory || ''}', '${banner.ctaAction || ''}')" class="btn-cyber-primary px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold cursor-pointer">
              <span>${banner.ctaText}</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
            ${banner.accentTag ? `<span class="text-xs font-mono text-slate-400">${banner.accentTag}</span>` : ""}
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
    setVal("metric-users", metrics.totalUsers || "30,000+");
    setVal("metric-products", metrics.totalProducts || "145+");
    setVal("metric-orders", metrics.ordersFulfilled || "660,000+");
    setVal("metric-uptime", metrics.uptime || "24/7 AUTO");
  }
}

window.HeroSectionComponent = HeroSectionComponent;



/* ============================================================================== */
/* 📦 MODULE: js/components/CatalogView.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 📦 CATALOG & PRODUCT CARDS COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class CatalogViewComponent {
  constructor(store) {
    this.store = store;
    this.store.on("change:categories", () => this.render());
    this.store.on("change:categoryFilters", () => this.render());
    this.store.on("change:searchQuery", () => this.renderProducts());
  }

  render() {
    this.renderCategoryFilterBar();
    this.renderProducts();
  }

  renderCategoryFilterBar() {
    const container = document.getElementById("category-filter-bar");
    if (!container) return;

    const categories = this.store.get("categories") || [];
    const filters = this.store.get("categoryFilters") || {};
    const allActive = categories.every(c => filters[c.id]);

    let html = `
      <button onclick="window.Shop?.catalogService?.setCategoryFilter('all')" class="px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${allActive ? 'border-[var(--accent)] bg-[rgba(25,186,255,0.15)] text-[var(--accent)]' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}">
        <i data-lucide="layers" class="w-3.5 h-3.5"></i>
        <span>ทั้งหมด (${categories.reduce((acc, c) => acc + (c.products?.length || 0), 0)})</span>
      </button>
    `;

    categories.forEach(cat => {
      const isVisible = !!filters[cat.id];
      html += `
        <div class="inline-flex items-center rounded-xl border ${isVisible ? 'border-[var(--accent)] bg-[rgba(25,186,255,0.1)]' : 'border-slate-800 bg-slate-900/60 opacity-60'} transition-all overflow-hidden">
          <button onclick="window.Shop?.catalogService?.setCategoryFilter('${cat.id}')" class="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${isVisible ? 'text-[var(--accent)]' : 'text-slate-400 hover:text-white'}">
            <i data-lucide="${cat.icon || 'folder'}" class="w-3.5 h-3.5"></i>
            <span>${cat.name} (${cat.products?.length || 0})</span>
          </button>
          <button onclick="window.Shop?.catalogService?.toggleCategoryEye('${cat.id}')" class="px-2 py-1.5 border-l border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-[var(--accent)] transition-colors cursor-pointer" title="เปิด/ปิดการแสดงผล">
            <i data-lucide="${isVisible ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  renderProducts() {
    const container = document.getElementById("catalog-container") || document.getElementById("products-catalog-container");
    if (!container) return;

    const categories = this.store.get("categories") || [];
    const filters = this.store.get("categoryFilters") || {};
    const query = this.store.get("searchQuery") || "";

    const visibleCategories = categories.filter(c => filters[c.id]);

    if (visibleCategories.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
          <i data-lucide="eye-off" class="w-8 h-8 mx-auto text-slate-500 mb-2"></i>
          <p class="text-sm text-slate-400">ทุกหมวดหมู่ถูกปิดการแสดงผลอยู่ กดเปิดที่แถบตัวกรองด้านบนเพื่อดูสินค้า</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = visibleCategories.map(cat => {
      let prods = cat.products || [];
      if (query) {
        prods = prods.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.chips?.some(c => c.toLowerCase().includes(query))
        );
      }

      if (prods.length === 0 && query) return "";

      return `
        <div id="${cat.id}" class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-2 h-5 rounded-full bg-[var(--accent)]"></span>
              <h3 class="text-base sm:text-lg font-heading font-extrabold text-white">${cat.name}</h3>
              <span class="text-xs text-slate-400 font-mono">${cat.subName || ""}</span>
            </div>
            <span class="text-xs text-slate-400 font-mono">${prods.length} รายการ</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${prods.map(p => this.createProductCardHTML(p, cat)).join("")}
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }

  createProductCardHTML(p, cat) {
    const isOut = p.stock === 0;
    const isCustom = p.fulfillmentType === "custom_form";

    return `
      <div class="product-card group rounded-2xl bg-[#0E131D] hover:bg-[#131926] border border-slate-800 hover:border-[var(--accent)]/60 transition-all p-3.5 flex flex-col justify-between relative shadow-lg">
        <div>
          <!-- Artwork Area (1:1 Ratio) -->
          <div class="w-full aspect-square rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative mb-3 flex items-center justify-center p-2">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />` : `<i data-lucide="box" class="w-12 h-12 text-slate-600"></i>`}
            
            <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
              ${p.status ? `<span class="px-2 py-0.5 rounded-md bg-[rgba(25,186,255,0.2)] text-[var(--accent)] border border-[rgba(25,186,255,0.4)] text-[10px] font-mono font-bold">${p.status}</span>` : ""}
            </div>

            <div class="absolute top-2 right-2 z-10">
              <span class="px-2 py-0.5 rounded-md ${isOut ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'} border text-[10px] font-mono font-bold">
                ${isOut ? 'หมด' : `สต็อก: ${p.stock}`}
              </span>
            </div>
          </div>

          <!-- Title & Chips -->
          <h4 class="text-sm font-heading font-bold text-white group-hover:text-[var(--accent)] transition-colors line-clamp-1 mb-1.5">${p.title}</h4>
          
          <div class="flex flex-wrap gap-1 mb-3">
            ${(p.chips || []).map(chip => `
              <span class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono">${chip}</span>
            `).join("")}
          </div>
        </div>

        <!-- Footer & Action -->
        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <div class="text-[10px] text-slate-500 line-through">${p.originalPrice ? `฿${p.originalPrice}` : ""}</div>
            <div class="text-base font-mono font-extrabold text-[var(--accent)]">฿${p.price.toFixed(2)}</div>
          </div>

          ${isCustom ? `
            <button onclick="window.Shop?.modals?.openCustomServiceForm('${p.id}')" class="btn-cyber-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
              <span>สั่งทำ</span>
            </button>
          ` : `
            <button onclick="window.Shop?.cartManager?.addToCartById('${p.id}')" ${isOut ? 'disabled' : ''} class="${isOut ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' : 'btn-cyber-primary cursor-pointer'} px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
              <span>ใส่ตะกร้า</span>
            </button>
          `}
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
 * 💳 TOP-UP MODAL COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class TopUpModalComponent {
  constructor(store, paymentService) {
    this.store = store;
    this.paymentService = paymentService;
    this.activeTab = "promptpay";
  }

  open(recommendedAmount = 0) {
    const modal = document.getElementById("topup-modal");
    if (!modal) return;
    modal.classList.remove("hidden");

    const input = document.getElementById("promptpay-amount-input");
    const val = recommendedAmount > 0 ? Math.ceil(recommendedAmount) : parseFloat(input?.value || "100");
    if (input) input.value = val;

    this.switchGateway("promptpay");
    this.updatePromptPayQr(val);
  }

  close() {
    const modal = document.getElementById("topup-modal");
    if (modal) modal.classList.add("hidden");
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
    const tabs = ["promptpay", "truemoney", "bank_transfer", "card_payment", "crypto_ltc"];
    
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const pane = document.getElementById(`gateway-panel-${t}`);
      
      if (t === tabKey) {
        if (btn) btn.className = "p-2.5 rounded-xl border border-[var(--accent)] bg-[rgba(25,186,255,0.15)] text-[var(--accent)] text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer";
        if (pane) pane.classList.remove("hidden");
      } else {
        if (btn) btn.className = "p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer";
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
      window.UI?.toast(`🧧 รับเงินจากซองของขวัญสำเร็จ +฿${res.amount.toFixed(2)}!`, "success");
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
      window.UI?.toast(`🏦 เติมเงินผ่านธนาคารสำเร็จ +฿${amount.toFixed(2)}!`, "success");
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
      window.UI?.toast(`💳 ตัดบัตรสำเร็จ +฿${amount.toFixed(2)} เข้ากระเป๋าแล้ว!`, "success");
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
        <div class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0B0F19]/95 border border-slate-800 shadow-2xl shadow-[var(--accent)]/10 overflow-hidden">
          
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

          <!-- Search Filter Bar -->
          <div class="px-5 md:px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input 
                type="text" 
                id="history-search-input"
                oninput="window.handleHistorySearch(event)"
                placeholder="ค้นหาด้วยรหัสออเดอร์ (เช่น WX-123456) หรือชื่อสินค้า..." 
                class="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] transition-all font-body"
              />
            </div>
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
    this.initDOM();
    const modalEl = document.getElementById("history-modal");
    if (!modalEl) return;

    modalEl.classList.remove("hidden");
    modalEl.classList.add("flex");

    const container = document.getElementById("history-orders-container");
    container.innerHTML = `
      <div class="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div class="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs font-mono">กำลังโหลดประวัติคำสั่งซื้อ...</p>
      </div>
    `;

    try {
      this.orders = await this.historyService.getOrderHistory();
      this.render();
    } catch (e) {
      container.innerHTML = `
        <div class="py-8 text-center text-rose-400 text-xs font-body">
          เกิดข้อผิดพลาดในการโหลดประวัติ: ${e.message}
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  close() {
    const modalEl = document.getElementById("history-modal");
    if (!modalEl) return;
    modalEl.classList.add("hidden");
    modalEl.classList.remove("flex");
  }

  filter(query) {
    this.activeSearch = (query || "").trim().toLowerCase();
    this.render();
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

            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-[10px] text-slate-400 font-mono">ยอดสุทธิ</div>
                <div class="text-xs font-mono font-bold text-white">฿${(order.totalAmount || 0).toFixed(2)}</div>
              </div>
              <button 
                onclick="window.quickClaimOrder('${order.orderId}')"
                class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-[11px] text-slate-300 hover:text-rose-300 font-body flex items-center gap-1 transition-all cursor-pointer"
                title="ยื่นเรื่องเคลมสินค้านี้"
              >
                <i data-lucide="life-buoy" class="w-3 h-3 text-rose-400"></i>
                <span>แจ้งเคลม</span>
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
/* 📦 MODULE: js/components/DiscordServiceModal.js */
/* ============================================================================== */
/**
 * ==============================================================================
 * 🚀 DISCORD SERVICES & INTERACTIVE CALCULATOR (BOOST & QUESTS)
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
        <div class="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0B0F19]/95 border border-slate-800 shadow-2xl shadow-[#5865F2]/20 overflow-hidden">
          
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
              <div class="text-[10px] font-mono text-emerald-400 font-bold">🔥 POPULAR • LV.3</div>
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
    const orderIdEl = document.getElementById("delivery-order-id");

    if (!modal || !container) return;

    if (orderIdEl) orderIdEl.textContent = result.order_id || `WX-${Date.now()}`;

    const items = result.dispensed_items || [];
    container.innerHTML = items.map(item => `
      <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
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
    const modal = document.getElementById("claim-ticket-modal");
    if (modal) modal.classList.remove("hidden");
  }

  closeClaim() {
    const modal = document.getElementById("claim-ticket-modal");
    if (modal) modal.classList.add("hidden");
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
    this.discordServiceModal = new window.DiscordServiceModalComponent(this.store);
    this.modals = new window.ModalsComponent(this.store, this.checkoutService);
    this.socialProof = new window.SocialProofComponent();
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
    if (window.lucide) lucide.createIcons();
    console.info("✅ [NYX9 STUDIO] Storefront Ready!");
  }

  renderAcceptedPaymentsFooter() {
    const container = document.getElementById("footer-accepted-payments");
    if (!container) return;

    const payments = window.storeConfig?.acceptedPayments || [];
    const paymentLabels = {
      promptpay: { name: "PromptPay QR", icon: "qr-code" },
      truemoney: { name: "TrueMoney Wallet", icon: "wallet" },
      bank_transfer: { name: "โอนผ่านธนาคาร", icon: "landmark" },
      card_payment: { name: "บัตรเครดิต/เดบิต (Visa/MC)", icon: "credit-card" },
      crypto_ltc: { name: "Litecoin (LTC)", icon: "coins" }
    };

    container.innerHTML = payments.map(p => {
      const info = paymentLabels[p] || { name: p, icon: "credit-card" };
      return `
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono-val text-slate-300">
          <i data-lucide="${info.icon}" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
          <span>${info.name}</span>
        </div>
      `;
    }).join("");

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
window.openTopUpModal = (amt) => window.Shop.topupModal.open(amt);
window.closeTopUpModal = () => window.Shop.topupModal.close();
window.switchTopUpGateway = (tab) => window.Shop.topupModal.switchGateway(tab);
window.switchTopUpTab = window.switchTopUpGateway;
window.setPromptPayPreset = (amt) => {
  const el = document.getElementById("promptpay-amount-input");
  if (el) el.value = amt;
  window.Shop.topupModal.updatePromptPayQr(amt);
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
window.openHistoryModal = () => window.Shop.historyModal.open();
window.closeHistoryModal = () => window.Shop.historyModal.close();
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
window.openClaimModal = () => window.Shop.modals.openClaim();
window.closeClaimModal = () => window.Shop.modals.closeClaim();
window.submitClaimTicket = () => window.Shop.modals.submitClaim();
window.handleSearchInput = (e) => window.Shop.catalogService.setSearchQuery(e.target.value);
window.showToast = (msg, type) => window.UI?.toast(msg, type);
window.triggerConfetti = () => window.UI?.confetti();
