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
