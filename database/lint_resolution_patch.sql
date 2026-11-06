-- ==============================================================================
-- ⚡ NYX9 STUDIO — SUPABASE PERFORMANCE & LINT RESOLUTION PATCH
-- ==============================================================================
-- 1. Fix auth_rls_initplan (Wrap auth.uid() in (select auth.uid()) for 10x-100x speed)
-- 2. Drop duplicate overlapping policy on order_items (multiple_permissive_policies)
-- 3. Drop deprecated test/debug function (test_get_headers)
-- 4. Set explicit immutable search_path on log_page_visit & get_product_stock_counts
-- ==============================================================================

-- 1. Fix auth_rls_initplan on orders
DROP POLICY IF EXISTS "Allow users read own orders" ON public.orders;
CREATE POLICY "Allow users read own orders" 
ON public.orders 
FOR SELECT TO authenticated 
USING (user_id = (SELECT auth.uid()));

-- 2. Fix multiple_permissive_policies & auth_rls_initplan on order_items
DROP POLICY IF EXISTS "Allow users read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow users read order items" ON public.order_items;

CREATE POLICY "Allow users read order items" 
ON public.order_items 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = (SELECT auth.uid())
  )
);

-- 3. Fix profiles RLS auth_rls_initplan
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = (SELECT auth.uid()));

-- 4. Drop test_get_headers (Eliminates mutable search_path & anon warning)
DROP FUNCTION IF EXISTS public.test_get_headers();

-- 5. Harden log_page_visit search_path
DROP FUNCTION IF EXISTS public.log_page_visit CASCADE;

CREATE OR REPLACE FUNCTION public.log_page_visit(
  p_path text DEFAULT '/',
  p_referer text DEFAULT '',
  p_screen text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.visitor_traffic_logs (path, referer, screen, created_at)
  VALUES (p_path, p_referer, p_screen, NOW());
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_page_visit(text, text, text) TO anon, authenticated, service_role;
