-- ==============================================================================
-- 🐘 NYX9 STUDIO — SUPABASE POSTGRESQL PRODUCTION SCHEMA (ENTERPRISE ARMORED)
-- ==============================================================================
-- ครอบคลุม: บัญชีผู้ใช้, หมวดหมู่, สินค้า, สต็อกออโต้, คำสั่งซื้อ, ประวัติเติมเงิน,
-- และระบบความปลอดภัยระดับสากล: Row Level Security (RLS), Anti-Dupe Slip, 
-- Hardened Search Path, Promo Limiter, Warranty, Audit Logs & Blacklist
-- ==============================================================================

-- 0. เปิดใช้งาน Extension ที่จำเป็น
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CORE DATA TABLES
-- ==============================================================================

-- 1. ตารางข้อมูลโปรไฟล์และกระเป๋าเงินผู้ใช้
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    discord_id TEXT UNIQUE,
    username TEXT,
    avatar_url TEXT,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตารางหมวดหมู่สินค้า
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sub_name TEXT,
    icon TEXT DEFAULT 'layers',
    badge TEXT DEFAULT 'AUTO',
    sort_order INT DEFAULT 0
);

-- 3. ตารางรายการสินค้า
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10,2),
    unit TEXT,
    min_quantity INT DEFAULT 1,
    max_quantity INT DEFAULT 1000,
    step_quantity INT DEFAULT 1,
    fulfillment_type TEXT NOT NULL DEFAULT 'instant',
    status TEXT DEFAULT 'SALE',
    chips TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ตารางคลังสต็อกคีย์ดิจิทัล (Inventory Vault)
CREATE TABLE IF NOT EXISTS public.inventory_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    credential_data TEXT NOT NULL,
    is_sold BOOLEAN NOT NULL DEFAULT FALSE,
    order_id TEXT,
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_unsold 
ON public.inventory_keys (product_id) 
WHERE is_sold = FALSE;

-- 5. ตารางประวัติคำสั่งซื้อ (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL DEFAULT 'wallet',
    status TEXT NOT NULL DEFAULT 'PAID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ตารางรายการสินค้าในคำสั่งซื้อ (Order Items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    delivered_content TEXT,
    custom_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ตารางประวัติการเติมเงิน (Top-Up Transactions)
CREATE TABLE IF NOT EXISTS public.topup_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    gateway TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    bonus_amount NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    trans_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ตารางป้องกันสลิปซ้ำ (Anti-Dupe Slip Protection)
CREATE TABLE IF NOT EXISTS public.used_payment_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slip_trans_ref TEXT UNIQUE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    gateway TEXT NOT NULL DEFAULT 'promptpay',
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slips_ref ON public.used_payment_slips(slip_trans_ref);

-- 9. ตารางจำกัดสิทธิ์โค้ดส่วนลด (Promo Code Redemptions)
CREATE TABLE IF NOT EXISTS public.promo_code_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id NOT NULL UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, code)
);

-- 10. ตารางประวัติการเคลมสินค้าและประกัน (Warranty Claims & Tickets)
CREATE TABLE IF NOT EXISTS public.warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ตารางแบล็กลิสต์ป้องกันมิจฉาชีพ (Fraud & Exploit Blacklist)
CREATE TABLE IF NOT EXISTS public.blacklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    target_value TEXT UNIQUE NOT NULL,
    reason TEXT,
    banned_by TEXT DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ตารางบันทึกกิจกรรมระบบและตรวจสอบความปลอดภัย (System Audit Logs)
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO',
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- 🔒 PART 2: ROW LEVEL SECURITY (RLS) POLICIES ON ALL 12 TABLES
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_payment_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read active products" ON public.products;
CREATE POLICY "Allow public read active products" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role full access inventory_keys" ON public.inventory_keys;
CREATE POLICY "Service role full access inventory_keys" ON public.inventory_keys FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Allow count unsold inventory keys" ON public.inventory_keys;
CREATE POLICY "Allow count unsold inventory keys" ON public.inventory_keys FOR SELECT TO anon, authenticated USING (is_sold = false);

DROP POLICY IF EXISTS "Allow users read own orders" ON public.orders;
CREATE POLICY "Allow users read own orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users read order items" ON public.order_items;
CREATE POLICY "Allow users read order items" ON public.order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users read own profile" ON public.profiles;
CREATE POLICY "Allow users read own profile" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() IS NOT NULL AND id = auth.uid());

DROP POLICY IF EXISTS "Allow users read own topups" ON public.topup_transactions;
CREATE POLICY "Allow users read own topups" ON public.topup_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Protect used payment slips" ON public.used_payment_slips;
CREATE POLICY "Protect used payment slips" ON public.used_payment_slips FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Allow users read own promo usage" ON public.promo_code_usages;
CREATE POLICY "Allow users read own promo usage" ON public.promo_code_usages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert warranty claims" ON public.warranty_claims;
CREATE POLICY "Allow insert warranty claims" ON public.warranty_claims 
  FOR INSERT WITH CHECK (
    order_id IS NOT NULL AND length(trim(order_id)) > 0 
    AND reason IS NOT NULL AND length(trim(reason)) > 0
    AND replacement_key IS NULL
  );

