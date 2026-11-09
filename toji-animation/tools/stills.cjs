// Стоп-кадры ролика: node tools/stills.cjs outDir t1 t2 ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, outDir, ...times] = process.argv;
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?render');
  await pg.evaluate(() => window.TOJI.ready);
  for (const t of times) {
    const t0 = Date.now();
    await pg.evaluate(t => window.TOJI.renderFrame(+t), t);
    const ms = Date.now() - t0;
    await pg.locator('#c').screenshot({ path: path.join(outDir, `f_${(+t).toFixed(2)}.png`) });
    console.log(t, ms + 'ms');
  }
  if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].join('\n'));
  await b.close();
})();
