const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testRpc() {
  const testOrderId = 'TEST-PERM-' + Date.now();
  console.log('Testing RPC dispense_product_key with anon key...');
  const { data, error } = await supabase.rpc('dispense_product_key', {
    p_product_id: 'nitro-booster-1m',
    p_order_id: testOrderId
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('Dispensed credential:', data);
  }
}

testRpc().catch(console.error);
