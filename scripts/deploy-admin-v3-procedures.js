const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- ==============================================================================
-- 🚀 NYX9 OPERATIONS SUITE V3.0 - ADVANCED ENTERPRISE PROCEDURES
-- ==============================================================================

-- 1. Analytics & Visual Data Engine
CREATE OR REPLACE FUNCTION public.admin_get_analytics(p_admin_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
  v_timeseries JSONB := '[]'::jsonb;
  v_top_products JSONB := '[]'::jsonb;
  v_payment_methods JSONB := '[]'::jsonb;
  v_stock_summary JSONB := '{}'::jsonb;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  -- 1.1 30-Day Daily Sales Timeseries
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_date', s.order_date,
      'order_count', s.order_count,
      'revenue', s.revenue
    )
  ) INTO v_timeseries
  FROM (
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM-DD') AS order_date,
      COUNT(*)::INT AS order_count,
      COALESCE(SUM(total_amount), 0)::FLOAT AS revenue
    FROM public.orders
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY order_date ASC
  ) s;

  -- 1.2 Top Selling Products
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', t.product_id,
      'title', t.title,
      'units_sold', t.units_sold,
      'total_revenue', t.total_revenue
    )
  ) INTO v_top_products
  FROM (
    SELECT 
      oi.product_id,
      COALESCE(p.title, oi.product_id) AS title,
      COALESCE(SUM(oi.quantity), 0)::INT AS units_sold,
      COALESCE(SUM(oi.quantity * oi.unit_price), 0)::FLOAT AS total_revenue
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    GROUP BY oi.product_id, p.title
    ORDER BY units_sold DESC
    LIMIT 6
  ) t;

  -- 1.3 Payment Methods Ratio
  SELECT jsonb_agg(
    jsonb_build_object(
      'method', pm.payment_method,
      'order_count', pm.cnt,
      'total_amount', pm.amt
    )
  ) INTO v_payment_methods
  FROM (
    SELECT 
      COALESCE(payment_method, 'wallet') AS payment_method,
      COUNT(*)::INT AS cnt,
      COALESCE(SUM(total_amount), 0)::FLOAT AS amt
    FROM public.orders
    GROUP BY payment_method
  ) pm;

  -- 1.4 Stock Health Summary
  SELECT jsonb_build_object(
    'total_products', (SELECT COUNT(*) FROM public.products),
    'active_products', (SELECT COUNT(*) FROM public.products WHERE is_active = TRUE),
    'total_unsold_keys', (SELECT COUNT(*) FROM public.inventory_keys WHERE is_sold = FALSE),
    'total_sold_keys', (SELECT COUNT(*) FROM public.inventory_keys WHERE is_sold = TRUE)
  ) INTO v_stock_summary;

  RETURN jsonb_build_object(
    'success', true,
    'timeseries', COALESCE(v_timeseries, '[]'::jsonb),
    'top_products', COALESCE(v_top_products, '[]'::jsonb),
    'payment_methods', COALESCE(v_payment_methods, '[]'::jsonb),
    'stock_summary', v_stock_summary
  );
END;
$$;

