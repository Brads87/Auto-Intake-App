// -----------------------------
// Auto Service Intake Service Worker
// Strategy:
// - HTML/JS/CSS: network-first (so updates show immediately)
// - Everything else: cache-first (fast + offline)
// - Bump CACHE_NAME on each deploy
// -----------------------------
const CACHE_NAME = "intake-v2.0.0"; // <-- bump this when you deploy

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

// Helper: treat .js/.css/.map as app code
function isAppCode(url) {
  return (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".map")
  );
}

// Base path of this project on GitHub Pages, e.g. "/Auto-Intake-App/" (or "/" on user sites)
const BASE_PATH = new URL(self.registration.scope).pathname;
// Always use the scoped index.html as the offline fallback
const INDEX_REQ = new Request(BASE_PATH.replace(/\/?$/, "/") + "index.html", { cache: "reload" });

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // (optional) Manifest → network-first, bypass HTTP cache
  if (url.pathname.endsWith(".webmanifest") || url.pathname.endsWith("manifest.json")) {
    event.respondWith(fetch(req, { cache: "no-store" }).catch(() => caches.match(req)));
    return;
  }

  // 1) Navigations (HTML) → network-first, *bypass HTTP cache*
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: "no-store" }); // <-- key change
        // cache the scoped index for future loads
        const cache = await caches.open(CACHE_NAME);
        cache.put(INDEX_REQ, res.clone());
        return res;
      } catch {
        // exact scoped index.html first
        const cachedIndex = await caches.match(INDEX_REQ);
        if (cachedIndex) return cachedIndex;
        // last-ditch: whatever we have for this request
        const cachedReq = await caches.match(req);
        if (cachedReq) return cachedReq;
        return new Response("<h1>Offline</h1>", { status: 200, headers: { "Content-Type": "text/html" } });
      }
    })());
    return;
  }

  // 2) App code (JS/CSS) → network-first, *bypass HTTP cache*
  if (isAppCode(url)) {
    event.respondWith(
      fetch(req, { cache: "no-store" })       // <-- key change
        .then(async (res) => {
          const copy = res.clone();
          (await caches.open(CACHE_NAME)).put(req, copy);
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3) Everything else → cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then(async (res) => {
        const copy = res.clone();
        (await caches.open(CACHE_NAME)).put(req, copy);
        return res;
      });
    })
  );
});
