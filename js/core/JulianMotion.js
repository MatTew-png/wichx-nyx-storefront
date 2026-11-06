/**
 * ==============================================================================
 * ✨ JULIAN FELLA SIGNATURE MOTION ENGINE v1.0
 * Inspired by Julian Fella (Award-Winning GSAP Site of the Day / CSSDA)
 * Smooth, editorial, masked line reveals, expanding hairlines, and cascading staggers
 * Direction-Aware Liquid SVG Bezier Wave Hover Animation
 * ==============================================================================
 */

// Julian Fella exact SVG quadratic bezier paths (viewBox="0 0 100 100")
const JULIAN_SVG_PATHS = {
  top: {
    startIn: "M 0 100 V 0 Q 50 0 100 0 V 0 H 0 z",
    endIn: "M 0 100 V 100 Q 50 125 100 100 V 0 H 0 z",
    startOut: "M 0 100 V 100 Q 50 50 100 100 V 0 H 0 z",
    endOut: "M 0 100 V 0 Q 50 0 100 0 V 0 H 0 z"
  },
  bottom: {
    startIn: "M 0 100 V 100 Q 75 50 100 100 V 100 z",
    endIn: "M 0 100 V 0 Q 50 0 100 0 V 100 z",
    startOut: "M 0 100 V 0 Q 50 50 100 0 V 100 z",
    endOut: "M 0 100 V 100 Q 50 100 100 100 V 100 z"
  },
  left: {
    startIn: "M 0 0 H 0 Q 0 50 0 100 H 0 V 0 z",
    endIn: "M 0 0 H 100 Q 110 50 100 100 H 0 V 0 z",
    startOut: "M 0 0 H 100 Q 75 50 100 100 H 0 V 0 z",
    endOut: "M 0 0 H 0 Q 0 50 0 100 H 0 V 0 z"
  },
  right: {
    startIn: "M 100 0 H 100 Q 100 50 100 100 H 100 V 0 z",
    endIn: "M 100 0 H 0 Q -10 50 0 100 H 100 V 0 z",
    startOut: "M 100 0 H 0 Q 25 50 0 100 H 100 V 0 z",
    endOut: "M 100 0 H 100 Q 100 50 100 100 H 100 V 0 z"
  }
};

