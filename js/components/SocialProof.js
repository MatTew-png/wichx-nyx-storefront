/**
 * ==============================================================================
 * 🔔 SOCIAL PROOF FEED COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 */

class SocialProofComponent {
  constructor() {
    this.timer = null;
    this.feedIndex = 0;
    this.mockFeed = [];
  }

  init() {
    // Intentionally disabled: unslop policy eliminates fake purchase ticker
    const box = document.getElementById("social-proof-toast");
    if (box) {
      box.style.display = "none";
    }
  }

  showNext() {
    // Intentionally disabled: no fake FOMO toasts
  }
}

if (typeof window !== "undefined") {
  window.SocialProofComponent = SocialProofComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SocialProofComponent;
}
