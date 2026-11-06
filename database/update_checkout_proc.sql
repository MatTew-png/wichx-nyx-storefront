CREATE OR REPLACE FUNCTION public.execute_order_checkout(
  p_order_id TEXT,
  p_items JSONB,
  p_total_amount NUMERIC,
  p_user_id UUID DEFAULT NULL,
  p_customer_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_target_user_id UUID;
  v_user_discord_id TEXT;
  v_client_ip TEXT;
  v_client_discord_id TEXT;
  v_blacklist_entry RECORD;
  
  v_promo_code TEXT;
  v_client_discount NUMERIC := 0.00;
  v_verified_discount NUMERIC := 0.00;
  v_promo_rec RECORD;
  
  v_item JSONB;
  v_product_id TEXT;
  v_qty INT;
  v_real_unit_price NUMERIC;
  v_fulfillment_type TEXT;
  v_custom_data JSONB;
  v_dispensed_key TEXT;
  v_all_dispensed JSONB := '[]'::jsonb;
  v_item_credentials JSONB;
  v_calculated_subtotal NUMERIC := 0.00;
  v_final_total NUMERIC := 0.00;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC := 0.00;
  v_i INT;
BEGIN
  v_caller_id := auth.uid();

  IF auth.role() <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'กรุณาเข้าสู่ระบบด้วย Discord ก่อนสั่งซื้อสินค้า');
    END IF;
    v_target_user_id := v_caller_id;
  ELSE
    v_target_user_id := COALESCE(p_user_id, v_caller_id);
  END IF;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'ไม่พบข้อมูลผู้สั่งซื้อ (Missing User ID)');
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_CART', 'message', 'ตะกร้าสินค้าว่างเปล่า');
  END IF;

  v_client_ip := NULLIF(TRIM(COALESCE(p_customer_info->>'ip', p_customer_info->>'ip_address', '')), '');
  v_client_discord_id := NULLIF(TRIM(COALESCE(p_customer_info->>'discordId', p_customer_info->>'discord_id', '')), '');
  v_promo_code := NULLIF(UPPER(TRIM(COALESCE(p_customer_info->>'promoCode', p_customer_info->>'promo_code', p_customer_info->>'code', ''))), '');
  v_client_discount := COALESCE((p_customer_info->>'discountAmount')::NUMERIC, (p_customer_info->>'discount_amount')::NUMERIC, 0.00);

  SELECT discord_id INTO v_user_discord_id FROM public.profiles WHERE id = v_target_user_id;

  -- Blacklist Check
  SELECT target_type, target_value, reason INTO v_blacklist_entry
  FROM public.blacklists
  WHERE (expires_at IS NULL OR expires_at > NOW())
    AND (
      target_value = v_target_user_id::text
      OR (v_user_discord_id IS NOT NULL AND target_value = v_user_discord_id)
      OR (v_client_discord_id IS NOT NULL AND target_value = v_client_discord_id)
      OR (v_client_ip IS NOT NULL AND target_value = v_client_ip)
    )
  LIMIT 1;

  IF v_blacklist_entry.target_value IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'BLACKLISTED_USER', 'message', 'บัญชีหรือ IP ของคุณถูกระงับการสั่งซื้อ: ' || COALESCE(v_blacklist_entry.reason, 'ระงับการให้บริการ'));
  END IF;

  -- Pre-check promo code usage (1 person / 1 use)
  IF v_promo_code IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.promo_code_usages WHERE user_id = v_target_user_id AND code = v_promo_code) THEN
      RETURN jsonb_build_object('success', false, 'error', 'PROMO_CODE_ALREADY_USED', 'message', 'คุณเคยใช้โค้ดส่วนลด "' || v_promo_code || '" ไปแล้ว ไม่สามารถใช้งานซ้ำได้');
    END IF;
  END IF;

  -- Price calculation
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
    SELECT price INTO v_real_unit_price FROM public.products WHERE id = v_product_id AND is_active = TRUE;
    IF v_real_unit_price IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_PRODUCT', 'message', 'ไม่พบสินค้ารหัส ' || COALESCE(v_product_id, 'UNKNOWN'));
    END IF;
    v_calculated_subtotal := v_calculated_subtotal + (v_real_unit_price * v_qty);
  END LOOP;

  -- Dynamic Promo Code Calculation from public.promo_codes
  IF v_promo_code IS NOT NULL THEN
    SELECT * INTO v_promo_rec
    FROM public.promo_codes
    WHERE code = v_promo_code AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (usage_limit IS NULL OR used_count < usage_limit);

    IF v_promo_rec.code IS NOT NULL THEN
      IF v_calculated_subtotal >= v_promo_rec.min_spend THEN
        IF v_promo_rec.discount_type = 'percent' THEN
          v_verified_discount := ROUND(v_calculated_subtotal * (v_promo_rec.discount_value / 100.00), 2);
          IF v_promo_rec.max_discount IS NOT NULL AND v_verified_discount > v_promo_rec.max_discount THEN
            v_verified_discount := v_promo_rec.max_discount;
          END IF;
        ELSE
          v_verified_discount := LEAST(v_promo_rec.discount_value, v_calculated_subtotal);
        END IF;
        UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = v_promo_code;
      END IF;
    ELSE
      v_verified_discount := LEAST(v_client_discount, v_calculated_subtotal);
    END IF;
  END IF;

  v_final_total := GREATEST(0.00, v_calculated_subtotal - v_verified_discount);

  -- Deduct wallet
  SELECT balance INTO v_current_balance FROM public.profiles WHERE id = v_target_user_id FOR UPDATE;
  IF v_current_balance IS NULL OR v_current_balance < v_final_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE', 'message', 'ยอดเงินในกระเป๋าไม่เพียงพอ (ต้องการ ฿' || v_final_total || ' มี ฿' || COALESCE(v_current_balance, 0) || ')');
  END IF;

  UPDATE public.profiles SET balance = balance - v_final_total, updated_at = NOW() WHERE id = v_target_user_id RETURNING balance INTO v_new_balance;

  -- Create Order
  INSERT INTO public.orders (id, user_id, total_amount, payment_method, status)
  VALUES (p_order_id, v_target_user_id, v_final_total, 'wallet', 'PAID');

  IF v_promo_code IS NOT NULL THEN
    INSERT INTO public.promo_code_usages (user_id, code, order_id, discount_amount, used_at)
    VALUES (v_target_user_id, v_promo_code, p_order_id, v_verified_discount, NOW());
  END IF;

  -- Dispense inventory items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'id';
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
    SELECT price, fulfillment_type INTO v_real_unit_price, v_fulfillment_type FROM public.products WHERE id = v_product_id;
    v_custom_data := v_item->'customData';
    v_item_credentials := '[]'::jsonb;

    IF v_fulfillment_type = 'instant' THEN
      FOR v_i IN 1..v_qty
      LOOP
        v_dispensed_key := public.dispense_product_key(v_product_id, p_order_id);
        v_item_credentials := v_item_credentials || jsonb_build_array(v_dispensed_key);
      END LOOP;
    END IF;

    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, delivered_content, custom_data)
    VALUES (p_order_id, v_product_id, v_qty, v_real_unit_price, v_item_credentials::text, v_custom_data);

    v_all_dispensed := v_all_dispensed || jsonb_build_array(jsonb_build_object(
      'id', v_product_id,
      'title', v_item->>'title',
      'quantity', v_qty,
      'credentials', v_item_credentials
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_amount', v_final_total,
    'discount_amount', v_verified_discount,
    'promo_code', v_promo_code,
    'new_balance', v_new_balance,
    'dispensed_items', v_all_dispensed
  );
END;
$$;
