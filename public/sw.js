// Minimal service worker for Next.js PWA shell caching
// Nota: evitar cachear documentos HTML en cache-first para no servir páginas viejas
// que referencian chunks nuevos/viejos (causa típica de "reading 'call'").
const CACHE_NAME = 'taller-cache-v2';
const APP_SHELL = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET and same-origin
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Navegaciones (HTML): network-first con fallback al shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch (err) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('/');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Evitar cachear endpoints internos de Next/React Server Components
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache sólo para assets estáticos
  const cacheableDestinations = new Set(['style', 'script', 'image', 'font']);
  if (!cacheableDestinations.has(request.destination)) {
    return;
  }

  // Stale-while-revalidate para assets
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || fetchPromise;
    })()
  );
});
