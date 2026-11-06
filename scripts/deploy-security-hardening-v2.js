const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- ==============================================================================
-- 🛡️ SECURITY HARDENING V2: EXECUTABLE CONSTRAINTS & BLACKLIST QUERY
-- ==============================================================================

-- 1. Ensure Table Constraints
CREATE TABLE IF NOT EXISTS public.blacklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    target_value TEXT UNIQUE NOT NULL,
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promo_code_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, code)
);

-- 2. HARDENED process_topup WITH BLACKLIST AUTO-QUERY
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
  v_user_discord_id TEXT;
  v_client_ip TEXT;
  v_client_discord_id TEXT;
  v_blacklist_entry RECORD;
BEGIN
  -- Extract IP and discordId from raw payload if provided
  v_client_ip := NULLIF(TRIM(COALESCE(p_raw_payload->>'ip', p_raw_payload->>'ip_address', '')), '');
  v_client_discord_id := NULLIF(TRIM(COALESCE(p_raw_payload->>'discordId', p_raw_payload->>'discord_id', '')), '');

  -- Lookup profile discord_id if user_id is provided
  IF p_user_id IS NOT NULL THEN
    SELECT discord_id INTO v_user_discord_id
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  -- 0. AUTOMATED BLACKLIST AUTO-QUERY (Security Guard)
  SELECT target_type, target_value, reason INTO v_blacklist_entry
  FROM public.blacklists
  WHERE (expires_at IS NULL OR expires_at > NOW())
    AND (
      (p_user_id IS NOT NULL AND target_value = p_user_id::text)
      OR (v_user_discord_id IS NOT NULL AND target_value = v_user_discord_id)
      OR (v_client_discord_id IS NOT NULL AND target_value = v_client_discord_id)
      OR (v_client_ip IS NOT NULL AND target_value = v_client_ip)
    )
  LIMIT 1;

  IF v_blacklist_entry.target_value IS NOT NULL THEN
    -- Audit log the security rejection
    INSERT INTO public.system_audit_logs (
      event_type,
      severity,
      user_id,
      payload
    )
    VALUES (
      'BLACKLIST_BLOCKED_TOPUP',
      'CRITICAL',
      p_user_id,
      jsonb_build_object(
        'gateway', p_gateway,
        'trans_ref', p_trans_ref,
        'blocked_target', v_blacklist_entry.target_value,
        'target_type', v_blacklist_entry.target_type,
        'reason', v_blacklist_entry.reason,
        'client_ip', v_client_ip,
        'timestamp', NOW()
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'BLACKLISTED_USER',
      'message', 'บัญชีหรือไอพีของคุณถูกระงับการเติมเงินเนื่องจากติดแบล็กลิสต์: ' || COALESCE(v_blacklist_entry.reason, 'ระงับการให้บริการ')
    );
  END IF;

  -- 1. Anti-Double-Spend for PromptPay & Bank Transfer
  IF p_gateway IN ('promptpay', 'bank_transfer') THEN
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

  -- 2. Anti-Dupe for TrueMoney Gift Voucher
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

  -- 3. Anti-Dupe for Card Payment
  IF p_gateway = 'card_payment' THEN
    SELECT id INTO v_existing_topup_id
    FROM public.topup_transactions
    WHERE gateway = 'card_payment' AND trans_ref = p_trans_ref
    LIMIT 1;

    IF v_existing_topup_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_CARD_AUTH',
        'message', 'รายการชำระด้วยบัตรนี้ถูกประมวลผลไปแล้ว'
      );
    END IF;
  END IF;

  -- Record Topup
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

