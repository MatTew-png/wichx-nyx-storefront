const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE OR REPLACE FUNCTION public.execute_order_checkout(
  p_order_id TEXT,
  p_items JSONB,
  p_total_amount NUMERIC,
  p_user_id UUID DEFAULT NULL,
  p_customer_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_product_id TEXT;
  v_qty INT;
  v_unit_price NUMERIC;
  v_fulfillment_type TEXT;
  v_custom_data JSONB;
  v_dispensed_key TEXT;
  v_all_dispensed JSONB := '[]'::jsonb;
  v_item_credentials JSONB;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC := 0.00;
  v_i INT;
BEGIN
  -- 1. Check user profile balance if user_id is provided
  IF p_user_id IS NOT NULL THEN
    SELECT balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL OR v_current_balance < p_total_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_BALANCE',
        'message', 'ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ',
        'current_balance', COALESCE(v_current_balance, 0),
        'required_amount', p_total_amount
      );
    END IF;

    -- Deduct balance
    UPDATE public.profiles
    SET balance = balance - p_total_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;
  END IF;

  -- 2. Insert Order
  INSERT INTO public.orders (
    id,
    user_id,
    total_amount,
    payment_method,
    status,
    created_at
  )
  VALUES (
    p_order_id,
    p_user_id,
    p_total_amount,
    'wallet',
    'PAID',
    NOW()
  );

  -- 3. Loop through items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
    v_unit_price := COALESCE((v_item->>'price')::NUMERIC, 0.00);
    v_fulfillment_type := COALESCE(v_item->>'fulfillmentType', 'instant');
    v_custom_data := COALESCE(v_item->'customData', '{}'::jsonb);
    v_item_credentials := '[]'::jsonb;

    IF v_fulfillment_type = 'instant' THEN
      FOR v_i IN 1..v_qty
      LOOP
        BEGIN
          v_dispensed_key := public.dispense_product_key(v_product_id, p_order_id);
          v_item_credentials := v_item_credentials || jsonb_build_array(v_dispensed_key);
        EXCEPTION
          WHEN OTHERS THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: %', v_product_id;
        END;
      END LOOP;

      -- Insert into order_items
      INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit_price,
        delivered_content,
        custom_data
      )
      VALUES (
        p_order_id,
        v_product_id,
        v_qty,
        v_unit_price,
        v_item_credentials::text,
        v_custom_data
      );

      v_all_dispensed := v_all_dispensed || jsonb_build_array(
        jsonb_build_object(
          'id', v_product_id,
          'title', v_item->>'title',
          'quantity', v_qty,
          'credentials', v_item_credentials
        )
      );
    ELSE
      -- Custom form fulfillment
      INSERT INTO public.order_items (
        order_id,
        product_id,
        quantity,
        unit_price,
        delivered_content,
        custom_data
      )
      VALUES (
        p_order_id,
        v_product_id,
        v_qty,
        v_unit_price,
        'CUSTOM_ORDER_PENDING_ADMIN_DISPATCH',
        v_custom_data
      );

      v_all_dispensed := v_all_dispensed || jsonb_build_array(
        jsonb_build_object(
          'id', v_product_id,
          'title', v_item->>'title',
          'quantity', v_qty,
          'credentials', jsonb_build_array('คำสั่งซื้อแบบบริการพิเศษ ระบบกำลังจัดคิวส่งมอบให้ภายใน 5-15 นาที')
        )
      );
    END IF;
  END LOOP;

  -- 4. Audit Log
  INSERT INTO public.system_audit_logs (
    event_type,
    user_id,
    order_id,
    payload
  )
  VALUES (
    'ORDER_FULFILLED',
    p_user_id,
    p_order_id,
    jsonb_build_object(
      'total_amount', p_total_amount,
      'items_count', jsonb_array_length(p_items),
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_amount', p_total_amount,
    'new_balance', v_new_balance,
    'dispensed_items', v_all_dispensed,
    'message', 'สั่งซื้อและจัดส่งสินค้าสำเร็จ'
  );

EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'OUT_OF_STOCK%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'OUT_OF_STOCK',
        'message', 'ขออภัย สินค้าในสต็อกไม่เพียงพอสำหรับการสั่งซื้อนี้'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DATABASE_ERROR',
        'message', SQLERRM
      );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) TO anon, authenticated, service_role;
`;

async function main() {
  await client.connect();
  console.log('Deploying execute_order_checkout procedure...');
  await client.query(sql);
  console.log('✅ execute_order_checkout procedure deployed successfully!');
  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
