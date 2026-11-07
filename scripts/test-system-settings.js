require('dotenv').config();
const { Client } = require('pg');

async function test() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const r1 = await c.query('SELECT get_system_settings() as settings');
  console.log('✅ RPC get_system_settings keys:', Object.keys(r1.rows[0].settings));

  const r2 = await c.query("SELECT admin_manage_category('nyx9_secure_admin_passphrase', 'list', '{}'::jsonb) as cat_res");
  console.log('✅ RPC admin_manage_category categories:', r2.rows[0].cat_res.categories.map(x => ({ id: x.id, name: x.name, product_count: x.product_count })));

  const r3 = await c.query("SELECT admin_save_system_setting('nyx9_secure_admin_passphrase', 'test_key', '{\"hello\":\"world\"}'::jsonb) as save_res");
  console.log('✅ RPC admin_save_system_setting:', r3.rows[0].save_res);

  // Clean up test key
  await c.query("DELETE FROM system_settings WHERE key = 'test_key'");
  await c.end();
  console.log('🎉 All Database Stored Procedures verified!');
}

test().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
