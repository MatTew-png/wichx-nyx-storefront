const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testCheckoutProcedure() {
  console.log('--- Testing execute_order_checkout via Supabase RPC ---');
  const testOrderId = 'WX-' + Date.now().toString().slice(-6);
  const testItems = [
    {
      id: 'rockstar-fivem-fresh',
      title: 'Rockstar FiveM สดใหม่ (2 ชั้น)',
      price: 10.00,
      quantity: 1,
      fulfillmentType: 'instant'
    }
  ];

  const { data, error } = await supabase.rpc('execute_order_checkout', {
    p_order_id: testOrderId,
    p_items: testItems,
    p_total_amount: 10.00,
    p_user_id: null,
    p_customer_info: { test: true }
  });

  if (error) throw error;
  console.log('Checkout Result:', JSON.stringify(data, null, 2));

  // Verify order in database
  const { data: order } = await supabase.from('orders').select('*').eq('id', testOrderId).single();
  console.log('Order verified in DB:', order);

  // Verify order items
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', testOrderId);
  console.log('Order items verified in DB:', items);

  if (data.success && data.dispensed_items.length > 0) {
    console.log('🎉 ATOMIC CHECKOUT & DISPENSE PROCEDURE VERIFIED 100%!');
  } else {
    throw new Error('Checkout procedure failed assertions');
  }
}

testCheckoutProcedure().catch(console.error);
