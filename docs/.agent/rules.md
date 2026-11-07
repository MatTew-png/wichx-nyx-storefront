---
project: WebShop-NYX9
category: governance
status: completed
priority: critical
last_audit: 2026-11-07
tags:
  - governance
  - agent-rules
  - zero-overwrite
  - obsidian-standards
---

# 🤖 AI Agent Governance & Operational Rules

This document specifies the strict operational rules, naming conventions, and file management boundaries for all AI agents working within this Obsidian Agentic Vault.

---

## 1. 🛡️ The Zero Destructive Overwrite Protocol
1. **Surgical Diffs Only:** Never wipe or completely overwrite an existing documentation note unless explicitly requested.
2. **Draft Staging in `10_Inbox/`:** Any newly synthesized research, unverified features, or automated agent proposals must initially be placed inside [[10_Inbox/README|10_Inbox/]].
3. **Human Promotion:** The human vault curator reviews notes in `10_Inbox/` and moves them into `01_Features/`, `02_Architecture/`, or `03_Scripts_Vault/`.

---

## 2. 🏷️ File Naming & Location Conventions

| Type | Path / Naming Pattern | Example |
| :--- | :--- | :--- |
| **Index Hubs** | `00_Index/XX_PascalCase.md` | `00_Index/00_Master_Index.md` |
| **Features** | `01_Features/FEAT_XX_PascalCase.md` | `01_Features/FEAT_01_Instant_Credential_Delivery.md` |
| **Architecture / ADR** | `02_Architecture/ARCH_XX_PascalCase.md` | `02_Architecture/ARCH_03_Enterprise_Security_Vault.md` |
| **Scripts & DB** | `03_Scripts_Vault/SCRIPT_XX_PascalCase.md` | `03_Scripts_Vault/SCRIPT_01_Serverless_API_Backend.md` |
| **Drafts / Intake** | `10_Inbox/DRAFT_YYYYMMDD_Name.md` | `10_Inbox/DRAFT_20261107_NewPaymentGateway.md` |
| **Templates** | `Templates/Template_New_X.md` | `Templates/Template_New_Feature.md` |
| **Archives** | `90_Archive/ORIGINAL_NAME.ext` | `90_Archive/UX_FEATURES.txt` |

---

## 3. 🔗 Wikilink Standards
- Always use standard Obsidian Wikilinks `[[Note Name]]` or `[[Note Name|Alias]]` for internal linking.
- Do **not** use relative filesystem markdown paths like `[Link](../01_Features/note.md)` in body prose.
- Provide descriptive aliases when linking specific subheadings: `[[FEAT_03_Tri_Gateway_TopUp#PromptPay|PromptPay QR Flow]]`.

---

## 4. 📋 Frontmatter Compliance
- Every markdown note must include valid YAML frontmatter between `---` fences.
- Metadata must conform to [[.agent/schema|Schema Definitions]].
- Never duplicate metadata inside blockquotes (e.g. `> **Status:** Completed`) when already present in the YAML header.

---

## 5. 🧩 Visual Representation Policy
- High-level system topologies must have corresponding Obsidian Canvas (`.canvas`) or Excalidraw (`.excalidraw.md`) files.
- Flowcharts and sequence diagrams in note bodies must use valid Mermaid syntax (`mermaid`).
