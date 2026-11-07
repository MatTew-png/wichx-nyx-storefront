---
kanban-plugin: basic
project: WebShop-NYX9
category: management
status: in-progress
priority: medium
last_audit: 2026-11-07
tags:
  - kanban
  - project-management
  - workflow
---

# 📋 WebShop Engineering Kanban Board

## 📋 Backlog

- [ ] Automated client-side QR scanning for camera slip reading #feature #frontend
- [ ] Browser web push notifications for out-of-stock items #feature #pwa
- [ ] Stripe / Credit card checkout for overseas buyers #payment #gateway
- [ ] Multi-tenant isolation for full Whitelabel SaaS routing #architecture #saas
- [ ] Discord Merchant Bot for order management from mobile #bot #discord


## 🏗️ In Progress

- [ ] Real-time WebSocket balance sync on top-up confirmation #frontend #realtime
- [ ] Obsidian Agentic Vault automated Git Sync workflow #vault #devops


## 🧪 Testing & Verification

- [ ] Load test burst defense across 500 concurrent checkout requests #qa #security
- [ ] Validate LTC blockchain address QR generation #crypto #payment


## ✅ Completed

- [x] RLS 100% on all 12 Supabase PostgreSQL tables #security #database
- [x] AES-256-GCM symmetric encryption for `inventory_keys` #security #crypto
- [x] Tri-Gateway Top-Up (PromptPay, TrueMoney, LTC Native) #payment
- [x] Instant Credential Delivery Modal with `.txt` receipt export #feature #frontend
- [x] Custom Discord Services modal (Member booster, SMS OTP rental, Quest badges) #feature
- [x] Zero-Trust Server-Side Price Authority inside stored procedures #security
- [x] Masked Cyberpunk Glacier Cyan top system broadcast ticker #ui #design


%% kanban:settings
```json
{
  "kanban-plugin": "basic",
  "hide-tags": false
}
```
%%
