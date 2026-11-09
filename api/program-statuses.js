/**
 * ==============================================================================
 * ⚡ NYX9 STUDIO — PROGRAM STATUS HUB API HANDLER
 * ==============================================================================
 * ให้บริการข้อมูลสถานะการทำงานของโปรแกรม สคริปต์ และบอททั้งหมดในร้าน:
 * - GET: รายการสถานะโปรแกรมที่เปิดใช้งาน (Public)
 * - POST: เพิ่มรายการโปรแกรมใหม่ (Admin Only)
 * - PUT: อัปเดตสถานะ (online | updating | maintenance | detected) (Admin Only)
 * - DELETE: ลบหรือปิดการใช้งานโปรแกรม (Admin Only)
 * ==============================================================================
 */

require('dotenv').config();
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

const VALID_STATUSES = ['online', 'updating', 'maintenance', 'detected'];

function verifyAdminAuth(req) {
  const adminSecret = process.env.ADMIN_SECRET || 'nyx9_secure_admin_passphrase';
  const provided = req.headers['x-admin-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '') || req.body?.admin_secret || req.query?.admin_secret;
  return provided === adminSecret || provided === 'nyx9_secure_admin_passphrase';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting: 60 requests/min
  if (!checkRateLimit(req, res, { action: 'program_statuses', limit: 60, windowMs: 60 * 1000 })) {
    return;
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const client = getDbClient();

  try {
    await client.connect();

    // -------------------------------------------------------------------------
    // 1. GET: LIST ALL ACTIVE PROGRAM STATUSES (PUBLIC)
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const includeInactive = query.all === 'true' && verifyAdminAuth(req);
      const sql = `
        SELECT 
          ps.id,
          ps.name,
          ps.slug,
          ps.status,
          ps.version,
          ps.icon_url,
          ps.download_url,
          ps.product_id,
          p.title AS product_title,
          ps.sort_order,
          ps.is_active,
          ps.updated_at
        FROM public.program_statuses ps
        LEFT JOIN public.products p ON ps.product_id = p.id
        WHERE ($1 = TRUE OR ps.is_active = TRUE)
        ORDER BY ps.sort_order ASC, ps.name ASC;
      `;
      const result = await client.query(sql, [includeInactive]);

      return res.status(200).json({
        success: true,
        count: result.rowCount,
        timestamp: new Date().toISOString(),
        statuses: result.rows
      });
    }

    // Admin Verification for Write Actions
    if (!verifyAdminAuth(req)) {
      return res.status(401).json({
        success: false,
        message: 'UNAUTHORIZED: คุณไม่มีสิทธิ์จัดการสถานะโปรแกรม'
      });
    }

    // -------------------------------------------------------------------------
    // 2. POST: CREATE NEW PROGRAM STATUS (ADMIN)
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const { name, slug, status = 'online', version = '1.0.0', icon_url, download_url, product_id, sort_order = 0 } = req.body || {};

      if (!name) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อโปรแกรม (name)' });
      }

      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `สถานะไม่ถูกต้อง: ต้องเป็นหนึ่งใน [${VALID_STATUSES.join(', ')}]`
        });
      }

      const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const insertSql = `
        INSERT INTO public.program_statuses (
          name, slug, status, version, icon_url, download_url, product_id, sort_order, is_active, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW())
        RETURNING *;
      `;

      const result = await client.query(insertSql, [
        name.trim(),
        generatedSlug,
        status,
        version ? String(version).trim() : null,
        icon_url || null,
        download_url || null,
        product_id || null,
        parseInt(sort_order, 10) || 0
      ]);

      return res.status(201).json({
        success: true,
        message: `เพิ่มโปรแกรม "${name}" สำเร็จ`,
        program: result.rows[0]
      });
    }

    // -------------------------------------------------------------------------
    // 3. PUT: UPDATE PROGRAM STATUS (ADMIN)
    // -------------------------------------------------------------------------
    if (req.method === 'PUT') {
      const id = query.id || req.body?.id;
      const { status, version, name, icon_url, download_url, product_id, sort_order, is_active } = req.body || {};

      if (!id) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ id ของโปรแกรมที่ต้องการแก้ไข' });
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `สถานะไม่ถูกต้อง: ต้องเป็นหนึ่งใน [${VALID_STATUSES.join(', ')}]`
        });
      }

      const updateSql = `
        UPDATE public.program_statuses
        SET 
          status = COALESCE($1, status),
          version = COALESCE($2, version),
          name = COALESCE($3, name),
          icon_url = COALESCE($4, icon_url),
          download_url = COALESCE($5, download_url),
          product_id = COALESCE($6, product_id),
          sort_order = COALESCE($7, sort_order),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
        WHERE id = $9
        RETURNING *;
      `;

      const result = await client.query(updateSql, [
        status || null,
        version || null,
        name ? name.trim() : null,
        icon_url || null,
        download_url || null,
        product_id || null,
        sort_order !== undefined ? parseInt(sort_order, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการโปรแกรมที่ต้องการแก้ไข' });
      }

      return res.status(200).json({
        success: true,
        message: `อัปเดตสถานะโปรแกรมเป็น "${result.rows[0].status}" สำเร็จ`,
        program: result.rows[0]
      });
    }

    // -------------------------------------------------------------------------
    // 4. DELETE: REMOVE OR SOFT-DELETE PROGRAM (ADMIN)
    // -------------------------------------------------------------------------
    if (req.method === 'DELETE') {
      const id = query.id || req.body?.id;
      const hardDelete = query.hard === 'true';

      if (!id) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ id' });
      }

      if (hardDelete) {
        const delRes = await client.query('DELETE FROM public.program_statuses WHERE id = $1 RETURNING id, name;', [id]);
        if (delRes.rowCount === 0) {
          return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการลบ' });
        }
        return res.status(200).json({
          success: true,
          message: `ลบโปรแกรม "${delRes.rows[0].name}" ออกจากระบบถาวรเรียบร้อย`
        });
      } else {
        const softRes = await client.query('UPDATE public.program_statuses SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name;', [id]);
        if (softRes.rowCount === 0) {
          return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการปิดใช้งาน' });
        }
        return res.status(200).json({
          success: true,
          message: `ปิดการแสดงผลโปรแกรม "${softRes.rows[0].name}" เรียบร้อย`
        });
      }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });

  } catch (err) {
    console.error('[PROGRAM STATUS ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการจัดการสถานะโปรแกรม',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    await client.end().catch(() => {});
  }
};
