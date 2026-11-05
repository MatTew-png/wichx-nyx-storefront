const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- ==============================================================================
-- 🛡️ NYX9 VAULT HARDENING & ZERO-LEAK SECURITY MIGRATION
-- ==============================================================================

-- 1. Helper function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND (
        role = 'admin' 
        OR discord_id IN ('483398326159671326', '422611554475835394')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated, service_role;

-- 2. Secure Stock Counting RPC (replaces raw inventory_keys query)
CREATE OR REPLACE FUNCTION public.get_product_stock_counts()
RETURNS TABLE (
  product_id TEXT,
  in_stock_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    ik.product_id,
    COUNT(*)::BIGINT AS in_stock_count
  FROM public.inventory_keys ik
  WHERE ik.is_sold = FALSE
  GROUP BY ik.product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_stock_counts() TO anon, authenticated, service_role;

-- 3. Hardening inventory_keys RLS: STRICT NO DIRECT ACCESS FOR ANON/AUTHENTICATED
ALTER TABLE public.inventory_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow count unsold inventory keys" ON public.inventory_keys;
DROP POLICY IF EXISTS "Service role full access inventory_keys" ON public.inventory_keys;

CREATE POLICY "Service role full access inventory_keys"
ON public.inventory_keys
FOR ALL
TO service_role
USING (true);

-- 4. Hardening orders RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users read own orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;

CREATE POLICY "Allow users read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "Service role full access orders"
ON public.orders
FOR ALL
TO service_role
USING (true);

-- 5. Hardening order_items RLS (Protect delivered_content!)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users read order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow users read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Service role full access order_items" ON public.order_items;

CREATE POLICY "Allow users read own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Service role full access order_items"
ON public.order_items
FOR ALL
TO service_role
USING (true);

-- 6. Hardening profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;

CREATE POLICY "Allow users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "Service role full access profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true);

-- 7. Hardening topup_transactions RLS
ALTER TABLE public.topup_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users read own topups" ON public.topup_transactions;
DROP POLICY IF EXISTS "Service role full access topup_transactions" ON public.topup_transactions;

CREATE POLICY "Allow users read own topups"
ON public.topup_transactions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "Service role full access topup_transactions"
ON public.topup_transactions
FOR ALL
TO service_role
USING (true);

-- 8. Hardening warranty_claims RLS
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read warranty claims" ON public.warranty_claims;
DROP POLICY IF EXISTS "Service role full access warranty_claims" ON public.warranty_claims;

CREATE POLICY "Allow read warranty claims"
ON public.warranty_claims
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = warranty_claims.order_id
      AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Service role full access warranty_claims"
ON public.warranty_claims
FOR ALL
TO service_role
USING (true);

-- 9. Hardening execute_order_checkout (Recalculate prices, require auth, prevent tampering)
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_target_user_id UUID;
  v_item JSONB;
  v_product_id TEXT;
  v_qty INT;
  v_real_unit_price NUMERIC;
  v_fulfillment_type TEXT;
  v_custom_data JSONB;
  v_dispensed_key TEXT;
  v_all_dispensed JSONB := '[]'::jsonb;
  v_item_credentials JSONB;
  v_calculated_total NUMERIC := 0.00;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC := 0.00;
  v_i INT;
BEGIN
  v_caller_id := auth.uid();

  -- Require authenticated login (Unless service_role is executing)
  IF auth.role() <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'กรุณาเข้าสู่ระบบด้วย Discord ก่อนสั่งซื้อสินค้า'
      );
    END IF;
    v_target_user_id := v_caller_id;
  ELSE
    v_target_user_id := COALESCE(p_user_id, v_caller_id);
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_CART', 'message', 'ตะกร้าสินค้าว่างเปล่า');
  END IF;

  -- 1. SERVER-SIDE PRICE RE-VERIFICATION & CALCULATION (Immune to Client Tampering)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
    
    SELECT price INTO v_real_unit_price
    FROM public.products
    WHERE id = v_product_id AND is_active = TRUE;

    IF v_real_unit_price IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INVALID_PRODUCT',
        'message', 'ไม่พบสินค้ารหัส ' || COALESCE(v_product_id, 'UNKNOWN') || ' หรือสินค้าปิดจำหน่ายชั่วคราว'
      );
    END IF;

    v_calculated_total := v_calculated_total + (v_real_unit_price * v_qty);
  END LOOP;

  -- 2. DEDUCT WALLET BALANCE WITH ATOMIC ROW LOCK
  IF v_target_user_id IS NOT NULL THEN
    SELECT balance INTO v_current_balance
    FROM public.profiles
    WHERE id = v_target_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL OR v_current_balance < v_calculated_total THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSUFFICIENT_BALANCE',
        'message', 'ยอดเงินในกระเป๋าไม่เพียงพอ (ยอดที่ต้องชำระ ฿' || v_calculated_total || ' ยอดคงเหลือ ฿' || COALESCE(v_current_balance, 0) || ')',
        'current_balance', COALESCE(v_current_balance, 0),
        'required_amount', v_calculated_total
      );
    END IF;

    UPDATE public.profiles
    SET balance = balance - v_calculated_total,
        updated_at = NOW()
    WHERE id = v_target_user_id
    RETURNING balance INTO v_new_balance;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่พบข้อมูลผู้สั่งซื้อ');
  END IF;

  -- 3. CREATE ORDER RECORD
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
    v_target_user_id,
    v_calculated_total,
    'wallet',
    'PAID',
    NOW()
  );

  -- 4. DISPENSE INVENTORY ATOMICALLY
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
    
    SELECT price INTO v_real_unit_price
    FROM public.products
    WHERE id = v_product_id;

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
            RAISE EXCEPTION 'OUT_OF_STOCK:%', v_product_id;
        END;
      END LOOP;

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
        v_real_unit_price,
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
      -- Custom Service Fulfillment
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
        v_real_unit_price,
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

  -- 5. AUDIT LOG
  INSERT INTO public.system_audit_logs (
    event_type,
    user_id,
    order_id,
    payload
  )
  VALUES (
    'ORDER_FULFILLED',
    v_target_user_id,
    p_order_id,
    jsonb_build_object(
      'total_amount', v_calculated_total,
      'items_count', jsonb_array_length(p_items),
      'customer_info', p_customer_info
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_amount', v_calculated_total,
    'new_balance', v_new_balance,
    'dispensed_items', v_all_dispensed
  );

EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'OUT_OF_STOCK%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'OUT_OF_STOCK',
        'message', 'ขออภัย สินค้าบางรายการในสต็อกหมดชั่วคราวระหว่างทำรายการ'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'TRANSACTION_FAILED',
        'message', 'เกิดข้อผิดพลาดในการสั่งซื้อ: ' || SQLERRM
      );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) TO anon, authenticated, service_role;
`;

async function deployVaultSecurity() {
  console.log('Connecting to PostgreSQL to apply Vault Hardening...');
  await client.connect();
  console.log('Applying RLS and RPC updates...');
  await client.query(sql);
  console.log('✅ ALL DATABASE POLICIES AND PROCEDURES HARDENED SUCCESSFULLY!');
  await client.end();
}

deployVaultSecurity().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
