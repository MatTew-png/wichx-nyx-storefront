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
        chips: ["ยกเมลแท้", "2 บูส", "เปลี่ยนรหัสได้"],
        fulfillmentType: "instant",
        imageUrl: createCyberArtwork("Nitro 3 Months", "Full Email Transfer", "nitro", "#38D4FF", "#00FFA3"),
        sampleDelivery: "NITRO-3M-ACTIVE-KEY-8812",
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
        imageUrl: createCyberArtwork("Discord Vintage", "Rare 2016-2018 ID", "discord", "#F59E0B", "#E11D48"),
        sampleDelivery: "DISCORD-VINTAGE-AUTH-TOKEN-2016",
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
        sampleDelivery: "FIVEM-READY-CLEAN-AUTH-991",
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
        sampleDelivery: "STEAM-GTAV-CLEAN-SERIAL-771",
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
        sampleDelivery: "NETFLIX-UHD-SLOT-TOKEN-291",
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
