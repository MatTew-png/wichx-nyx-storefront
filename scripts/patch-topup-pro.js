const fs = require('fs');
const path = require('path');

// 1. Read index.html
const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Target the entire topup modal
const topupModalRegex = /[ \t]*<!-- =+[\r\n\s]+11\.\s*MODAL 4:[^]+?<!-- =+[\r\n\s]+12\.\s*MODAL 5:/;

const newTopUpModalHTML = `  <!-- ==============================================================================
       11. MODAL 4: TOP-UP WALLET MODAL (PRO HIGH-FINTECH REDESIGN)
       ============================================================================== -->
  <div id="topup-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center p-3 sm:p-4">
    <div class="absolute inset-0 modal-overlay backdrop-blur-md bg-black/80" onclick="closeTopUpModal()"></div>
    <div class="relative z-10 modal-spring-dialog rounded-3xl max-w-lg w-full p-5 sm:p-7 bg-[#090D15]/95 backdrop-blur-2xl border border-white/[0.1] shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(0,242,255,0.08)] overflow-hidden">
      
      <!-- Top Cyber Accent Glow -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70"></div>

      <!-- Header: Studio Pro Title -->
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-[var(--accent)] flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.15)] shrink-0">
            <i data-lucide="wallet" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
              เติมเงินเข้ากระเป๋า
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold tracking-wider">AUTO 24/7</span>
            </h4>
            <p class="text-xs text-slate-400">ระบบตัดยอดอัตโนมัติ เครดิตเข้าทันทีใน 5-10 วินาที</p>
          </div>
        </div>
        <button onclick="closeTopUpModal()" class="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer" title="ปิดหน้าต่าง">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Segmented Gateway Tab Track (100% Equal Heights & Alignment) -->
      <div class="bg-[#05080E] p-1.5 rounded-2xl border border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5 shadow-inner">
        <button id="tab-btn-promptpay" onclick="switchTopUpGateway('promptpay')" class="topup-tab-btn active h-11 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.15)] ring-1 ring-cyan-400/50">
          <i data-lucide="qr-code" class="w-4 h-4 text-cyan-400"></i>
          <span>พร้อมเพย์</span>
        </button>
        <button id="tab-btn-truemoney" onclick="switchTopUpGateway('truemoney')" class="topup-tab-btn h-11 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
          <i data-lucide="gift" class="w-4 h-4 text-amber-400"></i>
          <span>ทรูมันนี่</span>
        </button>
        <button id="tab-btn-bank_transfer" onclick="switchTopUpGateway('bank_transfer')" class="topup-tab-btn h-11 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
          <i data-lucide="landmark" class="w-4 h-4 text-emerald-400"></i>
          <span>ธนาคาร</span>
        </button>
        <button id="tab-btn-card_payment" onclick="switchTopUpGateway('card_payment')" class="topup-tab-btn h-11 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent">
          <i data-lucide="credit-card" class="w-4 h-4 text-indigo-400"></i>
          <span>บัตรเครดิต</span>
        </button>
      </div>

      <!-- =========================================================================
           PANEL 1: PROMPTPAY (CLEAN TERMINAL DISPLAY)
           ========================================================================= -->
      <div id="gateway-panel-promptpay" class="space-y-4">
        <!-- Preset Amounts Grid -->
        <div>
          <div class="flex items-center justify-between text-xs text-slate-300 font-semibold mb-2">
            <span>เลือกจำนวนเงินที่ต้องการเติม:</span>
            <span class="text-[11px] text-slate-500 font-mono">ขั้นต่ำ ฿1</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2.5">
            <button type="button" onclick="setPromptPayPreset(50)" data-amount="50" class="promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿50</button>
            <button type="button" onclick="setPromptPayPreset(100)" data-amount="100" class="promptpay-preset-btn active h-9 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold border border-[var(--accent)] shadow-[0_0_12px_rgba(0,242,255,0.3)] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿100</button>
            <button type="button" onclick="setPromptPayPreset(150)" data-amount="150" class="promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿150</button>
            <button type="button" onclick="setPromptPayPreset(300)" data-amount="300" class="promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿300</button>
            <button type="button" onclick="setPromptPayPreset(500)" data-amount="500" class="promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿500</button>
            <button type="button" onclick="setPromptPayPreset(1000)" data-amount="1000" class="promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer">฿1,000</button>
          </div>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--accent)] font-mono font-bold">฿</span>
            <input type="number" id="promptpay-amount-input" oninput="handlePromptPayAmountInput(this.value)" value="100" min="1" step="1" placeholder="ระบุจำนวนเงินเอง" class="w-full h-11 pl-9 pr-4 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-[var(--accent)] text-sm font-mono font-bold text-white focus:outline-none transition-all shadow-inner" />
          </div>
        </div>

        <!-- Official PromptPay QR Terminal Card -->
        <div class="p-4 rounded-2xl bg-gradient-to-b from-[#070B12] to-[#04060A] border border-white/[0.08] shadow-xl flex flex-col items-center">
          <div class="w-full flex items-center justify-between text-xs pb-3 border-b border-white/[0.06] mb-3">
            <div class="flex items-center gap-1.5 font-bold text-slate-300">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              พร้อมเพย์ QR พร้อมสแกน
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-500 uppercase">ยอดชำระ: </span>
              <span id="promptpay-qr-amount-text" class="text-sm font-mono font-extrabold text-[var(--accent)]">฿100.00</span>
            </div>
          </div>

          <!-- QR Frame -->
          <div class="p-3 rounded-2xl bg-white shadow-2xl relative">
            <div id="promptpay-qr-display" class="w-40 h-40 flex items-center justify-center">
              <img id="promptpay-qr-img" src="" alt="PromptPay QR" class="w-full h-full object-contain" />
            </div>
          </div>

          <div class="mt-3 text-center">
            <div class="text-xs font-semibold text-white flex items-center justify-center gap-1.5">
              <span>ชื่อบัญชี:</span>
              <span class="text-[var(--accent)] font-bold">NYX9 STUDIO AUTO</span>
              <i data-lucide="badge-check" class="w-3.5 h-3.5 text-cyan-400"></i>
            </div>
            <p class="text-[10px] text-slate-500 mt-0.5">เปิดแอปธนาคารใดก็ได้ แล้วสแกน QR Code ด้านบน</p>
          </div>
        </div>

        <!-- Slip Verification Section -->
        <div class="space-y-2 pt-2 border-t border-white/[0.06]">
          <div class="flex items-center justify-between text-[11px]">
            <label class="text-slate-300 font-semibold">ตรวจสอบสลิปโอนเงิน (TransRef / รหัสอ้างอิง):</label>
          </div>
          <div class="relative">
            <input type="text" id="promptpay-trans-ref-input" placeholder="กรอกเลขสลิป หรือ TransRef (เช่น 014022511...)" class="w-full h-11 px-3.5 pr-20 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-[var(--accent)] text-xs text-white font-mono focus:outline-none transition-all" />
            <button type="button" onclick="navigator.clipboard.readText().then(t => { if(t) document.getElementById('promptpay-trans-ref-input').value = t.trim(); })" class="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer">
              วางรหัส
            </button>
          </div>
          <div id="promptpay-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
          <button id="btn-verify-promptpay" onclick="verifyPromptPaySlip()" class="btn-cyber-primary w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all">
            <i data-lucide="shield-check" class="w-4 h-4"></i>
            <span>ตรวจสอบสลิปและปรับยอดทันที</span>
          </button>
        </div>
      </div>

      <!-- =========================================================================
           PANEL 2: TRUEMONEY WALLET (GIFT VOUCHER & PHONE TRANSFER)
           ========================================================================= -->
      <div id="gateway-panel-truemoney" class="hidden space-y-4">
        <!-- Voucher Instructions Card -->
        <div class="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 text-xs space-y-3">
          <div class="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <i data-lucide="gift" class="w-4 h-4 text-amber-400"></i>
            <span>เติมเงินผ่านซองของขวัญ TrueMoney (ฟรีค่าธรรมเนียม)</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
              <div class="text-white font-bold mb-0.5">1. สร้างซอง</div>
              <div class="text-[10px]">เลือกแบ่ง 1 คน</div>
            </div>
            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
              <div class="text-white font-bold mb-0.5">2. คัดลอกลิงก์</div>
              <div class="text-[10px]">gift.truemoney.com</div>
            </div>
            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-center">
              <div class="text-white font-bold mb-0.5">3. รับเงินทันที</div>
              <div class="text-[10px]">บอทตัดยอดออโต้</div>
            </div>
          </div>
        </div>

        <!-- Voucher Input Form -->
        <div class="space-y-2">
          <label class="block text-[11px] font-semibold text-slate-300">วางลิงก์ซองของขวัญที่นี่:</label>
          <div class="relative">
            <input type="text" id="truemoney-voucher-input" placeholder="https://gift.truemoney.com/campaign/?v=..." class="w-full h-11 px-3.5 pr-20 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-amber-400 text-xs text-white font-mono focus:outline-none transition-all" />
            <button type="button" onclick="navigator.clipboard.readText().then(t => { if(t) document.getElementById('truemoney-voucher-input').value = t.trim(); })" class="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer">
              วางลิงก์
            </button>
          </div>
          <div id="truemoney-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
          <button id="btn-redeem-truemoney" onclick="redeemTrueMoneyVoucher()" class="w-full h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95 transition-all">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
            <span>รับเงินเข้ากระเป๋าทันที</span>
          </button>
        </div>

        <!-- TrueMoney Direct Transfer Fallback Card -->
        <div class="pt-2 border-t border-white/[0.06]">
          <div class="p-3 rounded-xl bg-[#060910] border border-white/[0.06] flex items-center justify-between text-xs">
            <div>
              <div class="text-[10px] text-slate-400">โอนตรงเข้าเบอร์ TrueMoney Wallet:</div>
              <div class="text-sm font-mono font-bold text-amber-300">098-765-4321</div>
              <div class="text-[10px] text-slate-400">ชื่อบัญชี: NYX9 WALLET AUTO</div>
            </div>
            <button type="button" onclick="copyTrueMoneyPhone()" class="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>คัดลอกเบอร์</span>
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           PANEL 3: BANK TRANSFER (KASIKORN LUXURY CARD)
           ========================================================================= -->
      <div id="gateway-panel-bank_transfer" class="hidden space-y-4">
        <!-- Kasikorn Luxury Card -->
        <div class="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-[#070D14] to-[#04080D] border border-emerald-500/30 text-xs text-white space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-[#138f2d] flex items-center justify-center font-bold text-xs text-white shadow-md">K</div>
              <div>
                <div class="font-bold text-sm text-white">ธนาคารกสิกรไทย (K-Bank)</div>
                <div class="text-[10px] text-emerald-400 font-mono">บัญชีพร้อมเพย์ / นิติบุคคล</div>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">บอทเช็คยอด 24 ชม.</span>
          </div>

          <div class="p-3 rounded-xl bg-black/50 border border-white/[0.06] flex items-center justify-between">
            <div>
              <div class="text-[10px] text-slate-400">เลขที่บัญชี:</div>
              <div id="bank-acc-number" class="text-base font-mono font-extrabold text-emerald-300 tracking-wider">142-8-91234-5</div>
              <div class="text-[10px] text-slate-300 mt-0.5">ชื่อบัญชี: <span class="font-bold text-white">NYX9 STUDIO BY MATTEW</span></div>
            </div>
            <button type="button" onclick="copyBankAccount()" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>คัดลอก</span>
            </button>
          </div>
        </div>

        <!-- Bank Transfer Inputs -->
        <div class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">ยอดเงินที่โอน (บาท):</label>
              <input type="number" id="bank-transfer-amount" value="100" min="1" step="1" class="w-full h-11 px-3 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-emerald-400 text-xs text-white font-mono font-bold focus:outline-none" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-300 mb-1">เลขสลิป / TransRef:</label>
              <input type="text" id="bank-transfer-transref" placeholder="เช่น 014022511..." class="w-full h-11 px-3 rounded-xl bg-[#060910] border border-white/[0.08] focus:border-emerald-400 text-xs text-white font-mono focus:outline-none" />
            </div>
          </div>
          <div id="bank-transfer-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
          <button id="btn-verify-bank" onclick="verifyBankTransferSlip()" class="w-full h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
            <i data-lucide="shield-check" class="w-4 h-4"></i>
            <span>ตรวจสอบยอดโอนธนาคาร</span>
          </button>
        </div>
      </div>

      <!-- =========================================================================
           PANEL 4: CREDIT / DEBIT CARD (STRIPE-GRADE FORM)
           ========================================================================= -->
      <div id="gateway-panel-card_payment" class="hidden space-y-4">
        <!-- Titanium Matte Card Preview -->
        <div class="p-4 rounded-2xl bg-gradient-to-tr from-[#0F1422] via-[#141C30] to-[#0A0E18] border border-cyan-500/25 text-white relative shadow-xl overflow-hidden">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-5 rounded bg-amber-400/80 border border-amber-300/60 flex items-center justify-center shadow-inner">
                <div class="w-3.5 h-2.5 border border-amber-800/40 rounded-sm"></div>
              </div>
              <i data-lucide="wifi" class="w-3.5 h-3.5 text-slate-400 rotate-90"></i>
            </div>
            <span class="text-xs font-mono font-extrabold italic tracking-wider text-cyan-400">VISA / MC</span>
          </div>

          <div class="mb-2.5">
            <div class="text-[9px] text-slate-400 font-mono">CARD NUMBER</div>
            <div id="preview-card-number" class="text-base font-mono font-bold tracking-widest text-slate-100">•••• •••• •••• ••••</div>
          </div>

          <div class="flex items-center justify-between text-xs font-mono">
            <div>
              <div class="text-[9px] text-slate-400">CARDHOLDER</div>
              <div id="preview-card-name" class="font-bold truncate max-w-[150px] uppercase text-cyan-200 text-[11px]">YOUR NAME</div>
            </div>
            <div class="text-right">
              <div class="text-[9px] text-slate-400">EXPIRES</div>
              <div id="preview-card-expiry" class="font-bold text-slate-200 text-[11px]">MM/YY</div>
            </div>
          </div>
        </div>

        <!-- Preset Amount Grid -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-300 mb-1.5">เลือกจำนวนเงิน:</label>
          <div class="grid grid-cols-4 gap-1.5 mb-2">
            <button type="button" onclick="setCardAmountPreset(100)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿100</button>
            <button type="button" onclick="setCardAmountPreset(300)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿300</button>
            <button type="button" onclick="setCardAmountPreset(500)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿500</button>
            <button type="button" onclick="setCardAmountPreset(1000)" class="h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-white transition-all cursor-pointer">฿1,000</button>
          </div>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-cyan-400 font-mono font-bold">฿</span>
            <input type="number" id="card-topup-amount" value="300" min="50" step="1" class="w-full h-11 pl-9 pr-4 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-sm font-bold focus:outline-none focus:border-cyan-400" />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-300 mb-1">หมายเลขบัตร (16 หลัก):</label>
          <div class="relative">
            <input type="text" id="card-number-input" oninput="handleCardNumberInput(this)" maxlength="19" placeholder="4111 2222 3333 4444" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
            <i data-lucide="credit-card" class="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2"></i>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">วันหมดอายุ (MM/YY):</label>
            <input type="text" id="card-expiry-input" oninput="handleCardExpiryInput(this)" maxlength="5" placeholder="12/28" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-300 mb-1">รหัส CVV / CVC:</label>
            <input type="password" id="card-cvv-input" maxlength="4" placeholder="123" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-cyan-400" />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-300 mb-1">ชื่อบนบัตร (ภาษาอังกฤษ):</label>
          <input type="text" id="card-holder-input" oninput="handleCardHolderInput(this)" placeholder="SOMCHAI DEE" class="w-full h-11 px-3.5 rounded-xl bg-[#060910] border border-white/[0.08] text-white text-xs uppercase focus:outline-none focus:border-cyan-400" />
        </div>

        <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#060910] border border-white/[0.06] cursor-pointer hover:border-cyan-500/40 transition-all">
          <input type="checkbox" id="card-bind-toggle" checked class="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0" />
          <div class="text-[11px] text-slate-300">
            <span class="font-bold text-white">บันทึกข้อมูลบัตรไว้ใช้ครั้งถัดไป (1-Click Binding)</span>
            <div class="text-[10px] text-slate-500">เข้ารหัส Tokenized 256-Bit ปลอดภัยตามมาตรฐานสากล</div>
          </div>
        </label>

        <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/[0.06]">
          <span class="flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-cyan-400"></i> 3D Secure 2.0</span>
          <span class="flex items-center gap-1"><i data-lucide="lock" class="w-3.5 h-3.5 text-emerald-400"></i> PCI-DSS Level 1</span>
          <span>ค่าธรรมเนียม 0%</span>
        </div>

        <div id="card-feedback" class="hidden text-xs p-2.5 rounded-xl"></div>
        <button id="btn-pay-card" onclick="processCardPayment()" class="btn-cyber-primary w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 transition-all">
          <i data-lucide="lock" class="w-4 h-4"></i>
          <span>ชำระเงินปลอดภัยผ่าน 3D Secure</span>
        </button>
      </div>

    </div>
  </div>

  <!-- ==============================================================================
       12. MODAL 5:`;

