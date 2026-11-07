---
project: WebShop-NYX9
category: script-vault
script_id: SCRIPT-02
runtime: PostgreSQL-PLpgSQL
source_path: database/
last_audit: 2026-11-07
tags:
  - script
  - database
  - plpgsql
  - stored-procedures
  - rls
---

# 🗄️ Supabase Stored Procedures & Migrations (SCRIPT-02)

This note indexes the SQL migration scripts and stored procedures located in `database/`.

---

## 1. 📂 SQL Migration Scripts Inventory

| Migration File | Description | Key Procedures Deployed |
| :--- | :--- | :--- |
| `database/schema.sql` | Master baseline schema (12 tables). | Baseline tables, indexes, and triggers. |
| `database/aes256_vault_migration.sql` | Encryption layer for credentials. | `pgcrypto` vault integration for `inventory_keys`. |
| `database/update_checkout_proc.sql` | Hardened atomic checkout. | `execute_order_checkout` with `FOR UPDATE SKIP LOCKED`. |
| `database/security_patch.sql` | RLS hardening with InitPlan. | `(SELECT auth.uid())` subqueries on policies. |
| `database/system_settings_migration.sql` | Whitelabel dynamic store settings. | Key-value store configuration. |
| `database/reviews_migration.sql` | Customer review and rating schema. | Verified buyer reviews. |

---

## 2. ⚡ Key Stored Procedure Signatures

### `execute_order_checkout`
- **Purpose:** Atomically verifies wallet balance, locks inventory keys, creates orders, decrements balance, and dispenses credentials.
- **Concurrency Protection:** `FOR UPDATE SKIP LOCKED` guarantees zero duplicate sales.

### `process_topup`
- **Purpose:** Credits user wallet and registers transaction reference in `used_payment_slips`.
- **Integrity:** Fails atomically if transaction reference was previously registered.

---

## 3. 🧪 Verification Command

```bash
node scripts/test-checkout-rpc.js
node scripts/test-topup-rpc.js
```
