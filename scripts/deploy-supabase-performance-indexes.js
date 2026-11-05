const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- ==============================================================================
-- ⚡ SUPABASE PERFORMANCE & RLS INITPLAN OPTIMIZATIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX AUTH RLS INITPLAN WARNINGS (Wrap auth.uid() in (SELECT auth.uid()))
-- Prevents re-evaluating auth.uid() on every single scanned row (O(1) vs O(N))
-- ------------------------------------------------------------------------------

-- 1.1 profiles: Allow users update own profile
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- 1.2 profiles: Allow users read own profile
DROP POLICY IF EXISTS "Allow users read own profile" ON public.profiles;
CREATE POLICY "Allow users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
);

-- 1.3 orders: Allow users read own orders
DROP POLICY IF EXISTS "Allow users read own orders" ON public.orders;
CREATE POLICY "Allow users read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
);

-- 1.4 order_items: Allow users read own order items
DROP POLICY IF EXISTS "Allow users read own order items" ON public.order_items;
CREATE POLICY "Allow users read own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())))
  )
);

-- 1.5 topup_transactions: Allow users read own topups
DROP POLICY IF EXISTS "Allow users read own topups" ON public.topup_transactions;
CREATE POLICY "Allow users read own topups"
ON public.topup_transactions
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid()))
);

-- 1.6 warranty_claims: Allow read warranty claims
DROP POLICY IF EXISTS "Allow read warranty claims" ON public.warranty_claims;
CREATE POLICY "Allow read warranty claims"
ON public.warranty_claims
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = warranty_claims.order_id
      AND (o.user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())))
  )
  OR public.is_admin((SELECT auth.uid()))
);

-- ------------------------------------------------------------------------------
-- 2. CREATE COVERING INDEXES FOR ALL UNINDEXED FOREIGN KEYS
-- Resolves all 10 unindexed_foreign_keys lint warnings
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
ON public.order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON public.orders (user_id);

CREATE INDEX IF NOT EXISTS idx_products_category_id 
ON public.products (category_id);

CREATE INDEX IF NOT EXISTS idx_promo_code_usages_order_id 
ON public.promo_code_usages (order_id);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_user_id 
ON public.system_audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_topup_transactions_user_id 
ON public.topup_transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_used_payment_slips_user_id 
ON public.used_payment_slips (user_id);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_order_id 
ON public.warranty_claims (order_id);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_user_id 
ON public.warranty_claims (user_id);

-- ------------------------------------------------------------------------------
-- 3. DROP REDUNDANT UNUSED INDEX (Resolves unused_index lint)
-- ------------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_blacklists_val;
`;

async function deployPerformanceOptimizations() {
  console.log('Connecting to PostgreSQL to apply Performance & Index Optimizations...');
  await client.connect();
  await client.query(sql);
  console.log('✅ ALL RLS INITPLAN POLICIES UPDATED AND 10 FOREIGN KEY INDEXES CREATED!');

  // Verify created indexes
  const idxRes = await client.query(`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
  `);
  console.log('\nVerified Indexes:');
  console.table(idxRes.rows);

  await client.end();
}

deployPerformanceOptimizations().catch(err => {
  console.error('❌ Optimization failed:', err);
  process.exit(1);
});
