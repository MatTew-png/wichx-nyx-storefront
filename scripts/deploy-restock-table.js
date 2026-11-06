const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS public.restock_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  discord_contact TEXT NOT NULL,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restock_sub_prod ON public.restock_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_restock_sub_user ON public.restock_subscriptions(user_id);

ALTER TABLE public.restock_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert restock subscriptions" ON public.restock_subscriptions;
CREATE POLICY "Allow public insert restock subscriptions"
ON public.restock_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  product_id IS NOT NULL AND LENGTH(TRIM(discord_contact)) >= 2
);

DROP POLICY IF EXISTS "Allow users read own subscriptions" ON public.restock_subscriptions;
CREATE POLICY "Allow users read own subscriptions"
ON public.restock_subscriptions
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Service role full access restock subscriptions" ON public.restock_subscriptions;
CREATE POLICY "Service role full access restock subscriptions"
ON public.restock_subscriptions
FOR ALL
TO service_role
USING (true);
`;

async function deployRestockTable() {
  await client.connect();
  await client.query(sql);
  console.log('✅ restock_subscriptions table deployed with indexes and RLS!');
  await client.end();
}

deployRestockTable().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
