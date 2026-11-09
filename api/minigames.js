/**
 * ==============================================================================
 * 🎡 NYX9 STUDIO — MINIGAME & LUCKY WHEEL ENGINE (Sprint 3)
 * ==============================================================================
 * ให้บริการระบบมินิเกมวงล้อเสี่ยงโชคและ Loyalty Points:
 * - GET: ดึงข้อมูลวงล้อ รางวัลทั้ง 8 ช่อง และสถิติโอกาสชนะ
 * - POST action=spin: หมุนวงล้อ ตัดเงินหรือแต้มแบบ Atomic ผ่าน fn_play_minigame
 * - POST action=seed: ติดตั้งวงล้อและรางวัลเริ่มต้น (Idempotent)
 * - POST action=history: ประวัติการเล่นล่าสุดของผู้ใช้
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

const DEFAULT_SLICES = [
  {
    reward_type: 'vault',
    product_id: 'nitro-booster-1m',
    label: 'Nitro 1 เดือน',
    color_hex: '#5865F2',
    icon: '💎',
    weight: 5,
    money_amount: 0,
    points_amount: 0
  },
  {
    reward_type: 'points',
    label: '50 แต้ม',
    color_hex: '#F59E0B',
    icon: '🪙',
    weight: 25,
    money_amount: 0,
    points_amount: 50
  },
  {
    reward_type: 'money',
    label: 'เครดิต ฿20',
    color_hex: '#10B981',
    icon: '💵',
    weight: 15,
    money_amount: 20.00,
    points_amount: 0
  },
  {
    reward_type: 'none',
    label: 'เกลือ (ไม่ได้รางวัล)',
    color_hex: '#475569',
    icon: '🧂',
    weight: 30,
    money_amount: 0,
    points_amount: 0
  },
  {
    reward_type: 'points',
    label: '100 แต้ม',
    color_hex: '#EC4899',
    icon: '⭐',
    weight: 10,
    money_amount: 0,
    points_amount: 100
  },
  {
    reward_type: 'money',
    label: 'เครดิต ฿50',
    color_hex: '#8B5CF6',
    icon: '🎁',
    weight: 5,
    money_amount: 50.00,
    points_amount: 0
  },
  {
    reward_type: 'points',
    label: '20 แต้ม',
    color_hex: '#3B82F6',
    icon: '✨',
    weight: 20,
    money_amount: 0,
    points_amount: 20
  },
  {
    reward_type: 'none',
    label: 'ขอให้โชคดีครั้งหน้า',
    color_hex: '#334155',
    icon: '🍀',
    weight: 25,
    money_amount: 0,
    points_amount: 0
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting: 45 requests/min
  if (!checkRateLimit(req, res, { action: 'minigames', limit: 45, windowMs: 60 * 1000 })) {
    return;
  }

  const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams.entries()) : {});
  const client = getDbClient();

  try {
    await client.connect();

    // -------------------------------------------------------------------------
    // 1. GET: ดึงข้อมูลวงล้อเสี่ยงโชคและรายการรางวัล (Public)
    // -------------------------------------------------------------------------
    if (req.method === 'GET') {
      const minigameId = parseInt(query.id, 10) || null;

      // ค้นหาวงล้อที่ active
      let mgQuery = `SELECT * FROM public.minigames WHERE is_active = TRUE `;
      const params = [];
      if (minigameId) {
        params.push(minigameId);
        mgQuery += `AND id = $1 `;
      }
      mgQuery += `ORDER BY id ASC LIMIT 1;`;

      let mgRes = await client.query(mgQuery, params);

      // ถ้ายังไม่มี minigame ในระบบ ให้ Auto-seed อัตโนมัติทันที
      if (mgRes.rows.length === 0) {
        await seedDefaultMinigame(client);
        mgRes = await client.query(`SELECT * FROM public.minigames WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;`);
      }

      const minigame = mgRes.rows[0];
      if (!minigame) {
        return res.status(404).json({ success: false, message: 'ไม่พบมินิเกมที่เปิดให้บริการ' });
      }

      // ดึงรายการรางวัลทั้งหมดของวงล้อนี้
      const rewardsRes = await client.query(`
        SELECT 
          id,
          minigame_id,
          reward_type,
          weight,
          product_id,
          variant_id,
          money_amount,
          points_amount,
          label,
          color_hex,
          icon,
          is_active
        FROM public.minigame_rewards
        WHERE minigame_id = $1 AND is_active = TRUE
        ORDER BY id ASC;
      `, [minigame.id]);

      const rewards = rewardsRes.rows;
      const totalWeight = rewards.reduce((sum, r) => sum + parseFloat(r.weight || 0), 0);

      // คำนวณความน่าจะเป็นแบบโปร่งใส (%)
      const formattedRewards = rewards.map((r, index) => {
        const weightNum = parseFloat(r.weight || 0);
        const winChance = totalWeight > 0 ? Math.round((weightNum / totalWeight) * 10000) / 100 : 0;
        return {
          id: r.id,
          index,
          reward_type: r.reward_type,
          label: r.label || getFallbackLabel(r),
          color_hex: r.color_hex || getDefaultColor(index),
          icon: r.icon || getDefaultIcon(r.reward_type),
          money_amount: parseFloat(r.money_amount || 0),
          points_amount: parseInt(r.points_amount || 0, 10),
          product_id: r.product_id,
          win_chance: winChance
        };
      });

      // ถ้ามีการส่ง user_id มาด้วย ให้ดึงแต้มและยอดเงินคงเหลือ
      let userData = null;
      if (query.user_id) {
        const userRes = await client.query(`
          SELECT id, username, balance, points 
          FROM public.profiles 
          WHERE id = $1::uuid;
        `, [query.user_id]);
        if (userRes.rows.length > 0) {
          userData = {
            id: userRes.rows[0].id,
            username: userRes.rows[0].username,
            balance: parseFloat(userRes.rows[0].balance || 0),
            points: parseFloat(userRes.rows[0].points || 0)
          };
        }
      }

      return res.status(200).json({
        success: true,
        minigame: {
          id: minigame.id,
          name: minigame.name,
          description: minigame.description,
          play_price: parseFloat(minigame.play_price || 0),
          play_points: parseInt(minigame.play_points || 0, 10)
        },
        rewards: formattedRewards,
        user: userData
      });
    }

    // -------------------------------------------------------------------------
    // 2. POST: กระทำการเกี่ยวกับมินิเกม (spin, seed, history)
    // -------------------------------------------------------------------------
    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || query.action || 'spin';

      // -----------------------------------------------------------------------
      // Action: SEED
      // -----------------------------------------------------------------------
      if (action === 'seed') {
        const seededId = await seedDefaultMinigame(client);
        return res.status(200).json({
          success: true,
          message: 'ติดตั้งวงล้อเสี่ยงโชคเริ่มต้นสำเร็จ',
          minigame_id: seededId
        });
      }

      // -----------------------------------------------------------------------
      // Action: HISTORY
      // -----------------------------------------------------------------------
      if (action === 'history') {
        const userId = body.user_id || query.user_id;
        if (!userId) {
          return res.status(400).json({ success: false, message: 'กรุณาระบุ user_id' });
        }
        const histRes = await client.query(`
          SELECT 
            p.id,
            p.played_at,
            p.cost_money,
            p.cost_points,
            p.reward_type,
            p.reward_payload,
            r.label AS reward_label,
            r.icon AS reward_icon
          FROM public.minigame_plays p
          LEFT JOIN public.minigame_rewards r ON p.reward_id = r.id
          WHERE p.user_id = $1::uuid
          ORDER BY p.played_at DESC
          LIMIT 10;
        `, [userId]);

        return res.status(200).json({
          success: true,
          history: histRes.rows
        });
      }

      // -----------------------------------------------------------------------
      // Action: SPIN (เล่นมินิเกม)
      // -----------------------------------------------------------------------
      if (action === 'spin') {
        const userId = body.user_id || query.user_id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'กรุณาเข้าสู่ระบบก่อนหมุนวงล้อ'
          });
        }

        const minigameId = parseInt(body.minigame_id || query.minigame_id, 10) || 1;
        const usePoints = body.use_points === true || body.use_points === 'true' || query.use_points === 'true';

        // ดึงรายการรางวัลเรียงตาม id เพื่อคำนวณ slice index
        const rewardsListRes = await client.query(`
          SELECT id, reward_type, label, color_hex, icon 
          FROM public.minigame_rewards 
          WHERE minigame_id = $1 AND is_active = TRUE
          ORDER BY id ASC;
        `, [minigameId]);

        const rewardsList = rewardsListRes.rows;

        // เรียก Stored Procedure fn_play_minigame
        const spRes = await client.query(`
          SELECT public.fn_play_minigame($1::uuid, $2::int, $3::boolean) AS result;
        `, [userId, minigameId, usePoints]);

        const outcome = spRes.rows[0]?.result || {};

        if (!outcome.success) {
          const errMsg = mapErrorMessage(outcome.error, outcome.message);
          return res.status(400).json({
            success: false,
            error: outcome.error,
            message: errMsg,
            required: outcome.required,
            available: outcome.available
          });
        }

        // หา index ของ slice ที่ชนะ เพื่อส่งให้ Frontend Wheel หมุนไปหยุดตรงเป๊ะ
        let winningIndex = rewardsList.findIndex(r => r.id === outcome.reward_id);
        if (winningIndex === -1) {
          // fallback หาตาม reward_type ถ้า id ไม่ตรง
          winningIndex = rewardsList.findIndex(r => r.reward_type === outcome.reward_type);
          if (winningIndex === -1) winningIndex = 0;
        }

        const winningReward = rewardsList[winningIndex] || {};

        // ส่ง Discord Webhook แจ้งเตือนเมื่อมีผู้เล่นได้รางวัลใหญ่ (Nitro หรือ เครดิต/แต้มสูง)
        if (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.startsWith('http')) {
          if (outcome.reward_type === 'vault' || outcome.cost_money > 0 || (outcome.reward?.amount && outcome.reward.amount >= 20)) {
            try {
              await fetch(process.env.DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  embeds: [{
                    title: '🎡 แจ้งเตือนการสุ่มวงล้อ NYX9 Lucky Wheel!',
                    color: 0x8B5CF6,
                    fields: [
                      { name: '👤 ผู้เล่น', value: `\`${userId}\``, inline: true },
                      { name: '🎟️ ค่าเล่น', value: usePoints ? `${outcome.cost_points} แต้ม` : `฿${outcome.cost_money}`, inline: true },
                      { name: '🎁 รางวัลที่ได้', value: `**${outcome.reward_label || winningReward.label}** (${outcome.reward_type})`, inline: false }
                    ],
                    timestamp: new Date().toISOString()
                  }]
                })
              }).catch(() => {});
            } catch (_) {}
          }
        }

        return res.status(200).json({
          success: true,
          play_id: outcome.play_id,
          minigame_id: minigameId,
          reward_id: outcome.reward_id,
          reward_index: winningIndex,
          reward_type: outcome.reward_type,
          reward_label: outcome.reward_label || winningReward.label,
          reward_color: outcome.reward_color || winningReward.color_hex,
          reward_icon: outcome.reward_icon || winningReward.icon,
          reward: outcome.reward,
          played_with: outcome.played_with,
          new_balance: parseFloat(outcome.new_balance || 0),
          new_points: parseFloat(outcome.new_points || 0)
        });
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('[MINIGAME API ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผลระบบมินิเกม',
      error: err.message
    });
  } finally {
    await client.end().catch(() => {});
  }
};

/**
 * Seed Default Minigame & 8 Slices
 */
