// Офлайн-кэш. Приложение и вся озвучка работают без интернета после первого захода.
// Озвучка живёт в Cloud Storage, поэтому кэшируем и чужой origin — иначе
// каждое слово каждый раз ходило бы в сеть.
const CACHE = 'vio-v3';
const AUDIO_HOST = 'storage.googleapis.com';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/styles.css', './assets/app.js', './assets/data.js', './assets/art.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isAudio = url.host === AUDIO_HOST || url.pathname.includes('/audio/');

  // mp3 — cache-first: в имени файла хеш содержимого, старым он уже не станет.
  // Манифест сюда не попадает: он меняется при каждой пересборке озвучки.
  if (isAudio && !url.pathname.endsWith('manifest.json')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    })));
    return;
  }

  if (url.origin !== location.origin) return;   // остальное чужое — не наше дело

  // своё — network-first с откатом в кэш
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
