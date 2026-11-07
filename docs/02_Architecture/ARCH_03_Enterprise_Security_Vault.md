---
project: WebShop-NYX9
category: architecture
arch_id: ARCH-03
status: completed
priority: critical
last_audit: 2026-11-07
tier: Security-WAF-Database
tags:
  - architecture
  - security
  - aes-256-gcm
  - rls
  - zero-trust
---

# 🛡️ Enterprise Security & Financial Vault (ARCH-03)

This document specifies the enterprise security architecture protecting WebShop (NYX9 Studio), spanning Cloudflare edge filtering, application-layer honeypots, database cryptographic vaults, and ACID transaction locks.

---

## 1. 🏛️ Five Pillars of Financial Defense

1. **Cloudflare WAF & IP Cloaking:** Masks origin server IP 100%. Enforces HTTPS, DNS proxying, HSTS, and strict security headers (`CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
2. **Honeypot Anti-Bot Trap:** Traps automated scrapers and brute-force checkout bots via invisible DOM inputs. Bot submissions are rejected immediately without triggering backend processing.
3. **Server-Side Price Authority (Zero-Trust):** Eliminates client-side price tampering. Stored procedures calculate order totals strictly from the `products` table in Supabase PostgreSQL.
4. **Idempotency Key Lock & Anti-Double-Spend:** Prevents duplicate payments from network lag and stops replay attacks of bank slips or TrueMoney gift vouchers via `UNIQUE` constraints in `used_payment_slips`.
5. **AES-256-GCM Crypto Vault:** Encrypts raw credentials before persisting to `inventory_keys.credential_data` using 256-bit keys and 16-byte authentication tags.

---

## 2. 🗄️ Database Table RLS Security Matrix

All 12 tables in the cluster enforce **Row Level Security (RLS 100%)** using `(SELECT auth.uid())` InitPlan subqueries:

| # | Table | Purpose | Security Constraints | RLS Enforcement |
|---|---|---|---|---|
| 1 | `profiles` | Member balances & wallet credits | `CHECK (balance >= 0)`, `UNIQUE(discord_id)` | Owner or Service Role only |
| 2 | `categories` | Product categories | `sort_order` ordering | Public read; Admin write |
| 3 | `products` | Product listings & official prices | `is_active = true` filter | Public read active rows; Admin write |
| 4 | `inventory_keys` | Digital licenses & account credentials | `is_sold = false` index | **Blocked from Anonymous (0 Rows)**; Service Role / RPC only |
| 5 | `orders` | Master order records | Status: `PAID`, `PENDING`, `REFUNDED` | Order owner read only |
| 6 | `order_items` | Individual purchased items | Includes delivery payloads | Owner read only |
| 7 | `topup_transactions` | Top-up audit history | Logs all gateway references | Owner read only; Admin inspect |
| 8 | `used_payment_slips` | Slip replay prevention | `UNIQUE(slip_trans_ref)` | Internal verification only |
| 9 | `promo_code_usages` | Coupon redemption control | `UNIQUE(user_id, code)` | Per-user single redemption |
| 10 | `warranty_claims` | Dispute & replacement tickets | Status: `PENDING`, `RESOLVED`, `REJECTED` | Verified user insertion only |
| 11 | `blacklists` | Fraudulent user & IP blocklist | `UNIQUE(target_value)` | Enforced during top-up & checkout |
| 12 | `system_audit_logs` | Tamper-evident activity logs | Append-only audit trail | Immutable system writes only |

---

## 3. ⚙️ Stored Procedures & Atomic Functions

All functions are executed with `SECURITY DEFINER` and enforce `SET search_path = public, pg_temp` to prevent search path hijacking:

```sql
-- Conceptual signature of execute_order_checkout
CREATE OR REPLACE FUNCTION public.execute_order_checkout(
    p_order_id TEXT,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_user_id UUID,
    p_customer_info JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
-- 1. Lock rows: SELECT id FROM inventory_keys WHERE ... FOR UPDATE SKIP LOCKED
-- 2. Verify profiles.balance >= calculated_price
-- 3. Deduct balance, update inventory_keys(is_sold = true)
-- 4. Insert into orders and order_items
-- 5. Return decrypted items atomically
$$;
```

---

## 4. 🔐 AES-256-GCM Vault Specification

```text
Cipher: AES-256-GCM
IV: 12 bytes random per row
Auth Tag: 16 bytes authentication tag
Secret Key: Managed via Supabase Vault / Environment Secret (ENCRYPTION_MASTER_KEY)
```

Stored credentials format:
```text
base64(IV + Ciphertext + Tag)
```
Even if an attacker gains read-only access to the database dump, they cannot decrypt digital keys without the external master encryption key.
