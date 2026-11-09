# Work Order: WO-01-UNSLOP-COPYWRITING

## 1. Objective
Eradicate AI-generated robotic writing tropes, cliché marketing buzzwords, and fake rating illusions from the storefront copy. Replace them with authentic, clean Gamer/Discord community language.

## 2. Target Files
- Modify: `storeConfig.js`
- Modify: `js/components/CatalogView.js`

## 3. Implementation Contract
1. In `storeConfig.js`:
   - Replace "ยกระดับเซิร์ฟเวอร์" with "ดันเซิร์ฟเวอร์เลเวล 3 บูสต์เต็มแม็กซ์"
   - Replace "ปลดล็อกทุกอิโมจิและส่งไฟล์ขนาดใหญ่ 500MB คุ้มค่าที่สุด" with "ใช้อิโมจิดุ๊กดิ๊กข้ามเซิร์ฟ ส่งไฟล์ขนาดใหญ่ 500MB ได้ทันที"
   - Replace "รับประกันสินค้าและไอดีแท้ 100% มีทีมงานซัพพอร์ต" with "รับประกันไอดีและสินค้าแท้ มีทีมงานซัพพอร์ตดูแลทาง Discord"
   - Replace "เครือข่าย 2 ร้านค้า NOVAPE SHOP & NYX9 STUDIO บริการครบวงจร" with "เครือข่าย 2 ร้านค้า NOVAPE SHOP & NYX9 STUDIO สแตนด์บายดูแล 24 ชม."
2. In `js/components/CatalogView.js`:
   - Remove hardcoded fake rating `★★★★★ 5.0 (รีวิวผู้ซื้อจริง)` which looks like AI slop.
   - Replace with authentic merchant trust indicator:
     `<div class="flex items-center gap-1.5 mb-1.5 text-[11px] font-mono select-none">
        <span class="text-emerald-400 font-bold flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i><span class="text-slate-300 text-[10px] font-mono-val font-semibold">ของแท้ 100% • บอทส่งทันที</span></span>
      </div>`

## 4. Verification Command
`node build.js && npm test`
