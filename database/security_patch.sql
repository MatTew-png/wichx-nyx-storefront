-- ==============================================================================
-- 🛡️ NYX9 STUDIO — SUPABASE POSTGRESQL PRODUCTION SECURITY HARDENING PATCH
-- ==============================================================================
-- 1. Revoke public/anon access to balance-crediting RPC (process_topup)
-- 2. Seal inventory_keys against unauthorized SELECT / credential harvesting
-- 3. Provide secure, credential-free stock counter (get_product_stock_counts)
-- 4. Restrict orders and order_items to authenticated owners (auth.uid())
-- 5. Provide zero-leak guest/order lookup procedure (lookup_order)
-- 6. Lock admin RPCs to authenticated admins only (Role / Discord Whitelist)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TOPUP SECURITY: Revoke process_topup from anon & authenticated
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) TO service_role;

-- ------------------------------------------------------------------------------
-- 2. INVENTORY VAULT SECURITY: Seal inventory_keys
-- ------------------------------------------------------------------------------
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.inventory_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.inventory_keys TO service_role;

DROP POLICY IF EXISTS "Allow count unsold inventory keys" ON public.inventory_keys;
DROP POLICY IF EXISTS "Service role full access inventory_keys" ON public.inventory_keys;
DROP POLICY IF EXISTS "Strict inventory key protection" ON public.inventory_keys;

CREATE POLICY "Strict inventory key protection" 
ON public.inventory_keys 
FOR ALL TO service_role 
USING (true);

-- ------------------------------------------------------------------------------
-- 3. SAFE STOCK AGGREGATION: Returns ONLY product_id and in_stock_count (No Keys!)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_product_stock_counts()
RETURNS TABLE (product_id TEXT, in_stock_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT product_id, COUNT(*) AS in_stock_count
  FROM public.inventory_keys
  WHERE is_sold = FALSE
  GROUP BY product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_stock_counts() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. ORDERS & DELIVERED CREDENTIALS PRIVACY: Lock down orders & order_items
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users read own orders" ON public.orders;
CREATE POLICY "Allow users read own orders" 
ON public.orders 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow users read order items" ON public.order_items;
CREATE POLICY "Allow users read order items" 
ON public.order_items 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Service role full access to orders
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access order_items" ON public.order_items;
CREATE POLICY "Service role full access order_items" ON public.order_items FOR ALL TO service_role USING (true);

-- ------------------------------------------------------------------------------
-- 5. SECURE GUEST / ORDER STATUS LOOKUP RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_order(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'รหัสคำสั่งซื้อไม่ถูกต้อง');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = trim(p_order_id);
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบคำสั่งซื้อนี้');
  END IF;

  -- If user is logged in, verify ownership unless they are an admin
  IF auth.uid() IS NOT NULL AND v_order.user_id IS NOT NULL THEN
    IF v_order.user_id <> auth.uid() AND NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR discord_id IN ('483398326159671326', '422611554475835394'))
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้');
    END IF;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'product_id', oi.product_id,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'delivered_content', oi.delivered_content,
    'custom_data', oi.custom_data
  )) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'total_amount', v_order.total_amount,
      'status', v_order.status,
      'created_at', v_order.created_at,
      'items', COALESCE(v_items, '[]'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_order(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. ADMIN AUTHENTICATION HARMONIZATION: Restrict Admin RPCs
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_bulk_restock CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_metrics CASCADE;
DROP FUNCTION IF EXISTS public.admin_resolve_claim CASCADE;

-- Hardened Admin Bulk Restock: Check role / whitelist
CREATE OR REPLACE FUNCTION public.admin_bulk_restock(
  p_admin_secret TEXT,
  p_product_id TEXT,
  p_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_key TEXT;
  v_inserted_count INT := 0;
BEGIN
  v_caller_id := auth.uid();
  
  -- Check if caller is authenticated admin or matches Discord Whitelist
  IF v_caller_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_caller_id
      AND (role = 'admin' OR discord_id IN ('483398326159671326', '422611554475835394'))
    ) INTO v_is_authorized;
  END IF;

  -- Service role always permitted
  IF NOT v_is_authorized AND auth.role() = 'service_role' THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ');
  END IF;

  IF p_keys IS NULL OR array_length(p_keys, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่มีรายการคีย์ที่จะเติม');
  END IF;

  FOREACH v_key IN ARRAY p_keys
  LOOP
    IF trim(v_key) <> '' THEN
      INSERT INTO public.inventory_keys (product_id, credential_data, is_sold)
      VALUES (p_product_id, trim(v_key), FALSE);
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.system_audit_logs (event_type, severity, user_id, payload)
  VALUES (
    'ADMIN_RESTOCK', 
    'INFO', 
    v_caller_id, 
    jsonb_build_object('product_id', p_product_id, 'count', v_inserted_count)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'เติมสต็อกสำเร็จ ' || v_inserted_count || ' คีย์',
    'restocked_count', v_inserted_count
  );
END;
$$;

-- Hardened Admin Get Metrics: Check role / whitelist
CREATE OR REPLACE FUNCTION public.admin_get_metrics(p_admin_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_total_revenue NUMERIC(12,2) := 0.00;
  v_total_orders BIGINT := 0;
  v_total_users BIGINT := 0;
  v_pending_claims BIGINT := 0;
  v_available_keys BIGINT := 0;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_caller_id
      AND (role = 'admin' OR discord_id IN ('483398326159671326', '422611554475835394'))
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized AND auth.role() = 'service_role' THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่มีสิทธิ์เข้าถึงข้อมูลเชิงสถิติ');
  END IF;

  SELECT COALESCE(SUM(total_amount), 0.00), COUNT(*)
  INTO v_total_revenue, v_total_orders
  FROM public.orders
  WHERE status = 'PAID';

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_pending_claims FROM public.warranty_claims WHERE status = 'PENDING';
  SELECT COUNT(*) INTO v_available_keys FROM public.inventory_keys WHERE is_sold = FALSE;

  RETURN jsonb_build_object(
    'success', true,
    'metrics', jsonb_build_object(
      'total_revenue', v_total_revenue,
      'total_orders', v_total_orders,
      'total_users', v_total_users,
      'pending_claims', v_pending_claims,
      'available_keys', v_available_keys
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_bulk_restock FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_metrics FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_restock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics TO authenticated, service_role;
