const CACHE_NAME = "fkm-erp-v1";

const urlsToCache = [
  "/fkm/",
  "/fkm/index.html",
  "/fkm/transactions.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
