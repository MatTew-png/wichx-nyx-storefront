/**
 * ==============================================================================
 * 🧧 TRUEMONEY WALLET VOUCHER REDEEMER API
 * ==============================================================================
 */

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const { voucherUrl } = req.body || {};
    const merchantPhone = process.env.TRUEMONEY_PHONE;

    if (!voucherUrl) {
      return res.status(400).json({ success: false, message: "กรุณาระบุลิงก์ซองของขวัญ TrueMoney" });
    }

    const voucherCodeMatch = voucherUrl.match(/[?&]v=([a-zA-Z0-9]+)/);
    if (!voucherCodeMatch) {
      return res.status(400).json({ success: false, message: "รูปแบบลิงก์ซองของขวัญไม่ถูกต้อง" });
    }

    const voucherCode = voucherCodeMatch[1];

    // ถ้ามีเบอร์โทรศัพท์ร้านค้าที่ผูกไว้กับ TrueMoney API
    if (merchantPhone) {
      /*
      // ตัวอย่างยิง TrueMoney Official Gift Voucher Redemption API:
      const tmRes = await fetch(`https://gift.truemoney.com/campaign/vouchers/${voucherCode}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: merchantPhone, voucher_hash: voucherCode })
      });
      const data = await tmRes.json();
      return res.status(200).json(data);
      */
    }

    // Sandbox / Mock Success
    return res.status(200).json({
      success: true,
      redeemedAmount: 150.00,
      voucherCode,
      message: "รับเงินจากซองของขวัญสำเร็จ +฿150.00"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
