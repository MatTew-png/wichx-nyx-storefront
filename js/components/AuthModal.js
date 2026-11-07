/**
 * ==============================================================================
 * 🔐 NYX9 STUDIO — MULTI-PROVIDER AUTH MODAL COMPONENT (OOP CONTROLLER)
 * ==============================================================================
 * หน้าต่างเข้าสู่ระบบแบบรวมศูนย์ (Unified Multi-Auth Modal):
 * - Discord 1-Click OAuth2
 * - Google 1-Click OAuth2
 * - GitHub 1-Click OAuth2
 * - Email & Password (Login / Register / Forgot Password)
 * - Email Magic Link (OTP)
 * ==============================================================================
 */

class AuthModalComponent {
  constructor(store, authService) {
    this.store = store;
    this.authService = authService;
    this.currentMode = "signin"; // 'signin', 'signup', 'magiclink'
    this.initDOM();
  }

  initDOM() {
    if (typeof document === "undefined") return;
    if (document.getElementById("auth-modal")) return;

    const modal = document.createElement("div");
    modal.id = "auth-modal";
    modal.className = "fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-black/85 backdrop-blur-md";
    modal.innerHTML = `
      <div class="relative z-10 modal-spring-dialog glass-panel rounded-3xl max-w-md w-full p-6 sm:p-8 border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(25,186,255,0.15)] overflow-hidden">
        
        <!-- Ambient Radial Glow -->
        <div class="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-bl from-[var(--accent)]/15 via-[#5865F2]/10 to-transparent blur-3xl pointer-events-none rounded-full"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-5 relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5865F2]/20 via-sky-500/20 to-[var(--accent)]/20 border border-white/15 text-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/10">
              <i data-lucide="shield-check" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-base font-bold font-heading text-white tracking-wide">เข้าสู่ระบบ / บัญชีผู้ใช้</h3>
              <p class="text-[11px] text-slate-400">เลือกช่องทางเพื่อสะสมยอดกระเป๋าเงินและดูประวัติคีย์</p>
            </div>
          </div>
          <button onclick="window.closeAuthModal()" class="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- SECTION 1: 1-CLICK SOCIAL OAUTH BUTTONS -->
        <div class="space-y-2.5 relative z-10 mb-5">
          <!-- 1. DISCORD OAUTH BUTTON -->
          <button type="button" onclick="window.loginWithDiscord()" class="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold font-heading flex items-center justify-center gap-2.5 transition-all shadow-md shadow-[#5865F2]/25 cursor-pointer active:scale-95 group">
            <svg class="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.288a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย Discord (แนะนำ)</span>
          </button>

          <!-- 2. GOOGLE OAUTH BUTTON -->
          <button type="button" onclick="window.loginWithGoogle()" class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold font-heading flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer active:scale-95 group">
            <svg class="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.34 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>

          <!-- 3. GITHUB OAUTH BUTTON -->
          <button type="button" onclick="window.loginWithGitHub()" class="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-bold font-heading flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 group">
            <svg class="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย GitHub</span>
          </button>
        </div>

        <!-- DIVIDER -->
        <div class="relative flex items-center justify-center my-4">
          <div class="border-t border-white/10 w-full"></div>
          <span class="bg-[#0A0E18] px-3 text-[10px] font-mono uppercase text-slate-500 tracking-wider">หรือใช้อีเมล (Email)</span>
          <div class="border-t border-white/10 w-full"></div>
        </div>

        <!-- MODE TABS (Sign In / Sign Up / Magic Link) -->
        <div class="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-4 text-xs font-semibold">
          <button type="button" onclick="window.switchAuthMode('signin')" id="tab-auth-signin" class="flex-1 py-1.5 rounded-lg text-center transition-all bg-white/[0.08] text-white font-bold cursor-pointer">
            เข้าสู่ระบบ
          </button>
          <button type="button" onclick="window.switchAuthMode('signup')" id="tab-auth-signup" class="flex-1 py-1.5 rounded-lg text-center text-slate-400 hover:text-white transition-all cursor-pointer">
            สมัครสมาชิก
          </button>
          <button type="button" onclick="window.switchAuthMode('magiclink')" id="tab-auth-magiclink" class="flex-1 py-1.5 rounded-lg text-center text-slate-400 hover:text-white transition-all cursor-pointer">
            Magic Link
          </button>
        </div>

        <!-- EMAIL AUTH FORM -->
        <form onsubmit="window.handleEmailAuthSubmit(event)" class="space-y-3 relative z-10">
          
          <!-- Username (Only shown in Sign Up) -->
          <div id="auth-group-username" class="hidden">
            <label class="block text-xs font-semibold text-slate-300 mb-1">ชื่อที่ต้องการแสดง:</label>
            <div class="relative">
              <i data-lucide="user" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input type="text" id="auth-input-username" placeholder="เช่น GamerMaster99" class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono" />
            </div>
          </div>

          <!-- Email Field -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">ที่อยู่อีเมล:</label>
            <div class="relative">
              <i data-lucide="mail" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input type="email" id="auth-input-email" required placeholder="your.email@example.com" class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono" />
            </div>
          </div>

          <!-- Password Field (Hidden in Magic Link mode) -->
          <div id="auth-group-password">
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-semibold text-slate-300">รหัสผ่าน:</label>
              <button type="button" onclick="window.handleForgotPassword()" class="text-[10px] text-sky-400 hover:text-white underline cursor-pointer">
                ลืมรหัสผ่าน?
              </button>
            </div>
            <div class="relative">
              <i data-lucide="lock" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input type="password" id="auth-input-password" minlength="6" placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร" class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono" />
            </div>
          </div>

          <!-- Submit Button -->
          <button type="submit" id="btn-auth-submit" class="w-full py-2.5 rounded-xl btn-cyber-primary text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/15 active:scale-95 transition-all mt-2">
            <i data-lucide="log-in" class="w-4 h-4"></i>
            <span id="btn-auth-submit-label">เข้าสู่ระบบทันที</span>
          </button>
        </form>

        <!-- Terms Footer -->
        <p class="text-[10px] text-slate-500 text-center mt-4">
          การเข้าสู่ระบบถือว่าท่านยอมรับ <a href="/terms" class="text-slate-400 hover:text-white underline">ข้อกำหนด</a> และ <a href="/privacy" class="text-slate-400 hover:text-white underline">นโยบายความเป็นส่วนตัว</a>
        </p>

      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  }

  open() {
    const modal = document.getElementById("auth-modal");
    if (modal) {
      modal.classList.remove("hidden");
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        const emailInput = document.getElementById("auth-input-email");
        if (emailInput) emailInput.focus();
      }, 100);
    }
  }

  close() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.add("hidden");
  }

  setMode(mode) {
    this.currentMode = mode;
    const tabIn = document.getElementById("tab-auth-signin");
    const tabUp = document.getElementById("tab-auth-signup");
    const tabMl = document.getElementById("tab-auth-magiclink");

    const groupUser = document.getElementById("auth-group-username");
    const groupPass = document.getElementById("auth-group-password");
    const submitLabel = document.getElementById("btn-auth-submit-label");

    // Reset tab active styles
    [tabIn, tabUp, tabMl].forEach(tab => {
      if (tab) {
        tab.className = "flex-1 py-1.5 rounded-lg text-center text-slate-400 hover:text-white transition-all cursor-pointer";
      }
    });

    const activeClass = "flex-1 py-1.5 rounded-lg text-center transition-all bg-white/[0.08] text-white font-bold cursor-pointer";

    if (mode === "signin") {
      if (tabIn) tabIn.className = activeClass;
      if (groupUser) groupUser.classList.add("hidden");
      if (groupPass) groupPass.classList.remove("hidden");
      if (submitLabel) submitLabel.textContent = "เข้าสู่ระบบทันที";
    } else if (mode === "signup") {
      if (tabUp) tabUp.className = activeClass;
      if (groupUser) groupUser.classList.remove("hidden");
      if (groupPass) groupPass.classList.remove("hidden");
      if (submitLabel) submitLabel.textContent = "สมัครสมาชิกใหม่";
    } else if (mode === "magiclink") {
      if (tabMl) tabMl.className = activeClass;
      if (groupUser) groupUser.classList.add("hidden");
      if (groupPass) groupPass.classList.add("hidden");
      if (submitLabel) submitLabel.textContent = "ส่งลิงก์เข้าสู่ระบบ (Magic Link)";
    }
  }
}

if (typeof window !== "undefined") {
  window.AuthModalComponent = AuthModalComponent;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = AuthModalComponent;
}
