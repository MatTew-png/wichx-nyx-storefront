---
project: WebShop-NYX9
category: index
status: completed
priority: critical
last_audit: 2026-11-07
tags:
  - index
  - feature-matrix
  - dataview
---

# 🚀 Feature Specification Matrix (02)

This matrix lists all implemented storefront capabilities, tracking their operational status, system layer, and priority.

---

## ⚡ Dynamic Query (Obsidian Dataview)

```dataview
TABLE WITHOUT ID
  file.link AS "Feature",
  feature_id AS "ID",
  system AS "System",
  status AS "Status",
  priority AS "Priority"
FROM "01_Features"
WHERE feature_id
SORT feature_id ASC
```

---

## 📋 Static Fallback Reference Table

*(For GitHub web viewers and offline non-Dataview environments)*

| Feature Note | ID | Subsystem | Priority | Status |
| :--- | :---: | :--- | :---: | :---: |
| [[FEAT_01_Instant_Credential_Delivery]] | `FEAT-01` | Storefront-Fulfillment | `critical` | 🟢 Completed |
| [[FEAT_02_Custom_Discord_Services]] | `FEAT-02` | Storefront-Services | `high` | 🟢 Completed |
| [[FEAT_03_Tri_Gateway_TopUp]] | `FEAT-03` | Payment-Engine | `critical` | 🟢 Completed |
| [[FEAT_04_Smart_Slip_Verification]] | `FEAT-04` | Payment-Verification | `critical` | 🟢 Completed |
| [[FEAT_05_Realtime_Telemetry_And_Ticker]] | `FEAT-05` | Storefront-UI | `medium` | 🟢 Completed |
| [[FEAT_06_Order_Lookup_And_Warranty_Claim]] | `FEAT-06` | Storefront-SelfService | `high` | 🟢 Completed |
| [[FEAT_07_Product_Catalog_Matrix]] | `FEAT-07` | Catalog-Engine | `high` | 🟢 Completed |
