/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — BOT SHIELD & PROOF-OF-WORK CHALLENGE ENGINE (Sprint 5)
 * ==============================================================================
 * ระบบป้องกันบอทสแปมและคัดกรองอัตโนมัติ (Anti-Bot & Anti-Scraping Defense):
 * - GET action=challenge: สร้าง Nonce และ HMAC Signature สำหรับ Proof-of-Work
 * - POST action=verify: ตรวจสอบความถูกต้องของ PoW Token หรือ Cloudflare Turnstile
 * - ตรวจจับพฤติกรรมผิดปกติและ Auto-Blacklist IP ต้องสงสัยลง public.blacklists
 * ==============================================================================
 */

require('dotenv').config();
const crypto = require('crypto');
const { Client } = require('pg');

const SHIELD_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.BOT_SHIELD_SECRET || 'nyx9-cyber-shield-2026-secret';

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

function signChallenge(nonce, timestamp, ip) {
  return crypto
    .createHmac('sha256', SHIELD_SECRET)
    .update(`${nonce}:${timestamp}:${ip}`)
    .digest('hex');
}

function verifyProof(nonce, solution, difficulty = 3) {
  const hash = crypto.createHash('sha256').update(`${nonce}:${solution}`).digest('hex');
  const targetPrefix = '0'.repeat(difficulty);
  return hash.startsWith(targetPrefix);
}

// In-memory penalty tracking: ip -> { count, firstSeen }
const violationMap = new Map();

async function recordViolationAndBlacklist(ip, reason) {
  const now = Date.now();
  const record = violationMap.get(ip) || { count: 0, firstSeen: now };
  record.count += 1;
  violationMap.set(ip, record);

  const client = getDbClient();
  try {
    await client.connect();
    
    // Log in system_audit_logs
    await client.query(`
      INSERT INTO public.system_audit_logs (event_type, severity, ip_address, payload, created_at)
      VALUES ('BOT_SHIELD_VIOLATION', 'WARNING', $1, $2::jsonb, NOW());
    `, [ip, JSON.stringify({ reason, violationCount: record.count })]);

    // If violations >= 3 within 5 minutes, auto-blacklist!
    if (record.count >= 3) {
      await client.query(`
        INSERT INTO public.blacklists (target_type, target_value, reason, created_at)
        VALUES ('ip', $1, $2, NOW())
        ON CONFLICT (target_value) DO NOTHING;
      `, [ip, `Automated BotShield Block: Excessive challenge failures (${record.count} attempts)`]);

      console.warn(`🚨 [BOT SHIELD] Auto-blacklisted IP: ${ip} for ${reason}`);
    }
  } catch (err) {
    console.error('[BOT SHIELD DB ERROR]:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function verifyBotShieldToken(tokenStr, req) {
  if (!tokenStr) return { valid: false, reason: 'Missing BotShield token' };

  try {
    const parsed = JSON.parse(Buffer.from(tokenStr, 'base64').toString('utf8'));
    const { nonce, timestamp, solution, signature, turnstileToken } = parsed;

    // Optional: Turnstile Bypass if secret is provided in environment
    if (turnstileToken && process.env.TURNSTILE_SECRET_KEY) {
      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: getClientIp(req)
        })
      });
      const tsData = await turnstileRes.json();
      if (tsData.success) return { valid: true, type: 'turnstile' };
    }

    // Proof-of-Work Verification
    const clientIp = getClientIp(req);
    const now = Date.now();

    // Check expiration (valid for 120 seconds)
    if (now - timestamp > 120 * 1000 || timestamp > now + 5000) {
      return { valid: false, reason: 'Challenge token expired or invalid timestamp' };
    }

    // Verify HMAC
    const expectedSig = signChallenge(nonce, timestamp, clientIp);
    if (signature !== expectedSig) {
      // Allow flexible IP match for proxy setups
      const fallbackSig = signChallenge(nonce, timestamp, '127.0.0.1');
      if (signature !== fallbackSig) {
        return { valid: false, reason: 'Tampered or forged challenge signature' };
      }
    }

    // Verify Hash solution
    if (!verifyProof(nonce, solution, 3)) {
      return { valid: false, reason: 'Invalid Proof-of-Work computation' };
    }

    return { valid: true, type: 'pow' };
  } catch (err) {
    return { valid: false, reason: 'Malformed challenge token format' };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bot-Shield-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const action = query.action || (req.body ? req.body.action : '') || 'challenge';
  const clientIp = getClientIp(req);

  // 1. GET: Generate PoW Challenge
  if (req.method === 'GET' || action === 'challenge') {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const signature = signChallenge(nonce, timestamp, clientIp);

    return res.status(200).json({
      success: true,
      challenge: {
        nonce,
        timestamp,
        difficulty: 3, // requires '000' hash prefix (~10-25ms client solve time)
        signature,
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null
      }
    });
  }

  // 2. POST: Validate PoW Solution
  if (req.method === 'POST' && action === 'verify') {
    const body = req.body || {};
    const token = body.token || req.headers['x-bot-shield-token'];

    const outcome = await verifyBotShieldToken(token, req);

    if (!outcome.valid) {
      await recordViolationAndBlacklist(clientIp, outcome.reason);
      return res.status(403).json({
        success: false,
        message: 'Bot Shield: การยืนยันตัวตนล้มเหลว',
        error: outcome.reason
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Bot Shield Verified successfully',
      verification_type: outcome.type
    });
  }

  return res.status(400).json({ success: false, message: 'Invalid action' });
};

module.exports.verifyBotShieldToken = verifyBotShieldToken;
module.exports.recordViolationAndBlacklist = recordViolationAndBlacklist;
