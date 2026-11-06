/**
 * ==============================================================================
 * ✨ JULIAN FELLA SIGNATURE MOTION ENGINE v1.0
 * Inspired by Julian Fella (Award-Winning GSAP Site of the Day / CSSDA)
 * Smooth, editorial, masked line reveals, expanding hairlines, and cascading staggers
 * ==============================================================================
 */

class JulianMotionEngine {
  constructor() {
    this.hasGSAP = typeof window !== "undefined" && !!window.gsap;
    this.hasScrollTrigger = typeof window !== "undefined" && !!window.ScrollTrigger;
    this.registeredSections = new WeakSet();
    this.init();
  }

  init() {
    if (this.hasGSAP && this.hasScrollTrigger) {
      try {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.gsap.config({ force3D: true });
      } catch (e) {
        console.warn("[JulianMotion] GSAP register notice:", e);
      }
    }

    // Attach to DOM ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupGlobalTriggers());
    } else {
      setTimeout(() => this.setupGlobalTriggers(), 100);
    }
  }

  setupGlobalTriggers() {
    if (!this.hasGSAP || !window.ScrollTrigger) {
      this.setupIntersectionFallback();
      return;
    }

    const sections = document.querySelectorAll(`
      #hero-section,
      #category-filter-bar,
      #catalog-container,
      .pro-stats-banner,
      #view-home > div,
      footer
    `);

    sections.forEach(sec => {
      if (this.registeredSections.has(sec)) return;
      this.registeredSections.add(sec);

      window.ScrollTrigger.create({
        trigger: sec,
        start: "top 88%",
        once: true,
        onEnter: () => this.animateSection(sec)
      });
    });
  }

  /**
   * Signature Julian Fella Reveal Sequence
   * 1. Masked title unmasking from bottom (clip-path polygon)
   * 2. Center-expanding horizontal hairlines
   * 3. Slow-burn cascading cards / items with power3.out
   * 4. Animated numeric counter roll-ups
   */
  animateSection(container) {
    if (!container) return;

    if (window.gsap) {
      const titles = container.querySelectorAll("h1, h2, h3, .julian-title, [data-animate='headline']");
      const dividers = container.querySelectorAll("hr, .divider, .julian-divider, [data-animate='divider']");
      const cards = container.querySelectorAll(".product-card-item, .julian-item, .topup-preset-btn, .faq-item, .order-history-row");
      const counters = container.querySelectorAll("[data-counter], .julian-counter");

      const tl = window.gsap.timeline({
        defaults: { ease: "power3.out" }
      });

      // 1. Titles unmask from bottom with clip-path
      if (titles.length > 0) {
        tl.fromTo(titles,
          {
            y: 32,
            opacity: 0,
            clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)"
          },
          {
            y: 0,
            opacity: 1,
            clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0 100%)",
            duration: 1.05,
            stagger: 0.08
          }
        );
      }

      // 2. Horizontal dividers expand outward from center (Julian Fella hairline)
      if (dividers.length > 0) {
        tl.fromTo(dividers,
          {
            scaleX: 0,
            transformOrigin: "50% 50%",
            opacity: 0
          },
          {
            scaleX: 1,
            opacity: 1,
            duration: 1.3,
            ease: "expo.out"
          },
          "<0.1"
        );
      }

      // 3. Child elements / cards glide up in slow-burn domino cascade
      if (cards.length > 0) {
        tl.fromTo(cards,
          {
            y: 35,
            opacity: 0
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.045,
            ease: "power3.out"
          },
          "<0.15"
        );
      }

      // 4. Numeric roll-ups
      if (counters.length > 0) {
        counters.forEach(cnt => this.animateCounter(cnt));
      }

      return tl;
    } else {
      // CSS Fallback
      container.classList.add("julian-revealed");
    }
  }

  /**
   * Animate catalog product grid when category filter changes
   */
  animateCatalogGrid(container) {
    const target = container || document.getElementById("catalog-container");
    if (!target) return;

    if (window.gsap) {
      const cards = target.querySelectorAll(".rounded-2xl, .group");
      if (cards.length === 0) return;

      window.gsap.fromTo(cards,
        {
          y: 28,
          opacity: 0,
          scale: 0.97
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.85,
          stagger: 0.04,
          ease: "power3.out",
          overwrite: "auto"
        }
      );
    }
  }

  /**
   * Called during SPA page view routing (e.g. /topup, /history, /claim, /faq)
   * Gives dedicated pages the luxurious award-winning agency entrance
   */
  animateView(viewEl) {
    if (!viewEl) return;
    window.scrollTo({ top: 0, behavior: "instant" });

    if (window.gsap) {
      window.gsap.killTweensOf(viewEl.querySelectorAll("*"));
      
      const header = viewEl.querySelector(".border-b, h1, h2");
      const contents = viewEl.querySelectorAll(".rounded-2xl, .rounded-3xl, form, table, .space-y-4 > div");

      const tl = window.gsap.timeline({ defaults: { ease: "power3.out" } });

      if (header) {
        tl.fromTo(header,
          { y: -15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 }
        );
      }

      if (contents.length > 0) {
        tl.fromTo(contents,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.05, ease: "power3.out" },
          "<0.1"
        );
      }
    }
  }

  /**
   * Numeric counter rollup helper
   */
  animateCounter(el) {
    if (!el) return;
    const rawText = el.getAttribute("data-counter") || el.textContent || "0";
    const num = parseFloat(rawText.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return;

    const prefix = rawText.match(/^[^\d]*/)?.[0] || "";
    const suffix = rawText.match(/[^\d]*$/)?.[0] || "";

    const obj = { val: 0 };
    if (window.gsap) {
      window.gsap.to(obj, {
        val: num,
        duration: 1.8,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = `${prefix}${Math.floor(obj.val).toLocaleString()}${suffix}`;
        }
      });
    }
  }

  setupIntersectionFallback() {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("julian-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll("section, .julian-section").forEach(el => observer.observe(el));
  }
}

// Global initialization
if (typeof window !== "undefined") {
  window.JulianMotion = new JulianMotionEngine();
}
