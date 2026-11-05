const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- ==============================================================================
-- 🛡️ SUPABASE PERFORMANCE & SECURITY LINT REMEDIATION SCRIPT
-- ==============================================================================

-- 1. handle_new_user: Strictly internal trigger function (Zero API exposure)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- 2. admin_bulk_restock: Admin only (Revoke from anon and PUBLIC)
REVOKE ALL ON FUNCTION public.admin_bulk_restock(TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_restock(TEXT, TEXT, TEXT[]) TO authenticated, service_role;

-- 3. admin_get_metrics: Admin only (Revoke from anon and PUBLIC)
REVOKE ALL ON FUNCTION public.admin_get_metrics(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics(TEXT) TO authenticated, service_role;

-- 4. admin_resolve_claim: Admin only (Revoke from anon and PUBLIC)
REVOKE ALL ON FUNCTION public.admin_resolve_claim(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_claim(TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;

-- 5. execute_order_checkout: Authenticated customers only (Revoke from anon and PUBLIC)
REVOKE ALL ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) TO authenticated, service_role;

-- 6. is_admin: Helper function (Revoke from anon and PUBLIC)
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

-- 7. process_topup: Authenticated / Service only (Revoke from anon and PUBLIC)
REVOKE ALL ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) TO authenticated, service_role;

-- 8. Ensure search_path is locked on all SECURITY DEFINER functions (prevents search_path hijacking)
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_bulk_restock(TEXT, TEXT, TEXT[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_get_metrics(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_resolve_claim(TEXT, UUID, TEXT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.execute_order_checkout(TEXT, JSONB, NUMERIC, UUID, JSONB) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_product_stock_counts() SET search_path = public, pg_temp;
`;

async function runRemediation() {
  console.log('Connecting to PostgreSQL to apply Supabase Lint Remediation...');
  await client.connect();
  await client.query(sql);
  console.log('✅ Supabase Lint Remediation Applied Successfully!');

  // Check updated routine privileges
  const res = await client.query(`
    SELECT routine_name, grantee, privilege_type 
    FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' 
    ORDER BY routine_name, grantee;
  `);
  console.log('\nUpdated Routine Privileges:');
  console.table(res.rows);

  await client.end();
}

runRemediation().catch(err => {
  console.error('❌ Remediation failed:', err);
  process.exit(1);
});