function getJulianMouseEnterDirection(event, element) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  const distTop = Math.abs(rect.top - y);
  const distBottom = Math.abs(rect.bottom - y);
  const distLeft = Math.abs(rect.left - x);
  const distRight = Math.abs(rect.right - x);
  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distLeft) return "left";
  if (minDist === distRight) return "right";
  if (minDist === distTop) return "top";
  return "bottom";
}

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
      document.addEventListener("DOMContentLoaded", () => {
        this.setupGlobalTriggers();
        this.initLiquidWaveHover();
      });
    } else {
      setTimeout(() => {
        this.setupGlobalTriggers();
        this.initLiquidWaveHover();
      }, 100);
    }
  }

  setupGlobalTriggers() {
    this.initLiquidWaveHover();

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
   * Animate catalog product grid when category filter changes (High-Speed Crisp Transition)
   */
  animateCatalogGrid(container) {
    const target = container || document.getElementById("catalog-container");
    if (!target) return;

    if (window.gsap) {
      // Specifically target product cards only to avoid double-animating child containers
      const cards = target.querySelectorAll(".product-card");
      if (cards.length === 0) return;

      window.gsap.killTweensOf(cards);
      window.gsap.fromTo(cards,
        {
          y: 8,
          opacity: 0.35
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.22,
          stagger: { amount: 0.12, from: "start" },
          ease: "power2.out",
          overwrite: "auto"
        }
      );
    }
  }

  /**
   * Called during SPA page view routing (e.g. /topup, /history, /claim, /faq)
   * Gives dedicated pages the luxurious award-winning agency entrance with zero layout shift
   */
  animateView(viewEl) {
    // #view-home has its own ScrollTriggers; never blank it out with opacity:0
    if (!viewEl || viewEl.id === "view-home") return;

    // Instant top scroll synchronously before animation to prevent position warping
    window.scrollTo({ top: 0, behavior: "instant" });

    if (window.gsap) {
      window.gsap.killTweensOf(viewEl.querySelectorAll("*"));
      
      const header = viewEl.querySelector(".border-b, h1, h2");
      // Select top-level content cards, details accordions, forms, or direct blocks only
      const contents = viewEl.querySelectorAll("details, form, table, .grid > div, .space-y-3\\.5 > details, .space-y-4 > div");

      const tl = window.gsap.timeline({ defaults: { ease: "power2.out" } });

      if (header) {
        tl.fromTo(header,
          { y: -6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.22 }
        );
      }

      const items = contents.length > 0 ? contents : viewEl.children;
      if (items.length > 0) {
        tl.fromTo(items,
          { y: 10, opacity: 0.2 },
          { y: 0, opacity: 1, duration: 0.28, stagger: { amount: 0.12 } },
          "<0.04"
        );
      }
    }

    // Attach liquid wave hover on newly animated view elements
    this.initLiquidWaveHover(viewEl);
  }

  /**
   * Signature Julian Fella Direction-Aware Liquid Wave Morphing Hover
   * Extracted from julianfella.de/contact
   * Uses SVG quadratic bezier morphing & GSAP power3.out easing
   */
  initLiquidWaveHover(root = document) {
    if (typeof window === "undefined") return;
    const targetRoot = root || document;

    const cards = targetRoot.querySelectorAll(".julian-liquid-hover, [data-julian-wave]");
    if (!cards || cards.length === 0) return;

    cards.forEach(card => {
      if (card._julianLiquidInitialized) return;
      card._julianLiquidInitialized = true;

      // Ensure SVG liquid wave element exists
      let svg = card.querySelector(".julian-liquid-svg");
      let path = card.querySelector(".julian-liquid-path");

      if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("class", "julian-liquid-svg");
        svg.setAttribute("aria-hidden", "true");

        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M 0 100 V 0 Q 0 50 0 100 V 0 H 0 z");
        const fillColor = card.getAttribute("data-wave-color") || "#FFFFFF";
        path.setAttribute("fill", fillColor);
        path.setAttribute("class", "julian-liquid-path");

        svg.appendChild(path);
        card.appendChild(svg);
      } else if (!path) {
        path = svg.querySelector("path");
      }

      const inner = card.querySelector(".julian-liquid-inner, [data-animate='form-alternate-item-inner']");
      const arrow = card.querySelector(".julian-arrow, [data-animate='arrow']");

      let pathTween = null;
      let innerTween = null;
      let arrowTween = null;

      card.addEventListener("mouseenter", (e) => {
        if (!window.gsap) return;
        const dir = getJulianMouseEnterDirection(e, card);
        const p = JULIAN_SVG_PATHS[dir] || JULIAN_SVG_PATHS.top;

        if (pathTween) pathTween.kill();
        pathTween = window.gsap.fromTo(path,
          { attr: { d: p.startIn } },
          { attr: { d: p.endIn }, duration: 0.5, ease: "power3.out", overwrite: "auto" }
        );

        if (inner) {
          if (innerTween) innerTween.kill();
          innerTween = window.gsap.to(inner, {
            paddingLeft: "0.6rem",
            paddingRight: "0.6rem",
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }

        if (arrow) {
          if (arrowTween) arrowTween.kill();
          arrowTween = window.gsap.to(arrow, {
            rotate: -45,
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }
      });

      card.addEventListener("mouseleave", (e) => {
        if (!window.gsap) return;
        const dir = getJulianMouseEnterDirection(e, card);
        const p = JULIAN_SVG_PATHS[dir] || JULIAN_SVG_PATHS.top;

        if (pathTween) pathTween.kill();
        pathTween = window.gsap.fromTo(path,
          { attr: { d: p.startOut } },
          { attr: { d: p.endOut }, duration: 0.5, ease: "power3.out", overwrite: "auto" }
        );

        if (inner) {
          if (innerTween) innerTween.kill();
          innerTween = window.gsap.to(inner, {
            paddingLeft: "0rem",
            paddingRight: "0rem",
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }

        if (arrow) {
          if (arrowTween) arrowTween.kill();
          arrowTween = window.gsap.to(arrow, {
            rotate: 0,
            duration: 0.45,
            ease: "power3.inOut",
            overwrite: "auto"
          });
        }
      });
    });
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
