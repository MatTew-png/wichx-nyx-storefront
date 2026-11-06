/**
 * ==============================================================================
 * 🛡️ UNIFIED SECURITY & COMPLIANCE VERIFICATION SUITE (pstack Aligned)
 * ==============================================================================
 * คำสั่งเดียวเพื่อ "พิสูจน์ว่าระบบไม่พังและปลอดภัย 100%"
 * รันผ่าน: npm run test:verify หรือ npm test
 *
 * รายการตรวจสอบหลัก (6 Pillars):
 * 1. RLS Leak Prevention: Anonymous ต้องดึงแถวจาก inventory_keys และตารางอ่อนไหวได้ 0 แถว
 * 2. Zero-Trust Price Integrity: ส่ง Payload แก้ราคาไป ต้องถูกปฏิเสธ / ดึงราคาจริงจาก DB
 * 3. Anti-Dupe Protection: ส่งสลิปและซองเดิมซ้ำ รอบที่สองต้องถูกบล็อก 100%
 * 4. Executable Constraints: คูปอง 1 คน/1 ครั้ง (promo_code_usages) บล็อกคำสั่งซื้อซ้ำ
 * 5. Blacklist Auto-Query: แบล็กลิสต์ IP/Discord/User บล็อกการเติมเงินและสั่งซื้อทันที
 * 6. Edge Rate Limiting: ส่งคำขอเกิน 5 ครั้ง/นาที ต่อ 1 IP ต้องได้ HTTP 429
 * ==============================================================================
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const verifySlip = require('../api/verify-slip.js');
const redeemTrueMoney = require('../api/truemoney-redeem.js');
const { checkRateLimit, resetRateLimitStore, getClientIp } = require('../api/rate-limiter.js');

// Mock Express req/res helper
function createMockReqRes(body, ip = '198.51.100.25', url = '/api/verify-slip') {
  const req = {
    method: 'POST',
    url,
    headers: {
      'x-forwarded-for': ip,
      'content-type': 'application/json'
    },
    body
  };
  let statusCode = 200;
  let responseData = null;
  const headers = {};
  const res = {
    setHeader: (name, val) => {
      headers[name] = val;
    },
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
          return { statusCode, responseData, headers };
        },
        end: () => ({ statusCode, responseData, headers })
      };
    }
  };
  return { req, res, getResult: () => ({ statusCode, responseData, headers }) };
}

async function runUnifiedVerification() {
  console.log('================================================================');
  console.log('🛡️  NYX9 STUDIO UNIFIED VERIFICATION SUITE (pstack Security)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(title, isPass, detail = '') {
    if (isPass) {
      console.log(`  ✅ [PASS] ${title}`);
      if (detail) console.log(`     ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      if (detail) console.error(`     ↳ Error: ${detail}`);
      failed++;
    }
  }

  // ----------------------------------------------------------------------------
  // SECTION 1: EDGE RATE LIMITING & ANTI-BRUTE-FORCE (No DB required)
  // ----------------------------------------------------------------------------
  console.log('📦 [1/6] Edge Rate Limiting & Anti-Brute-Force Verification');
  try {
    resetRateLimitStore();
    const testIp = '203.0.113.99';
    let blockedAt6th = false;

    for (let i = 1; i <= 5; i++) {
      const { req, res, getResult } = createMockReqRes({ amount: 50, transRef: `RATE-${i}-${Date.now()}` }, testIp);
      await verifySlip(req, res);
      const r = getResult();
      if (r.statusCode === 429) {
        throw new Error(`Request #${i} was rate limited too early!`);
      }
    }

    const { req, res, getResult } = createMockReqRes({ amount: 50, transRef: `RATE-6-${Date.now()}` }, testIp);
    await verifySlip(req, res);
    const r6 = getResult();

    if (r6.statusCode === 429 && r6.responseData?.error === 'RATE_LIMIT_EXCEEDED') {
      blockedAt6th = true;
    }

    report(
      'Rate Limiting enforces 5 requests/min per IP (6th blocked with HTTP 429)',
      blockedAt6th,
      `Blocked with 429: Retry-After=${r6.headers['Retry-After']}s`
    );
  } catch (err) {
    report('Rate Limiting enforces 5 requests/min per IP', false, err.message);
  }

  // Check if Database credentials are present
  const hasDb = process.env.DATABASE_URL && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
  if (!hasDb) {
    console.log('\n⚠️  Notice: DATABASE_URL / SUPABASE credentials not provided. Skipping live DB assertions in this runner.');
    console.log(`\n================================================================`);
    console.log(`📊 FINAL RESULT: ${passed} PASSED / ${failed} FAILED`);
    console.log(`================================================================\n`);
    if (failed > 0) process.exit(1);
    return;
  }

  const sbAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const sbAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await pgClient.connect();

  // ----------------------------------------------------------------------------
  // SECTION 2: ROW LEVEL SECURITY (RLS) LEAK VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('\n🔒 [2/6] RLS Leak Prevention (Zero Data Exposure to Strangers)');
  try {
    // Test inventory_keys leak
    const inv = await sbAnon.from('inventory_keys').select('id, credential_data').eq('is_sold', false);
    const leakedKeys = inv.data?.length || 0;
    report('Anonymous visitor receives 0 rows from inventory_keys', leakedKeys === 0, `Returned: ${leakedKeys} rows`);

    // Test order_items leak
    const items = await sbAnon.from('order_items').select('id, delivered_content');
    const leakedItems = items.data?.length || 0;
    report('Anonymous visitor receives 0 rows from order_items', leakedItems === 0, `Returned: ${leakedItems} rows`);

    // Test orders leak
    const ords = await sbAnon.from('orders').select('id, total_amount');
    const leakedOrders = ords.data?.length || 0;
    report('Anonymous visitor receives 0 rows from orders', leakedOrders === 0, `Returned: ${leakedOrders} rows`);

    // Test profiles leak
    const profs = await sbAnon.from('profiles').select('id, balance');
    const leakedProfiles = profs.data?.length || 0;
    report('Anonymous visitor cannot query balances from profiles', leakedProfiles === 0, `Returned: ${leakedProfiles} rows`);

    // Test anonymous checkout RPC call
    const anonCheckout = await sbAnon.rpc('execute_order_checkout', {
      p_order_id: 'EXPLOIT_TEST',
      p_items: [{ id: 'nitro-booster-1m', quantity: 1 }],
      p_total_amount: 0
    });
    const anonCheckoutBlocked = anonCheckout.error?.message?.includes('permission denied') || anonCheckout.data?.error === 'UNAUTHORIZED';
    report('Direct anonymous execute_order_checkout RPC call rejected at DB level', anonCheckoutBlocked, anonCheckout.error?.message || anonCheckout.data?.message);
  } catch (err) {
    report('RLS Leak Prevention tests', false, err.message);
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: ZERO-TRUST SERVER-AUTHORITATIVE PRICING
  // ----------------------------------------------------------------------------
  console.log('\n💰 [3/6] Zero-Trust Price Integrity (Client Tampering Defeated)');
  try {
    const userRes = await pgClient.query('SELECT id FROM profiles LIMIT 1;');
    const testUserId = userRes.rows[0].id;

    // Temporarily set test user balance to 50 THB
    await pgClient.query('UPDATE profiles SET balance = 50.00 WHERE id = $1', [testUserId]);

    // Attacker sends spoofed price: 1.00 THB for nitro-booster-1m (Real price: 169.00 THB)
    const attackRes = await sbAdmin.rpc('execute_order_checkout', {
      p_order_id: 'WX-ATTACK-' + Date.now().toString().slice(-4),
      p_items: [{ id: 'nitro-booster-1m', quantity: 1, price: 1.00 }],
      p_total_amount: 1.00,
      p_user_id: testUserId,
      p_customer_info: { client_tampered_price: 1.00 }
    });

    const demandedPrice = attackRes.data?.required_amount || (attackRes.data?.message?.match(/฿([0-9.]+)/) ? parseFloat(attackRes.data.message.match(/฿([0-9.]+)/)[1]) : 0);
    const isPriceTamperBlocked = attackRes.data?.error === 'INSUFFICIENT_BALANCE' && (demandedPrice >= 120 || attackRes.data?.message?.includes('169'));
    report(
      'Database re-verifies price against products catalog and rejects spoofed ฿1.00 price',
      isPriceTamperBlocked,
      `Demanded real DB price: ฿${demandedPrice || 'N/A'}`
    );
  } catch (err) {
    report('Zero-Trust price integrity', false, err.message);
  }

  // ----------------------------------------------------------------------------
  // SECTION 4: ANTI-DUPE & DOUBLE-SPEND DEFENSE (SLIP & VOUCHER)
  // ----------------------------------------------------------------------------
  console.log('\n💳 [4/6] Anti-Dupe Protection (100% Double-Spend Prevention)');
  try {
    resetRateLimitStore(); // clear rate limiter for anti-dupe test

    const testSlipRef = 'VERIFY-SLIP-' + Date.now();
    const slipReq1 = createMockReqRes({ amount: 100.00, transRef: testSlipRef }, '198.51.100.80');
    await verifySlip(slipReq1.req, slipReq1.res);
    const slipRes1 = slipReq1.getResult();

    const slipReq2 = createMockReqRes({ amount: 100.00, transRef: testSlipRef }, '198.51.100.80');
    await verifySlip(slipReq2.req, slipReq2.res);
    const slipRes2 = slipReq2.getResult();

    const isSlipDupeBlocked = slipRes1.statusCode === 200 && slipRes2.responseData?.error === 'DUPLICATE_SLIP';
    report(
      'Identical PromptPay slip submitted twice is rejected 100% on second attempt',
      isSlipDupeBlocked,
      `Attempt 1: ${slipRes1.statusCode} OK, Attempt 2: ${slipRes2.responseData?.error}`
    );

    const testVoucherCode = 'voucherverify' + Date.now();
    const tmReq1 = createMockReqRes({ voucherUrl: `https://gift.truemoney.com/campaign/?v=${testVoucherCode}` }, '198.51.100.81', '/api/truemoney-redeem');
    await redeemTrueMoney(tmReq1.req, tmReq1.res);
    const tmRes1 = tmReq1.getResult();

    const tmReq2 = createMockReqRes({ voucherUrl: `https://gift.truemoney.com/campaign/?v=${testVoucherCode}` }, '198.51.100.81', '/api/truemoney-redeem');
    await redeemTrueMoney(tmReq2.req, tmReq2.res);
    const tmRes2 = tmReq2.getResult();

    const isTmDupeBlocked = tmRes1.statusCode === 200 && tmRes2.responseData?.error === 'DUPLICATE_VOUCHER';
    report(
      'Identical TrueMoney voucher redeemed twice is rejected 100% on second attempt',
      isTmDupeBlocked,
      `Attempt 1: ${tmRes1.statusCode} OK, Attempt 2: ${tmRes2.responseData?.error}`
    );
  } catch (err) {
    report('Anti-dupe slip and voucher protection', false, err.message);
  }

  // ----------------------------------------------------------------------------
  // SECTION 5: EXECUTABLE CONSTRAINTS (PROMO CODE 1 PERSON / 1 TIME)
  // ----------------------------------------------------------------------------
  console.log('\n🎟️ [5/6] Executable Constraints: Promo Code Single-Use (UNIQUE user_id, code)');
  let testPromoCode = 'VERIFY_PROMO_' + Date.now();
  let createdOrders = [];
  try {
    const userRes = await pgClient.query('SELECT id FROM profiles LIMIT 1;');
    const testUserId = userRes.rows[0].id;

    // Ensure test user has balance and test inventory exists
    await pgClient.query('UPDATE profiles SET balance = 500.00 WHERE id = $1', [testUserId]);
    await pgClient.query(`
      INSERT INTO inventory_keys (product_id, credential_data, is_sold)
      VALUES ('rockstar-fivem-fresh', 'TEST-KEY-PROMO-1', false), ('rockstar-fivem-fresh', 'TEST-KEY-PROMO-2', false)
    `);

    const orderId1 = 'WX-PR1-' + Date.now().toString().slice(-4);
    createdOrders.push(orderId1);

    const promoRes1 = await sbAdmin.rpc('execute_order_checkout', {
      p_order_id: orderId1,
      p_items: [{ id: 'rockstar-fivem-fresh', quantity: 1, price: 10.00, fulfillmentType: 'service' }],
      p_total_amount: 10.00,
      p_user_id: testUserId,
      p_customer_info: { promoCode: testPromoCode, discountAmount: 5.00 }
    });

    const isFirstPromoSuccess = promoRes1.data?.success === true;

    // Second checkout with the SAME promo code by the SAME user
    const orderId2 = 'WX-PR2-' + Date.now().toString().slice(-4);
    createdOrders.push(orderId2);

    const promoRes2 = await sbAdmin.rpc('execute_order_checkout', {
      p_order_id: orderId2,
      p_items: [{ id: 'rockstar-fivem-fresh', quantity: 1, price: 10.00, fulfillmentType: 'service' }],
      p_total_amount: 10.00,
      p_user_id: testUserId,
      p_customer_info: { promoCode: testPromoCode, discountAmount: 5.00 }
    });

    const isSecondPromoBlocked = promoRes2.data?.error === 'PROMO_CODE_ALREADY_USED';
    report(
      'Promo code single-use constraint (UNIQUE user_id, code) rejects reuse in transaction',
      isFirstPromoSuccess && isSecondPromoBlocked,
      `Attempt 1: ${promoRes1.data?.success ? 'SUCCESS' : 'FAILED'}, Attempt 2: ${promoRes2.data?.error}`
    );
  } catch (err) {
    report('Promo code single-use constraint', false, err.message);
  }

  // ----------------------------------------------------------------------------
  // SECTION 6: AUTOMATED BLACKLIST AUTO-QUERY IN TRANSACTION
  // ----------------------------------------------------------------------------
  console.log('\n🚫 [6/6] Database Blacklist Auto-Query (Instant Transaction Abort)');
  const bannedIp = '198.51.100.222';
  try {
    const userRes = await pgClient.query('SELECT id FROM profiles LIMIT 1;');
    const testUserId = userRes.rows[0].id;

    // Insert temporary blacklist entry
    await pgClient.query(
      "INSERT INTO blacklists (target_type, target_value, reason) VALUES ('ip', $1, 'Automated Test Fraudster') ON CONFLICT (target_value) DO UPDATE SET reason = 'Automated Test Fraudster'",
      [bannedIp]
    );

    // Test checkout with banned IP
    const bannedCheckoutRes = await sbAdmin.rpc('execute_order_checkout', {
      p_order_id: 'WX-BAN-' + Date.now().toString().slice(-4),
      p_items: [{ id: 'rockstar-fivem-fresh', quantity: 1, price: 10.00, fulfillmentType: 'service' }],
      p_total_amount: 10.00,
      p_user_id: testUserId,
      p_customer_info: { ip: bannedIp }
    });

    const isCheckoutBlacklistBlocked = bannedCheckoutRes.data?.error === 'BLACKLISTED_USER';
    report(
      'execute_order_checkout auto-queries blacklists table and aborts blacklisted caller',
      isCheckoutBlacklistBlocked,
      bannedCheckoutRes.data?.message
    );

    // Test topup with banned IP
    const bannedTopupRes = await sbAdmin.rpc('process_topup', {
      p_gateway: 'promptpay',
      p_trans_ref: 'SLIP-BLOCKED-' + Date.now(),
      p_amount: 100.00,
      p_user_id: testUserId,
      p_raw_payload: { ip: bannedIp }
    });

    const isTopupBlacklistBlocked = bannedTopupRes.data?.error === 'BLACKLISTED_USER';
    report(
      'process_topup auto-queries blacklists table and blocks deposit from blacklisted caller',
      isTopupBlacklistBlocked,
      bannedTopupRes.data?.message
    );
  } catch (err) {
    report('Blacklist auto-query', false, err.message);
  } finally {
    // Clean up temporary test data
    try {
      await pgClient.query("DELETE FROM inventory_keys WHERE credential_data LIKE 'TEST-KEY-PROMO%'");
      await pgClient.query('DELETE FROM blacklists WHERE target_value = $1', [bannedIp]);
      await pgClient.query('DELETE FROM promo_code_usages WHERE code = $1', [testPromoCode]);
      if (createdOrders.length > 0) {
        await pgClient.query('DELETE FROM orders WHERE id = ANY($1)', [createdOrders]);
      }
      await pgClient.end();
    } catch (_) {}
  }

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log(`\n================================================================`);
  console.log(`📊 FINAL RESULT: ${passed} PASSED / ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    console.error(`🚨 VERIFICATION FAILED with ${failed} failure(s)!`);
    process.exit(1);
  } else {
    console.log(`✨ ALL SECURITY & COMPLIANCE PILLARS FULLY VERIFIED (0 FAILURES)`);
    process.exit(0);
  }
}

runUnifiedVerification().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