async function seedDefaultMinigame(client) {
  // ตรวจสอบว่ามี minigame เดิมอยู่แล้วหรือไม่
  const existing = await client.query(`SELECT id FROM public.minigames WHERE id = 1;`);
  let mgId = 1;

  if (existing.rows.length === 0) {
    const insertMg = await client.query(`
      INSERT INTO public.minigames (name, description, play_price, play_points, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id;
    `, [
      'วงล้อเสี่ยงโชค NYX9 Lucky Wheel',
      'ลุ้นรับ Discord Nitro, เครดิตกระเป๋าเงิน และแต้มสะสมพิเศษ!',
      15.00,
      50
    ]);
    mgId = insertMg.rows[0].id;
  }

  // ลบ rewards เดิมของ minigame นี้และใส่ 8 ช่องมาตรฐาน
  await client.query(`DELETE FROM public.minigame_rewards WHERE minigame_id = $1;`, [mgId]);

  for (const slice of DEFAULT_SLICES) {
    await client.query(`
      INSERT INTO public.minigame_rewards (
        minigame_id, reward_type, weight, product_id, money_amount, points_amount, label, color_hex, icon, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE);
    `, [
      mgId,
      slice.reward_type,
      slice.weight,
      slice.product_id || null,
      slice.money_amount,
      slice.points_amount,
      slice.label,
      slice.color_hex,
      slice.icon
    ]);
  }

  return mgId;
}

