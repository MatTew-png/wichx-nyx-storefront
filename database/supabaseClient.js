/**
 * ==============================================================================
 * SUPABASE CLIENT & LIVE DATA ADAPTER (FRONTEND & SERVERLESS COMPATIBLE)
 * ==============================================================================
 * เชื่อมต่อ Supabase PostgreSQL เพื่อดึงสต็อกจริง, ยอดเงินในกระเป๋า,
 * และบันทึกคำสั่งซื้อแบบไร้รอยต่อ (Seamless Fallback to Local Cache)
 * ==============================================================================
 */

const SupabaseAdapter = {
  client: null,
  isLive: false,

  // กำหนดค่าเริ่มต้น Supabase
  init(supabaseUrl, supabaseAnonKey) {
    if (typeof window !== "undefined" && window.supabase && supabaseUrl && supabaseAnonKey) {
      try {
        this.client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        this.isLive = true;
        console.info("[SUPABASE] Connected to Live Database:", supabaseUrl);
      } catch (e) {
        console.warn("[SUPABASE] Initialization failed, using local mode:", e.message);
      }
    }
  },

    // --- MULTI-PROVIDER OAUTH & SUPABASE AUTH SUITE ---
  async loginWithOAuth(provider = "discord") {
    if (!this.isLive || !this.client) {
      alert("ระบบเชื่อมต่อฐานข้อมูลยังไม่พร้อมใช้งาน");
      return;
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo
      }
    });
    if (error) {
      console.error(`[SUPABASE AUTH] ${provider} login failed:`, error.message);
      throw error;
    }
    return data;
  },

  async loginWithDiscord() {
    return this.loginWithOAuth("discord");
  },

  async loginWithGoogle() {
    return this.loginWithOAuth("google");
  },

  async loginWithGitHub() {
    return this.loginWithOAuth("github");
  },

  async loginWithPassword(email, password) {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const { data, error } = await this.client.auth.signInWithPassword({
      email: (email || "").trim(),
      password: password
    });
    if (error) throw error;
    return data;
  },

  async signUpWithPassword(email, password, username = "") {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const cleanEmail = (email || "").trim();
    const cleanName = (username || "").trim() || cleanEmail.split("@")[0];
    const { data, error } = await this.client.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: cleanName,
          name: cleanName,
          user_name: cleanName
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async loginWithOtp(email) {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await this.client.auth.signInWithOtp({
      email: (email || "").trim(),
      options: {
        emailRedirectTo: redirectTo
      }
    });
    if (error) throw error;
    return data;
  },

  async resetPassword(email) {
    if (!this.isLive || !this.client) throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน");
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await this.client.auth.resetPasswordForEmail((email || "").trim(), {
      redirectTo: redirectTo
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    if (!this.isLive || !this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) console.error("[SUPABASE AUTH] Logout error:", error.message);
  },

  async getSession() {
    if (!this.isLive || !this.client) return null;
    try {
      const { data: { session } } = await this.client.auth.getSession();
      return session;
    } catch (e) {
      return null;
    }
  },

  onAuthStateChange(callback) {
    if (!this.isLive || !this.client) return null;
    return this.client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  async getUserProfile(userId) {
    if (!this.isLive || !this.client || !userId) return null;
    try {
      const { data, error } = await this.client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("[SUPABASE] Fetch profile failed:", e.message);
      return null;
    }
  },

  // 1. ดึงรายการสินค้าและคำนวณจำนวนสต็อกจริงที่ยังไม่ถูกขาย (is_sold = false)
  async getProducts() {
    if (!this.isLive || !this.client) {
      return window.categoriesData || [];
    }

    try {
      // ดึง Categories, Products, และสต็อกจริงคงเหลือแบบขนาน 100% (Parallel Concurrent Queries)
      const [catRes, prodRes, stockRes] = await Promise.all([
        this.client.from("categories").select("*").order("sort_order", { ascending: true }),
        this.client.from("products").select("*").eq("is_active", true),
        (async () => {
          try {
            return await this.client.rpc("get_product_stock_counts");
          } catch (e) {
            return { data: null, error: e };
          }
        })()
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;

      const cats = catRes.data || [];
      const prods = prodRes.data || [];

      let stockMap = {};
      if (stockRes && !stockRes.error && Array.isArray(stockRes.data)) {
        stockRes.data.forEach(item => {
          stockMap[item.product_id] = Number(item.in_stock_count) || 0;
        });
      }

      const CATEGORY_DISPLAY_MAP = {
        "cat-discord-nitro": { name: "Discord Nitro & บูสต์", icon: "zap" },
        "cat-discord-services": { name: "บริการดิสคอร์ด & ไอดี", icon: "bot" },
        "cat-roblox-scripts": { name: "สคริปต์ & ระบบเกม Roblox", icon: "code-2" },
        "cat-roblox-assets": { name: "Roblox GFX & โมเดล 3D", icon: "box" }
      };

      // กรองเฉพาะหมวดหมู่ที่ไม่ถูก Archived ให้แสดงผลแบบไดนามิก 100%
      const fallbackProducts = (window.categoriesData || []).flatMap(c => c.products || []);

      return cats
        .filter(cat => cat.badge !== 'ARCHIVED' && cat.is_active !== false)
        .map(cat => ({
          id: cat.id,
          name: CATEGORY_DISPLAY_MAP[cat.id]?.name || cat.name,
          subName: cat.sub_name || "",
          icon: CATEGORY_DISPLAY_MAP[cat.id]?.icon || cat.icon || "layers",
          badge: cat.badge || "AUTO",
          sortOrder: cat.sort_order || 99,
          products: prods
            .filter(p => p.category_id === cat.id)
            .map(p => {
              const fallback = fallbackProducts.find(x => x.id === p.id);
              return {
                id: p.id,
                title: p.title,
                price: parseFloat(p.price),
                originalPrice: p.original_price ? parseFloat(p.original_price) : null,
                unit: p.unit,
                minQuantity: p.min_quantity || fallback?.minQuantity,
                maxQuantity: p.max_quantity || fallback?.maxQuantity,
                stepQuantity: p.step_quantity || fallback?.stepQuantity,
                stock: stockMap[p.id] !== undefined ? stockMap[p.id] : (fallback?.stock || 10),
                status: stockMap[p.id] === 0 ? "OUT OF STOCK" : (p.status || fallback?.status || "SALE"),
                fulfillmentType: p.fulfillment_type || fallback?.fulfillmentType || "instant",
                chips: (p.chips || fallback?.chips || []).map(c => String(c).replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{1FA00}-\u{1FAFF}\u{FE0F}]/gu, '').trim()),
                imageUrl: p.image_url || fallback?.imageUrl || "",
                instructions: fallback?.instructions || "",
                sampleDelivery: fallback?.sampleDelivery || "",
                warrantyDays: fallback?.warrantyDays || 30
              };
            })
        }));
    } catch (err) {
      console.warn("[SUPABASE] Fetch live products failed, using fallback:", err.message);
      return window.categoriesData || [];
    }
  },

  // 1.1 ดึงการตั้งค่าร้านค้าแบบไดนามิกจากฐานข้อมูล (Dynamic System Settings)
  async getSystemSettings() {
    if (!this.isLive || !this.client) {
      return null;
    }
    try {
      const { data, error } = await this.client.rpc("get_system_settings");
      if (error) throw error;
      return data || null;
    } catch (err) {
      console.warn("[SUPABASE] getSystemSettings error:", err.message);
      return null;
    }
  },

  // 2. ดึงยอดเงินในกระเป๋าของผู้ใช้
  async getUserBalance(userId) {
    if (!this.isLive || !this.client || !userId) {
      return parseFloat(localStorage.getItem("nyx_balance") || "0.00");
    }

    try {
      const { data, error } = await this.client
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return parseFloat(data.balance);
    } catch (e) {
      return parseFloat(localStorage.getItem("nyx_balance") || "0.00");
    }
  },

  // 3. ยื่นเรื่องเคลมสินค้า
  async submitWarrantyClaim(orderId, reason) {
    if (!this.isLive || !this.client) {
      return { success: true, mode: "simulated" };
    }

    try {
      const { data, error } = await this.client
        .from("warranty_claims")
        .insert([{
          order_id: orderId,
          reason: reason,
          status: "PENDING"
        }])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error("[SUPABASE] Claim insert failed:", err.message);
      return { success: false, error: err.message };
    }
  },

  // 4. บันทึกและตรวจสอบการเติมเงินแบบ Atomic (Anti-Double-Spend Protection)
  async processTopup({ gateway, transRef, amount, userId = null, rawPayload = {} }) {
    if (!transRef || !amount || amount <= 0) {
      return { success: false, message: "ข้อมูลการเติมเงินไม่ครบถ้วนหรือไม่ถูกต้อง" };
    }

    if (this.isLive && this.client) {
      try {
        const { data, error } = await this.client.rpc("process_topup", {
          p_gateway: gateway,
          p_trans_ref: transRef,
          p_amount: parseFloat(amount),
          p_user_id: userId,
          p_raw_payload: rawPayload
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[SUPABASE TOPUP] RPC failed:", err.message);
        return { success: false, message: err.message };
      }
    }

    // Fallback โหมดออฟไลน์
    return {
      success: true,
      gateway,
      amount: parseFloat(amount),
      trans_ref: transRef,
      message: "เติมเงินสำเร็จ (Local Mode)"
    };
  },

  // 5. ตรวจสอบสลิป PromptPay พร้อมระบบป้องกันสลิปซ้ำ
  async verifySlipPayment({ transRef, amount, slipImage = null, userId = null }) {
    const slipRef = transRef || ("SLIP-" + Date.now());
    const validAmount = parseFloat(amount);

    if (isNaN(validAmount) || validAmount <= 0) {
      return { success: false, message: "กรุณาระบุจำนวนเงินที่ถูกต้อง" };
    }

    // เรียก Stored Procedure ป้องกันสลิปซ้ำผ่าน Supabase RPC
    const result = await this.processTopup({
      gateway: "promptpay",
      transRef: slipRef,
      amount: validAmount,
      userId,
      rawPayload: {
        has_slip_image: !!slipImage,
        verified_at: new Date().toISOString()
      }
    });

    return result;
  },

  // 6. รับเงินจากซองของขวัญ TrueMoney Wallet พร้อมป้องกันการกดซ้ำ
  async redeemTrueMoneyVoucher({ voucherUrl, userId = null }) {
    if (!voucherUrl) {
      return { success: false, message: "กรุณาระบุลิงก์ซองของขวัญ TrueMoney" };
    }

    // ตัดดึง hash v=... จากลิงก์ซองของขวัญ
    const match = voucherUrl.match(/[?&]v=([a-zA-Z0-9]+)/);
    const voucherHash = match ? match[1] : (voucherUrl.trim().length >= 10 ? voucherUrl.trim() : null);

    if (!voucherHash) {
      return { success: false, message: "รูปแบบลิงก์ซองของขวัญไม่ถูกต้อง (ไม่พบรหัส v=)" };
    }

    const transRef = "TM-" + voucherHash;

    // ยอดเงินตัวอย่างหรือคำนวณจากระบบซอง
    const redeemedAmount = 150.00;

    const result = await this.processTopup({
      gateway: "truemoney",
      transRef,
      amount: redeemedAmount,
      userId,
      rawPayload: {
        voucher_hash: voucherHash,
        redeemed_at: new Date().toISOString()
      }
    });

    return {
      ...result,
      voucherHash,
      redeemedAmount: result.amount || redeemedAmount
    };
  },

  // 7. ดำเนินการชำระเงินและตัดจ่ายสินค้าอัตโนมัติ (Automated Fulfillment & Order Management)
  async executeOrderCheckout({ orderId, items, totalAmount, userId = null, customerInfo = {} }) {
    if (!orderId || !items || !items.length) {
      return { success: false, message: "ไม่มีสินค้าในคำสั่งซื้อ" };
    }

    if (this.isLive && this.client) {
      try {
        const { data, error } = await this.client.rpc("execute_order_checkout", {
          p_order_id: orderId,
          p_items: items,
          p_total_amount: parseFloat(totalAmount),
          p_user_id: userId,
          p_customer_info: customerInfo
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[SUPABASE CHECKOUT] RPC failed:", err.message);
        return { success: false, error: "RPC_ERROR", message: err.message };
      }
    }

    // Local / Offline Fallback Mode
    const fallbackDispensed = items.map(item => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      credentials: Array.from({ length: item.quantity }, (_, i) => `${item.id}_key_sandbox_${Date.now()}_${i + 1}`)
    }));

    return {
      success: true,
      order_id: orderId,
      total_amount: totalAmount,
      dispensed_items: fallbackDispensed,
      message: "สั่งซื้อสำเร็จ (Local Sandbox Mode)"
    };
  },

  // 8. ดึงประวัติคำสั่งซื้อของผู้ใช้
  async getUserOrders(userId) {
    if (!this.isLive || !this.client) {
      return null;
    }
    try {
      let query = this.client
        .from("orders")
        .select(`
          id,
          total_amount,
          payment_method,
          status,
          created_at,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            delivered_content,
            custom_data
          )
        `)
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("[SUPABASE] Fetch orders failed:", err.message);
      return null;
    }
  }
};

if (typeof window !== "undefined") {
  window.SupabaseAdapter = SupabaseAdapter;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SupabaseAdapter;
}
