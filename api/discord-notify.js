/**
 * ==============================================================================
 * 🤖 DISCORD WEBHOOK NOTIFICATION ENGINE (24/7 OPERATIONS SUITE)
 * ==============================================================================
 * ส่ง Rich Embed แจ้งเตือนออเดอร์ใหม่, การเติมเงิน, การเคลมประกัน, สต็อกหมด
 * และการเติมสต็อกเข้าสู่ Discord Channel อัตโนมัติตลอด 24 ชั่วโมง
 * ==============================================================================
 */

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const { 
      type = "ORDER_NEW", 
      orderId, 
      total, 
      items = [], 
      gateway, 
      transRef, 
      amount, 
      claimId, 
      claimReason, 
      productId, 
      productTitle, 
      remainingStock, 
      restockCount,
      customWebhookUrl 
    } = req.body || {};

    const webhookUrl = customWebhookUrl || process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl.includes("YOUR_WEBHOOK_ID") || !webhookUrl.startsWith("http")) {
      return res.status(200).json({
        success: true,
        mock: true,
        message: "Discord Webhook ยังไม่ได้กำหนด URL จริง (จำลองการแจ้งเตือนสำเร็จ)"
      });
    }

    let embed = {};

    switch (type) {
      case "ORDER_NEW":
      case "ORDER_SUCCESS": {
        const itemsSummary = items.map(i => `• **${i.title || i.id}** (x${i.quantity || 1}) - ฿${(parseFloat(i.price || 0) * (i.quantity || 1)).toFixed(2)}`).join("\n");
        embed = {
          title: "⚡ มีคำสั่งซื้อใหม่เข้าระบบ (NYX9 STUDIO)",
          description: "ลูกค้าชำระเงินและระบบได้ทำการจัดส่งสินค้าอัตโนมัติแล้ว",
          color: 0x19BAFF, // Glacier Cyan
          fields: [
            { name: "รหัสคำสั่งซื้อ (Order ID)", value: `\`${orderId || "N/A"}\``, inline: true },
            { name: "ยอดชำระสุทธิ", value: `**฿${parseFloat(total || 0).toFixed(2)}**`, inline: true },
            { name: "ช่องทางชำระ", value: "กระเป๋าเงิน (Wallet Balance)", inline: true },
            { name: "รายการสินค้าที่สั่งซื้อ", value: itemsSummary || "ไม่ระบุรายการ", inline: false },
            { name: "สถานะการส่งมอบ", value: "✅ เบิกจ่ายคีย์สำเร็จ 100% (Instant 24/7)", inline: false }
          ],
          footer: { text: "NYX9 STUDIO AUTO-FULFILLMENT ENGINE" },
          timestamp: new Date().toISOString()
        };
        break;
      }

      case "TOPUP_SUCCESS": {
        embed = {
          title: "💳 แจ้งเตือนการเติมเงินสำเร็จ!",
          description: "มียอดเงินเข้ากระเป๋าของลูกค้าในระบบ",
          color: 0x10B981, // Emerald Green
          fields: [
            { name: "ช่องทางเติมเงิน", value: gateway === "truemoney" ? "🧧 TrueMoney Wallet (ซองของขวัญ)" : "💸 PromptPay QR (Auto-Verify)", inline: true },
            { name: "ยอดเงินที่เติม", value: `**฿${parseFloat(amount || total || 0).toFixed(2)}**`, inline: true },
            { name: "รหัสอ้างอิงธุรกรรม", value: `\`${transRef || "N/A"}\``, inline: true }
          ],
          footer: { text: "NYX9 STUDIO PAYMENT GATEWAY" },
          timestamp: new Date().toISOString()
        };
        break;
      }

      case "WARRANTY_CLAIM": {
        embed = {
          title: "🛡️ แจ้งเตือนคำร้องเคลมประกันสินค้าใหม่",
          description: "ลูกค้าได้ยื่นเรื่องเคลมสินค้า โปรดตรวจสอบในระบบแอดมิน",
          color: 0xEF4444, // Red Alert
          fields: [
            { name: "รหัสอ้างอิงเคลม", value: `\`${claimId || "N/A"}\``, inline: true },
            { name: "รหัสคำสั่งซื้อเดิม", value: `\`${orderId || "N/A"}\``, inline: true },
            { name: "สถานะ", value: "⏳ รอดำเนินการ (PENDING)", inline: true },
            { name: "เหตุผล / ปัญหาที่แจ้ง", value: claimReason || "ไม่ได้ระบุเหตุผล", inline: false }
          ],
          footer: { text: "NYX9 STUDIO WARRANTY & SUPPORT" },
          timestamp: new Date().toISOString()
        };
        break;
      }

      case "LOW_STOCK_ALERT": {
        embed = {
          title: "⚠️ แจ้งเตือน: สต็อกสินค้าใกล้หมด / หมดแล้ว!",
          description: "มีสินค้าที่จำนวนคีย์ในคลังเหลือน้อย โปรดเติมสต็อกเพิ่ม",
          color: 0xF59E0B, // Amber Warning
          fields: [
            { name: "ชื่อสินค้า", value: `**${productTitle || productId}**`, inline: true },
            { name: "รหัสสินค้า", value: `\`${productId}\``, inline: true },
            { name: "จำนวนคงเหลือในคลัง", value: `**${remainingStock || 0} ชิ้น**`, inline: true }
          ],
          footer: { text: "NYX9 STUDIO INVENTORY MONITOR" },
          timestamp: new Date().toISOString()
        };
        break;
      }

      case "ADMIN_RESTOCK": {
        embed = {
          title: "📦 มีการเติมสต็อกสินค้าใหม่เข้าระบบ",
          description: "แอดมินได้ทำการเพิ่มคีย์สินค้าเข้าสู่คลังฐานข้อมูล",
          color: 0x8B5CF6, // Purple
          fields: [
            { name: "สินค้าที่เติม", value: `\`${productId}\``, inline: true },
            { name: "จำนวนคีย์ที่เพิ่ม", value: `**+${restockCount || 0} ชิ้น**`, inline: true }
          ],
          footer: { text: "NYX9 STUDIO OPERATIONS SUITE" },
          timestamp: new Date().toISOString()
        };
        break;
      }

      case "TEST_PING":
      default: {
        embed = {
          title: "🔔 ทดสอบการเชื่อมต่อ Discord Webhook สำเร็จ!",
          description: "ระบบแจ้งเตือนอัตโนมัติ NYX9 STUDIO เชื่อมต่อกับห้อง Discord นี้เรียบร้อยแล้ว พร้อมส่งข้อมูลคำสั่งซื้อแบบเรียลไทม์",
          color: 0x19BAFF,
          fields: [
            { name: "ระบบที่พร้อมทำงาน", value: "• สั่งซื้อสินค้าอัตโนมัติ (Instant Key)\n• เติมเงิน PromptPay / TrueMoney\n• ระบบแจ้งเคลมประกัน\n• แจ้งเตือนสต็อกใกล้หมด", inline: false }
          ],
          footer: { text: "NYX9 STUDIO SYSTEM TEST" },
          timestamp: new Date().toISOString()
        };
        break;
      }
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: "ส่งการแจ้งเตือนเข้า Discord สำเร็จ" });
    } else {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, message: "Discord API returned error", detail: errText });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
