# 🛡️ NYX9 STUDIO — ENTERPRISE SECURITY & FINANCIAL VAULT
> **Document Version:** 2.0.0 (Production Hardened Release)  
> **System Classification:** Commercial Digital E-Commerce Architecture  
> **Security Protocol:** AES-256-GCM Encryption, Zero-Trust Pricing, Anti-Bot, ACID Row-Locking & Privilege Isolation  
> **Repository:** [https://github.com/MatTew-png/wichx-nyx-storefront](https://github.com/MatTew-png/wichx-nyx-storefront)

---

## 1. บทสรุปสถาปัตยกรรมความปลอดภัย 5 เสาหลัก (Financial Defense Suite)

1. **Cloudflare WAF & IP Cloaking:** ซ่อน Origin IP จริง 100% พร้อมจัดการ DNS Proxying (`wrangler.jsonc`, `_headers`), ป้องกัน DDoS, บังคับใช้ HSTS และ Security Headers (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff)
2. **Honeypot Anti-Bot Trap:** ดักจับสคริปต์สแปมล่องหนผ่านช่อง input ซ่อนใน Checkout & ฟอร์มบริการ หากบอทกรอกค่าเข้ามา ระบบจะปฏิเสธคำขอทันที
3. **Server-Side Price Authority:** สถาปัตยกรรม Zero-Trust ตัดสิทธิ์การกำหนดราคาจากฝั่ง Client 100% โดยเซิร์ฟเวอร์และ Stored Procedure คำนวณราคาจริงจากตาราง `products` ฝั่งฐานข้อมูลโดยตรง ปิดช่องโหว่ Inspect Element แก้ราคา
4. **Idempotency Key Lock & Anti-Double-Spend:** ป้องกันลูกค้าเน็ตกระตุกแล้วกดปุ่มชำระเงินซ้ำ และป้องกันการนำสลิปโอนเงินหรือซองของขวัญเดิมมาเคลมซ้ำผ่าน UNIQUE Constraint บน `used_payment_slips(slip_trans_ref)`
5. **AES-256-GCM Crypto Vault:** เข้ารหัสรหัสผ่านไอดีดิจิทัลก่อนบันทึกลงในคอลัมน์ `inventory_keys.credential_data` ด้วยอัลกอริทึม AES-256-GCM พร้อม IV และ Authentication Tag 16-byte ปลอดภัยแม้มีข้อมูลรั่วไหลในระดับฐานข้อมูล

---

## 2. ดัชนีสารบบฐานข้อมูล 12 ตาราง (Database Catalog) & RLS Policies

ทุกตารางเปิดใช้งาน **Row Level Security (RLS) 100% (12/12 ตาราง)** พร้อมห่อหุ้ม `auth.uid()` ในรูปแบบ `(SELECT auth.uid())` (InitPlan Subquery) เพื่อประสิทธิภาพสูงสุด:

| # | ตาราง | หน้าที่หลัก | ระดับความปลอดภัย & Constraints | RLS Policy |
|---|---|---|---|---|
| 1 | `profiles` | ยอดเงินในกระเป๋า (Wallet) และข้อมูลสมาชิก | `CHECK (balance >= 0)`, `UNIQUE(discord_id)` | เฉพาะเจ้าของไอดีหรือ Service Role อ่าน/แก้ไขได้ |
| 2 | `categories` | หมวดหมู่สินค้าทั้ง 4 หมวด | ควบคุมลำดับการแสดงผล `sort_order` | Public อ่านได้, แก้ไขได้เฉพาะ Admin |
| 3 | `products` | รายการสินค้า, ราคาจริง, ชิปไอคอน | ควบคุมการเปิด/ปิดด้วย `is_active` | Public อ่านเฉพาะที่ `is_active = true` |
| 4 | `inventory_keys` | คลังเก็บรหัสสินค้าดิจิทัล (เข้ารหัส AES-256) | มีดัชนีคัดแยกเฉพาะรหัสที่ยังไม่ขาย `is_sold = false` | **ปิดกั้น Anonymous 100% (0 Rows Leaked)** เฉพาะ Service Role / Stored Procedure เท่านั้น |
| 5 | `orders` | บันทึกคำสั่งซื้อหลัก | สถานะ `PAID`, `PENDING`, `REFUNDED` | เฉพาะเจ้าของออเดอร์อ่านประวัติของตนเองได้ |
| 6 | `order_items` | รายการสินค้าในแต่ละออเดอร์ | บันทึกรหัสที่ส่งมอบและฟอร์มบริการ | `delivered_content` เข้าถึงได้เฉพาะเจ้าของออเดอร์ |
| 7 | `topup_transactions` | ประวัติการเติมเงิน (PromptPay, TrueMoney, LTC) | ตรวจสอบย้อนหลังได้ทุกบาท ทุกเกตเวย์ | เฉพาะเจ้าของรายการและแอดมิน |
| 8 | `used_payment_slips` | ระบบป้องกันสลิปซ้ำ | รหัส `slip_trans_ref` ห้ามซ้ำเด็ดขาด (`UNIQUE`) | ตรวจจับการ Double-Spend ในระดับ Transaction |
| 9 | `promo_code_usages` | ระบบจำกัดสิทธิ์โค้ดส่วนลด | บังคับ `UNIQUE(user_id, code)` 1 คนใช้ได้ 1 ครั้ง | บันทึกประวัติการใช้คูปองรายบุคคล |
| 10 | `warranty_claims` | ระบบบันทึกคำร้องขอเคลมประกันสินค้า | ติดตามสถานะ `PENDING`, `RESOLVED`, `REJECTED` | บังคับใช้ `WITH CHECK (user_id = (SELECT auth.uid()))` |
| 11 | `blacklists` | ระบบแบนไอดีคนโกงและบอท | `UNIQUE(target_value)` แบนตาม IP, Discord, วอลเล็ต | ควบคุมการบล็อกคำสั่งซื้อและการเติมเงิน |
| 12 | `system_audit_logs` | บันทึกเหตุการณ์เซิร์ฟเวอร์ระดับละเอียด | บันทึกเหตุการณ์, IP, Payload สำหรับคลี่คลายข้อพิพาท | Append-Only เฉพาะระบบและ Stored Procedure |

---

## 3. สารบบ Stored Procedures & Atomic Functions

ฟังก์ชันทั้งหมดสร้างด้วย `SECURITY DEFINER` พร้อมตั้งค่า `search_path = public, pg_temp` เพื่อป้องกัน Search Path Injection และเพิกถอนสิทธิ์ (`REVOKE`) จาก Anonymous:

1. **`execute_order_checkout(p_order_id, p_items, p_total_amount, p_user_id, p_customer_info)`**:
   - ล็อกแถวสินค้าด้วย `FOR UPDATE SKIP LOCKED` บน `inventory_keys` ป้องกัน Race Condition
   - ตรวจสอบยอดเงินจริงใน `profiles.balance` และคำนวณราคาจริงจากตาราง `products`
   - ทำการตัดเงินในกระเป๋าและส่งมอบสินค้าในระดับ Single Transaction (ACID)
   - บันทึกลง `orders`, `order_items` และ `system_audit_logs`
2. **`process_topup(p_gateway, p_trans_ref, p_amount, p_user_id, p_raw_payload)`**:
   - ตรวจสอบความถูกต้องของสลิป/ซองของขวัญ และบันทึกลง `used_payment_slips`
   - ป้องกันการส่งสลิปซ้ำ (Anti-Double-Spend) ในระดับ Database Transaction
   - เพิ่มเครดิตเข้าสู่ `profiles.balance` แบบ Atomic
3. **`get_product_stock_counts()`**:
   - ฟังก์ชันสาธารณะสำหรับหน้าร้าน คืนค่าเฉพาะจำนวนสต็อกคงเหลือรวม (`product_id`, `in_stock_count`)
   - ไม่มีการเปิดเผยข้อมูลแถวหรือรหัสไอดีใน `inventory_keys` ให้ผู้ใช้งานภายนอก
4. **`admin_get_metrics(p_admin_secret)`**:
   - สรุปสถิติ Telemetry: ยอดขายรวม, จำนวนออเดอร์, สต็อกคงเหลือแยกรายสินค้า, ยอดเติมเงิน และเคสเคลมค้าง
   - จำกัดสิทธิ์เฉพาะ Authenticated Admin และ Service Role
5. **`admin_bulk_restock(p_admin_secret, p_product_id, p_raw_keys)`**:
   - เพิ่มสต็อกคีย์เข้ารหัสแบบชุดใหญ่ในครั้งเดียว
6. **`admin_resolve_claim(p_admin_secret, p_claim_id, p_status, p_replacement_key)`**:
   - จัดการปิดเคสเคลมประกันและส่งมอบคีย์ชดเชย
7. **`handle_new_user()`**:
   - ทริกเกอร์อัตโนมัติบน Supabase Auth สำหรับสร้างข้อมูลสมาชิกในตาราง `profiles` เมื่อล็อกอินผ่าน Discord ครั้งแรก

---

## 4. ดัชนีเพิ่มประสิทธิภาพการคิวรี (10 Covering Foreign Key Indexes)

เพื่อป้องกันการเกิด Table Scan ขนาดใหญ่เมื่อมีข้อมูลเพิ่มขึ้น:
1. `idx_products_category_id` ➔ `products(category_id)`
2. `idx_inventory_keys_product_id` ➔ `inventory_keys(product_id)`
3. `idx_inventory_keys_order_id` ➔ `inventory_keys(order_id)`
4. `idx_orders_user_id` ➔ `orders(user_id)`
5. `idx_order_items_order_id` ➔ `order_items(order_id)`
6. `idx_order_items_product_id` ➔ `order_items(product_id)`
7. `idx_topup_transactions_user_id` ➔ `topup_transactions(user_id)`
8. `idx_used_payment_slips_user_id` ➔ `used_payment_slips(user_id)`
9. `idx_promo_code_usages_user_id` ➔ `promo_code_usages(user_id)`
10. `idx_warranty_claims_order_id` ➔ `warranty_claims(order_id)`

---

## 5. การป้องกันฝั่ง Client & Admin Access Gate

- **Client Anti-Tamper:** ปิดกั้นการเปิดคลิกขวา (Context Menu), ป้องกันปุ่มลัด DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U) ใน Capture Phase
- **Admin Developer Bypass:** สามารถปลดล็อก DevTools สำหรับทีมพัฒนาได้ด้วยคีย์ลัด `Alt + Shift + D` หรือพิมพ์คำว่า `nyxdev`
- **Console Self-XSS Warning:** แสดงป้ายเตือนสีแดงใน Developer Console ป้องกันการถูกหลอกวางสคริปต์ขโมยโทเค็น
- **Discord OAuth Admin Whitelist:** ระบบตรวจสอบสิทธิ์แอดมินเทียบกับ Discord ID จริง (`483398326159671326`, `422611554475835394`)

