// Service worker: caches the whole game so it plays with no signal.
// Bump CACHE when you change any file so phones pick up the new version.
<<<<<<< Updated upstream
const CACHE = 'tes-v1.2.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/config.js', 'js/main.js', 'js/games.js', 'js/art.js', 'js/lessons.js', 'js/api.js', 'js/sound.js', 'js/fx.js', 'js/badges.js', 'js/share.js', 'js/daily.js', 'js/season.js',
=======
const CACHE = 'tes-v1.0.10';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/config.js', 'js/main.js', 'js/games.js', 'js/art.js', 'js/lessons.js', 'js/api.js', 'js/sound.js', 'js/characters.js', 'js/locations.js', 'js/fails.js',
  'audio/Clockwork_Catastrophe.mp3',
>>>>>>> Stashed changes
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API calls always go to the network (the app handles offline itself).
  if (url.pathname.startsWith('/api/')) return;

  // Google Fonts: cache on first use.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const res = await fetch(e.request); c.put(e.request, res.clone()); return res; }
      catch { return new Response('', { status: 504 }); }
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // App shell: fresh from the network while online, so a new version is picked up on
  // the next load rather than the one after it. Falls back to the cached copy when
  // there is no signal, which is what keeps the game playable offline.
  // `no-cache` revalidates with the server instead of trusting the browser's HTTP
  // cache (static files are served with a 1 h max-age), otherwise a changed file
  // would keep serving the old copy for up to an hour even after CACHE is bumped.
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request, { cache: 'no-cache' });
      if (res.status === 200) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    } catch {
      return (await caches.match(e.request, { ignoreSearch: true })) || caches.match('index.html');
    }
  })());
});
