---
project: WebShop-NYX9
category: feature-spec
feature_id: FEAT-07
status: completed
priority: high
last_audit: 2026-11-07
system: Catalog-Engine
tags:
  - feature
  - catalog
  - products
  - pricing
  - warranty
---

# 📦 Product Catalog & Pricing Matrix (FEAT-07)

The storefront operates across **4 primary categories**, supporting instant key delivery, automated bots, and bespoke digital orders.

---

## 1. 🚀 Category 1: Discord Nitro & Server Boosts
Targeted at active Discord community members and server owners seeking instant upgrades.

| Product Name | Retail Price | Warranty | Delivery Format & Value |
| :--- | :---: | :---: | :--- |
| **Nitro 1 Month (Ready Account)** | **฿169** | 30 Days | Instant `email:password` delivery; includes 2 server boosts. |
| **Nitro 3 Months (Full Email Access)** | **฿150** | 90 Days | Instant delivery with primary email transfer. |
| **Server Boosts 1 Month (2 Boosts)** | **฿50** | 30 Days | Customer pastes invite link; automated bot boosts within 60s. |
| **Server Boosts 3 Months (2 Boosts)** | **฿100** | 90 Days | 3-month continuous server boost via bot fleet. |
| **Nitro 3 Months Activation Link** | **฿50** | 14 Days | Instant promo URL for accounts that never had Nitro. |
| **Profile Decoration & Avatar Effects** | **฿100** | 1 Year | Permanent redeemable code applied to user profile. |

---

## 2. ⚙️ Category 2: Discord Services & Aged Accounts
Geared towards server growth, marketing operations, and resilient alternative accounts.

| Service / Item | Retail Price | Warranty | Delivery Format & Value |
| :--- | :---: | :---: | :--- |
| **Discord Member Injection** | **฿0.50** / member | N/A | Dynamic slider (100–1,000 members) with realistic avatar profiles. |
| **SMS / OTP Verification Rental** | **฿10** / code | N/A | Dedicated virtual number with real-time OTP stream on screen. |
| **Discord Quest Badge Completion** | **฿50** / badge | N/A | Automated task trigger; rewards badge without downloading games. |
| **Aged Discord Account (1+ Month)** | **฿25** / acct | 7 Days | Instant credentials; aged account immune to new-user filters. |
| **Vintage Discord Account (2015–2020)** | **฿450** / acct | 30 Days | Rare collector accounts with full OG email ownership. |

---

## 3. 🎮 Category 3: Gaming Accounts & Streaming Apps
Focuses on Grand Theft Auto V / FiveM communities and affordable entertainment subscriptions.

| Product Name | Retail Price | Warranty | Delivery Format & Value |
| :--- | :---: | :---: | :--- |
| **Rockstar Account (FiveM Ready)** | **฿10** | 7 Days | Clean credentials; ready for FiveM roleplay or unban bypass. |
| **Steam Account (GTA V Full Game)** | **฿399** | 30 Days | Unlinked original game license ready for personal Rockstar bind. |
| **Netflix Private Screen (30 Days)** | **฿109** | 30 Days | Private 4K profile with PIN lock; no shared screen interference. |
| **YouTube Premium 1 Month (Own Mail)** | **฿49** | 30 Days | Family invite link sent directly to customer Gmail; zero password risk. |
| **Cursor Pro 1 Month (Pre-Order)** | **฿490** | 30 Days | AI code editor subscription; key issued within 24 hours. |

---

## 4. 🔑 Category 4: Software & Authentic Keys
Computer operating systems, office suites, and premium desktop software.

| Product Name | Retail Price | Warranty | Delivery Format & Value |
| :--- | :---: | :---: | :--- |
| **Windows 10 / 11 Pro Genuine Key** | **฿150** | Lifetime | Digital license key; binds directly to motherboard hardware ID. |
| **Microsoft Office 365 (5 Devices)** | **฿290** | 1 Year | Enterprise license account with 1TB OneDrive cloud storage. |
| **Spotify Premium 3 Months (Individual)** | **฿120** | 90 Days | Direct account activation; ad-free high fidelity streaming. |
| **NordVPN / ExpressVPN (1 Year)** | **฿350** | 1 Year | Encrypted high-speed network bypass for gaming and streaming. |

---

## 5. 🗄️ Database Mapping
All catalog entries are synchronized between `productsData.js` (frontend cache) and the `products` table in Supabase PostgreSQL:
- Active items filtered by `is_active = true`
- Prices bound by stored procedures to prevent frontend tampering (Zero-Trust)
- Stock counters dynamically synchronized with `inventory_keys(is_sold = false)`
