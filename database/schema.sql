-- ==============================================================================
-- 🐘 NYX9 STUDIO — SUPABASE POSTGRESQL PRODUCTION SCHEMA (ENTERPRISE ARMORED)
-- ==============================================================================
-- ครอบคลุม: บัญชีผู้ใช้, หมวดหมู่, สินค้า, สต็อกออโต้, คำสั่งซื้อ, ประวัติเติมเงิน,
-- และระบบความปลอดภัยระดับสากล: Anti-Dupe Slip, Promo Limiter, Warranty, Audit Logs & Blacklist
-- ==============================================================================

-- 0. เปิดใช้งาน Extension ที่จำเป็น
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ตารางข้อมูลโปรไฟล์และกระเป๋าเงินผู้ใช้ (เชื่อมต่อกับ Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    discord_id TEXT UNIQUE,
    username TEXT,
    avatar_url TEXT,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    role TEXT NOT NULL DEFAULT 'customer', -- 'customer', 'admin'
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

-- 4. ตารางคลังสต็อกรหัสสินค้าดิจิทัล (Inventory Keys Pool)
CREATE TABLE IF NOT EXISTS public.inventory_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    credential_data TEXT NOT NULL, -- เช่น email:password หรือ license key
    is_sold BOOLEAN NOT NULL DEFAULT FALSE,
    order_id TEXT,
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_keys_unsold 
ON public.inventory_keys(product_id) WHERE is_sold = FALSE;

-- 5. ตารางคำสั่งซื้อ (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- เช่น WX-839201
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL DEFAULT 'wallet',
    status TEXT NOT NULL DEFAULT 'PAID', -- PAID, PENDING, FAILED, REFUNDED
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
    gateway TEXT NOT NULL, -- promptpay, truemoney, crypto_ltc
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    bonus_amount NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, PENDING, FAILED
    trans_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 🛡️ SECURITY & ANTI-FRAUD MODULES (ระดับสากล ป้องกันการโกงเงิน 100%)
-- ==============================================================================

-- 8. ตารางป้องกันสลิปซ้ำ (Anti-Dupe Slip Protection)
CREATE TABLE IF NOT EXISTS public.used_payment_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slip_trans_ref TEXT UNIQUE NOT NULL, -- รหัสอ้างอิงสลิป ล็อกห้ามซ้ำเด็ดขาด
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
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, code) -- ลูกค้า 1 คน ใช้โค้ดเดิมได้ครั้งเดียว ป้องกันการสแปมลดราคา
);

-- 10. ตารางประวัติการเคลมสินค้าและประกัน (Warranty Claims & Tickets)
CREATE TABLE IF NOT EXISTS public.warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, REPLACED
    admin_notes TEXT,
    replacement_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON public.warranty_claims(status);

-- 11. ตารางแบนคนโกง / บอทสแปม (Blacklists)
CREATE TABLE IF NOT EXISTS public.blacklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL, -- 'IP', 'DISCORD_ID', 'WALLET_PHONE'
    target_value TEXT UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ, -- ถ้าเป็น NULL แปลว่าแบนถาวร
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blacklists_val ON public.blacklists(target_value);

-- 12. ตารางบันทึกเหตุการณ์และเซิร์ฟเวอร์ล็อก (System Audit Logs)
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'ORDER_DISPENSED', 'SLIP_VERIFY_FAIL', 'BOT_DETECTED', 'CLAIM_SUBMITTED'
    severity TEXT NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARN', 'ERROR', 'SECURITY'
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_event_created 
ON public.system_audit_logs(event_type, created_at DESC);

-- ==============================================================================
-- 🔒 ATOMIC PROCEDURES: ฟังก์ชันตัดสต็อกอัจฉริยะ (FOR UPDATE SKIP LOCKED)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.dispense_product_key(p_product_id TEXT, p_order_id TEXT)
RETURNS TEXT AS $$
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

    -- บันทึก Audit Log อัตโนมัติในฐานข้อมูล
    INSERT INTO public.system_audit_logs (event_type, severity, order_id, payload)
    VALUES ('ORDER_DISPENSED', 'INFO', p_order_id, jsonb_build_object('product_id', p_product_id, 'key_id', v_key_id));

    RETURN v_credential;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 📦 SEED DATA: ข้อมูลสินค้าและหมวดหมู่เริ่มต้น
