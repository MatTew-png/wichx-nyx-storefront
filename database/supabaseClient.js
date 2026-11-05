/**
 * ==============================================================================
 * ⚡ SUPABASE CLIENT & LIVE DATA ADAPTER (FRONTEND & SERVERLESS COMPATIBLE)
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

  // 1. ดึงรายการสินค้าและคำนวณจำนวนสต็อกจริงที่ยังไม่ถูกขาย (is_sold = false)
  async getProducts() {
    if (!this.isLive || !this.client) {
      return window.categoriesData || [];
    }

    try {
      // ดึง Categories ทั้งหมด
      const { data: cats, error: catErr } = await this.client
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (catErr) throw catErr;

      // ดึง Products ทั้งหมด
      const { data: prods, error: prodErr } = await this.client
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (prodErr) throw prodErr;

      // ดึงจำนวนสต็อกจริงคงเหลือที่ยังไม่ขาย
      const { data: stockCounts, error: stockErr } = await this.client
        .from("inventory_keys")
        .select("product_id")
        .eq("is_sold", false);

      const stockMap = {};
      if (!stockErr && stockCounts) {
        stockCounts.forEach(item => {
          stockMap[item.product_id] = (stockMap[item.product_id] || 0) + 1;
        });
      }

      // แมปเข้าโครงสร้าง categoriesData ที่หน้าร้านใช้งาน
      return cats.map(cat => ({
        id: cat.id,
        name: cat.name,
        subName: cat.sub_name,
        icon: cat.icon || "layers",
        badge: cat.badge || "AUTO",
        products: prods
          .filter(p => p.category_id === cat.id)
          .map(p => ({
            id: p.id,
            title: p.title,
            price: parseFloat(p.price),
            originalPrice: p.original_price ? parseFloat(p.original_price) : null,
            unit: p.unit,
            stock: stockMap[p.id] !== undefined ? stockMap[p.id] : 10,
            status: stockMap[p.id] === 0 ? "OUT OF STOCK" : (p.status || "SALE"),
            fulfillmentType: p.fulfillment_type || "instant",
            chips: p.chips || [],
            imageUrl: typeof createCyberArtwork === "function" 
              ? createCyberArtwork(p.title, cat.name, p.id.includes("nitro") ? "nitro" : "discord", "#19BAFF", "#38D4FF")
              : ""
          }))
      }));
    } catch (err) {
      console.warn("[SUPABASE] Fetch live products failed, using fallback:", err.message);
      return window.categoriesData || [];
    }
  },

  // 2. ดึงยอดเงินในกระเป๋าของผู้ใช้
  async getUserBalance(userId) {
    if (!this.isLive || !this.client || !userId) {
      return parseFloat(localStorage.getItem("wichx_balance") || "500.00");
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
      return parseFloat(localStorage.getItem("wichx_balance") || "500.00");
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
  }
};

if (typeof window !== "undefined") {
  window.SupabaseAdapter = SupabaseAdapter;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SupabaseAdapter;
}
