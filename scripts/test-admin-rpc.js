const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testAdminRpc() {
  console.log('Testing admin_get_metrics with valid secret...');
  const { data: validRes, error: err1 } = await supabase.rpc('admin_get_metrics', {
    p_admin_secret: process.env.ADMIN_SECRET_KEY
  });

  if (err1) throw err1;
  console.log('Admin Metrics Response:', JSON.stringify(validRes.metrics, null, 2));
  console.log('Products Stock Breakdown:', validRes.stock_by_product);

  console.log('\nTesting with invalid secret...');
  const { data: invalidRes } = await supabase.rpc('admin_get_metrics', {
    p_admin_secret: 'wrong_secret_123'
  });
  console.log('Invalid Secret Response:', invalidRes);

  if (validRes.success === true && invalidRes.success === false) {
    console.log('\n🎉 ADMIN METRICS & SECURITY GATE VERIFIED 100%!');
  } else {
    throw new Error('Admin gate verification failed');
  }
}

testAdminRpc().catch(console.error);
