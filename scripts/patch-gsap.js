const fs = require('fs');
const path = require('path');

const gsapTags = `  <!-- GSAP & ScrollTrigger Core Engine (Julian Fella Silky Animation Protocol) -->
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
`;

['index.html', '200.html'].forEach(f => {
  const filePath = path.join(__dirname, '..', f);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('gsap@3.12.5')) {
    content = content.replace('<!-- Canvas Confetti -->', gsapTags + '  <!-- Canvas Confetti -->');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Added GSAP & ScrollTrigger to ${f}`);
  }
});
