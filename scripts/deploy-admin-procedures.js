const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const adminSecret = process.env.ADMIN_SECRET_KEY || 'nyx9_secure_admin_passphrase';

const sql = `
-- 1. Admin Telemetry & Metrics Stored Procedure
CREATE OR REPLACE FUNCTION public.admin_get_metrics(p_admin_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expected_secret TEXT := '${adminSecret}';
  v_total_revenue NUMERIC := 0.00;
  v_total_orders BIGINT := 0;
  v_total_unsold_stock BIGINT := 0;
  v_total_topups NUMERIC := 0.00;
  v_pending_claims BIGINT := 0;
  v_stock_by_product JSONB := '[]'::jsonb;
  v_recent_orders JSONB := '[]'::jsonb;
  v_recent_topups JSONB := '[]'::jsonb;
  v_claims JSONB := '[]'::jsonb;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง (Invalid Admin Secret)');
  END IF;

  -- 1. Aggregates
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*) INTO v_total_revenue, v_total_orders FROM public.orders;
  SELECT COUNT(*) INTO v_total_unsold_stock FROM public.inventory_keys WHERE is_sold = FALSE;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_topups FROM public.topup_transactions WHERE status = 'SUCCESS';
  SELECT COUNT(*) INTO v_pending_claims FROM public.warranty_claims WHERE status = 'PENDING';

  -- 2. Stock by Product
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', p.id,
      'title', p.title,
      'price', p.price,
      'in_stock', COALESCE(k.unsold_count, 0),
      'sold_count', COALESCE(k.sold_count, 0)
    )
  ) INTO v_stock_by_product
  FROM public.products p
  LEFT JOIN (
    SELECT 
      product_id,
      COUNT(*) FILTER (WHERE is_sold = FALSE) AS unsold_count,
      COUNT(*) FILTER (WHERE is_sold = TRUE) AS sold_count
    FROM public.inventory_keys
    GROUP BY product_id
  ) k ON p.id = k.product_id
  WHERE p.is_active = TRUE;

  -- 3. Recent 10 Orders
  SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb) INTO v_recent_orders
  FROM (
    SELECT id, total_amount, payment_method, status, created_at
    FROM public.orders
    ORDER BY created_at DESC
    LIMIT 10
  ) o;

  -- 4. Recent 10 Topups
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent_topups
  FROM (
    SELECT id, gateway, amount, status, trans_ref, created_at
    FROM public.topup_transactions
    ORDER BY created_at DESC
    LIMIT 10
  ) t;

  -- 5. Warranty Claims
  SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) INTO v_claims
  FROM (
    SELECT id, order_id, reason, status, admin_notes, created_at
    FROM public.warranty_claims
    ORDER BY created_at DESC
    LIMIT 10
  ) c;

  RETURN jsonb_build_object(
    'success', true,
    'metrics', jsonb_build_object(
      'total_revenue', v_total_revenue,
      'total_orders', v_total_orders,
      'total_unsold_stock', v_total_unsold_stock,
      'total_topups', v_total_topups,
      'pending_claims', v_pending_claims
    ),
    'stock_by_product', COALESCE(v_stock_by_product, '[]'::jsonb),
    'recent_orders', v_recent_orders,
    'recent_topups', v_recent_topups,
    'warranty_claims', v_claims
  );
END;
$$;

-- 2. Admin Bulk Restock Stored Procedure
CREATE OR REPLACE FUNCTION public.admin_bulk_restock(
  p_admin_secret TEXT,
  p_product_id TEXT,
  p_keys TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expected_secret TEXT := '${adminSecret}';
  v_key TEXT;
  v_inserted_count INT := 0;
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
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

  -- Audit Log
  INSERT INTO public.system_audit_logs (event_type, severity, payload)
  VALUES ('ADMIN_RESTOCK', 'INFO', jsonb_build_object('product_id', p_product_id, 'count', v_inserted_count, 'timestamp', NOW()));

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'inserted_count', v_inserted_count,
    'message', 'เพิ่มสต็อกสินค้าเรียบร้อยแล้ว ' || v_inserted_count || ' รายการ'
  );
END;
$$;

-- 3. Admin Warranty Claim Management Stored Procedure
CREATE OR REPLACE FUNCTION public.admin_resolve_claim(
  p_admin_secret TEXT,
  p_claim_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expected_secret TEXT := '${adminSecret}';
BEGIN
  IF p_admin_secret <> v_expected_secret THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
  END IF;

  UPDATE public.warranty_claims
  SET status = p_status,
      admin_notes = p_admin_notes,
      updated_at = NOW()
  WHERE id = p_claim_id;

  INSERT INTO public.system_audit_logs (event_type, severity, payload)
  VALUES ('CLAIM_RESOLVED', 'INFO', jsonb_build_object('claim_id', p_claim_id, 'status', p_status, 'notes', p_admin_notes));

  RETURN jsonb_build_object('success', true, 'claim_id', p_claim_id, 'status', p_status, 'message', 'อัปเดตสถานะการเคลมเรียบร้อย');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_metrics(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_restock(TEXT, TEXT, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_claim(TEXT, UUID, TEXT, TEXT) TO anon, authenticated, service_role;
`;

async function main() {
  await client.connect();
  console.log('Deploying admin stored procedures...');
  await client.query(sql);
  console.log('✅ Admin procedures deployed successfully!');
  await client.end();
}

main().catch(err => {
  console.error('Admin migration error:', err);
  process.exit(1);
});
