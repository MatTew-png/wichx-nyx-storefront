/**
 * ==============================================================================
 * 💳 NYX9 STUDIO — 3D HOLOGRAM VIP MEMBER CARD COMPONENT (Sprint 4)
 * ==============================================================================
 * การ์ดสมาชิก VIP แบบ 3D พร้อมระบบ Specular Hologram Lighting,
 * Mouse / Gyroscope Tilt Physics และ HTML5 Canvas High-Res PNG Card Exporter
 * ==============================================================================
 */

class MemberCardModalComponent {
  constructor(store) {
    this.store = store;
    this.modalEl = null;
    this.cardEl = null;
    this.glareEl = null;
    this.isHovering = false;
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("modal-vip-member-card")) return;

    const modal = document.createElement("div");
    modal.id = "modal-vip-member-card";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all";
    modal.innerHTML = `
      <div class="relative w-full max-w-lg flex flex-col items-center space-y-6">
        
        <!-- Modal Top Bar -->
        <div class="w-full flex items-center justify-between px-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-400 font-bold">
              3D VIP IDENTITY
            </span>
            <span class="text-xs text-slate-400 font-medium">ขยับเมาส์เพื่อสัมผัสแสงโฮโลแกรม</span>
          </div>
          <button onclick="window.closeVipCardModal()" class="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- 3D Perspective Card Stage -->
        <div id="vip-card-stage" class="w-full aspect-[1.586/1] max-w-[440px] select-none" style="perspective: 1200px;">
          
          <!-- Interactive 3D Card Element -->
          <div id="vip-card-3d" class="relative w-full h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-transform duration-100 ease-out border border-white/20"
               style="transform-style: preserve-3d; background: linear-gradient(135deg, #0A0F1D 0%, #060911 50%, #0D1629 100%);">
            
            <!-- Dynamic Specular Hologram Glare Overlay -->
            <div id="vip-card-glare" class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 z-20 rounded-3xl"
                 style="mix-blend-mode: color-dodge; background: radial-gradient(circle at 50% 50%, rgba(0,242,255,0.45), rgba(245,158,11,0.3) 40%, transparent 70%);">
            </div>

            <!-- Background Microchip Circuit Watermark -->
            <div class="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#00F2FF_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <!-- Card Top Header -->
            <div class="relative z-10 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 p-1 flex items-center justify-center text-cyan-400 shadow-md">
                  <svg class="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,242,255,0.5)]" viewBox="0 0 497 704" fill="none">
                    <path d="M 11 181 L 55 229 L 19 458 L 0 515 L 89 600 L 125 299 L 278 487 L 303 566 L 443 685 L 380 465 L 368 218 L 377 155 L 318 208 L 302 359 L 177 231 L 113 115 Z" fill="#FFFFFF" />
                    <path d="M 362 0 L 260 109 L 238 200 L 253 256 L 294 307 L 304 259 L 304 185 L 378 120 L 418 180 L 424 247 L 385 307 L 400 435 L 496 268 L 480 127 Z" fill="#00F2FF" />
                  </svg>
                </div>
                <div>
                  <div class="font-heading font-extrabold text-sm text-white tracking-widest">NYX9 STUDIO</div>
                  <div class="text-[9px] text-slate-400 font-mono">PREMIUM VIP MEMBER</div>
                </div>
              </div>

              <!-- Hologram Tier Badge -->
              <div id="vip-card-tier-badge" class="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border border-amber-400/40 text-amber-300 font-mono font-extrabold text-[11px] shadow-sm flex items-center gap-1.5">
                <span>💎</span>
                <span id="vip-card-tier-name">DIAMOND VIP</span>
              </div>
            </div>

            <!-- Card Middle (Smart Chip & Serial) -->
            <div class="relative z-10 flex items-center justify-between my-2">
              <!-- Metallic SIM Chip -->
              <div class="w-12 h-9 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/60 p-1 flex items-center justify-center shadow-md relative overflow-hidden">
                <div class="w-full h-0.5 bg-black/20 my-auto"></div>
                <div class="absolute inset-x-3 inset-y-1.5 border border-black/30 rounded-sm"></div>
              </div>

              <!-- Contactless Wave Icon -->
              <i data-lucide="wifi" class="w-6 h-6 text-slate-400 rotate-90 opacity-70"></i>
            </div>

            <!-- Card Bottom (User Info & Balances) -->
            <div class="relative z-10 space-y-2">
              <div id="vip-card-serial" class="font-mono text-base sm:text-lg font-bold text-white tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                NYX9 8841 9283 5519
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-white/[0.08]">
                <div class="flex items-center gap-2">
                  <img id="vip-card-avatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="w-7 h-7 rounded-full object-cover ring-1 ring-cyan-400/50" />
                  <div>
                    <div id="vip-card-username" class="text-xs font-bold text-white truncate max-w-[140px]">Discord User</div>
                    <div class="text-[9px] text-slate-400 font-mono">STATUS: ACTIVE</div>
                  </div>
                </div>

                <div class="text-right flex items-center gap-3">
                  <div>
                    <div class="text-[9px] text-slate-400 font-mono">CREDIT</div>
                    <div id="vip-card-balance" class="text-xs font-mono font-bold text-cyan-400">฿500.00</div>
                  </div>
                  <div>
                    <div class="text-[9px] text-slate-400 font-mono">POINTS</div>
                    <div id="vip-card-points" class="text-xs font-mono font-bold text-amber-400">200 PTS</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Action Controls Bar -->
        <div class="w-full flex items-center justify-center gap-3 pt-2">
          <button onclick="window.saveVipCardImagePNG()" class="btn-cyber-primary px-6 py-2.5 rounded-xl font-heading font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all">
            <i data-lucide="camera" class="w-4 h-4"></i>
            <span>📸 บันทึกภาพการ์ด (Save PNG)</span>
          </button>
          <button onclick="window.closeVipCardModal()" class="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer">
            ปิด
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
    this.cardEl = document.getElementById("vip-card-3d");
    this.glareEl = document.getElementById("vip-card-glare");

    this.bindTiltPhysics();
    this.bindGlobalActions();
  }

  bindTiltPhysics() {
    const stage = document.getElementById("vip-card-stage");
    if (!stage || !this.cardEl || !this.glareEl) return;

    const handleMove = (x, y, rect) => {
      const mouseX = x - rect.left;
      const mouseY = y - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt degrees (-16 to +16 deg)
      const rotateX = ((centerY - mouseY) / centerY) * 16;
      const rotateY = ((mouseX - centerX) / centerX) * 16;

      this.cardEl.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

      // Move Specular Glare reflection
      const glareX = (mouseX / rect.width) * 100;
      const glareY = (mouseY / rect.height) * 100;
      this.glareEl.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(0,242,255,0.45), rgba(245,158,11,0.25) 35%, transparent 70%)`;
      this.glareEl.style.opacity = "1";
    };

    stage.addEventListener("mousemove", (e) => {
      const rect = stage.getBoundingClientRect();
      handleMove(e.clientX, e.clientY, rect);
    });

    stage.addEventListener("mouseleave", () => {
      this.cardEl.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      this.glareEl.style.opacity = "0";
    });

    // Touch Support for Smartphones
    stage.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches[0]) {
        const rect = stage.getBoundingClientRect();
        handleMove(e.touches[0].clientX, e.touches[0].clientY, rect);
      }
    }, { passive: true });

    stage.addEventListener("touchend", () => {
      this.cardEl.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      this.glareEl.style.opacity = "0";
    });
  }

  bindGlobalActions() {
    window.openVipCardModal = () => this.open();
    window.closeVipCardModal = () => this.close();
    window.saveVipCardImagePNG = () => this.exportCardPNG();
  }

  open() {
    this.initDOM();
    this.updateCardData();
    if (this.modalEl) {
      this.modalEl.classList.remove("hidden");
      this.modalEl.classList.add("flex");
    }
    if (window.lucide) lucide.createIcons();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add("hidden");
      this.modalEl.classList.remove("flex");
    }
  }

  updateCardData() {
    const user = this.store ? this.store.get("user") : null;
    const balance = this.store ? this.store.get("walletBalance") || 0 : 0;
    const points = this.store ? this.store.get("loyaltyPoints") || 0 : 0;

    const usernameEl = document.getElementById("vip-card-username");
    const avatarEl = document.getElementById("vip-card-avatar");
    const serialEl = document.getElementById("vip-card-serial");
    const balanceEl = document.getElementById("vip-card-balance");
    const pointsEl = document.getElementById("vip-card-points");
    const tierNameEl = document.getElementById("vip-card-tier-name");
    const tierBadgeEl = document.getElementById("vip-card-tier-badge");

    const username = user?.username || "Guest Member";
    const avatarUrl = user?.avatarUrl || "assets/logo.png";
    
    // Deterministic Card Serial: NYX-XXXX-XXXX
    const rawId = String(user?.id || user?.discordId || "GUEST_NYX_2026");
    let hash = 0;
    for (let i = 0; i < rawId.length; i++) hash = (hash * 31 + rawId.charCodeAt(i)) >>> 0;
    const p1 = String(hash).slice(0, 4).padEnd(4, "7");
    const p2 = String(hash).slice(4, 8).padEnd(4, "9");
    const serial = `NYX9 ${p1} ${p2} 2026`;

    // Tier Calculation Formula
    let tier = "BRONZE MEMBER";
    let tierColor = "#94A3B8";
    let tierIcon = "🥉";

    if (balance >= 5000 || points >= 5000) {
      tier = "DIAMOND ELITE";
      tierColor = "#EC4899";
      tierIcon = "💎";
    } else if (balance >= 2000 || points >= 2000) {
      tier = "GOLD VIP";
      tierColor = "#F59E0B";
      tierIcon = "🥇";
    } else if (balance >= 500 || points >= 500) {
      tier = "SILVER VIP";
      tierColor = "#00F2FF";
      tierIcon = "🥈";
    }

    if (usernameEl) usernameEl.textContent = username;
    if (avatarEl) avatarEl.src = avatarUrl;
    if (serialEl) serialEl.textContent = serial;
    if (balanceEl) balanceEl.textContent = `฿${balance.toFixed(2)}`;
    if (pointsEl) pointsEl.textContent = `${Math.floor(points).toLocaleString()} PTS`;

    if (tierNameEl && tierBadgeEl) {
      tierNameEl.textContent = tier;
      tierBadgeEl.innerHTML = `<span>${tierIcon}</span> <span>${tier}</span>`;
      tierBadgeEl.style.borderColor = `${tierColor}66`;
      tierBadgeEl.style.color = tierColor;
    }
  }

  async exportCardPNG() {
    window.UI?.toast("📸 กำลังสร้างรูปภาพการ์ด VIP ความละเอียดสูง (1200x675)...", "info");

    const user = this.store ? this.store.get("user") : null;
    const balance = this.store ? this.store.get("walletBalance") || 0 : 0;
    const points = this.store ? this.store.get("loyaltyPoints") || 0 : 0;
    const username = user?.username || "Guest Member";

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");

    // 1. Dark Cyberpunk Backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, "#05070B");
    bgGrad.addColorStop(0.5, "#090D17");
    bgGrad.addColorStop(1, "#030408");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // Subtle Neon Ambient Light
    const ambGrad = ctx.createRadialGradient(600, 337, 100, 600, 337, 500);
    ambGrad.addColorStop(0, "rgba(0, 242, 255, 0.12)");
    ambGrad.addColorStop(1, "transparent");
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // 2. Draw Card Body (Centered 880 x 550)
    const cardX = 160;
    const cardY = 62;
    const cardW = 880;
    const cardH = 550;
    const cardR = 36;

    // Outer Glow Ring
    ctx.save();
    ctx.shadowColor = "#00F2FF";
    ctx.shadowBlur = 35;
    ctx.strokeStyle = "rgba(0, 242, 255, 0.5)";
    ctx.lineWidth = 3;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.stroke();
    ctx.restore();

    // Card Fill Gradient
    const cGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cGrad.addColorStop(0, "#0B101E");
    cGrad.addColorStop(0.5, "#060810");
    cGrad.addColorStop(1, "#0E182A");
    ctx.fillStyle = cGrad;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fill();

    // Specular Holographic Overlay
    const holoGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    holoGrad.addColorStop(0.2, "rgba(0, 242, 255, 0.08)");
    holoGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.12)");
    holoGrad.addColorStop(0.8, "rgba(236, 72, 153, 0.08)");
    ctx.fillStyle = holoGrad;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fill();

    // 3. Brand & Logo
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px 'Prompt', sans-serif";
    ctx.fillText("NYX9 STUDIO", cardX + 50, cardY + 70);
    ctx.font = "bold 13px 'Prompt', sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText("PREMIUM VIP MEMBER", cardX + 50, cardY + 95);

    // Tier Badge
    const tier = balance >= 5000 ? "💎 DIAMOND ELITE" : (balance >= 2000 ? "🥇 GOLD VIP" : (balance >= 500 ? "🥈 SILVER VIP" : "🥉 BRONZE MEMBER"));
    ctx.fillStyle = "#00F2FF";
    ctx.font = "bold 16px 'Prompt', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(tier, cardX + cardW - 50, cardY + 75);
    ctx.textAlign = "left";

    // 4. Chip
    ctx.fillStyle = "#F59E0B";
    this.roundRect(ctx, cardX + 50, cardY + 160, 90, 65, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();

    // 5. Serial Number
    const rawId = String(user?.id || user?.discordId || "GUEST");
    let hash = 0;
    for (let i = 0; i < rawId.length; i++) hash = (hash * 31 + rawId.charCodeAt(i)) >>> 0;
    const serial = `NYX9 ${String(hash).slice(0, 4).padEnd(4, "7")} ${String(hash).slice(4, 8).padEnd(4, "9")} 2026`;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px 'Orbitron', monospace";
    ctx.fillText(serial, cardX + 50, cardY + 330);

    // 6. Member Username, Credit & Points
    ctx.font = "bold 24px 'Prompt', sans-serif";
    ctx.fillText(username, cardX + 50, cardY + 450);
    ctx.font = "14px 'Prompt', sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("VERIFIED IDENTITY", cardX + 50, cardY + 480);

    ctx.textAlign = "right";
    ctx.font = "bold 20px 'Orbitron', monospace";
    ctx.fillStyle = "#00F2FF";
    ctx.fillText(`฿${balance.toFixed(2)}`, cardX + cardW - 50, cardY + 445);
    ctx.font = "12px 'Prompt', sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("WALLET BALANCE", cardX + cardW - 50, cardY + 465);

    ctx.font = "bold 18px 'Orbitron', monospace";
    ctx.fillStyle = "#F59E0B";
    ctx.fillText(`${Math.floor(points).toLocaleString()} PTS`, cardX + cardW - 50, cardY + 495);
    ctx.textAlign = "left";

    // 7. Watermark Footer
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "12px 'Prompt', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NYX9 STUDIO • OFFICIAL MEMBER IDENTIFICATION CARD • 24/7 ONLINE", 600, 650);

    // Download PNG
    const link = document.createElement("a");
    link.download = `NYX9_VIP_Card_${username.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    window.UI?.toast("บันทึกรูปภาพการ์ด VIP ลงเครื่องเรียบร้อยแล้ว!", "success");
    window.UI?.confetti();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.MemberCardModalComponent = MemberCardModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = MemberCardModalComponent;
}
