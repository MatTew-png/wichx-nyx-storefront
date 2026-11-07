-- ==============================================================================
-- 🌟 NYX9 STUDIO — PRODUCT REVIEWS & VERIFIED CUSTOMER RATINGS MIGRATION
-- ==============================================================================
-- Creates product_reviews table, RLS policies, and atomic RPC procedures.
-- Prevents duplicate review spam (UNIQUE per order + product).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT CHECK (char_length(comment) <= 1000),
  author_name TEXT NOT NULL DEFAULT 'ลูกค้าผู้มีอุปการคุณ',
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_reviews_order_product UNIQUE (order_id, product_id)
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.product_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.product_reviews(rating DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view visible reviews
DROP POLICY IF EXISTS "Public can view visible reviews" ON public.product_reviews;
CREATE POLICY "Public can view visible reviews"
  ON public.product_reviews
  FOR SELECT
  USING (is_visible = true);

-- RLS Policy: Admin can do anything
DROP POLICY IF EXISTS "Admin full access to reviews" ON public.product_reviews;
CREATE POLICY "Admin full access to reviews"
  ON public.product_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- ==============================================================================
-- 🚀 RPC: submit_product_review (Secure Review Submission)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_order_id TEXT,
  p_product_id TEXT,
  p_rating INT,
  p_comment TEXT DEFAULT '',
  p_author_name TEXT DEFAULT 'ลูกค้าผู้มีอุปการคุณ',
  p_avatar_url TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_order_id TEXT;
  v_clean_product_id TEXT;
  v_clean_author TEXT;
  v_clean_comment TEXT;
  v_new_id UUID;
  v_order_exists BOOLEAN;
BEGIN
  -- 1. Sanitize inputs
  v_clean_order_id := TRIM(COALESCE(p_order_id, ''));
  v_clean_product_id := TRIM(COALESCE(p_product_id, ''));
  v_clean_author := TRIM(COALESCE(p_author_name, 'ลูกค้าผู้มีอุปการคุณ'));
  v_clean_comment := TRIM(COALESCE(p_comment, ''));

  IF v_clean_order_id = '' THEN
    RAISE EXCEPTION 'กรุณาระบุหมายเลขคำสั่งซื้อ (Order ID)';
  END IF;

  IF v_clean_product_id = '' THEN
    RAISE EXCEPTION 'กรุณาระบุรหัสสินค้า (Product ID)';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'คะแนนดาวต้องอยู่ระหว่าง 1 ถึง 5 ดาว';
  END IF;

  -- 2. Verify order existence in orders table
  SELECT EXISTS(
    SELECT 1 FROM public.orders WHERE UPPER(id) = UPPER(v_clean_order_id)
  ) INTO v_order_exists;

  -- 3. Check duplicate review
  IF EXISTS(
    SELECT 1 FROM public.product_reviews 
    WHERE UPPER(order_id) = UPPER(v_clean_order_id) AND product_id = v_clean_product_id
  ) THEN
    RAISE EXCEPTION 'คุณได้ส่งรีวิวสำหรับสินค้านี้ในคำสั่งซื้อ % ไปแล้ว', v_clean_order_id;
  END IF;

  -- 4. Insert Review
  INSERT INTO public.product_reviews (
    product_id,
    order_id,
    user_id,
    rating,
    comment,
    author_name,
    avatar_url,
    is_verified,
    is_visible
  ) VALUES (
    v_clean_product_id,
    v_clean_order_id,
    p_user_id,
    p_rating,
    v_clean_comment,
    v_clean_author,
    p_avatar_url,
    v_order_exists, -- true if real order exists
    true
  )
  RETURNING id INTO v_new_id;

  -- 5. Audit Log
  INSERT INTO public.system_audit_logs (event_type, severity, user_id, order_id, payload)
  VALUES (
    'REVIEW_SUBMITTED',
    'INFO',
    p_user_id,
    v_clean_order_id,
    jsonb_build_object(
      'review_id', v_new_id,
      'order_id', v_clean_order_id,
      'product_id', v_clean_product_id,
      'rating', p_rating,
      'author', v_clean_author
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'บันทึกรีวิวเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็น!',
    'review_id', v_new_id
  );
END;
$$;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.submit_product_review TO anon, authenticated, service_role;

-- ==============================================================================
-- 📊 RPC: get_product_review_summary
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_product_review_summary(p_product_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_total_reviews INT;
  v_top_reviews JSONB;
BEGIN
  SELECT 
    COALESCE(ROUND(AVG(rating), 1), 5.0),
    COUNT(*)
  INTO v_avg_rating, v_total_reviews
  FROM public.product_reviews
  WHERE product_id = p_product_id AND is_visible = true;

  SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
  INTO v_top_reviews
  FROM (
    SELECT id, rating, comment, author_name, avatar_url, is_verified, created_at
    FROM public.product_reviews
    WHERE product_id = p_product_id AND is_visible = true
    ORDER BY created_at DESC
    LIMIT 10
  ) r;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'average_rating', v_avg_rating,
    'total_reviews', v_total_reviews,
    'reviews', v_top_reviews
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_review_summary TO anon, authenticated, service_role;

-- ==============================================================================
-- 🌟 RPC: get_storewide_reviews (For Homepage Showcase)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_storewide_reviews(p_limit INT DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reviews JSONB;
  v_overall_avg NUMERIC;
  v_total_count INT;
BEGIN
  SELECT 
    COALESCE(ROUND(AVG(rating), 1), 5.0),
    COUNT(*)
  INTO v_overall_avg, v_total_count
  FROM public.product_reviews
  WHERE is_visible = true;

  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_reviews
  FROM (
    SELECT 
      pr.id,
      pr.product_id,
      p.title AS product_title,
      pr.order_id,
      pr.rating,
      pr.comment,
      pr.author_name,
      pr.avatar_url,
      pr.is_verified,
      pr.created_at
    FROM public.product_reviews pr
    LEFT JOIN public.products p ON p.id = pr.product_id
    WHERE pr.is_visible = true
    ORDER BY pr.created_at DESC
    LIMIT p_limit
  ) r;

  RETURN jsonb_build_object(
    'overall_average', v_overall_avg,
    'total_reviews', v_total_count,
    'reviews', v_reviews
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storewide_reviews TO anon, authenticated, service_role;

-- ==============================================================================
-- 👑 Update handle_new_user for automatic Admin Role on Discord OAuth Sync
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discord_id TEXT;
  v_username TEXT;
  v_avatar_url TEXT;
  v_role TEXT := 'customer';
BEGIN
  v_discord_id := COALESCE(
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'sub'
  );
  v_username := COALESCE(
    (NEW.raw_user_meta_data->'custom_claims')->>'global_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Discord Member'
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- Admin Discord IDs Whitelist auto-promotion
  IF v_discord_id IN ('483398326159671326', '422611554475835394') THEN
    v_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, discord_id, username, avatar_url, balance, role)
  VALUES (
    NEW.id,
    v_discord_id,
    v_username,
    v_avatar_url,
    0.00,
    v_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    discord_id = COALESCE(EXCLUDED.discord_id, public.profiles.discord_id),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = CASE 
      WHEN EXCLUDED.discord_id IN ('483398326159671326', '422611554475835394') THEN 'admin'
      ELSE public.profiles.role
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
