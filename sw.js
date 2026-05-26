/**
 * sw.js — CommonGround PWA Service Worker
 * ---------------------------------------------------------------------------
 * Two-tier cache:
 *
 *   * Application shell (~few hundred KB) — pre-cached on install,
 *     replaced on version bump via CACHE_NAME.
 *   * Voice assets (~40 MB Vosk model + library) — lazy-cached on first use
 *     so the service-worker install doesn't block a slow first connection.
 *     Kept in a separate cache that survives shell upgrades so a `v2 → v3`
 *     bump doesn't force re-download of the model.
 *
 * To pre-cache voice assets ahead of first use (e.g. when on Wi-Fi), the
 * page can postMessage `{ type: 'precache-voice', urls: [...] }`.
 * ---------------------------------------------------------------------------
 */

// Bump when the application shell changes; the activate handler below
// deletes any cache whose key doesn't match.
const CACHE_NAME = "commonground-cache-7b824822b9";

// Application shell — small, always cached.
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
  "./voiceLogger.js",
  "./vosk-resampler-worklet.js",
  "./cottageFoodValidator.js",
  "./data/cottage-food-rules.json",
  "./stateResources.js",
  "./data/state-extension-resources.json",
  "./focusFramework.json",
  "./manifest.json"
];

// Voice assets cache. Not pre-populated — see header comment.
const VOICE_CACHE_NAME = "commonground-voice-v1";
const VOICE_ASSET_PREFIXES = [
  "/vendor/vosk-browser/",
  "/models/"
];

function isVoiceAsset(url) {
  return VOICE_ASSET_PREFIXES.some((p) => url.includes(p));
}

// --- Install -----------------------------------------------------------------
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching application shell…");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// --- Activate ---------------------------------------------------------------
// Purge stale shell caches but keep the voice-asset cache so a shell version
// bump doesn't force re-download of the (large) model.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== VOICE_CACHE_NAME) {
            console.log("[Service Worker] Cleaning outdated cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// --- Optional precache trigger ----------------------------------------------
// The page can ask the SW to background-download voice assets, e.g. after
// the operator opens a "Download offline voice (40 MB)" button.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "precache-voice" && Array.isArray(e.data.urls)) {
    e.waitUntil(
      caches.open(VOICE_CACHE_NAME).then((cache) => cache.addAll(e.data.urls))
    );
  }
});

// --- Fetch ------------------------------------------------------------------
// Cache-first for the shell; cache-first-with-network-fill for voice assets.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;            // never cache mutations

  if (isVoiceAsset(req.url)) {
    e.respondWith(
      caches.open(VOICE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          console.log("[Service Worker] Voice asset offline, no cache:", req.url);
          return new Response("", { status: 504, statusText: "Voice asset offline" });
        }
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(req).catch(() => {
        console.log("[Service Worker] Resource offline, no cache available:", req.url);
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
