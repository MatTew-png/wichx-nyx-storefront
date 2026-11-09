/**
 * ==============================================================================
 * 🎡 NYX9 STUDIO — LUCKY WHEEL & GAMIFICATION ENGINE (Sprint 3)
 * ==============================================================================
 * มินิเกมวงล้อเสี่ยงโชคพร้อมระบบฟิสิกส์ HTML5 Canvas, Web Audio Synthesizer,
 * Confetti Celebration และเชื่อมต่อ Stored Procedure fn_play_minigame แบบ Atomic
 * ==============================================================================
 */

class LuckyWheelComponent {
  constructor(store) {
    this.store = store;
    this.minigame = null;
    this.rewards = [];
    this.isSpinning = false;
    this.currentRotation = 0; // degrees
    this.audioCtx = null;
    this.canvas = null;
    this.ctx = null;
    this.initDOM();
  }

  async initDOM() {
    if (typeof document === "undefined") return;

    // ตรวจสอบหรือสร้าง Modal ผลรางวัลมินิเกม
    this.ensureResultModal();

    // ดึงข้อมูลวงล้อจาก API
    await this.fetchMinigameData();

    // ตรวจสอบว่ามี canvas ในหน้า view-minigame หรือไม่
    this.canvas = document.getElementById("lucky-wheel-canvas");
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      this.drawWheel();
      this.bindEvents();
    }
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playTickSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (_) {}
  }

  playWinFanfare() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.45);
      });
    } catch (_) {}
  }

  async fetchMinigameData() {
    try {
      const user = this.store.get("user");
      const url = user?.id ? `/api/minigames?user_id=${user.id}` : `/api/minigames`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        this.minigame = data.minigame;
        this.rewards = data.rewards || [];
        if (data.user) {
          this.store.setWalletBalance(data.user.balance);
          this.store.setLoyaltyPoints(data.user.points);
        }
        this.renderChancesTable();
        if (this.canvas) this.drawWheel();
      }
    } catch (err) {
      console.warn("[LUCKY WHEEL] Fetch data error:", err.message);
    }
  }

  drawWheel() {
    if (!this.canvas || !this.ctx || this.rewards.length === 0) return;
    const ctx = this.ctx;
    const size = this.canvas.width;
    const center = size / 2;
    const radius = center - 12;
    const numSlices = this.rewards.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, size, size);

    // Save context for entire wheel rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((this.currentRotation * Math.PI) / 180);

    // 1. Draw Slices
    for (let i = 0; i < numSlices; i++) {
      const reward = this.rewards[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Gradient Fill for Luxury Game Feel
      ctx.fillStyle = reward.color_hex || this.getDefaultColor(i);
      ctx.fill();

      // Slice Inner Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. Draw Slice Content (Icon & Text)
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      // Icon & Label Text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px 'Prompt', sans-serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      const label = reward.label || reward.reward_type;
      const icon = reward.icon || "";
      ctx.fillText(`${icon} ${label}`, radius - 20, 0);

      ctx.restore();
    }

    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#00F2FF";
    ctx.shadowColor = "#00F2FF";
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Light Bulb Dots on Outer Ring
    const numDots = 24;
    for (let d = 0; d < numDots; d++) {
      const dotAngle = (d * (2 * Math.PI)) / numDots;
      const dotX = Math.cos(dotAngle) * (radius + 2);
      const dotY = Math.sin(dotAngle) * (radius + 2);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = d % 2 === 0 ? "#FFE57F" : "#FFFFFF";
      ctx.fill();
    }

    ctx.restore();

    // 3. Center Hub (Static Pin / Button)
    ctx.save();
    ctx.translate(center, center);

    // Outer Hub Circle
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, 2 * Math.PI);
    ctx.fillStyle = "#0A0E17";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner Hub Circle
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 32);
    hubGrad.addColorStop(0, "#00F2FF");
    hubGrad.addColorStop(1, "#5865F2");
    ctx.fillStyle = hubGrad;
    ctx.fill();

    // Center Text
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 12px 'Orbitron', 'Prompt', sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;
    ctx.fillText("NYX9", 0, -2);
    ctx.font = "bold 8px 'Prompt', sans-serif";
    ctx.fillText("LUCKY", 0, 10);

    ctx.restore();

    // 4. Top Pointer Needle (Fixed at 12 o'clock / -90 deg)
    ctx.save();
    ctx.translate(center, 12);
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(14, -6);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fillStyle = "#FF0055";
    ctx.shadowColor = "#FF0055";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer Pivot Dot
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.restore();
  }

  getDefaultColor(index) {
    const colors = ["#5865F2", "#F59E0B", "#10B981", "#475569", "#EC4899", "#8B5CF6", "#3B82F6", "#334155"];
    return colors[index % colors.length];
  }

  renderChancesTable() {
    const container = document.getElementById("minigame-chances-list");
    if (!container || this.rewards.length === 0) return;

    container.innerHTML = this.rewards.map(r => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-colors">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-sm" style="background-color: ${r.color_hex}22; border: 1px solid ${r.color_hex}55; color: ${r.color_hex}">
            ${r.icon || "🎁"}
          </div>
          <div>
            <div class="text-xs font-bold text-white">${r.label}</div>
            <div class="text-[10px] text-slate-400 capitalize">${r.reward_type}</div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-mono font-bold text-cyan-400">${r.win_chance}%</span>
        </div>
      </div>
    `).join("");
  }

  bindEvents() {
    const spinMoneyBtn = document.getElementById("btn-wheel-spin-money");
    const spinPointsBtn = document.getElementById("btn-wheel-spin-points");

    if (spinMoneyBtn) {
      spinMoneyBtn.onclick = () => this.spin(false);
    }
    if (spinPointsBtn) {
      spinPointsBtn.onclick = () => this.spin(true);
    }
  }

  async spin(usePoints = false) {
    if (this.isSpinning) return;

    const user = this.store.get("user");
    if (!user || !user.id) {
      window.UI?.toast("กรุณาเข้าสู่ระบบก่อนหมุนวงล้อ", "warning");
      if (typeof window.openAuthModal === "function") {
        window.openAuthModal("login");
      }
      return;
    }

    const costPrice = parseFloat(this.minigame?.play_price || 15);
    const costPoints = parseInt(this.minigame?.play_points || 50, 10);
    const balance = this.store.get("walletBalance") || 0;
    const points = this.store.get("loyaltyPoints") || 0;

    if (usePoints) {
      if (points < costPoints) {
        window.UI?.toast(`แต้มไม่พอสำหรับการหมุน (ต้องการ ${costPoints} แต้ม / คุณมี ${points} แต้ม)`, "error");
        return;
      }
    } else {
      if (balance < costPrice) {
        window.UI?.toast(`ยอดเงินไม่พอสำหรับการหมุน (ต้องการ ฿${costPrice.toFixed(2)} / คุณมี ฿${balance.toFixed(2)})`, "error");
        if (typeof window.navigateToPage === "function") {
          window.navigateToPage("topup");
        }
        return;
      }
    }

    this.isSpinning = true;
    this.setSpinButtonsState(false);

    // เริ่มหมุนล่วงหน้าเพื่อให้รู้สึก Instant Response
    let animId;
    let speed = 25;
    const startSpinTime = Date.now();

    const fastSpin = () => {
      this.currentRotation = (this.currentRotation + speed) % 360;
      this.drawWheel();
      this.playTickSound();
      animId = requestAnimationFrame(fastSpin);
    };
    animId = requestAnimationFrame(fastSpin);

    try {
      const res = await fetch("/api/minigames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "spin",
          user_id: user.id,
          minigame_id: this.minigame?.id || 1,
          use_points: usePoints
        })
      });

      const outcome = await res.json();
      cancelAnimationFrame(animId);

      if (!outcome.success) {
        this.isSpinning = false;
        this.setSpinButtonsState(true);
        window.UI?.toast(outcome.message || "เกิดข้อผิดพลาดในการหมุนวงล้อ", "error");
        return;
      }

      // คำนวณมุมหยุดที่ถูกต้อง
      // เข็มชี้อยู่ที่มุม 12 นาฬิกา (-90 องศา หรือ 270 องศา)
      // Slice แต่ละชิ้นกว้าง = 360 / numSlices
      // Slice ที่ index ชนะอยู่ระหว่าง index * sliceDeg ถึง (index + 1) * sliceDeg
      const numSlices = this.rewards.length;
      const sliceDeg = 360 / numSlices;
      const targetIndex = outcome.reward_index;
      
      // กึ่งกลางของ slice ที่ชนะ (ในระบบพิกัดวงล้อเริ่มต้น)
      const sliceCenterDeg = targetIndex * sliceDeg + sliceDeg / 2;
      
      // เพื่อให้ sliceCenterDeg หมุนไปอยู่ตรงเข็มชี้ (270 องศา)
      // (currentRotation + sliceCenterDeg) % 360 = 270
      // currentRotation = 270 - sliceCenterDeg
      const targetAngleWithinCircle = (270 - sliceCenterDeg + 360) % 360;
      
      // หมุนอย่างน้อย 5-7 รอบเต็ม
      const extraSpins = 360 * 6;
      const currentMod = this.currentRotation % 360;
      let finalTarget = this.currentRotation + extraSpins + (targetAngleWithinCircle - currentMod);
      if (finalTarget < this.currentRotation + extraSpins) {
        finalTarget += 360;
      }

      // Smooth Deceleration Animation
      const duration = 4500; // 4.5 วินาที
      const startRot = this.currentRotation;
      const totalDelta = finalTarget - startRot;
      const startTime = performance.now();
      let lastTickAngle = startRot;

      const animateDecel = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // Easing: ease-out-cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        this.currentRotation = startRot + totalDelta * easeProgress;
        this.drawWheel();

        // เสียงกระดิกเมื่อข้าม Slice
        if (Math.abs(this.currentRotation - lastTickAngle) >= sliceDeg) {
          this.playTickSound();
          lastTickAngle = this.currentRotation;
        }

        if (progress < 1) {
          requestAnimationFrame(animateDecel);
        } else {
          this.currentRotation = finalTarget % 360;
          this.drawWheel();
          this.isSpinning = false;
          this.setSpinButtonsState(true);

          // อัปเดตยอดเงินและแต้มใน Store
          if (outcome.new_balance !== undefined) {
            this.store.setWalletBalance(outcome.new_balance);
          }
          if (outcome.new_points !== undefined) {
            this.store.setLoyaltyPoints(outcome.new_points);
          }

          // แสดงผลรางวัลและฉลอง
          this.showRewardResult(outcome);
        }
      };

      requestAnimationFrame(animateDecel);

    } catch (err) {
      cancelAnimationFrame(animId);
      this.isSpinning = false;
      this.setSpinButtonsState(true);
      window.UI?.toast(`การหมุนล้มเหลว: ${err.message}`, "error");
    }
  }

  setSpinButtonsState(enabled) {
    const b1 = document.getElementById("btn-wheel-spin-money");
    const b2 = document.getElementById("btn-wheel-spin-points");
    if (b1) b1.disabled = !enabled;
    if (b2) b2.disabled = !enabled;
  }

  showRewardResult(outcome) {
    const modal = document.getElementById("modal-wheel-result");
    if (!modal) return;

    const iconEl = document.getElementById("wheel-result-icon");
    const titleEl = document.getElementById("wheel-result-title");
    const descEl = document.getElementById("wheel-result-desc");
    const credBox = document.getElementById("wheel-result-cred-box");
    const credData = document.getElementById("wheel-result-cred-data");

    if (iconEl) iconEl.textContent = outcome.reward_icon || "🎁";
    if (titleEl) titleEl.textContent = outcome.reward_label || "ขอแสดงความยินดี!";

    let desc = "";
    if (outcome.reward_type === "money") {
      desc = `คุณได้รับเครดิตเข้ากระเป๋าเงินทันที ฿${outcome.reward?.amount || 0}!`;
      this.playWinFanfare();
      this.launchConfetti();
    } else if (outcome.reward_type === "points") {
      desc = `คุณได้รับ Loyalty Points สะสมเพิ่ม ${outcome.reward?.amount || 0} แต้ม!`;
      this.playWinFanfare();
      this.launchConfetti();
    } else if (outcome.reward_type === "vault") {
      desc = `แจ็กพอตแตก! คุณได้รับสินค้าพิเศษจัดส่งจากคลังทันที!`;
      this.playWinFanfare();
      this.launchConfetti();
    } else {
      desc = "ไม่เป็นไรนะ! ขอให้คุณโชคดีและได้รับรางวัลใหญ่ในการหมุนครั้งต่อไป 🍀";
    }

    if (descEl) descEl.textContent = desc;

    // ถ้ามีคีย์จากคลังให้แสดงกล่องคัดลอก
    if (outcome.reward?.credential_data && credBox && credData) {
      credBox.classList.remove("hidden");
      credData.value = outcome.reward.credential_data;
    } else if (credBox) {
      credBox.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  ensureResultModal() {
    if (document.getElementById("modal-wheel-result")) return;

    const modal = document.createElement("div");
    modal.id = "modal-wheel-result";
    modal.className = "fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md";
    modal.innerHTML = `
      <div class="relative w-full max-w-md rounded-3xl bg-[#0B0F19] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-500/20 text-center space-y-4">
        
        <!-- Canvas Confetti -->
        <canvas id="wheel-confetti-canvas" class="pointer-events-none absolute inset-0 w-full h-full z-10"></canvas>

        <div id="wheel-result-icon" class="text-6xl animate-bounce">🎁</div>
        <h3 id="wheel-result-title" class="text-2xl font-heading font-extrabold text-white">ยินดีด้วย!</h3>
        <p id="wheel-result-desc" class="text-xs text-slate-300 leading-relaxed"></p>

        <!-- Product Credential Copy Box (If Won Vault Product) -->
        <div id="wheel-result-cred-box" class="hidden text-left space-y-1.5 p-3 rounded-2xl bg-[#06080E] border border-cyan-500/40">
          <div class="text-[10px] text-cyan-400 font-mono font-bold flex items-center justify-between">
            <span>🔑 รหัสสินค้าของคุณ (พร้อมใช้งาน):</span>
            <span class="text-[9px] text-emerald-400">100% WORKING</span>
          </div>
          <div class="flex items-center gap-2">
            <input id="wheel-result-cred-data" type="text" readonly class="w-full bg-transparent text-xs font-mono text-white outline-none select-all font-bold" />
            <button onclick="window.copyWheelKey()" class="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#06080C] text-xs font-bold shrink-0 cursor-pointer transition-all">
              คัดลอก
            </button>
          </div>
        </div>

        <div class="pt-2">
          <button onclick="document.getElementById('modal-wheel-result').classList.add('hidden'); document.getElementById('modal-wheel-result').classList.remove('flex');" class="btn-cyber-primary w-full py-3 rounded-xl font-heading font-extrabold text-xs cursor-pointer shadow-lg shadow-cyan-500/25">
            หมุนอีกครั้ง / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    window.copyWheelKey = () => {
      const input = document.getElementById("wheel-result-cred-data");
      if (input) {
        navigator.clipboard.writeText(input.value);
        window.UI?.toast("คัดลอกรหัสสินค้าเรียบร้อยแล้ว!", "success");
      }
    };
  }

  launchConfetti() {
    const canvas = document.getElementById("wheel-confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const colors = ["#00F2FF", "#5865F2", "#F59E0B", "#10B981", "#EC4899", "#FFFFFF"];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 3,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.015;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frame++;
      if (frame < 80) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.LuckyWheelComponent = LuckyWheelComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = LuckyWheelComponent;
}
