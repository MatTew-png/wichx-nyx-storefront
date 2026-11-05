-- ==============================================================================
-- 🐘 NYX9 STUDIO — SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- ==============================================================================
-- คัดลอกสคริปต์นี้ไปวางในเมนู SQL Editor บน https://supabase.com/ แล้วกด RUN
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

-- ดัชนีความเร็วสูงสำหรับดึงคีย์ว่าง (High-Performance Index)
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
    delivered_content TEXT, -- ข้อมูลรหัสที่ส่งมอบ
    custom_data JSONB, -- ลิงก์ Discord, เบอร์โทร, Discord User ID
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
-- 🔒 ATOMIC PROCEDURES: ป้องกันสต็อกซ้ำ & แย่งซื้อพร้อมกัน (Anti-Race Condition)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.dispense_product_key(p_product_id TEXT, p_order_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_key_id UUID;
    v_credential TEXT;
BEGIN
    -- ล็อกแถวที่ยังไม่ถูกขาย และข้ามแถวที่ติดล็อกอยู่ทันที
    SELECT id, credential_data INTO v_key_id, v_credential
    FROM public.inventory_keys
    WHERE product_id = p_product_id AND is_sold = FALSE
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_key_id IS NULL THEN
        RAISE EXCEPTION 'OUT_OF_STOCK';
    END IF;

    -- ตัดสต็อกทันทีใน Transaction เดียวกัน
    UPDATE public.inventory_keys
    SET is_sold = TRUE, order_id = p_order_id, sold_at = NOW()
    WHERE id = v_key_id;

    RETURN v_credential;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 📦 SEED DATA: หมวดหมู่และสินค้าเริ่มต้นของ NYX9 STUDIO
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
