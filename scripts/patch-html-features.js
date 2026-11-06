const fs = require('fs');

const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Add jsQR script in head
const targetHead = '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>';
const repHead = `<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>\n  <!-- jsQR Engine for Smart Slip Auto-Scan -->\n  <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>`;

if (html.includes(targetHead)) {
  html = html.replace(targetHead, repHead);
  console.log('✅ 1. Added jsQR to head');
} else {
  console.warn('⚠️ targetHead not found');
}

// 2. Add PNG Receipt Button in Instant Delivery Modal
const targetReceiptBtns = `<div class="flex gap-2">
          <button type="button" onclick="copyDeliveredKey()" class="btn-cyber-primary flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
            <i data-lucide="copy" class="w-4 h-4"></i>
            <span>คัดลอกรหัส</span>
          </button>
          <button type="button" onclick="downloadCurrentReceiptTxt()" class="btn-cyber-secondary flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>ดาวน์โหลด .TXT</span>
          </button>
        </div>`;

const repReceiptBtns = `<!-- Cyberpunk Receipt Image Generator Button -->
        <button type="button" onclick="window.saveOrderReceiptPNG()" class="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent)]/20 via-emerald-500/20 to-[var(--accent)]/20 hover:from-[var(--accent)]/30 hover:to-emerald-500/30 border border-[var(--accent)]/60 text-[var(--accent)] hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[var(--accent)]/20 active:scale-95 mb-1">
          <i data-lucide="image-down" class="w-4 h-4"></i>
          <span>📸 บันทึกใบเสร็จเป็นรูปภาพ PNG สวยงาม (Story Ready)</span>
        </button>

        <div class="flex gap-2">
          <button type="button" onclick="copyDeliveredKey()" class="btn-cyber-primary flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
            <i data-lucide="copy" class="w-4 h-4"></i>
            <span>คัดลอกรหัส</span>
          </button>
          <button type="button" onclick="downloadCurrentReceiptTxt()" class="btn-cyber-secondary flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>สำรอง .TXT</span>
          </button>
        </div>`;

if (html.includes('downloadCurrentReceiptTxt()')) {
  // Replace the buttons container
  html = html.replace(/<div class="flex gap-2">\s*<button type="button" onclick="copyDeliveredKey\(\)"[\s\S]*?<\/div>/, repReceiptBtns);
  console.log('✅ 2. Added PNG Receipt button to Instant Delivery modal');
} else {
  console.warn('⚠️ downloadCurrentReceiptTxt not found');
}

// 3. Add Smart Slip Dropzone in PromptPay panel
const targetSlipSection = `<!-- Slip Verification Section -->`;
const repSlipSection = `<!-- Smart Slip Auto-Scan Zone (Drop / Paste / Upload) -->
        <div class="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <div class="flex items-center justify-between text-[11px]">
            <label class="text-slate-300 font-semibold flex items-center gap-1.5">
              <i data-lucide="scan-line" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
              <span>ระบบอ่านสลิปอัจฉริยะ (สแกน QR ในสลิปอัตโนมัติ):</span>
            </label>
            <span class="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">AI AUTO-SCAN</span>
          </div>

          <!-- Drop / Click / Paste Zone -->
          <div id="slip-dropzone" onclick="document.getElementById('slip-file-input').click()" class="border-2 border-dashed border-slate-700 hover:border-[var(--accent)] bg-slate-900/60 hover:bg-slate-900/90 rounded-2xl p-3.5 text-center cursor-pointer transition-all relative group shadow-inner">
            <input type="file" id="slip-file-input" accept="image/*" class="hidden" onchange="window.handleSlipFileSelect(event)" />
            
            <div id="slip-dropzone-idle" class="flex flex-col items-center justify-center gap-1 py-1">
              <div class="w-9 h-9 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <i data-lucide="image-up" class="w-4 h-4"></i>
              </div>
              <div class="text-xs font-bold text-white">แตะเพื่อแนบรูปสลิป หรือ กดวางรูป (Ctrl+V)</div>
              <div class="text-[10px] text-slate-400 font-body">ระบบจะดึงรหัสทำรายการจาก QR ในสลิปให้อัตโนมัติใน 1 วินาที ไม่ต้องพิมพ์</div>
            </div>

            <div id="slip-dropzone-scanning" class="hidden flex flex-col items-center justify-center gap-2 py-1">
              <div class="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--accent)]/50 shadow-md">
                <img id="slip-preview-img" src="" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-[var(--accent)]/20 animate-pulse"></div>
              </div>
              <div id="slip-scan-status" class="text-xs font-bold text-[var(--accent)] flex items-center gap-1.5 font-mono">
                <i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i>
                <span>กำลังสแกน QR ในสลิป...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Slip Verification Section -->`;

if (html.includes(targetSlipSection)) {
  html = html.replace(targetSlipSection, repSlipSection);
  console.log('✅ 3. Added Smart Slip Dropzone to PromptPay panel');
} else {
  console.warn('⚠️ targetSlipSection not found');
}

fs.writeFileSync(path, html, 'utf8');
console.log('🎉 index.html patched successfully!');
