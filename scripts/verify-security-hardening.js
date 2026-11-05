const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function runAudit() {
  console.log('🛡️ RUNNING COMPREHENSIVE SECURITY VERIFICATION AUDIT...\n');
  let passCount = 0;
  let totalTests = 7;

  // Test 1: inventory_keys leak check
  const inv = await sb.from('inventory_keys').select('id, credential_data').eq('is_sold', false);
  if (!inv.data || inv.data.length === 0) {
    console.log('✅ TEST 1 PASSED: inventory_keys table is impenetrable to anonymous requests (0 rows leaked).');
    passCount++;
  } else {
    console.error('❌ TEST 1 FAILED: inventory_keys leaked data!', inv.data);
  }

  // Test 2: order_items leak check
  const ordItems = await sb.from('order_items').select('id, delivered_content');
  if (!ordItems.data || ordItems.data.length === 0) {
    console.log('✅ TEST 2 PASSED: order_items delivered_content is impenetrable to anonymous visitors.');
    passCount++;
  } else {
    console.error('❌ TEST 2 FAILED: order_items leaked data!', ordItems.data);
  }

  // Test 3: orders table privacy check
  const orders = await sb.from('orders').select('id, total_amount, user_id');
  if (!orders.data || orders.data.length === 0) {
    console.log('✅ TEST 3 PASSED: orders table is protected from anonymous snooping.');
    passCount++;
  } else {
    console.error('❌ TEST 3 FAILED: orders table leaked data!', orders.data);
  }

  // Test 4: profiles table privacy check
  const profiles = await sb.from('profiles').select('id, balance, discord_id');
  if (!profiles.data || profiles.data.length === 0) {
    console.log('✅ TEST 4 PASSED: profiles table balances and discord IDs are protected from strangers.');
    passCount++;
  } else {
    console.error('❌ TEST 4 FAILED: profiles table leaked data!', profiles.data);
  }

  // Test 5: get_product_stock_counts secure RPC
  const stocks = await sb.rpc('get_product_stock_counts');
  if (stocks.data && Array.isArray(stocks.data) && stocks.data.length > 0 && !('credential_data' in stocks.data[0])) {
    console.log(`✅ TEST 5 PASSED: get_product_stock_counts returns sanitized aggregate counts (${stocks.data.length} active products in stock).`);
    passCount++;
  } else {
    console.error('❌ TEST 5 FAILED: get_product_stock_counts did not return valid data!', stocks);
  }

  // Test 6: Free checkout exploit rejection
  const hackCheckout = await sb.rpc('execute_order_checkout', {
    p_order_id: 'EXPLOIT_TEST',
    p_items: [{ id: 'nitro-booster-1m', quantity: 5 }],
    p_total_amount: 0
  });
  if (hackCheckout.data?.error === 'UNAUTHORIZED') {
    console.log('✅ TEST 6 PASSED: execute_order_checkout blocked anonymous unauthenticated checkout attempt.');
    passCount++;
  } else {
    console.error('❌ TEST 6 FAILED: execute_order_checkout allowed checkout without login!', hackCheckout.data);
  }

  // Test 7: Admin metrics unauthorized access check
  const adminTest = await sb.rpc('admin_get_metrics', { p_admin_secret: 'fake_guess_123' });
  if (adminTest.data?.error === 'UNAUTHORIZED') {
    console.log('✅ TEST 7 PASSED: admin_get_metrics rejects unauthorized callers.');
    passCount++;
  } else {
    console.error('❌ TEST 7 FAILED: admin_get_metrics allowed invalid secret!', adminTest.data);
  }

  console.log(`\n========================================`);
  console.log(`🎉 AUDIT RESULT: ${passCount}/${totalTests} SECURITY TESTS PASSED!`);
  console.log(`========================================\n`);
}

runAudit().catch(console.error);
