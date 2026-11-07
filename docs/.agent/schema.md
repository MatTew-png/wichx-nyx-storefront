---
project: WebShop-NYX9
category: governance
status: completed
priority: high
last_audit: 2026-11-07
tags:
  - governance
  - yaml-schema
  - metadata-standard
---

# 📑 Formal YAML Frontmatter Schemas

Every note created in this vault must conform to one of the following YAML schemas. This ensures seamless parsing by the Dataview plugin and AI context parsers.

---

## 1. 🚀 Feature Note Schema (`01_Features/FEAT_XX.md`)

```yaml
---
project: WebShop-NYX9
category: feature-spec
feature_id: FEAT-01
status: completed         # completed | in-progress | planned | deprecated
priority: critical        # critical | high | medium | low
last_audit: 2026-11-07
system: Frontend-Modals   # Subsystem identifier
tags:
  - feature
  - delivery
  - customer-experience
---
```

---

## 2. 🏛️ Architecture Note Schema (`02_Architecture/ARCH_XX.md`)

```yaml
---
project: WebShop-NYX9
category: architecture
arch_id: ARCH-01
status: completed
priority: critical
last_audit: 2026-11-07
tier: Backend-Database    # Client-SPA | Serverless-API | Backend-Database | Security-WAF
tags:
  - architecture
  - security
  - rls-policy
---
```

---

## 3. 📜 Script Note Schema (`03_Scripts_Vault/SCRIPT_XX.md`)

```yaml
---
project: WebShop-NYX9
category: script-vault
script_id: SCRIPT-01
runtime: Node.js          # Node.js | PostgreSQL-PLpgSQL | Browser-ESM | Bash
source_path: api/         # Relative path to source file in repo
last_audit: 2026-11-07
tags:
  - script
  - serverless
  - api-handler
---
```

---

## 4. 📥 Inbox Draft Schema (`10_Inbox/DRAFT_XX.md`)

```yaml
---
project: WebShop-NYX9
category: draft-intake
status: unreviewed        # unreviewed | under-review | rejected | approved
author: agent             # agent | human
created_at: YYYY-MM-DD
target_destination: 01_Features/
tags:
  - draft
  - needs-review
---
```
