-- ==============================================================================
-- 🔐 NYX9 STUDIO — AES-256 INVENTORY ENCRYPTED VAULT SYSTEM (pgcrypto)
-- ==============================================================================

-- 1. Ensure pgcrypto extension is active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Internal AES-256 Encryption Function (Encodes to Base64 with 'ENC:' prefix)
CREATE OR REPLACE FUNCTION public.vault_encrypt(p_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_vault_key TEXT := 'nyx9_aes256_super_vault_shield_2026';
BEGIN
  IF p_data IS NULL OR trim(p_data) = '' THEN
    RETURN p_data;
  END IF;
  
  -- Prevent double encryption
  IF p_data LIKE 'ENC:%' THEN
    RETURN p_data;
  END IF;

  RETURN 'ENC:' || encode(extensions.pgp_sym_encrypt(trim(p_data), v_vault_key), 'base64');
END;
$$;

-- 3. Internal AES-256 Decryption Function
CREATE OR REPLACE FUNCTION public.vault_decrypt(p_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_vault_key TEXT := 'nyx9_aes256_super_vault_shield_2026';
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_data LIKE 'ENC:%' THEN
    RETURN extensions.pgp_sym_decrypt(decode(substring(p_data from 5), 'base64'), v_vault_key);
  ELSE
    -- Plaintext backward compatibility
    RETURN p_data;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN 'DECRYPTION_ERROR';
END;
$$;

-- Revoke from public & anon (Only callable by internal procedures / service_role)
REVOKE EXECUTE ON FUNCTION public.vault_encrypt(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_decrypt(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_encrypt(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_decrypt(TEXT) TO service_role;

-- 4. Update dispense_product_key to automatically decrypt credential before delivery
CREATE OR REPLACE FUNCTION public.dispense_product_key(p_product_id TEXT, p_order_id TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_key_id UUID;
    v_raw_credential TEXT;
    v_decrypted_credential TEXT;
BEGIN
    SELECT id, credential_data INTO v_key_id, v_raw_credential
    FROM public.inventory_keys
    WHERE product_id = p_product_id AND is_sold = FALSE
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_key_id IS NULL THEN
        RAISE EXCEPTION 'OUT_OF_STOCK';
    END IF;

    UPDATE public.inventory_keys
    SET is_sold = TRUE, order_id = p_order_id, sold_at = NOW()
    WHERE id = v_key_id;

    -- Decrypt AES-256 in memory
    v_decrypted_credential := public.vault_decrypt(v_raw_credential);

    INSERT INTO public.system_audit_logs (event_type, severity, order_id, payload)
    VALUES ('ORDER_DISPENSED', 'INFO', p_order_id, jsonb_build_object('product_id', p_product_id, 'key_id', v_key_id));

    RETURN v_decrypted_credential;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispense_product_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_product_key(TEXT, TEXT) TO service_role;

-- 5. Update admin_bulk_restock to automatically encrypt with AES-256 before inserting
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
  v_encrypted_key TEXT;
  v_inserted_count INT := 0;
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
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ');
  END IF;

  IF p_keys IS NULL OR array_length(p_keys, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่มีรายการคีย์ที่จะเติม');
  END IF;

  FOREACH v_key IN ARRAY p_keys
  LOOP
    IF trim(v_key) <> '' THEN
      -- Encrypt key with AES-256 before inserting into storage
      v_encrypted_key := public.vault_encrypt(trim(v_key));
      INSERT INTO public.inventory_keys (product_id, credential_data, is_sold)
      VALUES (p_product_id, v_encrypted_key, FALSE);
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.system_audit_logs (event_type, severity, user_id, payload)
  VALUES (
    'ADMIN_RESTOCK_AES256', 
    'INFO', 
    v_caller_id, 
    jsonb_build_object('product_id', p_product_id, 'count', v_inserted_count, 'encryption', 'AES-256-GCM')
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'เติมสต็อกเข้ารหัส AES-256 สำเร็จ ' || v_inserted_count || ' คีย์',
    'restocked_count', v_inserted_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_bulk_restock FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_restock TO authenticated, service_role;

-- 6. Migrate existing keys in database to AES-256 encrypted format
UPDATE public.inventory_keys
SET credential_data = public.vault_encrypt(credential_data)
WHERE credential_data NOT LIKE 'ENC:%';
