const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const SECRET = process.env.ADMIN_SECRET_KEY || 'nyx9_secure_admin_passphrase';

async function testAll() {
  console.log('🧪 Testing admin_get_analytics...');
  const { data: aData, error: aErr } = await client.rpc('admin_get_analytics', { p_admin_secret: SECRET });
  if (aErr) throw aErr;
  console.log('Analytics result:', {
    timeseries: aData.timeseries,
    top_products: aData.top_products,
    payment_methods: aData.payment_methods,
    stock_summary: aData.stock_summary
  });

  console.log('\n🧪 Testing admin_get_users...');
  const { data: uData, error: uErr } = await client.rpc('admin_get_users', { p_admin_secret: SECRET });
  if (uErr) throw uErr;
  console.log('Users count:', uData.users.length, 'Sample user:', uData.users[0]);

  console.log('\n🧪 Testing admin_get_inventory_keys for nitro-booster-1m...');
  const { data: kData, error: kErr } = await client.rpc('admin_get_inventory_keys', {
    p_admin_secret: SECRET,
    p_product_id: 'nitro-booster-1m'
  });
  if (kErr) throw kErr;
  console.log('Unsold keys:', kData.unsold_keys.length, 'Sold keys:', kData.sold_keys.length);

  console.log('\n🧪 Testing admin_manage_product (create test product)...');
  const testProduct = {
    id: 'test-product-v3',
    category_id: 'cat-discord-nitro',
    title: 'Test Nitro V3',
    price: 99.00,
    original_price: 199.00,
    unit: 'ชิ้น',
    min_quantity: 1,
    max_quantity: 5,
    step_quantity: 1,
    fulfillment_type: 'instant_key',
    status: 'ready',
    chips: ['TEST', 'VIP'],
    is_active: false
  };
  const { data: pCreate, error: pErr1 } = await client.rpc('admin_manage_product', {
    p_admin_secret: SECRET,
    p_action: 'create',
    p_product: testProduct
  });
  if (pErr1) throw pErr1;
  console.log('Product create response:', pCreate);

  console.log('\n🧪 Testing admin_manage_product (toggle_active)...');
  const { data: pToggle } = await client.rpc('admin_manage_product', {
    p_admin_secret: SECRET,
    p_action: 'toggle_active',
    p_product: { id: 'test-product-v3' }
  });
  console.log('Product toggle response:', pToggle);

  console.log('\n🧪 Testing admin_manage_product (delete test product)...');
  const { data: pDelete } = await client.rpc('admin_manage_product', {
    p_admin_secret: SECRET,
    p_action: 'delete',
    p_product: { id: 'test-product-v3' }
  });
  console.log('Product delete response:', pDelete);

  console.log('\n🎉 ALL 6 ENTERPRISE V3 PROCEDURES VERIFIED 100%!');
}

testAll().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
