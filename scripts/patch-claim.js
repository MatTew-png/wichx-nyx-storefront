const fs = require('fs');

const appJsPath = 'app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

const startMarker = "function submitClaimTicket() {";
const endMarker = "// 13. CUSTOM TOAST SYSTEM";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found! startIndex:", startIndex, "endIndex:", endIndex);
  process.exit(1);
}

const beforeNextHeader = content.lastIndexOf("// ===", endIndex);
const actualEnd = beforeNextHeader !== -1 ? beforeNextHeader : endIndex;

const replacementCode = `async function submitClaimTicket() {
  const orderId = document.getElementById("claim-order-id")?.value.trim();
  const reason = document.getElementById("claim-reason")?.value;
  const desc = document.getElementById("claim-desc")?.value.trim();

  if (!orderId || !desc) {
    showToast("กรุณากรอก Order ID และรายละเอียดปัญหา", "warning");
    return;
  }

  const fullReason = \`\${reason || 'ปัญหาทั่วไป'}: \${desc}\`;

  try {
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      await window.SupabaseAdapter.submitWarrantyClaim(orderId, fullReason);
    }

    // ส่งแจ้งเตือน Discord Webhook เข้าห้องแอดมิน
    const webhook = localStorage.getItem("nyx9_discord_webhook");
    fetch("/api/discord-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "WARRANTY_CLAIM",
        orderId,
        claimReason: fullReason,
        customWebhookUrl: webhook || undefined
      })
    }).catch(console.warn);

    closeClaimModal();
    showToast(\`ยื่นเรื่องเคลมสำหรับคำสั่งซื้อ \${orderId} สำเร็จ! เจ้าหน้าที่จะตรวจสอบให้ตลอด 24 ชม.\`, "success");

    const orderInput = document.getElementById("claim-order-id");
    const descInput = document.getElementById("claim-desc");
    if (orderInput) orderInput.value = "";
    if (descInput) descInput.value = "";
  } catch (err) {
    console.error("Failed to submit claim:", err);
    showToast("เกิดข้อผิดพลาดในการยื่นเรื่องเคลม", "error");
  }
}

`;

content = content.substring(0, startIndex) + replacementCode + content.substring(actualEnd);
fs.writeFileSync(appJsPath, content, 'utf8');
console.log("Successfully patched submitClaimTicket in app.js!");
