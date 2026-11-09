---
project: WebShop-NYX9
category: draft-intake
status: unreviewed
author: agent
created_at: 2026-11-09
target_destination: 01_Features/
tags:
  - draft
  - benchmark-analysis
  - f4ry-model-x
  - competitor-audit
  - vexzy-comparison
---

# 📊 Benchmark Audit & Deep Architecture Reverse-Engineering: F4RY Store Engine (Model X)

> **Document Type:** External Competitor Benchmark & Reverse-Engineered Architecture Specification  
> **Source Target:** `https://example.f4ry.com/` (Platform Hub: `https://f4ry.com/`)  
> **Audited By:** Antigravity AI Agent (Lead Orchestration)  
> **Related Documents:** [[10_Inbox/DRAFT_20261109_Vexzy_Feature_Gap_Analysis|Vexzy Model V Audit]] | [[02_Feature_Matrix|02_Feature_Matrix.md]]

---

## 1. 🎯 Executive Summary & Empirical Verification

| Parameter | Recorded Value / Empirical Terminal Proof |
| :--- | :--- |
| **Target URL** | `https://example.f4ry.com/` |
| **Parent Platform** | `https://f4ry.com/` (Rewritten via Caddy reverse proxy to `/platform`) |
| **System Framework** | Next.js 14/15 (App Router) + Turbopack + React Server Components (RSC) |
| **CSS & Design System** | Tailwind CSS + Radix UI / Shadcn + Lucide React (`kanit` & `line-seed-sans-th`) |
| **ORM / Data Layer** | Prisma ORM (CUID identifiers: `cmrb2h7...`) |
| **Multi-Tenancy Model** | Subdomain routing rewritten via Next.js Middleware: `/tenant/model-x` |
| **Auth Architecture** | NextAuth.js (`/api/auth`) with Credentials + OAuth (Discord, Google, Line, Facebook, GitHub) |
| **Active Tenant** | ID: `6`, Name: `ร้านค้าของ exampleadmin`, Owner ID: `1`, Theme: `model_x` |

---

## 2. 🔌 Complete API Surface Discovered

All live endpoints reverse-engineered from RSC streams and client bundles:

| Method | Endpoint | Purpose & Empirical Behavior |
| :--- | :--- | :--- |
| `GET` | `/api/tenant/manifest` | PWA Web App Manifest (Standalone mobile icon, theme `#ec093e`) |
| `GET` | `/api/tenant/topup/settings` | Returns active payment gateways, account number, name, and fee flags |
| `POST` | `/api/tenant/topup/angpao` | Redeems TrueMoney Wallet Angpao links (2.9% fee flag) |
| `POST` | `/api/tenant/topup/qrcode` | Generates PromptPay dynamic QR code (0% fee) |
| `GET` | `/api/payment/:id/status` | Real-time polling for QR payment completion |
| `POST` | `/api/tenant/topup/slip/verify` | Uploads bank transfer slip for automatic OCR verification |
| `POST` | `/api/tenant/topup/redeem` | Redeems top-up gift vouchers |
| `GET` | `/api/tenant/products/search?q=:query` | Live instant search query for product catalog |
| `POST` | `/api/tenant/shop/orders` | Checkout/purchase execution with custom form data payload |
| `GET` | `/api/tenant/shop/history` | Paginated user purchase history (`page`, `limit`, `search`) |
| `GET` | `/api/auth/providers` | Lists active NextAuth authentication providers |
| `GET` | `/api/auth/csrf` | CSRF token provider for NextAuth session handshake |

---

## 3. 🛍️ Product Catalog & Data Model Specifications

F4RY handles product variants with a distinct dual-channel design:

### 3.1 Product Types: `GIFT` vs `ORDER`
1. **`GIFT` (Instant Delivery)**:
   - Digital stock (activation keys, accounts, codes).
   - Instant automated vault delivery upon payment.
