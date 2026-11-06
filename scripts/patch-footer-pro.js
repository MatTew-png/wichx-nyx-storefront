const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const twoHundredPath = path.join(__dirname, '..', '200.html');

let html = fs.readFileSync(indexPath, 'utf8');

const footerStart = html.indexOf('<footer');
const footerEnd = html.indexOf('</footer>') + '</footer>'.length;

if (footerStart === -1 || footerEnd === -1) {
  console.error('Could not find <footer> in index.html');
  process.exit(1);
}

const newFooter = `<footer class="border-t border-white/[0.08] bg-[#05080E]/95 backdrop-blur-2xl pt-12 pb-8 px-4 md:px-8 mt-auto text-xs text-slate-400 relative overflow-hidden">
    <!-- Ambient Flare -->
    <div class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 bg-[var(--accent)]/5 blur-3xl pointer-events-none rounded-full"></div>

    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 mb-10 relative z-10">
      
      <!-- Col 1 (md:col-span-4): Store Brand, Human Contact & Trust Status -->
      <div class="md:col-span-4 space-y-4">
        <div class="flex items-center gap-3">
          <div class="relative w-10 h-10 rounded-xl bg-[#090D15] border border-white/[0.12] flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(0,163,255,0.25)]">
            <img src="assets/logo.png" alt="NYX9 STUDIO" class="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,163,255,0.4)]" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Cpolygon points=\\'50,5 90,25 90,75 50,95 10,75 10,25\\' fill=\\'%230A0E17\\' stroke=\\'%2300F2FF\\' stroke-width=\\'4\\'/%3E%3Cpath d=\\'M50,22 L35,52 L48,52 L42,78 L65,44 L52,44 Z\\' fill=\\'%2300F2FF\\'/%3E%3C/svg%3E';" />
          </div>
          <div>
            <span class="font-heading font-extrabold text-white text-base tracking-wider" data-bind="storeName">NYX9 STUDIO</span>
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono-val text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ระบบออโต้ 24/7 ONLINE</span>
            </div>
          </div>
        </div>
        
        <p class="text-[12px] text-slate-400 leading-relaxed font-body" data-bind="subTagline">
          ศูนย์รวมบริการดิจิทัลเครือข่าย 4 ร้านค้า Discord Nitro, บูสต์เซิร์ฟเวอร์, FiveM & ไอที ครบวงจร ระบบตัดยอดอัตโนมัติ จัดส่งรหัสทันทีในระบบคลังคีย์
        </p>

        <!-- Direct Quick Human Status (เหมือนของเก่า สบายใจ ปลอดภัย) -->
        <div class="space-y-1.5 pt-1 text-[11px]">
          <div class="flex items-center gap-2 text-slate-300">
            <span class="text-rose-400">📍</span>
            <span>ติดต่อสอบถาม: <strong class="text-white">ผ่านระบบ Discord ตลอด 24 ชม.</strong></span>
          </div>
          <div class="flex items-center gap-2 text-slate-300">
            <span class="text-amber-400">⚡</span>
            <span>สถานะระบบ: <span class="text-emerald-400 font-mono-val font-semibold">พร้อมให้บริการ 24/7 AUTO</span></span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 pt-2 text-slate-300 text-xs font-mono-val">
          <span class="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5 text-[var(--accent)]"></i>
            <span>660,000+ ออเดอร์</span>
          </span>
          <span class="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span>ประกันแท้ 100%</span>
          </span>
        </div>
      </div>

      <!-- Col 2 (md:col-span-4): เมนูลัดและบริการ (2 Sub-Columns เหมือนของเก่าแต่คลิกใช้งานได้จริง) -->
      <div class="md:col-span-4">
        <div class="flex items-center gap-2 mb-3.5">
          <i data-lucide="compass" class="w-4 h-4 text-[var(--accent)]"></i>
          <h5 class="text-white font-heading font-extrabold uppercase tracking-wider text-[12px]">เมนูลัดและบริการ</h5>
        </div>
        <div class="grid grid-cols-2 gap-4 text-[12px]">
          <!-- Sub-Col 1: เมนูบริการ -->
          <div class="space-y-2.5 font-medium">
            <a href="#" class="text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>หน้าหลัก</span>
            </a>
            <a href="#products-catalog" class="text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>รายการสินค้าทั้งหมด</span>
            </a>
            <button onclick="openTopUpModal()" class="w-full text-left text-slate-400 hover:text-[var(--accent)] hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>เติมเงินเข้าระบบ</span>
            </button>
            <button onclick="openHistoryModal()" class="w-full text-left text-slate-400 hover:text-[var(--accent)] hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>ประวัติการสั่งซื้อ</span>
            </button>
            <button onclick="openClaimModal()" class="w-full text-left text-slate-400 hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="text-amber-400 text-[10px]">&rsaquo;</span>
              <span>แจ้งเคลม &amp; ประกัน</span>
            </button>
          </div>

          <!-- Sub-Col 2: ช่วยเหลือ & ข้อตกลง -->
          <div class="space-y-2.5 font-medium">
            <a href="#products-catalog" class="text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>คำถามที่พบบ่อย (FAQ)</span>
            </a>
            <a href="#" onclick="openClaimModal(); return false;" class="text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>เงื่อนไขและข้อตกลง</span>
            </a>
            <a href="https://discord.gg/nyx9studio" target="_blank" data-bind="discordCommunityUrl" class="text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>ติดต่อแอดมิน</span>
            </a>
            <a href="#" class="text-slate-400 hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>นโยบายความเป็นส่วนตัว</span>
            </a>
            <a href="admin.html" class="text-slate-400 hover:text-[var(--accent)] hover:translate-x-1 transition-all flex items-center gap-1.5">
              <span class="text-[var(--accent)] text-[10px]">&rsaquo;</span>
              <span>ระบบหลังบ้านแอดมิน</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Col 3 (md:col-span-4): ศูนย์ช่วยเหลือ & ช่องทางติดต่อจริง -->
      <div class="md:col-span-4 space-y-3.5">
        <div class="flex items-center gap-2 mb-1">
          <i data-lucide="headset" class="w-4 h-4 text-[var(--accent)]"></i>
          <h5 class="text-white font-heading font-extrabold uppercase tracking-wider text-[12px]">ศูนย์ช่วยเหลือ &amp; ติดต่อเรา</h5>
        </div>

        <!-- Banner Discord หลัก (กดได้จริง เด่นชัด) -->
        <a href="https://discord.gg/nyx9studio" target="_blank" data-bind="discordCommunityUrl" class="group p-3 rounded-2xl bg-[#5865F2]/15 hover:bg-[#5865F2]/25 border border-[#5865F2]/40 flex items-center justify-between transition-all shadow-[0_0_20px_rgba(88,101,242,0.15)]">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-[#5865F2] text-white flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(88,101,242,0.5)]">
              <i data-lucide="message-square" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="text-[12px] font-bold text-white group-hover:text-[var(--accent)] transition-colors">Discord Community หลัก</div>
              <div class="text-[10px] text-emerald-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>45,000+ สมาชิก • มีทีมแอดมิน 24 ชม.</span>
              </div>
            </div>
          </div>
          <i data-lucide="arrow-up-right" class="w-4 h-4 text-slate-400 group-hover:text-white transition-colors"></i>
        </a>

        <!-- ช่องทางเสริม (LINE & Email จริง) -->
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
            </div>
            <div class="min-w-0">
              <div class="text-[9px] text-slate-400 font-body">LINE Official</div>
              <div class="text-[11px] font-bold font-mono-val text-white truncate" data-bind="contactLine">@nyx9studio</div>
            </div>
          </div>

          <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-white/[0.05] text-slate-400 flex items-center justify-center shrink-0 border border-white/[0.08]">
              <i data-lucide="mail" class="w-3.5 h-3.5"></i>
            </div>
            <div class="min-w-0">
              <div class="text-[9px] text-slate-400 font-body">อีเมลฝ่ายบริการ</div>
              <div class="text-[11px] font-bold font-mono-val text-slate-300 truncate" data-bind="supportEmail">support@nyxning.shop</div>
            </div>
          </div>
        </div>

        <p class="text-[10px] text-slate-500 font-mono-val pt-0.5">
          * ปลอดภัยด้วย SSL 256-Bit • ดูแลด้วยความใส่ใจ 100%
        </p>
      </div>

    </div>

    <!-- =========================================================================
         4 DISCORD SERVERS IN OUR NETWORK (4-Alliance Matrix Banner)
         ========================================================================= -->
    <div class="max-w-7xl mx-auto mb-8 pt-8 border-t border-white/[0.06] relative z-10">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div class="flex items-center gap-2">
          <i data-lucide="network" class="w-4 h-4 text-[var(--accent)]"></i>
          <h4 class="text-white font-heading font-extrabold uppercase tracking-wider text-[13px]">
            4 DISCORD SERVERS IN OUR NETWORK (ศูนย์รวมคอมมูนิตี้ในเครือ 4 ร้าน)
          </h4>
        </div>
        <span class="text-[10px] font-mono-val px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] self-start sm:self-auto">
          MULTI-HUB ALLIANCE
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <!-- Store 1: ACTIVE / ONLINE -->
        <div class="p-3.5 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/40 space-y-2.5 relative overflow-hidden group hover:border-[#5865F2]/70 transition-all shadow-[0_0_20px_rgba(88,101,242,0.15)]">
          <div class="flex items-center justify-between">
            <div class="w-7 h-7 rounded-lg bg-[#5865F2] flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(88,101,242,0.5)]">
              #1
            </div>
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-mono-val text-emerald-400 font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ONLINE</span>
            </div>
          </div>
          <div>
            <div class="text-white font-bold text-xs group-hover:text-[var(--accent)] transition-colors">ร้านที่ 1: NYX9 STUDIO (หลัก)</div>
            <div class="text-[10px] text-slate-400">Nitro, บูสต์เซิร์ฟเวอร์ &amp; FiveM</div>
          </div>
          <a href="https://discord.gg/nyx9studio" target="_blank" data-bind="discordCommunityUrl" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-bold shadow-md shadow-[#5865F2]/25 transition-all">
            <span>เข้าสู่ Discord ร้านที่ 1</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
          </a>
        </div>

        <!-- Store 2: STANDBY / COMING SOON -->
        <div class="p-3.5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-2.5 opacity-70 hover:opacity-90 transition-opacity">
          <div class="flex items-center justify-between">
            <div class="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 font-bold text-xs">
              #2
            </div>
            <span class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[9px] font-mono-val text-amber-400 font-bold">
              COMING SOON
            </span>
          </div>
          <div>
            <div class="text-slate-300 font-bold text-xs">ร้านที่ 2 (เครือข่ายพันธมิตร)</div>
            <div class="text-[10px] text-slate-500">พร้อมเปิดตัวเร็วๆ นี้</div>
          </div>
          <div class="py-1.5 rounded-xl bg-white/5 border border-white/5 text-slate-500 text-[10px] text-center font-bold font-mono-val cursor-not-allowed">
            เร็วๆ นี้ &bull; STANDBY
          </div>
        </div>

        <!-- Store 3: STANDBY / COMING SOON -->
        <div class="p-3.5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-2.5 opacity-70 hover:opacity-90 transition-opacity">
          <div class="flex items-center justify-between">
            <div class="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 font-bold text-xs">
              #3
            </div>
            <span class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[9px] font-mono-val text-amber-400 font-bold">
              COMING SOON
            </span>
          </div>
          <div>
            <div class="text-slate-300 font-bold text-xs">ร้านที่ 3 (เครือข่ายพันธมิตร)</div>
            <div class="text-[10px] text-slate-500">พร้อมเปิดตัวเร็วๆ นี้</div>
          </div>
          <div class="py-1.5 rounded-xl bg-white/5 border border-white/5 text-slate-500 text-[10px] text-center font-bold font-mono-val cursor-not-allowed">
            เร็วๆ นี้ &bull; STANDBY
          </div>
        </div>

        <!-- Store 4: STANDBY / COMING SOON -->
        <div class="p-3.5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-2.5 opacity-70 hover:opacity-90 transition-opacity">
          <div class="flex items-center justify-between">
            <div class="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 font-bold text-xs">
              #4
            </div>
            <span class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[9px] font-mono-val text-amber-400 font-bold">
              COMING SOON
            </span>
          </div>
          <div>
            <div class="text-slate-300 font-bold text-xs">ร้านที่ 4 (เครือข่ายพันธมิตร)</div>
            <div class="text-[10px] text-slate-500">พร้อมเปิดตัวเร็วๆ นี้</div>
          </div>
          <div class="py-1.5 rounded-xl bg-white/5 border border-white/5 text-slate-500 text-[10px] text-center font-bold font-mono-val cursor-not-allowed">
            เร็วๆ นี้ &bull; STANDBY
          </div>
        </div>
      </div>
    </div>

    <!-- =========================================================================
         Sub-Footer Bar (สงวนลิขสิทธิ์ & แถบชำระเงินเรียบหรูสไตล์ของเก่า)
         ========================================================================= -->
    <div class="max-w-7xl mx-auto pt-6 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 relative z-10">
      
      <!-- Copyright & Real Human Assurance (เหมือนของเก่า) -->
      <div class="flex flex-wrap items-center gap-1.5 text-center md:text-left">
        <span>สงวนลิขสิทธิ์ &copy; 2025-2026</span>
        <span class="font-bold text-white" data-bind="storeName">NYX9 STUDIO</span>
        <span class="text-slate-600">|</span>
        <span>4-Discord Alliance Hub</span>
        <span class="text-slate-600">|</span>
        <span class="text-slate-300">ให้บริการด้วยความใส่ใจและปลอดภัย 100%</span>
      </div>

      <!-- Payment Badges (สไตล์ของเก่า สะอาดตา) -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[10px] font-medium text-amber-300">
          <i data-lucide="wallet" class="w-3 h-3 text-amber-400"></i>
          <span>TrueMoney</span>
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[10px] font-medium text-cyan-300">
          <i data-lucide="qr-code" class="w-3 h-3 text-cyan-400"></i>
          <span>PromptPay</span>
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[10px] font-medium text-emerald-300">
          <i data-lucide="landmark" class="w-3 h-3 text-emerald-400"></i>
          <span>Bank Transfer</span>
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[10px] font-medium text-indigo-300">
          <i data-lucide="coins" class="w-3 h-3 text-indigo-400"></i>
          <span>Crypto LTC</span>
        </span>
      </div>

    </div>
  </footer>`;

html = html.substring(0, footerStart) + newFooter + html.substring(footerEnd);

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(twoHundredPath, html, 'utf8');

console.log('✅ [PATCH SUCCESS] Successfully patched index.html and 200.html with human-crafted footer!');
