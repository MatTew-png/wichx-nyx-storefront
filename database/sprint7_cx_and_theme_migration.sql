-- ==============================================================================
-- 🎨 SPRINT 7: FRONTEND CRAFTSMANSHIP, THEME STUDIO & DAILY REWARD MIGRATION
-- ==============================================================================
-- 1. เพิ่มตาราง public.daily_rewards สำหรับระบบแจกแต้มสะสมฟรีรายวัน
-- 2. เพิ่มคอลัมน์ form_fields ใน public.products สำหรับสินค้ารับสั่งทำ (ORDER type)
-- 3. ตรวจสอบตาราง public.system_settings สำหรับเก็บ Active Theme Config
-- ==============================================================================

-- 1. เพิ่มตาราง daily_rewards
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL DEFAULT 'points',
  reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
  streak_count INT NOT NULL DEFAULT 1,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_claimed 
ON public.daily_rewards(user_id, claimed_at DESC);

-- 2. เพิ่มคอลัมน์ form_fields ในตาราง products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS form_fields JSONB DEFAULT '[]'::jsonb;

-- 3. เพิ่มค่าเริ่มต้นสำหรับ theme_config ใน system_settings ถ้ายังไม่มี
INSERT INTO public.system_settings (key, value, updated_at, updated_by)
VALUES (
  'theme_config',
  jsonb_build_object(
    'preset', 'glacier_cyan',
    'accent', '#00F0FF',
    'accentHover', '#00D2E0',
    'accentGlow', 'rgba(0, 240, 255, 0.2)',
    'customCss', ''
  ),
  NOW(),
  'system_init'
)
ON CONFLICT (key) DO NOTHING;
