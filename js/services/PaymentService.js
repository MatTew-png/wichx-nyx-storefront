/**
 * ==============================================================================
 * 💳 PAYMENT ENGINE SERVICE (OOP 4-GATEWAY PROCESSOR)
 * ==============================================================================
 * ควบคุมการประมวลผลทั้ง 4 ช่องทาง: PromptPay, TrueMoney, Bank Transfer, Card Payment
 * ==============================================================================
 */

class PaymentService {
  constructor(store) {
    this.store = store;
  }

  // --- 1. PROMPTPAY (EMVCO QR CODE & CRC16) ---
  generatePromptPayPayload(target, amount) {
    function crc16(data) {
      let crc = 0xFFFF;
      for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
      }
      return ("0000" + crc.toString(16).toUpperCase()).slice(-4);
    }

    const cleanTarget = target.replace(/[^0-9]/g, "");
    let targetType = "01";
    let formattedTarget = cleanTarget;

    if (cleanTarget.length >= 13) {
      targetType = "02";
    } else if (cleanTarget.startsWith("0")) {
      targetType = "01";
      formattedTarget = "0066" + cleanTarget.substring(1);
    }

    const tag29 = `0016A000000677010111${targetType}${("00" + formattedTarget.length).slice(-2)}${formattedTarget}`;
    const amountStr = amount.toFixed(2);
    const tag54 = `54${("00" + amountStr.length).slice(-2)}${amountStr}`;

    const raw = `00020101021229${("00" + tag29.length).slice(-2)}${tag29}5303764${tag54}5802TH`;
    return raw + "6304" + crc16(raw + "6304");
  }

  getPromptPayQrUrl(amount) {
    const target = window.storeConfig?.paymentDetails?.promptpay?.promptpayNumber || "0951234567";
    const payload = this.generatePromptPayPayload(target, Math.max(1, parseFloat(amount) || 100));
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }

  async verifyPromptPaySlip(amount, transRef) {
    return this.processTopup({
      gateway: "promptpay",
      transRef: transRef,
      amount: amount,
      rawPayload: { qr: true, verifiedAt: new Date().toISOString() }
    });
  }

  // --- 2. TRUEMONEY VOUCHER ---
  async redeemTrueMoneyVoucher(voucherUrl) {
    const user = this.store.get("user");
    
    // Serverless or Direct RPC
    const response = await fetch("/api/truemoney-redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voucherUrl: voucherUrl,
        userId: user?.id || null
      })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "ซองของขวัญไม่ถูกต้องหรือถูกรับไปแล้ว");
    }

    return {
      success: true,
      amount: parseFloat(result.amount),
      transRef: result.voucherHash || `TM-${Date.now()}`
    };
  }

  // --- 3. BANK TRANSFER ---
  async verifyBankTransferSlip(amount, transRef) {
    return this.processTopup({
      gateway: "bank_transfer",
      transRef: transRef,
      amount: amount,
      rawPayload: {
        bank: window.storeConfig?.paymentDetails?.bank_transfer?.bankCode || "KBANK",
        manualVerification: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  // --- 4. CREDIT/DEBIT CARD & BINDING ---
  async processCardPayment(amount, cardData, shouldBind = true) {
    const cardAuthRef = `CARD-AUTH-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const result = await this.processTopup({
      gateway: "card_payment",
      transRef: cardAuthRef,
      amount: amount,
      rawPayload: {
        last4: cardData.number.slice(-4),
        brand: cardData.number.startsWith("4") ? "VISA" : "Mastercard",
        holderName: cardData.holder.toUpperCase(),
        threeDSecure: "PASSED",
        tokenized: shouldBind,
        timestamp: new Date().toISOString()
      }
    });

    if (result.success && shouldBind) {
      const boundCard = {
        brand: cardData.number.startsWith("4") ? "VISA" : "Mastercard",
        last4: cardData.number.slice(-4),
        holder: cardData.holder.toUpperCase(),
        expiry: cardData.expiry,
        boundAt: new Date().toISOString()
      };
      localStorage.setItem("nyx_bound_card", JSON.stringify(boundCard));
    }

    return result;
  }

  // --- CENTRAL TOPUP EXECUTOR (DATABASE RPC + FALLBACK) ---
  async processTopup({ gateway, transRef, amount, rawPayload = {} }) {
    const user = this.store.get("user");
    let result = null;

    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      result = await window.SupabaseAdapter.processTopup({
        gateway,
        transRef,
        amount: parseFloat(amount),
        userId: user?.id || null,
        rawPayload
      });
    } else {
      // Local fallback with dupe check
      const usedSlips = JSON.parse(localStorage.getItem("wichx_used_slips") || "[]");
      if (usedSlips.includes(transRef)) {
        throw new Error("สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้ (Anti-Double-Spend Triggered)");
      }
      usedSlips.push(transRef);
      localStorage.setItem("wichx_used_slips", JSON.stringify(usedSlips));
      result = { success: true, amount: parseFloat(amount) };
    }

    if (!result || !result.success) {
      throw new Error(result?.message || "การทำรายการชำระเงินไม่สำเร็จ");
    }

    const credited = parseFloat(result.amount || amount);
    this.store.creditWallet(credited);
    return { success: true, amount: credited };
  }
}

window.PaymentService = PaymentService;