if (!topupModalRegex.test(html)) {
  console.error('topupModalRegex failed to match in index.html');
  process.exit(1);
}

html = html.replace(topupModalRegex, newTopUpModalHTML);
fs.writeFileSync(indexHtmlPath, html, 'utf8');

// Copy to 200.html
const p200Path = path.join(__dirname, '..', '200.html');
fs.writeFileSync(p200Path, html, 'utf8');
console.log('✓ index.html & 200.html updated with Pro TopUp Modal');

// 2. Update TopUpModal.js
const topupJsPath = path.join(__dirname, '..', 'js', 'components', 'TopUpModal.js');
let topupJs = fs.readFileSync(topupJsPath, 'utf8');

// Replace switchGateway implementation to guarantee equal heights
const switchGatewayRegex = /switchGateway\(tabKey\)\s*\{[\s\S]*?if \(window\.lucide\) lucide\.createIcons\(\);\s*\}/;
const newSwitchGateway = `switchGateway(tabKey) {
    this.activeTab = tabKey;
    const tabs = ["promptpay", "truemoney", "bank_transfer", "card_payment"];
    
    tabs.forEach(t => {
      const btn = document.getElementById(\`tab-btn-\${t}\`);
      const pane = document.getElementById(\`gateway-panel-\${t}\`);
      
      if (t === tabKey) {
        if (btn) {
          btn.className = "topup-tab-btn active h-11 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.15)] ring-1 ring-cyan-400/50";
        }
        if (pane) pane.classList.remove("hidden");
      } else {
        if (btn) {
          btn.className = "topup-tab-btn h-11 w-full rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent";
        }
        if (pane) pane.classList.add("hidden");
      }
    });

    if (tabKey === "promptpay") {
      const val = parseFloat(document.getElementById("promptpay-amount-input")?.value || "100");
      this.updatePromptPayQr(val);
    }

    if (window.lucide) lucide.createIcons();
  }`;

