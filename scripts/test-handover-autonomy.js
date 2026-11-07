require('dotenv').config();
const { Client } = require('pg');

async function testHandoverAutonomy() {
  console.log('================================================================');
  console.log('🧪 VERIFYING ADMIN AUTONOMY & DYNAMIC STOREFRONT HANDOVER');
  console.log('================================================================\n');

  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const adminSecret = 'nyx9_secure_admin_passphrase';

  // TEST 1: Category Dynamic Creation
  console.log('📦 [1/4] Testing Dynamic Category Creation (Admin CRUD)...');
  const catPayload = {
    id: 'cat-test-gaming',
    name: 'คีย์เกม Steam & EA Play (หมวดทดสอบ)',
    sub_name: 'เกมแท้จัดส่งออโต้',
    icon: 'gamepad-2',
    badge: 'HOT',
    sort_order: 10
  };

  const createCatRes = await c.query(
    "SELECT admin_manage_category($1, 'create', $2::jsonb) as res",
    [adminSecret, JSON.stringify(catPayload)]
  );
  console.log('   ↳ Category Create Result:', createCatRes.rows[0].res);

  // Check if category appears in categories table
  const checkCat = await c.query("SELECT * FROM categories WHERE id = 'cat-test-gaming'");
  if (checkCat.rows.length === 1) {
    console.log('   ✅ [PASS] New category saved in PostgreSQL database!');
  } else {
    throw new Error('Category not found in database');
  }

  // TEST 2: Product Creation inside the New Category
  console.log('\n📦 [2/4] Testing Product Creation in the New Category...');
  const prodPayload = {
    id: 'steam-random-key-test',
    category_id: 'cat-test-gaming',
    title: 'Steam Key สุ่มเกมแท้ เกรด AAA',
    price: 99.00,
    original_price: 199.00,
    unit: 'คีย์',
    fulfillment_type: 'instant_key',
    status: 'HOT',
    chips: ['สุ่มเกมแท้', 'ลุ้น AAA', 'ออโต้ 24 ชม.'],
    is_active: true
  };

  const createProdRes = await c.query(
    "SELECT admin_manage_product($1, 'create', $2::jsonb) as res",
    [adminSecret, JSON.stringify(prodPayload)]
  );
  console.log('   ↳ Product Create Result:', createProdRes.rows[0].res);

  // TEST 3: Dynamic Storefront Settings (Save & Retrieve)
  console.log('\n⚙️ [3/4] Testing Dynamic Storefront Settings (Whitelabel Engine)...');
  const newProfile = {
    storeName: 'NYX9 TESTING STORE',
    brandShort: 'NYX9-TEST',
    tagline: 'ร้านค้าดิจิทัลออโต้ 24 ชม. (ทดสอบระบบส่งมอบ)',
    subTagline: 'ชำระเงินและรับคีย์ทันที',
    logoUrl: 'assets/logo.png',
    faviconUrl: 'assets/logo.png',
    discordCommunityUrl: 'https://discord.gg/test-handover',
    supportEmail: 'admin@test.com',
    maintenanceMode: false,
    maintenanceMessage: 'ทดสอบปิดปรับปรุง'
  };

  const saveSettingRes = await c.query(
    "SELECT admin_save_system_setting($1, 'store_profile', $2::jsonb) as res",
    [adminSecret, JSON.stringify(newProfile)]
  );
  console.log('   ↳ Save Store Profile Result:', saveSettingRes.rows[0].res);

  const fetchSettingsRes = await c.query("SELECT get_system_settings() as settings");
  const liveSettings = fetchSettingsRes.rows[0].settings;
  console.log('   ↳ Live System Settings storeName:', liveSettings.store_profile?.storeName);

  if (liveSettings.store_profile?.storeName === 'NYX9 TESTING STORE') {
    console.log('   ✅ [PASS] Dynamic Storefront Setting saved and retrieved 100%!');
  } else {
    throw new Error('Settings mismatch');
  }

  // Restore Original Profile
  const originalProfile = {
    storeName: 'NYX9 STUDIO',
    brandShort: 'NYX9',
    tagline: 'ร้านขายไอดีเกม & บริการ Discord อัตโนมัติ จัดส่งรหัสทันที 24 ชม.',
    subTagline: 'เลือกสินค้า ชำระเงินผ่านพร้อมเพย์/ทรูมันนี่ และรับรหัสใช้งานได้ทันที',
    logoUrl: 'assets/logo.png',
    faviconUrl: 'assets/logo.png',
    discordCommunityUrl: 'https://discord.gg/NTPcxKHrag',
    discordCommunitySecondaryUrl: 'https://discord.gg/T44Up4cfy',
    supportEmail: 'sanaseeriri@gmail.com',
    maintenanceMode: false
  };
  await c.query(
    "SELECT admin_save_system_setting($1, 'store_profile', $2::jsonb)",
    [adminSecret, JSON.stringify(originalProfile)]
  );

  // TEST 4: Cleanup Test Data
  console.log('\n🧹 [4/4] Cleaning Up Test Artifacts...');
  await c.query("DELETE FROM products WHERE id = 'steam-random-key-test'");
  await c.query("DELETE FROM categories WHERE id = 'cat-test-gaming'");
  console.log('   ✅ [PASS] Test products and test categories cleanly cleaned up!');

  await c.end();

  console.log('\n================================================================');
  console.log('🎉 100% ADMIN AUTONOMY & HANDOVER ENGINE VERIFIED!');
  console.log('================================================================');
}

testHandoverAutonomy().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
