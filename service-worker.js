/* service-worker.js — offline-first cache for Cursed Arena: Awakening */
const CACHE = 'cursed-arena-v1.0.0';
const ASSETS = [
  './', './index.html', './style.css', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './js/utils.js', './js/storage.js', './js/audio.js', './js/input.js', './js/fx.js', './js/sprites.js',
  './js/locations.js', './js/enemies.js', './js/bosses.js', './js/abilities.js', './js/characters.js',
  './js/kits/spatial.js', './js/kits/king.js', './js/kits/shadow.js', './js/kits/blood.js', './js/kits/lightning.js', './js/kits/striker.js',
  './js/domains.js', './js/artifacts.js', './js/progression.js', './js/player.js', './js/hud.js', './js/game.js', './js/ui.js', './js/main.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
    })
  );
});
