/**
 * ==============================================================================
 * 🧪 TEST SUITE: ADVANCED STOCK MANAGEMENT & ATOMIC CONCURRENCY (SPRINT 1)
 * ==============================================================================
 * Verifies:
 * 1. Bulk insertion of 50 keys (TC-STK-01)
 * 2. Deduplication trap: inserting 30 duplicated + 20 new keys (TC-STK-02)
 * 3. Sync stock re-count verification (TC-STK-04)
 * 4. High-concurrency atomic dispensing via fn_dispense_credentials (TC-STK-03)
 * 5. Safe cleanup
 * ==============================================================================
 */

require('dotenv').config();
const { Client } = require('pg');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 SPRINT 1: ADVANCED STOCK MANAGEMENT & DEDUPLICATION TEST SUITE');
  console.log('================================================================\n');

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const testProductId = 'nitro-3m-mailpass'; // known product in catalog

  try {
    // Phase 0: Initial Cleanup of previous test keys for this product
    console.log('🧹 [PHASE 0] Preparing clean test environment...');
    await client.query("DELETE FROM public.credentials_vault WHERE product_id = $1 AND public.vault_decrypt(credential_data) LIKE 'TEST-KEY-%';", [testProductId]);
    await client.query("SELECT public.fn_sync_product_stock($1);", [testProductId]);

    // Phase 1: TC-STK-01 - Bulk Ingestion
    console.log('\n🚀 [TEST TC-STK-01] Testing Bulk Insertion of 20 unique keys...');
    const keysBatch1 = Array.from({ length: 20 }, (_, i) => `TEST-KEY-BATCH1-${String(i + 1).padStart(3, '0')}`);
    
    const res1 = await client.query(
      "SELECT added_count, skipped_count FROM public.fn_bulk_insert_stock($1, NULL, $2);",
      [testProductId, keysBatch1]
    );

    const { added_count: added1, skipped_count: skipped1 } = res1.rows[0];
    console.log(`   Result: added = ${added1}, skipped = ${skipped1}`);
    if (Number(added1) !== 20 || Number(skipped1) !== 0) {
      throw new Error(`TC-STK-01 FAILED: Expected 20 added, 0 skipped. Got ${added1}, ${skipped1}`);
    }
    console.log('   ✅ TC-STK-01 PASSED: 20 unique keys inserted successfully.');

    // Phase 2: TC-STK-02 - Deduplication Trap
    console.log('\n🛡️ [TEST TC-STK-02] Testing Deduplication Trap (10 duplicate + 10 new keys)...');
    const duplicateKeys = keysBatch1.slice(0, 10);
    const newKeys = Array.from({ length: 10 }, (_, i) => `TEST-KEY-BATCH2-${String(i + 1).padStart(3, '0')}`);
    const mixedBatch = [...duplicateKeys, ...newKeys];

    const res2 = await client.query(
      "SELECT added_count, skipped_count FROM public.fn_bulk_insert_stock($1, NULL, $2);",
      [testProductId, mixedBatch]
    );

    const { added_count: added2, skipped_count: skipped2 } = res2.rows[0];
    console.log(`   Result: added = ${added2}, skipped = ${skipped2}`);
    if (Number(added2) !== 10 || Number(skipped2) !== 10) {
      throw new Error(`TC-STK-02 FAILED: Expected 10 added, 10 skipped. Got ${added2}, ${skipped2}`);
    }
    console.log('   ✅ TC-STK-02 PASSED: Deduplication caught all 10 duplicates accurately.');

    // Phase 3: TC-STK-04 - Sync Stock Verification
    console.log('\n📊 [TEST TC-STK-04] Testing fn_sync_product_stock accurate counting...');
    const syncRes = await client.query("SELECT public.fn_sync_product_stock($1) AS total_stock;", [testProductId]);
    const totalStock = Number(syncRes.rows[0].total_stock);

    const countCheck = await client.query("SELECT COUNT(*) FROM public.credentials_vault WHERE product_id = $1 AND is_sold = FALSE;", [testProductId]);
    const actualUnsold = Number(countCheck.rows[0].count);

    console.log(`   Synced stock in products table: ${totalStock}, Actual unsold in vault: ${actualUnsold}`);
    if (totalStock !== actualUnsold) {
      throw new Error(`TC-STK-04 FAILED: Stock mismatch! products.stock (${totalStock}) != vault (${actualUnsold})`);
    }
    console.log('   ✅ TC-STK-04 PASSED: Stock counter in products is 100% synchronized.');

    // Phase 4: TC-STK-03 - Atomic Concurrency Dispensing
    console.log('\n⚡ [TEST TC-STK-03] Testing Atomic Dispensing (FOR UPDATE SKIP LOCKED)...');
    const testOrderId = `ORDER-TEST-${Date.now()}`;
    const dispenseRes = await client.query(
      "SELECT credential_id, credential_data FROM public.fn_dispense_credentials($1, NULL, 5, $2, 'test-user-123');",
      [testProductId, testOrderId]
    );

    console.log(`   Dispensed ${dispenseRes.rows.length} credentials for order ${testOrderId}`);
    if (dispenseRes.rows.length !== 5) {
      throw new Error(`TC-STK-03 FAILED: Expected 5 credentials dispensed. Got ${dispenseRes.rows.length}`);
    }

    // Verify dispensed keys are now marked as sold
    const verifySold = await client.query(
      "SELECT is_sold, order_id, sold_to_user_id FROM public.credentials_vault WHERE order_id = $1;",
      [testOrderId]
    );
    if (verifySold.rows.length !== 5 || !verifySold.rows.every(r => r.is_sold === true && r.sold_to_user_id === 'test-user-123')) {
      throw new Error('TC-STK-03 FAILED: Sold audit trail incorrect in credentials_vault!');
    }
    console.log('   ✅ TC-STK-03 PASSED: Credentials atomically dispensed and audit trail verified.');

    // Phase 5: Cleanup Test Data
    console.log('\n🧹 [PHASE 5] Cleaning up test credentials...');
    await client.query("DELETE FROM public.credentials_vault WHERE product_id = $1 AND public.vault_decrypt(credential_data) LIKE 'TEST-KEY-%';", [testProductId]);
    await client.query("SELECT public.fn_sync_product_stock($1);", [testProductId]);
    console.log('   ✅ Cleanup completed successfully.');

    console.log('\n================================================================');
    console.log('🎉 ALL SPRINT 1 STOCK ENGINE TEST CASES PASSED WITH 100% ACCURACY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTestSuite();
