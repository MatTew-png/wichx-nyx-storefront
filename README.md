# ⚡ WICHX × NYX STUDIO — WHITELABEL DIGITAL STOREFRONT TEMPLATE
> Commercial-Grade, Action-Driven & Fully Responsive Cyber E-Commerce Architecture

สถาปัตยกรรมเทมเพลตร้านค้าดิจิทัลระดับคอมเมอร์เชียลที่สังเคราะห์จุดแข็งจาก 3 สุดยอดเว็บชอปแถวหน้า:
- **`xenonhub.pro`**: Cyber Hero, Social Proof Live Order Feed & Telemetry Grid
- **`melody191.shop`**: Dual-Fulfillment Flow (Instant Key Modal vs Custom Service Forms) & Tri-Gateway Top-Up
- **`wichxshop.com`**: Multi-Niche Catalog, Stock Badges, Hero Promo Carousel & Crypto LTC (+5% Bonus)

---

## 📁 โครงสร้างโปรเจกต์ (Zero-Dependency & 100% Portable)

```text
WebShop/
├── index.html            # โครงสร้างหลัก สไตล์ Capsule Glass & Cyber Canvas
├── storeConfig.js        # 🚀 WHITELABEL ENGINE: ไฟล์ปรับแต่งแบรนด์ & ธีมเพียง 1 ไฟล์
├── productsData.js       # 📦 ฐานข้อมูลสินค้าทั้ง 4 หมวดหมู่ พร้อม SVG Artwork 16:9
├── app.js                # ⚡ ระบบควบคุม (Cart, Fulfillment, Top-Up, Social Proof, Toast)
├── styles.css            # 🎨 ระบบสี Glacier Cyan + Obsidian Void และ Micro-Interactions
├── package.json          # สคริปต์รันเซิร์ฟเวอร์แบบเบาแรง
└── README.md             # คู่มือการใช้งานและเอกสารสถาปัตยกรรม
```

---

## 🚀 จุดเด่นของสถาปัตยกรรม (Key Architectural Highlights)

### 1. 1-File Whitelabel Rebranding (`storeConfig.js`)
แก้ไขเพียงไฟล์เดียวเพื่อเปลี่ยนอัตลักษณ์ของร้านค้าทั้งระบบ:
- **ชื่อร้าน & สโลแกน**: อัปเดตทุกจุดบนหน้าเว็บอัตโนมัติ (Header, Navbar, Footer, Document Title)
- **ธีมสี**: ระบบจะแปลงค่า HEX จาก `storeConfig.theme` เข้าสู่ CSS Variables (`--accent`, `--base-bg`, `--card-bg`) ทันที
- **คอนแทค & ลิงก์โซเชียล**: Discord Community, LINE Official, Email Support
- **สถิติความน่าเชื่อถือ (Telemetry Grid)**: ผู้ใช้งาน, สินค้าพร้อมส่ง, ออเดอร์สำเร็จ, Uptime

### 2. Dual-Fulfillment System (ระบบจัดส่ง 2 รูปแบบในระบบเดียว)
- **Instant Credentials Delivery (จัดส่งทันที)**:
  - ใช้กับสินค้าประเภท Nitro Mailpass, ไอดี FiveM, คีย์ Windows, ไอดีสตรีมมิ่ง
  - แสดงกล่องข้อมูล `เมล:รหัสผ่าน` หรือคีย์ทันทีหลังตัดยอดเงิน
  - ปุ่ม **[ คัดลอกข้อมูล ]** แบบคลิกเดียว พร้อมปุ่ม **[ บันทึกไฟล์ .TXT ]** ออกเป็นใบเสร็จอัตโนมัติ
- **Custom Service Forms (ฟอร์มรับคำขอบริการ)**:
  - **ปั๊มคนเข้า Discord**: ช่องกรอก Invite Link + แถบเลื่อน (Slider) เลือกจำนวนสมาชิก 100 - 1,000 คน พร้อมคำนวณราคาเรียลไทม์ (฿0.50/คน)
  - **ยืนยันเบอร์ OTP สด**: เลือกประเทศ (ไทย, สหรัฐ, เวียดนาม, ฟิลิปปินส์) + ปุ่มขอรับเบอร์เสมือน + กล่องจำลองรหัส OTP สด
  - **ทำตราเควสต์ Discord (Quest Badge)**: ช่องกรอก Discord User ID พร้อมคำแนะนำการเปิด Developer Mode
  - **YouTube/Spotify Family**: ช่องกรอก Gmail เพื่อรับคำเชิญ

### 3. Tri-Gateway Top-Up Modal (ระบบเติมเงิน 3 ช่องทาง)
- **Tab 1: PromptPay QR Code**: กำหนดจำนวนเงินเองหรือกดปุ่มลัด (฿50, ฿100, ฿300, ฿500, ฿1,000) แสดง QR Code อัตโนมัติ พร้อมปุ่มจำลองการตรวจยอดและเติมเงินเข้ากระเป๋า
- **Tab 2: TrueMoney Wallet**: วางลิงก์ซองของขวัญ (`gift.truemoney.com`) ตรวจสอบความถูกต้องและรับเงินเข้ากระเป๋าทันที
- **Tab 3: Crypto LTC (Litecoin)**: แสดงที่อยู่ LTC Native พร้อมป้ายรับโบนัสฟรี +5% และปุ่มตรวจสอบบล็อกเชน

### 4. Graphic-First & Anti-Slop Thesis
- **16:9 Artwork**: อาร์ตเวิร์กสไตล์ Cyberpunk ที่สร้างด้วย Vector SVG คมชัดระดับ Retina ไม่ต้องกลัวรูปภาพแตกหรือลิงก์ภายนอกเสีย
- **Compact Icon Chips**: แทนที่ข้อความยาวเป็นย่อหน้าด้วยชิปข้อมูลกระชับ เช่น `[⚡ ส่งทันที]`, `[🛡️ ประกันเต็ม]`, `[💎 2 บูส]`
- **Zero Browser Native Alerts**: แจ้งเตือนทุกอย่างผ่าน Custom Cyber Glass Toasts และ Modals

---

## 🛠️ วิธีการเปิดใช้งาน (Quick Start)

### วิธีที่ 1: ดับเบิลคลิกเปิดใช้งานทันที
เปิดไฟล์ `index.html` ด้วยเว็บเบราว์เซอร์ใดก็ได้ (Chrome, Edge, Safari, Brave) ใช้งานได้ทันที 100%

### วิธีที่ 2: รันผ่าน Local Server
```bash
npm start
# หรือ
npx serve -l 3000 .
```
แล้วเปิดเบราว์เซอร์ไปที่ `http://localhost:3000`
