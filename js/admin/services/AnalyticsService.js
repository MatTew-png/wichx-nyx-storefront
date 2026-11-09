/**
 * ==============================================================================
 * 📊 ANALYTICS & INTERACTIVE CHARTS SERVICE
 * ==============================================================================
 * Manages Chart.js instances, Sales Timeseries, Product Donuts, and CSV Export
 * ==============================================================================
 */

class AnalyticsService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.chartSalesInstance = null;
    this.chartProductsInstance = null;
    this.chartPaymentsInstance = null;
  }

  setChartTimespan(days) {
    this.store.set("activeTimespanDays", days);
    [7, 14, 30].forEach(d => {
      const btn = document.getElementById(`btn-timespan-${d}`);
      if (btn) {
        if (d === days) {
          btn.className = "px-3 py-1 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] font-bold border border-[var(--accent)]/30 transition-all cursor-pointer";
        } else {
          btn.className = "px-3 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition-all cursor-pointer";
        }
      }
    });

    const data = this.store.get("currentAnalyticsData");
    if (data) {
      this.renderSalesTimeseriesChart(data.timeseries || [], days);
    }
  }

  renderMetrics(data) {
    const metrics = (data && data.metrics) || {};
    const revEl = document.getElementById("metric-revenue");
    const ordEl = document.getElementById("metric-orders");
    const stkEl = document.getElementById("metric-stock");
    const topEl = document.getElementById("metric-topups");

    if (revEl) revEl.textContent = `฿${parseFloat(metrics.total_revenue || 0).toFixed(2)}`;
    if (ordEl) ordEl.textContent = `${metrics.total_orders || 0} รายการ`;
    if (stkEl) stkEl.textContent = `${metrics.total_unsold_stock || 0} ชิ้น`;
    if (topEl) topEl.textContent = `฿${parseFloat(metrics.total_topups || 0).toFixed(2)}`;
  }

  renderAnalyticsDashboard(analytics) {
    if (!analytics) return;
    this.store.set("currentAnalyticsData", analytics);
    const { stock_summary, top_products, payment_methods, timeseries } = analytics;

    if (stock_summary) {
      const totP = document.getElementById("analytics-total-prods");
      const actP = document.getElementById("analytics-active-prods");
      const sldK = document.getElementById("analytics-sold-keys");
      const unsK = document.getElementById("analytics-unsold-keys");

      if (totP) totP.textContent = `${stock_summary.total_products || 0} รายการ`;
      if (actP) actP.textContent = `${stock_summary.active_products || 0} รายการ`;
      if (sldK) sldK.textContent = `${stock_summary.total_sold_keys || 0} ชิ้น`;
      if (unsK) unsK.textContent = `${stock_summary.total_unsold_keys || 0} ชิ้น`;
    }

    const days = this.store.get("activeTimespanDays") || 14;
    this.renderSalesTimeseriesChart(timeseries || [], days);
    this.renderTopProductsChart(top_products || []);
    this.renderPaymentMethodsChart(payment_methods || []);
  }

  renderSalesTimeseriesChart(rawTimeseries, days = 14) {
    const ctx = document.getElementById("chart-sales-timeseries");
    if (!ctx || typeof Chart === "undefined") return;

    if (this.chartSalesInstance) {
      this.chartSalesInstance.destroy();
    }

    const timeline = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
      timeline.push({ iso, label, revenue: 0, count: 0 });
    }

    const dataMap = {};
    (rawTimeseries || []).forEach(row => {
      if (row.order_date) {
        dataMap[row.order_date] = {
          revenue: parseFloat(row.revenue || 0),
          count: parseInt(row.order_count || 0)
        };
      }
    });

    timeline.forEach(item => {
      if (dataMap[item.iso]) {
        item.revenue = dataMap[item.iso].revenue;
        item.count = dataMap[item.iso].count;
      }
    });

    const labels = timeline.map(t => t.label);
    const revenueData = timeline.map(t => t.revenue);
    const countData = timeline.map(t => t.count);

    const canvasCtx = ctx.getContext("2d");
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "rgba(25, 186, 255, 0.4)");
    gradient.addColorStop(1, "rgba(25, 186, 255, 0.0)");

    this.chartSalesInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "ยอดขายรวม (บาท)",
            data: revenueData,
            borderColor: "#19BAFF",
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: "#19BAFF",
            pointBorderColor: "#06080C",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: "y"
          },
          {
            label: "จำนวนออเดอร์",
            data: countData,
            borderColor: "#10B981",
            borderWidth: 2,
            borderDash: [4, 4],
            backgroundColor: "transparent",
            tension: 0.2,
            pointBackgroundColor: "#10B981",
            pointBorderColor: "#06080C",
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { color: "#94A3B8", font: { family: "Prompt", size: 11 } }
          },
          tooltip: {
            backgroundColor: "rgba(14, 19, 29, 0.95)",
            borderColor: "rgba(25, 186, 255, 0.3)",
            borderWidth: 1,
            titleColor: "#FFFFFF",
            titleFont: { family: "Chakra Petch", size: 12, weight: "bold" },
            bodyColor: "#E2E8F0",
            bodyFont: { family: "Prompt", size: 11 },
            padding: 10,
            cornerRadius: 12,
            callbacks: {
              label: function(context) {
                if (context.datasetIndex === 0) {
                  return ` ยอดขาย: ฿${parseFloat(context.raw).toFixed(2)}`;
                }
                return ` ออเดอร์: ${context.raw} รายการ`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#64748B", font: { family: "Prompt", size: 10 } }
          },
          y: {
            type: "linear",
            position: "left",
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#19BAFF",
              font: { family: "JetBrains Mono", size: 10 },
              callback: v => "฿" + v
            }
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              color: "#10B981",
              font: { family: "JetBrains Mono", size: 10 },
              stepSize: 1
            }
          }
        }
      }
    });
  }

  renderTopProductsChart(topProducts) {
    const ctx = document.getElementById("chart-top-products");
    const listContainer = document.getElementById("top-products-list");
    if (!ctx || !listContainer || typeof Chart === "undefined") return;

    if (this.chartProductsInstance) {
      this.chartProductsInstance.destroy();
    }

    listContainer.innerHTML = "";

    if (!topProducts || topProducts.length === 0) {
      listContainer.innerHTML = `<div class="text-center py-4 text-slate-500">ยังไม่มีข้อมูลยอดขายสินค้า</div>`;
      return;
    }

    const colors = ["#19BAFF", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#38BDF8"];
    const labels = topProducts.map(p => p.title || p.product_id);
    const units = topProducts.map(p => p.units_sold || 0);

    this.chartProductsInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: units,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "#0E131D",
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(14, 19, 29, 0.95)",
            borderColor: "rgba(139, 92, 246, 0.3)",
            borderWidth: 1,
            titleFont: { family: "Prompt", size: 11 },
            bodyFont: { family: "JetBrains Mono", size: 11 },
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: function(c) {
                const prod = topProducts[c.dataIndex];
                return ` จำหน่าย: ${prod.units_sold} ชิ้น (฿${parseFloat(prod.total_revenue || 0).toFixed(2)})`;
              }
            }
          }
        }
      }
    });

    topProducts.slice(0, 4).forEach((prod, i) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60";
      row.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${colors[i % colors.length]}"></span>
          <span class="truncate text-slate-200">${AdminUI.escapeHtml(prod.title || prod.product_id)}</span>
        </div>
        <div class="text-right shrink-0 font-mono text-[11px] pl-2">
          <span class="text-white font-bold">${prod.units_sold} ชิ้น</span>
          <span class="text-slate-400 ml-1.5">(฿${parseFloat(prod.total_revenue || 0).toFixed(2)})</span>
        </div>
      `;
      listContainer.appendChild(row);
    });
  }

  renderPaymentMethodsChart(paymentMethods) {
    const ctx = document.getElementById("chart-payment-methods");
    const listContainer = document.getElementById("payment-methods-list");
    if (!ctx || !listContainer || typeof Chart === "undefined") return;

    if (this.chartPaymentsInstance) {
      this.chartPaymentsInstance.destroy();
    }

    listContainer.innerHTML = "";

    const methodColors = {
      wallet: "#8B5CF6",
      promptpay: "#10B981",
      truemoney: "#EF4444"
    };

    const labels = (paymentMethods || []).map(m => m.method ? m.method.toUpperCase() : "WALLET");
    const amounts = (paymentMethods || []).map(m => parseFloat(m.total_amount || 0));
    const bgColors = (paymentMethods || []).map(m => methodColors[m.method?.toLowerCase()] || "#19BAFF");

    this.chartPaymentsInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: amounts.length > 0 ? amounts : [1],
          backgroundColor: amounts.length > 0 ? bgColors : ["#1E293B"],
          borderColor: "#0E131D",
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(14, 19, 29, 0.95)",
            borderColor: "rgba(16, 185, 129, 0.3)",
            borderWidth: 1,
            titleFont: { family: "Chakra Petch", size: 11 },
            bodyFont: { family: "JetBrains Mono", size: 11 },
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: function(c) {
                return ` ยอดรวม: ฿${parseFloat(c.raw).toFixed(2)}`;
              }
            }
          }
        }
      }
    });

    const allMethods = [
      { key: "wallet", name: "👛 วอลเล็ต", color: "purple" },
      { key: "promptpay", name: "💸 พร้อมเพย์", color: "emerald" },
      { key: "truemoney", name: "🧧 ทรูมันนี่", color: "red" }
    ];

    allMethods.forEach(m => {
      const found = (paymentMethods || []).find(p => p.method?.toLowerCase() === m.key);
      const amt = found ? parseFloat(found.total_amount || 0).toFixed(2) : "0.00";
      const count = found ? found.order_count : 0;
      const col = document.createElement("div");
      col.className = "p-2 rounded-xl bg-slate-900/60 border border-slate-800";
      col.innerHTML = `
        <div class="text-[10px] text-slate-400">${m.name}</div>
        <div class="font-mono font-bold text-white text-xs mt-0.5">฿${amt}</div>
        <div class="text-[9px] text-slate-500">${count} บิล</div>
      `;
      listContainer.appendChild(col);
    });
  }

  resizeCharts() {
    setTimeout(() => {
      if (this.chartSalesInstance) this.chartSalesInstance.resize();
      if (this.chartProductsInstance) this.chartProductsInstance.resize();
      if (this.chartPaymentsInstance) this.chartPaymentsInstance.resize();
    }, 50);
  }

  async exportOrdersToCSV() {
    try {
      let orders = [];
      const supabase = this.apiClient.initSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          orders = data;
        }
      }

      if (orders.length === 0 && window.currentDashboardData && window.currentDashboardData.recent_orders) {
        orders = window.currentDashboardData.recent_orders;
      }

      if (!orders || orders.length === 0) {
        alert('ไม่พบข้อมูลคำสั่งซื้อสำหรับส่งออก CSV');
        return;
      }

      const headers = [
        'ลำดับ',
        'รหัสคำสั่งซื้อ (Order ID)',
        'วันที่-เวลา (Date Time)',
        'ผู้สั่งซื้อ (Discord ID / User)',
        'สินค้า (Items)',
        'จำนวน (Qty)',
        'ยอดชำระสุทธิ (Total THB)',
        'ช่องทางชำระ (Payment Method)',
        'สถานะ (Status)'
      ];

      const rows = orders.map((ord, idx) => {
        let itemsStr = '-';
        let qty = 1;
        if (Array.isArray(ord.items)) {
          itemsStr = ord.items.map(it => (it.title || it.name || 'สินค้า') + ' x' + (it.quantity || 1)).join('; ');
          qty = ord.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
        } else if (typeof ord.items === 'object' && ord.items !== null) {
          itemsStr = JSON.stringify(ord.items);
        } else if (ord.items) {
          itemsStr = String(ord.items);
        }

        const dateStr = new Date(ord.created_at).toLocaleString('th-TH');
        const safe = (val) => '"' + String(val || '').replace(/"/g, '""') + '"';

        return [
          idx + 1,
          safe(ord.id),
          safe(dateStr),
          safe(ord.discord_id || ord.user_id || 'Guest'),
          safe(itemsStr),
          qty,
          parseFloat(ord.total_amount || 0).toFixed(2),
          safe(ord.payment_method || 'wallet'),
          safe(ord.status || 'PAID')
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateToday = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = 'NYX9_Sales_Report_' + dateToday + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV Error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด CSV: ' + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.AnalyticsService = AnalyticsService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AnalyticsService;
}
