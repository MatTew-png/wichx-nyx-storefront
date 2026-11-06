# 🛡️ CLOUDFLARE TUNNEL & ORIGIN PROTECTION GUIDE

> **โปรเจกต์:** NYX9 STUDIO Storefront (`nyxning.shop`)  
> **หมวดหมู่:** Zero-Trust Origin Cloaking & Asset Protection

---

## 1. 🔍 ทำความเข้าใจสถาปัตยกรรมโฮสติ้งของระบบในปัจจุบัน

เว็บไซต์ `nyxning.shop` ปัจจุบันมีโครงสร้างการทำงานดังนี้:
* **DNS & WAF Edge:** ทำงานผ่าน **Cloudflare** (เปิดส้ม Proxied ☁️)
* **Frontend & Serverless API Hosting:** ทำงานบน **Vercel Edge Network** (ชี้ CNAME ไปที่ `cname.vercel-dns.com`)

### ข้อเท็จจริงสำคัญเกี่ยวกับ Cloudflare Tunnel:
* **Cloudflare Tunnel (`cloudflared`)** เป็นโปรแกรม Agent ที่ต้องติดตั้งลงบน **Origin Server ส่วนตัว (เช่น Linux VPS, Docker Container, หรือเครื่องคอมพิวเตอร์)** เพื่อต่อท่อ Outbound connection กลับไปยัง Cloudflare โดยไม่ต้องเปิด Inbound Port ใดๆ
* แต่เนื่องจาก **Vercel** เป็นแพลตฟอร์มแบบ Serverless / PaaS ที่ควบคุมโดย Vercel เอง ผู้ใช้งานจึงไม่สามารถสั่งติดตั้ง Background Daemon อย่าง `cloudflared` บน Vercel ได้โดยตรง

ดังนั้น มาตรการรักษาความปลอดภัยจึงถูกแบ่งเป็น **2 แนวทางที่สมบูรณ์แบบ 100%** ดังนี้:

---

## 2. 🛡️ แนวทางที่ 1: การป้องกัน Origin บน Vercel (Vercel Origin Shield)

เพื่อป้องกันไม่ให้แฮกเกอร์เข้าเว็บผ่านลิงก์ `*.vercel.app` โดยตรง หรือเจาะไฟล์ระบบโดยไม่ผ่าน Cloudflare WAF:

### สิ่งที่ระบบอัปเดตให้ในโค้ดเรียบร้อยแล้ว:
1. **สร้างไฟล์ `.vercelignore`**:
   * ปิดกั้นไม่ให้ Vercel อัปโหลดไฟล์ฐานข้อมูล `database/schema.sql`, ไฟล์สคริปต์ `scripts/`, `scratch/`, `docs/`, และไฟล์ `.env*` ขึ้นไปยังเซิร์ฟเวอร์การผลิตโดยเด็ดขาด
2. **อัปเกรด `vercel.json` (Security Rewrites)**:
   * ดักจับและเขียนทับ (Rewrite) ทุกคำขอที่เรียกหา `database/`, `scripts/`, `package.json`, `dev-server.js`, `*.sql` ให้คืนค่าเป็น SPA Fallback (หน้าเว็บปกติ) ทันที เพื่อไม่ให้เกิด Data Leakage
3. **การล็อก Header ระหว่าง Cloudflare กับ Vercel (Secret Header Lockdown)**:
   * **ฝั่ง Cloudflare:** ไปที่ **Rules > Transform Rules > Modify Request Header**
     * ตั้งชื่อ: `Vercel Origin Key`
     * When incoming requests match: `All incoming requests`
     * Set dynamic/static header: `X-Origin-Secret` = `nyx9_secure_vault_token_999`
   * **ฝั่ง Vercel:** หากไม่พบ Header นี้ ให้ส่งกลับเป็น 403 Forbidden ทันที

---

