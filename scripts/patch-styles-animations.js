const fs = require('fs');

const cssPath = 'styles.css';
let css = fs.readFileSync(cssPath, 'utf8');

const target = `/* Drawer Transitions */
.drawer-backdrop {
  transition: opacity 0.3s ease;
}
.drawer-content {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Modal Overlay */
.modal-overlay {
  background: rgba(4, 6, 10, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Tactile Product Card & Physical Response */
.product-card {
  position: relative;
  background-color: var(--card-bg, #0C111A);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  overflow: hidden;
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease, box-shadow 180ms ease;
}
.product-card:hover {
  border-color: rgba(0, 242, 255, 0.45);
  transform: translateY(-3px);
  box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.75), 0 0 24px -6px rgba(0, 242, 255, 0.22);
}
.product-card:active {
  transform: scale(0.99) translateY(-1px);
}`;

const replacement = `/* Drawer Transitions with Natural Deceleration */
.drawer-backdrop {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-content {
  transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.38s ease;
  will-change: transform;
}

/* ==============================================================================
   PHYSICAL SPRING MODAL ANIMATIONS (Apple & Emil Kowalski Fluid Physics)
   ============================================================================== */
@keyframes modalOverlayFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
}

@keyframes modalSpringBounceIn {
  0% {
    opacity: 0;
    transform: scale(0.86) translateY(24px);
  }
  50% {
    opacity: 1;
    transform: scale(1.025) translateY(-3px);
  }
  75% {
    transform: scale(0.99) translateY(1.5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Modal Overlay with Blur Fade-In */
.modal-overlay {
  background: rgba(4, 7, 12, 0.84);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  animation: modalOverlayFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Physical Spring Dialog Card */
.modal-spring-dialog {
  animation: modalSpringBounceIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: transform, opacity;
  transform-origin: center center;
}

/* Cart Button Pop & Jiggle on Add */
@keyframes cartBouncePop {
  0% { transform: scale(1); }
  25% { transform: scale(1.28) rotate(-7deg); }
  50% { transform: scale(0.92) rotate(4deg); }
  75% { transform: scale(1.06) rotate(-2deg); }
  100% { transform: scale(1) rotate(0); }
}

.animate-cart-pop {
  animation: cartBouncePop 0.48s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* Tactile Product Card & Physical Response with Cursor Spotlight */
.product-card {
  position: relative;
  background-color: var(--card-bg, #0C111A);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  overflow: hidden;
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease, box-shadow 220ms ease;
  will-change: transform;
}
.product-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(350px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(0, 242, 255, 0.12), transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
}
.product-card:hover {
  border-color: rgba(0, 242, 255, 0.45);
  transform: translateY(-4px);
  box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.75), 0 0 24px -6px rgba(0, 242, 255, 0.22);
}
.product-card:hover::after {
  opacity: 1;
}
.product-card:active {
  transform: scale(0.985) translateY(-1px);
}

/* Primary Button Light Beam Shimmer */
@keyframes buttonShimmer {
  0% {
    left: -100%;
  }
  20%, 100% {
    left: 200%;
  }
}

.btn-shimmer {
  position: relative;
  overflow: hidden;
}
.btn-shimmer::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: skewX(-20deg);
  animation: buttonShimmer 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  pointer-events: none;
}`;

// Normalize CRLF to LF for matching then restore
const normalizedCss = css.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');
const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

if (normalizedCss.includes(normalizedTarget)) {
  const result = normalizedCss.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync(cssPath, result.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ styles.css patched with animations successfully!');
} else {
  console.error('❌ Target not found in styles.css');
  process.exit(1);
}
