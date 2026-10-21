// ================================================================
// Service Worker — مكتبتي التفاعلية
// Stratégie :
//   • App shell (index, manifest, icônes) : cache-first
//   • Contenu GitHub (raw.githubusercontent.com) : cache-first + réseau
//   • Tout le reste : réseau puis fallback cache
// ================================================================

const VERSION = 'v1';
const SHELL_CACHE   = `shell-${VERSION}`;
const CONTENT_CACHE = `content-${VERSION}`;

// Chemins RELATIFS au scope du SW → fonctionnent quel que soit le déploiement
const REQUIRED_URLS = [
  './',
  './index.html',
  './manifest.json'
];
const OPTIONAL_URLS = [
  './icon-192.png',
  './icon-512.png'
];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Requis : si un seul échoue, l'install échoue quand même pas — on log juste
    for (const url of REQUIRED_URLS) {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (err) { console.warn('[SW] échec cache requis:', url, err); }
    }
    for (const url of OPTIONAL_URLS) {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (_) { /* optionnel, ignore */ }
    }
    self.skipWaiting();
  })());
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== SHELL_CACHE && k !== CONTENT_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Contenu pédagogique GitHub : cache-first
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(cacheFirst(req, CONTENT_CACHE));
    return;
  }

  // 2) App shell + tout le reste : cache-first, réseau en complément
  event.respondWith(cacheFirst(req, SHELL_CACHE, true));
});

// Utilitaire : cache-first avec mise en cache automatique
async function cacheFirst(req, cacheName, putOnNetwork = true) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const response = await fetch(req);
    // On met en cache uniquement les réponses valides
    if (response && (response.ok || response.type === 'opaque')) {
      if (putOnNetwork) {
        // Pour les ressources same-origin uniquement, éviter les fuites cross-origin
        try { await cache.put(req, response.clone()); } catch (_) {}
      } else {
        try { await cache.put(req, response.clone()); } catch (_) {}
      }
    }
    return response;
  } catch (err) {
    // Hors-ligne + rien en cache
    // Fallback : pour une navigation, servir index.html si dispo
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}