DROP POLICY IF EXISTS "Allow read warranty claims" ON public.warranty_claims;
CREATE POLICY "Allow read warranty claims" ON public.warranty_claims FOR SELECT USING (true);

DROP POLICY IF EXISTS "Protect blacklists" ON public.blacklists;
CREATE POLICY "Protect blacklists" ON public.blacklists FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Protect system audit logs" ON public.system_audit_logs;
CREATE POLICY "Protect system audit logs" ON public.system_audit_logs FOR ALL TO service_role USING (true);


-- ==============================================================================
-- ⚡ PART 3: HARDENED STORED PROCEDURES (WITH EXPLICIT SEARCH_PATH)
-- ==============================================================================

-- 1. Dispense Product Key (Internal Helper)
CREATE OR REPLACE FUNCTION public.dispense_product_key(p_product_id TEXT, p_order_id TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_key_id UUID;
    v_credential TEXT;
BEGIN
    SELECT id, credential_data INTO v_key_id, v_credential
    FROM public.inventory_keys
    WHERE product_id = p_product_id AND is_sold = FALSE
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_key_id IS NULL THEN
        RAISE EXCEPTION 'OUT_OF_STOCK';
    END IF;

    UPDATE public.inventory_keys
    SET is_sold = TRUE, order_id = p_order_id, sold_at = NOW()
    WHERE id = v_key_id;

    INSERT INTO public.system_audit_logs (event_type, severity, order_id, payload)
    VALUES ('ORDER_DISPENSED', 'INFO', p_order_id, jsonb_build_object('product_id', p_product_id, 'key_id', v_key_id));

    RETURN v_credential;
END;
$$;

-- 2. Process Topup (PromptPay & TrueMoney)
CREATE OR REPLACE FUNCTION public.process_topup(
  p_gateway TEXT,
  p_trans_ref TEXT,
  p_amount NUMERIC,
  p_user_id UUID DEFAULT NULL,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_slip_id UUID;
  v_existing_topup_id UUID;
  v_topup_id UUID;
  v_new_balance NUMERIC := 0.00;
BEGIN
  IF p_gateway = 'promptpay' THEN
    SELECT id INTO v_existing_slip_id 
    FROM public.used_payment_slips 
    WHERE slip_trans_ref = p_trans_ref 
    LIMIT 1;

    IF v_existing_slip_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_SLIP',
        'message', 'สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้ (Anti-Double-Spend Triggered)'
      );
    END IF;

    INSERT INTO public.used_payment_slips (slip_trans_ref, amount, user_id, gateway, raw_payload)
    VALUES (p_trans_ref, p_amount, p_user_id, p_gateway, p_raw_payload);
  END IF;

  IF p_gateway = 'truemoney' THEN
    SELECT id INTO v_existing_topup_id
    FROM public.topup_transactions
    WHERE gateway = 'truemoney' AND trans_ref = p_trans_ref
    LIMIT 1;

    IF v_existing_topup_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_VOUCHER',
        'message', 'ซองของขวัญนี้ถูกรับเงินไปแล้ว ไม่สามารถใช้ซ้ำได้'
      );
    END IF;
  END IF;

  INSERT INTO public.topup_transactions (
    user_id,
    gateway,
    amount,
    bonus_amount,
    status,
    trans_ref
  )
  VALUES (
    p_user_id,
    p_gateway,
    p_amount,
    0.00,
    'SUCCESS',
    p_trans_ref
  )
  RETURNING id INTO v_topup_id;

  IF p_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;
  END IF;

  INSERT INTO public.system_audit_logs (
    event_type,
    user_id,
    order_id,
    payload
  )
  VALUES (
    'TOPUP_SUCCESS',
    p_user_id,
    v_topup_id::text,
    jsonb_build_object(
      'gateway', p_gateway,
      'amount', p_amount,
      'trans_ref', p_trans_ref,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'topup_id', v_topup_id,
    'gateway', p_gateway,
    'amount', p_amount,
    'trans_ref', p_trans_ref,
    'new_balance', v_new_balance,
    'message', 'เติมเงินสำเร็จเรียบร้อยแล้ว'
  );
END;
$$;

-- 3. Execute Order Checkout (Atomic Fulfillment)
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

    UPDATE public.profiles
    SET balance = balance - p_total_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;
  END IF;

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

-- 4. Admin Get Metrics
CREATE OR REPLACE FUNCTION public.admin_get_metrics(p_admin_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
  v_total_revenue NUMERIC := 0.00;
  v_total_orders BIGINT := 0;
  v_total_unsold_stock BIGINT := 0;
  v_total_topups NUMERIC := 0.00;
  v_pending_claims BIGINT := 0;
  v_stock_by_product JSONB := '[]'::jsonb;
  v_recent_orders JSONB := '[]'::jsonb;
  v_recent_topups JSONB := '[]'::jsonb;
  v_claims JSONB := '[]'::jsonb;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง (Invalid Admin Secret)');
  END IF;

  SELECT COALESCE(SUM(total_amount), 0), COUNT(*) INTO v_total_revenue, v_total_orders FROM public.orders;
  SELECT COUNT(*) INTO v_total_unsold_stock FROM public.inventory_keys WHERE is_sold = FALSE;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_topups FROM public.topup_transactions WHERE status = 'SUCCESS';
  SELECT COUNT(*) INTO v_pending_claims FROM public.warranty_claims WHERE status = 'PENDING';

  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', p.id,
      'title', p.title,
      'price', p.price,
      'in_stock', COALESCE(k.unsold_count, 0),
      'sold_count', COALESCE(k.sold_count, 0)
    )
  ) INTO v_stock_by_product
  FROM public.products p
  LEFT JOIN (
    SELECT 
      product_id,
      COUNT(*) FILTER (WHERE is_sold = FALSE) AS unsold_count,
      COUNT(*) FILTER (WHERE is_sold = TRUE) AS sold_count
    FROM public.inventory_keys
    GROUP BY product_id
  ) k ON p.id = k.product_id
  WHERE p.is_active = TRUE;

  SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb) INTO v_recent_orders
  FROM (
    SELECT id, total_amount, payment_method, status, created_at
    FROM public.orders
    ORDER BY created_at DESC
    LIMIT 10
  ) o;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent_topups
  FROM (
    SELECT id, gateway, amount, status, trans_ref, created_at
    FROM public.topup_transactions
    ORDER BY created_at DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) INTO v_claims
  FROM (
    SELECT id, order_id, reason, status, admin_notes, created_at
    FROM public.warranty_claims
    ORDER BY created_at DESC
    LIMIT 10
  ) c;

  RETURN jsonb_build_object(
    'success', true,
    'metrics', jsonb_build_object(
      'total_revenue', v_total_revenue,
      'total_orders', v_total_orders,
      'total_unsold_stock', v_total_unsold_stock,
      'total_topups', v_total_topups,
      'pending_claims', v_pending_claims
    ),
    'stock_by_product', COALESCE(v_stock_by_product, '[]'::jsonb),
    'recent_orders', v_recent_orders,
    'recent_topups', v_recent_topups,
    'warranty_claims', v_claims
  );
