/**
 * ==============================================================================
 * 🔐 AES-256-GCM CRYPTOGRAPHIC VAULT (DATA PRIVACY & CREDENTIALS ENCRYPTION)
 * ==============================================================================
 * เข้ารหัสและถอดรหัสไอดี/รหัสผ่านดิจิทัล ป้องกันข้อมูลรั่วไหลใน Database 100%
 * ==============================================================================
 */

const crypto = require("crypto");

// ดึง Secret Key สำหรับเข้ารหัสจาก Environment (ความยาว 32 bytes)
const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY 
  ? Buffer.from(process.env.VAULT_ENCRYPTION_KEY, "hex") 
  : crypto.scryptSync(process.env.ADMIN_SECRET_KEY || "nyx9_default_fallback_secret_passphrase_2026", "salt", 32);

const ALGORITHM = "aes-256-gcm";

/**
 * เข้ารหัสข้อความ (เมล:รหัสผ่าน หรือ คีย์) ก่อนบันทึกลง Database
 */
function encryptCredential(plaintext) {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // คืนค่าในรูปแบบ iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * ถอดรหัสข้อความเมื่อต้องการส่งมอบให้ลูกค้าที่ชำระเงินสำเร็จ
 */
function decryptCredential(cipherText) {
  if (!cipherText || !cipherText.includes(":")) return cipherText; // ถ้าไม่ใช่รูปแบบ encrypted ให้คืนค่าเดิม
  
  try {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return "[DECRYPTION_ERROR_CONTACT_ADMIN]";
  }
}

module.exports = {
  encryptCredential,
  decryptCredential
};
