/**
 * ==============================================================================
 * 🕵️ NYX9 STUDIO — ADMIN ACCESS SENTINEL & AUDIT TRAIL API (Sprint 5)
 * ==============================================================================
 * - GET action=list: ดึงบันทึกประวัติการเข้าหลังบ้านและตรวจจับพฤติกรรมผิดปกติ
 * - GET action=blacklists: ดึงรายการ IP และผู้ใช้ที่ถูกขึ้นบัญชีดำ
 * - POST action=blacklist_ip: สั่ง Blacklist IP ต้องสงสัย 1-Click
 * - POST action=remove_blacklist: ปลดแบน IP
 * ==============================================================================
 */

require('dotenv').config();
const { Client } = require('pg');

function getDbClient() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('Database connection string missing.');
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const action = query.action || (req.body ? req.body.action : '') || 'list';
  const client = getDbClient();

  try {
    await client.connect();

    // 1. GET: รายการประวัติการเข้าถึง (Access Logs)
    if (req.method === 'GET' && action === 'list') {
      const limit = Math.min(100, Math.max(10, parseInt(query.limit || '50', 10)));
      const result = await client.query(`
        SELECT id, event_type, severity, ip_address, user_agent, payload, created_at
        FROM public.system_audit_logs
        WHERE event_type IN ('ADMIN_LOGIN_SUCCESS', 'ADMIN_LOGIN_FAILED', 'ADMIN_PIN_ATTEMPT', 'ADMIN_BLOCKED_ATTEMPT', 'BOT_SHIELD_VIOLATION')
           OR event_type LIKE 'ADMIN_%'
        ORDER BY created_at DESC
        LIMIT $1;
      `, [limit]);

      return res.status(200).json({
        success: true,
        logs: result.rows
      });
    }

    // 2. GET: รายการ Blacklist
    if (req.method === 'GET' && action === 'blacklists') {
      const result = await client.query(`
        SELECT id, target_type, target_value, reason, created_at
        FROM public.blacklists
        ORDER BY created_at DESC
        LIMIT 100;
      `);

      return res.status(200).json({
        success: true,
        blacklists: result.rows
      });
    }

    // 3. POST: Blacklist IP 1-Click
    if (req.method === 'POST' && action === 'blacklist_ip') {
      const body = req.body || {};
      const targetIp = String(body.ip || query.ip || '').trim();
      const reason = String(body.reason || 'Admin Manual Blacklist via Access Sentinel').trim();

      if (!targetIp) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ IP Address ที่ต้องการบล็อก' });
      }

      await client.query(`
        INSERT INTO public.blacklists (target_type, target_value, reason, created_at)
        VALUES ('ip', $1, $2, NOW())
        ON CONFLICT (target_value) DO UPDATE SET reason = EXCLUDED.reason;
      `, [targetIp, reason]);

      // บันทึกลง Audit Log
      await client.query(`
        INSERT INTO public.system_audit_logs (event_type, severity, ip_address, payload, created_at)
        VALUES ('ADMIN_MANUAL_BLACKLIST', 'CRITICAL', $1, $2::jsonb, NOW());
      `, [getClientIp(req), JSON.stringify({ blacklistedIp: targetIp, reason })]);

      return res.status(200).json({
        success: true,
        message: `บล็อก IP ${targetIp} เรียบร้อยแล้ว ระบบจะตัดการเชื่อมต่อทันที`,
        ip: targetIp
      });
    }

    // 4. POST: ปลดแบน IP (Remove Blacklist)
    if (req.method === 'POST' && action === 'remove_blacklist') {
      const body = req.body || {};
      const targetIp = String(body.ip || query.ip || '').trim();

      if (!targetIp) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ IP Address' });
      }

      await client.query(`
        DELETE FROM public.blacklists
        WHERE target_value = $1;
      `, [targetIp]);

      return res.status(200).json({
        success: true,
        message: `ปลดแบน IP ${targetIp} เรียบร้อยแล้ว`,
        ip: targetIp
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (err) {
    console.error('[ADMIN AUDIT API ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Audit Sentinel',
      error: err.message
    });
  } finally {
    await client.end().catch(() => {});
  }
};
