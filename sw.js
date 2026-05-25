const CACHE_NAME = "commonground-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./systemOrchestrator.js",
  "./commonGroundSyncEngine.js",
  "./telemetryIngestor.js",
  "./climateCalculators.js",
  "./cloudLedger.js",
  "./focusFramework.json",
  "./manifest.json"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching Application Shell...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Cleaning Outdated Cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Cache-First strategy)
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Serve from cache
      }
      return fetch(e.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        console.log("[Service Worker] Resource offline, no cache available:", e.request.url);
      });
    })
  );
});
