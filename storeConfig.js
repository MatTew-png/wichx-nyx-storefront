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

  // --- ข้อมูลพื้นฐานและแบรนดิ้ง (Rebranded for NYX9 STUDIO) ---
  storeName: "NYX9 STUDIO",
  brandShort: "NYX9",
  tagline: "ระบบร้านค้าบริการอัตโนมัติตลอด 24 ชั่วโมง สะดวกรวดเร็ว ปลอดภัย",
  subTagline: "ศูนย์รวมบริการดิจิทัล Discord, บูสต์เซิร์ฟเวอร์, เควสอัตโนมัติ, FiveM & ไอที ครบวงจร การันตีมากกว่า 660,000 ออเดอร์",
  logoUrl: "assets/logo.png",
  faviconUrl: "assets/logo.png",
  
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
