// Рендер MP4: node tools/render.cjs [out.mp4] [workers]
// Каждый кадр — Director.frame(t) в headless Chromium; сегменты кодируются параллельно, затем склеиваются со звуком.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'video', 'toji_heavenly_restriction_9x16.mp4'));
const WORKERS = +(process.argv[3] || 3);
const FPS = 30, DUR = 90, N = FPS * DUR;
const tmp = fs.mkdtempSync('/tmp/toji-');

async function worker(id, a, b, port, browser) {
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = new Set();
  pg.on('pageerror', e => errs.add(e.message));
  pg.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.add(m.text()); });
  await pg.goto(`http://127.0.0.1:${port}/index.html?render`);
  await pg.evaluate(() => window.TOJI.ready);
  const seg = path.join(tmp, `seg${id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = a; i < b; i++) {
    const b64 = await pg.evaluate(t => { window.TOJI.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.93).split(',')[1]; }, i / FPS);
    const buf = Buffer.from(b64, 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 150 === 0) console.log(`worker ${id}: frame ${i}/${b}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await pg.close();
  return { seg, errs: [...errs] };
}

(async () => {
  const srv = await require('./serve.cjs')(root);
  const browser = await chromium.launch();
  const t0 = Date.now();
  const per = Math.ceil(N / WORKERS);
  const jobs = [];
  for (let w = 0; w < WORKERS; w++) jobs.push(worker(w, w * per, Math.min(N, (w + 1) * per), srv.port, browser));
  const res = await Promise.all(jobs);
  await browser.close(); srv.close();
  const errs = res.flatMap(r => r.errs);
  if (errs.length) console.log('JS ERRORS:\n' + [...new Set(errs)].join('\n'));
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, res.map(r => `file '${r.seg}'`).join('\n'));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(root, 'audio', 'soundtrack.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', String(DUR), '-movflags', '+faststart', OUT]);
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's →', OUT);
})();
