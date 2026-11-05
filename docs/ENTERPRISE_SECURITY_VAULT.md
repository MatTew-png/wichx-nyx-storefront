# 🛡️ NYX9 STUDIO — ENTERPRISE SECURITY & FINANCIAL VAULT
> **System Classification:** Commercial Digital E-Commerce Architecture  
> **Security Protocol:** AES-256-GCM Encryption, Zero-Trust Pricing, Anti-Bot & ACID Transactions  
> **Repository:** [https://github.com/MatTew-png/wichx-nyx-storefront](https://github.com/MatTew-png/wichx-nyx-storefront)

---

## 1. บทสรุปสถาปัตยกรรมความปลอดภัย 5 เสาหลัก (Financial Defense Suite)

1. **Cloudflare WAF & IP Cloaking:** ซ่อน Origin IP จริง 100% พร้อมป้องกันการโจมตี DDoS
2. **Honeypot Anti-Bot Trap:** ดักจับสคริปต์สแปมล่องหนผ่านช่อง input ซ่อน
3. **Server-Side Price Authority:** ปิดช่องโหว่ Inspect Element แก้ตัวเลขราคา
4. **Idempotency Key Lock:** ป้องกันลูกค้าเน็ตกระตุกแล้วกดปุ่มชำระเงินซ้ำ
5. **AES-256-GCM Crypto Vault:** เข้ารหัสรหัสผ่านไอดีดิจิทัลในฐานข้อมูล ปลอดภัยแม้มีข้อมูลรั่วไหล

---

## 2. ดัชนีสารบบฐานข้อมูล 12 ตาราง (Database Catalog)

| # | ตาราง | หน้าที่หลัก | ระดับความปลอดภัย |
|---|---|---|---|
| 1 | `profiles` | ยอดเงินในกระเป๋า (Wallet) และข้อมูลสมาชิก | Balance ห้ามติดลบ (`CHECK balance >= 0`) |
| 2 | `categories` | หมวดหมู่สินค้าทั้ง 4 หมวด | ควบคุมลำดับการแสดงผล |
| 3 | `products` | รายการสินค้า, ราคาจริง, ชิปไอคอน | ควบคุมการเปิด/ปิดด้วย `is_active` |
| 4 | `inventory_keys` | คลังเก็บรหัสสินค้าดิจิทัล (เข้ารหัส AES-256) | มีดัชนีคัดแยกเฉพาะรหัสที่ยังไม่ขาย |
| 5 | `orders` | บันทึกคำสั่งซื้อหลัก | สถานะ `PAID`, `PENDING`, `REFUNDED` |
| 6 | `order_items` | รายการสินค้าในแต่ละออเดอร์ | บันทึกรหัสที่ส่งมอบและฟอร์มบริการ |
| 7 | `topup_transactions` | ประวัติการเติมเงิน (PromptPay, TrueMoney, LTC) | ตรวจสอบย้อนหลังได้ทุกบาท |
| 8 | `used_payment_slips` | ระบบป้องกันสลิปซ้ำ | รหัส `slip_trans_ref` ห้ามซ้ำเด็ดขาด (`UNIQUE`) |
| 9 | `promo_code_usages` | ระบบจำกัดสิทธิ์โค้ดส่วนลด | บังคับ `UNIQUE(user_id, code)` 1 คนใช้ได้ 1 ครั้ง |
| 10 | `warranty_claims` | ระบบบันทึกคำร้องขอเคลมประกันสินค้า | ติดตามสถานะและรหัสชดเชย |
| 11 | `blacklists` | ระบบแบนไอดีคนโกงและบอท | แบนตาม IP, Discord ID หรือเบอร์ TrueMoney |
| 12 | `system_audit_logs` | บันทึกเหตุการณ์เซิร์ฟเวอร์ระดับละเอียด | เก็บ IP, User Agent, เวลา สำหรับคลี่คลายข้อพิพาท |

---

## 3. ไฟล์โค้ดที่เกี่ยวข้องในโปรเจกต์

- [**`database/schema.sql`**](../database/schema.sql): สคริปต์ SQL 12 ตาราง พร้อมฟังก์ชัน `dispense_product_key()`
- [**`api/crypto-vault.js`**](../api/crypto-vault.js): ระบบเข้ารหัส-ถอดรหัส AES-256-GCM
- [**`api/checkout.js`**](../api/checkout.js): ตัวประมวลผลคำสั่งซื้อฝั่ง Serverless ป้องกันการโกงราคา
