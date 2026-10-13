const CACHE_NAME = 'app-alphabetisation-v1';
const urlsToCache = [
  '/application-lecture/',
  '/application-lecture/index.html',
  '/application-lecture/manifest.json',
  '/application-lecture/icon-192.png',
  '/application-lecture/icon-512.png'
];

// Installation : mettre en cache les fichiers essentiels
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Erreur cache:', err))
  );
});

// Activation : nettoyer les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Interception : servir depuis le cache, sinon depuis le réseau
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
