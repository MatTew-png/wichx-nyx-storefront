const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Regex matching all emoji ranges
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE0F}]/gu;

function cleanString(str) {
  return str.replace(EMOJI_REGEX, '').trim();
}

// 1. Clean productsData.js
console.log('1. Cleaning productsData.js...');
let productsData = fs.readFileSync('productsData.js', 'utf8');
// Clean chips arrays: e.g. "⚡ ส่งทันที" -> "ส่งทันที"
productsData = productsData.replace(/chips:\s*\[([^\]]+)\]/g, (match, p1) => {
  const cleaned = p1.replace(EMOJI_REGEX, '').replace(/\s+/g, ' ');
  return `chips: [${cleaned.trim()}]`;
});
// Clean header comment
productsData = productsData.replace(/📦 /g, '');
fs.writeFileSync('productsData.js', productsData, 'utf8');

// 2. Clean storeConfig.js
console.log('2. Cleaning storeConfig.js...');
let storeConfig = fs.readFileSync('storeConfig.js', 'utf8');
storeConfig = storeConfig.replace(EMOJI_REGEX, '');
fs.writeFileSync('storeConfig.js', storeConfig, 'utf8');

// 3. Clean CatalogView.js
console.log('3. Cleaning CatalogView.js...');
let catalogView = fs.readFileSync('js/components/CatalogView.js', 'utf8');
catalogView = catalogView.replace('ยอดนิยม 🔥', 'ยอดนิยม');
catalogView = catalogView.replace('ลดเยอะสุด ⚡', 'ส่วนลดสูงสุด');
catalogView = catalogView.replace(/📦 /g, '');
fs.writeFileSync('js/components/CatalogView.js', catalogView, 'utf8');

// 4. Clean HeroSection.js
console.log('4. Cleaning HeroSection.js...');
let heroSection = fs.readFileSync('js/components/HeroSection.js', 'utf8');
heroSection = heroSection.replace('⚡ ล่าสุด:', 'ล่าสุด:');
heroSection = heroSection.replace(/🚀 /g, '');
fs.writeFileSync('js/components/HeroSection.js', heroSection, 'utf8');

// 5. Clean DiscordServiceModal.js
console.log('5. Cleaning DiscordServiceModal.js...');
let discordModal = fs.readFileSync('js/components/DiscordServiceModal.js', 'utf8');
discordModal = discordModal.replace('🔥 POPULAR • LV.3', 'POPULAR • LV.3');
discordModal = discordModal.replace(/🚀 /g, '');
fs.writeFileSync('js/components/DiscordServiceModal.js', discordModal, 'utf8');

// 6. Clean TopUpModal.js
console.log('6. Cleaning TopUpModal.js...');
let topUp = fs.readFileSync('js/components/TopUpModal.js', 'utf8');
topUp = topUp.replace('🧧 รับเงินจากซองของขวัญสำเร็จ', 'รับเงินจากซองของขวัญสำเร็จ');
topUp = topUp.replace('🏦 เติมเงินผ่านธนาคารสำเร็จ', 'เติมเงินผ่านธนาคารสำเร็จ');
topUp = topUp.replace('💳 ตัดบัตรสำเร็จ', 'ตัดบัตรสำเร็จ');
topUp = topUp.replace(/💳 /g, '');
fs.writeFileSync('js/components/TopUpModal.js', topUp, 'utf8');

// 7. Clean database/supabaseClient.js
console.log('7. Updating database/supabaseClient.js with chip emoji sanitization...');
let supabaseClient = fs.readFileSync('database/supabaseClient.js', 'utf8');
supabaseClient = supabaseClient.replace(/chips:\s*p\.chips\s*\|\|\s*\[\],/g, `chips: (p.chips || []).map(c => String(c).replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1FA00}-\\u{1FAFF}\\u{FE0F}]/gu, '').trim()),`);
supabaseClient = supabaseClient.replace(/⚡ /g, '');
fs.writeFileSync('database/supabaseClient.js', supabaseClient, 'utf8');

// 8. Update Supabase Database records directly
async function cleanSupabaseDb() {
  console.log('8. Cleaning Supabase database products chips...');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Skipping Supabase update (no keys)');
    return;
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: prods, error } = await supabase.from('products').select('id, chips');
  if (error || !prods) {
    console.warn('Failed to load products from Supabase:', error);
    return;
  }

  for (const p of prods) {
    if (p.chips && Array.isArray(p.chips)) {
      const cleanedChips = p.chips.map(c => cleanString(c));
      const hasChange = JSON.stringify(cleanedChips) !== JSON.stringify(p.chips);
      if (hasChange) {
        await supabase.from('products').update({ chips: cleanedChips }).eq('id', p.id);
        console.log(`✅ Cleaned chips in DB for ${p.id}:`, cleanedChips);
      }
    }
  }
}

cleanSupabaseDb().then(() => {
  console.log('✨ All emojis cleaned successfully!');
}).catch(console.error);
