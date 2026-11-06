/**
 * ==============================================================================
 * 🧾 NYX9 STUDIO — CYBERPUNK RECEIPT IMAGE GENERATOR v1.0
 * ==============================================================================
 * วาดการ์ดใบเสร็จสั่งซื้อความละเอียดสูง (Retina Ready PNG) ด้วย Pure HTML5 Canvas
 * สรุปชื่อสินค้า รหัสไอดี วันเวลา และตราประทับรับประกัน 24 ชม.
 * เหมาะสำหรับเซฟลงมือถือในคลิกเดียว และแชร์ลงสตอรี่รีวิวร้านค้า
 * ==============================================================================
 */

class ReceiptGenerator {
  static async generateReceiptPNG(orderData) {
    const width = 800;
    const height = 1050;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("เบราว์เซอร์ไม่รองรับ HTML5 Canvas");
    }

    const orderId = orderData.orderId || orderData.order_id || `WX-${Date.now().toString().slice(-6)}`;
    const dateStr = orderData.timestamp 
      ? new Date(orderData.timestamp).toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const totalAmount = parseFloat(orderData.totalAmount || orderData.total_amount || 0).toFixed(2);
    const items = orderData.items || orderData.dispensed_items || [];
    const customerName = orderData.customerName || (window.store && window.store.get("user")?.username) || "Customer";

    // 1. Dark Cyberpunk Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#06080E");
    bgGrad.addColorStop(0.5, "#0A0F1D");
    bgGrad.addColorStop(1, "#04060A");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Carbon Dot Matrix
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    for (let x = 20; x < width; x += 25) {
      for (let y = 20; y < height; y += 25) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer Glow Neon Border
    ctx.strokeStyle = "rgba(0, 242, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, width - 52, height - 52);

    // 2. Header Branding
    // Cyan Accent Light Bar
    const barGrad = ctx.createLinearGradient(40, 45, width - 40, 45);
    barGrad.addColorStop(0, "rgba(0, 242, 255, 0.8)");
    barGrad.addColorStop(0.5, "rgba(255, 0, 128, 0.6)");
    barGrad.addColorStop(1, "rgba(0, 242, 255, 0.8)");
    ctx.fillStyle = barGrad;
    ctx.fillRect(40, 45, width - 80, 4);

    // Store Logo Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px 'Space Grotesk', 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("NYX9 STUDIO", 50, 95);

    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("OFFICIAL ORDER RECEIPT • 24/7 AUTOMATION", 50, 118);

    // Verified Stamp Top Right
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, width - 210, 65, 160, 48, 12, true, true);

    ctx.fillStyle = "#34D399";
    ctx.font = "bold 13px 'JetBrains Mono', sans-serif";
    ctx.fillText("✓ VERIFIED PAID", width - 195, 95);

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(50, 145);
    ctx.lineTo(width - 50, 145);
    ctx.stroke();

    // 3. Metadata Grid (Order ID, Date, Customer)
    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("หมายเลขคำสั่งซื้อ (ORDER ID)", 50, 175);
    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillText(orderId, 50, 202);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("วันที่สั่งซื้อ (DATE/TIME)", 320, 175);
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 15px 'JetBrains Mono', sans-serif";
    ctx.fillText(dateStr, 320, 202);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("ลูกค้า (BUYER)", 580, 175);
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 15px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText(customerName.slice(0, 16), 580, 202);

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(50, 225);
    ctx.lineTo(width - 50, 225);
    ctx.stroke();

    // 4. Purchased Items Table
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 13px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("รายการสินค้าที่ได้รับ", 50, 255);
    ctx.fillText("จำนวน", 560, 255);
    ctx.fillText("ยอดเงิน", 680, 255);

    let currentY = 285;
    let allCredentials = [];

