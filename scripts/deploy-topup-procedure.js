const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- Stored Procedure: Atomic Topup Processing (PromptPay & TrueMoney)
CREATE OR REPLACE FUNCTION public.process_topup(
  p_gateway TEXT,
  p_trans_ref TEXT,
  p_amount NUMERIC,
  p_user_id UUID DEFAULT NULL,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_slip_id UUID;
  v_existing_topup_id UUID;
  v_topup_id UUID;
  v_new_balance NUMERIC := 0.00;
BEGIN
  -- Anti-Double-Spend Validation: PromptPay
  IF p_gateway = 'promptpay' THEN
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

    -- Record used slip
    INSERT INTO public.used_payment_slips (slip_trans_ref, amount, user_id, gateway, raw_payload)
    VALUES (p_trans_ref, p_amount, p_user_id, p_gateway, p_raw_payload);
  END IF;

  -- Anti-Double-Spend Validation: TrueMoney
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

  -- Record topup transaction
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

  -- Atomically update user balance if user_id is provided
  IF p_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;
  END IF;

  -- System Audit Log
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
      'trans_ref', p_trans_ref,
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
    'message', 'เติมเงินสำเร็จเรียบร้อยแล้ว'
  );
END;
$$;

-- Grant execution to public / authenticated / anon
GRANT EXECUTE ON FUNCTION public.process_topup(TEXT, TEXT, NUMERIC, UUID, JSONB) TO anon, authenticated, service_role;
`;

async function main() {
  await client.connect();
  console.log('Deploying process_topup procedure...');
  await client.query(sql);
  console.log('✅ process_topup procedure deployed successfully!');
  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