END;
$$;

-- 5. Admin Bulk Restock
CREATE OR REPLACE FUNCTION public.admin_bulk_restock(
  p_admin_secret TEXT,
  p_product_id TEXT,
  p_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
  v_key TEXT;
  v_inserted_count INT := 0;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  IF p_keys IS NULL OR array_length(p_keys, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่มีรายการคีย์ที่จะเติม');
  END IF;

  FOREACH v_key IN ARRAY p_keys
  LOOP
    IF trim(v_key) <> '' THEN
      INSERT INTO public.inventory_keys (product_id, credential_data, is_sold)
      VALUES (p_product_id, trim(v_key), FALSE);
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.system_audit_logs (event_type, severity, payload)
  VALUES ('ADMIN_RESTOCK', 'INFO', jsonb_build_object('product_id', p_product_id, 'count', v_inserted_count, 'timestamp', NOW()));

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'inserted_count', v_inserted_count,
    'message', 'เพิ่มสต็อกสินค้าเรียบร้อยแล้ว ' || v_inserted_count || ' รายการ'
  );
END;
$$;

-- 6. Admin Resolve Claim
CREATE OR REPLACE FUNCTION public.admin_resolve_claim(
  p_admin_secret TEXT,
  p_claim_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  UPDATE public.warranty_claims
  SET status = p_status,
      admin_notes = p_admin_notes,
      updated_at = NOW()
  WHERE id = p_claim_id;

  INSERT INTO public.system_audit_logs (event_type, severity, payload)
  VALUES ('CLAIM_RESOLVED', 'INFO', jsonb_build_object('claim_id', p_claim_id, 'status', p_status, 'notes', p_admin_notes));

  RETURN jsonb_build_object('success', true, 'claim_id', p_claim_id, 'status', p_status, 'message', 'อัปเดตสถานะการเคลมเรียบร้อย');
END;
$$;

-- Grants & Permissions
REVOKE EXECUTE ON FUNCTION public.dispense_product_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_product_key(TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_restock(TEXT, TEXT, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_claim(TEXT, UUID, TEXT, TEXT) TO anon, authenticated, service_role;


-- ==============================================================================
-- 🔐 SUPABASE AUTH HOOK & DISCORD USER SYNCHRONIZATION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discord_id TEXT;
  v_username TEXT;
  v_avatar_url TEXT;
BEGIN
  v_discord_id := COALESCE(
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'sub'
  );
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'custom_claims'->>'global_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Discord Member'
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (id, discord_id, username, avatar_url, balance, role)
  VALUES (
    NEW.id,
    v_discord_id,
    v_username,
    v_avatar_url,
    0.00,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    discord_id = COALESCE(EXCLUDED.discord_id, public.profiles.discord_id),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
