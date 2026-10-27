// ================================================================
// Service Worker — مكتبتي التفاعلية  (v2)
// Stratégies :
//   • Navigation (HTML)              → Network-first  (fallback cache)
//   • Icônes / manifest / favicon    → Cache-first    (changent rarement)
//   • Contenu GitHub (JSON, img, mp3)→ Stale-while-revalidate
//   • Autres ressources (JS/CSS/fonts) → Stale-while-revalidate
// Mises à jour :
//   • skipWaiting() + clients.claim()  → activation immédiate
//   • message 'SKIP_WAITING'           → activation à la demande du client
//   • message 'CLEAR_CACHE'            → purge totale (bouton debug)
// ⚠️ INCRÉMENTER `VERSION` À CHAQUE DÉPLOIEMENT
// ================================================================

const VERSION       = 'v2-2026-10-27'; // ← CHANGEZ À CHAQUE MISE À JOUR
const SHELL_CACHE   = `shell-${VERSION}`;
const CONTENT_CACHE = `content-${VERSION}`;

const SHELL_REQUIRED = ['./', './index.html', './manifest.json'];
const SHELL_OPTIONAL = ['./icon-192.png', './icon-512.png'];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    for (const url of SHELL_REQUIRED) {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (err) { console.warn('[SW] cache requis échoué:', url, err); }
    }
    for (const url of SHELL_OPTIONAL) {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (_) { /* optionnel */ }
    }
    // Activation immédiate du nouveau SW
    self.skipWaiting();
  })());
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Nettoyage des anciens caches (versions précédentes)
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== SHELL_CACHE && k !== CONTENT_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
    // Notifie les pages ouvertes qu'une nouvelle version est active
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', version: VERSION }));
  })());
});

// ---------- MESSAGE (depuis le client) ----------
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'CLEAR_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      event.source?.postMessage({ type: 'CACHE_CLEARED' });
    })());
  }
});

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Navigation (HTML) → Network-first
  //    Indispensable : c'est ce qui permet à F5 de charger la dernière version.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }

  // 2) Icônes / manifest / favicon → Cache-first (changent rarement)
  if (/\/(manifest\.json|icon-\d+\.png|favicon\.ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // 3) Contenu GitHub (livres, images, mp3, catalogue) → Stale-while-revalidate
  //    Rapide (cache immédiat) + mise à jour en arrière-plan.
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(staleWhileRevalidate(req, CONTENT_CACHE));
    return;
  }

  // 4) Tout le reste (JS, CSS, polices, etc.) → Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
});

// ---------- STRATÉGIES ----------

// Network-first : essaie le réseau, bascule sur le cache en cas d'échec/timeout
async function networkFirst(req, cacheName, timeoutMs = 4000) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetchWithTimeout(req, timeoutMs);
    if (response && response.ok) {
      try { await cache.put(req, response.clone()); } catch (_) {}
    }
    return response;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

// Cache-first : sert le cache s'il existe, sinon réseau
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const response = await fetch(req);
    if (response && (response.ok || response.type === 'opaque')) {
      try { await cache.put(req, response.clone()); } catch (_) {}
    }
    return response;
  } catch (err) {
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

// Stale-while-revalidate : sert le cache immédiatement, rafraîchit en arrière-plan
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(response => {
      if (response && (response.ok || response.type === 'opaque')) {
        try { cache.put(req, response.clone()); } catch (_) {}
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Rafraîchissement non-bloquant
    fetchPromise.catch(() => {});
    return cached;
  }

  const response = await fetchPromise;
  if (response) return response;

  if (req.mode === 'navigate') {
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
  }
  return new Response('Hors ligne — ressource indisponible', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

// Utilitaire : fetch avec timeout
function fetchWithTimeout(req, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    fetch(req).then(
      r => { clearTimeout(timer); resolve(r); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}
