
const CACHE_NAME = 'suu-fuel-map-v1';
const DATA_CACHE_NAME = 'data-cache-v1';

// Assets to cache immediately
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://esm.sh/react@^19.2.4',
  'https://esm.sh/react-dom@^19.2.4',
  'https://esm.sh/lucide-react@^0.563.0',
  'https://esm.sh/react-leaflet@^5.0.0'
];

// Install Event: Cache static assets
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline pages');
      return cache.addAll(FILES_TO_CACHE);
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
  // We use Network First strategy here for Aviation data to prioritize safety (fresh data),
  // but fall back to cache if offline.
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

  // 2. Handle Map Tiles (Google/Leaflet)
  // Basic caching for tiles to allow some panning when offline
  if (url.href.includes('google.com/vt') || url.href.includes('openstreetmap.org')) {
    evt.respondWith(
        caches.open(DATA_CACHE_NAME).then((cache) => {
            return cache.match(evt.request).then((response) => {
                return response || fetch(evt.request).then((networkResponse) => {
                    cache.put(evt.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
    return;
  }

  // 3. Handle Static Assets (Cache First)
  evt.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(evt.request).then((response) => {
        return response || fetch(evt.request);
      });
    })
  );
});
