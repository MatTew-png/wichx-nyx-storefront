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
    { tag: "FLASH SALE", icon: "zap", text: "Discord Nitro Booster 1 เดือน ลดพิเศษเหลือเพียง", highlight: "฿169", color: "sky" },
    { tag: "AUTO 24/7", icon: "bot", text: "ระบบตัดยอดอัตโนมัติ จัดส่งรหัสทันทีไม่ต้องรอแอดมิน", highlight: "ใน 1 นาที", color: "emerald" },
    { tag: "VERIFIED", icon: "shield-check", text: "รับประกันไอดีและสินค้าแท้ 100% มีทีมซัพพอร์ต", highlight: "ดูแลตลอด 24 ชม.", color: "blue" },
    { tag: "LTC BONUS", icon: "coins", text: "ชำระเงินผ่าน Crypto Litecoin รับยอดเงินเพิ่มทันที", highlight: "ฟรี +5% ทุกบิล", color: "amber" }
  ],

  // --- แบนเนอร์โปรโมชั่นสไลด์ (Hero Carousel) ---
    heroBanners: [
    {
      id: "banner-nitro",
      themeColor: "sky",
      badge: "🔥 FLASH DEAL • ลดพิเศษ 48%",
      title: "DISCORD NITRO & BOOSTS",
      highlight: "ราคาเริ่มต้นเพียง ฿150",
      description: "รหัสแท้ 100% บอทส่งเข้าคลังอัตโนมัติใน 3 วินาที ไม่ต้องให้รหัสผ่านบัญชี พร้อม 2 บูสต์ในตัว ปลดล็อกทุกอิโมจิและส่งไฟล์ขนาดใหญ่ 500MB คุ้มค่าที่สุด",
      perks: ["ไม่ต้องให้รหัสผ่าน", "2x Server Boosts ในตัว", "รับประกันแท้ 30-90 วัน"],
      ctaText: "เลือกซื้อ Nitro ทันที",
      ctaCategory: "cat-discord-nitro",
      secondaryText: "คำนวณราคาบูสต์",
      secondaryAction: "discordCalculator",
      // Right Hologram Card Data
      cardBadge: "SALE -48%",
      cardBadgeColor: "bg-white/[0.04] text-sky-300 border-sky-400/30",
      cardTitle: "Nitro Booster (Mailpass 3 เดือน)",
      cardSub: "ยกเมลเปลี่ยนรหัสได้แท้ 100%",
      cardPrice: "฿150.00",
      cardOriginalPrice: "฿290.00",
      cardStock: "พร้อมส่ง 20 ชิ้น",
      cardPerks: [
        { icon: "smile", text: "ใช้อิโมจิ & สติ๊กเกอร์เคลื่อนไหวได้ทุกเซิร์ฟเวอร์" },
        { icon: "rocket", text: "รับ 2x Server Boosts ฟรี ยกระดับเซิร์ฟเวอร์" },
        { icon: "upload", text: "สตรีมภาพ HD 60FPS + ส่งไฟล์สูงสุด 500MB" }
      ],
      productId: "nitro-3m-mailpass"
    },
    {
      id: "banner-fivem",
      themeColor: "amber",
      badge: "🎮 GAMING READY • ปลดแบน HWID",
      title: "FIVEM READY & STEAM แท้",
      highlight: "ไอดีสะอาดแท้ ยกเมล 100%",
      description: "ไอดีสดใหม่ยกเมลเปลี่ยนรหัสและอีเมลหลักได้ทันที ไร้ประวัติแบน คัดเกรดก่อนลงคลัง พร้อมโดดเข้าทุกเซิร์ฟเวอร์ดังได้ทันที ไร้ปัญหากวนใจ",
      perks: ["ยกเมลเปลี่ยนได้ 100%", "เข้าได้ทุกเมืองดัง", "HWID Clean ปลอดภัย"],
      ctaText: "ดูไอดี FiveM พร้อมส่ง",
      ctaCategory: "cat-gaming-apps",
      secondaryText: "ไอดีเกมมิ่งทั้งหมด",
      secondaryCategory: "cat-gaming-apps",
      // Right Hologram Card Data
      cardBadge: "HOT DEAL",
      cardBadgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      cardTitle: "Rockstar FiveM สดใหม่",
      cardSub: "ไอดีสะอาดแท้ 2 ชั้น • พร้อมเล่นทันที",
      cardPrice: "฿10.00",
      cardOriginalPrice: "฿50.00",
      cardStock: "พร้อมส่งในระบบ",
      cardPerks: [
        { icon: "shield", text: "ไอดีสะอาด ไร้ประวัติโดนแบนจากระบบ Global" },
        { icon: "globe", text: "เชื่อมโยงเซิร์ฟเวอร์ FiveM ได้ทุกประเทศ ทุกเมือง" },
        { icon: "key", text: "เปลี่ยนรหัสผ่านและเมลสำรองได้อิสระ 100%" }
      ],
      productId: "rockstar-fivem-fresh"
    },
    {
      id: "banner-wallet",
      themeColor: "emerald",
      badge: "⚡ AUTO 24/7 • ตัดยอด Real-time",
      title: "ระบบเติมเงินอัตโนมัติ",
      highlight: "ฟรีค่าธรรมเนียม 0% เข้าใน 5 วิ",
      description: "รองรับทั้ง พร้อมเพย์ QR Code, ซองของขวัญ TrueMoney, บัญชีธนาคารกสิกร และบัตรเครดิต บอทเช็คยอดอัตโนมัติตลอด 24 ชม. เครดิตเข้ากระเป๋าทันที",
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
    accent: "#38BDF8",       // Electric Sapphire / Ice Sky
    accentHover: "#7DD3FC",  // Soft Ice Glow
    accentGlow: "rgba(56, 189, 248, 0.14)",
    baseBg: "#06080C",       // Deep Midnight Obsidian
    cardBg: "#0A0D14",       // Surface Layer 1
    cardHover: "#0F1420",    // Surface Hover
    borderLight: "rgba(255, 255, 255, 0.07)",
    borderActive: "rgba(56, 189, 248, 0.35)"
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
