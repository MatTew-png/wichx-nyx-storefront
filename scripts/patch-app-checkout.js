const fs = require('fs');

const appJsPath = 'app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

const startMarker = "async function executeCheckout() {";
const endMarker = "// --- TYPE B: Custom Discord Services Order Form Modal ---";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found! startIndex:", startIndex, "endIndex:", endIndex);
  process.exit(1);
}

const replacementCode = `async function refreshLiveProducts() {
  if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
    try {
      const liveCats = await window.SupabaseAdapter.getProducts();
      if (liveCats && liveCats.length > 0) {
        window.categoriesData = liveCats;
        renderProductsCatalog();
      }
    } catch (err) {
      console.warn("[LIVE STOCK] Failed to refresh live products:", err.message);
    }
  }
}

async function executeCheckout() {
  if (AppState.cart.length === 0) {
    showToast("กรุณาเลือกสินค้าลงตะกร้าก่อนดำเนินการ", "warning");
    return;
  }

  // 🍯 ตรวจสอบ Honeypot Trap ป้องกันบอท
  const hpInput = document.getElementById("security_hp_verify");
  const honeypotVal = hpInput ? hpInput.value.trim() : "";
  if (honeypotVal !== "") {
    showToast("ตรวจพบบอทอัตโนมัติ (Access Blocked)", "error");
    return;
  }

  // คำนวณยอดเงินรวมหลังหักส่วนลด
  let subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  if (AppState.appliedPromo) {
    if (AppState.appliedPromo.discountPercent) {
      discount = (subtotal * AppState.appliedPromo.discountPercent) / 100;
    } else if (AppState.appliedPromo.discountThb) {
      discount = AppState.appliedPromo.discountThb;
    }
  }
  const totalRequired = Math.max(0, subtotal - discount);

  // ตรวจสอบยอดเงินคงเหลือในกระเป๋า
  if (AppState.walletBalance < totalRequired) {
    const diff = (totalRequired - AppState.walletBalance).toFixed(2);
    showToast(\`ยอดเงินในกระเป๋าไม่พอ (ขาดอีก ฿\${diff}) กรุณาเติมเงิน\`, "warning");
    toggleCartDrawer();
    openTopUpModal(Math.ceil(diff));
    return;
  }

  const btn = document.getElementById("btn-checkout-submit");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = \`<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>กำลังตัดยอดและเบิกสินค้าจากสต็อก...</span>\`;
    if (window.lucide) lucide.createIcons();
  }

  const orderId = \`WX-\${Date.now().toString().slice(-6)}\`;
  let checkoutResult = null;

  try {
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      checkoutResult = await window.SupabaseAdapter.executeOrderCheckout({
        orderId,
        items: AppState.cart,
        totalAmount: totalRequired,
        userId: AppState.user?.id || null,
        customerInfo: {
          source: "webshop",
          timestamp: new Date().toISOString()
        }
      });
    } else {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": \`IDEM-\${Date.now()}\`
        },
        body: JSON.stringify({
          items: AppState.cart,
          honeypotTrap: honeypotVal,
          promoCode: AppState.appliedPromo ? AppState.appliedPromo.code : null,
          userBalance: AppState.walletBalance,
          userId: AppState.user?.id || null
        })
      });
      checkoutResult = await res.json();
    }

    if (!checkoutResult || !checkoutResult.success) {
      const errorMsg = checkoutResult?.message || "ไม่สามารถทำรายการสั่งซื้อได้";
      showToast(errorMsg, "error");
      return;
    }

    // ตัดยอดเงินคงเหลือในกระเป๋า
    AppState.walletBalance -= totalRequired;
    localStorage.setItem("wichx_balance", AppState.walletBalance.toString());
    updateWalletUI();

    // บันทึกประวัติคำสั่งซื้อ
    const orderRecord = {
      orderId,
      timestamp: new Date().toISOString(),
      total: totalRequired,
      items: [...AppState.cart],
      dispensedItems: checkoutResult.dispensed_items || []
    };
    AppState.orderHistory.unshift(orderRecord);
    localStorage.setItem("wichx_orders", JSON.stringify(AppState.orderHistory));

    // จุดพลุเฉลิมฉลอง
    triggerConfetti();

    // ปิดตะกร้าสินค้า และล้างรายการ
    toggleCartDrawer();
    clearCart();

    // รีเฟรชจำนวนสต็อกจริงที่แสดงหน้าร้านทันที
    await refreshLiveProducts();

    // เปิดหน้าต่างส่งมอบรหัสสินค้าทันที
    openInstantDeliveryModal(orderId, checkoutResult.dispensed_items || []);
    showToast(\`สั่งซื้อสำเร็จ! รหัสคำสั่งซื้อ \${orderId} เบิกสินค้าสำเร็จแล้ว\`, "success");

  } catch (err) {
    console.error("[CHECKOUT ERROR]", err);
    showToast(err.message || "เกิดข้อผิดพลาดในการประมวลผลคำสั่งซื้อ", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = \`<span>ยืนยันการสั่งซื้อทันที</span> <i data-lucide="zap" class="w-4 h-4 fill-current"></i>\`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

function buyNowInstant(productId) {
  const product = findProductById(productId);
  if (!product) return;

  clearCart();
  addToCart(productId, 1);
  toggleCartDrawer();
}

// ==============================================================================
// 9. DUAL-FULFILLMENT MODALS (INSTANT KEY DELIVERY & RECEIPT GENERATOR)
// ==============================================================================

window.currentOrderDelivery = null;

function openInstantDeliveryModal(orderId, dispensedItems) {
  const modal = document.getElementById("instant-delivery-modal");
  const orderIdEl = document.getElementById("delivery-order-id");
  const contentEl = document.getElementById("delivered-content");
  if (!modal) return;

  if (orderIdEl) {
    orderIdEl.textContent = orderId;
  }

  let formattedText = "";
  if (Array.isArray(dispensedItems) && dispensedItems.length > 0) {
    formattedText = dispensedItems.map(item => {
      let creds = "";
      if (Array.isArray(item.credentials)) {
        creds = item.credentials.join("\\n");
      } else if (item.delivered_content) {
        creds = item.delivered_content;
      } else {
        creds = "รหัสอยู่ระหว่างการประมวลผล";
      }
      return \`[\${item.title || item.id}] (จำนวน: \${item.quantity || 1})\\n----------------------------------------\\n\${creds}\`;
    }).join("\\n========================================\\n\\n");
  } else {
    formattedText = "ได้รับคำสั่งซื้อเรียบร้อย ระบบบันทึกเข้าฐานข้อมูลแล้ว";
  }

  if (contentEl) {
    contentEl.value = formattedText;
  }

  window.currentOrderDelivery = {
    orderId,
    content: formattedText
  };

  modal.classList.remove("hidden");
  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeInstantModal() {
  const modal = document.getElementById("instant-delivery-modal");
  if (modal) modal.classList.add("hidden");
}
const closeInstantDeliveryModal = closeInstantModal;

function copyDeliveredKey() {
  const el = document.getElementById("delivered-content");
  const text = el ? (el.value || el.textContent) : (window.currentOrderDelivery?.content || "");

  if (!text) {
    showToast("ไม่พบข้อมูลรหัสสินค้า", "warning");
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast("คัดลอกรหัสสินค้าลงคลิปบอร์ดแล้ว!", "success");
  }).catch(() => {
    if (el) el.select();
    document.execCommand("copy");
    showToast("คัดลอกรหัสสินค้าแล้ว!", "success");
  });
}
const copyCredentials = copyDeliveredKey;

function downloadCurrentReceiptTxt() {
  if (!window.currentOrderDelivery) {
    showToast("ไม่พบข้อมูลคำสั่งซื้อที่จะดาวน์โหลด", "warning");
    return;
  }

  const { orderId, content } = window.currentOrderDelivery;
  const storeName = window.storeConfig?.storeName || "NYX9 STUDIO";
  const contact = window.storeConfig?.contactLine || "@nyx9studio";

  const fullReceipt = [
    "============================================================",
    \`   \${storeName} - DIGITAL RECEIPT & CREDENTIALS\`,
    "============================================================",
    \`ORDER ID  : \${orderId}\`,
    \`DATE      : \${new Date().toLocaleString("th-TH")}\`,
    \`STATUS    : FULFILLED & VERIFIED (24/7 AUTO)\`,
    "============================================================",
    "",
    content,
    "",
    "============================================================",
    "⚠️ คำแนะนำด้านความปลอดภัย:",
    "• กรุณาเปลี่ยนรหัสผ่านหรือบันทึกข้อมูลเก็บไว้ในที่ปลอดภัยทันที",
    \`• หากพบปัญหา สามารถติดต่อเคลมประกันได้ตลอด 24 ชม. ที่: \${contact}\`,
    "============================================================"
  ].join("\\n");

  const blob = new Blob([fullReceipt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = \`\${storeName}-ORDER-\${orderId}.txt\`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("ดาวน์โหลดไฟล์ใบเสร็จ .TXT สำเร็จแล้ว!", "success");
}

`;

content = content.substring(0, startIndex) + replacementCode + content.substring(endIndex);
fs.writeFileSync(appJsPath, content, 'utf8');
console.log("Successfully patched app.js checkout & automated fulfillment!");
