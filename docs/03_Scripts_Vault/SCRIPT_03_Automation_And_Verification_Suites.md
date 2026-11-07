---
project: WebShop-NYX9
category: script-vault
script_id: SCRIPT-03
runtime: Node.js
source_path: scripts/
last_audit: 2026-11-07
tags:
  - script
  - verification
  - testing
  - load-test
  - security-audit
---

# 🧪 Automation & Verification Suites (SCRIPT-03)

This note indexes the empirical test suites and deployment scripts located in `scripts/`.

---

## 1. 📂 Test Suite Matrix

| Script File | Category | Test Scope |
| :--- | :---: | :--- |
| `scripts/unified-verification.js` | Integration | Comprehensive end-to-end audit of all system capabilities. |
| `scripts/audit-security.js` | Security | Inspects table RLS policies, anon role permissions, and exposed endpoints. |
| `scripts/verify-security-empirically.js` | Security | Runs simulated brute-force and price-tamper attacks against RPCs. |
| `scripts/test-fulfillment-e2e.js` | Functional | Tests complete purchase journey from checkout to credential delivery. |
| `scripts/load-test/test-stress-load.js` | Performance | Simulates burst traffic spikes on checkout and top-up endpoints. |

---

## 2. 🚀 Quick Test Commands

```bash
# Run unified verification suite
node scripts/unified-verification.js

# Audit database security and RLS
node scripts/audit-security.js

# Test end-to-end checkout & fulfillment
node scripts/test-fulfillment-e2e.js
```
