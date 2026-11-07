---
project: WebShop-NYX9
category: script-vault
script_id: SCRIPT-01
runtime: Node.js
source_path: api/
last_audit: 2026-11-07
tags:
  - script
  - serverless
  - api-backend
  - payment
  - discord
---

# ⚡ Serverless API Backend Handlers (SCRIPT-01)

This vault note documents the serverless API handlers deployed under `api/`, optimized for Vercel and Cloudflare Pages Functions.

---

## 1. 📂 Handlers Inventory

| File Path | HTTP Method | Core Functionality |
| :--- | :---: | :--- |
| `api/verify-slip.js` | `POST` | Validates bank transfer slip payloads (PromptPay) with SlipOK / EasySlip. |
| `api/discord-notify.js` | `POST` | Dispatches rich embeds for new orders and disputes to Discord Webhook. |
| `api/truemoney-redeem.js` | `POST` | Redeems TrueMoney gift voucher envelopes (`gift.truemoney.com`). |
| `api/crypto-ltc.js` | `GET/POST` | Queries Litecoin node / block explorer for native LTC confirmations. |

---

## 2. 🛡️ Verification & Security Highlights
- **Environment Isolation:** API keys (`SLIP_VERIFY_API_KEY`, `DISCORD_WEBHOOK_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are accessed solely server-side via `process.env`.
- **CORS & Origin Validation:** Rejects unauthenticated cross-origin payloads.
- **Payload Sanitization:** Validates request types before passing parameters into database stored procedures.

---

## 3. 🧪 Local Verification Command

To test all API handlers in isolation:
```bash
node scripts/test-api-handlers.js
```