---

## 6. เสาหลักความปลอดภัยระดับฐานข้อมูล & Edge Security (Security Hardening v2)

1. **Enforce Single-Use Promo Codes (Database Constraint):** 
   - บันทึกประวัติการใช้คูปองลงในตาราง `promo_code_usages` ในขั้นตอน `execute_order_checkout` โดยตรง
   - บังคับใช้กฎผ่านข้อจำกัด `UNIQUE(user_id, code)` ระดับฐานข้อมูล
   - หากตรวจพบว่าลูกค้ารายเดิมพยายามใช้โค้ดซ้ำ ฐานข้อมูลจะ Reject คำสั่งซื้อทันทีด้วยข้อผิดพลาด `PROMO_CODE_ALREADY_USED`

2. **Automated Blacklist Query in Transaction:** 
   - ดึงตาราง `blacklists` เข้าไปตรวจสอบอัตโนมัติใน `execute_order_checkout` และ `process_topup`
   - ตรวจสอบทั้ง `target_value` ของ Discord ID, User ID และ IP Address ของผู้ส่งคำขอ
   - หากตรงกับรายการบัญชีดำที่ยังไม่หมดอายุ ระบบจะบันทึก Critical Audit Log และปฏิเสธการทำรายการทันที (`BLACKLISTED_USER`)

