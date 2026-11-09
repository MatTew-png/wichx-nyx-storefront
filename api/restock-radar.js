/**
 * ==============================================================================
 * 🔔 NYX9 STUDIO — RESTOCK RADAR API ENGINE (Sprint 4)
 * ==============================================================================
 * ให้บริการระบบแจ้งเตือนสินค้าเติมสต็อกอัตโนมัติ (Restock DM Radar):
 * - POST action=subscribe: ลูกค้าลงทะเบียนรับการแจ้งเตือนเมื่อสินค้าหมด (stock = 0)
 * - POST action=dispatch: ยิงแจ้งเตือนหาลูกค้าที่รอคอยเมื่อแอดมินเติมสต็อกสินค้า
 * - GET: รายการการแจ้งเตือนของผู้ใช้ หรือจำนวนคิวที่รอสินค้า
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting: 60 requests/min
  if (!checkRateLimit(req, res, { action: 'restock_radar', limit: 60, windowMs: 60 * 1000 })) {
    return;
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const client = getDbClient();

  try {
    await client.connect();

    // -------------------------------------------------------------------------
    // 1. GET: รายการแจ้งเตือนของผู้ใช้ หรือสรุปคิวของสินค้า
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const userId = query.user_id;
      const productId = query.product_id;

      if (userId) {
        const result = await client.query(`
          SELECT rn.id, rn.product_id, rn.status, rn.created_at, rn.notified_at,
                 p.title AS product_title, p.price, p.stock
          FROM public.restock_notifications rn
          LEFT JOIN public.products p ON rn.product_id = p.id
          WHERE rn.user_id = $1::uuid
          ORDER BY rn.created_at DESC;
        `, [userId]);

        return res.status(200).json({
          success: true,
          subscriptions: result.rows
        });
      }

      if (productId) {
        const countRes = await client.query(`
          SELECT COUNT(*) AS pending_count
          FROM public.restock_notifications
          WHERE product_id = $1 AND status = 'pending';
        `, [productId]);

        return res.status(200).json({
          success: true,
          product_id: productId,
          pending_count: parseInt(countRes.rows[0]?.pending_count || 0, 10)
        });
      }

      // Default: Total pending queue
      const totalRes = await client.query(`
        SELECT COUNT(*) AS total_pending
        FROM public.restock_notifications
        WHERE status = 'pending';
      `);

      return res.status(200).json({
        success: true,
        total_pending: parseInt(totalRes.rows[0]?.total_pending || 0, 10)
      });
    }

    // -------------------------------------------------------------------------
    // 2. POST: กระทำการ (subscribe หรือ dispatch)
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || query.action || 'subscribe';

      // -----------------------------------------------------------------------
      // Action A: SUBSCRIBE (ลงทะเบียนรับแจ้งเตือน)
      // -----------------------------------------------------------------------
      if (action === 'subscribe') {
        const productId = String(body.product_id || query.product_id || '').trim();
        const discordId = String(body.discord_id || body.contact || query.discord_id || '').trim();
        const userId = body.user_id || query.user_id || null;
        const variantId = body.variant_id || null;

        if (!productId) {
          return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสสินค้า (product_id)' });
        }
        if (!discordId && !userId) {
          return res.status(400).json({ success: false, message: 'กรุณาระบุ Discord Tag หรือ User ID สำหรับแจ้งเตือน' });
        }

        // ตรวจสอบว่าสินค้ามีอยู่จริง
        const prodCheck = await client.query('SELECT id, title, stock FROM public.products WHERE id = $1;', [productId]);
        if (prodCheck.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'ไม่พบสินค้าในระบบ' });
        }
        const product = prodCheck.rows[0];

        // Insert or Re-activate notification
        const insertRes = await client.query(`
          INSERT INTO public.restock_notifications (
            product_id, variant_id, user_id, discord_id, status, created_at, notified_at
          )
          VALUES ($1, $2, $3::uuid, $4, 'pending', NOW(), NULL)
          ON CONFLICT (product_id, COALESCE(variant_id::TEXT, ''), COALESCE(user_id::TEXT, discord_id))
          DO UPDATE SET 
            status = 'pending', 
            created_at = NOW(), 
            notified_at = NULL,
            discord_id = EXCLUDED.discord_id
          RETURNING id, product_id, discord_id, status;
        `, [
          productId,
          variantId,
          userId || null,
          discordId || null
        ]);

        return res.status(200).json({
          success: true,
          message: `ลงทะเบียนแจ้งเตือนสินค้า "${product.title}" เรียบร้อยแล้ว!`,
          subscription: insertRes.rows[0]
        });
      }

      // -----------------------------------------------------------------------
      // Action B: DISPATCH (กระจายข้อความแจ้งเตือนเมื่อสินค้าเติมสต็อก)
      // -----------------------------------------------------------------------
      if (action === 'dispatch') {
        const productId = String(body.product_id || query.product_id || '').trim();
        const addedCount = parseInt(body.added_count || query.added_count || 1, 10);

        if (!productId) {
          return res.status(400).json({ success: false, message: 'กรุณาระบุ product_id ที่เติมสต็อก' });
        }

        // ค้นหาคิวสมาชิกที่รอสินค้านี้อยู่ (status = 'pending')
        const pendingSubscribers = await client.query(`
          SELECT rn.id, rn.product_id, rn.user_id, rn.discord_id,
                 p.title AS product_title, p.price, p.stock
          FROM public.restock_notifications rn
          LEFT JOIN public.products p ON rn.product_id = p.id
          WHERE rn.product_id = $1 AND rn.status = 'pending'
          FOR UPDATE OF rn SKIP LOCKED;
        `, [productId]);

        const subscribers = pendingSubscribers.rows;

        if (subscribers.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'ไม่มีสมาชิกรอการแจ้งเตือนสำหรับสินค้านี้',
            notified_count: 0
          });
        }

        const subIds = subscribers.map(s => s.id);
        const productTitle = subscribers[0].product_title || productId;

        // อัปเดตสถานะเป็น 'notified' และบันทึกเวลา
        await client.query(`
          UPDATE public.restock_notifications
          SET status = 'notified', notified_at = NOW()
          WHERE id = ANY($1::uuid[]);
        `, [subIds]);

        // ส่งข้อความแจ้งเตือนเข้า Discord Webhook
        if (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.startsWith('http')) {
          try {
            const mentions = subscribers
              .filter(s => s.discord_id)
              .map(s => /^\d{17,19}$/.test(s.discord_id) ? `<@${s.discord_id}>` : `\`${s.discord_id}\``)
              .join(' ');

            await fetch(process.env.DISCORD_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: mentions ? `🔔 แจ้งเตือนสินค้าเติมสต็อก: ${mentions}` : undefined,
                embeds: [{
                  title: '🎉 สินค้าเติมสต็อกแล้ว! (Restock Radar Dispatch)',
                  color: 0x10B981,
                  fields: [
                    { name: '📦 สินค้า', value: `**${productTitle}**`, inline: true },
                    { name: '⚡ เติมเพิ่ม', value: `+${addedCount} ชิ้น`, inline: true },
                    { name: '👥 ลูกค้าที่รอคอย', value: `${subscribers.length} ท่าน`, inline: true }
                  ],
                  footer: { text: 'NYX9 STUDIO • 24/7 Automated Restock Radar' },
                  timestamp: new Date().toISOString()
                }]
              })
            }).catch(() => {});
          } catch (_) {}
        }

        return res.status(200).json({
          success: true,
          message: `แจ้งเตือนลูกค้าสำเร็จ ${subscribers.length} ท่าน`,
          notified_count: subscribers.length,
          product_id: productId,
          product_title: productTitle
        });
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('[RESTOCK RADAR API ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผลระบบ Restock Radar',
      error: err.message
    });
  } finally {
    await client.end().catch(() => {});
  }
};
