/**
 * ==============================================================================
 * 🔔 SOCIAL PROOF FEED COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class SocialProofComponent {
  constructor() {
    this.timer = null;
    this.feedIndex = 0;
    this.mockFeed = [
      { user: "tew***", item: "Nitro Booster 1 เดือน", time: "เมื่อสักครู่", amount: "฿169" },
      { user: "art***", item: "เติมเงินผ่าน PromptPay", time: "1 นาทีที่แล้ว", amount: "฿500" },
      { user: "gta***", item: "Rockstar FiveM สะอาด", time: "2 นาทีที่แล้ว", amount: "฿10" },
      { user: "nyx***", item: "ปั๊มคนเซิร์ฟ Discord 500 คน", time: "3 นาทีที่แล้ว", amount: "฿250" },
      { user: "kri***", item: "โปรโมชั่น Nitro 3 เดือน ยกเมล", time: "4 นาทีที่แล้ว", amount: "฿150" },
      { user: "vip***", item: "ชำระเงินผ่านบัตรเครดิต", time: "5 นาทีที่แล้ว", amount: "฿1,000" }
    ];
  }

  init() {
    const box = document.getElementById("social-proof-toast");
    if (!box) return;

    setTimeout(() => this.showNext(), 2000);
    this.timer = setInterval(() => this.showNext(), 9000);
  }

  showNext() {
    const box = document.getElementById("social-proof-toast");
    if (!box) return;

    const data = this.mockFeed[this.feedIndex % this.mockFeed.length];
    this.feedIndex++;

    box.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-[rgba(25,186,255,0.15)] text-[var(--accent)] flex items-center justify-center shrink-0">
          <i data-lucide="bell" class="w-4 h-4"></i>
        </div>
        <div class="text-[11px] leading-tight flex-1">
          <div class="text-white"><span class="font-bold text-[var(--accent)]">${data.user}</span> สั่งซื้อ <span class="font-semibold text-slate-200">${data.item}</span></div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">${data.time} • ยอด ${data.amount}</div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    box.classList.remove("opacity-0", "translate-y-4");
    setTimeout(() => {
      box.classList.add("opacity-0", "translate-y-4");
    }, 4500);
  }
}

if (typeof window !== "undefined") {
  window.SocialProofComponent = SocialProofComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SocialProofComponent;
}
