const CACHE_VERSION = 'cycle-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/cycle-math.js',
  './js/hormone-model.js',
  './js/tcm.js',
  './js/i18n.js',
  './js/screens/today.js',
  './js/screens/log.js',
  './js/screens/onboarding.js',
  './js/screens/history.js',
  './js/screens/journal.js',
  './js/screens/explore.js',
  './js/screens/learn.js',
  './js/screens/settings.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
