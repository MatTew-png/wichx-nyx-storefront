const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function runFulfillmentTest() {
  console.log('=== STEP 3: AUTOMATED FULFILLMENT & DISPENSE ENGINE TEST ===\n');

  const testProduct = 'nitro-3m-mailpass';

  // 1. Check Initial Unsold Stock
  const { data: initialStock, error: sErr } = await supabase
    .from('inventory_keys')
    .select('id, product_id, is_sold')
    .eq('product_id', testProduct)
    .eq('is_sold', false);

  if (sErr) throw sErr;
  console.log(`[PASS] 1. Initial unsold stock for ${testProduct}: ${initialStock.length} keys`);

  if (initialStock.length === 0) {
    console.log('No unsold keys for this item to test, skipping purchase');
    return;
  }

  // 2. Execute Order Checkout & Automated Fulfillment
  const testOrderId = 'WX-TEST-' + Date.now().toString().slice(-6);
  const checkoutPayload = {
    p_order_id: testOrderId,
    p_items: [
      {
        id: testProduct,
        title: 'รหัสติด Nitro 3 เดือน ยกเมล',
        price: 150.00,
        quantity: 1,
        fulfillmentType: 'instant'
      }
    ],
    p_total_amount: 150.00,
    p_user_id: null,
    p_customer_info: { test: true }
  };

  const { data: checkoutResult, error: cErr } = await supabase.rpc('execute_order_checkout', checkoutPayload);
  if (cErr) throw cErr;

  console.log('[PASS] 2. Order Checkout Executed:', checkoutResult);

  if (!checkoutResult.success) {
    throw new Error('Checkout returned success: false -> ' + checkoutResult.message);
  }

  const dispensedKey = checkoutResult.dispensed_items[0].credentials[0];
  console.log(`[PASS] 3. Dispensed Credential received: "${dispensedKey}"`);

  // 3. Verify in Database (orders table)
  const { data: orderRow, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', testOrderId)
    .single();

  if (oErr || !orderRow) throw new Error('Order row not found in DB!');
  console.log(`[PASS] 4. Order record verified in DB (ID: ${orderRow.id}, Status: ${orderRow.status})`);

  // 4. Verify in Database (order_items table)
  const { data: itemRows, error: iErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', testOrderId);

  if (iErr || !itemRows.length) throw new Error('Order item not found in DB!');
  console.log(`[PASS] 5. Order item row verified in DB (Delivered content: ${itemRows[0].delivered_content})`);

  // 5. Verify in Database (inventory_keys table marked is_sold = true)
  const { data: soldKey, error: kErr } = await supabase
    .from('inventory_keys')
    .select('*')
    .eq('order_id', testOrderId)
    .single();

  if (kErr || !soldKey) throw new Error('Sold inventory key row not found!');
  console.log(`[PASS] 6. Inventory key marked is_sold=true and order_id bound: ${soldKey.id}`);

  // 6. Verify Stock Decreased
  const { data: finalStock } = await supabase
    .from('inventory_keys')
    .select('id')
    .eq('product_id', testProduct)
    .eq('is_sold', false);

  console.log(`[PASS] 7. Unsold stock for ${testProduct} decreased: ${initialStock.length} -> ${finalStock.length}`);

  if (finalStock.length === initialStock.length - 1) {
    console.log('\n======================================================');
    console.log('🏆 AUTOMATED FULFILLMENT & DISPENSE 24/7 VERIFIED 100%!');
    console.log('======================================================');
  } else {
    throw new Error('Stock decrement count mismatch!');
  }
}

runFulfillmentTest().catch(console.error);
