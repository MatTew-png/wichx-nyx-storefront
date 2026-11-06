const fs = require('fs');
const path = require('path');

const productsDataPath = path.join(__dirname, '..', 'productsData.js');
const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const p200Path = path.join(__dirname, '..', '200.html');
const topupJsPath = path.join(__dirname, '..', 'js', 'components', 'TopUpModal.js');
const appJsPath = path.join(__dirname, '..', 'app.js');

// ==============================================================================
// 1. SANITIZE productsData.js (REMOVE ALL EMAIL:PASSWORD DATA LEAK STRINGS)
// ==============================================================================
let productsCode = fs.readFileSync(productsDataPath, 'utf8');

productsCode = productsCode.replace(
  'sampleDelivery: "nitro_user_vip99@wichx.vip:PassNitro!2026"',
  'sampleDelivery: "NITRO-1M-ACTIVE-KEY-9921"'
);

productsCode = productsCode.replace(
  'sampleDelivery: "discord_3m_fresh@rambler.ru:RamblerP@ss2026 | Mailpass: Ok"',
  'sampleDelivery: "NITRO-3M-ACTIVE-KEY-8812"'
);

productsCode = productsCode.replace(
  'sampleDelivery: "acc_aged30d_8812@wichxmail.com:SuperP@ss7721 | Token: MTA4..."',
  'sampleDelivery: "DISCORD-VERIFIED-AUTH-TOKEN-7721"'
);

productsCode = productsCode.replace(
  'sampleDelivery: "og_discord_2016_legacy@rambler.ru:VintagePass2016! | Full Access"',
  'sampleDelivery: "DISCORD-VINTAGE-AUTH-TOKEN-2016"'
);

productsCode = productsCode.replace(
  'sampleDelivery: "rockstar_fivem_clean991@firstmail.ltd:FiveMPassword2026"',
  'sampleDelivery: "FIVEM-READY-CLEAN-AUTH-991"'
);

productsCode = productsCode.replace(
  'sampleDelivery: "steam_gta5_fresh_id771:SteamMasterPass2026 | Email: steam_mail_gta@outlook.com:EmailPass2026"',
  'sampleDelivery: "STEAM-GTAV-CLEAN-SERIAL-771"'
);

productsCode = productsCode.replace(
  'sampleDelivery: "netflix_vip_uhd291@wichxstream.com:NfPass4K!2026 | PIN: 1984 | Profile: 1"',
  'sampleDelivery: "NETFLIX-UHD-SLOT-TOKEN-291"'
);

fs.writeFileSync(productsDataPath, productsCode, 'utf8');
console.log('✓ productsData.js sanitized: removed all email:password credential patterns');

// ==============================================================================
// 2. REMOVE RAW CREDIT CARD HARVESTING FORM FROM index.html (TOP-UP SECTION)
// ==============================================================================
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Replace 4-col tab track with 3-col trusted Thai payment gateway track
const oldTabTrackRegex = /<div class="bg-\[#05080E\] p-1\.5 rounded-2xl border border-white\/\[0\.08\] grid grid-cols-2 sm:grid-cols-4 gap-1\.5 mb-6 shadow-inner">[\s\S]*?<\/div>/;

const newTabTrackHTML = `<div class="bg-[#05080E] p-1.5 rounded-2xl border border-white/[0.08] grid grid-cols-3 gap-1.5 mb-6 shadow-inner">
            <button id="tab-btn-promptpay" onclick="switchTopUpGateway('promptpay')" class="topup-tab-btn active h-12 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.15)] ring-1 ring-cyan-400/50">
              <i data-lucide="qr-code" class="w-4 h-4 text-cyan-400"></i>
              <span>พร้อมเพย์</span>
            </button>
            <button id="tab-btn-truemoney" onclick="switchTopUpGateway('truemoney')" class="topup-tab-btn h-12 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
              <i data-lucide="gift" class="w-4 h-4 text-amber-400"></i>
              <span>ทรูมันนี่</span>
            </button>
            <button id="tab-btn-bank_transfer" onclick="switchTopUpGateway('bank_transfer')" class="topup-tab-btn h-12 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
              <i data-lucide="landmark" class="w-4 h-4 text-emerald-400"></i>
              <span>ธนาคาร</span>
            </button>
          </div>`;

if (oldTabTrackRegex.test(html)) {
  html = html.replace(oldTabTrackRegex, newTabTrackHTML);
  console.log('✓ Tab track changed from 4 cols to 3 trusted Thai payment methods');
}

// Remove PANEL 4: CARD PAYMENT entirely
const cardPanelRegex = /<!-- PANEL 4: CARD PAYMENT -->\s*<div id="gateway-panel-card_payment"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- Right Column: Wallet Telemetry/;

const replacementAfterCardRemoval = `<!-- Right Column: Wallet Telemetry`;

if (cardPanelRegex.test(html)) {
  html = html.replace(cardPanelRegex, `</div>\n\n        ${replacementAfterCardRemoval}`);
  console.log('✓ Removed raw credit card input form from index.html');
}

fs.writeFileSync(indexHtmlPath, html, 'utf8');
fs.writeFileSync(p200Path, html, 'utf8');
console.log('✓ Saved to index.html and 200.html');

// ==============================================================================
// 3. UPDATE TopUpModal.js (SUPPORT 3 THAI GATEWAYS ONLY)
// ==============================================================================
let topupJs = fs.readFileSync(topupJsPath, 'utf8');

topupJs = topupJs.replace(
  /const tabs = \["promptpay", "truemoney", "bank_transfer", "card_payment"\];/,
  'const tabs = ["promptpay", "truemoney", "bank_transfer"];'
);

fs.writeFileSync(topupJsPath, topupJs, 'utf8');
console.log('✓ TopUpModal.js tabs updated to 3');

console.log('🎉 Sanitization completed!');
