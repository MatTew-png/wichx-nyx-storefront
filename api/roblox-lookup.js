/**
 * ==============================================================================
 * 👤 ROBLOX GAMERTAG & AVATAR LOOKUP API (Serverless Handler)
 * ==============================================================================
 * ระบบตรวจสอบตัวตนผู้เล่น Roblox แบบ Pre-flight 2-Step Verification:
 * 1. ตรวจสอบชื่อผู้ใช้กับ Roblox API จริง (users.roblox.com)
 * 2. ดึงภาพ 3D Avatar Headshot จาก thumbnails.roblox.com
 * 3. ส่งข้อมูลกลับไปยัง Display Confirmation Card ก่อนหักเงิน
 * ==============================================================================
 */

const { checkRateLimit } = require('./rate-limiter');

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Edge Rate Limiting: Max 30 lookups / min per IP
  if (!checkRateLimit(req, res, { action: 'roblox-lookup', limit: 30, windowMs: 60 * 1000 })) {
    return;
  }

  try {
    let username = '';
    if (req.method === 'GET') {
      const parsedUrl = new URL(req.url, 'http://localhost');
      username = (parsedUrl.searchParams.get('username') || '').trim();
    } else if (req.method === 'POST') {
      username = (req.body?.username || '').trim();
    } else {
      return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    if (!username) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อผู้ใช้ Roblox (username)" });
    }

    // Sanitize Roblox username (3-20 characters, alphanumeric and _)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        success: false, 
        message: "ชื่อผู้ใช้ Roblox ไม่ถูกต้อง (ต้องมีความยาว 3-20 ตัวอักษร ประกอบด้วย a-z, 0-9, _ เท่านั้น)" 
      });
    }

    // Mock response for test automation / synthetic testing
    if (username.toLowerCase().startsWith('mock_') || username.toLowerCase() === 'testrobloxuser') {
      const mockId = 123456789;
      return res.status(200).json({
        success: true,
        user: {
          id: mockId,
          username: username,
          displayName: `[VIP] ${username}`,
          avatarUrl: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-Mock/150/150/AvatarHeadshot/Png/isCircular",
          isMock: true
        }
      });
    }

    // Live Query to Roblox Users API
    let userData = null;
    try {
      const userRes = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false
        })
      });

      if (userRes.ok) {
        const json = await userRes.json();
        if (json.data && json.data.length > 0) {
          userData = json.data[0];
        }
      }
    } catch (apiErr) {
      console.warn("[ROBLOX API] Live users API note:", apiErr.message);
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบผู้เล่นชื่อ "${username}" ในระบบ Roblox กรุณาตรวจสอบตัวสะกด`
      });
    }

    const userId = userData.id;
    let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;

    // Fetch Avatar Headshot from Roblox Thumbnails API
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbJson = await thumbRes.json();
        if (thumbJson.data && thumbJson.data.length > 0 && thumbJson.data[0].imageUrl) {
          avatarUrl = thumbJson.data[0].imageUrl;
        }
      }
    } catch (thumbErr) {
      console.warn("[ROBLOX API] Live thumbnails API note:", thumbErr.message);
    }

    return res.status(200).json({
      success: true,
      user: {
        id: userId,
        username: userData.name,
        displayName: userData.displayName || userData.name,
        avatarUrl: avatarUrl
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
