-- ==============================================================================
-- 🛡️ NYX9 STUDIO — SPRINT 5: ULTIMATE DEFENSE & MOAT PARITY MIGRATION
-- ==============================================================================
-- 1. Reseller Pricing Schema
-- 2. User Developer API Keys Table
-- 3. KeyAuth & HWID Reset Ledger
-- 4. Audit Sentinel Performance Indexes
-- ==============================================================================

-- 1. Add reseller_price to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS reseller_price NUMERIC(10, 2);

-- Populate default reseller_price for high-volume products (approx 10-15% wholesale discount)
UPDATE public.products 
SET reseller_price = ROUND(price * 0.88, 2)
WHERE reseller_price IS NULL AND price > 0;

-- 2. Create User Developer API Keys Table
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  label TEXT DEFAULT 'Default API Key',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON public.user_api_keys(key_hash);

-- Enable RLS on user_api_keys
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own api keys" ON public.user_api_keys;
CREATE POLICY "Users can read own api keys" 
ON public.user_api_keys 
FOR SELECT 
TO authenticated 
USING (user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Service role full access user_api_keys" ON public.user_api_keys;
CREATE POLICY "Service role full access user_api_keys" 
ON public.user_api_keys 
FOR ALL 
TO service_role 
USING (true);

-- 3. Create KeyAuth HWID Reset Cooldown Ledger
CREATE TABLE IF NOT EXISTS public.keyauth_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  reset_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'success',
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_keyauth_reset_key ON public.keyauth_reset_logs(license_key, reset_at DESC);

-- Enable RLS on keyauth_reset_logs
ALTER TABLE public.keyauth_reset_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access keyauth_reset_logs" ON public.keyauth_reset_logs;
CREATE POLICY "Service role full access keyauth_reset_logs" 
ON public.keyauth_reset_logs 
FOR ALL 
TO service_role 
USING (true);

-- 4. Audit Sentinel Performance Indexes
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created ON public.system_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_event ON public.system_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_ip ON public.system_audit_logs(ip_address);
