/**
 * ==============================================================================
 * 🛡️ HIGH-PERFORMANCE EDGE & SERVERLESS RATE LIMITER
 * ==============================================================================
 * ป้องกันการ Brute-Force สุ่มรหัสสลิป (TransRef) และซองของขวัญ TrueMoney
 * รองรับ Cloudflare (CF-Connecting-IP), Vercel Edge, และ Node.js Serverless
 * จำกัดเริ่มต้น 5 requests / นาที ต่อ 1 IP
 * ==============================================================================
 */

// In-memory sliding window cache: key -> Array of timestamps (ms)
const rateLimitMap = new Map();

// Periodic GC every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeExpiredEntries(now, windowMs) {
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(ts => now - ts < windowMs);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}

/**
 * Extract client IP from various edge and proxy headers
 */
function getClientIp(req) {
  if (!req) return '127.0.0.1';

  // 1. Cloudflare Edge
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp) return cfIp.trim();

  // 2. Nginx / AWS ALB / Reverse Proxies
  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp) return xRealIp.trim();

  // 3. Standard forwarded header (first IP is the real client)
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    const parts = xForwardedFor.split(',');
    if (parts.length > 0 && parts[0].trim()) {
      return parts[0].trim();
    }
  }

  // 4. Fallback to socket/connection
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Check if the request exceeds rate limits.
 * If exceeded, sets HTTP 429 headers and returns false.
 * If allowed, sets RateLimit headers and returns true.
 *
 * @param {object} req - HTTP Request
 * @param {object} res - HTTP Response
 * @param {object} options - Configuration options
 * @param {number} [options.limit=5] - Maximum requests allowed within window
 * @param {number} [options.windowMs=60000] - Window size in milliseconds (default: 60s)
 * @param {string} [options.action='api'] - Namespace prefix for this limit
 * @returns {boolean} true if request is allowed, false if rejected with 429
 */
function checkRateLimit(req, res, options = {}) {
  const limit = options.limit || 5;
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const action = options.action || (req.url ? req.url.split('?')[0] : 'api');

  const now = Date.now();

  // Clean expired entries periodically
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    purgeExpiredEntries(now, windowMs);
    lastCleanup = now;
  }

  const clientIp = getClientIp(req);
  const cacheKey = `${action}:${clientIp}`;

  const timestamps = rateLimitMap.get(cacheKey) || [];
  // Filter only timestamps within the sliding window
  const activeTimestamps = timestamps.filter(ts => now - ts < windowMs);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    const resetTimeSec = Math.ceil((oldest + windowMs) / 1000);

    // Set standard rate limit headers
    if (res.setHeader) {
      res.setHeader('Retry-After', retryAfterSec.toString());
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTimeSec.toString());
    }

    if (res.status && typeof res.status === 'function') {
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `คุณส่งคำขอถี่เกินไป กรุณารอ ${retryAfterSec} วินาทีก่อนทำรายการใหม่ (จำกัด ${limit} ครั้ง/นาที)`,
        retryAfter: retryAfterSec
      });
    }

    return false;
  }

  // Record this request
  activeTimestamps.push(now);
  rateLimitMap.set(cacheKey, activeTimestamps);

  const remaining = Math.max(0, limit - activeTimestamps.length);
  const resetTimeSec = Math.ceil((activeTimestamps[0] + windowMs) / 1000);

  if (res.setHeader) {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTimeSec.toString());
  }

  return true;
}

/**
 * Reset rate limit cache (Useful for automated testing)
 */
function resetRateLimitStore() {
  rateLimitMap.clear();
}

module.exports = {
  checkRateLimit,
  getClientIp,
  resetRateLimitStore
};
