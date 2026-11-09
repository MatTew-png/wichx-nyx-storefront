/**
 * ==============================================================================
 * 🧪 SPRINT 5: ULTIMATE DEFENSE & MOAT PARITY TEST SUITE
 * ==============================================================================
 * Covers:
 * - TC-BOT-01: Bot Shield & Proof-of-Work Challenge Engine (Anti-Scraping / Anti-Bot)
 * - TC-AST-01: Admin Access Sentinel & Audit Trail (IP Logging & 1-Click Blacklist)
 * - TC-KAH-01: KeyAuth HWID Self-Reset & 24h Cooldown Enforcement
 * - TC-DEV-01: Developer User API Keys & Programmatic Stock Gateway
 * - TC-RSL-01: Tiered Reseller Pricing Schema & Catalog Integration
 * - Production Bundle & HTML Storefront Synchronization
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const botShieldHandler = require('../api/bot-shield.js');
const adminAuditHandler = require('../api/admin-audit.js');
const keyAuthHandler = require('../api/keyauth-reset.js');
const developerGatewayHandler = require('../api/developer-gateway.js');
const BotShieldClient = require('../js/core/BotShield.js');

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
  console.log('🧪 SPRINT 5: ULTIMATE DEFENSE & MOAT PARITY TEST SUITE');
  console.log('================================================================\n');

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const testUserId = 'ffdfa09c-b53e-4283-a28a-7eaba5bbd109';
  const testLicenseKey = `NYX-TEST-LICENSE-${Date.now()}`;
  const testIpToBlock = '198.51.100.99';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: TC-BOT-01 — BOT SHIELD CHALLENGE & PROOF-OF-WORK
    // -------------------------------------------------------------------------
    console.log('🛡️ [TEST TC-BOT-01] Testing Bot Shield & Cryptographic PoW Engine:');

    // 1. Fetch challenge
    let challengeData = null;
    await botShieldHandler({
      method: 'GET',
      url: '/api/bot-shield?action=challenge',
      headers: { host: 'localhost:3000', 'x-real-ip': '127.0.0.1' }
    }, makeRes((code, res) => {
      console.log(`   GET /api/bot-shield (challenge) -> HTTP ${code}`, res);
      if (code !== 200 || !res.success || !res.challenge) {
        throw new Error('Failed to retrieve BotShield challenge');
      }
      challengeData = res.challenge;
    }));

    // 2. Solve PoW using BotShieldClient logic
    const clientShield = new BotShieldClient();
    const { nonce, timestamp, difficulty, signature } = challengeData;
    const targetPrefix = '0'.repeat(difficulty || 3);
    let solution = 0;
    while (solution < 100000) {
      solution++;
      const hash = await clientShield.sha256(`${nonce}:${solution}`);
      if (hash.startsWith(targetPrefix)) break;
    }

    const validToken = Buffer.from(JSON.stringify({
      nonce,
      timestamp,
      solution,
      signature
    })).toString('base64');

    // 3. Verify valid token
    await botShieldHandler({
      method: 'POST',
      url: '/api/bot-shield?action=verify',
      headers: { host: 'localhost:3000', 'x-real-ip': '127.0.0.1' },
      body: { token: validToken }
    }, makeRes((code, res) => {
      console.log(`   POST /api/bot-shield (verify valid) -> HTTP ${code}`, res);
      if (code !== 200 || !res.success) {
        throw new Error('Valid BotShield token verification failed');
      }
    }));

    // 4. Test forged token rejection
    const forgedToken = Buffer.from(JSON.stringify({
      nonce,
      timestamp,
      solution: 99999999, // invalid solution
      signature
    })).toString('base64');

    await botShieldHandler({
      method: 'POST',
      url: '/api/bot-shield?action=verify',
      headers: { host: 'localhost:3000', 'x-real-ip': '192.0.2.77' },
      body: { token: forgedToken }
    }, makeRes((code, res) => {
      console.log(`   POST /api/bot-shield (forged token rejection) -> HTTP ${code}`, res);
      if (code !== 403 || res.success) {
        throw new Error('Forged BotShield token should be rejected with HTTP 403');
      }
    }));

    console.log('   ✅ TC-BOT-01 PASSED: Bot Shield PoW verification & tampering detection confirmed.');

    // -------------------------------------------------------------------------
    // TEST 2: TC-AST-01 — ACCESS SENTINEL & 1-CLICK BLACKLIST
    // -------------------------------------------------------------------------
    console.log('\n🕵️ [TEST TC-AST-01] Testing Access Sentinel & Blacklist Engine:');

    // Clean up any test IP in blacklists
    await client.query(`DELETE FROM public.blacklists WHERE target_value = $1;`, [testIpToBlock]);

    // 1. Blacklist IP via API
    await adminAuditHandler({
      method: 'POST',
      url: '/api/admin-audit?action=blacklist_ip',
      headers: { host: 'localhost:3000' },
      body: { ip: testIpToBlock, reason: 'Automated Test Sentinel Blacklist' }
    }, makeRes((code, res) => {
      console.log(`   POST /api/admin-audit (blacklist_ip) -> HTTP ${code}`, res);
      if (code !== 200 || !res.success) {
        throw new Error('Failed to blacklist IP via Sentinel API');
      }
    }));

    // Verify row in public.blacklists
    const blCheck = await client.query('SELECT target_type, target_value, reason FROM public.blacklists WHERE target_value = $1;', [testIpToBlock]);
    if (blCheck.rows.length === 0) {
      throw new Error('Blacklisted IP record not found in database!');
    }
    console.log(`   Database Blacklist Confirmed: IP ${blCheck.rows[0].target_value} Reason: "${blCheck.rows[0].reason}"`);

    // 2. Remove Blacklist via API
    await adminAuditHandler({
      method: 'POST',
      url: '/api/admin-audit?action=remove_blacklist',
      headers: { host: 'localhost:3000' },
      body: { ip: testIpToBlock }
    }, makeRes((code, res) => {
      console.log(`   POST /api/admin-audit (remove_blacklist) -> HTTP ${code}`, res);
      if (code !== 200 || !res.success) {
        throw new Error('Failed to remove IP from blacklist');
      }
    }));

    // Verify removed from database
    const blPostCheck = await client.query('SELECT target_value FROM public.blacklists WHERE target_value = $1;', [testIpToBlock]);
    if (blPostCheck.rows.length > 0) {
      throw new Error('Blacklisted IP should have been deleted!');
    }
    console.log('   ✅ TC-AST-01 PASSED: Access Sentinel IP Blacklisting & Unbanning verified.');

    // -------------------------------------------------------------------------
    // TEST 3: TC-KAH-01 — KEYAUTH HWID SELF-RESET & COOLDOWN
    // -------------------------------------------------------------------------
    console.log('\n🔑 [TEST TC-KAH-01] Testing KeyAuth HWID Self-Reset & Cooldown:');

    // 1. Check Initial Status (No prior resets -> can_reset = true)
    await keyAuthHandler({
      method: 'POST',
      url: '/api/keyauth-reset?action=check',
      headers: { host: 'localhost:3000' },
      body: { license_key: testLicenseKey }
    }, makeRes((code, res) => {
      console.log(`   POST /api/keyauth-reset (check initial) -> HTTP ${code}, can_reset: ${res.can_reset}`);
      if (code !== 200 || !res.can_reset) {
        throw new Error('Initial license key should have can_reset: true');
      }
    }));

    // 2. Perform Reset
    await keyAuthHandler({
      method: 'POST',
      url: '/api/keyauth-reset?action=reset',
      headers: { host: 'localhost:3000' },
      body: { license_key: testLicenseKey, user_id: testUserId }
    }, makeRes((code, res) => {
      console.log(`   POST /api/keyauth-reset (execute reset) -> HTTP ${code}`, res);
      if (code !== 200 || !res.success) {
        throw new Error('HWID Reset execution failed');
      }
    }));

    // 3. Attempt Immediate Second Reset (Must be blocked by 24h Cooldown!)
    await keyAuthHandler({
      method: 'POST',
      url: '/api/keyauth-reset?action=reset',
      headers: { host: 'localhost:3000' },
      body: { license_key: testLicenseKey, user_id: testUserId }
    }, makeRes((code, res) => {
      console.log(`   POST /api/keyauth-reset (cooldown check) -> HTTP ${code}`, res);
      if (code !== 429 || res.success) {
        throw new Error('Immediate second reset should be blocked with HTTP 429 Cooldown');
      }
    }));

    // Clean up test keyauth log
    await client.query('DELETE FROM public.keyauth_reset_logs WHERE license_key = $1;', [testLicenseKey]);
    console.log('   ✅ TC-KAH-01 PASSED: KeyAuth HWID Reset and 24h cooldown successfully enforced.');

    // -------------------------------------------------------------------------
    // TEST 4: TC-DEV-01 — DEVELOPER USER API GATEWAY
    // -------------------------------------------------------------------------
    console.log('\n⚡ [TEST TC-DEV-01] Testing Developer User API Gateway:');

    // 1. Generate new API key
    let rawApiKey = null;
    let apiKeyRecord = null;
    await developerGatewayHandler({
      method: 'POST',
      url: '/api/developer-gateway?action=generate_key',
      headers: { host: 'localhost:3000' },
      body: { user_id: testUserId, label: 'Automated Test Key' }
    }, makeRes((code, res) => {
      console.log(`   POST /api/developer-gateway (generate_key) -> HTTP ${code}`, res.key_record);
      if (code !== 200 || !res.api_key || !res.api_key.startsWith('nyx_sec_')) {
        throw new Error('Failed to generate valid Developer API Key');
      }
      rawApiKey = res.api_key;
      apiKeyRecord = res.key_record;
    }));

    // 2. Call stock query with Bearer key
    await developerGatewayHandler({
      method: 'GET',
      url: '/api/developer-gateway?action=stock',
      headers: { host: 'localhost:3000', authorization: `Bearer ${rawApiKey}` }
    }, makeRes((code, res) => {
      console.log(`   GET /api/developer-gateway (stock) -> HTTP ${code}, Products: ${res.products?.length}, User: "${res.authenticated_user?.username}"`);
      if (code !== 200 || !res.success || !Array.isArray(res.products)) {
        throw new Error('Programmatic stock query failed');
      }
    }));

    // 3. Revoke key
    await developerGatewayHandler({
      method: 'POST',
      url: '/api/developer-gateway?action=revoke_key',
      headers: { host: 'localhost:3000' },
      body: { key_id: apiKeyRecord.id, user_id: testUserId }
    }, makeRes((code, res) => {
      console.log(`   POST /api/developer-gateway (revoke_key) -> HTTP ${code}`, res);
      if (code !== 200 || !res.success) {
        throw new Error('Key revocation failed');
      }
    }));

    // 4. Ensure revoked key cannot authenticate
    await developerGatewayHandler({
      method: 'GET',
      url: '/api/developer-gateway?action=stock',
      headers: { host: 'localhost:3000', authorization: `Bearer ${rawApiKey}` }
    }, makeRes((code, res) => {
      console.log(`   GET /api/developer-gateway (after revoke) -> HTTP ${code}`);
      if (code !== 401) {
        throw new Error('Revoked key should be rejected with HTTP 401');
      }
    }));

    // Clean up test API key
    await client.query('DELETE FROM public.user_api_keys WHERE id = $1;', [apiKeyRecord.id]);
    console.log('   ✅ TC-DEV-01 PASSED: Developer User API Key lifecycle & authentication confirmed.');

    // -------------------------------------------------------------------------
    // TEST 5: TC-RSL-01 — TIERED RESELLER PRICING SCHEMA
    // -------------------------------------------------------------------------
    console.log('\n💼 [TEST TC-RSL-01] Testing Tiered Reseller Pricing:');
    const rslCheck = await client.query(`
      SELECT id, title, price, reseller_price 
      FROM public.products 
      WHERE reseller_price IS NOT NULL AND price > 0
      LIMIT 3;
    `);

    if (rslCheck.rows.length === 0) {
      throw new Error('No products have reseller_price populated');
    }

    for (const p of rslCheck.rows) {
      const price = parseFloat(p.price);
      const rPrice = parseFloat(p.reseller_price);
      console.log(`   Product: "${p.title}" -> Retail: ฿${price.toFixed(2)}, Reseller: ฿${rPrice.toFixed(2)} (${Math.round((1 - rPrice/price) * 100)}% discount)`);
      if (rPrice >= price) {
        throw new Error(`Reseller price (฿${rPrice}) should be lower than retail price (฿${price})`);
      }
    }
    console.log('   ✅ TC-RSL-01 PASSED: Reseller discount schema confirmed in database.');

    // -------------------------------------------------------------------------
    // TEST 6: BUNDLE & STOREFRONT SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log('\n📦 [TEST 6] Testing Production Build & Storefront Synchronization:');
    const bundlePath = path.join(__dirname, '../dist/store.bundle.js');
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');

    if (!bundleContent.includes('BotShieldClient') || !bundleContent.includes('KeyAuthModalComponent')) {
      throw new Error('dist/store.bundle.js is missing BotShieldClient or KeyAuthModalComponent!');
    }

    const adminPath = path.join(__dirname, '../admin.html');
    const adminContent = fs.readFileSync(adminPath, 'utf8');
    if (!adminContent.includes('tab-pane-access-logs') || !adminContent.includes('loadAccessSentinelLogs')) {
      throw new Error('admin.html missing tab-pane-access-logs or sentinel controller functions!');
    }

    console.log('   dist/store.bundle.js and admin.html verified in perfect sync.');
    console.log('   ✅ TEST 6 PASSED: Production storefront builds verified.');

    console.log('\n================================================================');
    console.log('🎉 ALL SPRINT 5 ULTIMATE DEFENSE & MOAT SUITES PASSED EMPIRICALLY (100%)');
    console.log('================================================================');
  } finally {
    await client.end().catch(() => {});
  }
}

runTests().catch(err => {
  console.error('\n❌ [TEST FAILURE]:', err);
  process.exit(1);
});
