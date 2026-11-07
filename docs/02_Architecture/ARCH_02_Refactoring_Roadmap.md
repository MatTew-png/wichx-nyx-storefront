---
project: WebShop-NYX9
category: architecture
arch_id: ARCH-02
status: in-progress
priority: high
last_audit: 2026-11-07
tier: Project-Roadmap
tags:
  - architecture
  - roadmap
  - tasks-plugin
---

# 🗺️ Technical Refactoring Roadmap (ARCH-02)

This roadmap tracks engineering milestones using the **Obsidian Tasks Plugin** syntax. Tasks include created dates (`➕`), completion dates (`✅`), due dates (`⏳`), and priority indicators (`⏫` high, `🔼` medium).

---

## 📌 Phase 1: Security Hardening & Zero-Trust Core (Completed)
- [x] Audit all 12 Supabase tables for Row Level Security (RLS 100%) ➕ 2026-11-04 ✅ 2026-11-05 #task #phase1 #priority/critical
- [x] Implement AES-256-GCM symmetric encryption for `inventory_keys` ➕ 2026-11-05 ✅ 2026-11-06 #task #phase1 #priority/critical
- [x] Deploy `FOR UPDATE SKIP LOCKED` inside `execute_order_checkout` stored procedure ➕ 2026-11-05 ✅ 2026-11-06 #task #phase1 #priority/high
- [x] Configure Cloudflare WAF, Security Headers (CSP, HSTS, X-Frame-Options) ➕ 2026-11-06 ✅ 2026-11-06 #task #phase1 #priority/high

---

## 📌 Phase 2: Autonomous Delivery & Payment Gateways (Completed)
- [x] Connect PromptPay dynamic QR generation with SlipOK/EasySlip verification ➕ 2026-11-06 ✅ 2026-11-07 #task #phase2 #priority/critical
- [x] Build TrueMoney Wallet gift voucher instant redemption API ➕ 2026-11-06 ✅ 2026-11-07 #task #phase2 #priority/high
- [x] Implement native Litecoin (LTC) transaction monitor with +5% bonus ➕ 2026-11-06 ✅ 2026-11-07 #task #phase2 #priority/medium
- [x] Build Instant Key Delivery modal with one-click clipboard copy and `.txt` receipt download ➕ 2026-11-06 ✅ 2026-11-07 #task #phase2 #priority/high

---

## 📌 Phase 3: Storefront Modernization & Whitelabel Polish (In Progress)
- [x] Implement Cyberpunk Glacier Cyan design system with masked ticker feed ➕ 2026-11-06 ✅ 2026-11-07 #task #phase3 #priority/medium
- [x] Consolidate branding options into single `storeConfig.js` configuration file ➕ 2026-11-06 ✅ 2026-11-07 #task #phase3 #priority/medium
- [x] Organize documentation into AI-Native Obsidian Agentic Vault standard ➕ 2026-11-07 ✅ 2026-11-07 #task #phase3 #priority/critical
- [ ] Connect automated client-side QR scanner for camera slip scanning ⏳ 2026-11-20 🔼 #task #phase3 #priority/medium
- [ ] Implement browser push notifications for out-of-stock items ⏳ 2026-11-25 🔼 #task #phase3 #priority/low

---

## 📌 Phase 4: Multi-Store Whitelabel SaaS Expansion (Planned)
- [ ] Multi-tenant database tenancy isolation via tenant ID routing ⏳ 2026-12-01 ⏫ #task #phase4 #priority/high
- [ ] Stripe / Credit card checkout integration for international buyers ⏳ 2026-12-10 🔼 #task #phase4 #priority/medium
- [ ] Automated merchant Discord bot for community notifications and customer support ⏳ 2026-12-20 🔼 #task #phase4 #priority/medium
