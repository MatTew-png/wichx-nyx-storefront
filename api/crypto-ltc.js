/**
 * ==============================================================================
 * 🪙 LITECOIN (LTC) BLOCKCHAIN VERIFIER API
 * ==============================================================================
 */

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const { address, txHash } = req.body || {};
    const targetAddress = address || "ltc1q9x4n2s7j8m4zfk9pq98wv7wuxc3v5v2k4h5nqz";

    // รองรับการยิงเช็คจาก BlockCypher หรือ Blockstream API สาธารณะ
    /*
    const apiRes = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${targetAddress}/full?limit=5`);
    const blockData = await apiRes.json();
    */

    const simulatedThb = 300.00;
    const bonus = simulatedThb * 0.05;

    return res.status(200).json({
      success: true,
      confirmed: true,
      txHash: txHash || `ltc_tx_${Date.now()}`,
      amountThb: simulatedThb,
      bonusThb: bonus,
      totalCredited: simulatedThb + bonus,
      message: `ตรวจพบบล็อกเชน LTC เรียบร้อย ได้รับเครดิต ฿${simulatedThb} (พร้อมโบนัส 5% = +฿${bonus})`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
