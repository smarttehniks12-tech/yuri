/* service-worker.js — offline support. Code (html/js/css/json) is network-first so updates arrive on the next launch;
 * media (audio/images) is cache-first. Everything works offline after the first visit. */
const CACHE = 'cursed-arena-v1.4.0';
const ASSETS = [
  './', './index.html', './style.css', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './js/utils.js', './js/icons.js', './js/names.js', './js/storage.js', './js/audio.js', './js/input.js', './js/fx.js', './js/sprites.js',
  './js/locations.js', './js/enemies.js', './js/bosses.js', './js/abilities.js', './js/characters.js',
  './js/kits/spatial.js', './js/kits/king.js', './js/kits/shadow.js', './js/kits/blood.js', './js/kits/lightning.js', './js/kits/striker.js',
  './js/domains.js', './js/aim.js',
  './audio/hit.mp3', './audio/crit.mp3', './audio/slash.mp3', './audio/punch.mp3', './audio/shoot.mp3', './audio/zap.mp3', './audio/boom.mp3', './audio/bigboom.mp3', './audio/hurt.mp3', './audio/death.mp3', './audio/xp.mp3', './audio/boss.mp3', './audio/warn.mp3', './audio/pull.mp3', './audio/whoosh.mp3', './audio/ult.mp3', './audio/domain.mp3', './audio/summon.mp3', './audio/blood.mp3', './audio/fire.mp3', './audio/spark.mp3', './audio/jackpot.mp3', './audio/roll.mp3', './audio/beam.mp3', './audio/shield.mp3', './audio/click.mp3', './audio/levelup.mp3', './audio/chest.mp3', './audio/achieve.mp3', './audio/select.mp3', './js/artifacts.js', './js/progression.js', './js/player.js', './js/hud.js', './js/game.js', './js/admin.js', './js/ui.js', './js/main.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function put(req, res) { if (res && res.ok && new URL(req.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const media = /\.(mp3|png|svg)$/.test(url.pathname);
  if (media) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => put(req, r))));
    return;
  }
  // network-first with a short timeout, cache fallback (offline)
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
    const timer = setTimeout(() => { fromCache().then((r) => { if (!done && r) { done = true; resolve(r); } }); }, 2500);
    fetch(req).then((r) => { clearTimeout(timer); put(req, r); if (!done) { done = true; resolve(r); } })
      .catch(() => { clearTimeout(timer); fromCache().then((r) => { if (!done) { done = true; resolve(r || Response.error()); } }); });
  }));
});
