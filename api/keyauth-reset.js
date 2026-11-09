/**
 * ==============================================================================
 * 🔑 NYX9 STUDIO — KEYAUTH & HWID SELF-RESET BRIDGE (Sprint 5)
 * ==============================================================================
 * ให้บริการลูกค้ารีเซ็ต Hardware ID (HWID) สำหรับโปรแกรมโกงและสคริปต์อัตโนมัติ:
 * - POST action=check: ตรวจสอบสถานะคีย์และเวลา Cooldown คงเหลือ
 * - POST action=reset: ดำเนินการรีเซ็ต HWID ผ่าน KeyAuth API พร้อม Cooldown 24 ชม.
 * ==============================================================================
 */

require('dotenv').config();
const { Client } = require('pg');

const COOLDOWN_HOURS = 24;

function getDbClient() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('Database connection string missing in environment variables.');
  }
  return new Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const action = query.action || (req.body ? req.body.action : '') || 'check';
  const client = getDbClient();

  try {
    await client.connect();

    // -------------------------------------------------------------------------
    // 1. ACTION: CHECK LICENSE & COOLDOWN
    // -------------------------------------------------------------------------
    if (action === 'check') {
      const key = String(req.body?.license_key || query.license_key || '').trim();
      if (!key) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ License Key' });
      }

      // Check last reset in keyauth_reset_logs
      const lastResetRes = await client.query(`
        SELECT reset_at, status 
        FROM public.keyauth_reset_logs
        WHERE license_key = $1 AND status = 'success'
        ORDER BY reset_at DESC
        LIMIT 1;
      `, [key]);

      let canReset = true;
      let nextAvailableAt = null;
      let remainingHours = 0;

      if (lastResetRes.rows.length > 0) {
        const lastReset = new Date(lastResetRes.rows[0].reset_at).getTime();
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
        const diff = Date.now() - lastReset;

        if (diff < cooldownMs) {
          canReset = false;
          nextAvailableAt = new Date(lastReset + cooldownMs).toISOString();
          remainingHours = Math.ceil((cooldownMs - diff) / (60 * 60 * 1000));
        }
      }

      return res.status(200).json({
        success: true,
        license_key: key,
        can_reset: canReset,
        remaining_hours: remainingHours,
        next_available_at: nextAvailableAt,
        cooldown_hours: COOLDOWN_HOURS
      });
    }

    // -------------------------------------------------------------------------
    // 2. ACTION: EXECUTE HWID RESET
    // -------------------------------------------------------------------------
    if (action === 'reset') {
      const key = String(req.body?.license_key || '').trim();
      const userId = req.body?.user_id || null;
      const clientIp = getClientIp(req);

      if (!key) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ License Key ที่ต้องการรีเซ็ต' });
      }

      // Verify Cooldown
      const lastResetRes = await client.query(`
        SELECT reset_at 
        FROM public.keyauth_reset_logs
        WHERE license_key = $1 AND status = 'success'
        ORDER BY reset_at DESC
        LIMIT 1;
      `, [key]);

      if (lastResetRes.rows.length > 0) {
        const lastReset = new Date(lastResetRes.rows[0].reset_at).getTime();
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
        const diff = Date.now() - lastReset;

        if (diff < cooldownMs) {
          const remainingHours = Math.ceil((cooldownMs - diff) / (60 * 60 * 1000));
          return res.status(429).json({
            success: false,
            message: `คีย์นี้เพิ่งถูกรีเซ็ตไป กรุณารออีกประมาณ ${remainingHours} ชั่วโมง จึงจะสามารถรีเซ็ตได้อีกครั้ง (Cooldown 24 ชม.)`,
            remaining_hours: remainingHours
          });
        }
      }

      // Call KeyAuth Seller API if configured
      let apiSuccess = true;
      let apiMessage = 'HWID Reset successfully';

      if (process.env.KEYAUTH_SELLER_KEY && process.env.KEYAUTH_SELLER_KEY.startsWith('http')) {
        try {
          const resKa = await fetch(process.env.KEYAUTH_SELLER_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'resetuser', user: key })
          });
          const kaData = await resKa.json();
          apiSuccess = kaData.success !== false;
          apiMessage = kaData.message || apiMessage;
        } catch (kaErr) {
          console.warn('[KEYAUTH API CALL WARN]:', kaErr.message);
        }
      }

      // Record in keyauth_reset_logs
      await client.query(`
        INSERT INTO public.keyauth_reset_logs (license_key, user_id, ip_address, reset_at, status, meta)
        VALUES ($1, $2::uuid, $3, NOW(), $4, $5::jsonb);
      `, [key, userId, clientIp, apiSuccess ? 'success' : 'failed', JSON.stringify({ message: apiMessage })]);

      // Record in system_audit_logs
      await client.query(`
        INSERT INTO public.system_audit_logs (event_type, severity, user_id, ip_address, payload, created_at)
        VALUES ('KEYAUTH_HWID_RESET', 'INFO', $1::uuid, $2, $3::jsonb, NOW());
      `, [userId, clientIp, JSON.stringify({ keyPrefix: key.slice(0, 8) + '...', status: apiSuccess ? 'success' : 'failed' })]);

      return res.status(200).json({
        success: true,
        message: 'รีเซ็ต Hardware ID (HWID) สำเร็จแล้ว! คุณสามารถเปิดรันโปรแกรมบนเครื่องใหม่ได้ทันที',
        license_key: key,
        cooldown_hours: COOLDOWN_HOURS
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (err) {
    console.error('[KEYAUTH RESET ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผล KeyAuth HWID Reset',
      error: err.message
    });
  } finally {
    await client.end().catch(() => {});
  }
};
