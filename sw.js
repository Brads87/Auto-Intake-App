const CACHE = "intake-v11"; // bump this when ASSETS change
const ASSETS = [
  "./",
  "./index.html",
  "./styles/style.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting(); // activate new SW immediately
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // control open pages without reload
});

// Fetch: SPA-friendly behavior
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // For top-level navigations, fall back to index.html when offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // For static assets: cache-first, then network
  event.respondWith(
    caches.match(req).then((res) => res || fetch(req))
  );
});
