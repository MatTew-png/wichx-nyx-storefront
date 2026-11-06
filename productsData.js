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
        sampleDelivery: "GIFT-DECO-PERM-DISCORD-TOKEN-9283-WICHX",
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
