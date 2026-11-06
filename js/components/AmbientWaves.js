/**
 * ==============================================================================
 * 🌊 SUBTLE AMBIENT SILK WAVES ENGINE v4.0 (LINEAR DARK EDITORIAL)
 * Ultra-subtle, non-distracting 60fps atmospheric waves tuned for maximum contrast
 * (Zero comet/particle distractions, pure calm silk waves)
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

    // Mouse Physics (Ultra-damped gentle wave parallax)
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.isRunning = false;
    this.isScrolling = false;
    this.scrollTimeout = null;

    // Detect mobile or low-power device
    this.isMobile = typeof window !== "undefined" && (window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024));
    this.prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    // On mobile or reduced motion: Draw static once, zero continuous GPU load!
    if (this.isMobile || this.prefersReducedMotion) {
      this.drawStatic();
      window.addEventListener("resize", () => {
        this.resize();
        this.drawStatic();
      }, { passive: true });
      return;
    }

    window.addEventListener("resize", () => {
      this.resize();
    }, { passive: true });
    
    // Smooth mouse parallax (Gentle and restrained)
    window.addEventListener("mousemove", (e) => {
      this.targetMouseX = (e.clientX / (this.width || 1) - 0.5) * 20;
      this.targetMouseY = (e.clientY / (this.height || 1) - 0.5) * 15;
    }, { passive: true });

    // Scroll performance protector: Pause canvas redrawing during rapid scroll
    window.addEventListener("scroll", () => {
      this.isScrolling = true;
      if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 120);
    }, { passive: true });

    // Battery / Background Tab Saver
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });

    this.start();
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  start() {
    if (this.isRunning || this.isMobile) return;
    this.isRunning = true;

    const render = () => {
      if (!this.isRunning) return;

      // Don't render frames if user is fast-scrolling to prioritize DOM scroll smoothness
      if (!this.isScrolling) {
        this.draw();
      }

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

    // Smooth lerp mouse physics
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.step += 0.006;
    this.pulseTime += 0.008;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Subtle Ambient Nebula pools (Faint Linear Slate-Indigo glow)
    this.drawSubtleGlows();

    // 2. Layered Faint Waves (Atmospheric Silk - Pure smooth motion, zero particles)
    // Wave 1: Deep Twilight Slate (Upper Hero Zone)
    this.renderWave({
      yBase: this.height * 0.25 - this.mouseY * 0.3,
      amplitude: 36,
      frequency: 0.0011,
      speed: -this.step * 0.55,
      phase: 0.3,
      gradientStart: "rgba(20, 24, 40, 0.07)",
      gradientEnd: "rgba(20, 24, 40, 0.00)"
    });

    // Wave 2: Soft Electric Indigo Silk (Linear Brand Accent)
    this.renderWave({
      yBase: this.height * 0.42 + this.mouseY * 0.4,
      amplitude: 30,
      frequency: 0.0014,
      speed: this.step * 0.7,
      phase: 0,
      gradientStart: "rgba(99, 102, 241, 0.045)",
      gradientEnd: "rgba(99, 102, 241, 0.00)",
      hairlineStroke: "rgba(99, 102, 241, 0.07)"
    });

    // Wave 3: Deep Slate Horizon (Flowing under Stats)
    this.renderWave({
      yBase: this.height * 0.65 - this.mouseY * 0.25,
      amplitude: 26,
      frequency: 0.0016,
      speed: this.step * 0.8,
      phase: Math.PI * 0.7,
      gradientStart: "rgba(30, 27, 75, 0.05)",
      gradientEnd: "rgba(30, 27, 75, 0.00)"
    });

    // Wave 4: Deep Abyss Vapor (Catalog Lower Bed)
    this.renderWave({
      yBase: this.height * 0.85 + this.mouseY * 0.25,
      amplitude: 32,
      frequency: 0.0012,
      speed: -this.step * 0.6,
      phase: Math.PI * 1.3,
      gradientStart: "rgba(15, 23, 42, 0.04)",
      gradientEnd: "rgba(15, 23, 42, 0.00)"
    });
  }

  drawSubtleGlows() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Faint Electric Indigo Pool (Top Left) - Bounded draw area
    const n1X = w * 0.3 + Math.sin(this.pulseTime * 0.6) * 45;
    const n1Y = h * 0.2 + Math.cos(this.pulseTime * 0.4) * 25;
    const g1 = ctx.createRadialGradient(n1X, n1Y, 20, n1X, n1Y, 380);
    g1.addColorStop(0, "rgba(99, 102, 241, 0.04)");
    g1.addColorStop(0.6, "rgba(99, 102, 241, 0.008)");
    g1.addColorStop(1, "rgba(99, 102, 241, 0.00)");
    ctx.fillStyle = g1;
    ctx.fillRect(Math.max(0, n1X - 380), Math.max(0, n1Y - 380), Math.min(w, 760), Math.min(h, 760));

    // Faint Violet Slate Pool (Mid Right) - Bounded draw area
    const n2X = w * 0.75 + Math.cos(this.pulseTime * 0.5) * 45;
    const n2Y = h * 0.45 + Math.sin(this.pulseTime * 0.7) * 35;
    const g2 = ctx.createRadialGradient(n2X, n2Y, 20, n2X, n2Y, 400);
    g2.addColorStop(0, "rgba(79, 70, 229, 0.03)");
    g2.addColorStop(0.6, "rgba(79, 70, 229, 0.006)");
    g2.addColorStop(1, "rgba(79, 70, 229, 0.00)");
    ctx.fillStyle = g2;
    ctx.fillRect(Math.max(0, n2X - 400), Math.max(0, n2Y - 400), Math.min(w, 800), Math.min(h, 800));
  }

  renderWave(options) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const { yBase, amplitude, frequency, speed, phase, gradientStart, gradientEnd, hairlineStroke } = options;

    ctx.beginPath();
    ctx.moveTo(0, h);

    // Dynamic horizontal sampling interval (30px on desktop = ~40-60 points total, very cheap)
    const stepX = 30;

    for (let x = 0; x <= w + stepX; x += stepX) {
      // 2 Harmonic waves combined for organic liquid curvature
      const harmonic1 = Math.sin(x * frequency + speed + phase);
      const harmonic2 = Math.cos(x * (frequency * 1.6) - speed * 0.7 + phase * 1.5) * 0.35;
      const y = yBase + (harmonic1 + harmonic2) * amplitude;
      
      if (x === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    // Vertical atmospheric gradient
    const grad = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 3.5);
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, gradientEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle edge highlight hairline
    if (hairlineStroke) {
      ctx.beginPath();
      for (let x = 0; x <= w + stepX; x += stepX) {
        const harmonic1 = Math.sin(x * frequency + speed + phase);
        const harmonic2 = Math.cos(x * (frequency * 1.6) - speed * 0.7 + phase * 1.5) * 0.35;
        const y = yBase + (harmonic1 + harmonic2) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hairlineStroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawStatic() {
    if (!this.ctx) return;
    this.step = 1;
    this.draw();
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.AmbientWavesEngine = AmbientWavesEngine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AmbientWavesEngine;
}
