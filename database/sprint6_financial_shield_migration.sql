-- ==============================================================================
-- 🛡️ SPRINT 6: FINANCIAL INTEGRITY & ANTI-FRAUD SHIELD MIGRATION
-- ==============================================================================
-- 1. เพิ่มคอลัมน์ image_hash สำหรับ Pre-OCR Slip Duplicate Detection
-- 2. สร้าง Partial Unique Index ป้องกันสลิปซ้ำระดับ Database Index
-- 3. อัปเกรด Stored Procedure process_topup ให้ตรวจจับและบันทึก image_hash
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ image_hash ใน public.used_payment_slips
ALTER TABLE public.used_payment_slips
ADD COLUMN IF NOT EXISTS image_hash TEXT;

-- 2. สร้าง Unique Index บน image_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_used_slips_image_hash 
ON public.used_payment_slips (image_hash) 
WHERE image_hash IS NOT NULL;

-- 3. อัปเกรด Stored Procedure public.process_topup
CREATE OR REPLACE FUNCTION public.process_topup(
  p_gateway text, 
  p_trans_ref text, 
  p_amount numeric, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_raw_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_existing_slip_id UUID;
  v_existing_topup_id UUID;
  v_topup_id UUID;
  v_new_balance NUMERIC := 0.00;
  v_points_earned NUMERIC := 0.00;
  v_new_points NUMERIC := 0.00;
  v_user_discord_id TEXT;
  v_client_ip TEXT;
  v_client_discord_id TEXT;
  v_image_hash TEXT;
  v_blacklist_entry RECORD;
BEGIN
  -- Extract IP, discordId, and image_hash from raw payload
  v_client_ip := NULLIF(TRIM(COALESCE(p_raw_payload->>'ip', p_raw_payload->>'ip_address', '')), '');
  v_client_discord_id := NULLIF(TRIM(COALESCE(p_raw_payload->>'discordId', p_raw_payload->>'discord_id', '')), '');
  v_image_hash := NULLIF(TRIM(COALESCE(p_raw_payload->>'image_hash', p_raw_payload->>'slip_image_hash', '')), '');

  -- Lookup profile discord_id if user_id is provided
  IF p_user_id IS NOT NULL THEN
    SELECT discord_id INTO v_user_discord_id
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  -- 0. AUTOMATED BLACKLIST AUTO-QUERY (Security Guard)
  SELECT target_type, target_value, reason INTO v_blacklist_entry
  FROM public.blacklists
  WHERE (expires_at IS NULL OR expires_at > NOW())
    AND (
      (p_user_id IS NOT NULL AND target_value = p_user_id::text)
      OR (v_user_discord_id IS NOT NULL AND target_value = v_user_discord_id)
      OR (v_client_discord_id IS NOT NULL AND target_value = v_client_discord_id)
      OR (v_client_ip IS NOT NULL AND target_value = v_client_ip)
    )
  LIMIT 1;

  IF v_blacklist_entry.target_value IS NOT NULL THEN
    -- Audit log the security rejection
    INSERT INTO public.system_audit_logs (
      event_type,
      severity,
      user_id,
      payload
    )
    VALUES (
      'BLACKLIST_BLOCKED_TOPUP',
      'CRITICAL',
      p_user_id,
      jsonb_build_object(
        'gateway', p_gateway,
        'trans_ref', p_trans_ref,
        'blocked_target', v_blacklist_entry.target_value,
        'target_type', v_blacklist_entry.target_type,
        'reason', v_blacklist_entry.reason,
        'client_ip', v_client_ip,
        'timestamp', NOW()
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'BLACKLISTED_USER',
      'message', 'บัญชีหรือไอพีของคุณถูกระงับการเติมเงินเนื่องจากติดแบล็กลิสต์: ' || COALESCE(v_blacklist_entry.reason, 'ระงับการให้บริการ')
    );
  END IF;

  -- 1. Anti-Double-Spend for PromptPay & Bank Transfer
  IF p_gateway IN ('promptpay', 'bank_transfer') THEN
    -- 1.1 ตรวจสอบความซ้ำซ้อนของ TransRef
    SELECT id INTO v_existing_slip_id 
    FROM public.used_payment_slips 
    WHERE slip_trans_ref = p_trans_ref 
    LIMIT 1;

    IF v_existing_slip_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_SLIP',
        'message', 'สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้ (Anti-Double-Spend Triggered)'
      );
    END IF;

    -- 1.2 ตรวจสอบความซ้ำซ้อนของ Pre-OCR Image Hash (ถ้ามี)
    IF v_image_hash IS NOT NULL THEN
      SELECT id INTO v_existing_slip_id
      FROM public.used_payment_slips
      WHERE image_hash = v_image_hash
      LIMIT 1;

      IF v_existing_slip_id IS NOT NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'DUPLICATE_SLIP_IMAGE',
          'message', 'รูปภาพสลิปนี้ถูกใช้งานในระบบไปแล้ว (Pre-OCR Image Hash Cache Triggered)'
        );
      END IF;
    END IF;

    -- 1.3 บันทึกสลิปพร้อม image_hash ลงฐานข้อมูล
    INSERT INTO public.used_payment_slips (slip_trans_ref, amount, user_id, gateway, raw_payload, image_hash)
    VALUES (p_trans_ref, p_amount, p_user_id, p_gateway, p_raw_payload, v_image_hash);
  END IF;

  -- 2. Anti-Dupe for TrueMoney Gift Voucher
  IF p_gateway = 'truemoney' THEN
    SELECT id INTO v_existing_topup_id
    FROM public.topup_transactions
    WHERE gateway = 'truemoney' AND trans_ref = p_trans_ref
    LIMIT 1;

    IF v_existing_topup_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_VOUCHER',
        'message', 'ซองของขวัญนี้ถูกรับเงินไปแล้ว ไม่สามารถใช้ซ้ำได้'
      );
    END IF;
  END IF;

  -- 3. Anti-Dupe for Card Payment
  IF p_gateway = 'card_payment' THEN
    SELECT id INTO v_existing_topup_id
    FROM public.topup_transactions
    WHERE gateway = 'card_payment' AND trans_ref = p_trans_ref
    LIMIT 1;

    IF v_existing_topup_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_CARD_AUTH',
        'message', 'รายการชำระด้วยบัตรนี้ถูกประมวลผลไปแล้ว'
      );
    END IF;
  END IF;

  -- Record Topup
  INSERT INTO public.topup_transactions (
    user_id,
    gateway,
    amount,
    bonus_amount,
    status,
    trans_ref
  )
  VALUES (
    p_user_id,
    p_gateway,
    p_amount,
    0.00,
    'SUCCESS',
    p_trans_ref
  )
  RETURNING id INTO v_topup_id;

  IF p_user_id IS NOT NULL THEN
    v_points_earned := FLOOR(p_amount * 0.10); -- 10% Loyalty Points Cashback
    UPDATE public.profiles
    SET balance = balance + p_amount,
        points = COALESCE(points, 0) + v_points_earned,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance, points INTO v_new_balance, v_new_points;
  END IF;

  INSERT INTO public.system_audit_logs (
    event_type,
    user_id,
    order_id,
    payload
  )
  VALUES (
    'TOPUP_SUCCESS',
    p_user_id,
    v_topup_id::text,
    jsonb_build_object(
      'gateway', p_gateway,
      'amount', p_amount,
      'points_earned', v_points_earned,
      'trans_ref', p_trans_ref,
      'image_hash', v_image_hash,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'topup_id', v_topup_id,
    'gateway', p_gateway,
    'amount', p_amount,
    'trans_ref', p_trans_ref,
    'new_balance', v_new_balance,
    'points_earned', v_points_earned,
    'new_points', v_new_points,
    'message', 'เติมเงินสำเร็จเรียบร้อยแล้ว'
  );
END;
$function$;
