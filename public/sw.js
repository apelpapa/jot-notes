const CACHE_NAME = "jot-notes-shell-v4";
const APP_SHELL = ["/", "/index.html", "/images/favicons/favicon.svg", "/images/favicons/manifest.json"];
const isStaticAsset = (url) =>
  url.pathname.startsWith("/assets/") || url.pathname.startsWith("/images/favicons/");
const isPublicResponse = (response) =>
  response.ok && !/private|no-store/i.test(response.headers.get("Cache-Control") || "");

async function cacheResponse(key, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(key, response.clone());
  } catch {
    // A cache failure must not turn a successful network response into an error.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("jot-notes-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      request.headers.has("Authorization") || url.pathname === "/api" ||
      url.pathname.startsWith("/api/") || url.search || url.hash) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (isPublicResponse(response) && response.headers.get("Content-Type")?.includes("text/html")) {
          await cacheResponse("/index.html", response);
        }
        return response;
      } catch {
        return (await caches.match("/index.html").catch(() => undefined)) || Response.error();
      }
    })());
    return;
  }

  if (!isStaticAsset(url)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request).catch(() => undefined);
    if (cached) return cached;
    const response = await fetch(request);
    if (isPublicResponse(response)) {
      await cacheResponse(request, response);
    }
    return response;
  })());
});