-- 2. Product Management (Full CRUD)
CREATE OR REPLACE FUNCTION public.admin_manage_product(
  p_admin_secret TEXT,
  p_action TEXT,
  p_product JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
  v_prod_id TEXT;
  v_cat_id TEXT;
  v_title TEXT;
  v_price NUMERIC;
  v_orig_price NUMERIC;
  v_unit TEXT;
  v_min_qty INT;
  v_max_qty INT;
  v_step_qty INT;
  v_fulfillment TEXT;
  v_status TEXT;
  v_chips TEXT[];
  v_is_active BOOLEAN;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  v_prod_id := TRIM(p_product->>'id');

  IF p_action = 'create' THEN
    IF v_prod_id IS NULL OR LENGTH(v_prod_id) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_INPUT', 'message', 'กรุณาระบุรหัสสินค้า (Product ID)');
    END IF;

    -- ตรวจสอบว่ามี ID นี้อยู่แล้วหรือไม่
    IF EXISTS (SELECT 1 FROM public.products WHERE id = v_prod_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_ID', 'message', 'รหัสสินค้านี้มีอยู่ในระบบแล้ว');
    END IF;

    -- แปลง chips array
    SELECT ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_product->'chips', '[]'::jsonb))) INTO v_chips;

    INSERT INTO public.products (
      id, category_id, title, price, original_price, unit,
      min_quantity, max_quantity, step_quantity, fulfillment_type,
      status, chips, is_active
    ) VALUES (
      v_prod_id,
      COALESCE(p_product->>'category_id', 'cat-discord-nitro'),
      COALESCE(p_product->>'title', 'สินค้าใหม่'),
      COALESCE((p_product->>'price')::NUMERIC, 0.00),
      (p_product->>'original_price')::NUMERIC,
      COALESCE(p_product->>'unit', 'ชิ้น'),
      COALESCE((p_product->>'min_quantity')::INT, 1),
      COALESCE((p_product->>'max_quantity')::INT, 10),
      COALESCE((p_product->>'step_quantity')::INT, 1),
      COALESCE(p_product->>'fulfillment_type', 'instant_key'),
      COALESCE(p_product->>'status', 'ready'),
      v_chips,
      COALESCE((p_product->>'is_active')::BOOLEAN, TRUE)
    );

    RETURN jsonb_build_object('success', true, 'message', 'เพิ่มสินค้าใหม่เรียบร้อยแล้ว', 'product_id', v_prod_id);

  ELSIF p_action = 'update' THEN
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_prod_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'ไม่พบสินค้ารหัสนี้ในระบบ');
    END IF;

    SELECT ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_product->'chips', '[]'::jsonb))) INTO v_chips;

    UPDATE public.products SET
      category_id = COALESCE(p_product->>'category_id', category_id),
      title = COALESCE(p_product->>'title', title),
      price = COALESCE((p_product->>'price')::NUMERIC, price),
      original_price = (p_product->>'original_price')::NUMERIC,
      unit = COALESCE(p_product->>'unit', unit),
      min_quantity = COALESCE((p_product->>'min_quantity')::INT, min_quantity),
      max_quantity = COALESCE((p_product->>'max_quantity')::INT, max_quantity),
      step_quantity = COALESCE((p_product->>'step_quantity')::INT, step_quantity),
      fulfillment_type = COALESCE(p_product->>'fulfillment_type', fulfillment_type),
      status = COALESCE(p_product->>'status', status),
      chips = CASE WHEN p_product ? 'chips' THEN v_chips ELSE chips END,
      is_active = COALESCE((p_product->>'is_active')::BOOLEAN, is_active)
    WHERE id = v_prod_id;

    RETURN jsonb_build_object('success', true, 'message', 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว', 'product_id', v_prod_id);

  ELSIF p_action = 'toggle_active' THEN
    UPDATE public.products SET
      is_active = NOT is_active
    WHERE id = v_prod_id;

    RETURN jsonb_build_object('success', true, 'message', 'สลับสถานะสินค้าเรียบร้อยแล้ว', 'product_id', v_prod_id);

  ELSIF p_action = 'delete' THEN
    -- ลบสินค้า และลบคีย์ที่ยังไม่ขาย (คีย์ที่ขายแล้วจะติด order_items ไว้อ้างอิงประวัติ)
    DELETE FROM public.inventory_keys WHERE product_id = v_prod_id AND is_sold = FALSE;
    DELETE FROM public.products WHERE id = v_prod_id;

    RETURN jsonb_build_object('success', true, 'message', 'ลบสินค้าและคีย์คงเหลือออกจากระบบเรียบร้อยแล้ว');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ACTION', 'message', 'ไม่พบ Action ที่ระบุ');
  END IF;
END;
$$;

-- 3. Inventory Key Inspector & Manager
CREATE OR REPLACE FUNCTION public.admin_get_inventory_keys(
  p_admin_secret TEXT,
  p_product_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
  v_unsold JSONB := '[]'::jsonb;
  v_sold JSONB := '[]'::jsonb;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  SELECT jsonb_agg(t.item) INTO v_unsold
  FROM (
    SELECT jsonb_build_object(
      'id', ik.id,
      'credential_data', ik.credential_data,
      'created_at', ik.created_at
    ) AS item
    FROM public.inventory_keys ik
    WHERE ik.product_id = p_product_id AND ik.is_sold = FALSE
    ORDER BY ik.created_at DESC
  ) t;

  SELECT jsonb_agg(s.item) INTO v_sold
  FROM (
    SELECT jsonb_build_object(
      'id', ik.id,
      'credential_data', ik.credential_data,
      'order_id', ik.order_id,
      'sold_at', ik.sold_at
    ) AS item
    FROM public.inventory_keys ik
    WHERE ik.product_id = p_product_id AND ik.is_sold = TRUE
    ORDER BY ik.sold_at DESC
    LIMIT 20
  ) s;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'unsold_keys', COALESCE(v_unsold, '[]'::jsonb),
    'sold_keys', COALESCE(v_sold, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_inventory_key(
  p_admin_secret TEXT,
  p_key_id UUID
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

  -- ลบเฉพาะคีย์ที่ยังไม่ได้ขาย
  DELETE FROM public.inventory_keys 
  WHERE id = p_key_id AND is_sold = FALSE;

  RETURN jsonb_build_object('success', true, 'message', 'ลบคีย์ออกจากคลังเรียบร้อยแล้ว');
END;
$$;

-- 4. User & Customer Management Engine
CREATE OR REPLACE FUNCTION public.admin_get_users(p_admin_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
  v_users JSONB := '[]'::jsonb;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'discord_id', u.discord_id,
      'username', u.username,
      'avatar_url', u.avatar_url,
      'balance', u.balance,
      'role', u.role,
      'created_at', u.created_at,
      'order_count', u.order_count,
      'total_spent', u.total_spent,
      'is_blacklisted', u.is_blacklisted
    )
  ) INTO v_users
  FROM (
    SELECT 
      p.id,
      p.discord_id,
      COALESCE(p.username, 'Discord Member') AS username,
      p.avatar_url,
      p.balance::FLOAT AS balance,
      COALESCE(p.role, 'customer') AS role,
      p.created_at,
      COUNT(o.id)::INT AS order_count,
      COALESCE(SUM(o.total_amount), 0)::FLOAT AS total_spent,
      EXISTS(SELECT 1 FROM public.blacklists b WHERE b.target_value = p.discord_id OR b.target_value = p.id::TEXT) AS is_blacklisted
    FROM public.profiles p
    LEFT JOIN public.orders o ON o.user_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  ) u;

  RETURN jsonb_build_object(
    'success', true,
    'users', COALESCE(v_users, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_manage_user(
  p_admin_secret TEXT,
  p_action TEXT,
  p_user_id UUID,
  p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
  v_user_profile public.profiles%ROWTYPE;
  v_amount NUMERIC;
  v_new_balance NUMERIC;
  v_role TEXT;
  v_reason TEXT;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  SELECT * INTO v_user_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', 'ไม่พบผู้ใช้ในระบบ');
  END IF;

  IF p_action = 'adjust_balance' THEN
    v_amount := COALESCE((p_data->>'amount')::NUMERIC, 0.00);
    v_reason := COALESCE(p_data->>'reason', 'Admin adjustment');

    IF v_user_profile.balance + v_amount < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE', 'message', 'ยอดเงินในกระเป๋าไม่สามารถติดลบได้');
    END IF;

    UPDATE public.profiles 
    SET balance = balance + v_amount, updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- บันทึกธุรกรรมประวัติ
    IF v_amount > 0 THEN
      INSERT INTO public.topup_transactions (
        user_id, gateway, amount, bonus_amount, trans_ref, status
      ) VALUES (
        p_user_id,
        'admin_topup',
        v_amount,
        0,
        'ADJ-' || TO_CHAR(NOW(), 'YYMMDDHH24MISS'),
        'SUCCESS'
      );
    ELSE
      INSERT INTO public.system_audit_logs (
        event_type, severity, user_id, payload
      ) VALUES (
        'admin_balance_deduct',
        'INFO',
        p_user_id,
        jsonb_build_object('amount', v_amount, 'reason', v_reason)
      );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'ปรับยอดเงินเรียบร้อยแล้ว', 'new_balance', v_new_balance);

  ELSIF p_action = 'update_role' THEN
    v_role := p_data->>'role';
    IF v_role NOT IN ('admin', 'customer') THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_ROLE', 'message', 'บทบาทต้องเป็น admin หรือ customer');
    END IF;

    UPDATE public.profiles SET role = v_role, updated_at = NOW() WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'ปรับบทบาทผู้ใช้เป็น ' || v_role || ' เรียบร้อยแล้ว');

  ELSIF p_action = 'toggle_blacklist' THEN
    IF EXISTS (SELECT 1 FROM public.blacklists WHERE target_value = v_user_profile.discord_id OR target_value = p_user_id::TEXT) THEN
      DELETE FROM public.blacklists WHERE target_value = v_user_profile.discord_id OR target_value = p_user_id::TEXT;
      RETURN jsonb_build_object('success', true, 'message', 'ปลดแบนผู้ใช้เรียบร้อยแล้ว', 'is_blacklisted', false);
    ELSE
      INSERT INTO public.blacklists (target_type, target_value, reason)
      VALUES ('discord_id', COALESCE(v_user_profile.discord_id, p_user_id::TEXT), COALESCE(p_data->>'reason', 'Banned by admin'));
      RETURN jsonb_build_object('success', true, 'message', 'แบนผู้ใช้เข้าบัญชีดำเรียบร้อยแล้ว', 'is_blacklisted', true);
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ACTION', 'message', 'ไม่พบ Action ที่ระบุ');
  END IF;
END;
$$;

-- 5. GRANT EXECUTE ON ALL V3 FUNCTIONS
GRANT EXECUTE ON FUNCTION public.admin_get_analytics(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_product(TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_inventory_keys(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_inventory_key(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_users(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_user(TEXT, TEXT, UUID, JSONB) TO anon, authenticated, service_role;
`;

async function deploy() {
  console.log('🚀 Deploying NYX9 Enterprise V3.0 Procedures to Supabase PostgreSQL...');
  await client.connect();
  await client.query(sql);
  console.log('✅ ALL PROCEDURES & PERMISSIONS DEPLOYED 100%!');
  await client.end();
}

deploy().catch(err => {
  console.error('❌ DEPLOYMENT FAILED:', err);
  process.exit(1);
});
