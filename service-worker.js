// Minimal service worker — its only job is to satisfy PWA installability
// requirements and cache the app shell (this HTML file + manifest + icons)
// for faster repeat loads. It deliberately does NOT try to cache or work
// offline for Firebase/Firestore/Auth or Google Drive/API calls — this app
// is fundamentally online-only (live shared data), so anything not
// same-origin, and anything that isn't a simple GET, always goes straight
// to the network untouched.

const CACHE_NAME = "ngk-pricing-shell-v1";
const APP_SHELL = [
  "./",
  "./pricing-tool.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests for the app shell itself. Firebase
  // (firestore/auth), Google APIs, gstatic/accounts.google.com scripts, and
  // anything cross-origin all fall through untouched.
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