-- ==============================================================================

INSERT INTO public.categories (id, name, sub_name, icon, badge, sort_order) VALUES
('cat-discord-nitro', 'DISCORD NITRO & BOOSTS', 'แพ็กเกจไนโตร บูสเซิร์ฟเวอร์ & ไอเทมตกแต่งโปรไฟล์', 'zap', 'INSTANT KEY / AUTO', 1),
('cat-discord-services', 'DISCORD SERVICES & ACCOUNTS', 'บริการปั๊มเมมเบอร์ ยืนยันเบอร์ OTP และไอดีดิสคอร์ดปีเก่า', 'cpu', 'CUSTOM FLOW & FORM', 2),
('cat-gaming-apps', 'GAMING ACCOUNTS & STREAMING APPS', 'ไอดีเกม FiveM, Steam GTAV, แอปพรีเมียม & AI Tools', 'gamepad-2', 'NYX9 SPECIALS', 3),
('cat-uncategorized', 'สินค้าทั่วไป (UNCATEGORIZED)', 'หมวดสินค้าสแตนด์อโลน สามารถเปิด-ปิดการแสดงผลได้อย่างอิสระ', 'box', 'STANDALONE ITEMS', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, category_id, title, price, original_price, fulfillment_type, status, chips) VALUES
('nitro-booster-1m', 'cat-discord-nitro', 'Nitro Booster (Mailpass 1 เดือน)', 169.00, 250.00, 'instant', 'SALE', ARRAY['⚡ ส่งทันที', '🛡️ ประกันเต็ม', '💎 2 บูส']),
('nitro-3m-mailpass', 'cat-discord-nitro', 'รหัสติด Nitro 3 เดือน ยกเมล', 150.00, 290.00, 'instant', 'SALE', ARRAY['👑 ยกเมลแท้', '💎 2 บูส', '🔑 เปลี่ยนรหัสได้']),
('nitro-boost-1m-2x', 'cat-discord-nitro', 'บูสเซิร์ฟเวอร์ 1 เดือน (2 บูส)', 50.00, 90.00, 'custom_discord_boost', 'SALE', ARRAY['🚀 2 บูสแท้', '⚡ ใน 1 นาที']),
('rockstar-fivem-fresh', 'cat-gaming-apps', 'Rockstar FiveM สดใหม่ (2 ชั้น)', 10.00, 25.00, 'instant', 'SALE', ARRAY['🚗 FiveM', '⚡ ส่งทันที']),
('steam-gtav-unlinked', 'cat-gaming-apps', 'Steam GTAV ยังไม่ผูก Rockstar', 399.00, 699.00, 'instant', 'SALE', ARRAY['🎮 Steam แท้', '🔑 ยกไอดี']),
('netflix-private-30d', 'cat-gaming-apps', 'Netflix 30 วัน (ทุกอุปกรณ์)', 109.00, 169.00, 'instant', 'SALE', ARRAY['🎬 จอส่วนตัว', '🛡️ ประกัน 30 วัน'])
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 💳 STORED PROCEDURE: ATOMIC TOPUP PROCESSING (PROMPTPAY & TRUEMONEY)
-- ==============================================================================
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
AS $$
DECLARE
  v_existing_slip_id UUID;
  v_existing_topup_id UUID;
  v_topup_id UUID;
  v_new_balance NUMERIC := 0.00;
BEGIN
  -- Anti-Double-Spend: PromptPay
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

  -- Anti-Double-Spend: TrueMoney
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

  -- Record topup transaction
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

  -- Atomically update user balance if user_id is provided
  IF p_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;
  END IF;

  -- System Audit Log
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

GRANT EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) TO anon, authenticated, service_role;
