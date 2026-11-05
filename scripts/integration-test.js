const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function runIntegrationTest() {
  console.log('=== RUNNING FULL LIVE INTEGRATION TEST ===\n');

  // Test 1: Query Products & Inventory
  const { data: prods, error: pErr } = await supabase.from('products').select('id, title, price, status');
  if (pErr) throw pErr;
  console.log(`[PASS] 1. Live Products accessible via Supabase REST API (${prods.length} products found)`);

  // Test 2: Check Inventory Keys
  const { data: keys, error: kErr } = await supabase.from('inventory_keys').select('id, product_id, is_sold').eq('is_sold', false);
  if (kErr) throw kErr;
  console.log(`[PASS] 2. Live Inventory Stock available (${keys.length} unsold keys in stock)`);

  // Test 3: PromptPay Slip Topup + Anti-Dupe Lock
  const testTransRef = 'INTEG-PP-' + Date.now();
  const { data: topup1, error: t1Err } = await supabase.rpc('process_topup', {
    p_gateway: 'promptpay',
    p_trans_ref: testTransRef,
    p_amount: 100.00,
    p_user_id: null,
    p_raw_payload: { test: true }
  });
  if (t1Err) throw t1Err;
  if (!topup1.success) throw new Error('Promptpay topup failed');
  console.log(`[PASS] 3. PromptPay Live Topup processed successfully (TransRef: ${testTransRef}, TopUp ID: ${topup1.topup_id})`);

  // Test 4: Duplicate PromptPay Slip Rejection
  const { data: topup1Dupe, error: t1dErr } = await supabase.rpc('process_topup', {
    p_gateway: 'promptpay',
    p_trans_ref: testTransRef,
    p_amount: 100.00,
    p_user_id: null,
    p_raw_payload: { test: true }
  });
  if (t1dErr) throw t1dErr;
  if (topup1Dupe.success !== false || topup1Dupe.error !== 'DUPLICATE_SLIP') {
    throw new Error('Anti-dupe failed to block duplicate slip!');
  }
  console.log(`[PASS] 4. PromptPay Duplicate Slip Anti-Double-Spend BLOCKED successfully! (${topup1Dupe.message})`);

  // Test 5: TrueMoney Voucher Topup + Anti-Dupe Lock
  const testVoucher = 'TM-INTEG-' + Date.now();
  const { data: topup2, error: t2Err } = await supabase.rpc('process_topup', {
    p_gateway: 'truemoney',
    p_trans_ref: testVoucher,
    p_amount: 150.00,
    p_user_id: null,
    p_raw_payload: { test: true }
  });
  if (t2Err) throw t2Err;
  if (!topup2.success) throw new Error('TrueMoney voucher topup failed');
  console.log(`[PASS] 5. TrueMoney Live Voucher processed successfully (Hash: ${testVoucher}, TopUp ID: ${topup2.topup_id})`);

  // Test 6: Duplicate TrueMoney Voucher Rejection
  const { data: topup2Dupe, error: t2dErr } = await supabase.rpc('process_topup', {
    p_gateway: 'truemoney',
    p_trans_ref: testVoucher,
    p_amount: 150.00,
    p_user_id: null,
    p_raw_payload: { test: true }
  });
  if (t2dErr) throw t2dErr;
  if (topup2Dupe.success !== false || topup2Dupe.error !== 'DUPLICATE_VOUCHER') {
    throw new Error('Anti-dupe failed to block duplicate voucher!');
  }
  console.log(`[PASS] 6. TrueMoney Duplicate Voucher BLOCKED successfully! (${topup2Dupe.message})`);

  console.log('\n===========================================');
  console.log('🏆 ALL 6 LIVE BACKEND & PAYMENT ENGINE TESTS VERIFIED 100%!');
  console.log('===========================================');
}

runIntegrationTest().catch(console.error);