topupJs = topupJs.replace(switchGatewayRegex, newSwitchGateway);
fs.writeFileSync(topupJsPath, topupJs, 'utf8');
console.log('✓ TopUpModal.js switchGateway updated');

// 3. Update app.js helper to highlight preset buttons
const appJsPath = path.join(__dirname, '..', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

appJs = appJs.replace(
  /window\.setPromptPayPreset\s*=\s*\(amt\)\s*=>\s*\{[\s\S]*?\};/,
  `window.setPromptPayPreset = (amt) => {
  const el = document.getElementById("promptpay-amount-input");
  if (el) el.value = amt;
  window.Shop.topupModal.updatePromptPayQr(amt);
  document.querySelectorAll(".promptpay-preset-btn").forEach(btn => {
    const val = parseFloat(btn.getAttribute("data-amount"));
    if (val === amt) {
      btn.className = "promptpay-preset-btn active h-9 rounded-xl bg-[var(--accent)] text-[#05080E] font-bold border border-[var(--accent)] shadow-[0_0_12px_rgba(0,242,255,0.3)] text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    } else {
      btn.className = "promptpay-preset-btn h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium border border-white/[0.08] text-xs font-mono transition-all flex items-center justify-center cursor-pointer";
    }
  });
};`
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ app.js preset highlighting updated');
