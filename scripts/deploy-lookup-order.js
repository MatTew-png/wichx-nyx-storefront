const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE OR REPLACE FUNCTION public.lookup_order(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB := '[]'::jsonb;
  v_cleaned_id TEXT;
BEGIN
  v_cleaned_id := UPPER(TRIM(p_order_id));
  IF v_cleaned_id IS NULL OR LENGTH(v_cleaned_id) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ORDER_ID', 'message', 'กรุณากรอกรหัสออเดอร์ให้ถูกต้อง (เช่น WX-123456)');
  END IF;

  SELECT id, total_amount, payment_method, status, created_at, user_id
  INTO v_order
  FROM public.orders
  WHERE id = v_cleaned_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'ไม่พบคำสั่งซื้อรหัส ' || v_cleaned_id || ' กรุณาตรวจสอบรหัสอีกครั้ง');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.product_id,
      'title', COALESCE(p.title, oi.custom_data->>'title', oi.product_id),
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'credentials', CASE 
        WHEN oi.delivered_content LIKE '[%' THEN oi.delivered_content::jsonb
        WHEN oi.delivered_content IS NOT NULL AND oi.delivered_content <> '' THEN jsonb_build_array(oi.delivered_content)
        ELSE '[]'::jsonb
      END,
      'custom_data', oi.custom_data
    )
  )
  INTO v_items
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'orderId', v_order.id,
      'totalAmount', v_order.total_amount,
      'status', v_order.status,
      'paymentMethod', v_order.payment_method,
      'timestamp', v_order.created_at,
      'items', COALESCE(v_items, '[]'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_order(TEXT) TO anon, authenticated, service_role;
`;

async function deployLookupOrder() {
  await client.connect();
  await client.query(sql);
  console.log('✅ lookup_order procedure deployed successfully!');
  await client.end();
}

deployLookupOrder().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
