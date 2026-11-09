/**
 * ==============================================================================
 * ⚡ NYX9 STUDIO — DEVELOPER USER API GATEWAY (Sprint 5)
 * ==============================================================================
 * ให้บริการ API สำหรับร้านค้าคู่ค้า (Wholesale Resellers & Bot Developers):
 * - POST action=generate_key: สร้าง Developer API Key สำหรับนำไปยิงซื้ออัตโนมัติ
 * - GET action=keys: เรียกดูรายการ API Key ของผู้ใช้
 * - POST action=revoke_key: ยกเลิกใช้งาน API Key
 * - GET action=stock: ยิงเช็กสต็อกสินค้า Real-time (ต้องมี Bearer nyx_sec_...)
 * - POST action=purchase: สั่งซื้อสินค้าผ่าน API ตัดเงินจากยอดคงเหลือในกระเป๋า
 * ==============================================================================
 */

require('dotenv').config();
const crypto = require('crypto');
const { Client } = require('pg');

function getDbClient() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('Database connection string missing in environment variables.');
  }
  return new Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(String(rawKey).trim()).digest('hex');
}

async function authenticateApiKey(authHeader, client) {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token.startsWith('nyx_sec_')) return null;

  const keyHash = hashKey(token);
  const res = await client.query(`
    SELECT k.id, k.user_id, k.label, k.is_active, p.username, p.balance, p.role
    FROM public.user_api_keys k
    JOIN public.profiles p ON k.user_id = p.id
    WHERE k.key_hash = $1 AND k.is_active = TRUE;
  `, [keyHash]);

  if (res.rows.length === 0) return null;

  // Update last_used_at
  await client.query(`
    UPDATE public.user_api_keys 
    SET last_used_at = NOW() 
    WHERE id = $1;
  `, [res.rows[0].id]).catch(() => {});

  return res.rows[0];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const action = query.action || (req.body ? req.body.action : '') || 'stock';
  const client = getDbClient();

  try {
    await client.connect();

    // -------------------------------------------------------------------------
    // 1. ACTION: GENERATE NEW API KEY (POST)
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'generate_key') {
      const userId = req.body?.user_id || query.user_id;
      const label = String(req.body?.label || 'Bot Integration Key').trim();

      if (!userId) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ user_id ของเจ้าของคีย์' });
      }

      // Check User exists
      const userCheck = await client.query('SELECT id, username FROM public.profiles WHERE id = $1::uuid;', [userId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' });
      }

      const rawKey = `nyx_sec_${crypto.randomBytes(24).toString('hex')}`;
      const prefix = `${rawKey.slice(0, 16)}...`;
      const keyHash = hashKey(rawKey);

      const ins = await client.query(`
        INSERT INTO public.user_api_keys (user_id, key_hash, key_prefix, label, is_active, created_at)
        VALUES ($1::uuid, $2, $3, $4, TRUE, NOW())
        RETURNING id, key_prefix, label, created_at;
      `, [userId, keyHash, prefix, label]);

      return res.status(200).json({
        success: true,
        message: 'สร้าง Developer API Key สำเร็จ! กรุณาคัดลอกเก็บไว้ คีย์นี้จะแสดงเพียงครั้งเดียวเท่านั้น',
        api_key: rawKey,
        key_record: ins.rows[0]
      });
    }

    // -------------------------------------------------------------------------
    // 2. ACTION: LIST USER KEYS (GET)
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'keys') {
      const userId = query.user_id;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Missing user_id' });
      }

      const list = await client.query(`
        SELECT id, key_prefix, label, is_active, created_at, last_used_at
        FROM public.user_api_keys
        WHERE user_id = $1::uuid
        ORDER BY created_at DESC;
      `, [userId]);

      return res.status(200).json({
        success: true,
        keys: list.rows
      });
    }

    // -------------------------------------------------------------------------
    // 3. ACTION: REVOKE KEY (POST)
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'revoke_key') {
      const keyId = req.body?.key_id;
      const userId = req.body?.user_id;

      if (!keyId || !userId) {
        return res.status(400).json({ success: false, message: 'Missing key_id or user_id' });
      }

      await client.query(`
        UPDATE public.user_api_keys
        SET is_active = FALSE
        WHERE id = $1::uuid AND user_id = $2::uuid;
      `, [keyId, userId]);

      return res.status(200).json({
        success: true,
        message: 'ยกเลิกการใช้งาน API Key เรียบร้อยแล้ว'
      });
    }

    // -------------------------------------------------------------------------
    // 4. ACTION: PROGRAMMATIC STOCK QUERY (GET) [Bearer nyx_sec_...]
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'stock') {
      const authUser = await authenticateApiKey(req.headers['authorization'], client);
      if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or inactive Developer API Key' });
      }

      const isReseller = authUser.role === 'reseller';

      const prods = await client.query(`
        SELECT id, title, price, reseller_price, stock, is_active
        FROM public.products
        WHERE is_active = TRUE
        ORDER BY title ASC;
      `);

      const formatted = prods.rows.map(p => ({
        id: p.id,
        title: p.title,
        retail_price: parseFloat(p.price),
        reseller_price: p.reseller_price ? parseFloat(p.reseller_price) : parseFloat(p.price),
        your_price: isReseller && p.reseller_price ? parseFloat(p.reseller_price) : parseFloat(p.price),
        stock: parseInt(p.stock, 10),
        in_stock: p.stock > 0
      }));

      return res.status(200).json({
        success: true,
        authenticated_user: {
          username: authUser.username,
          role: authUser.role,
          wallet_balance: parseFloat(authUser.balance)
        },
        products: formatted
      });
    }

    // -------------------------------------------------------------------------
    // 5. ACTION: PROGRAMMATIC HEADLESS PURCHASE (POST) [Bearer nyx_sec_...]
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'purchase') {
      const authUser = await authenticateApiKey(req.headers['authorization'], client);
      if (!authUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or inactive Developer API Key' });
      }

      const productId = String(req.body?.product_id || '').trim();
      const quantity = Math.max(1, parseInt(req.body?.quantity || '1', 10));

      if (!productId) {
        return res.status(400).json({ success: false, message: 'Missing product_id' });
      }

      // Check product and pricing
      const prodRes = await client.query('SELECT id, title, price, reseller_price, stock FROM public.products WHERE id = $1;', [productId]);
      if (prodRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const prod = prodRes.rows[0];
      const isReseller = authUser.role === 'reseller';
      const unitPrice = isReseller && prod.reseller_price ? parseFloat(prod.reseller_price) : parseFloat(prod.price);
      const totalPrice = unitPrice * quantity;

      if (parseFloat(authUser.balance) < totalPrice) {
        return res.status(402).json({
          success: false,
          message: `ยอดเงินในกระเป๋าไม่เพียงพอ (ต้องการ ฿${totalPrice.toFixed(2)}, คงเหลือ ฿${parseFloat(authUser.balance).toFixed(2)})`
        });
      }

      const orderRef = `API-WX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Execute order via Stored Procedure execute_order_checkout
      const itemsPayload = JSON.stringify([{
        product_id: prod.id,
        variant_id: null,
        title: prod.title,
        price: unitPrice,
        quantity: quantity
      }]);

      const checkoutRes = await client.query(`
        SELECT public.execute_order_checkout(
          $1::uuid,
          $2::numeric,
          $3::jsonb,
          $4,
          NULL,
          $5
        ) AS result;
      `, [authUser.user_id, totalPrice, itemsPayload, 'user_wallet', orderRef]);

      const outcome = checkoutRes.rows[0]?.result;
      if (!outcome || !outcome.success) {
        return res.status(400).json({
          success: false,
          message: outcome?.message || 'Checkout failed (Out of stock or system locked)'
        });
      }

      // Retrieve dispensed credentials
      const vaultKeysRes = await client.query(`
        SELECT credential_data
        FROM public.credentials_vault
        WHERE order_id = $1;
      `, [orderRef]);

      const keys = vaultKeysRes.rows.map(r => r.credential_data);

      return res.status(200).json({
        success: true,
        message: 'สั่งซื้อสำเร็จผ่าน Developer API',
        order_id: orderRef,
        product: prod.title,
        quantity: quantity,
        total_charged: totalPrice,
        new_wallet_balance: outcome.new_balance,
        credentials: keys
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (err) {
    console.error('[DEVELOPER GATEWAY ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผล Developer Gateway',
      error: err.message
    });
  } finally {
    await client.end().catch(() => {});
  }
};
