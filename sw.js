// -----------------------------
// Auto Service Intake Service Worker
// Strategy:
// - HTML/JS/CSS: network-first (so updates show immediately)
// - Everything else: cache-first (fast + offline)
// - Bump CACHE_NAME on each deploy
// -----------------------------
const CACHE = "intake-v16"; // bump this when ASSETS change

self.addEventListener("install", (event) => {
  // Activate new SW immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      );
      // Take control of open clients
      await self.clients.claim();
    })()
  );
});

// Helper: is this an app-code request?
function isAppCode(url) {
  return url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".map");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // 1) Navigation requests (HTML) → network-first with cache fallback
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 2) App code (JS/CSS) → network-first with cache fallback
  if (isAppCode(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3) Everything else (images, icons, fonts, etc.) → cache-first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
