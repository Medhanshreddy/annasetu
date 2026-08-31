self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("annasetu-v2").then((c) => c.addAll(["/", "/styles.css", "/app.js", "/i18n.js", "/manifest.json"])));
});
self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/api/")) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
