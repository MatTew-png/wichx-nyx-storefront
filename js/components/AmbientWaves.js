/**
 * ==============================================================================
 * 🌊 SUBTLE AMBIENT ICE-VAPOR WAVES ENGINE v3.0 (DEEP ATMOSPHERIC SILK)
 * Ultra-subtle, non-distracting 60fps background waves tuned for high product contrast
 * ==============================================================================
 */

class AmbientWavesEngine {
  constructor(canvasId = "ambient-cyber-canvas") {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.width = 0;
    this.height = 0;
    this.step = 0;
    this.pulseTime = 0;

    // Mouse Physics (Ultra-damped)
    this.mouseX = 0;
    this.mouseY = 0;
    this.rawMouseX = -999;
    this.rawMouseY = -999;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.isRunning = false;

    // 20 Subtle Ambient Motes (Whisper quiet)
    this.particles = [];
    this.particleCount = 20;

    // Respect reduced motion
    this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.init();
  }

  init() {
    if (typeof document === "undefined") return;

    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = this.canvasId;
      this.canvas.className = "fixed inset-0 pointer-events-none z-0 w-full h-full";
      this.canvas.style.opacity = "1";
      document.body.prepend(this.canvas);
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.resize();
    this.initParticles();

    window.addEventListener("resize", () => {
      this.resize();
      this.initParticles();
    }, { passive: true });
    
    // Smooth, gentle mouse parallax
    window.addEventListener("mousemove", (e) => {
      this.rawMouseX = e.clientX;
      this.rawMouseY = e.clientY;
      this.targetMouseX = (e.clientX / this.width - 0.5) * 40;
      this.targetMouseY = (e.clientY / this.height - 0.5) * 30;
    }, { passive: true });

    // Battery / Background Tab Saver
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });

    if (!this.prefersReducedMotion) {
      this.start();
    } else {
      this.drawStatic();
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * (this.width || 1200),
        y: Math.random() * (this.height || 800),
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.2 - Math.random() * 0.3,
        radius: 0.9 + Math.random() * 1.3,
        baseAlpha: 0.12 + Math.random() * 0.18,
        pulseSpeed: 0.015 + Math.random() * 0.025,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  resize() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const render = () => {
      if (!this.isRunning) return;
      this.draw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  draw() {
    if (!this.ctx || !this.width || !this.height) return;

    // Ultra-smooth mouse lerp
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    this.step += 0.007;
    this.pulseTime += 0.009;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Subtle Ambient Nebula pools (Very faint soft glow)
    this.drawSubtleGlows();

    // 2. Layered Faint Waves (Atmospheric Silk - No loud neon strokes)
    // Wave 1: Deep Twilight Sapphire (Upper Hero Zone)
    this.renderWave({
      yBase: this.height * 0.25 - this.mouseY * 0.4,
      amplitude: 38,
      frequency: 0.0011,
      speed: -this.step * 0.6,
      phase: 0.3,
      gradientStart: "rgba(15, 38, 80, 0.07)",
      gradientEnd: "rgba(15, 38, 80, 0.00)"
    });

    // Wave 2: Soft Ice Blue Silk (Matches Logo crystal accents)
    this.renderWave({
      yBase: this.height * 0.42 + this.mouseY * 0.5,
      amplitude: 32,
      frequency: 0.0015,
      speed: this.step * 0.75,
      phase: 0,
      gradientStart: "rgba(0, 163, 255, 0.055)",
      gradientEnd: "rgba(0, 163, 255, 0.00)",
      hairlineStroke: "rgba(56, 189, 248, 0.08)"
    });

    // Wave 3: Deep Slate Horizon (Flowing under Stats)
    this.renderWave({
      yBase: this.height * 0.65 - this.mouseY * 0.3,
      amplitude: 28,
      frequency: 0.0017,
      speed: this.step * 0.85,
      phase: Math.PI * 0.7,
      gradientStart: "rgba(30, 41, 59, 0.06)",
      gradientEnd: "rgba(30, 41, 59, 0.00)"
    });

    // Wave 4: Deep Abyss Vapor (Catalog Lower Bed)
    this.renderWave({
      yBase: this.height * 0.85 + this.mouseY * 0.3,
      amplitude: 34,
      frequency: 0.0013,
      speed: -this.step * 0.65,
      phase: Math.PI * 1.3,
      gradientStart: "rgba(2, 132, 199, 0.045)",
      gradientEnd: "rgba(2, 132, 199, 0.00)"
    });

    // 3. Draw Quiet Stardust Motes
    this.drawQuietParticles();
  }

  drawSubtleGlows() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Faint Ice Blue Pool (Top Left)
    const n1X = w * 0.3 + Math.sin(this.pulseTime * 0.6) * 70;
    const n1Y = h * 0.2 + Math.cos(this.pulseTime * 0.4) * 40;
    const g1 = ctx.createRadialGradient(n1X, n1Y, 20, n1X, n1Y, 460);
    g1.addColorStop(0, "rgba(0, 163, 255, 0.06)");
    g1.addColorStop(0.5, "rgba(0, 163, 255, 0.015)");
    g1.addColorStop(1, "rgba(0, 163, 255, 0.00)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Faint Deep Indigo Pool (Mid Right)
    const n2X = w * 0.75 + Math.cos(this.pulseTime * 0.5) * 60;
    const n2Y = h * 0.45 + Math.sin(this.pulseTime * 0.7) * 50;
    const g2 = ctx.createRadialGradient(n2X, n2Y, 20, n2X, n2Y, 480);
    g2.addColorStop(0, "rgba(30, 58, 138, 0.05)");
    g2.addColorStop(0.5, "rgba(30, 58, 138, 0.01)");
    g2.addColorStop(1, "rgba(30, 58, 138, 0.00)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }

  renderWave(opts) {
    const { yBase, amplitude, frequency, speed, phase, gradientStart, gradientEnd, hairlineStroke } = opts;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, yBase);

    const stepX = 22;
    const points = [];
    for (let x = 0; x <= w + stepX; x += stepX) {
      const angle = (x + this.mouseX * 1.2) * frequency + speed + phase;
      const y = yBase + Math.sin(angle) * amplitude + Math.cos(angle * 0.6) * (amplitude * 0.35);
      points.push({ x, y });
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 3);
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, gradientEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    // Soft whisper-thin hairline crest (if specified, with low opacity)
    if (hairlineStroke) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.strokeStyle = hairlineStroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawQuietParticles() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      p.pulsePhase += p.pulseSpeed;
      const curAlpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(p.pulsePhase));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(186, 230, 253, ${curAlpha})`;
      ctx.fill();
    }
  }

  drawStatic() {
    if (!this.ctx) return;
    this.step = 1;
    this.draw();
  }
}

window.AmbientWavesEngine = AmbientWavesEngine;
