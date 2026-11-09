/**
 * ==============================================================================
 * 🛡️ NYX9 STUDIO — CLIENT-SIDE BOT SHIELD AGENT (Sprint 5)
 * ==============================================================================
 * แก้โจทย์ Proof-of-Work (PoW) ทางคณิตศาสตร์ในเสี้ยววินาที (~15ms)
 * เพื่อรับรองว่าเป็นมนุษย์/เบราว์เซอร์จริง ไม่ใช่บอทสแปม โดยไม่รบกวน UX ของผู้ใช้
 * ==============================================================================
 */

class BotShieldClient {
  constructor() {
    this.cachedToken = null;
    this.tokenExpiry = 0;
  }

  async sha256(str) {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    } else {
      // Node fallback
      const crypto = require("crypto");
      return crypto.createHash("sha256").update(str).digest("hex");
    }
  }

  async getShieldToken(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    try {
      // 1. Fetch challenge from API
      const res = await fetch("/api/bot-shield?action=challenge");
      if (!res.ok) throw new Error("Failed to fetch challenge");
      const data = await res.json();
      if (!data.success || !data.challenge) throw new Error("Invalid challenge response");

      const { nonce, timestamp, difficulty, signature } = data.challenge;
      const targetPrefix = "0".repeat(difficulty || 3);

      // 2. Solve Proof-of-Work
      let solution = 0;
      let solved = false;
      const maxIterations = 200000;

      while (!solved && solution < maxIterations) {
        solution++;
        const testStr = `${nonce}:${solution}`;
        const hash = await this.sha256(testStr);
        if (hash.startsWith(targetPrefix)) {
          solved = true;
          break;
        }
      }

      if (!solved) throw new Error("PoW solve timeout");

      // 3. Package token as base64
      const tokenPayload = {
        nonce,
        timestamp,
        solution,
        signature
      };

      const tokenStr = typeof btoa !== "undefined"
        ? btoa(JSON.stringify(tokenPayload))
        : Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

      this.cachedToken = tokenStr;
      this.tokenExpiry = now + 90 * 1000; // cache for 90s

      return tokenStr;
    } catch (err) {
      console.warn("[BOT SHIELD CLIENT]: Warning solving PoW:", err.message);
      return null;
    }
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.BotShieldClient = BotShieldClient;
  window.BotShield = new BotShieldClient();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = BotShieldClient;
}
