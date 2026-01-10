const CACHE_NAME = 'firetrack-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // On utilise addAll de manière plus prudente pour iOS
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Certains assets n\'ont pu être mis en cache lors de l\'install:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Priorité au cache, sinon réseau
      return response || fetch(event.request).then(fetchRes => {
        // Optionnel : mettre en cache dynamiquement les nouveaux fichiers (images, etc)
        return fetchRes;
      }).catch(() => {
        // Fallback pour la navigation principale
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});