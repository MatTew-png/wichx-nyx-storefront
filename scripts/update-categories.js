const fs = require('fs');

let data = fs.readFileSync('productsData.js', 'utf8');

// cat-discord-nitro
data = data.replace(
  'name: "DISCORD NITRO & BOOSTS",',
  'name: "Discord Nitro & บูสต์",'
);
data = data.replace(
  'subName: "แพ็กเกจไนโตร บูสเซิร์ฟเวอร์ & ไอเทมตกแต่งโปรไฟล์",',
  'subName: "ไนโตรแท้ บูสต์เซิร์ฟเวอร์ & ไอเทมตกแต่งโปรไฟล์",'
);

// cat-discord-services
data = data.replace(
  'name: "DISCORD SERVICES & ACCOUNTS",',
  'name: "บริการดิสคอร์ด & ไอดี",'
);
data = data.replace(
  'subName: "บริการปั๊มเมมเบอร์ ยืนยันเบอร์ OTP และไอดีดิสคอร์ดปีเก่า",',
  'subName: "เควสต์อัตโนมัติ บอท & ไอดีพร้อมใช้งาน",'
);
data = data.replace(
  /id: "cat-discord-services",[\s\S]*?icon: "cpu"/,
  match => match.replace('icon: "cpu"', 'icon: "bot"')
);

// cat-gaming-apps
data = data.replace(
  'name: "GAMING ACCOUNTS & STREAMING APPS",',
  'name: "FiveM, Steam & เกมมิ่ง",'
);
data = data.replace(
  'subName: "ไอดีเกม FiveM, Steam GTAV, แอปพรีเมียม & AI Tools",',
  'subName: "ไอดีสะอาด ปลดแบน FiveM, GTAV & สตรีมมิ่ง",'
);

// cat-uncategorized
data = data.replace(
  'name: "📦 สินค้าทั่วไป (UNCATEGORIZED)",',
  'name: "ซอฟต์แวร์ & คีย์แท้",'
);
data = data.replace(
  'subName: "หมวดสินค้าสแตนด์อโลน สามารถเปิด-ปิดการแสดงผลได้อย่างอิสระ",',
  'subName: "Windows 11 Pro, Spotify Family & ดิจิทัลไอเทม",'
);
data = data.replace(
  /id: "cat-uncategorized",[\s\S]*?icon: "box"/,
  match => match.replace('icon: "box"', 'icon: "sparkles"')
);

fs.writeFileSync('productsData.js', data, 'utf8');
console.log('Successfully updated categories in productsData.js');
