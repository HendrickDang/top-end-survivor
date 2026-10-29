// Service worker: caches the whole game so it plays with no signal.
// Bump CACHE when you change any file so phones pick up the new version.
const CACHE = 'tes-v1.5.5';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/config.js', 'js/main.js', 'js/games.js', 'js/art.js', 'js/lessons.js', 'js/api.js', 'js/sound.js', 'js/fx.js', 'js/badges.js', 'js/share.js', 'js/daily.js', 'js/season.js', 'js/towns.js', 'js/quiz.js', 'js/social.js', 'js/quizui.js', 'js/wardrobe.js', 'js/wardrobeui.js', 'js/judge.js',
  'js/characters.js', 'js/fails.js', 'js/locations.js', 'audio/Clockwork_Catastrophe.mp3',
  'js/battle.js', 'js/hints.js', 'js/classroom.js', 'js/groups.js', 'class.html',
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
  // The soundtrack: audio players ask for byte ranges, so answer those from the cache too (works offline).
  if (e.request.headers.has('range')) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(async hit => {
      if (!hit) return fetch(e.request);
      const buf = await hit.arrayBuffer();
      const m = /bytes=(\d*)-(\d*)/.exec(e.request.headers.get('range')) || [];
      const len = buf.byteLength;
      const start = m[1] ? Number(m[1]) : m[2] ? Math.max(0, len - Number(m[2])) : 0; // "bytes=-500" = last 500
      const end = m[1] && m[2] ? Math.min(Number(m[2]), len - 1) : len - 1;
      return new Response(buf.slice(start, end + 1), {
        status: 206,
        headers: { 'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${len}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' }
      });
    }));
    return;
  }
  // App shell: cache first, refresh in the background.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => hit || caches.match('index.html'));
    return hit || net;
  }));
});
