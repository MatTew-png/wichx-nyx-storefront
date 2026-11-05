/**
 * ==============================================================================
 * 🌊 DYNAMIC AMBIENT CYBER WAVES & PARTICLE ENGINE v2.5 (HIGH-ACTION LIVING CANVAS)
 * High-action 60fps GPU-accelerated fluid wave canvas + floating cyber motes
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

    // Mouse Physics
    this.mouseX = 0;
    this.mouseY = 0;
    this.rawMouseX = -999;
    this.rawMouseY = -999;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.isRunning = false;

    // 55 Floating Cyber Particles
    this.particles = [];
    this.particleCount = 55;

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
    
    // Smooth mouse tracking
    window.addEventListener("mousemove", (e) => {
      this.rawMouseX = e.clientX;
      this.rawMouseY = e.clientY;
      this.targetMouseX = (e.clientX / this.width - 0.5) * 90;
      this.targetMouseY = (e.clientY / this.height - 0.5) * 60;
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
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.35 - Math.random() * 0.55,
        radius: 1.2 + Math.random() * 2.2,
        baseAlpha: 0.35 + Math.random() * 0.55,
        pulseSpeed: 0.025 + Math.random() * 0.04,
        pulsePhase: Math.random() * Math.PI * 2,
        isCyan: Math.random() > 0.3
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

    // Smooth mouse lerp
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.06;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.06;

    this.step += 0.014;
    this.pulseTime += 0.018;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Floating Cyber Aurora Pools (Ambient Glow Nebulas)
    this.drawNebulaGlows();

    // 2. Draw Layered Harmonic Waves with Luminous Crests
    // Layer 1: Deep Indigo Atmospheric Wave (Upper Atmosphere)
    this.renderWave({
      yBase: this.height * 0.20 - this.mouseY * 0.5,
      amplitude: 62,
      frequency: 0.0013,
      speed: -this.step * 0.75,
      phase: 0.4,
      gradientStart: "rgba(88, 101, 242, 0.20)",
      gradientEnd: "rgba(88, 101, 242, 0.00)",
      strokeColor: "rgba(99, 102, 241, 0.55)",
      lineWidth: 1.6
    });

    // Layer 2: Electric Cyan Hero Wave (Main Vibrant Ribbon)
    this.renderWave({
      yBase: this.height * 0.38 + this.mouseY * 0.9,
      amplitude: 54,
      frequency: 0.0018,
      speed: this.step * 1.15,
      phase: 0,
      gradientStart: "rgba(0, 242, 255, 0.25)",
      gradientEnd: "rgba(0, 242, 255, 0.00)",
      strokeColor: "rgba(0, 242, 255, 0.85)",
      lineWidth: 2.2,
      glowBlur: 16,
      glowColor: "rgba(0, 242, 255, 0.95)"
    });

    // Layer 3: Neon Mint / Teal Horizon Wave (Through Stats & Category Bar)
    this.renderWave({
      yBase: this.height * 0.56 - this.mouseY * 0.4,
      amplitude: 44,
      frequency: 0.0022,
      speed: this.step * 1.45,
      phase: Math.PI * 0.85,
      gradientStart: "rgba(0, 255, 200, 0.18)",
      gradientEnd: "rgba(0, 255, 200, 0.00)",
      strokeColor: "rgba(0, 255, 200, 0.65)",
      lineWidth: 1.6,
      glowBlur: 12,
      glowColor: "rgba(0, 255, 200, 0.8)"
    });

    // Layer 4: Lower Cyber Deep Blue Wave (Through Product Catalog)
    this.renderWave({
      yBase: this.height * 0.76 + this.mouseY * 0.6,
      amplitude: 48,
      frequency: 0.0016,
      speed: -this.step * 0.9,
      phase: Math.PI * 1.4,
      gradientStart: "rgba(0, 168, 255, 0.16)",
      gradientEnd: "rgba(0, 168, 255, 0.00)",
      strokeColor: "rgba(0, 168, 255, 0.55)",
      lineWidth: 1.5
    });

    // 3. Draw Floating Cyber Particles & Interactive Constellation
    this.drawParticles();
  }

  drawNebulaGlows() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Nebula 1: Top Center-Left Electric Cyan Pulse
    const n1X = w * 0.35 + Math.sin(this.pulseTime * 0.7) * 110;
    const n1Y = h * 0.22 + Math.cos(this.pulseTime * 0.5) * 60;
    const g1 = ctx.createRadialGradient(n1X, n1Y, 15, n1X, n1Y, 480);
    g1.addColorStop(0, "rgba(0, 242, 255, 0.22)");
    g1.addColorStop(0.4, "rgba(0, 242, 255, 0.08)");
    g1.addColorStop(1, "rgba(0, 242, 255, 0.00)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Nebula 2: Mid-Right Deep Indigo Pulse
    const n2X = w * 0.78 + Math.cos(this.pulseTime * 0.6) * 95;
    const n2Y = h * 0.45 + Math.sin(this.pulseTime * 0.8) * 75;
    const g2 = ctx.createRadialGradient(n2X, n2Y, 15, n2X, n2Y, 520);
    g2.addColorStop(0, "rgba(88, 101, 242, 0.18)");
    g2.addColorStop(0.4, "rgba(88, 101, 242, 0.06)");
    g2.addColorStop(1, "rgba(88, 101, 242, 0.00)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }

  renderWave(opts) {
    const { yBase, amplitude, frequency, speed, phase, gradientStart, gradientEnd, strokeColor, lineWidth, glowBlur, glowColor } = opts;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // 1. Path of the wave
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, yBase);

    const stepX = 18;
    const points = [];
    for (let x = 0; x <= w + stepX; x += stepX) {
      const angle = (x + this.mouseX * 1.5) * frequency + speed + phase;
      const y = yBase + Math.sin(angle) * amplitude + Math.cos(angle * 0.65) * (amplitude * 0.45);
      points.push({ x, y });
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    // Fill with smooth gradient
    const grad = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 3);
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, gradientEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Stroke the luminous wave crest
    if (strokeColor) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth || 1.5;

      if (glowBlur && glowColor) {
        ctx.shadowBlur = glowBlur;
        ctx.shadowColor = glowColor;
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Move particle
      p.x += p.vx;
      p.y += p.vy;

      // Mouse repulsion physics
      if (this.rawMouseX > 0 && this.rawMouseY > 0) {
        const dx = p.x - this.rawMouseX;
        const dy = p.y - this.rawMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130 && dist > 0) {
          const force = (130 - dist) / 130;
          p.x += (dx / dist) * force * 2.0;
          p.y += (dy / dist) * force * 2.0;
        }
      }

      // Wrap around edges
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      // Pulse alpha
      p.pulsePhase += p.pulseSpeed;
      const curAlpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(p.pulsePhase));

      // Draw particle mote
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.isCyan
        ? `rgba(0, 242, 255, ${curAlpha})`
        : `rgba(226, 232, 240, ${curAlpha * 0.9})`;

      ctx.shadowBlur = p.radius * 4;
      ctx.shadowColor = p.isCyan ? "rgba(0, 242, 255, 0.95)" : "rgba(255, 255, 255, 0.85)";
      ctx.fill();
      ctx.restore();

      // Draw connections between nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const cdx = p.x - p2.x;
        const cdy = p.y - p2.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

        if (cdist < 85) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          const lineAlpha = (1 - cdist / 85) * 0.22;
          ctx.strokeStyle = `rgba(0, 242, 255, ${lineAlpha})`;
          ctx.lineWidth = 0.85;
          ctx.stroke();
        }
      }
    }
  }

  drawStatic() {
    if (!this.ctx) return;
    this.step = 1;
    this.draw();
  }
}

window.AmbientWavesEngine = AmbientWavesEngine;
