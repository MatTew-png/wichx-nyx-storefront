/**
 * ==============================================================================
 * 📦 NYX9 STUDIO — ADVANCED BACKEND STOCK & VAULT API HANDLER
 * ==============================================================================
 * รองรับการจัดการคลังสต็อกระดับ Enterprise:
 * 1. Bulk Ingestion: อัปโหลดไฟล์ .txt/.csv หรือแปะ Textarea (ตัดแยก \n สูงสุด 10,000 ชิ้น)
 * 2. Deduplication Trap: ตรวจจับและข้ามคีย์ซ้ำผ่าน SHA-256 / MD5 Hash อัตโนมัติ
 * 3. Variant Partitioning: แยกสต็อกตามตัวเลือกย่อย (Variants)
 * 4. Audit Trail: แยกหมวด Available (พร้อมขาย) และ Sold (ขายแล้ว)
 * 5. Re-Sync & Clear: รีแคลคูเลตสต็อกตรงกับฐานข้อมูล และล้างสต็อกเฉพาะสินค้า
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting: 60 requests/min for Admin Stock Operations
  if (!checkRateLimit(req, res, { action: 'stock_manager', limit: 60, windowMs: 60 * 1000 })) {
    return;
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const action = query.action || req.body?.action;
  const client = getDbClient();

  try {
    await client.connect();

    // -------------------------------------------------------------------------
    // ACTION 1: BULK INSERT STOCK (TEXTAREA OR .TXT/.CSV CONTENT)
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'bulk') {
      const { product_id, variant_id = null, keys } = req.body || {};

      if (!product_id || !keys) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน: ต้องระบุ product_id และ keys'
        });
      }

      // Convert keys to array if it is a string
      let rawKeys = [];
      if (Array.isArray(keys)) {
        rawKeys = keys;
      } else if (typeof keys === 'string') {
        rawKeys = keys.split(/\r?\n/);
      }

      // Sanitize, trim and filter empty lines
      const sanitizedKeys = rawKeys
        .map(k => String(k).trim())
        .filter(k => k.length > 0);

      if (sanitizedKeys.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบรายการรหัสที่ถูกต้อง (เนื้อหาว่างเปล่า)'
        });
      }

      // Safety limit: 10,000 keys per batch
      if (sanitizedKeys.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'เกินขีดจำกัดความจุ: สามารถเพิ่มได้สูงสุด 10,000 รายการต่อรอบ'
        });
      }

      // Execute Stored Procedure fn_bulk_insert_stock
      const query = `
        SELECT added_count, skipped_count 
        FROM public.fn_bulk_insert_stock($1, $2, $3);
      `;
      const result = await client.query(query, [
        String(product_id),
        variant_id || null,
        sanitizedKeys
      ]);

      const { added_count = 0, skipped_count = 0 } = result.rows[0] || {};

      // Get updated product stock count
      const syncResult = await client.query(
        'SELECT public.fn_sync_product_stock($1) AS new_stock;',
        [String(product_id)]
      );
      const newStock = syncResult.rows[0]?.new_stock ?? 0;

      return res.status(200).json({
        success: true,
        message: `เพิ่มสต็อกสำเร็จ ${added_count} รายการ${skipped_count > 0 ? ` (ข้าม ${skipped_count} รายการที่ซ้ำ)` : ''}`,
        added_count: Number(added_count),
        skipped_count: Number(skipped_count),
        total_processed: sanitizedKeys.length,
        current_stock: Number(newStock)
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 2: LIST STOCK ITEMS (AVAILABLE VS SOLD AUDIT TRAIL)
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'list') {
      const productId = query.product_id;
      const variantId = query.variant_id || null;
      const status = query.status || 'available'; // 'available' | 'sold'
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
      const offset = (page - 1) * limit;

      if (!productId) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ product_id' });
      }

      const isSold = status === 'sold';

      // 1. Get total count for available and sold
      const countQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE is_sold = FALSE) AS available_count,
          COUNT(*) FILTER (WHERE is_sold = TRUE) AS sold_count
        FROM public.credentials_vault
        WHERE product_id = $1
          AND ($2::uuid IS NULL OR variant_id = $2);
      `;
      const countRes = await client.query(countQuery, [productId, variantId]);
      const availableCount = Number(countRes.rows[0]?.available_count || 0);
      const soldCount = Number(countRes.rows[0]?.sold_count || 0);

      // 2. Query paginated list
      const listQuery = `
        SELECT 
          id,
          product_id,
          variant_id,
          public.vault_decrypt(credential_data) AS credential_data,
          is_sold,
          sold_at,
          order_id,
          sold_to_user_id,
          created_at
        FROM public.credentials_vault
        WHERE product_id = $1
          AND ($2::uuid IS NULL OR variant_id = $2)
          AND is_sold = $3
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5;
      `;
      const listRes = await client.query(listQuery, [productId, variantId, isSold, limit, offset]);

      return res.status(200).json({
        success: true,
        status,
        available_count: availableCount,
        sold_count: soldCount,
        pagination: {
          page,
          limit,
          total: isSold ? soldCount : availableCount,
          total_pages: Math.ceil((isSold ? soldCount : availableCount) / limit)
        },
        items: listRes.rows
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 3: RE-SYNC PRODUCT STOCK COUNT
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'sync') {
      const productId = req.body?.product_id || query.product_id;
      if (!productId) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ product_id' });
      }

      const syncResult = await client.query(
        'SELECT public.fn_sync_product_stock($1) AS current_stock;',
        [String(productId)]
      );
      const currentStock = Number(syncResult.rows[0]?.current_stock || 0);

      return res.status(200).json({
        success: true,
        message: 'ซิงก์จำนวนสต็อกกับฐานข้อมูลสำเร็จ',
        product_id: productId,
        current_stock: currentStock
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 4: CLEAR ALL UNSOLD STOCK FOR PRODUCT
    // -------------------------------------------------------------------------
    if (req.method === 'DELETE' && action === 'clear') {
      const productId = query.product_id || req.body?.product_id;
      const variantId = query.variant_id || req.body?.variant_id || null;

      if (!productId) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ product_id' });
      }

      const deleteQuery = `
        DELETE FROM public.credentials_vault
        WHERE product_id = $1
          AND ($2::uuid IS NULL OR variant_id = $2)
          AND is_sold = FALSE
        RETURNING id;
      `;
      const deleteRes = await client.query(deleteQuery, [String(productId), variantId]);
      const deletedCount = deleteRes.rowCount || 0;

      // Re-sync stock count
      await client.query('SELECT public.fn_sync_product_stock($1);', [String(productId)]);

      return res.status(200).json({
        success: true,
        message: `ล้างสต็อกที่ยังไม่ขายสำเร็จ (${deletedCount} รายการ)`,
        deleted_count: deletedCount
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 5: DELETE SINGLE UNSOLD ITEM
    // -------------------------------------------------------------------------
    if (req.method === 'DELETE' && action === 'delete_item') {
      const id = query.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ id' });
      }

      const deleteQuery = `
        DELETE FROM public.credentials_vault
        WHERE id = $1 AND is_sold = FALSE
        RETURNING product_id;
      `;
      const resDel = await client.query(deleteQuery, [id]);

      if (resDel.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบรายการสต็อก หรือรายการนี้ถูกขายไปแล้ว'
        });
      }

      const productId = resDel.rows[0]?.product_id;
      if (productId) {
        await client.query('SELECT public.fn_sync_product_stock($1);', [productId]);
      }

      return res.status(200).json({
        success: true,
        message: 'ลบรายการสต็อกสำเร็จ'
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 6: LIST PRODUCT VARIANTS
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'variants') {
      const productId = query.product_id;
      if (!productId) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ product_id' });
      }

      const varRes = await client.query(`
        SELECT id, product_id, name, sku, price, is_active, created_at
        FROM public.product_variants
        WHERE product_id = $1
        ORDER BY created_at ASC;
      `, [productId]);

      return res.status(200).json({
        success: true,
        variants: varRes.rows
      });
    }

    return res.status(400).json({
      success: false,
      message: `ไม่รู้จัก action: '${action}'`
    });

  } catch (err) {
    console.error('[STOCK MANAGER ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในระบบสต็อก',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    await client.end().catch(() => {});
  }
};