2. **`ORDER` (Custom Form Requirements)**:
   - Customized digital fulfillment (e.g., YouTube Premium email renewal, Discord Nitro invite).
   - Supports dynamic `formFields`:
     ```json
     {
       "id": "field-1794160630549-8lfk4",
       "name": "อีเมลสำหรับต่ออายุ",
       "type": "email",
       "required": false,
       "placeholder": "กรอกอีเมล"
     }
     ```
   - Stock can be set to `-1` for unlimited processing capacity.

### 3.2 Dual-Tier Pricing
- `price`: Standard consumer member price.
- `agentPrice`: Wholesale price for registered Resellers / Agents (`minAgentPrice` & `maxAgentPrice` range tracking).

---

## 4. 💳 Payment Architecture Matrix

From live inspection of `/api/tenant/topup/settings`:

```json
{
  "bank_account_name": "",
  "bank_account_number": "",
  "bank_code": "",
  "bank_transfer_enabled": "0",
  "promptpay_qr_enabled": "1",
  "receiver_bank": "014",
  "receiver_id": "3664434102",
  "receiver_name": "ศิรศักดิ์  แสงทองดี",
  "slip_verify_enabled": "1",
  "truemoney_angpao_enabled": "1",
  "truemoney_fee_enabled": "1"
}
```

1. **PromptPay QR Code** (`/topup/qrcode`): 0% Fee, dynamic polling.
2. **TrueMoney Angpao** (`/topup/angpao`): 2.9% Platform fee.
3. **Slip Verification** (`/topup/slip`): Bank SCB (014) auto-verification.
4. **Voucher Redemption** (`/topup/code`): Code-based credit top-up.

---

## 5. ⚔️ Comparison: F4RY (Model X) vs Vexzy (Model V) vs WebShop NYX9

| Feature Dimension | Vexzy Model V (`vexzy.xyz`) | F4RY Model X (`f4ry.com`) | WebShop NYX9 (Our Architecture) |
| :--- | :--- | :--- | :--- |
| **Tech Stack** | Vite + React + DaisyUI 5 | Next.js 14/15 App Router + Turbopack + Radix | Vanilla JS + Tailwind + Supabase RLS |
| **Multi-Tenancy** | Custom PHP/Node API backend | Subdomain rewrite (`/tenant/model-x`) via Caddy | Custom Subdomain + Multi-tenant Supabase Schema |
| **Gamification (Wheel/Games)** | ✅ มีระบบหมุนวงล้อและประวัติ | ❌ ไม่มี (`/minigames` 404) | ✅ มี (Sprint 3 Interactive Lucky Wheel) |
| **Program Status Hub** | ✅ มีระบบเช็คสถานะโปรแกรมโกง | ❌ ไม่มี (`/program-status` 404) | ✅ มี (Sprint 2 Live Radar + Roblox Executor) |
| **KeyAuth / HWID Reset** | ✅ มี API KeyAuth เชื่อมต่อ | ❌ ไม่มี | ⏳ อยู่ใน Roadmap |
| **Guest Checkout (Angpao)** | ✅ ซื้อทันทีไม่ต้องล็อกอิน | ❌ ต้องล็อกอินก่อนซื้อ | ✅ มี (Sprint 2 Direct Angpao Checkout) |
| **Custom Form Fields (`ORDER`)** | ⚠️ ID/Pass พื้นฐาน | ✅ มีระบบ Dynamic Fields ยืดหยุ่นสูง | ✅ มี (Sprint 1 Vault & Custom Fields) |
| **Agent / Reseller Pricing** | ✅ มี `reseller_price` | ✅ มี `agentPrice` ใน Variant | ✅ มี (Sprint 5 Tiered Pricing & VIP Card) |
| **BGM & Particle FX** | ✅ Oneko แมววิ่ง, Aurora | ⚠️ แอนิเมชันเทศกาล (`BatAnimationOverlay`) | ✅ มี (Ghost Shader & 3D Tilt Card) |
