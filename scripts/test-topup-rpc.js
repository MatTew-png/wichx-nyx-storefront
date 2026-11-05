const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testTopupProcedure() {
  console.log('Testing process_topup via Supabase RPC...');

  const testTransRef = 'TEST-PP-' + Date.now();
  const testAmount = 250.00;

  // 1. First PromptPay attempt: should succeed
  const { data: res1, error: err1 } = await supabase.rpc('process_topup', {
    p_gateway: 'promptpay',
    p_trans_ref: testTransRef,
    p_amount: testAmount,
    p_user_id: null,
    p_raw_payload: { bank: 'KBANK', time: new Date().toISOString() }
  });

  if (err1) throw err1;
  console.log('1. First TopUp Result:', res1);

  // 2. Second PromptPay attempt with identical transRef: MUST FAIL with DUPLICATE_SLIP
  const { data: res2, error: err2 } = await supabase.rpc('process_topup', {
    p_gateway: 'promptpay',
    p_trans_ref: testTransRef,
    p_amount: testAmount,
    p_user_id: null,
    p_raw_payload: {}
  });

  if (err2) throw err2;
  console.log('2. Duplicate Slip Attempt Result:', res2);

  // 3. TrueMoney Voucher attempt
  const testVoucher = 'TM-VOUCHER-' + Date.now();
  const { data: res3, error: err3 } = await supabase.rpc('process_topup', {
    p_gateway: 'truemoney',
    p_trans_ref: testVoucher,
    p_amount: 150.00,
    p_user_id: null,
    p_raw_payload: { voucher_hash: testVoucher }
  });

  if (err3) throw err3;
  console.log('3. TrueMoney Voucher Result:', res3);

  // 4. Duplicate TrueMoney attempt: MUST FAIL with DUPLICATE_VOUCHER
  const { data: res4, error: err4 } = await supabase.rpc('process_topup', {
    p_gateway: 'truemoney',
    p_trans_ref: testVoucher,
    p_amount: 150.00,
    p_user_id: null,
    p_raw_payload: {}
  });

  if (err4) throw err4;
  console.log('4. Duplicate Voucher Attempt Result:', res4);

  // Assertions
  if (res1.success === true && res2.success === false && res3.success === true && res4.success === false) {
    console.log('🎉 ALL EMPIRICAL ANTI-FRAUD & TOPUP TESTS PASSED 100%!');
  } else {
    console.error('❌ Validation assertion failed!');
  }
}

testTopupProcedure().catch(console.error);
