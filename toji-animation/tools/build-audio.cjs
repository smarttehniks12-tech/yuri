// Сведение звуковой дорожки: node tools/build-audio.cjs → audio/soundtrack.wav (+ .m4a для плеера)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
(async () => {
  const root = path.resolve(__dirname, '..');
  const srv = await require('./serve.cjs')(root);
  const b = await chromium.launch();
  const pg = await b.newPage();
  pg.on('pageerror', e => console.log('PAGEERR', e.message));
  pg.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()); });
  await pg.goto(`http://127.0.0.1:${srv.port}/tools/mix.html`);
  const t0 = Date.now();
  const len = await pg.evaluate(() => window.runMix());
  console.log('rendered', len, 'bytes in', Date.now() - t0, 'ms');
  const parts = [];
  for (let i = 0; i < len; i += 4 << 20) parts.push(Buffer.from(await pg.evaluate(([i, n]) => window.chunk(i, n), [i, 4 << 20]), 'base64'));
  const raw = path.join(root, 'audio', 'mix_raw.wav');
  fs.writeFileSync(raw, Buffer.concat(parts));
  await b.close(); srv.close();
  // громкость под соцсети: -14 LUFS, true peak -1 dB
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', '48000', path.join(root, 'audio', 'soundtrack.wav')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(root, 'audio', 'soundtrack.wav'), '-c:a', 'aac', '-b:a', '192k', path.join(root, 'audio', 'soundtrack.m4a')]);
  fs.unlinkSync(raw);
  console.log('done');
})();
