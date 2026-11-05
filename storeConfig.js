/**
 * ==============================================================================
 * 🚀 WHITELABEL CONFIGURATION ENGINE (1-FILE REBRANDING)
 * ==============================================================================
 * แก้ไขไฟล์นี้เพียงไฟล์เดียวเพื่อเปลี่ยนชื่อร้าน, ธีมสี, คอนแทค, ข้อมูลโซเชียล,
 * ตัวเลขสถิติ (Metrics) และช่องทางชำระเงินทั้งระบบทันที
 * ==============================================================================
 */

const storeConfig = {
  // --- ข้อมูลพื้นฐานและแบรนดิ้ง ---
  storeName: "WICHX × NYX STUDIO",
  brandShort: "WICHX",
  tagline: "ศูนย์รวมบริการดิจิทัล Discord, FiveM, สตรีมมิ่ง & ไอที ครบวงจร 24 ชม.",
  subTagline: "ระบบอัตโนมัติ 100% จัดส่งทันที รับประกันสินค้าทุกชิ้น การันตีมากกว่า 660,000 ออเดอร์",
  logoUrl: "https://api.iconify.design/lucide:zap.svg?color=%2319BAFF",
  faviconUrl: "https://api.iconify.design/lucide:shield-check.svg?color=%2319BAFF",
  
  // --- ช่องทางติดต่อ & ชุมชน ---
  discordCommunityUrl: "https://discord.gg/your-invite",
  contactLine: "@yourshop",
  contactFacebook: "https://facebook.com/yourshop",
  supportEmail: "support@wichxshop.com",

  // --- ประกาศแถบวิ่งด้านบนสุด (Marquee Ticker) ---
  announcements: [
    "🔥 FLASH SALE: Discord Nitro Booster 1 เดือน ลดพิเศษเพียง ฿169 เท่านั้น!",
    "⚡ ระบบตัดยอดอัตโนมัติ 24 ชม. ส่งรหัสทันทีไม่ต้องรอแอดมินตอบ",
    "🛡️ รับประกันสินค้ายกเมลแท้ มีทีมงานซัพพอร์ตตลอดเวลา",
    "🪙 ชำระผ่าน Crypto LTC รับโบนัสยอดเงินเพิ่มทันที +5% ทุกบิล!"
  ],

  // --- แบนเนอร์โปรโมชั่นสไลด์ (Hero Carousel) ---
  heroBanners: [
    {
      id: "banner-1",
      badge: "DISCORD NITRO SALE",
      title: "DISCORD NITRO & SERVER BOOSTS",
      description: "บูสแท้ 100% ส่งไวใน 1 นาที ไม่ดึงกลับ รับประกันตลอดอายุการใช้งาน",
      ctaText: "เลือกซื้อเลย",
      ctaCategory: "cat-discord-nitro",
      bgGradient: "from-cyan-950/60 via-slate-900/90 to-[#06080C]",
      accentTag: "ลดสูงสุด 48%"
    },
    {
      id: "banner-2",
      badge: "GAMING & FIVEM READY",
      title: "FIVEM ROCKSTAR & STEAM ACCOUNTS",
      description: "รหัสพร้อมเล่น ปลดแบน HWID สะอาดแท้ 2 ชั้น เปลี่ยนรหัสผ่านได้ทันที",
      ctaText: "ดูรายการไอดี",
      ctaCategory: "cat-gaming-apps",
      bgGradient: "from-blue-950/60 via-slate-900/90 to-[#06080C]",
      accentTag: "สต็อกแน่น 290+ ไอดี"
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

  // --- เกตเวย์ชำระเงินที่รองรับ ---
  acceptedPayments: ["promptpay", "truemoney", "crypto_ltc"],

  // ข้อมูลตั้งค่าบัญชีรับเงิน
  paymentDetails: {
    promptpay: {
      accountName: "WICHX STORE CO., LTD.",
      promptpayNumber: "095-XXX-XXXX",
      minAmount: 10,
      feeRate: 0.0
    },
    truemoney: {
      accountName: "WICHX WALLET AUTO",
      feeRate: 0.0,
      hint: "กรอกลิงก์ซองของขวัญ TrueMoney Wallet เพื่อรับเงินเข้าทันที"
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
    "WICHX10": { discountPercent: 10, minSpend: 100, label: "ลดทันที 10%" },
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