3. **Edge Rate Limiting & Anti-Brute-Force:**
   - ติดตั้งตัวจำกัดอัตราคำขอ (`api/rate-limiter.js`) ในหน้า `/api/verify-slip`, `/api/truemoney-redeem` และ `/api/checkout`
   - จำกัด 5 requests / นาที ต่อ 1 IP (Sliding Window Algorithm)
   - ป้องกันการสุ่มหมายเลขอ้างอิงสลิป (TransRef) และซองของขวัญ TrueMoney หากยิงเกินโควตาจะได้รับ HTTP 429 `RATE_LIMIT_EXCEEDED` พร้อม Header `Retry-After`

4. **Unified Verification Test Suite (npm run test:verify):**
   - คำสั่งเดี่ยวตามแนวทาง pstack: `npm run test:verify` หรือ `npm test` เพื่อพิสูจน์ความสมบูรณ์ของระบบ
   - ทดสอบ RLS Leak, Zero-Trust Price recalculation, Anti-Dupe Slips/Vouchers, Promo Code Constraint, Blacklist Auto-Query และ Edge Rate Limiting
   - ผสานเข้ากับ GitHub Actions (`.github/workflows/deploy.yml`) เพื่อรันตรวจสอบอัตโนมัติก่อน Deploy ขึ้น Production ทุกครั้ง
