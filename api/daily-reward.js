/**
 * ==============================================================================
 * 🎁 DAILY FREE CHEST & REWARD ENGINE API (Serverless Handler)
 * ==============================================================================
 * ระบบสุ่มแจกของรางวัล / แต้มสะสมฟรีรายวันสำหรับสมาชิก (24-Hour Cooldown)
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

const COOLDOWN_HOURS = 24;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Edge Rate Limiting: Max 20 requests / min per IP
  if (!checkRateLimit(req, res, { action: 'daily-reward', limit: 20, windowMs: 60 * 1000 })) {
    return;
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});

  // ---------------------------------------------------------------------------
  // 1. GET: Check Daily Chest Eligibility & Cooldown
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    const userId = query.user_id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "กรุณาระบุ user_id" });
    }

    const client = getDbClient();
    try {
      await client.connect();

      const lastClaimRes = await client.query(`
        SELECT claimed_at, streak_count, reward_amount 
        FROM public.daily_rewards 
        WHERE user_id = $1 
        ORDER BY claimed_at DESC 
        LIMIT 1;
      `, [userId]);

      if (lastClaimRes.rowCount === 0) {
        return res.status(200).json({
          success: true,
          can_claim: true,
          streak_count: 0,
          message: "คุณมีสิทธิ์เปิดกล่องสุ่มฟรีรายวันได้ทันที!"
        });
      }

      const lastClaim = lastClaimRes.rows[0];
      const lastTime = new Date(lastClaim.claimed_at).getTime();
      const elapsedMs = Date.now() - lastTime;
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        const remainingHours = (remainingSec / 3600).toFixed(1);
        return res.status(200).json({
          success: true,
          can_claim: false,
          remaining_seconds: remainingSec,
          remaining_hours: remainingHours,
          streak_count: lastClaim.streak_count || 1,
          last_claimed_at: lastClaim.claimed_at,
          message: `คุณเปิดกล่องสุ่มวันนี้ไปแล้ว กรุณารออีกประมาณ ${remainingHours} ชั่วโมง`
        });
      }

      return res.status(200).json({
        success: true,
        can_claim: true,
        streak_count: lastClaim.streak_count || 1,
        message: "คุณมีสิทธิ์เปิดกล่องสุ่มฟรีรายวันได้ทันที!"
      });

    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      await client.end().catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // 2. POST: Claim Daily Reward
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    const { user_id } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ success: false, message: "กรุณาระบุ user_id สำหรับการเปิดกล่องสุ่ม" });
    }

    const client = getDbClient();
    try {
      await client.connect();
      await client.query('BEGIN');

      // Check last claim
      const lastClaimRes = await client.query(`
        SELECT claimed_at, streak_count 
        FROM public.daily_rewards 
        WHERE user_id = $1 
        ORDER BY claimed_at DESC 
        LIMIT 1 
        FOR UPDATE;
      `, [user_id]);

      let streakCount = 1;
      if (lastClaimRes.rowCount > 0) {
        const lastClaim = lastClaimRes.rows[0];
        const lastTime = new Date(lastClaim.claimed_at).getTime();
        const elapsedMs = Date.now() - lastTime;
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

        if (elapsedMs < cooldownMs) {
          await client.query('ROLLBACK');
          const remainingHours = (((cooldownMs - elapsedMs) / 1000) / 3600).toFixed(1);
          return res.status(429).json({
            success: false,
            code: "DAILY_COOLDOWN_ACTIVE",
            message: `คุณเปิดกล่องสุ่มไปแล้ว กรุณารออีกประมาณ ${remainingHours} ชั่วโมง`,
            remaining_hours: remainingHours
          });
        }

        // Streak logic: if claimed within 48h, increment streak, else reset to 1
        if (elapsedMs <= 48 * 60 * 60 * 1000) {
          streakCount = (lastClaim.streak_count || 1) + 1;
        }
      }

      // Calculate reward: 10 points base + bonus for streaks up to 25 points
      const basePoints = 10;
      const streakBonus = Math.min(15, (streakCount - 1) * 2);
      const totalPointsAwarded = basePoints + streakBonus;

      // Insert claim record
      await client.query(`
        INSERT INTO public.daily_rewards (user_id, reward_type, reward_amount, streak_count, claimed_at)
        VALUES ($1, 'points', $2, $3, NOW());
      `, [user_id, totalPointsAwarded, streakCount]);

      // Credit points to user profile
      const updateRes = await client.query(`
        UPDATE public.profiles 
        SET points = COALESCE(points, 0) + $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING points;
      `, [totalPointsAwarded, user_id]);

      await client.query('COMMIT');

      const newPoints = updateRes.rows[0]?.points || totalPointsAwarded;

      return res.status(200).json({
        success: true,
        points_awarded: totalPointsAwarded,
        new_points: Number(newPoints),
        streak_count: streakCount,
        message: `ยินดีด้วย! คุณได้รับ +${totalPointsAwarded} พอยท์สะสม (สถิติเช็คอินต่อเนื่อง ${streakCount} วัน)`
      });

    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      await client.end().catch(() => {});
    }
  }

  return res.status(405).json({ message: "Method Not Allowed" });
};
