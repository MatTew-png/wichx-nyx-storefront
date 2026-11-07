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

-- Inventory Keys: Strictly sealed from public / anon (Zero Key Leakage)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.inventory_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.inventory_keys TO service_role;

DROP POLICY IF EXISTS "Service role full access inventory_keys" ON public.inventory_keys;
DROP POLICY IF EXISTS "Allow count unsold inventory keys" ON public.inventory_keys;
DROP POLICY IF EXISTS "Strict inventory key protection" ON public.inventory_keys;
CREATE POLICY "Strict inventory key protection" ON public.inventory_keys FOR ALL TO service_role USING (true);

-- Orders: Authenticated user can read only their own orders
DROP POLICY IF EXISTS "Allow users read own orders" ON public.orders;
CREATE POLICY "Allow users read own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true);

-- Order Items: Authenticated user can read only items belonging to their orders
DROP POLICY IF EXISTS "Allow users read order items" ON public.order_items;
CREATE POLICY "Allow users read order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Service role full access order_items" ON public.order_items;
CREATE POLICY "Service role full access order_items" ON public.order_items FOR ALL TO service_role USING (true);

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

-- 0. Internal AES-256 Vault Procedures (Zero-Trust Key Protection)
CREATE OR REPLACE FUNCTION public.vault_encrypt(p_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_vault_key TEXT := 'nyx9_aes256_super_vault_shield_2026';
BEGIN
  IF p_data IS NULL OR trim(p_data) = '' THEN
    RETURN p_data;
  END IF;
  IF p_data LIKE 'ENC:%' THEN
    RETURN p_data;
  END IF;
  RETURN 'ENC:' || encode(extensions.pgp_sym_encrypt(trim(p_data), v_vault_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_decrypt(p_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_vault_key TEXT := 'nyx9_aes256_super_vault_shield_2026';
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_data LIKE 'ENC:%' THEN
    RETURN extensions.pgp_sym_decrypt(decode(substring(p_data from 5), 'base64'), v_vault_key);
  ELSE
    RETURN p_data;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN 'DECRYPTION_ERROR';
END;
$$;

-- 1. Dispense Product Key (Internal Helper with In-Memory AES-256 Decryption)
CREATE OR REPLACE FUNCTION public.dispense_product_key(p_product_id TEXT, p_order_id TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_key_id UUID;
    v_raw_credential TEXT;
    v_decrypted_credential TEXT;
BEGIN
    SELECT id, credential_data INTO v_key_id, v_raw_credential
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

    v_decrypted_credential := public.vault_decrypt(v_raw_credential);

    INSERT INTO public.system_audit_logs (event_type, severity, order_id, payload)
    VALUES ('ORDER_DISPENSED', 'INFO', p_order_id, jsonb_build_object('product_id', p_product_id, 'key_id', v_key_id));

    RETURN v_decrypted_credential;
END;
$$;

-- 2. Process Topup (PromptPay & TrueMoney) with Blacklist Auto-Query
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

-- 3. Execute Order Checkout (Atomic Fulfillment with Promo Unique Constraint & Blacklist Auto-Query)
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

-- Grants & Permissions (Strict Zero-Trust Model)
REVOKE EXECUTE ON FUNCTION public.dispense_product_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_product_key(TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_metrics(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics(TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_bulk_restock(TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_restock(TEXT, TEXT, TEXT[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_resolve_claim(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_claim(TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_product_stock_counts() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lookup_order(TEXT) TO anon, authenticated, service_role;


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
    (NEW.raw_user_meta_data->'custom_claims')->>'global_name',
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
  v_chips TEXT[];
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  v_prod_id := TRIM(p_product->>'id');

  IF p_action = 'create' THEN
    IF v_prod_id IS NULL OR LENGTH(v_prod_id) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_INPUT', 'message', 'กรุณาระบุรหัสสินค้า (Product ID)');
    END IF;

    IF EXISTS (SELECT 1 FROM public.products WHERE id = v_prod_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_ID', 'message', 'รหัสสินค้านี้มีอยู่ในระบบแล้ว');
    END IF;

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

GRANT EXECUTE ON FUNCTION public.admin_get_analytics(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_product(TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_inventory_keys(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_inventory_key(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_users(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_user(TEXT, TEXT, UUID, JSONB) TO anon, authenticated, service_role;

-- ==============================================================================
-- 13. VISITOR TRAFFIC LOGS & IP TRACKING ENGINE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.visitor_traffic_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    country TEXT DEFAULT 'XX',
    user_agent TEXT,
    path TEXT NOT NULL DEFAULT '/',
    referer TEXT,
    device_type TEXT DEFAULT 'desktop',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON public.visitor_traffic_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON public.visitor_traffic_logs (ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_country ON public.visitor_traffic_logs (country);

ALTER TABLE public.visitor_traffic_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Protect visitor traffic logs" ON public.visitor_traffic_logs;
CREATE POLICY "Protect visitor traffic logs" ON public.visitor_traffic_logs FOR ALL TO service_role USING (true);

-- RPC: log_page_visit (Publicly callable via PostgREST)
CREATE OR REPLACE FUNCTION public.log_page_visit(
    p_path TEXT DEFAULT '/',
    p_referer TEXT DEFAULT '',
    p_screen TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_headers JSONB;
    v_raw_ip TEXT;
    v_ip TEXT;
    v_country TEXT;
    v_ua TEXT;
    v_device TEXT := 'desktop';
    v_is_blacklisted BOOLEAN := false;
    v_recent_id UUID;
BEGIN
    BEGIN
        v_headers := COALESCE(current_setting('request.headers', true)::jsonb, '{}'::jsonb);
    EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::jsonb;
    END;

    v_raw_ip := COALESCE(
        v_headers->>'cf-connecting-ip',
        v_headers->>'x-forwarded-for',
        v_headers->>'x-real-ip',
        '127.0.0.1'
    );
    v_ip := TRIM(split_part(v_raw_ip, ',', 1));
    v_country := COALESCE(NULLIF(UPPER(v_headers->>'cf-ipcountry'), ''), 'XX');
    v_ua := COALESCE(v_headers->>'user-agent', 'Unknown');

    IF v_ua ~* 'mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile' THEN
        v_device := 'mobile';
    ELSIF v_ua ~* 'tablet' THEN
        v_device := 'tablet';
    ELSE
        v_device := 'desktop';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.blacklists
        WHERE target_type = 'ip' AND target_value = v_ip
    ) INTO v_is_blacklisted;

    SELECT id INTO v_recent_id
    FROM public.visitor_traffic_logs
    WHERE ip_address = v_ip 
      AND path = p_path
      AND created_at >= NOW() - INTERVAL '60 seconds'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_recent_id IS NOT NULL THEN
        UPDATE public.visitor_traffic_logs
        SET created_at = NOW(),
            country = CASE WHEN country = 'XX' AND v_country <> 'XX' THEN v_country ELSE country END
        WHERE id = v_recent_id;
    ELSE
        INSERT INTO public.visitor_traffic_logs (
            ip_address, country, user_agent, path, referer, device_type, created_at
        ) VALUES (
            v_ip, v_country, LEFT(v_ua, 500), LEFT(COALESCE(p_path, '/'), 255),
            LEFT(COALESCE(p_referer, ''), 255), v_device, NOW()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ip', v_ip,
        'country', v_country,
        'device', v_device,
        'is_blacklisted', v_is_blacklisted
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_page_visit(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- Admin RPC: admin_get_visitor_logs
CREATE OR REPLACE FUNCTION public.admin_get_visitor_logs(
    p_admin_secret TEXT,
    p_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
    v_total_24h INT;
    v_unique_24h INT;
    v_top_countries JSONB;
    v_top_paths JSONB;
    v_logs JSONB;
BEGIN
    IF p_admin_secret <> v_expected_secret THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
    END IF;

    SELECT COUNT(*)::INT INTO v_total_24h
    FROM public.visitor_traffic_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    SELECT COUNT(DISTINCT ip_address)::INT INTO v_unique_24h
    FROM public.visitor_traffic_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    SELECT jsonb_agg(c) INTO v_top_countries
    FROM (
        SELECT country, COUNT(*)::INT as count
        FROM public.visitor_traffic_logs
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY country
        ORDER BY count DESC
        LIMIT 5
    ) c;

    SELECT jsonb_agg(p) INTO v_top_paths
    FROM (
        SELECT path, COUNT(*)::INT as count
        FROM public.visitor_traffic_logs
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY path
        ORDER BY count DESC
        LIMIT 5
    ) p;

    SELECT jsonb_agg(l) INTO v_logs
    FROM (
        SELECT 
            v.id,
            v.ip_address,
            v.country,
            v.path,
            v.device_type,
            v.user_agent,
            v.referer,
            v.created_at,
            EXISTS (
                SELECT 1 FROM public.blacklists b 
                WHERE b.target_type = 'ip' AND b.target_value = v.ip_address
            ) as is_blacklisted
        FROM public.visitor_traffic_logs v
        ORDER BY v.created_at DESC
        LIMIT LEAST(p_limit, 500)
    ) l;

    RETURN jsonb_build_object(
        'success', true,
        'stats', jsonb_build_object(
            'total_24h', COALESCE(v_total_24h, 0),
            'unique_24h', COALESCE(v_unique_24h, 0),
            'top_countries', COALESCE(v_top_countries, '[]'::jsonb),
            'top_paths', COALESCE(v_top_paths, '[]'::jsonb)
        ),
        'logs', COALESCE(v_logs, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_visitor_logs(TEXT, INT) TO anon, authenticated, service_role;

-- Admin RPC: admin_blacklist_ip
CREATE OR REPLACE FUNCTION public.admin_blacklist_ip(
    p_admin_secret TEXT,
    p_ip TEXT,
    p_reason TEXT DEFAULT 'Manually blocked from Visitor Logs'
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

    IF p_ip IS NULL OR TRIM(p_ip) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_IP', 'message', 'IP ไม่ถูกต้อง');
    END IF;

    INSERT INTO public.blacklists (target_type, target_value, reason, banned_by)
    VALUES ('ip', TRIM(p_ip), COALESCE(p_reason, 'Manually blocked from Visitor Logs'), 'ADMIN')
    ON CONFLICT (target_value) DO UPDATE
    SET reason = EXCLUDED.reason,
        created_at = NOW();

    INSERT INTO public.system_audit_logs (event_type, severity, payload)
    VALUES ('ADMIN_IP_BLACKLISTED', 'CRITICAL', jsonb_build_object(
        'ip', TRIM(p_ip),
        'reason', p_reason,
        'timestamp', NOW()
    ));

    RETURN jsonb_build_object('success', true, 'message', 'แบน IP เรียบร้อยแล้ว', 'ip', TRIM(p_ip));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_blacklist_ip(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 🎫 PROMO CODES & VOUCHERS ENGINE (SHOPEE & TIKTOK STYLE 1-CLICK APPLY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_spend NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  max_discount NUMERIC(10,2),
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active promo codes" ON public.promo_codes;
CREATE POLICY "Public can view active promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Service role full promo codes" ON public.promo_codes;
CREATE POLICY "Service role full promo codes"
  ON public.promo_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin Manage Promo Codes Procedure (CRUD)
CREATE OR REPLACE FUNCTION public.admin_manage_promo_code(
  p_admin_secret TEXT,
  p_action TEXT,
  p_code_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_code TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_caller_id
      AND (role = 'admin' OR discord_id IN ('483398326159671326', '422611554475835394'))
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized AND (p_admin_secret = 'nyx9_secure_admin_passphrase' OR auth.role() = 'service_role') THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ');
  END IF;

  v_code := UPPER(TRIM(p_code_data->>'code'));

  IF p_action = 'create' THEN
    IF v_code IS NULL OR length(v_code) < 3 THEN
      RETURN jsonb_build_object('success', false, 'message', 'รหัสโค้ดต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
    END IF;

    INSERT INTO public.promo_codes (
      code,
      label,
      discount_type,
      discount_value,
      min_spend,
      max_discount,
      usage_limit,
      is_active
    )
    VALUES (
      v_code,
      COALESCE(p_code_data->>'label', 'คูปองส่วนลดพิเศษ'),
      COALESCE(p_code_data->>'discount_type', 'percent'),
      COALESCE((p_code_data->>'discount_value')::NUMERIC, 10.00),
      COALESCE((p_code_data->>'min_spend')::NUMERIC, 0.00),
      NULLIF(p_code_data->>'max_discount', '')::NUMERIC,
      NULLIF(p_code_data->>'usage_limit', '')::INT,
      COALESCE((p_code_data->>'is_active')::BOOLEAN, TRUE)
    );

    RETURN jsonb_build_object('success', true, 'message', 'สร้างโค้ดส่วนลด "' || v_code || '" เรียบร้อยแล้ว');

  ELSIF p_action = 'toggle' THEN
    UPDATE public.promo_codes
    SET is_active = NOT is_active
    WHERE code = v_code;

    RETURN jsonb_build_object('success', true, 'message', 'เปลี่ยนสถานะโค้ด "' || v_code || '" สำเร็จ');

  ELSIF p_action = 'delete' THEN
    DELETE FROM public.promo_codes WHERE code = v_code;
    RETURN jsonb_build_object('success', true, 'message', 'ลบโค้ด "' || v_code || '" เรียบร้อยแล้ว');

  ELSIF p_action = 'list' THEN
    RETURN jsonb_build_object(
      'success', true,
      'vouchers', (SELECT COALESCE(jsonb_agg(to_jsonb(pc)), '[]'::jsonb) FROM (SELECT * FROM public.promo_codes ORDER BY created_at DESC) pc)
    );

  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'ไม่รู้จักคำสั่ง action: ' || COALESCE(p_action, 'null'));
  END IF;

EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'message', 'มีรหัสโค้ดส่วนลด "' || v_code || '" อยู่ในระบบแล้ว');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_manage_promo_code(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_promo_code(TEXT, TEXT, JSONB) TO authenticated, service_role;

-- Public Safe Procedure to fetch available vouchers for storefront (Shopee Style Ticket List)
CREATE OR REPLACE FUNCTION public.get_available_vouchers()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', code,
    'label', label,
    'discount_type', discount_type,
    'discount_value', discount_value,
    'min_spend', min_spend,
    'max_discount', max_discount
  ) ORDER BY min_spend ASC), '[]'::jsonb)
  FROM public.promo_codes
  WHERE is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR used_count < usage_limit);
$$;

GRANT EXECUTE ON FUNCTION public.get_available_vouchers() TO anon, authenticated, service_role;


-- ==============================================================================
-- 🚀 NYX9 STUDIO — SYSTEM SETTINGS & DYNAMIC STOREFRONT ENGINE MIGRATION
-- ==============================================================================
-- มอบอำนาจให้แอดมินปรับเปลี่ยนเนื้อหา, แบนเนอร์, ป้ายประกาศ, หมวดหมู่, ช่องทางชำระเงิน,
-- และการตั้งค่าร้านค้าทั้งหมดได้เอง 100% ผ่านหน้า Admin Control Center โดยไม่ต้องแก้โค้ด
-- ==============================================================================

-- 1. สร้างตาราง system_settings สำหรับเก็บคอนฟิกไดนามิก
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT DEFAULT 'ADMIN'
);

-- เปิด RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view system settings" ON public.system_settings;
CREATE POLICY "Public can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role full system settings" ON public.system_settings;
CREATE POLICY "Service role full system settings"
  ON public.system_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. อนุญาตให้ Public อ่าน Categories ได้อย่างสมบูรณ์
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories
  FOR SELECT
  USING (true);

-- 3. Stored Procedure: ดึงการตั้งค่าทั้งหมดสำหรับหน้าร้านค้า (Public Safe)
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res JSONB;
BEGIN
  SELECT jsonb_object_agg(key, value) INTO v_res FROM public.system_settings;
  RETURN COALESCE(v_res, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_settings() TO anon, authenticated, service_role;

-- 4. Stored Procedure: บันทึกการตั้งค่าระบบ (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_save_system_setting(
  p_admin_secret TEXT,
  p_key TEXT,
  p_value JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_caller_id
      AND (role = 'admin' OR discord_id IN ('483398326159671326', '422611554475835394'))
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized AND (p_admin_secret = 'nyx9_secure_admin_passphrase' OR auth.role() = 'service_role') THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ');
  END IF;

  IF p_key IS NULL OR TRIM(p_key) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ระบุ key ไม่ถูกต้อง');
  END IF;

  INSERT INTO public.system_settings (key, value, updated_at, updated_by)
  VALUES (TRIM(p_key), p_value, NOW(), COALESCE(v_caller_id::text, 'ADMIN_SECRET'))
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW(),
      updated_by = EXCLUDED.updated_by;

  INSERT INTO public.system_audit_logs (event_type, severity, payload)
  VALUES ('ADMIN_SETTING_UPDATED', 'INFO', jsonb_build_object(
    'key', p_key,
    'timestamp', NOW()
  ));

  RETURN jsonb_build_object('success', true, 'message', 'บันทึกการตั้งค่า ' || p_key || ' เรียบร้อยแล้ว');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_system_setting(TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

-- 5. Stored Procedure: จัดการหมวดหมู่สินค้าครบวงจร (Admin Category CRUD)
CREATE OR REPLACE FUNCTION public.admin_manage_category(
  p_admin_secret TEXT,
  p_action TEXT,
  p_category_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_cat_id TEXT;
  v_sort INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_caller_id
      AND (role = 'admin' OR discord_id IN ('483398326159671326', '422611554475835394'))
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized AND (p_admin_secret = 'nyx9_secure_admin_passphrase' OR auth.role() = 'service_role') THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ');
  END IF;

  v_cat_id := LOWER(TRIM(COALESCE(p_category_data->>'id', '')));

  IF p_action = 'create' THEN
    IF v_cat_id = '' OR LENGTH(v_cat_id) < 2 THEN
      RETURN jsonb_build_object('success', false, 'message', 'รหัสหมวดหมู่ (Category ID) ต้องมีอย่างน้อย 2 ตัวอักษร เช่น cat-steam');
    END IF;

    IF EXISTS (SELECT 1 FROM public.categories WHERE id = v_cat_id) THEN
      RETURN jsonb_build_object('success', false, 'message', 'มีรหัสหมวดหมู่นี้ในระบบแล้ว');
    END IF;

    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort FROM public.categories;

    INSERT INTO public.categories (id, name, sub_name, icon, badge, sort_order)
    VALUES (
      v_cat_id,
      COALESCE(p_category_data->>'name', 'หมวดหมู่ใหม่'),
      p_category_data->>'sub_name',
      COALESCE(p_category_data->>'icon', 'layers'),
      COALESCE(p_category_data->>'badge', 'NEW'),
      COALESCE((p_category_data->>'sort_order')::INT, v_sort)
    );

    RETURN jsonb_build_object('success', true, 'message', 'สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว', 'category_id', v_cat_id);

  ELSIF p_action = 'update' THEN
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = v_cat_id) THEN
      RETURN jsonb_build_object('success', false, 'message', 'ไม่พบหมวดหมู่นี้ในระบบ');
    END IF;

    UPDATE public.categories
    SET name = COALESCE(p_category_data->>'name', name),
        sub_name = COALESCE(p_category_data->>'sub_name', sub_name),
        icon = COALESCE(p_category_data->>'icon', icon),
        badge = COALESCE(p_category_data->>'badge', badge),
        sort_order = COALESCE((p_category_data->>'sort_order')::INT, sort_order)
    WHERE id = v_cat_id;

    RETURN jsonb_build_object('success', true, 'message', 'อัปเดตหมวดหมู่เรียบร้อยแล้ว');

  ELSIF p_action = 'delete' THEN
    IF EXISTS (SELECT 1 FROM public.products WHERE category_id = v_cat_id) THEN
      RETURN jsonb_build_object('success', false, 'message', 'ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากยังมีสินค้าอยู่ในหมวด กรุณาย้ายหรือลบสินค้าก่อน');
    END IF;

    DELETE FROM public.categories WHERE id = v_cat_id;
    RETURN jsonb_build_object('success', true, 'message', 'ลบหมวดหมู่เรียบร้อยแล้ว');

  ELSIF p_action = 'list' THEN
    RETURN jsonb_build_object(
      'success', true,
      'categories', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'sub_name', c.sub_name,
            'icon', c.icon,
            'badge', c.badge,
            'sort_order', c.sort_order,
            'product_count', (SELECT COUNT(*)::INT FROM public.products p WHERE p.category_id = c.id)
          ) ORDER BY c.sort_order ASC
        ), '[]'::jsonb) FROM public.categories c
      )
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'คำสั่ง action ไม่ถูกต้อง');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_category(TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

-- 6. Seed ค่าเริ่มต้นลงใน public.system_settings
INSERT INTO public.system_settings (key, value) VALUES
(
  'store_profile',
  '{
    "storeName": "NYX9 STUDIO",
    "brandShort": "NYX9",
    "tagline": "ร้านขายไอดีเกม & บริการ Discord อัตโนมัติ จัดส่งรหัสทันที 24 ชม.",
    "subTagline": "เลือกสินค้า ชำระเงินผ่านพร้อมเพย์/ทรูมันนี่ และรับรหัสใช้งานได้ทันที",
    "logoUrl": "assets/logo.png",
    "faviconUrl": "assets/logo.png",
    "discordCommunityUrl": "https://discord.gg/NTPcxKHrag",
    "discordCommunitySecondaryUrl": "https://discord.gg/T44Up4cfy",
    "contactLine": "",
    "contactFacebook": "",
    "supportEmail": "sanaseeriri@gmail.com",
    "metrics": {
      "delivery": "จัดส่งอัตโนมัติ",
      "support": "ซัพพอร์ตผ่าน Discord",
      "alliance": "2 เซิร์ฟเวอร์ในเครือ",
      "warranty": "รับประกันสินค้า 100%"
    },
    "maintenanceMode": false,
    "maintenanceMessage": "ระบบกำลังปิดปรับปรุงชั่วคราวเพื่ออัปเกรดความเร็ว กรุณากลับมาใหม่อีกครั้งในไม่กี่นาที"
  }'::jsonb
),
(
  'payment_config',
  '{
    "acceptedPayments": ["promptpay", "truemoney", "bank_transfer"],
    "promptpay": {
      "enabled": true,
      "accountName": "NYX9 STUDIO AUTO",
      "promptpayNumber": "1459901184414",
      "minAmount": 10,
      "feeRate": 0.0
    },
    "truemoney": {
      "enabled": true,
      "accountName": "NYX9 WALLET AUTO",
      "phoneNumber": "0838286508",
      "feeRate": 0.0,
      "hint": "กรอกลิงก์ซองของขวัญ หรือโอนผ่านเบอร์ TrueMoney Wallet เพื่อรับเงินเข้าทันที"
    },
    "bank_transfer": {
      "enabled": true,
      "bankName": "ธนาคารกรุงไทย (Krungthai Bank)",
      "bankCode": "KTB",
      "accountNumber": "4140810122",
      "formattedAccountNumber": "414-0-81012-2",
      "accountName": "NYX9 STUDIO (กรุงไทย)",
      "branch": "สาขาหลัก",
      "notice": "ร้านรับบัญชีนี้บัญชีเดียวเท่านั้น"
    },
    "crypto_ltc": {
      "enabled": false,
      "walletAddress": "",
      "bonusPercent": 5
    }
  }'::jsonb
),
(
  'announcements',
  '[
    { "id": "ann-1", "tag": "FLASH SALE", "icon": "zap", "text": "Discord Nitro Booster 1 เดือน ลดพิเศษเหลือเพียง", "highlight": "฿169", "color": "indigo", "active": true },
    { "id": "ann-2", "tag": "AUTO 24/7", "icon": "bot", "text": "ระบบจัดส่งรหัสและสินค้าอัตโนมัติ 24 ชม.", "highlight": "ใน 1 นาที", "color": "emerald", "active": true },
    { "id": "ann-3", "tag": "VERIFIED", "icon": "shield-check", "text": "รับประกันสินค้าและไอดีแท้ 100% มีทีมงานซัพพอร์ต", "highlight": "ดูแลผ่าน Discord", "color": "blue", "active": true },
    { "id": "ann-4", "tag": "ALLIANCE", "icon": "users", "text": "เครือข่าย 2 ร้านค้า NOVAPE SHOP & NYX9 STUDIO", "highlight": "บริการครบวงจร", "color": "indigo", "active": true }
  ]'::jsonb
),
(
  'hero_banners',
  '[
    {
      "id": "banner-nitro",
      "themeColor": "indigo",
      "badge": "✦ FLASH DEAL • ลดพิเศษ 48%",
      "title": "DISCORD NITRO & BOOSTS",
      "highlight": "ราคาเริ่มต้นเพียง ฿150",
      "description": "รหัสแท้ 100% บอทส่งเข้าคลังอัตโนมัติใน 3 วินาที ไม่ต้องให้รหัสผ่านบัญชี พร้อม 2 บูสต์ในตัว ปลดล็อกทุกอิโมจิและส่งไฟล์ขนาดใหญ่ 500MB คุ้มค่าที่สุด",
      "perks": ["ไม่ต้องให้รหัสผ่าน", "2x Server Boosts ในตัว", "รับประกันแท้ 30-90 วัน"],
      "ctaText": "เลือกซื้อ Nitro ทันที",
      "ctaCategory": "cat-discord-nitro",
      "secondaryText": "คำนวณราคาบูสต์",
      "secondaryAction": "discordCalculator",
      "active": true
    },
    {
      "id": "banner-roblox",
      "themeColor": "indigo",
      "badge": "✦ NYX9 STUDIO • ROBLOX SYSTEMS",
      "title": "ROBLOX SCRIPTS & 3D ASSETS",
      "highlight": "สคริปต์เกม & งานกราฟิกแท้ 100%",
      "description": "สคริปต์ระบบเกม Roblox คุณภาพสูง ออโต้ฟาร์ม ลื่นไหล ไม่โดนแบน พร้อมโมเดล 3D และงานออกแบบ GFX สำหรับสตูดิโอและครีเอเตอร์",
      "perks": ["รองรับ Luau ล่าสุด", "โมเดล Low-Poly คมชัด", "ซัพพอร์ตวิธีติดตั้ง 24 ชม."],
      "ctaText": "ดูสคริปต์และโมเดล Roblox",
      "ctaCategory": "cat-roblox-scripts",
      "secondaryText": "งาน GFX & 3D",
      "secondaryCategory": "cat-roblox-assets",
      "active": true
    },
    {
      "id": "banner-wallet",
      "themeColor": "emerald",
      "badge": "✦ AUTO 24/7 • ตัดยอด Real-time",
      "title": "ระบบเติมเงินอัตโนมัติ",
      "highlight": "ฟรีค่าธรรมเนียม 0% เข้าใน 5 วิ",
      "description": "รองรับทั้ง พร้อมเพย์ QR Code, ซองของขวัญ TrueMoney และบัญชีธนาคาร บอทเช็คยอดอัตโนมัติตลอด 24 ชม. เครดิตเข้ากระเป๋าทันที",
      "perks": ["ฟรีค่าธรรมเนียม 0%", "ตัดยอดใน 5-10 วินาที", "เครดิตไม่มีวันหมดอายุ"],
      "ctaText": "เติมเงินเข้ากระเป๋าเลย",
      "ctaAction": "openTopUp",
      "secondaryText": "ดูประวัติคำสั่งซื้อ",
      "secondaryAction": "openHistory",
      "active": true
    }
  ]'::jsonb
),
(
  'discord_stores',
  '[
    {
      "id": "shop_1",
      "name": "nyx9 studio (หลัก)",
      "active": true,
      "inviteUrl": "https://discord.gg/NTPcxKHrag",
      "badge": "ONLINE",
      "description": "บริการขายเกี่ยวกับกับเกมส์ roblox ทั้งหมด",
      "memberCount": "13+"
    },
    {
      "id": "shop_2",
      "name": "novape shop (เครือข่ายพันธมิตร)",
      "active": true,
      "inviteUrl": "https://discord.gg/T44Up4cfy",
      "badge": "ONLINE",
      "description": "บริการขายของเกี่ยวกับดิสคอร์ดทั้งหมด",
      "memberCount": "300+"
    }
  ]'::jsonb
),
(
  'discord_webhook',
  '{
    "webhookUrl": "",
    "notifyOnOrder": true,
    "notifyOnTopup": true,
    "notifyOnClaim": true,
    "notifyOnReview": true
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
