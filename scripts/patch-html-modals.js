const fs = require('fs');

const htmlPath = 'index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Add modal-spring-dialog to inner cards
html = html.replace(
  '<div class="relative z-10 glass-panel rounded-3xl max-w-lg w-full p-6 md:p-8 border border-[rgba(25,186,255,0.4)] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">',
  '<div class="relative z-10 modal-spring-dialog glass-panel rounded-3xl max-w-lg w-full p-6 md:p-8 border border-[rgba(25,186,255,0.4)] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">'
);

html = html.replace(
  '<div class="relative z-10 glass-panel rounded-3xl max-w-md w-full p-6 md:p-8 border border-[rgba(25,186,255,0.3)] shadow-2xl">',
  '<div class="relative z-10 modal-spring-dialog glass-panel rounded-3xl max-w-md w-full p-6 md:p-8 border border-[rgba(25,186,255,0.3)] shadow-2xl">'
);

html = html.replace(
  '<div class="relative z-10 glass-panel rounded-3xl max-w-lg w-full p-6 md:p-8 border border-[rgba(25,186,255,0.4)] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">',
  '<div class="relative z-10 modal-spring-dialog glass-panel rounded-3xl max-w-lg w-full p-6 md:p-8 border border-[rgba(25,186,255,0.4)] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">'
);

html = html.replace(
  '<div class="relative z-10 glass-panel rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-800 shadow-2xl">',
  '<div class="relative z-10 modal-spring-dialog glass-panel rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-800 shadow-2xl">'
);

// Add Live Heartbeat Pulse indicator to Desktop and Mobile stats
html = html.replace(
  '<span id="live-visitors-today" class="text-xs md:text-sm font-mono-val font-extrabold text-white">12,450</span>',
  '<span id="live-visitors-today" class="text-xs md:text-sm font-mono-val font-extrabold text-white">12,450</span><span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Live Pulse"></span>'
);

html = html.replace(
  '<span id="live-orders-today" class="text-xs md:text-sm font-mono-val font-extrabold text-white">850</span>',
  '<span id="live-orders-today" class="text-xs md:text-sm font-mono-val font-extrabold text-white">850</span><span class="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse ml-0.5" title="Live Activity"></span>'
);

html = html.replace(
  '<span id="live-orders-today-m" class="text-xs font-mono-val font-extrabold text-[var(--accent)]">850</span>',
  '<span class="inline-flex items-center gap-1"><span id="live-orders-today-m" class="text-xs font-mono-val font-extrabold text-[var(--accent)]">850</span><span class="inline-block w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse"></span></span>'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✅ index.html updated with modal-spring-dialog and live pulses!');
