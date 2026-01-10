
const CACHE_NAME = 'firetrack-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/public/manifest.json',
  '/public/icon-192.png',
  '/public/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Installation du SW : mise en cache des assets absolus...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Erreur lors de la mise en cache de certains assets:', err);
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
            console.log('Nettoyage de l\'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // On ne traite que les requêtes GET pour le cache
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retourne la version cachée ou tente le réseau
      return response || fetch(event.request).catch(() => {
        // Fallback offline simple pour la navigation principale
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
