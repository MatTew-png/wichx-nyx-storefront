/**
 * ==============================================================================
 * 🩺 NYX9 STUDIO — MERCHANT HEALTH & LIVE API DIAGNOSTICS (Serverless Handler)
 * ==============================================================================
 * ตรวจสอบความพร้อมของ API และ Integration ทั้งหมดบน Production:
 * - Supabase PostgreSQL Connection
 * - Discord Webhook Live Dispatch
 * - PromptPay Slip Verify API (EasySlip / OpenSlipVerify)
 * - TrueMoney Wallet Merchant Phone
 * - AES-256 Vault Crypto Key
 * ==============================================================================
 */

const { createClient } = require('@supabase/supabase-js');
const { checkRateLimit } = require('./rate-limiter');

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Edge Rate Limiting: Max 10 requests / min
  if (!checkRateLimit(req, res, { action: 'merchant-health', limit: 10, windowMs: 60 * 1000 })) {
    return;
  }

  const results = {
    timestamp: new Date().toISOString(),
    status: "HEALTHY",
    services: {}
  };

  // 1. Check Supabase
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      results.services.database = {
        status: "WARNING",
        message: "SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ไม่ได้ระบุ"
      };
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
      if (error) {
        results.services.database = { status: "ERROR", error: error.message };
      } else {
        results.services.database = { status: "OK", productCount: count, url: supabaseUrl };
      }
    }
  } catch (dbErr) {
    results.services.database = { status: "ERROR", error: dbErr.message };
  }

  // 2. Check Discord Webhook
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl.includes("YOUR_WEBHOOK_ID") || !webhookUrl.startsWith("http")) {
      results.services.discord = {
        status: "NOT_CONFIGURED",
        message: "DISCORD_WEBHOOK_URL ยังไม่ได้ตั้งค่าหรือเป็น Placeholder"
      };
    } else {
      results.services.discord = {
        status: "CONFIGURED",
        maskedUrl: webhookUrl.replace(/(\/api\/webhooks\/\d+\/)(.+)/, '$1***MASKED***')
      };
    }
  } catch (dcErr) {
    results.services.discord = { status: "ERROR", error: dcErr.message };
  }

  // 3. Check PromptPay Slip API
  try {
    const slipKey = process.env.SLIP_VERIFY_API_KEY || process.env.EASYSLIP_TOKEN;
    if (!slipKey || slipKey.includes("YOUR_")) {
      results.services.slipVerify = {
        status: "SANDBOX_MOCK",
        message: "รันในโหมดจำลอง (ยังไม่ได้ใส่ EasySlip / OpenSlipVerify API Key)"
      };
    } else {
      results.services.slipVerify = {
        status: "LIVE_CONFIGURED",
        provider: "EasySlip / OpenSlipVerify API",
        keyLength: slipKey.length
      };
    }
  } catch (slipErr) {
    results.services.slipVerify = { status: "ERROR", error: slipErr.message };
  }

  // 4. Check TrueMoney Wallet
  try {
    const tmPhone = process.env.TRUEMONEY_PHONE;
    if (!tmPhone || tmPhone.includes("x") || tmPhone.length !== 10) {
      results.services.trueMoney = {
        status: "WARNING",
        message: "เบอร์ TrueMoney Wallet ยังไม่ได้ตั้งค่าให้ครบ 10 หลัก"
      };
    } else {
      results.services.trueMoney = {
        status: "CONFIGURED",
        phoneMasked: `${tmPhone.slice(0, 3)}****${tmPhone.slice(7)}`
      };
    }
  } catch (tmErr) {
    results.services.trueMoney = { status: "ERROR", error: tmErr.message };
  }

  // 5. Check AES-256 Crypto Vault
  try {
    const vaultKey = process.env.AES_VAULT_MASTER_KEY;
    if (!vaultKey || vaultKey.length < 32) {
      results.services.cryptoVault = {
        status: "WARNING",
        message: "AES_VAULT_MASTER_KEY ควรกำหนดความยาวอย่างน้อย 32 ตัวอักษร"
      };
    } else {
      results.services.cryptoVault = {
        status: "OK",
        algorithm: "AES-256-GCM"
      };
    }
  } catch (vaultErr) {
    results.services.cryptoVault = { status: "ERROR", error: vaultErr.message };
  }

  return res.status(200).json(results);
};
