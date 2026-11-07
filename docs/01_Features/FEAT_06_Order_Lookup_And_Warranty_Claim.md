---
project: WebShop-NYX9
category: feature-spec
feature_id: FEAT-06
status: completed
priority: high
last_audit: 2026-11-07
system: Storefront-SelfService
tags:
  - feature
  - order-lookup
  - warranty
  - customer-support
---

# 🔍 Self-Service Order Lookup & Warranty Dispute (FEAT-06)

## 1. 🎯 Overview & User Problem
- **User Pain Point:** Customers who didn't register or lost their browser window frequently flood support chats asking "Where is my key?" or "My account stopped working, can I get a replacement?".
- **Solution:** 24/7 autonomous order lookup and dispute submission without requiring staff intervention:
  - Customers enter their **Order Reference Number** or registered Discord ID / Email.
  - The system queries Supabase via `lookup_order_by_ref` stored procedure and renders original credentials and receipt details.
  - If a problem occurs within the warranty window, customers click **"Submit Warranty Claim"** right inside the lookup card, recording a dispute in `warranty_claims`.

---

## 2. 🔄 Lookup & Dispute Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Modal as Order Lookup Modal
    participant StoredProc as lookup_order_by_ref()
    participant Claims as warranty_claims Table
    participant Webhook as Discord Staff Alert

    Customer->>Modal: Enter Order Ref (e.g. ORD-202611-9872)
    Modal->>StoredProc: Fetch order details
    StoredProc-->>Modal: Order items, timestamp & warranty status
    Modal-->>Customer: Display item credentials & Warranty countdown

    opt Warranty Issue (Dispute Needed)
        Customer->>Modal: Click "Claim Warranty", attach description
        Modal->>Claims: Insert row (status: PENDING)
        Claims->>Webhook: Notify staff in Discord #warranty-alerts
        Modal-->>Customer: Ticket #W-XXX created successfully
    end
```

---

## 3. 🛡️ Security & Privacy Guardrails
- **InitPlan Subquery Filtering:** Customers can only query orders matching their verified email, Discord ID, or signed transaction token.
- **Warranty Expiration Check:** Claims are disabled once the product's guarantee duration (e.g. 7 days, 30 days, 90 days) has elapsed.
- **Rate Limiting:** Prevents brute-force guessing of order reference numbers.

---

## 4. 🧪 Verification & Test Path
- **Stored Procedure Deployment:** `scripts/deploy-lookup-order.js`
- **End-to-End Test:** `scripts/test-history-and-services.js`
