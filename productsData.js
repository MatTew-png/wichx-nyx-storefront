/**
 * ==============================================================================
 * 📦 COMMERCIAL MULTI-NICHE CATALOG DATA
 * ==============================================================================
 * ข้อมูลสินค้าครอบคลุมทุกหมวดตามสเปก พร้อมระบบ Dual-Fulfillment
 * (Instant Delivery / Custom Order Form) และ SVG Artwork อัตราส่วน 16:9
 * ==============================================================================
 */

// ฟังก์ชันสร้าง Artwork SVG สไตล์ Cyberpunk 16:9 คมชัด รองรับเรตินา ไม่ต้องพึ่งพาภาพภายนอก
function createCyberArtwork(title, sub, iconType, primaryColor, secondaryColor) {
  const icons = {
    nitro: `<path d="M12 2L4 14h6l-2 8 10-12h-6l4-8z" fill="${primaryColor}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
    boost: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3m0 0l8.5-8.5a2.12 2.12 0 1 1 3 3L12 15m-3-3v3h3" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    discord: `<rect x="3" y="5" width="18" height="14" rx="4" stroke="${primaryColor}" stroke-width="2" fill="none"/><circle cx="9" cy="12" r="1.5" fill="${primaryColor}"/><circle cx="15" cy="12" r="1.5" fill="${primaryColor}"/>`,
    game: `<rect x="2" y="6" width="20" height="12" rx="3" stroke="${primaryColor}" stroke-width="2" fill="none"/><path d="M6 12h4m-2-2v4m9-2h.01m3 0h.01" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>`,
    stream: `<polygon points="5 3 19 12 5 21 5 3" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.5"/>`,
    key: `<path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3L3.5 13.5a5 5 0 1 0 7 7L18 13l2-2 1.5-1.5M16 5l3 3" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>`,
    ai: `<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="${primaryColor}" stroke-width="2"/>`
  };

  const selectedIcon = icons[iconType] || icons.nitro;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
    <defs>
      <linearGradient id="bg-${title.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#060911" />
        <stop offset="50%" stop-color="#0B1220" />
        <stop offset="100%" stop-color="#05080E" />
      </linearGradient>
      <linearGradient id="glow-${title.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
      </linearGradient>
      <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="640" height="360" fill="url(#bg-${title.replace(/[^a-zA-Z0-9]/g, '')})"/>
    <rect width="640" height="360" fill="url(#grid)"/>
    <circle cx="320" cy="180" r="130" fill="${primaryColor}" fill-opacity="0.07" filter="blur(40px)"/>
    <circle cx="500" cy="80" r="90" fill="${secondaryColor}" fill-opacity="0.08" filter="blur(30px)"/>
    
    <!-- Cyber Geometric Frame -->
    <path d="M 20 40 L 40 20 L 600 20 L 620 40 L 620 320 L 600 340 L 40 340 L 20 320 Z" fill="none" stroke="rgba(25, 186, 255, 0.15)" stroke-width="1.5"/>
    <line x1="40" y1="20" x2="140" y2="20" stroke="${primaryColor}" stroke-width="3"/>
    <line x1="500" y1="340" x2="600" y2="340" stroke="${secondaryColor}" stroke-width="3"/>

    <!-- Center Holo Symbol -->
    <g transform="translate(288, 85) scale(2.7)">
      ${selectedIcon}
    </g>

    <!-- Typography -->
    <text x="320" y="250" text-anchor="middle" fill="#FFFFFF" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="28" letter-spacing="1">
      ${title.toUpperCase()}
    </text>
    <text x="320" y="285" text-anchor="middle" fill="${primaryColor}" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="14" letter-spacing="2">
      // ${sub.toUpperCase()} //
    </text>

    <!-- Top Badge Corner -->
    <rect x="35" y="32" width="90" height="22" rx="4" fill="rgba(25, 186, 255, 0.15)" stroke="${primaryColor}" stroke-width="1"/>
    <text x="80" y="47" text-anchor="middle" fill="${primaryColor}" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700">VERIFIED AUTH</text>
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = categoriesData;
} else {
  window.categoriesData = categoriesData;
}
