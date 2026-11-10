const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const mode = process.argv[2];
  const b = await chromium.launch({ args: ['--font-render-hinting=none'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', e => console.error('PAGEERR', e.message));
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.evaluate(() => document.fonts.load('800 40px Inter').then(() => document.fonts.load('700 40px Inter')).then(() => document.fonts.load('900 40px Inter')));
  const grab = async f => Buffer.from((await pg.evaluate(f => { render(f); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, f)).split(',')[1], 'base64');
  if (mode === 'stills') {
    const fs = require('fs');
    for (const ts of process.argv.slice(3)) fs.writeFileSync(path.resolve(process.argv[1], '..', '..', 'stills', `s_${ts}.jpg`), await grab(Math.round(parseFloat(ts) * 30)));
  } else {
    const out = process.argv[3];
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const N = 1800; const t0 = Date.now();
    for (let f = 0; f < N; f++) { const buf = await grab(f); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (f % 150 === 0) console.log(f, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
