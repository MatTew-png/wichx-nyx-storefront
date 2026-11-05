/**
 * ==============================================================================
 * 🤖 DISCORD WEBHOOK NOTIFICATION API (Serverless Handler)
 * ==============================================================================
 * ส่ง Embed แจ้งเตือนออเดอร์ใหม่ หรือคำร้องขอเคลมสินค้าเข้าสู่ห้อง Discord
 * ==============================================================================
 */

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const { type, orderId, total, items, customerInfo } = req.body || {};
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return res.status(200).json({
        success: true,
        mock: true,
        message: "Webhook URL ยังไม่ได้กำหนดใน Environment (จำลองการส่งสำเร็จ)"
      });
    }

    const itemsSummary = (items || []).map(i => `• **${i.title}** (x${i.quantity || 1}) - ฿${(i.price * (i.quantity || 1)).toFixed(2)}`).join("\n");

    const embed = {
      title: type === "TOPUP" ? "💳 แจ้งเตือนการเติมเงินสำเร็จ!" : "⚡ มีออเดอร์ใหม่เข้าระบบ (NYX9 STUDIO)",
      color: type === "TOPUP" ? 0x10B981 : 0x19BAFF,
      fields: [
        { name: "รหัสคำสั่งซื้อ (Order ID)", value: `\`${orderId || "N/A"}\``, inline: true },
        { name: "ยอดชำระสุทธิ", value: `**฿${parseFloat(total || 0).toFixed(2)}**`, inline: true },
        { name: "รายการสินค้า", value: itemsSummary || "เติมเงินเข้ากระเป๋า", inline: false }
      ],
      footer: { text: "NYX9 STUDIO AUTO-FULFILLMENT ENGINE 24/7" },
      timestamp: new Date().toISOString()
    };

    if (customerInfo) {
      embed.fields.push({ name: "ข้อมูลลูกค้า", value: `\`${JSON.stringify(customerInfo)}\``, inline: false });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });

    return res.status(200).json({ success: response.ok });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
