/**
 * ==============================================================================
 * 🧪 SPRINT 6: FINANCIAL SHIELD & GAMERTAG ASSURANCE TEST SUITE
 * ==============================================================================
 * Covers:
 * - TC-SLP-01: Pre-OCR SHA-256 Image Hash Cache & 5ms Fast Rejection
 * - TC-SLP-02: Receiver Account Whitelist Enforcement (Foreign Transfer Block)
 * - TC-SLP-03: Time Freshness Guard 15-Minute Expiry Check
 * - TC-VCH-01: TrueMoney Angpao In-Flight Concurrency Mutex
 * - TC-RBX-02: Roblox Gamertag Pre-flight Lookup & Avatar Confirmation
 * - TC-HNY-01: Honeypot Decoy Trap & Automatic Bot IP Blacklisting
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
require('dotenv').config();

const verifySlipHandler = require('../api/verify-slip.js');
const trueMoneyHandler = require('../api/truemoney-redeem.js');
const robloxLookupHandler = require('../api/roblox-lookup.js');
const checkoutHandler = require('../api/checkout.js');
const guestCheckoutHandler = require('../api/guest-checkout.js');

function makeRes(cb) {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(obj) { cb(this.statusCode, obj); return this; },
    end() { cb(this.statusCode, {}); }
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('🛡️ SPRINT 6: FINANCIAL SHIELD & GAMERTAG ASSURANCE TEST SUITE');
  console.log('================================================================\n');

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const testBotIp = `192.0.2.${Math.floor(Math.random() * 200 + 10)}`;
  const testSlipRef1 = `TEST-SLIP-${Date.now()}`;
  const testSlipRef2 = `TEST-SLIP-DUP-${Date.now()}`;
  const testBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==_${Date.now()}`;
  const expectedImageHash = crypto.createHash('sha256').update(testBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim()).digest('hex');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: TC-SLP-01 — PRE-OCR IMAGE HASH CACHE DEDUPLICATION
    // -------------------------------------------------------------------------
    console.log('💳 [TEST TC-SLP-01] Testing Pre-OCR Slip Image Hash Deduplication:');

    // 1. First submission (Valid PromptPay slip with image)
    let firstPassed = false;
    await verifySlipHandler({
      method: 'POST',
      body: {
        amount: 100.00,
        transRef: testSlipRef1,
        slipImageBase64: testBase64,
        mockSlipData: {
          data: {
            amount: { amount: 100.00 },
            transRef: testSlipRef1,
            receiver: { account: { value: '1459901184414' } },
            transTimestamp: new Date().toISOString()
          }
        }
      },
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   1st Submission -> HTTP ${code}`, res?.message || res?.error);
      if (code === 200 && (res.success || res.verified)) {
        firstPassed = true;
      }
    }));

    if (!firstPassed) {
      throw new Error('Initial slip submission failed');
    }

    // 2. Second submission with the EXACT SAME image base64 (even with different transRef)
    let duplicateCaught = false;
    const startTime = Date.now();
    await verifySlipHandler({
      method: 'POST',
      body: {
        amount: 100.00,
        transRef: testSlipRef2,
        slipImageBase64: testBase64, // Exact same raw slip image
        mockSlipData: {
          data: {
            amount: { amount: 100.00 },
            transRef: testSlipRef2,
            receiver: { account: { value: '1459901184414' } },
            transTimestamp: new Date().toISOString()
          }
        }
      },
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      const elapsed = Date.now() - startTime;
      console.log(`   2nd Submission (Duplicate Image) -> HTTP ${code} (${elapsed}ms)`, res);
      if (code === 409 && res.code === 'DUPLICATE_SLIP_IMAGE' && res.cached === true) {
        duplicateCaught = true;
        console.log(`   ⚡ Fast-Rejection Verified in ${elapsed}ms without calling external OCR!`);
      }
    }));

    if (!duplicateCaught) {
      throw new Error('TC-SLP-01 FAILED: Duplicate slip image was not rejected by Pre-OCR Hash Cache');
    }
    console.log('   ✅ [TC-SLP-01] Pre-OCR SHA-256 Image Hash Cache passed!\n');

    // -------------------------------------------------------------------------
    // TEST 2: TC-SLP-02 — RECEIVER ACCOUNT WHITELIST GUARD
    // -------------------------------------------------------------------------
    console.log('🏦 [TEST TC-SLP-02] Testing Receiver Account Whitelist (Anti-Foreign Transfer):');

    // 1. Submit slip transferred to unauthorized account
    let foreignTransferBlocked = false;
    const foreignRef = `TEST-FOREIGN-${Date.now()}`;
    await verifySlipHandler({
      method: 'POST',
      body: {
        amount: 250.00,
        transRef: foreignRef,
        mockSlipData: {
          data: {
            amount: { amount: 250.00 },
            transRef: foreignRef,
            receiver: { account: { value: '0999999999999' } }, // Unauthorized foreign account
            transTimestamp: new Date().toISOString()
          }
        }
      },
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   Foreign Receiver Attempt -> HTTP ${code}`, res);
      if (code === 403 && res.code === 'INVALID_RECEIVER_ACCOUNT') {
        foreignTransferBlocked = true;
      }
    }));

    if (!foreignTransferBlocked) {
      throw new Error('TC-SLP-02 FAILED: Foreign transfer was not blocked by whitelist');
    }

    // 2. Submit slip transferred to authentic NYX9 account
    let authorizedTransferAllowed = false;
    const authRef = `TEST-AUTH-${Date.now()}`;
    await verifySlipHandler({
      method: 'POST',
      body: {
        amount: 50.00,
        transRef: authRef,
        mockSlipData: {
          data: {
            amount: { amount: 50.00 },
            transRef: authRef,
            receiver: { account: { value: '1459901184414' } }, // Store PromptPay Account
            transTimestamp: new Date().toISOString()
          }
        }
      },
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   Whitelisted Receiver Attempt -> HTTP ${code}`, res?.message);
      if (code === 200 && (res.success || res.verified)) {
        authorizedTransferAllowed = true;
      }
    }));

    if (!authorizedTransferAllowed) {
      throw new Error('TC-SLP-02 FAILED: Whitelisted receiver transfer was rejected');
    }
    console.log('   ✅ [TC-SLP-02] Receiver Account Whitelist Guard passed!\n');

    // -------------------------------------------------------------------------
    // TEST 3: TC-SLP-03 — TIME FRESHNESS GUARD (15-MINUTE EXPIRY)
    // -------------------------------------------------------------------------
    console.log('⏱️ [TEST TC-SLP-03] Testing 15-Minute Time Freshness Guard:');

    // 1. Submit stale slip (1 hour old)
    let staleSlipBlocked = false;
    const staleRef = `TEST-STALE-${Date.now()}`;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    await verifySlipHandler({
      method: 'POST',
      body: {
        amount: 150.00,
        transRef: staleRef,
        mockSlipData: {
          data: {
            amount: { amount: 150.00 },
            transRef: staleRef,
            receiver: { account: { value: '1459901184414' } },
            transTimestamp: oneHourAgo // Stale timestamp
          }
        }
      },
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   Stale Slip (1 hr ago) -> HTTP ${code}`, res);
      if (code === 400 && res.code === 'SLIP_TIMESTAMP_EXPIRED') {
        staleSlipBlocked = true;
      }
    }));

    if (!staleSlipBlocked) {
      throw new Error('TC-SLP-03 FAILED: Stale slip older than 15 mins was not rejected');
    }
    console.log('   ✅ [TC-SLP-03] 15-Minute Time Freshness Guard passed!\n');

    // -------------------------------------------------------------------------
    // TEST 4: TC-VCH-01 — TRUEMONEY IN-FLIGHT CONCURRENCY MUTEX
    // -------------------------------------------------------------------------
    console.log('🧧 [TEST TC-VCH-01] Testing TrueMoney Voucher In-Flight Concurrency Mutex:');

    const testVoucherCode = `tmVoucher${Date.now()}`;
    const voucherUrl = `https://gift.truemoney.com/campaign/vouchers?v=${testVoucherCode}`;

    let firstCallDone = false;
    let mutexLockTriggered = false;

    // Launch 2 concurrent calls with simulated processing delay
    const call1 = trueMoneyHandler({
      method: 'POST',
      body: { voucherUrl, simulatedDelayMs: 150 },
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   Call 1 (Primary) -> HTTP ${code}`, res?.message || res?.error);
      if (code === 200 || res.success) firstCallDone = true;
    }));

    // Call 2 immediately fired while Call 1 is in-flight
    await new Promise(r => setTimeout(r, 20)); // Short pause to guarantee Call 1 has acquired lock
    const call2 = trueMoneyHandler({
      method: 'POST',
      body: { voucherUrl },
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   Call 2 (Concurrent Conflict) -> HTTP ${code}`, res);
      if (code === 409 && res.code === 'VOUCHER_MUTEX_LOCKED') {
        mutexLockTriggered = true;
      }
    }));

    await Promise.all([call1, call2]);

    if (!mutexLockTriggered) {
      throw new Error('TC-VCH-01 FAILED: In-Flight Mutex did not block concurrent redemption');
    }
    console.log('   ✅ [TC-VCH-01] TrueMoney In-Flight Mutex passed!\n');

    // -------------------------------------------------------------------------
    // TEST 5: TC-RBX-02 — ROBLOX GAMERTAG PRE-FLIGHT LOOKUP
    // -------------------------------------------------------------------------
    console.log('👤 [TEST TC-RBX-02] Testing Roblox Gamertag Pre-flight Lookup:');

    // 1. Valid lookup (using mock profile for deterministic test)
    let robloxLookupSuccess = false;
    await robloxLookupHandler({
      method: 'GET',
      url: '/api/roblox-lookup?username=mock_roblox_pro',
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   GET /api/roblox-lookup?username=mock_roblox_pro -> HTTP ${code}`, res);
      if (code === 200 && res.success && res.user && res.user.avatarUrl) {
        robloxLookupSuccess = true;
        console.log(`   🎮 Avatar URL: ${res.user.avatarUrl}`);
      }
    }));

    if (!robloxLookupSuccess) {
      throw new Error('TC-RBX-02 FAILED: Roblox gamertag lookup failed');
    }

    // 2. Invalid gamertag format validation
    let invalidUsernameRejected = false;
    await robloxLookupHandler({
      method: 'GET',
      url: '/api/roblox-lookup?username=a!',
      headers: { 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   Invalid Gamertag Format -> HTTP ${code}`, res?.message);
      if (code === 400 && !res.success) {
        invalidUsernameRejected = true;
      }
    }));

    if (!invalidUsernameRejected) {
      throw new Error('TC-RBX-02 FAILED: Invalid username format was not rejected');
    }
    console.log('   ✅ [TC-RBX-02] Roblox Gamertag Pre-flight Lookup passed!\n');

    // -------------------------------------------------------------------------
    // TEST 6: TC-HNY-01 — DOM HONEYPOT DECOY TRAP & AUTO-BLACKLIST
    // -------------------------------------------------------------------------
    console.log('🍯 [TEST TC-HNY-01] Testing Honeypot Decoy Trap & Bot Auto-Blacklist:');

    let honeypotBlocked = false;
    await checkoutHandler({
      method: 'POST',
      body: {
        items: [{ id: 'test_product', title: 'Test Item', price: 10, quantity: 1 }],
        nyx_decoy_trap_field: 'automated_bot_scraper_payload' // Honeypot filled by bot
      },
      headers: {
        'x-real-ip': testBotIp,
        'x-forwarded-for': testBotIp
      }
    }, makeRes((code, res) => {
      console.log(`   Checkout with Decoy Trap -> HTTP ${code}`, res);
      if (code === 403 && res.code === 'BOT_HONEYPOT_TRIGGERED' && res.security_block) {
        honeypotBlocked = true;
      }
    }));

    if (!honeypotBlocked) {
      throw new Error('TC-HNY-01 FAILED: Honeypot decoy did not block bot checkout');
    }

    // Verify offending bot IP is automatically recorded in public.blacklists
    const blCheck = await client.query(
      "SELECT id, target_type, target_value, reason FROM public.blacklists WHERE target_value = $1;",
      [testBotIp]
    );
    console.log('   🔍 Database Blacklist Records for Bot IP:', blCheck.rows);
    if (blCheck.rowCount === 0) {
      throw new Error('TC-HNY-01 FAILED: Bot IP was not recorded into public.blacklists');
    }

    console.log('   ✅ [TC-HNY-01] Honeypot Trap & Auto-Blacklist passed!\n');

    // -------------------------------------------------------------------------
    // TEST 7: STOREFRONT BUNDLE & HTML SYNCHRONIZATION INTEGRITY
    // -------------------------------------------------------------------------
    console.log('📦 [TEST INTEGRITY] Verifying Bundle & HTML Synchronization:');

    const bundlePath = path.join(__dirname, '..', 'dist', 'store.bundle.js');
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');

    if (!bundleContent.includes('GamertagConfirmModal')) {
      throw new Error('GamertagConfirmModal missing from dist/store.bundle.js');
    }
    if (!bundleContent.includes('roblox-lookup')) {
      throw new Error('Roblox lookup integration missing from dist/store.bundle.js');
    }

    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const html200 = fs.readFileSync(path.join(__dirname, '..', '200.html'), 'utf8');

    if (!indexHtml.includes('cart_decoy_trap_token') || !html200.includes('cart_decoy_trap_token')) {
      throw new Error('Honeypot decoy input missing from index.html or 200.html');
    }

    console.log('   ✅ Storefront bundle and production HTML pages fully verified!\n');

    console.log('================================================================');
    console.log('🎉 ALL SPRINT 6 FINANCIAL SHIELD VERIFICATIONS PASSED (100%)');
    console.log('================================================================');

  } finally {
    // Clean up test records
    await client.query("DELETE FROM public.used_payment_slips WHERE slip_trans_ref LIKE 'TEST-%';").catch(() => {});
    await client.query("DELETE FROM public.blacklists WHERE target_value = $1;", [testBotIp]).catch(() => {});
    await client.end().catch(() => {});
  }
}

runTests().catch(err => {
  console.error('\n❌ SPRINT 6 TEST SUITE FAILED:', err.message);
  process.exit(1);
});
