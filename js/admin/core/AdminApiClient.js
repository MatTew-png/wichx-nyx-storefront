/**
 * ==============================================================================
 * 🌐 ADMIN API CLIENT (CENTRALIZED GATEWAY)
 * ==============================================================================
 * Unified wrapper for Supabase RPCs and Serverless API endpoints
 * Auto-injects X-Admin-Key & X-Admin-Secret headers
 * ==============================================================================
 */

class AdminApiClient {
  constructor(store) {
    this.store = store;
    this.supabaseClient = null;
    this.defaultConfig = {
      supabase: {
        url: "https://ymaulztlbctpzyhdhjvn.supabase.co",
        anonKey: "sb_publishable_liwa3Juk3Gy6LBSNnUIHRA_iqsD78_u"
      }
    };
    this.initSupabase();
  }

  initSupabase() {
    if (this.supabaseClient) return this.supabaseClient;
    if (typeof window === "undefined") return null;

    const url = window.storeConfig?.supabase?.url || this.defaultConfig.supabase.url;
    const anonKey = window.storeConfig?.supabase?.anonKey || this.defaultConfig.supabase.anonKey;

    if (window.supabase && url && anonKey) {
      try {
        this.supabaseClient = window.supabase.createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        window.supabaseClient = this.supabaseClient;
      } catch (e) {
        console.warn("[AdminApiClient] Supabase initialization error:", e);
      }
    }
    return this.supabaseClient;
  }

  getSecret() {
    return this.store.get("adminSecret") || "";
  }

  async rpc(funcName, params = {}) {
    const client = this.initSupabase();
    if (!client) throw new Error("Supabase client not initialized");

    const payload = {
      p_admin_secret: this.getSecret(),
      ...params
    };

    return await client.rpc(funcName, payload);
  }

  async fetchApi(url, options = {}) {
    const secret = this.getSecret();
    const headers = {
      "Content-Type": "application/json",
      "X-Admin-Key": secret,
      "X-Admin-Secret": secret,
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    return res;
  }

  async fetchApiJson(url, options = {}) {
    const res = await this.fetchApi(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.success) {
      const err = new Error(data.message || `Request failed with status ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AdminApiClient = AdminApiClient;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminApiClient;
}
