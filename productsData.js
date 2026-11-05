/**
 * ==============================================================================
 * 📦 COMMERCIAL MULTI-NICHE CATALOG DATA (3D GLOSSY HOLOGRAPHIC EDITION)
 * ==============================================================================
 * ออกแบบใหม่ทั้งหมดด้วยเวกเตอร์ SVG สไตล์ 3D Glossy Holographic Render
 * ไร้กล่องดำด้าน ไร้ไอคอนเส้นจิ๋ว มีมิติความลึก (Depth), แสงตกกระทบ (Specular Light),
 * และอนุภาคแสงเรืองรอง (Volumetric Glow) ระดับสตูดิโอเกมชั้นนำ
 * ==============================================================================
 */

// ฟังก์ชันสร้าง Artwork สไตล์ 3D Glossy Hologram 16:9 (Zero Plain Black Boxes)
function createModern3DArtwork(type, title, sub, primaryNeon, secondaryNeon, tertiaryGlow) {
  const artworkIllustrations = {
    // 1. DISCORD NITRO: เพชร 3D คริสตัลสีม่วง-ฟ้าคราม ลอยหมุน มีการหักเหของแสงและประกายดาว
    nitro: `
      <!-- Volumetric Backlight -->
      <circle cx="320" cy="180" r="140" fill="${primaryNeon}" fill-opacity="0.25" filter="blur(50px)"/>
      <circle cx="380" cy="140" r="90" fill="${secondaryNeon}" fill-opacity="0.3" filter="blur(40px)"/>
      
      <!-- 3D Holographic Discord Gem (Isometric Facets) -->
      <g transform="translate(320, 150) scale(1.15)">
        <!-- Drop Shadow on ground -->
        <ellipse cx="0" cy="95" rx="75" ry="18" fill="#000000" fill-opacity="0.6" filter="blur(8px)"/>
        
        <!-- Gem Back Facets -->
        <polygon points="0,-75 65,-25 0,75" fill="${secondaryNeon}" fill-opacity="0.5"/>
        <polygon points="0,-75 -65,-25 0,75" fill="${primaryNeon}" fill-opacity="0.4"/>
        
        <!-- Gem Front 3D Facets with Glossy Gradients -->
        <polygon points="0,-75 65,-25 0,-10" fill="url(#gem-facet-1)"/>
        <polygon points="0,-75 -65,-25 0,-10" fill="url(#gem-facet-2)"/>
        <polygon points="-65,-25 0,-10 0,75" fill="url(#gem-facet-3)"/>
        <polygon points="65,-25 0,-10 0,75" fill="url(#gem-facet-4)"/>

        <!-- Center 3D Specular Ridge & Star Flare -->
        <line x1="0" y1="-75" x2="0" y2="75" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
        <line x1="-65" y1="-25" x2="65" y2="-25" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6"/>
        
        <!-- Glowing Crystal Center Shield -->
        <circle cx="0" cy="-10" r="12" fill="#FFFFFF" filter="blur(2px)"/>
        <polygon points="0,-28 6,-14 20,-10 6,-6 0,8 -6,-6 -20,-10 -6,-14" fill="#FFFFFF"/>
        
        <!-- Floating Cyber Sparks -->
        <circle cx="-50" cy="-45" r="3" fill="#6CE2FF" filter="blur(1px)"/>
        <circle cx="60" cy="20" r="2.5" fill="#FFFFFF"/>
        <circle cx="45" cy="-55" r="4" fill="${secondaryNeon}" filter="blur(1.5px)"/>
      </g>
    `,

    // 2. SERVER BOOST: จรวด 3D บูสเตอร์ไฮเทค พุ่งทะลุวงแหวนโฮโลแกรม
    boost: `
      <circle cx="320" cy="180" r="130" fill="${primaryNeon}" fill-opacity="0.25" filter="blur(45px)"/>
      <g transform="translate(320, 160) scale(1.1)">
        <!-- Holographic Warp Rings -->
        <ellipse cx="0" cy="40" rx="90" ry="24" fill="none" stroke="${primaryNeon}" stroke-width="2.5" opacity="0.4" stroke-dasharray="6,6"/>
        <ellipse cx="0" cy="70" rx="120" ry="30" fill="none" stroke="${secondaryNeon}" stroke-width="1.5" opacity="0.25"/>
        
        <!-- 3D Rocket Body -->
        <path d="M 0,-85 C 22,-50 35,0 35,50 L -35,50 C -35,0 -22,-50 0,-85 Z" fill="url(#metallic-body)"/>
        <path d="M 0,-85 C 10,-50 15,0 15,50 L -15,50 C -15,0 -10,-50 0,-85 Z" fill="#FFFFFF" opacity="0.25"/>
        
        <!-- Wings -->
        <path d="M -35,20 L -65,55 L -35,45 Z" fill="${primaryNeon}"/>
        <path d="M 35,20 L 65,55 L 35,45 Z" fill="${secondaryNeon}"/>
        
        <!-- Porthole Window with Glowing Core -->
        <circle cx="0" cy="-15" r="16" fill="#0E131D" stroke="#6CE2FF" stroke-width="3"/>
        <circle cx="0" cy="-15" r="9" fill="#19BAFF"/>
        
        <!-- Jet Flame Plasma -->
        <polygon points="0,50 -18,50 0,95" fill="#FF7B00" opacity="0.9"/>
        <polygon points="0,50 18,50 0,95" fill="#FFB700" opacity="0.9"/>
        <polygon points="0,50 8,50 0,80" fill="#FFFFFF"/>
      </g>
    `,

    // 3. FIVEM / GTA V: รถสปอร์ตซูเปอร์คาร์ 3D ลอยตัว พร้อมไฟหน้าเลเซอร์นีออน
    car: `
      <circle cx="320" cy="180" r="140" fill="${primaryNeon}" fill-opacity="0.2" filter="blur(50px)"/>
      <g transform="translate(320, 160) scale(1.15)">
        <!-- Ground Neon Underglow -->
        <ellipse cx="0" cy="65" rx="110" ry="20" fill="${primaryNeon}" fill-opacity="0.4" filter="blur(12px)"/>
        
        <!-- 3D Supercar Silhouette & Glass Canopy -->
        <path d="M -85,45 C -80,25 -60,15 -35,12 L -20,-15 C -10,-28 10,-28 20,-15 L 35,12 C 60,15 80,25 85,45 Z" fill="url(#car-body-grad)"/>
        
        <!-- Windshield Reflection -->
        <path d="M -16,-12 C -8,-22 8,-22 16,-12 L 28,10 L -28,10 Z" fill="#6CE2FF" fill-opacity="0.45"/>
        <line x1="-12" y1="-8" x2="6" y2="8" stroke="#FFFFFF" stroke-width="2" opacity="0.8"/>
        
        <!-- Twin Laser Headlights -->
        <polygon points="-75,32 -60,30 -62,38 -77,40" fill="#6CE2FF"/>
        <polygon points="75,32 60,30 62,38 77,40" fill="#6CE2FF"/>
        
        <!-- Light Beams Projecting Forward -->
        <polygon points="-75,35 -140,80 -60,75" fill="${primaryNeon}" fill-opacity="0.25" filter="blur(6px)"/>
        <polygon points="75,35 140,80 60,75" fill="${primaryNeon}" fill-opacity="0.25" filter="blur(6px)"/>
        
        <!-- Center Cyber Emblem Badge -->
        <rect x="-18" y="22" width="36" height="14" rx="4" fill="#0E131D" stroke="#6CE2FF" stroke-width="1.5"/>
        <text x="0" y="32" text-anchor="middle" fill="#FFFFFF" font-family="'Space Grotesk'" font-size="8" font-weight="800">FIVEM</text>
      </g>
    `,

    // 4. STEAM & GAMING KEYS: คอนโทรลเลอร์ 3D เมทัลลิก ผสมเหรียญคริปโตเกมมิ่ง
    controller: `
      <circle cx="320" cy="180" r="130" fill="${secondaryNeon}" fill-opacity="0.25" filter="blur(45px)"/>
      <g transform="translate(320, 160) scale(1.1)">
        <!-- Ambient Shadow -->
        <ellipse cx="0" cy="65" rx="85" ry="18" fill="#000000" fill-opacity="0.5" filter="blur(8px)"/>
        
        <!-- Gamepad Base Squircles -->
        <path d="M -70,-20 C -70,-45 -40,-45 -25,-30 L 25,-30 C 40,-45 70,-45 70,-20 C 70,25 55,55 35,55 C 20,55 15,35 0,35 C -15,35 -20,55 -35,55 C -55,55 -70,25 -70,-20 Z" fill="url(#gamepad-grad)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
        
        <!-- D-Pad Left -->
        <rect x="-48" y="-12" width="16" height="6" rx="2" fill="#0E131D"/>
        <rect x="-43" y="-17" width="6" height="16" rx="2" fill="#0E131D"/>
        <circle cx="-40" cy="-9" r="2" fill="${primaryNeon}"/>

        <!-- ABXY Buttons Right (Glossy Neon Dots) -->
        <circle cx="35" cy="-9" r="4.5" fill="#FF0055" filter="drop-shadow(0 0 4px #FF0055)"/>
        <circle cx="45" cy="-19" r="4.5" fill="#00FF66" filter="drop-shadow(0 0 4px #00FF66)"/>
        <circle cx="45" cy="1" r="4.5" fill="#FFBB00" filter="drop-shadow(0 0 4px #FFBB00)"/>
        <circle cx="55" cy="-9" r="4.5" fill="#00AAFF" filter="drop-shadow(0 0 4px #00AAFF)"/>

        <!-- Center Glowing Steam Orb -->
        <circle cx="0" cy="-5" r="14" fill="#0A0E17" stroke="${primaryNeon}" stroke-width="2"/>
        <circle cx="0" cy="-5" r="6" fill="#6CE2FF" filter="blur(1px)"/>
      </g>
    `,

    // 5. STREAMING (NETFLIX / YOUTUBE): หน้าจอกระจก 3D Floating Glass Screen มุมเอียง มีแสง Lens Flare
    streaming: `
      <circle cx="320" cy="180" r="140" fill="${primaryNeon}" fill-opacity="0.25" filter="blur(50px)"/>
      <g transform="translate(320, 160) scale(1.15)">
        <!-- 3D Floating Curved Screen -->
        <rect x="-80" y="-48" width="160" height="96" rx="14" fill="url(#screen-glass-grad)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.5"/>
        
        <!-- Inner Specular Glint -->
        <path d="M -75,-44 L 40,-44 L -40,44 L -75,44 Z" fill="#FFFFFF" fill-opacity="0.08"/>
        
        <!-- Center Giant Play Triangle with Neon Flare -->
        <polygon points="-12,-24 24,0 -12,24" fill="url(#play-btn-grad)" filter="drop-shadow(0 0 16px ${primaryNeon})"/>
        
        <!-- 4K Ultra HD Badge -->
        <rect x="-65" y="24" width="34" height="14" rx="4" fill="rgba(0,0,0,0.6)" stroke="${primaryNeon}" stroke-width="1"/>
        <text x="-48" y="34" text-anchor="middle" fill="#FFFFFF" font-family="'Space Grotesk'" font-size="7" font-weight="800">4K UHD</text>
        
        <!-- Floating Audio Waves -->
        <rect x="45" y="26" width="3" height="10" rx="1.5" fill="${secondaryNeon}"/>
        <rect x="52" y="22" width="3" height="15" rx="1.5" fill="${primaryNeon}"/>
        <rect x="59" y="28" width="3" height="8" rx="1.5" fill="${secondaryNeon}"/>
      </g>
    `,

    // 6. OTP & PHONE VERIFY: ซิมการ์ด 3D ทองคำลอย มีคลื่นสัญญาณเรดาร์กระจาย
    otp: `
      <circle cx="320" cy="180" r="130" fill="${primaryNeon}" fill-opacity="0.25" filter="blur(45px)"/>
      <g transform="translate(320, 160) scale(1.15)">
        <!-- Pulsing Signal Waves -->
        <circle cx="0" cy="0" r="70" fill="none" stroke="${primaryNeon}" stroke-width="1.5" opacity="0.2" stroke-dasharray="4,4"/>
        <circle cx="0" cy="0" r="95" fill="none" stroke="${secondaryNeon}" stroke-width="1" opacity="0.15"/>

        <!-- 3D Microchip SIM Card Body -->
        <path d="M -45,-55 L 25,-55 L 45,-35 L 45,55 L -45,55 Z" fill="url(#sim-card-grad)" stroke="#6CE2FF" stroke-width="2"/>
        
        <!-- Gold Contact Grid -->
        <rect x="-28" y="-30" width="56" height="60" rx="6" fill="#F59E0B" fill-opacity="0.9"/>
        <rect x="-22" y="-24" width="20" height="22" rx="3" fill="#D97706"/>
        <rect x="2" y="-24" width="20" height="22" rx="3" fill="#D97706"/>
        <rect x="-22" y="2" width="20" height="22" rx="3" fill="#D97706"/>
        <rect x="2" y="2" width="20" height="22" rx="3" fill="#D97706"/>

        <!-- Dynamic OTP Floating Pill Badge -->
        <g transform="translate(0, 48)">
          <rect x="-42" y="-10" width="84" height="20" rx="10" fill="#060911" stroke="${primaryNeon}" stroke-width="1.5"/>
          <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-family="'JetBrains Mono'" font-size="10" font-weight="800" letter-spacing="2">OTP 24/7</text>
        </g>
      </g>
    `,

    // 7. DISCORD QUEST: โล่เกียรติยศ 3D Trophy ตราเควสต์สีรุ้งนีออน
    quest: `
      <circle cx="320" cy="180" r="140" fill="${primaryNeon}" fill-opacity="0.3" filter="blur(50px)"/>
      <g transform="translate(320, 155) scale(1.15)">
        <!-- 3D Prismatic Crest Shield -->
        <path d="M 0,-70 L 55,-35 C 55,25 30,65 0,80 C -30,65 -55,25 -55,-35 Z" fill="url(#shield-grad)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
        
        <!-- Inner Glowing Crest -->
        <path d="M 0,-56 L 42,-28 C 42,20 22,50 0,64 C -22,50 -42,20 -42,-28 Z" fill="#0A0E17"/>
        
        <!-- Golden Star of Achievement -->
        <polygon points="0,-25 7,-6 26,-6 10,6 16,24 0,13 -16,24 -10,6 -26,-6 -7,-6" fill="url(#gold-star-grad)" filter="drop-shadow(0 0 10px #F59E0B)"/>
        
        <!-- Laurel Leaves Accent -->
        <circle cx="-30" cy="5" r="4" fill="${secondaryNeon}"/>
        <circle cx="30" cy="5" r="4" fill="${secondaryNeon}"/>
      </g>
    `
  };

  const selectedIllustration = artworkIllustrations[type] || artworkIllustrations.nitro;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
    <defs>
      <!-- Background Ambient Canvas -->
      <linearGradient id="bg-canvas" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#05080E" />
        <stop offset="50%" stop-color="#0A101C" />
        <stop offset="100%" stop-color="#04060A" />
      </linearGradient>

      <!-- Shimmer Gradients for 3D Assets -->
      <linearGradient id="gem-facet-1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
        <stop offset="60%" stop-color="${primaryNeon}"/>
        <stop offset="100%" stop-color="#005B8A"/>
      </linearGradient>
      <linearGradient id="gem-facet-2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${secondaryNeon}"/>
        <stop offset="100%" stop-color="#3B0764"/>
      </linearGradient>
      <linearGradient id="gem-facet-3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E1B4B"/>
        <stop offset="100%" stop-color="${secondaryNeon}"/>
      </linearGradient>
      <linearGradient id="gem-facet-4" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="${primaryNeon}"/>
      </linearGradient>

      <linearGradient id="car-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0E1726"/>
        <stop offset="50%" stop-color="${primaryNeon}"/>
        <stop offset="100%" stop-color="#0E1726"/>
      </linearGradient>

      <linearGradient id="metallic-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E2E8F0"/>
        <stop offset="50%" stop-color="#94A3B8"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>

      <linearGradient id="gamepad-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E293B"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>

      <linearGradient id="screen-glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E11D48"/>
        <stop offset="100%" stop-color="#0284C7"/>
      </linearGradient>

      <linearGradient id="play-btn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#E2E8F0"/>
      </linearGradient>

      <linearGradient id="sim-card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E293B"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>

      <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8B5CF6"/>
        <stop offset="100%" stop-color="#3B82F6"/>
      </linearGradient>

      <linearGradient id="gold-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDE047"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>

      <!-- Modern Cyber Perspective Grid (Smooth, not harsh) -->
      <pattern id="cyber-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(25, 186, 255, 0.04)" stroke-width="1"/>
      </pattern>
    </defs>

    <!-- Canvas Base -->
    <rect width="640" height="360" fill="url(#bg-canvas)"/>
    <rect width="640" height="360" fill="url(#cyber-grid)"/>

    <!-- Vignette & Edge Glow -->
    <ellipse cx="320" cy="360" rx="280" ry="80" fill="${primaryNeon}" fill-opacity="0.12" filter="blur(40px)"/>

    <!-- 3D Center Artwork Component -->
    ${selectedIllustration}

    <!-- Bottom Vignette Gradient to blend smoothly with Card Body -->
    <rect y="270" width="640" height="90" fill="url(#bottom-fade)"/>
    <linearGradient id="bottom-fade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0E131D" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0E131D" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Sleek 3D Title Overlay at Bottom of Artwork -->
    <text x="320" y="325" text-anchor="middle" fill="#FFFFFF" font-family="'Space Grotesk', sans-serif" font-weight="800" font-size="20" letter-spacing="1">
      ${title.toUpperCase()}
    </text>
    <text x="320" y="345" text-anchor="middle" fill="${primaryNeon}" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="11" letter-spacing="2">
      // ${sub.toUpperCase()} //
    </text>
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
        imageUrl: createModern3DArtwork("nitro", "Nitro Booster 1M", "Full Warranty 2 Boosts", "#19BAFF", "#8B5CF6", "#6CE2FF"),
        sampleDelivery: "nitro_user_vip99@nyx9.shop:PassNitro!2026",
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
        imageUrl: createModern3DArtwork("nitro", "Nitro 3 Months", "Full Email Transfer", "#38D4FF", "#10B981", "#6CE2FF"),
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
        imageUrl: createModern3DArtwork("boost", "Server Boost 1M", "Instant 2x Boosts", "#19BAFF", "#EC4899", "#38D4FF"),
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
        imageUrl: createModern3DArtwork("boost", "Server Boost 90D", "Full 90 Days Warranty", "#FF0080", "#19BAFF", "#FFB700"),
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
        imageUrl: createModern3DArtwork("nitro", "Nitro Promo Link", "Instant Gift Link", "#10B981", "#19BAFF", "#38D4FF"),
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
        imageUrl: createModern3DArtwork("quest", "Profile Deco", "Permanent Nameplates", "#F59E0B", "#19BAFF", "#EC4899"),
        sampleDelivery: "GIFT-DECO-PERM-DISCORD-TOKEN-9283-NYX9",
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
        price: 0.50,
        unit: "คน",
        minQuantity: 100,
        maxQuantity: 1000,
        stepQuantity: 50,
        originalPrice: 0.80,
        stock: 9999,
        status: "SERVICE",
        chips: ["👥 มีรูปโปรไฟล์", "⚡ เริ่มใน 5 นาที"],
        fulfillmentType: "custom_discord_members",
        imageUrl: createModern3DArtwork("boost", "Discord Members", "Real Avatars 24/7", "#19BAFF", "#3B82F6", "#6CE2FF"),
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
        imageUrl: createModern3DArtwork("otp", "Phone OTP Verify", "Instant SMS Code", "#10B981", "#38D4FF", "#F59E0B"),
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
        imageUrl: createModern3DArtwork("quest", "Quest Badge Auto", "No Game Open Needed", "#8B5CF6", "#19BAFF", "#F59E0B"),
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
        imageUrl: createModern3DArtwork("nitro", "Discord Aged 1M+", "Clean Clean Account", "#6366F1", "#19BAFF", "#38D4FF"),
        sampleDelivery: "acc_aged30d_8812@nyx9mail.com:SuperP@ss7721 | Token: MTA4...",
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
        imageUrl: createModern3DArtwork("quest", "Discord Vintage", "Rare 2016-2018 Legacy", "#F59E0B", "#E11D48", "#19BAFF"),
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
    badge: "NYX9 SPECIALS",
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
        imageUrl: createModern3DArtwork("car", "FiveM Rockstar Clean", "2-Step HWID Clean", "#19BAFF", "#EC4899", "#6CE2FF"),
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
        imageUrl: createModern3DArtwork("controller", "Steam GTA V Unlinked", "Original License Key", "#3B82F6", "#06B6D4", "#38D4FF"),
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
        imageUrl: createModern3DArtwork("streaming", "Netflix 4K UHD", "Private Screen 30 Days", "#E50914", "#19BAFF", "#FF7B00"),
        sampleDelivery: "netflix_vip_uhd291@nyx9stream.com:NfPass4K!2026 | PIN: 1984 | Profile: 1",
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
        imageUrl: createModern3DArtwork("streaming", "YouTube Premium", "Ad-Free Background Play", "#FF0000", "#38D4FF", "#FFB700"),
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
        imageUrl: createModern3DArtwork("controller", "Cursor Pro AI", "Claude 3.7 & GPT-4o", "#00FFA3", "#19BAFF", "#8B5CF6"),
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
        imageUrl: createModern3DArtwork("otp", "Out of Stock", "Item Unavailable", "#64748B", "#334155", "#1E293B"),
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
        imageUrl: createModern3DArtwork("controller", "Windows 11 Pro", "Original Retail License", "#0078D4", "#19BAFF", "#38D4FF"),
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
        imageUrl: createModern3DArtwork("streaming", "Spotify 3M Plan", "Original Family Invite", "#1DB954", "#19BAFF", "#10B981"),
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
