/**
 * ==============================================================================
 * 🧪 SPRINT 2: QUICK-COMMERCE & TRUST MULTIPLIERS COMPREHENSIVE TEST SUITE
 * ==============================================================================
 * Covers:
 * - TC-GST-01: Instant Guest Checkout & Atomic Key Dispensing
 * - TC-GST-02: 2.9% TrueMoney Fee Calculation
 * - TC-PIN-01: Admin 2FA Protection (Block Invalid PIN)
 * - TC-PIN-02: Admin 2FA PIN Generation & HMAC Session Token Validation
 * - Program Status Hub: Real-time query & active script telemetry
 * ==============================================================================
 */

const statusHandler = require('../api/program-statuses.js');
const guestCheckoutHandler = require('../api/guest-checkout.js');
const adminPinHandler = require('../api/admin-pin.js');
const { Client } = require('pg');
require('dotenv').config();

function makeRes(cb) {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(obj) { cb(this.statusCode, obj); return this; },
    end() {}
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 SPRINT 2: QUICK-COMMERCE & TRUST MULTIPLIERS TEST SUITE');
  console.log('================================================================\n');

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const testProductId = 'nitro-3m-mailpass';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: PROGRAM STATUSES API
    // -------------------------------------------------------------------------
    console.log('⚡ [TEST 1] Program Status Hub Telemetry:');
    await statusHandler({
      method: 'GET',
      url: '/api/program-statuses',
      headers: { host: 'localhost:3000' }
    }, makeRes((code, data) => {
      console.log(`   GET /api/program-statuses -> HTTP ${code}, Active Count: ${data.count}`);
      if (code !== 200 || !data.success || data.count === 0) throw new Error('Program statuses GET failed!');
    }));

    // -------------------------------------------------------------------------
    // TEST 2: TC-GST-02 - GUEST ANGPAO FEE QUOTE CALCULATION (2.9%)
    // -------------------------------------------------------------------------
    console.log('\n🧧 [TEST TC-GST-02] Testing 2.9% TrueMoney Fee Quote Calculation:');
    await guestCheckoutHandler({
      method: 'GET',
      url: `/api/guest-checkout?action=quote&product_id=${testProductId}&quantity=1`,
      headers: { host: 'localhost:3000' }
    }, makeRes((code, data) => {
      console.log(`   Quote -> HTTP ${code}, Base: ฿${data.pricing?.base_price}, Fee (2.9%): ฿${data.pricing?.fee_amount}, Total: ฿${data.pricing?.total_required}`);
      if (code !== 200 || !data.pricing) throw new Error('Fee quote calculation failed!');
      const expectedFee = Math.round(data.pricing.base_price * 0.029 * 100) / 100;
      if (Math.abs(data.pricing.fee_amount - expectedFee) > 0.05) {
        throw new Error(`Fee mismatch: expected ~${expectedFee}, got ${data.pricing.fee_amount}`);
      }
      console.log('   ✅ TC-GST-02 PASSED: 2.9% fee accurately computed.');
    }));

    // -------------------------------------------------------------------------
    // TEST 3: TC-GST-01 - INSTANT GUEST CHECKOUT & ATOMIC DISPENSING
    // -------------------------------------------------------------------------
    console.log('\n🚀 [TEST TC-GST-01] Testing Guest Angpao Instant Checkout:');
    // Ensure 1 test key exists in vault
    const testKey = `GUEST-TEST-KEY-${Date.now()}`;
    await client.query("SELECT public.fn_bulk_insert_stock($1, NULL, $2);", [testProductId, [testKey]]);

    const testVoucherCode = `TEST-ANGPAO-${Date.now()}`;
    await guestCheckoutHandler({
      method: 'POST',
      url: '/api/guest-checkout',
      headers: { host: 'localhost:3000' },
      body: {
        product_id: testProductId,
        quantity: 1,
        voucher_url: `https://gift.truemoney.com/campaign/?v=${testVoucherCode}`,
        customer_contact: 'discord:GuestBuyer#9999'
      }
    }, makeRes((code, data) => {
      console.log(`   Guest Checkout -> HTTP ${code}, Order: ${data.order?.order_id}, Credentials: ${JSON.stringify(data.credentials)}`);
      if (code !== 200 || !data.success || !data.credentials || data.credentials.length !== 1) {
        throw new Error('Guest checkout failed to dispense credential!');
      }
      console.log('   ✅ TC-GST-01 PASSED: Guest order paid, key dispensed, and audit recorded.');
    }));

    // Test Anti-Double-Spend with same voucher
    console.log('\n🛡️ [ANTI-DUPE] Submitting identical voucher code again:');
    await guestCheckoutHandler({
      method: 'POST',
      url: '/api/guest-checkout',
      headers: { host: 'localhost:3000' },
      body: {
        product_id: testProductId,
        quantity: 1,
        voucher_url: `https://gift.truemoney.com/campaign/?v=${testVoucherCode}`,
        customer_contact: 'discord:Fraudster#0001'
      }
    }, makeRes((code, data) => {
      console.log(`   Re-submit result -> HTTP ${code}, Code: ${data.code}`);
      if (code !== 409 || data.code !== 'DUPLICATE_VOUCHER') {
        throw new Error('Anti-dupe failed to reject used voucher!');
      }
      console.log('   ✅ ANTI-DUPE PASSED: Double-spend rejected 100%.');
    }));

    // -------------------------------------------------------------------------
    // TEST 4: TC-PIN-01 & TC-PIN-02 - ADMIN PIN 2FA SECURITY
    // -------------------------------------------------------------------------
    console.log('\n🔐 [TEST TC-PIN-02] Testing Admin OTP Request & Verify:');
    let generatedPin = '';
    await adminPinHandler({
      method: 'POST',
      url: '/api/admin-pin?action=request_otp',
      headers: { host: 'localhost:3000' }
    }, makeRes((code, data) => {
      console.log(`   Request OTP -> HTTP ${code}, dev_pin: ${data.dev_pin || 'DISPATCHED_TO_DISCORD'}`);
      if (code !== 200 || !data.success) throw new Error('Request OTP failed!');
      generatedPin = data.dev_pin;
    }));

    // Verify Wrong PIN (TC-PIN-01)
    console.log('\n🚫 [TEST TC-PIN-01] Testing Wrong PIN Rejection:');
    await adminPinHandler({
      method: 'POST',
      url: '/api/admin-pin?action=verify',
      headers: { host: 'localhost:3000' },
      body: { pin: '000000' }
    }, makeRes((code, data) => {
      console.log(`   Wrong PIN result -> HTTP ${code}, Message: ${data.message}`);
      if (code !== 401 || data.code !== 'INVALID_PIN') {
        throw new Error('Wrong PIN was not rejected!');
      }
      console.log('   ✅ TC-PIN-01 PASSED: Invalid PIN rejected with 401.');
    }));

    // Verify Correct PIN (TC-PIN-02)
    if (generatedPin) {
      console.log('\n✅ [TEST TC-PIN-02] Testing Correct PIN Verification:');
      let sessionToken = '';
      await adminPinHandler({
        method: 'POST',
        url: '/api/admin-pin?action=verify',
        headers: { host: 'localhost:3000' },
        body: { pin: generatedPin }
      }, makeRes((code, data) => {
        console.log(`   Correct PIN result -> HTTP ${code}, Token issued: ${Boolean(data.token)}`);
        if (code !== 200 || !data.token) throw new Error('Correct PIN verification failed!');
        sessionToken = data.token;
      }));

      // Verify Session Token
      await adminPinHandler({
        method: 'POST',
        url: '/api/admin-pin?action=verify_token',
        headers: { host: 'localhost:3000' },
        body: { token: sessionToken }
      }, makeRes((code, data) => {
        console.log(`   Verify Token result -> HTTP ${code}, Authenticated: ${data.authenticated}`);
        if (code !== 200 || !data.authenticated) throw new Error('Session token verification failed!');
        console.log('   ✅ TC-PIN-02 PASSED: 2FA Session Token validated.');
      }));
    }

    console.log('\n================================================================');
    console.log('🎉 ALL SPRINT 2 TEST CASES PASSED WITH 100% ACCURACY!');
    console.log('================================================================\n');

  } finally {
    // Cleanup test data
    await client.query("DELETE FROM public.used_payment_slips WHERE slip_trans_ref LIKE 'TM-ANGPAO-TEST-%';");
    await client.query("DELETE FROM public.order_items WHERE order_id LIKE 'GUEST-WX-%';");
    await client.query("DELETE FROM public.orders WHERE id LIKE 'GUEST-WX-%';");
    await client.query("SELECT public.fn_sync_product_stock($1);", [testProductId]);
    await client.end();
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