    items.forEach((item, idx) => {
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(45, currentY - 20, width - 90, 40);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 15px 'IBM Plex Sans Thai', sans-serif";
      const itemTitle = (item.title || item.id || `สินค้าดิจิทัล #${idx + 1}`).slice(0, 42);
      ctx.fillText(itemTitle, 55, currentY + 5);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillText(`x${item.quantity || 1}`, 570, currentY + 5);

      ctx.fillStyle = "#00F2FF";
      ctx.font = "bold 15px 'JetBrains Mono', monospace";
      const itemPrice = item.price ? `฿${(item.price * (item.quantity || 1)).toFixed(2)}` : "-";
      ctx.fillText(itemPrice, 680, currentY + 5);

      currentY += 46;

      const creds = item.credentials || [];
      if (Array.isArray(creds) && creds.length > 0) {
        allCredentials.push(...creds);
      }
    });

    // 5. Delivered Credentials Box (The Gold Mine)
    currentY += 15;
    ctx.fillStyle = "rgba(0, 242, 255, 0.06)";
    ctx.strokeStyle = "rgba(0, 242, 255, 0.25)";
    ctx.lineWidth = 1;
    this.roundRect(ctx, 45, currentY, width - 90, 220, 16, true, true);

    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("🔑 คีย์ / ลิงก์สินค้าที่จัดส่ง (DELIVERED CREDENTIALS)", 60, currentY + 30);

    let credY = currentY + 60;
    if (allCredentials.length === 0) {
      ctx.fillStyle = "#F59E0B";
      ctx.font = "14px 'IBM Plex Sans Thai', sans-serif";
      ctx.fillText("• สินค้าแบบบริการพิเศษ ระบบกำลังจัดคิวส่งมอบให้ภายใน 5-15 นาที", 65, credY);
    } else {
      allCredentials.slice(0, 4).forEach((cred, cIdx) => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(60, credY - 16, width - 120, 32);

        ctx.fillStyle = "#E2E8F0";
        ctx.font = "13px 'JetBrains Mono', monospace";
        const displayCred = cred.length > 55 ? cred.slice(0, 52) + "..." : cred;
        ctx.fillText(`[${cIdx + 1}]  ${displayCred}`, 70, credY + 5);
        credY += 38;
      });
      if (allCredentials.length > 4) {
        ctx.fillStyle = "#64748B";
        ctx.font = "italic 12px 'JetBrains Mono', monospace";
        ctx.fillText(`+ อีก ${allCredentials.length - 4} รายการ (ตรวจสอบรายการทั้งหมดในคลังประวัติของร้าน)`, 70, credY + 5);
      }
    }

    // 6. Total Summary & Warranty Seal
    const summaryY = height - 240;

    // Total Amount Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(45, summaryY, width - 90, 60);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "bold 16px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("ยอดชำระสุทธิ (TOTAL PAID)", 65, summaryY + 37);

    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 26px 'JetBrains Mono', monospace";
    ctx.fillText(`฿${totalAmount}`, width - 200, summaryY + 40);

    // Warranty Box & Anti-Counterfeit Stamp
    const footerY = height - 150;
    ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
    this.roundRect(ctx, 45, footerY, width - 90, 75, 14, true, true);

    ctx.fillStyle = "#34D399";
    ctx.font = "bold 13px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("🛡️ มีประกันร้าน 24 ชม. • หากมีปัญหาแคปใบเสร็จนี้แจ้งเคลมได้ทันที", 65, footerY + 30);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "11px 'IBM Plex Sans Thai', sans-serif";
    ctx.fillText("ใบเสร็จดิจิทัลออกโดยระบบอัตโนมัติ NYX9 STUDIO (https://nyxning.shop)", 65, footerY + 55);

    // Official Digital Stamp watermark
    ctx.save();
    ctx.translate(width - 130, footerY + 38);
    ctx.rotate(-0.15);
    ctx.strokeStyle = "rgba(0, 242, 255, 0.6)";
    ctx.lineWidth = 2;
    this.roundRect(ctx, -55, -22, 110, 44, 8, false, true);
    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText("NYX9 PASSED", -42, 5);
    ctx.restore();

    // 7. Convert to PNG and Trigger Download
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `NYX9_Receipt_${orderId}.png`;
        link.click();
        resolve(link.href);
      }, "image/png");
    });
  }

  static roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

window.ReceiptGenerator = ReceiptGenerator;
