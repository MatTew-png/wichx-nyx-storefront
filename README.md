# ⚡ NYX9 STUDIO — COMMERCIAL WHITELABEL DIGITAL STOREFRONT
> Commercial-Grade, Action-Driven & Fully Responsive Cyber E-Commerce Architecture  
> GitHub Repository: [https://github.com/MatTew-png/wichx-nyx-storefront](https://github.com/MatTew-png/wichx-nyx-storefront)

สถาปัตยกรรมเทมเพลตร้านค้าดิจิทัลระดับโปรดักชัน สังเคราะห์จุดแข็งจาก **`xenonhub.pro`**, **`melody191.shop`** และ **`wichxshop.com`** ยกระดับสโตร์สู่เวอร์ชั่น Cyberpunk Glacier Cyan พร้อมระบบ Serverless API Backend สำหรับการ Deploy สู่ Vercel / Cloudflare ทันที

---

## 📁 โครงสร้างโปรเจกต์ (Production Architecture)

```text
WebShop/
├── .github/workflows/deploy.yml # 🚀 CI/CD Automated Verification
├── api/                         # ⚡ Serverless API Backend Handlers
│   ├── verify-slip.js           # ระบบตรวจสอบสลิป PromptPay อัตโนมัติ (Slip Verify)
│   ├── discord-notify.js        # ระบบแจ้งเตือนคำสั่งซื้อเข้า Discord Webhook
│   ├── truemoney-redeem.js      # ระบบตรวจรับเงินจากซองของขวัญ TrueMoney
│   └── crypto-ltc.js            # ระบบตรวจสอบบล็อกเชน Litecoin (LTC)
├── index.html                   # โครงสร้างหน้าร้าน Capsule Glass & Cyber Canvas
├── storeConfig.js               # 🚀 WHITELABEL ENGINE: เปลี่ยนแบรนด์ใน 1 ไฟล์
├── productsData.js              # 📦 แคตตาล็อกสินค้า 4 หมวด พร้อม 16:9 SVG Artwork
├── app.js                       # 🎮 Frontend Controller (Cart, Modals, Top-Up, Toasts)
├── styles.css                   # 🎨 Design System, Masked Ticker, Micro-Interactions
├── vercel.json                  # 🌐 การตั้งค่า Routing & Headers สำหรับ Vercel
├── .env.example                 # 🔐 ตัวอย่างคีย์ Environment สำหรับขึ้น Production
└── package.json                 # สคริปต์รันเซิร์ฟเวอร์
```

---

## 🚀 สรุประบบที่ติดตั้งและพร้อมใช้งาน (Deployed Capabilities)

1. **Top System Feed (Masked Cyber Capsules):**
   - แถบประกาศด้านบนสุดรูปแบบแคปซูลแก้ว มีป้ายหมวดหมู่แยกสี (`[FLASH SALE]`, `[AUTO 24/7]`, `[VERIFIED]`, `[LTC BONUS]`)
   - ไฟสัญญาณเรดาร์เขียวกะพริบ `[● SYSTEM FEED]` และสถานะ `24/7 AUTO | PING: 18ms`
   - เอฟเฟกต์ Gradient Masking ซ้าย-ขวา ตัวหนังสือเลื่อนเข้า-ออกเนียนตา
2. **Dual-Fulfillment Flow:**
   - **Instant Credentials Delivery:** กล่องรหัส `เมล:รหัสผ่าน` เด้งทันทีหลังสั่งซื้อ พร้อมปุ่มคัดลอก และปุ่มดาวน์โหลดใบเสร็จ `.txt`
   - **Custom Service Forms:** ฟอร์มรับข้อมูลเฉพาะบริการ เช่น ปั๊มคนดิสคอร์ด (สไลเดอร์คำนวณราคา), ยืนยันเบอร์ OTP สด (สุ่มเบอร์ + OTP สด), และทำตราเควสต์ Discord
3. **Tri-Gateway Top-Up Modal:**
   - PromptPay QR Code แบบไดนามิก + ระบบจำลองตรวจยอด
   - TrueMoney Wallet รับเงินจากลิงก์ซองของขวัญอัตโนมัติ
   - Crypto LTC (Litecoin Native) พร้อมโบนัสเงินเพิ่มฟรี +5%
4. **Production Serverless Backend (`/api`):**
   - พร้อมรองรับการเชื่อมต่อ API ตรวจสลิปจริง (OpenSlipVerify / EasySlip)
   - พร้อมส่ง Embed การสั่งซื้อแจ้งเตือนเข้าช่อง Discord Webhook ของร้านค้าทันที

---

## 🌐 วิธีนำขึ้น Production (Vercel 1-Click Deployment)

โปรเจกต์นี้เชื่อมต่อกับ GitHub Repository เรียบร้อยแล้ว:
1. เข้าไปที่ [Vercel Dashboard](https://vercel.com/new)
2. เลือก Repository **`MatTew-png/wichx-nyx-storefront`**
3. ใส่ค่า Environment Variables จากไฟล์ [`.env.example`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/.env.example):
   - `DISCORD_WEBHOOK_URL` (ลิงก์ Webhook จาก Discord Server)
   - `SLIP_VERIFY_API_KEY` (คีย์ตรวจสลิป ถ้ามี)
   - `TRUEMONEY_PHONE` (เบอร์รับเงิน TrueMoney)
4. กด **Deploy** เว็บไซต์จะออนไลน์ทันที พร้อมใช้งานระบบ SSL ฟรี และสามารถผูก Custom Domain (เช่น `nyxning.shop`) ได้ทันทีในเมนู Settings > Domains