function getFallbackLabel(r) {
  if (r.reward_type === 'money') return `฿${parseFloat(r.money_amount || 0).toFixed(0)}`;
  if (r.reward_type === 'points') return `${r.points_amount} แต้ม`;
  if (r.reward_type === 'vault') return 'สินค้าพิเศษ';
  return 'ไม่ได้รางวัล';
}

function getDefaultColor(index) {
  const colors = ['#5865F2', '#F59E0B', '#10B981', '#475569', '#EC4899', '#8B5CF6', '#3B82F6', '#334155'];
  return colors[index % colors.length];
}

function getDefaultIcon(rewardType) {
  if (rewardType === 'vault') return '💎';
  if (rewardType === 'money') return '💵';
  if (rewardType === 'points') return '🪙';
  return '🧂';
}

function mapErrorMessage(errorCode, defaultMsg) {
  switch (errorCode) {
    case 'INSUFFICIENT_BALANCE':
      return 'ยอดเงินในกระเป๋าของคุณไม่เพียงพอสำหรับการหมุนวงล้อ';
    case 'INSUFFICIENT_POINTS':
      return 'แต้มสะสม Loyalty Points ของคุณไม่เพียงพอสำหรับการหมุนวงล้อ';
    case 'USER_NOT_FOUND':
      return 'ไม่พบบัญชีผู้ใช้งานในระบบ';
    case 'UNAUTHORIZED':
      return 'คุณไม่มีสิทธิ์ใช้งานบัญชีนี้ในการหมุนวงล้อ';
    default:
      return defaultMsg || 'เกิดข้อผิดพลาดในการหมุนวงล้อ';
  }
}
