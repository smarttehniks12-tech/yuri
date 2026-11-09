// Отладочные стоп-кадры: node tools/shot.cjs <url> arg=out.png ...
const { chromium } = require('playwright');
(async () => {
  const [,, url, ...items] = process.argv;
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.text()); });
  pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.goto(url);
  await pg.waitForTimeout(400);
  for (const it of items) {
    const i = it.lastIndexOf('=');
    const arg = it.slice(0, i), out = it.slice(i + 1);
    await pg.evaluate(a => window.draw(isNaN(+a) ? a : +a), arg);
    await pg.locator('canvas').first().screenshot({ path: out });
  }
  await b.close();
})();
