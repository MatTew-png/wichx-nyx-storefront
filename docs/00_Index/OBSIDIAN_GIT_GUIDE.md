---
project: WebShop-NYX9
category: guide
status: completed
priority: medium
last_audit: 2026-11-07
tags:
  - guide
  - git-sync
  - obsidian-git
  - backup
---

# 🔄 Obsidian Git Synchronization Guide

This document explains how to synchronize this Obsidian Agentic Vault seamlessly across multiple developer machines, mobile devices, and automated agent pipelines.

---

## 1. ⚙️ Recommended Obsidian Plugins

To maintain seamless synchronization, install the following community plugins:
1. **Obsidian Git (`obsidian-git`):** Provides automatic commit & push on configurable intervals (e.g. every 10 minutes or on file save).
2. **Dataview:** Powers dynamic queries in [[02_Feature_Matrix]] and [[DATAVIEW_Live_Dashboard]].
3. **Tasks:** Parses and renders interactive checklists in [[ARCH_02_Refactoring_Roadmap]].
4. **Kanban:** Renders interactive visual columns for [[KANBAN_Board]].
5. **Templater:** Generates standard schema-compliant notes using [[Templates/README_Templater_Setup|Templates]].

---

## 2. 🛡️ Essential `.gitignore` Protection

The repository root `.gitignore` is preconfigured to prevent merge conflicts caused by ephemeral Obsidian workspace caches:

```gitignore
# Obsidian Vault ephemeral files
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/workspace*
.obsidian/cache/
.trash/
```

---

## 3. 🚀 Automated Vault Sync Scripts

Included in this vault root:
- **PowerShell (`docs/sync_vault.ps1`):** Fast one-command git commit & push for Windows.
- **Python (`docs/sync_vault.py`):** Cross-platform sync script for macOS, Linux, and Windows.

Usage:
```powershell
# PowerShell
./docs/sync_vault.ps1 "Update vault documentation"

# Python
python ./docs/sync_vault.py "Sync feature updates"
```
