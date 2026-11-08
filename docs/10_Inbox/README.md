---
project: WebShop-NYX9
category: governance
status: completed
priority: high
last_audit: 2026-11-07
tags:
  - inbox
  - staging
  - review-protocol
---

# 📥 Raw Intake & AI Draft Staging Area (`10_Inbox/`)

This directory serves as the **quarantine and staging zone** for all unverified inputs, raw meeting notes, customer feedback, and AI agent proposals.

---

## 🚦 Intake Rules for Agents & Humans

1. **Unsolicited AI Outputs:** When an agent suggests a major refactor, new feature, or unverified architecture note, it must write the file here with the prefix `DRAFT_YYYYMMDD_<Title>.md`.
2. **Raw External Dumps:** Pasted chat logs, API payloads, and draft specifications are temporarily stored here.
3. **No Direct Production Commits:** Never move unverified proposals directly into `01_Features/` or `02_Architecture/`.
4. **Promotion Protocol:**
   - Review draft against [[.agent/rules|Agent Rules]] and [[.agent/schema|YAML Schema]].
   - Validate empirical code links and diagrams.
   - Move approved document to its target permanent folder.
   - Delete or archive the draft record.

---

## 📑 Current Active Drafts

- [[10_Inbox/DRAFT_20261109_Vexzy_Feature_Gap_Analysis|DRAFT_20261109_Vexzy_Feature_Gap_Analysis]] — Benchmark Audit & 21-Feature Gap Analysis (Vexzy Model V vs WebShop NYX9).
