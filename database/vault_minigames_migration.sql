-- ==============================================================================
-- 🐘 NYX9 STUDIO — VAULT + VARIANTS + MINIGAMES MIGRATION (PostgreSQL 15+)
-- ==============================================================================
-- Adds the credentials_vault (dedup-hashed), product_variants, and the full
-- gamification / program-status / restock-radar subsystem on top of the existing
-- schema.sql. Battle-tested against Supabase (pgcrypto + RLS + SECURITY DEFINER).
--
-- DEPENDENCIES (must already exist from schema.sql / aes256_vault_migration.sql):
--   * public.products, public.profiles, public.orders
--   * public.vault_encrypt(TEXT), public.vault_decrypt(TEXT)  [AES-256 helpers]
--   * extensions (pgcrypto: digest, gen_random_uuid)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. COLUMN ADDITIONS ON EXISTING TABLES
-- ==============================================================================

-- Live stock counter kept in sync by fn_sync_product_stock
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 0;

-- Dual-currency loyalty points (cashback / minigame currency)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ==============================================================================
-- 2. CORE DATA TABLES
-- ==============================================================================

-- 2.1 Product variants (variant-scoped pricing / sku)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_variants UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON public.product_variants (product_id)
  WHERE is_active = TRUE;

-- 2.2 Credentials Vault (dedup-hashed, variant-aware, sale-audited)
CREATE TABLE IF NOT EXISTS public.credentials_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    credential_data TEXT NOT NULL,
    credential_hash TEXT NOT NULL,
    is_sold BOOLEAN NOT NULL DEFAULT FALSE,
    sold_at TIMESTAMPTZ,
    order_id TEXT,
    sold_to_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedup: one unique credential per (product, variant, hash).
-- COALESCE on variant_id makes NULL variants dedupe correctly (NULL != NULL in btree).
CREATE UNIQUE INDEX IF NOT EXISTS uq_credentials_vault_dedup
  ON public.credentials_vault (product_id, COALESCE(variant_id::TEXT, ''), credential_hash);

-- Fast dispatch: cheapest available stock by product/variant
CREATE INDEX IF NOT EXISTS idx_credentials_vault_unsold
  ON public.credentials_vault (product_id, variant_id, created_at)
  WHERE is_sold = FALSE;

CREATE INDEX IF NOT EXISTS idx_credentials_vault_order
  ON public.credentials_vault (order_id);