-- 3. HARDENED execute_order_checkout WITH PROMO CODE UNIQUE CONSTRAINT & BLACKLIST AUTO-QUERY
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
  v_user_discord_id TEXT;
  v_client_ip TEXT;
  v_client_discord_id TEXT;
  v_blacklist_entry RECORD;
  
  v_promo_code TEXT;
  v_client_discount NUMERIC := 0.00;
  v_verified_discount NUMERIC := 0.00;
  
  v_item JSONB;
  v_product_id TEXT;
  v_qty INT;
  v_real_unit_price NUMERIC;
  v_fulfillment_type TEXT;
  v_custom_data JSONB;
  v_dispensed_key TEXT;
  v_all_dispensed JSONB := '[]'::jsonb;
  v_item_credentials JSONB;
  v_calculated_subtotal NUMERIC := 0.00;
  v_final_total NUMERIC := 0.00;
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

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'ไม่พบข้อมูลผู้สั่งซื้อ (Missing User ID)'
    );
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_CART', 'message', 'ตะกร้าสินค้าว่างเปล่า');
  END IF;

  -- Extract client metadata (IP, Discord ID, Promo Code)
  v_client_ip := NULLIF(TRIM(COALESCE(p_customer_info->>'ip', p_customer_info->>'ip_address', '')), '');
  v_client_discord_id := NULLIF(TRIM(COALESCE(p_customer_info->>'discordId', p_customer_info->>'discord_id', '')), '');
  v_promo_code := NULLIF(UPPER(TRIM(COALESCE(p_customer_info->>'promoCode', p_customer_info->>'promo_code', p_customer_info->>'code', ''))), '');
  v_client_discount := COALESCE((p_customer_info->>'discountAmount')::NUMERIC, (p_customer_info->>'discount_amount')::NUMERIC, 0.00);

  -- Retrieve registered Discord ID from profiles table
  SELECT discord_id INTO v_user_discord_id
  FROM public.profiles
  WHERE id = v_target_user_id;

  -- ============================================================================
  -- 1. BLACKLIST AUTO-QUERY CHECK (Database-Level Access Rejection)
  -- ============================================================================
  SELECT target_type, target_value, reason INTO v_blacklist_entry
  FROM public.blacklists
  WHERE (expires_at IS NULL OR expires_at > NOW())
    AND (
      target_value = v_target_user_id::text
      OR (v_user_discord_id IS NOT NULL AND target_value = v_user_discord_id)
      OR (v_client_discord_id IS NOT NULL AND target_value = v_client_discord_id)
      OR (v_client_ip IS NOT NULL AND target_value = v_client_ip)
    )
  LIMIT 1;

  IF v_blacklist_entry.target_value IS NOT NULL THEN
    INSERT INTO public.system_audit_logs (event_type, severity, user_id, order_id, payload)
    VALUES (
      'BLACKLIST_BLOCKED_ORDER',
      'CRITICAL',
      v_target_user_id,
      p_order_id,
      jsonb_build_object(
        'blocked_target', v_blacklist_entry.target_value,
        'target_type', v_blacklist_entry.target_type,
        'reason', v_blacklist_entry.reason,
        'ip', v_client_ip
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'BLACKLISTED_USER',
      'message', 'บัญชีหรือ IP ของคุณถูกระงับการสั่งซื้อเนื่องจากติดแบล็กลิสต์: ' || COALESCE(v_blacklist_entry.reason, 'ระงับการให้บริการ')
    );
  END IF;

  -- ============================================================================
  -- 2. PRE-CHECK PROMO CODE USAGE (1 Person / 1 Use Enforced via Constraint)
  -- ============================================================================
  IF v_promo_code IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.promo_code_usages
      WHERE user_id = v_target_user_id AND code = v_promo_code
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'PROMO_CODE_ALREADY_USED',
        'message', 'คุณเคยใช้โค้ดส่วนลด "' || v_promo_code || '" ไปแล้ว ไม่สามารถใช้งานซ้ำได้ (จำกัด 1 คน/1 ครั้ง)'
      );
    END IF;
  END IF;

  -- ============================================================================
  -- 3. SERVER-SIDE PRICE RE-VERIFICATION & CALCULATION (Zero-Trust)
  -- ============================================================================
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

    v_calculated_subtotal := v_calculated_subtotal + (v_real_unit_price * v_qty);
  END LOOP;

  -- Calculate Promo Discount Server-Side
  IF v_promo_code IS NOT NULL THEN
    IF v_promo_code = 'NYX9VIP' AND v_calculated_subtotal >= 100 THEN
      v_verified_discount := ROUND(v_calculated_subtotal * 0.10, 2);
    ELSIF v_promo_code = 'NYX50' AND v_calculated_subtotal >= 300 THEN
      v_verified_discount := 50.00;
    ELSIF v_promo_code = 'CYBERVIP' AND v_calculated_subtotal >= 500 THEN
      v_verified_discount := ROUND(v_calculated_subtotal * 0.15, 2);
    ELSE
      -- Fallback to client discount capped at subtotal
      v_verified_discount := LEAST(v_client_discount, v_calculated_subtotal);
    END IF;
  END IF;

  v_final_total := GREATEST(0.00, v_calculated_subtotal - v_verified_discount);

  -- ============================================================================
  -- 4. DEDUCT WALLET BALANCE WITH ATOMIC ROW LOCK
  -- ============================================================================
  SELECT balance INTO v_current_balance
  FROM public.profiles
  WHERE id = v_target_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < v_final_total THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_BALANCE',
      'message', 'ยอดเงินในกระเป๋าไม่เพียงพอ (ยอดที่ต้องชำระ ฿' || v_final_total || ' ยอดคงเหลือ ฿' || COALESCE(v_current_balance, 0) || ')',
      'current_balance', COALESCE(v_current_balance, 0),
      'required_amount', v_final_total
    );
  END IF;

  UPDATE public.profiles
  SET balance = balance - v_final_total,
      updated_at = NOW()
  WHERE id = v_target_user_id
  RETURNING balance INTO v_new_balance;

  -- ============================================================================
  -- 5. CREATE ORDER RECORD
  -- ============================================================================
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
    v_final_total,
    'wallet',
    'PAID',
    NOW()
  );

  -- ============================================================================
  -- 6. RECORD PROMO CODE USAGE (Guarded by UNIQUE(user_id, code) Constraint)
  -- ============================================================================
  IF v_promo_code IS NOT NULL THEN
    INSERT INTO public.promo_code_usages (
      user_id,
      code,
      order_id,
      discount_amount,
      used_at
    )
    VALUES (
      v_target_user_id,
      v_promo_code,
      p_order_id,
      v_verified_discount,
      NOW()
    );
  END IF;

  -- ============================================================================
  -- 7. ATOMIC INVENTORY DISPENSE & ORDER ITEMS
  -- ============================================================================
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

  -- ============================================================================
  -- 8. SYSTEM AUDIT LOG
  -- ============================================================================
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
      'subtotal', v_calculated_subtotal,
      'discount', v_verified_discount,
      'total_amount', v_final_total,
      'promo_code', v_promo_code,
      'items_count', jsonb_array_length(p_items),
      'ip', v_client_ip
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_amount', v_final_total,
    'discount_amount', v_verified_discount,
    'promo_code', v_promo_code,
    'new_balance', v_new_balance,
    'dispensed_items', v_all_dispensed
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PROMO_CODE_ALREADY_USED',
      'message', 'คุณเคยใช้โค้ดส่วนลดนี้ไปแล้ว ไม่สามารถใช้งานซ้ำได้ (Unique Constraint Violation)'
    );
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

GRANT EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) FROM anon;
`;

async function deploy() {
  console.log('Connecting to PostgreSQL to deploy Security Hardening V2...');
  await client.connect();
  console.log('Executing SQL migration...');
  await client.query(sql);
  console.log('✅ Security Hardening V2 deployed successfully!');
  await client.end();
}

deploy().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
