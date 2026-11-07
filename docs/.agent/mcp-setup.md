---
project: WebShop-NYX9
category: governance
status: completed
priority: medium
last_audit: 2026-11-07
tags:
  - mcp
  - model-context-protocol
  - obsidian-mcp
---

# 🔌 Model Context Protocol (MCP) Setup for Obsidian Vault

This guide details how to connect AI agents (such as Claude Desktop, Antigravity, or Cursor) to this Obsidian Vault using the Obsidian Local REST API or official MCP Obsidian server.

---

## 1. ⚙️ Option A: Local REST API Server (`mcp-obsidian`)

1. Install the **Local REST API** plugin in Obsidian (`Settings > Community Plugins > Browse > Local REST API`).
2. Enable the plugin and copy your generated API Key.
3. Configure your MCP client settings (e.g., `claude_desktop_config.json` or Antigravity MCP settings):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-obsidian"
      ],
      "env": {
        "OBSIDIAN_API_KEY": "<YOUR_OBSIDIAN_REST_API_KEY>",
        "OBSIDIAN_VAULT_PATH": "C:/Users/_newgen/Documents/antigravity/WebShop/docs"
      }
    }
  }
}
```

---

## 2. 📁 Option B: Direct Filesystem Access (Zero Latency)

For agents with local filesystem access (like Antigravity):
- Point root directory to `docs/`.
- Read [[MOC]] first to retrieve the relational map.
- Query specific files directly using absolute or relative paths.
- All modifications follow [[.agent/rules|AI Agent Governance Rules]].
