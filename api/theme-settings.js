/**
 * ==============================================================================
 * 🎨 THEME SETTINGS & LIVE CSS CONFIG API (Serverless Handler)
 * ==============================================================================
 * จัดการการตั้งค่าธีมสีและ Custom CSS ของร้านค้าแบบเรียลไทม์
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

const DEFAULT_THEME = {
  preset: "glacier_cyan",
  accent: "#00F0FF",
  accentHover: "#00D2E0",
  accentGlow: "rgba(0, 240, 255, 0.2)",
  customCss: ""
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Secret, X-Admin-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Edge Rate Limiting: Max 30 requests / min per IP
  if (!checkRateLimit(req, res, { action: 'theme-settings', limit: 30, windowMs: 60 * 1000 })) {
    return;
  }

  // ---------------------------------------------------------------------------
  // 1. GET: Fetch active store theme configuration
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    let client = null;
    try {
      client = getDbClient();
      await client.connect();

      const result = await client.query("SELECT value FROM public.system_settings WHERE key = 'theme_config' LIMIT 1;");
      const theme = result.rows.length > 0 && result.rows[0].value ? result.rows[0].value : DEFAULT_THEME;

      return res.status(200).json({
        success: true,
        theme
      });
    } catch (err) {
      console.warn('[THEME SETTINGS] DB read error, using default:', err.message);
      return res.status(200).json({
        success: true,
        theme: DEFAULT_THEME,
        fallback: true
      });
    } finally {
      if (client) await client.end().catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // 2. POST: Update store theme configuration (Admin only)
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    const adminSecret = req.headers['x-admin-secret'] || req.headers['x-admin-key'] || req.body?.adminSecret;
    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_PIN || '409567';

    // Verify admin credential
    if (adminSecret !== expectedSecret && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        message: 'ปฏิเสธการเข้าถึง: ต้องการรหัสผ่านแอดมินสำหรับการบันทึกธีม'
      });
    }

    const { preset, accent, accentHover, accent_hover, accentGlow, accent_glow, customCss, custom_css } = req.body || {};

    if (!accent || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบรหัสสี Accent Color ไม่ถูกต้อง (ต้องเป็น Hex Color เช่น #00F0FF)'
      });
    }

    const hoverColor = accentHover || accent_hover || accent;
    const glowColor = accentGlow || accent_glow || 'rgba(0, 240, 255, 0.2)';
    const cssText = typeof customCss === 'string' ? customCss : (typeof custom_css === 'string' ? custom_css : '');

    const themeConfig = {
      preset: preset || 'custom',
      accent: accent,
      accentHover: hoverColor,
      accent_hover: hoverColor,
      accentGlow: glowColor,
      accent_glow: glowColor,
      customCss: cssText.slice(0, 10000),
      custom_css: cssText.slice(0, 10000)
    };

    let client = null;
    try {
      client = getDbClient();
      await client.connect();

      await client.query(`
        INSERT INTO public.system_settings (key, value, updated_at, updated_by)
        VALUES ('theme_config', $1, NOW(), 'admin')
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW(), updated_by = 'admin';
      `, [JSON.stringify(themeConfig)]);

      return res.status(200).json({
        success: true,
        message: 'บันทึกการตั้งค่าธีมร้านค้าเรียบร้อยแล้ว',
        theme: themeConfig
      });
    } catch (err) {
      console.error('[THEME SETTINGS] Save error:', err);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการบันทึกธีมลงฐานข้อมูล',
        error: err.message
      });
    } finally {
      if (client) await client.end().catch(() => {});
    }
  }

  return res.status(405).json({ message: "Method Not Allowed" });
};
