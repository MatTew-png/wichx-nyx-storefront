---
excalidraw-plugin: parsed
tags:
  - excalidraw
  - architecture
  - multi-tier-system
---

# 🎨 WebShop Full Multi-Tier System Map

This diagram models the entire technical landscape of WebShop (NYX9 STUDIO), tracing user interactions from the client browser through edge functions down to PostgreSQL ACID transactions.

---

## 🗺️ Human-Readable Diagram Overview

```text
+-------------------------------------------------------------------------------------------------+
|                                 1. CLIENT STOREFRONT (BROWSER)                                  |
|   [Top Marquee Ticker]   [Product Grid (4 Cats)]   [Instant Delivery Modal]   [Tri-Gateway TopUp]  |
+-------------------------------------------------------------------------------------------------+
                                                |
                                                v (HTTPS / REST)
+-------------------------------------------------------------------------------------------------+
|                                2. SERVERLESS EDGE HANDLERS (/api)                               |
|   [verify-slip.js]        [truemoney-redeem.js]        [crypto-ltc.js]        [discord-notify.js]   |
+-------------------------------------------------------------------------------------------------+
                                                |
                                                v (Service Role / RPC)
+-------------------------------------------------------------------------------------------------+
|                             3. SUPABASE POSTGRESQL PLATFORM                                     |
|   Stored Procedures:                                                                            |
|     * execute_order_checkout() [FOR UPDATE SKIP LOCKED]                                         |
|     * process_topup() [UNIQUE slip_trans_ref]                                                   |
|   Relational Cluster (12 Tables with 100% RLS):                                                 |
|     * profiles, categories, products, inventory_keys (AES-256 Encrypted), orders, order_items   |
+-------------------------------------------------------------------------------------------------+
```

---

## 🎨 Interactive Excalidraw Scene Data

%%
# Drawing elements
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "box-client",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 600,
      "height": 140,
      "angle": 0,
      "strokeColor": "#00f0ff",
      "backgroundColor": "#07090e",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "strokeSharpness": "round"
    },
    {
      "id": "text-client",
      "type": "text",
      "x": 130,
      "y": 140,
      "width": 540,
      "height": 60,
      "angle": 0,
      "strokeColor": "#ffffff",
      "text": "1. CLIENT STOREFRONT (VANILLA JS ESM)\nindex.html + app.js + styles.css\n[Instant Credential Modal | Tri-Gateway Top-Up | Masked Ticker]",
      "fontSize": 16,
      "fontFamily": 1,
      "textAlign": "left",
      "verticalAlign": "top"
    },
    {
      "id": "box-api",
      "type": "rectangle",
      "x": 100,
      "y": 300,
      "width": 600,
      "height": 140,
      "angle": 0,
      "strokeColor": "#b829dd",
      "backgroundColor": "#13091e",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "strokeSharpness": "round"
    },
    {
      "id": "text-api",
      "type": "text",
      "x": 130,
      "y": 340,
      "width": 540,
      "height": 60,
      "angle": 0,
      "strokeColor": "#ffffff",
      "text": "2. SERVERLESS EDGE HANDLERS (/api)\nNode.js on Vercel / Cloudflare Functions\n[verify-slip.js | truemoney-redeem.js | crypto-ltc.js | discord-notify.js]",
      "fontSize": 16,
      "fontFamily": 1,
      "textAlign": "left",
      "verticalAlign": "top"
    },
    {
      "id": "box-db",
      "type": "rectangle",
      "x": 100,
      "y": 500,
      "width": 600,
      "height": 160,
      "angle": 0,
      "strokeColor": "#00e676",
      "backgroundColor": "#071e0f",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "strokeSharpness": "round"
    },
    {
      "id": "text-db",
      "type": "text",
      "x": 130,
      "y": 530,
      "width": 540,
      "height": 90,
      "angle": 0,
      "strokeColor": "#ffffff",
      "text": "3. SUPABASE POSTGRESQL PLATFORM\n* 12-Table Cluster with 100% RLS Enforcement\n* execute_order_checkout (ACID, FOR UPDATE SKIP LOCKED)\n* AES-256-GCM Encrypted Vault for inventory_keys",
      "fontSize": 16,
      "fontFamily": 1,
      "textAlign": "left",
      "verticalAlign": "top"
    },
    {
      "id": "arrow-1",
      "type": "arrow",
      "x": 400,
      "y": 240,
      "width": 0,
      "height": 60,
      "angle": 0,
      "strokeColor": "#00f0ff",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "points": [[0, 0], [0, 60]]
    },
    {
      "id": "arrow-2",
      "type": "arrow",
      "x": 400,
      "y": 440,
      "width": 0,
      "height": 60,
      "angle": 0,
      "strokeColor": "#b829dd",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "points": [[0, 0], [0, 60]]
    }
  ],
  "appState": {
    "viewBackgroundColor": "#0b0f19",
    "gridSize": 20
  }
}
```
%%
