---
project: WebShop-NYX9
category: architecture
arch_id: ARCH-01
status: completed
priority: critical
last_audit: 2026-11-07
tier: System-Overview
tags:
  - architecture
  - audit
  - technology-stack
  - boundaries
---

# 🏛️ System Architecture Audit (ARCH-01)

## 1. 🌐 System Overview & Edge Topography

WebShop (NYX9 Studio) is a high-performance, single-page application (SPA) digital storefront designed for instant zero-latency customer interaction, armored with an enterprise-grade financial backend.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Edge / Browser)"]
        SPA["index.html + styles.css"]
        Storefront["app.js (Modular OOP Controllers)"]
        StoreConfig["storeConfig.js (Whitelabel Engine)"]
        Products["productsData.js (Local Cache)"]
    end

    subgraph EdgeCDN ["Edge Routing & Security (Cloudflare / Vercel)"]
        WAF["Cloudflare WAF / Reverse Proxy"]
        Headers["_headers & wrangler.jsonc (HSTS, CSP)"]
        Serverless["api/ Serverless Functions (Node.js)"]
    end

    subgraph DataPlatform ["Financial Data Platform (Supabase)"]
        RPC["PL/pgSQL Security Definer Functions"]
        Postgres[("PostgreSQL 12-Table Cluster")]
        Vault["AES-256-GCM Crypto Vault"]
    end

    ClientLayer -->|HTTPS / WSS| EdgeCDN
    EdgeCDN -->|Service Role / JWT| DataPlatform
    ClientLayer -.->|Direct Read (Anon Key + RLS)| Postgres
```

---

## 2. 🧩 Structural Components & Boundaries

### A. Client Layer (Browser SPA)
- **Zero Heavy Frameworks:** Pure Vanilla JavaScript (ESM OOP) to guarantee instant time-to-interactive (TTI < 400ms) on low-end mobile devices.
- **State Management:** Pub/Sub reactive store (`AppStore`) coordinating modals, cart state, top-up balances, and telemetry ticks.
- **Visual Maps:** Interactive standalone HTML diagrams are accessible at `02_Architecture/architecture-map.html` and `02_Architecture/demo-hub-options.html`.

### B. Serverless Edge Handlers (`/api`)
- Node.js functions running at edge data centers to eliminate cold starts:
  - `verify-slip.js`: Validates bank transfers against EMVCo and provider APIs.
  - `discord-notify.js`: Dispatches structured Discord embeds to staff channels.
  - `truemoney-redeem.js`: Redeems voucher URLs via TrueMoney API.
  - `crypto-ltc.js`: Checks blockchain ledger for LTC transaction confirmations.

### C. Financial Core (Supabase PostgreSQL)
- 12 tables protected by **Row Level Security (RLS 100%)**.
- Client mutation access is completely disabled. All state mutations (orders, wallet top-ups) must route through atomic PL/pgSQL stored procedures.

---

## 3. 🔍 Predecessor Debt & Remediation History
- **Legacy Bottlenecks:** Previous architecture lacked atomic row locking, risking race conditions when multiple buyers purchased the final remaining key.
- **Remediation Applied:**
  - Deployed `FOR UPDATE SKIP LOCKED` inside `execute_order_checkout`.
  - Added cryptographic salt and AES-256-GCM encryption on `inventory_keys.credential_data`.
  - Hardened RLS policies with `(SELECT auth.uid())` InitPlan subqueries.
