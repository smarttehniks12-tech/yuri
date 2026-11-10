// Frame-by-frame render: node render.mjs <outDir> <width> <fps> <worker> <workers>. Resumable (skips existing frames).
import fs from 'fs'; import { createRequire } from 'module';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const [out, wA, fpsA, kA, nA] = process.argv.slice(2); const w = +wA, fps = +fpsA, k = +kA, n = +nA, total = 70 * fps;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: w, height: Math.round(w * 16 / 9) }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.setDefaultTimeout(180000); await p.goto(`http://localhost:8765/index.html?render&w=${w}`); await p.waitForFunction('window.__ready'); await p.evaluate('window.__ready');
for (let i = k; i < total; i += n) {
  const f = `${out}/f_${String(i).padStart(5, '0')}.jpg`; if (fs.existsSync(f)) continue;
  await p.evaluate(t => window.__frame(t), (i + 0.5) / fps);
  await p.screenshot({ path: f + '.tmp.jpg', type: 'jpeg', quality: 93, timeout: 180000 }); fs.renameSync(f + '.tmp.jpg', f);
  if (i % 100 === k) console.log(k, i, new Date().toISOString().slice(11, 19));
}
await b.close(); console.log('worker', k, 'done');
