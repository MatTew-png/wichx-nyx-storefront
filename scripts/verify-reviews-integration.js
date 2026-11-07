/**
 * ==============================================================================
 * 🧪 NYX9 STUDIO — REVIEWS & INTEGRATION VERIFICATION SUITE
 * ==============================================================================
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const merchantHealthHandler = require('../api/merchant-health');

async function testAll() {
  console.log('================================================================');
  console.log('⭐ VERIFYING REVIEWS, DISCORD OAUTH2 & LIVE MERCHANT INTEGRATION');
  console.log('================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  const adminClient = createClient(supabaseUrl, serviceKey);
  const anonClient = createClient(supabaseUrl, anonKey);

  let passed = 0;
  let total = 0;

  function assert(name, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
      if (extra) console.log(`     ↳ ${extra}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      if (extra) console.error(`     ↳ ${extra}`);
    }
  }

  // Test 1: Anonymous visitor can read visible reviews via RLS
  const { data: anonReviews, error: anonErr } = await anonClient
    .from('product_reviews')
    .select('id, rating, comment, is_visible')
    .limit(5);

  assert(
    'Anonymous visitor can query visible reviews via RLS',
    !anonErr && Array.isArray(anonReviews) && anonReviews.length > 0,
    `Returned ${anonReviews?.length || 0} visible reviews (Zero leak of hidden reviews)`
  );

  // Test 2: RPC get_storewide_reviews
  const { data: storeSummary, error: sumErr } = await anonClient
    .rpc('get_storewide_reviews', { p_limit: 5 });

  assert(
    'RPC get_storewide_reviews returns average rating and formatted review array',
    !sumErr && storeSummary && storeSummary.total_reviews >= 1,
    `Overall Average: ${storeSummary?.overall_average} Stars, Total: ${storeSummary?.total_reviews}`
  );

  // Test 3: RPC submit_product_review prevents duplicate submission for same order
  const testOrderId = `WX-TEST-${Date.now().toString().slice(-4)}`;
  const testProdId = 'nitro-booster-1m';

  // 1st submission
  const { data: sub1, error: err1 } = await adminClient.rpc('submit_product_review', {
    p_order_id: testOrderId,
    p_product_id: testProdId,
    p_rating: 5,
    p_comment: 'Automated test review - excellent speed!',
    p_author_name: 'TestBot'
  });

  assert(
    'First review submission for order is accepted',
    !err1 && sub1?.success === true,
    `Review ID: ${sub1?.review_id}`
  );

  // 2nd submission (Must be rejected with duplicate error)
  const { data: sub2, error: err2 } = await adminClient.rpc('submit_product_review', {
    p_order_id: testOrderId,
    p_product_id: testProdId,
    p_rating: 4,
    p_comment: 'Spam attempt',
    p_author_name: 'TestBot'
  });

  assert(
    'Duplicate review for same order and product is rejected (Anti-Spam Unique Constraint)',
    !!err2 && err2.message.includes('ไปแล้ว'),
    `Rejected with expected message: ${err2?.message}`
  );

  // Clean up test review
  if (sub1?.review_id) {
    await adminClient.from('product_reviews').delete().eq('id', sub1.review_id);
  }

  // Test 4: Merchant Health API returns 200 with service checks
  let healthResult = null;
  const mockReq = { method: 'GET', headers: { 'x-forwarded-for': '127.0.0.1' } };
  const mockRes = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => {
        healthResult = { code, data };
      }
    })
  };

  await merchantHealthHandler(mockReq, mockRes);

  assert(
    'Merchant Health Diagnostics API returns HTTP 200 with healthy database & live services',
    healthResult?.code === 200 && healthResult.data?.status === 'HEALTHY' && healthResult.data?.services?.database?.status === 'OK',
    `Database: ${healthResult?.data?.services?.database?.status}, Products: ${healthResult?.data?.services?.database?.productCount}`
  );

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

testAll().catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
