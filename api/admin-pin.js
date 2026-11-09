/**
 * ==============================================================================
 * 🔐 NYX9 STUDIO — ADMIN PIN 2FA SECURITY LAYER (Serverless Handler)
 * ==============================================================================
 * ป้องกันการเข้าถึงแอดมินพาเนล (admin.html) ด้วยระบบ 2-Factor Authentication:
 * 1. ขอรับ OTP 6 หลัก ส่งตรงเข้า Discord Webhook ของเจ้าของร้าน
 * 2. ตรวจสอบรหัส PIN 6 หลักและเปรียบเทียบ SHA-256 Hash ในฐานข้อมูล
 * 3. จำกัดเวลาใช้งาน PIN 5 นาที พร้อมระบบบล็อกการ Brute-Force
 * 4. ออก HMAC-SHA256 Session Token อายุ 4 ชั่วโมงสำหรับ Admin Session
 * ==============================================================================
 */

require('dotenv').config();
const crypto = require('crypto');
const { Client } = require('pg');
const { checkRateLimit } = require('./rate-limiter');

function getDbClient() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('Database connection string missing in environment variables.');
  }
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
}

const PIN_SECRET = process.env.ADMIN_PIN_SECRET || process.env.ADMIN_SECRET || 'nyx9_pin_hmac_secret_2026';
const PIN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes validity
const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours session validity

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin) + PIN_SECRET).digest('hex');
}

function createSessionToken() {
  const expiresAt = Date.now() + SESSION_EXPIRY_MS;
  const payload = `admin_auth:${expiresAt}`;
  const signature = crypto.createHmac('sha256', PIN_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

function verifySessionToken(token) {
  try {
    if (!token) return false;
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const { payload, signature } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', PIN_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) return false;

    const [, expiresAtStr] = payload.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);
    return Date.now() < expiresAt;
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const action = query.action || req.body?.action;

  // -------------------------------------------------------------------------
  // 1. ACTION: CHECK PIN 2FA STATUS (GET)
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && action === 'status') {
    const authHeader = req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    const isSessionValid = verifySessionToken(authHeader);

    const client = getDbClient();
    try {
      await client.connect();
      const cfgRes = await client.query('SELECT enabled, updated_at FROM public.admin_pin_config WHERE id = 1;');
      const isEnabled = cfgRes.rows[0]?.enabled ?? true;

      return res.status(200).json({
        success: true,
        pin_enabled: isEnabled,
        authenticated: isSessionValid,
        has_active_pin: cfgRes.rowCount > 0 && (Date.now() - new Date(cfgRes.rows[0].updated_at).getTime() < PIN_EXPIRY_MS)
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      await client.end().catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // 2. ACTION: VERIFY ACTIVE SESSION TOKEN (GET/POST)
  // -------------------------------------------------------------------------
  if (action === 'verify_token') {
    const token = req.body?.token || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    const isValid = verifySessionToken(token);
    return res.status(isValid ? 200 : 401).json({
      success: isValid,
      authenticated: isValid,
      message: isValid ? 'Session token valid' : 'Session expired or invalid'
    });
  }

  // Rate Limiting for PIN Operations: Max 5 requests / min
  if (!checkRateLimit(req, res, { action: 'admin_pin', limit: 5, windowMs: 60 * 1000 })) {
    return;
  }

  // -------------------------------------------------------------------------
  // 3. ACTION: REQUEST OTP PIN DISPATCHED TO DISCORD (POST)
  // -------------------------------------------------------------------------
  if (req.method === 'POST' && action === 'request_otp') {
    const randomPin = String(Math.floor(100000 + Math.random() * 900000));
    const hashed = hashPin(randomPin);

    const client = getDbClient();
    try {
      await client.connect();

      // Upsert into admin_pin_config
      await client.query(`
        INSERT INTO public.admin_pin_config (id, pin_hash, enabled, updated_at)
        VALUES (1, $1, TRUE, NOW())
        ON CONFLICT (id) DO UPDATE
        SET pin_hash = EXCLUDED.pin_hash, updated_at = NOW();
      `, [hashed]);

      // Dispatch to Discord Webhook
      let discordSent = false;
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

      if (webhookUrl && webhookUrl.startsWith('https://discord.com')) {
        try {
          const dcRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '🔐 รหัสยืนยันตัวตนแอดมิน (Admin 2FA Security PIN)',
                description: `มีคำขอเข้าสู่ระบบควบคุมหลังบ้านจาก IP \`${req.headers['x-forwarded-for'] || 'Local Admin'}\`\n\n**รหัส PIN 6 หลัก:**\n# || ${randomPin} ||\n\n*(รหัสนี้มีอายุใช้งาน 5 นาที)*`,
                color: 0x00F2FF,
                footer: { text: 'NYX9 STUDIO Security Guard' },
                timestamp: new Date().toISOString()
              }]
            })
          });
          discordSent = dcRes.ok;
        } catch (dcErr) {
          console.warn('[ADMIN PIN DISCORD DISPATCH NOTE]:', dcErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: discordSent 
          ? 'ส่งรหัส PIN 6 หลักเข้า Discord Webhook เรียบร้อยแล้ว (มีอายุ 5 นาที)'
          : 'สร้างรหัส PIN สำเร็จ (โหมดพัฒนา: โปรดตรวจสอบ Discord หรือคอนโซล)',
        expires_in_seconds: 300,
        // In local development without webhook, provide debug hint
        ...(process.env.NODE_ENV !== 'production' && !discordSent ? { dev_pin: randomPin } : {})
      });

    } catch (err) {
      console.error('[ADMIN PIN REQUEST ERROR]:', err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างรหัส PIN' });
    } finally {
      await client.end().catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // 4. ACTION: VERIFY 6-DIGIT PIN (POST)
  // -------------------------------------------------------------------------
  if (req.method === 'POST' && action === 'verify') {
    const pin = String(req.body?.pin || '').trim();

    if (!pin || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัส PIN เป็นตัวเลข 6 หลักให้ถูกต้อง'
      });
    }

    const client = getDbClient();
    try {
      await client.connect();

      const cfgRes = await client.query('SELECT pin_hash, enabled, updated_at FROM public.admin_pin_config WHERE id = 1;');
      if (cfgRes.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'ยังไม่มีการสร้างรหัส PIN กรุณากดปุ่ม "ขอรหัส PIN ทาง Discord" ก่อน'
        });
      }

      const { pin_hash, enabled, updated_at } = cfgRes.rows[0];

      // Check PIN expiration
      const ageMs = Date.now() - new Date(updated_at).getTime();
      if (ageMs > PIN_EXPIRY_MS) {
        return res.status(400).json({
          success: false,
          code: 'PIN_EXPIRED',
          message: 'รหัส PIN นี้หมดอายุแล้ว (เกิน 5 นาที) กรุณากดขอรหัส PIN ใหม่'
        });
      }

      // Verify Hash
      const inputHash = hashPin(pin);
      if (inputHash !== pin_hash) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_PIN',
          message: 'รหัส PIN 6 หลักไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
        });
      }

      // Issue Session Token
      const sessionToken = createSessionToken();

      return res.status(200).json({
        success: true,
        message: 'ยืนยันรหัส PIN 2FA ถูกต้อง ยินดีต้อนรับเข้าสู่ระบบแอดมิน',
        token: sessionToken,
        expires_in_hours: 4
      });

    } catch (err) {
      console.error('[ADMIN PIN VERIFY ERROR]:', err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ PIN' });
    } finally {
      await client.end().catch(() => {});
    }
  }

  return res.status(400).json({ success: false, message: `ไม่รู้จัก action: '${action}'` });
};
