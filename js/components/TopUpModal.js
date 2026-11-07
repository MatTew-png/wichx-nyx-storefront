/**
 * ==============================================================================
 * TOP-UP MODAL COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class TopUpModalComponent {
  constructor(store, paymentService) {
    this.store = store;
    this.paymentService = paymentService;
    this.activeTab = "promptpay";
    this.initPasteListener();
  }

  initPasteListener() {
    if (typeof window === "undefined") return;
    window.addEventListener("paste", (e) => {
      const modal = document.getElementById("topup-modal");
      if (!modal || modal.classList.contains("hidden")) return;
      if (this.activeTab !== "promptpay") return;

      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type && item.type.indexOf("image") === 0) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            this.handleSlipFile(blob);
            break;
          }
        }
      }
    });
  }

  open(recommendedAmount = 0) {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('topup');
    }
    const input = document.getElementById("promptpay-amount-input");
    const val = recommendedAmount > 0 ? Math.ceil(recommendedAmount) : parseFloat(input?.value || "100");
    if (input) input.value = val;
    this.switchGateway("promptpay");
    this.updatePromptPayQr(val);
  }

  close() {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage('home');
    }
    this.clearFeedbacks();
  }

  clearFeedbacks() {
    ["promptpay-feedback", "truemoney-feedback", "bank-transfer-feedback"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("hidden");
        el.innerHTML = "";
      }
    });
  }

  switchGateway(tabKey) {
    this.activeTab = tabKey;
    const tabs = ["promptpay", "truemoney", "bank_transfer"];
    
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const pane = document.getElementById(`gateway-panel-${t}`);
      
      if (t === tabKey) {
        if (btn) {
          btn.className = "topup-tab-btn active h-11 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-white/[0.08] text-white border border-white/[0.18] shadow-sm";
        }
        if (pane) pane.classList.remove("hidden");
      } else {
        if (btn) {
          btn.className = "topup-tab-btn h-11 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent";
        }
        if (pane) pane.classList.add("hidden");
      }
    });

    if (tabKey === "promptpay") {
      const val = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");
      this.updatePromptPayQr(val);
    }

    if (window.lucide) lucide.createIcons();
  }

  updatePromptPayQr(amount) {
    const qrImg = document.getElementById("promptpay-qr-img");
    const amountText = document.getElementById("promptpay-qr-amount-text");
    const val = Math.max(1, parseFloat(amount) || 100);

    if (amountText) amountText.textContent = `฿${val.toFixed(2)}`;
    if (!qrImg) return;

    const rawQrUrl = this.paymentService.getPromptPayQrUrl(val);
    qrImg.src = rawQrUrl;

    // Render Canvas with authentic NYX9 STUDIO Anti-ABC Watermark Image
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 500;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");

          // 1. Draw PromptPay QR Code
          ctx.drawImage(img, 0, 0, size, size);

          // 2. Draw Authentic Shop Anti-ABC Watermark Image (with Logo silhouette + 3-line text)
          const wm = new Image();
          wm.crossOrigin = "anonymous";
          wm.onload = () => {
            try {
              ctx.drawImage(wm, 0, 0, size, size);
              qrImg.src = canvas.toDataURL("image/png");
            } catch (err) {
              console.warn("[QR WATERMARK] Composite error:", err);
            }
          };
          wm.src = "assets/qr-watermark-overlay.png";
        } catch (canvasErr) {
          console.warn("[QR WATERMARK] Canvas compositing fallback:", canvasErr);
        }
      };
      img.src = rawQrUrl;
    } catch (e) {
      console.warn("[QR WATERMARK] Error:", e);
    }
  }

  // --- SMART SLIP QR SCANNER ---
  async handleSlipFile(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      window.UI?.toast("กรุณาเลือกไฟล์รูปภาพสลิปที่ถูกต้อง (JPG/PNG)", "warning");
      return;
    }

    const dropzoneIdle = document.getElementById("slip-dropzone-idle");
    const dropzoneScanning = document.getElementById("slip-dropzone-scanning");
    const previewImg = document.getElementById("slip-preview-img");
    const scanStatus = document.getElementById("slip-scan-status");
    const transRefInput = document.getElementById("promptpay-trans-ref-input");

    if (dropzoneIdle) dropzoneIdle.classList.add("hidden");
    if (dropzoneScanning) dropzoneScanning.classList.remove("hidden");
    if (scanStatus) {
      scanStatus.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>กำลังสแกน QR บนสลิป...</span>`;
      if (window.lucide) lucide.createIcons();
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (previewImg) previewImg.src = dataUrl;

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let qrCode = null;

          if (window.jsQR) {
            qrCode = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });
            if (!qrCode) {
              qrCode = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth"
              });
            }
          }

          if (qrCode && qrCode.data) {
            const rawData = qrCode.data.trim();
            // Thai PromptPay Slip QR extraction (tag 02 has transRef)
            let extractedRef = rawData;
            if (rawData.startsWith("0046") || rawData.includes("000001")) {
              const match = rawData.match(/(?:01\d{2})(\d{3})(?:02\d{2})([A-Za-z0-9_-]{10,35})/);
              if (match && match[2]) {
                extractedRef = match[2];
              }
            }

            if (transRefInput) {
              transRefInput.value = extractedRef;
            }

            if (scanStatus) {
              scanStatus.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i> <span class="text-emerald-400 font-bold">สแกน QR สำเร็จ! ดึงรหัสธุรกรรมอัตโนมัติ</span>`;
              if (window.lucide) lucide.createIcons();
            }

            window.UI?.toast("📸 สแกนสลิปสำเร็จ! ระบบกรอกรหัสอ้างอิงให้เรียบร้อย", "success");

            // Auto-trigger verification after 600ms
            setTimeout(() => {
              this.verifyPromptPay();
            }, 600);
          } else {
            if (scanStatus) {
              scanStatus.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-400"></i> <span class="text-amber-400 text-[11px]">ตรวจไม่พบ QR Code ในรูป กรุณากรอกรหัสอ้างอิงด้านล่าง</span>`;
              if (window.lucide) lucide.createIcons();
            }
            window.UI?.toast("ตรวจไม่พบ QR บนรูปสลิป กรุณาระบุรหัสอ้างอิงด้วยตนเอง", "warning");
          }
        } catch (err) {
          console.warn("[SLIP SCANNER] Scan error:", err);
          if (scanStatus) {
            scanStatus.innerHTML = `<span class="text-rose-400 text-[11px]">การสแกนล้มเหลว กรุณากรอกรหัสด้วยตนเอง</span>`;
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // --- ACTIONS ---
  async verifyPromptPay() {
    const btn = document.getElementById("btn-verify-promptpay");
    const amount = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");
    const transRef = document.getElementById("promptpay-trans-ref-input")?.value.trim();

    if (!transRef) {
      window.UI?.toast("กรุณากรอกรหัสอ้างอิงสลิป / TransRef", "warning");
      return;
    }

    this.setBtnLoading(btn, "กำลังตรวจสอบสลิป...");
    try {
      await this.paymentService.verifyPromptPaySlip(amount, transRef);
      window.UI?.confetti();
      window.UI?.toast(`ชำระเงินผ่าน PromptPay สำเร็จ +฿${amount.toFixed(2)}!`, "success");
      document.getElementById("promptpay-trans-ref-input").value = "";
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      window.UI?.toast(err.message, "error");
    } finally {
      this.resetBtn(btn, `<i data-lucide="shield-check" class="w-4 h-4"></i> <span>ตรวจสอบสลิปและปรับยอดทันที</span>`);
    }
  }

  async redeemTrueMoney() {
    const btn = document.getElementById("btn-redeem-truemoney");
    const input = document.getElementById("truemoney-voucher-input");
    const url = input?.value.trim();

    if (!url || !url.includes("?v=")) {
      window.UI?.toast("กรุณากรอกลิงก์ซองของขวัญ TrueMoney ให้ถูกต้อง", "warning");
      return;
    }

    this.setBtnLoading(btn, "กำลังรับเงินจากซอง...");
    try {
      const res = await this.paymentService.redeemTrueMoneyVoucher(url);
      window.UI?.confetti();
      window.UI?.toast(`รับเงินจากซองของขวัญสำเร็จ +฿${res.amount.toFixed(2)}!`, "success");
      input.value = "";
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      window.UI?.toast(err.message, "error");
    } finally {
      this.resetBtn(btn, `<i data-lucide="sparkles" class="w-4 h-4"></i> <span>รับเงินจากซองของขวัญทันที</span>`);
    }
  }

  async verifyBankTransfer() {
    const btn = document.getElementById("btn-verify-bank");
    const amount = parseFloat(document.getElementById("bank-transfer-amount")?.value || "100");
    const transRef = document.getElementById("bank-transfer-transref")?.value.trim();

    if (!transRef) {
      window.UI?.toast("กรุณากรอกรหัสอ้างอิงสลิปโอนเงิน", "warning");
      return;
    }

    this.setBtnLoading(btn, "กำลังตรวจสอบสลิปธนาคาร...");
    try {
      await this.paymentService.verifyBankTransferSlip(amount, transRef);
      window.UI?.confetti();
      window.UI?.toast(`เติมเงินผ่านธนาคารสำเร็จ +฿${amount.toFixed(2)}!`, "success");
      document.getElementById("bank-transfer-transref").value = "";
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      window.UI?.toast(err.message, "error");
    } finally {
      this.resetBtn(btn, `<i data-lucide="shield-check" class="w-4 h-4"></i> <span>ตรวจสอบสลิปและปรับยอดทันที</span>`);
    }
  }

  setBtnLoading(btn, text) {
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>${text}</span>`;
    if (window.lucide) lucide.createIcons();
  }

  resetBtn(btn, html) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }
}

if (typeof window !== "undefined") {
  window.TopUpModalComponent = TopUpModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TopUpModalComponent;
}
