
const CACHE_NAME = 'suu-fuel-map-v2';
const DATA_CACHE_NAME = 'data-cache-v2';

// Assets to cache immediately on install
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.css',
  '/index.tsx',
  '/App.tsx'
];

// Install Event: Cache static assets
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline pages');
      return cache.addAll(FILES_TO_CACHE).catch(e => console.warn('Precaching failed', e));
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);

  // Do not cache non-GET requests
  if (evt.request.method !== 'GET') {
    return;
  }

  // 1. Handle Aviation Weather API Requests, Fuel Data, and Proxies (Stale-While-Revalidate / Network First Fallback)
  if (url.hostname.includes('aviationweather.gov') || url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com') || url.hostname.includes('corsproxy.io') || url.hostname.includes('allorigins.win')) {
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(evt.request)
          .then((response) => {
            // If valid response, clone and cache
            if (response.status === 200) {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch((err) => {
            // Network failed, try to get from cache
            return cache.match(evt.request);
          });
      })
    );
    return;
  }

  // 2. Handle Map Tiles (Google/Leaflet) (Cache First Strategy)
  if (url.href.includes('google.com/vt') || url.href.includes('openstreetmap.org')) {
    evt.respondWith(
        caches.open(DATA_CACHE_NAME).then((cache) => {
            return cache.match(evt.request).then((response) => {
                return response || fetch(evt.request).then((networkResponse) => {
                    cache.put(evt.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    return response; // Can be undefined
                });
            });
        })
    );
    return;
  }

  // 3. Dynamic Caching for All Other Static Assets (Cache First)
  evt.respondWith(
    caches.match(evt.request).then((cachedResponse) => {
      if (cachedResponse) {
        // We found a cached response.
        // Optional: We can still fetch in the background to keep the cache fresh (Stale-While-Revalidate)
        fetch(evt.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(evt.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache it
      return fetch(evt.request).then((networkResponse) => {
        // Only cache successful responses
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        // Do not cache API requests or non-static assets accidentally
        if (url.pathname.startsWith('/api')) {
            return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(evt.request, responseToCache);
        });

        return networkResponse;
      }).catch(err => {
         console.log('Fetch failed, offline mode.', err);
      });
    })
  );
});
