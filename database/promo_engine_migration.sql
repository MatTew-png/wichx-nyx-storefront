-- ==============================================================================
-- 🎟️ NYX9 STUDIO — DYNAMIC PROMO CODES & VOUCHER ENGINE (SHOPEE STYLE)
-- ==============================================================================

-- 1. Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    min_spend NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (min_spend >= 0),
    max_discount NUMERIC(10,2),
    usage_limit INT,
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Protection
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read active promo codes" ON public.promo_codes;
CREATE POLICY "Allow public read active promo codes" ON public.promo_codes 
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Service role full access promo codes" ON public.promo_codes;
CREATE POLICY "Service role full access promo codes" ON public.promo_codes 
  FOR ALL TO service_role USING (true);

-- Insert Default Seed Codes
INSERT INTO public.promo_codes (code, label, discount_type, discount_value, min_spend)
VALUES 
  ('NYX9VIP', 'NYX9 ลด 10% ทุกออเดอร์', 'percent', 10.00, 100.00),
  ('NYX50', 'ลด ฿50 เมื่อซื้อครบ ฿300', 'fixed', 50.00, 300.00),
  ('CYBERVIP', 'VIP Cyber ส่วนลด 15%', 'percent', 15.00, 500.00),
  ('TIKTOK10', 'คูปองต้อนรับ TikTok ลด ฿10', 'fixed', 10.00, 50.00)
ON CONFLICT (code) DO NOTHING;

-- 2. Admin Manage Promo Codes Procedure (CRUD)
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

-- 3. Public Safe Procedure to fetch available vouchers for storefront (Shopee Style Ticket List)
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
