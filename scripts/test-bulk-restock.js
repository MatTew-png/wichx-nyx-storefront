const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testRestock() {
  console.log('Testing admin_bulk_restock...');
  const newKeys = [
    'boost_link_https://discord.gg/restock_test_1',
    'boost_link_https://discord.gg/restock_test_2'
  ];

  const { data, error } = await supabase.rpc('admin_bulk_restock', {
    p_admin_secret: process.env.ADMIN_SECRET_KEY,
    p_product_id: 'nitro-boost-1m-2x',
    p_keys: newKeys
  });

  if (error) throw error;
  console.log('Bulk Restock Result:', data);

  // Check metrics again
  const { data: metrics } = await supabase.rpc('admin_get_metrics', {
    p_admin_secret: process.env.ADMIN_SECRET_KEY
  });

  const updatedProduct = metrics.stock_by_product.find(p => p.product_id === 'nitro-boost-1m-2x');
  console.log('Updated Stock for nitro-boost-1m-2x:', updatedProduct);

  if (updatedProduct.in_stock === 2) {
    console.log('🎉 BULK RESTOCK VERIFIED 100%!');
  }
}

testRestock().catch(console.error);