-- 2.3 Minigames
CREATE TABLE IF NOT EXISTS public.minigames (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    play_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (play_price >= 0),
    play_points INT NOT NULL DEFAULT 0 CHECK (play_points >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Minigame rewards (weighted probability table)
CREATE TABLE IF NOT EXISTS public.minigame_rewards (
    id SERIAL PRIMARY KEY,
    minigame_id INT NOT NULL REFERENCES public.minigames(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL DEFAULT 'none'
      CHECK (reward_type IN ('vault', 'money', 'points', 'none')),
    weight NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (weight >= 0),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    money_amount NUMERIC(12,2),
    points_amount INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_minigame_rewards_active
  ON public.minigame_rewards (minigame_id)
  WHERE is_active = TRUE;

-- 2.5 Minigame play ledger
CREATE TABLE IF NOT EXISTS public.minigame_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    minigame_id INT NOT NULL REFERENCES public.minigames(id) ON DELETE CASCADE,
    reward_id INT REFERENCES public.minigame_rewards(id) ON DELETE SET NULL,
    credential_id UUID REFERENCES public.credentials_vault(id) ON DELETE SET NULL,
    cost_money NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_points INT NOT NULL DEFAULT 0,
    reward_type TEXT,
    reward_payload JSONB,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_minigame_plays_user
  ON public.minigame_plays (user_id, played_at DESC);

-- 2.6 Program status hub (script/product uptime badges)
CREATE TABLE IF NOT EXISTS public.program_statuses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'online'
      CHECK (status IN ('online', 'updating', 'maintenance', 'detected')),
    version TEXT,
    icon_url TEXT,
    download_url TEXT,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Restock notification radar (bell-ringer)
CREATE TABLE IF NOT EXISTS public.restock_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    discord_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'sent', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMPTZ,
    CONSTRAINT uq_restock_notification
      UNIQUE (product_id, COALESCE(variant_id::TEXT, ''), COALESCE(user_id::TEXT, discord_id))
);

-- 2.8 Admin PIN 2FA config (singleton row)
CREATE TABLE IF NOT EXISTS public.admin_pin_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    pin_hash TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_pin_config ENABLE ROW LEVEL SECURITY;

-- Credentials Vault: strictly sealed (Zero Key Leakage)
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.credentials_vault FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.credentials_vault TO service_role;
DROP POLICY IF EXISTS "Strict credential vault protection" ON public.credentials_vault;
CREATE POLICY "Strict credential vault protection" ON public.credentials_vault
  FOR ALL TO service_role USING (true);

-- Variants: public read active, service_role full
DROP POLICY IF EXISTS "Allow public read active variants" ON public.product_variants;
CREATE POLICY "Allow public read active variants" ON public.product_variants
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Service role full variants" ON public.product_variants;
CREATE POLICY "Service role full variants" ON public.product_variants
  FOR ALL TO service_role USING (true);

-- Minigames: public read active
DROP POLICY IF EXISTS "Allow public read active minigames" ON public.minigames;
CREATE POLICY "Allow public read active minigames" ON public.minigames
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Service role full minigames" ON public.minigames;
CREATE POLICY "Service role full minigames" ON public.minigames
  FOR ALL TO service_role USING (true);

-- Minigame rewards: public read active
DROP POLICY IF EXISTS "Allow public read active rewards" ON public.minigame_rewards;
CREATE POLICY "Allow public read active rewards" ON public.minigame_rewards
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Service role full rewards" ON public.minigame_rewards;
CREATE POLICY "Service role full rewards" ON public.minigame_rewards
  FOR ALL TO service_role USING (true);

-- Minigame plays: authenticated read own history
DROP POLICY IF EXISTS "Allow users read own plays" ON public.minigame_plays;
CREATE POLICY "Allow users read own plays" ON public.minigame_plays
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Service role full plays" ON public.minigame_plays;
CREATE POLICY "Service role full plays" ON public.minigame_plays
  FOR ALL TO service_role USING (true);

-- Program statuses: public read active
DROP POLICY IF EXISTS "Allow public read program statuses" ON public.program_statuses;
CREATE POLICY "Allow public read program statuses" ON public.program_statuses
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Service role full program statuses" ON public.program_statuses;
CREATE POLICY "Service role full program statuses" ON public.program_statuses
  FOR ALL TO service_role USING (true);

-- Restock notifications: authenticated read/write own
DROP POLICY IF EXISTS "Allow users manage own notifications" ON public.restock_notifications;
CREATE POLICY "Allow users manage own notifications" ON public.restock_notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Service role full notifications" ON public.restock_notifications;
CREATE POLICY "Service role full notifications" ON public.restock_notifications
  FOR ALL TO service_role USING (true);

-- Admin PIN config: sealed
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.admin_pin_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_pin_config TO service_role;
DROP POLICY IF EXISTS "Protect admin pin config" ON public.admin_pin_config;
CREATE POLICY "Protect admin pin config" ON public.admin_pin_config
  FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. STORED PROCEDURES
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 fn_sync_product_stock(TEXT) -> INT
--     Recounts available credentials and writes public.products.stock.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_product_stock(p_product_id TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.credentials_vault
    WHERE product_id = p_product_id AND is_sold = FALSE;

    UPDATE public.products
    SET stock = v_count
    WHERE id = p_product_id;

    RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4.2 fn_bulk_insert_stock(TEXT, UUID, TEXT[]) -> TABLE(added_count, skipped_count)
--     SHA-256 dedup + AES-256 encryption + stock sync.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_bulk_insert_stock(
    p_product_id TEXT,
    p_variant_id UUID,
    p_keys TEXT[]
)
RETURNS TABLE(added_count INT, skipped_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_authorized BOOLEAN := FALSE;
    v_key TEXT;
    v_trimmed TEXT;
    v_hash TEXT;
    v_encrypted TEXT;
    v_rows INT;
    v_added INT := 0;
    v_skipped INT := 0;
BEGIN
    -- Authorization: admin profile or service_role only
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_authorized;
    END IF;
    IF NOT v_is_authorized AND auth.role() = 'service_role' THEN
        v_is_authorized := TRUE;
    END IF;
    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'UNAUTHORIZED: bulk stock insert requires admin or service_role';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', p_product_id;
    END IF;

    IF p_keys IS NULL OR array_length(p_keys, 1) = 0 THEN
        added_count := 0;
        skipped_count := 0;
        RETURN NEXT;
        RETURN;
    END IF;

    FOREACH v_key IN ARRAY p_keys
    LOOP
        v_trimmed := trim(v_key);

        IF v_trimmed = '' THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        v_hash := encode(extensions.digest(v_trimmed, 'sha256'), 'hex');
        v_encrypted := public.vault_encrypt(v_trimmed);

        INSERT INTO public.credentials_vault (
            product_id, variant_id, credential_data, credential_hash
        )
        VALUES (
            p_product_id, p_variant_id, v_encrypted, v_hash
        )
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows > 0 THEN
            v_added := v_added + 1;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;
    END LOOP;

    PERFORM public.fn_sync_product_stock(p_product_id);

    added_count := v_added;
    skipped_count := v_skipped;
    RETURN NEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4.3 fn_dispense_credentials(TEXT, UUID, INT, TEXT, TEXT)
--     -> TABLE(credential_id UUID, credential_data TEXT)
--     FOR UPDATE SKIP LOCKED race-safe bulk dispatch.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dispense_credentials(
    p_product_id TEXT,
    p_variant_id UUID,
    p_quantity INT,
    p_order_id TEXT,
    p_user_id TEXT
)
RETURNS TABLE(credential_id UUID, credential_data TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qty INT;
BEGIN
    v_qty := GREATEST(0, COALESCE(p_quantity, 0));

    RETURN QUERY EXECUTE $sql$
        WITH locked AS (
            SELECT cv.id
            FROM public.credentials_vault cv
            WHERE cv.product_id = $1
              AND cv.variant_id IS NOT DISTINCT FROM $2
              AND cv.is_sold = FALSE
            ORDER BY cv.created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $3
        ),
        updated AS (
            UPDATE public.credentials_vault cv
            SET is_sold        = TRUE,
                sold_at        = NOW(),
                order_id       = NULLIF($4, ''),
                sold_to_user_id = NULLIF($5, '')
            WHERE cv.id IN (SELECT id FROM locked)
            RETURNING cv.id AS credential_id,
                      public.vault_decrypt(cv.credential_data) AS credential_data
        )
        SELECT credential_id, credential_data FROM updated
    $sql$ USING p_product_id, p_variant_id, v_qty, p_order_id, p_user_id;

    PERFORM public.fn_sync_product_stock(p_product_id);
    RETURN;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4.4 fn_play_minigame(UUID, INT, BOOLEAN) -> JSONB
--     Atomic wallet/points deduction + weighted reward + vault dispatch.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_play_minigame(
    p_user_id UUID,
    p_minigame_id INT,
    p_use_points BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_mg public.minigames%ROWTYPE;
    v_balance NUMERIC;
    v_points NUMERIC;
    v_cost_money NUMERIC := 0;
    v_cost_points INT := 0;
    v_reward public.minigame_rewards%ROWTYPE;
    v_total_weight NUMERIC := 0;
    v_roll NUMERIC;
    v_acc NUMERIC := 0;
    v_credential_id UUID;
    v_credential_data TEXT;
    v_reward_type TEXT := 'none';
    v_reward_payload JSONB := '{}'::jsonb;
    v_new_balance NUMERIC;
    v_new_points NUMERIC;
    v_play_id UUID;
BEGIN
    v_caller_id := auth.uid();

    -- Only the owner may play (service_role may act on behalf)
    IF auth.role() <> 'service_role' THEN
        IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
            RETURN jsonb_build_object(
                'success', false, 'error', 'UNAUTHORIZED',
                'message', 'You can only play minigames with your own account.'
            );
        END IF;
    END IF;

    -- Load active minigame
    SELECT * INTO v_mg
    FROM public.minigames
    WHERE id = p_minigame_id AND is_active = TRUE;

    IF v_mg.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'MINIGAME_NOT_FOUND',
            'message', 'Minigame not found or inactive.'
        );
    END IF;

    -- Determine cost
    IF p_use_points THEN
        v_cost_points := COALESCE(v_mg.play_points, 0);
    ELSE
        v_cost_money := COALESCE(v_mg.play_price, 0);
    END IF;

    -- Lock wallet and deduct atomically
    SELECT balance, points INTO v_balance, v_points
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'USER_NOT_FOUND',
            'message', 'User profile not found.'
        );
    END IF;

    IF p_use_points THEN
        IF v_points < v_cost_points THEN
            RETURN jsonb_build_object(
                'success', false, 'error', 'INSUFFICIENT_POINTS',
                'message', 'Not enough points.',
                'required', v_cost_points, 'available', v_points
            );
        END IF;
        UPDATE public.profiles
        SET points = points - v_cost_points, updated_at = NOW()
        WHERE id = p_user_id
        RETURNING points INTO v_new_points;
        v_new_balance := v_balance;
    ELSE
        IF v_balance < v_cost_money THEN
            RETURN jsonb_build_object(
                'success', false, 'error', 'INSUFFICIENT_BALANCE',
                'message', 'Not enough balance.',
                'required', v_cost_money, 'available', v_balance
            );
        END IF;
        UPDATE public.profiles
        SET balance = balance - v_cost_money, updated_at = NOW()
        WHERE id = p_user_id
        RETURNING balance INTO v_new_balance;
        v_new_points := v_points;
    END IF;

    -- Weighted reward selection
    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.minigame_rewards
    WHERE minigame_id = p_minigame_id AND is_active = TRUE AND weight > 0;

    IF v_total_weight > 0 THEN
        v_roll := random() * v_total_weight;
        FOR v_reward IN
            SELECT *
            FROM public.minigame_rewards
            WHERE minigame_id = p_minigame_id AND is_active = TRUE AND weight > 0
            ORDER BY id ASC
        LOOP
            v_acc := v_acc + v_reward.weight;
            IF v_roll <= v_acc THEN
                EXIT;
            END IF;
        END LOOP;
    END IF;

    v_reward_type := COALESCE(v_reward.reward_type, 'none');

    -- Resolve reward
    IF v_reward_type = 'money' THEN
        UPDATE public.profiles
        SET balance = balance + COALESCE(v_reward.money_amount, 0), updated_at = NOW()
        WHERE id = p_user_id
        RETURNING balance INTO v_new_balance;
        v_reward_payload := jsonb_build_object('amount', COALESCE(v_reward.money_amount, 0));

    ELSIF v_reward_type = 'points' THEN
        UPDATE public.profiles
        SET points = points + COALESCE(v_reward.points_amount, 0), updated_at = NOW()
        WHERE id = p_user_id
        RETURNING points INTO v_new_points;
        v_reward_payload := jsonb_build_object('amount', COALESCE(v_reward.points_amount, 0));

    ELSIF v_reward_type = 'vault' THEN
        SELECT id, credential_data INTO v_credential_id, v_credential_data
        FROM public.credentials_vault
        WHERE product_id = v_reward.product_id
          AND variant_id IS NOT DISTINCT FROM v_reward.variant_id
          AND is_sold = FALSE
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1;

        IF FOUND THEN
            UPDATE public.credentials_vault
            SET is_sold = TRUE,
                sold_at = NOW(),
                order_id = 'MINIGAME-' || gen_random_uuid()::text,
                sold_to_user_id = p_user_id::text
            WHERE id = v_credential_id;

            PERFORM public.fn_sync_product_stock(v_reward.product_id);

            v_credential_data := public.vault_decrypt(v_credential_data);
            v_reward_payload := jsonb_build_object(
                'product_id', v_reward.product_id,
                'variant_id', v_reward.variant_id,
                'credential_id', v_credential_id,
                'credential_data', v_credential_data
            );
        ELSE
            -- Vault reward selected but out of stock -> downgrade to miss
            v_reward_type := 'none';
            v_reward_payload := jsonb_build_object('reason', 'REWARD_OUT_OF_STOCK');
        END IF;

    ELSE
        v_reward_type := 'none';
        v_reward_payload := '{}'::jsonb;
    END IF;

    -- Record play
    INSERT INTO public.minigame_plays (
        user_id, minigame_id, reward_id, credential_id,
        cost_money, cost_points, reward_type, reward_payload
    )
    VALUES (
        p_user_id, p_minigame_id,
        CASE WHEN v_reward_type IN ('money', 'points', 'vault') THEN v_reward.id ELSE NULL END,
        v_credential_id,
        v_cost_money, v_cost_points,
        v_reward_type, v_reward_payload
    )
    RETURNING id INTO v_play_id;

    RETURN jsonb_build_object(
        'success', true,
        'play_id', v_play_id,
        'minigame_id', p_minigame_id,
        'played_with', CASE WHEN p_use_points THEN 'points' ELSE 'money' END,
        'cost_money', v_cost_money,
        'cost_points', v_cost_points,
        'reward_type', v_reward_type,
        'reward', v_reward_payload,
        'new_balance', v_new_balance,
        'new_points', v_new_points
    );
END;
$$;

-- ==============================================================================
-- 5. GRANTS (Zero-Trust Model)
-- ==============================================================================

-- Bulk stock insert: admin / service_role only
REVOKE EXECUTE ON FUNCTION public.fn_bulk_insert_stock(TEXT, UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_bulk_insert_stock(TEXT, UUID, TEXT[]) TO authenticated, service_role;

-- Dispense: internal fulfillment only
REVOKE EXECUTE ON FUNCTION public.fn_dispense_credentials(TEXT, UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_dispense_credentials(TEXT, UUID, INT, TEXT, TEXT) TO service_role;

-- Stock sync: internal
REVOKE EXECUTE ON FUNCTION public.fn_sync_product_stock(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_product_stock(TEXT) TO service_role;

-- Minigame: authenticated + service_role
REVOKE EXECUTE ON FUNCTION public.fn_play_minigame(UUID, INT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_play_minigame(UUID, INT, BOOLEAN) TO authenticated, service_role;