## 3. 🚀 แนวทางที่ 2: การใช้ Cloudflare Tunnel จริง (สำหรับรันบน VPS / Docker / เครื่องส่วนตัว)

หากต้องการย้ายระบบมาโฮสต์บนเครื่องของตัวเอง (VPS / Windows Server / Dedicated) เพื่อใช้งาน Cloudflare Tunnel เต็มรูปแบบ 100% ปิดพอร์ต 80 และ 443 ทิ้งทั้งหมด:

### ขั้นตอนแบบ Zero Trust Token (ใช้เวลา 2 นาที):
1. เข้า **Cloudflare Dashboard** ➔ เมนูด้านซ้ายเลือก **Zero Trust**
2. ไปที่ **Networks** ➔ **Tunnels** ➔ กดปุ่ม **Add a Tunnel**
3. เลือก **Select Cloudflare (Cloudflared)** ➔ ตั้งชื่อ เช่น `nyx9-storefront`
4. เลือกระบบปฏิบัติการที่ต้องการรัน:
   * **Windows:**
     * รันสคริปต์ `.\tunnel\setup-tunnel.ps1`
     * หรือก๊อปปี้คำสั่ง `cloudflared.exe service install <TOKEN>` ไปวางใน PowerShell (Run as Administrator)
   * **Linux / Ubuntu VPS:**
     * รันคำสั่ง `sudo cloudflared service install <TOKEN>`
   * **Docker:**
     * นำ Token ไปใส่ในไฟล์ `tunnel/docker-compose.yml` แล้วสั่ง `docker compose up -d`
5. ในหน้า Cloudflare Dashboard เมนู **Public Hostnames**:
   * **Subdomain:** ปล่อยว่าง (หรือใส่ `www`)
   * **Domain:** เลือก `nyxning.shop`
   * **Type:** `HTTP`
   * **URL:** `localhost:3000` (หรือพอร์ตที่ Web Server รันอยู่)
6. กด **Save Tunnel** — เรียบร้อย!
   * เซิร์ฟเวอร์จะเชื่อมต่อตรงกับ Edge ของ Cloudflare
   * ไม่ต้องเปิด Port Forwarding บนเราเตอร์ และไม่ต้องเปิดพอร์ต 80/443 บน Firewall เลย

---

## 4. 📋 สรุปไฟล์ที่จัดเตรียมให้ในชุดนี้

| ไฟล์ | หน้าที่ |
|---|---|
| [`.vercelignore`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/.vercelignore) | ป้องกันไฟล์ความลับ (`schema.sql`, `scripts/`, `.env`) ไม่ให้หลุดขึ้น Production |
| [`vercel.json`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/vercel.json) | กฎ Rewrite บล็อกการเข้าถึงไฟล์ระบบ และ Security Headers |
| [`.cfignore`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/.cfignore) | กฎเพิกถอนไฟล์ความลับสำหรับ Cloudflare Pages / Workers |
| [`dev-server.js`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/dev-server.js) | เว็บเซิร์ฟเวอร์สำหรับรันในเครื่อง พร้อมระบบป้องกันไฟล์ซ่อนและ `.env` |
| [`tunnel/config.example.yml`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/tunnel/config.example.yml) | ไฟล์คอนฟิก Cloudflare Tunnel มาตรฐาน (Ingress mapping) |
| [`tunnel/setup-tunnel.ps1`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/tunnel/setup-tunnel.ps1) | สคริปต์ดาวน์โหลดและตั้งค่า Tunnel บน Windows อัตโนมัติ |
| [`tunnel/setup-tunnel.sh`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/tunnel/setup-tunnel.sh) | สคริปต์ติดตั้ง Tunnel บน Ubuntu / Linux VPS อัตโนมัติ |
| [`tunnel/docker-compose.yml`](file:///c:/Users/_newgen/Documents/antigravity/WebShop/tunnel/docker-compose.yml) | ตัวรัน Cloudflare Tunnel ในรูปแบบ Docker Container |
