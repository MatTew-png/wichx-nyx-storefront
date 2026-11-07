---
project: WebShop-NYX9
category: feature-spec
feature_id: FEAT-04
status: completed
priority: critical
last_audit: 2026-11-07
system: Payment-Verification
tags:
  - feature
  - payment
  - slip-verify
  - ocr
  - anti-double-spend
---

# 📸 Smart Slip Verification & OCR (FEAT-04)

## 1. 🎯 Overview & User Problem
- **User Pain Point:** Manual slip inspection creates long wait times and introduces human error. Typing 25-digit bank transaction reference numbers on mobile leads to customer frustration and abandoned carts.
- **Solution:** Automated slip scanning and validation pipeline:
  - Drag-and-drop or photo upload of bank transfer slips.
  - Client/server QR parsing (EMVCo payload extraction).
  - Backend integration via `api/verify-slip.js` with SlipOK / EasySlip / OpenSlipVerify.
  - Idempotent transaction record validation preventing reused slips.

---

## 2. 🔄 Slip Verification Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant UI as Top-Up Modal / Checkout
    participant Backend as api/verify-slip.js
    participant BankAPI as Bank Slip Provider
    participant DB as Postgres (used_payment_slips)

    Customer->>UI: Upload Bank Slip Image
    UI->>Backend: Post Base64 / Multipart Image
    Backend->>BankAPI: Query Slip Metadata (Ref, Amount, Sender, Time)
    BankAPI-->>Backend: Slip Validated (Amount: ฿500, Ref: 20261107ABC)
    Backend->>DB: Check & Insert used_payment_slips(slip_trans_ref)
    alt Already Used (Double-Spend Attempt)
        DB-->>Backend: Duplicate Key Error (409 Conflict)
        Backend-->>UI: Reject: Slip already redeemed!
    else First Time Use
        DB-->>Backend: Success
        Backend->>DB: Increment profiles.balance (+฿500)
        Backend-->>UI: Top-Up Confirmed!
    end
```

---

## 3. 🛡️ Security Guardrails
- **Double-Spend Guard:** The database schema enforces `UNIQUE(slip_trans_ref)` in `used_payment_slips`. Any replay attack fails at the database row-lock level.
- **Amount Tamper Prevention:** The credited amount is taken strictly from the verified bank payload, never from the frontend request parameter.
- **Timestamp Threshold:** Slips older than 24 hours are automatically rejected to eliminate recycled receipt fraud.

---

## 4. 🧪 Verification & Test Path
- **Unit Test:** `node scripts/test-promptpay.js`
- **Security Check:** `node scripts/verify-security-empirically.js`
