/**
 * ==============================================================================
 * 📜 HISTORY & ORDER VAULT SERVICE (OOP ORDER RETRIEVAL ENGINE)
 * ==============================================================================
 */

class HistoryService {
  constructor(store) {
    this.store = store;
  }

  /**
   * รวมประวัติคำสั่งซื้อจากทั้ง Supabase (เมื่อล็อกอิน) และ LocalStorage (ออฟไลน์/Guest)
   */
  async getOrderHistory() {
    const user = this.store.get("user");
    const localRaw = typeof localStorage !== "undefined" ? localStorage.getItem("wichx_orders") : null;
    let localOrders = [];

    try {
      if (localRaw) {
        localOrders = JSON.parse(localRaw);
      }
    } catch (e) {
      console.warn("[HISTORY] Local order parse failed:", e);
    }

    let supabaseOrders = [];
    if (window.SupabaseAdapter && window.SupabaseAdapter.isLive) {
      const dbOrders = await window.SupabaseAdapter.getUserOrders(user?.id || null);
      if (Array.isArray(dbOrders)) {
        supabaseOrders = dbOrders.map(o => ({
          orderId: o.id,
          totalAmount: parseFloat(o.total_amount || 0),
          timestamp: o.created_at,
          paymentMethod: o.payment_method || "wallet",
          status: o.status || "PAID",
          items: (o.order_items || []).map(oi => ({
            id: oi.product_id,
            title: oi.custom_data?.title || oi.product_id || "สินค้าดิจิทัล",
            quantity: oi.quantity || 1,
            credentials: oi.delivered_content ? oi.delivered_content.split("\n") : []
          }))
        }));
      }
    }

    // รวมและจัดเรียงตามเวลาล่าสุด โดยไม่ให้มี Order ID ซ้ำกัน
    const mergedMap = new Map();

    // ใส่จาก Supabase ก่อน
    supabaseOrders.forEach(ord => {
      if (ord.orderId) mergedMap.set(ord.orderId, ord);
    });

    // ใส่จาก LocalStorage ถ้ายังไม่มี
    localOrders.forEach(ord => {
      const id = ord.orderId || ord.id;
      if (id && !mergedMap.has(id)) {
        mergedMap.set(id, {
          orderId: id,
          totalAmount: ord.totalAmount || 0,
          timestamp: ord.timestamp || new Date().toISOString(),
          paymentMethod: ord.paymentMethod || "wallet",
          status: ord.status || "PAID",
          items: (ord.items || []).map(item => ({
            id: item.id,
            title: item.title || item.id,
            quantity: item.quantity || 1,
            credentials: item.credentials || (item.delivered_content ? item.delivered_content.split("\n") : [])
          }))
        });
      }
    });

    const finalOrders = Array.from(mergedMap.values());
    finalOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    this.store.set("orderHistory", finalOrders);
    return finalOrders;
  }

  /**
   * คัดลอกข้อความไปยังคลิปบอร์ดอย่างปลอดภัย
   */
  async copyToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback สำหรับเบราว์เซอร์เก่า
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      console.error("[HISTORY] Copy failed:", e);
      return false;
    }
  }
}

if (typeof window !== "undefined") {
  window.HistoryService = HistoryService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = HistoryService;
}
