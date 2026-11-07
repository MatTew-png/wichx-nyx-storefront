---
project: WebShop-NYX9
category: dashboard
status: completed
priority: medium
last_audit: 2026-11-07
tags:
  - dataview
  - dashboard
  - real-time-query
---

# 📊 Dataview Live Engineering Dashboard

This dashboard dynamically aggregates features, architecture specifications, and scripts across the vault using the **Obsidian Dataview Plugin**.

---

## 🚀 1. Feature Specifications by Priority

```dataview
TABLE WITHOUT ID
  file.link AS "Feature",
  feature_id AS "ID",
  system AS "System",
  priority AS "Priority",
  status AS "Status"
FROM "01_Features"
WHERE feature_id
SORT priority DESC, feature_id ASC
```

---

## 🏛️ 2. Architecture Specifications & ADRs

```dataview
TABLE WITHOUT ID
  file.link AS "Architecture Spec",
  arch_id AS "ID",
  tier AS "Layer / Tier",
  priority AS "Priority",
  status AS "Status"
FROM "02_Architecture"
WHERE arch_id
SORT arch_id ASC
```

---

## 📜 3. Scripts Vault Index

```dataview
TABLE WITHOUT ID
  file.link AS "Script Record",
  script_id AS "ID",
  runtime AS "Runtime",
  source_path AS "Source Path"
FROM "03_Scripts_Vault"
WHERE script_id
SORT script_id ASC
```

---

## 📥 4. Unreviewed Inbox Staging

```dataview
TABLE WITHOUT ID
  file.link AS "Draft Note",
  author AS "Author",
  created_at AS "Created",
  target_destination AS "Target"
FROM "10_Inbox"
WHERE status = "unreviewed"
SORT file.name ASC
```
