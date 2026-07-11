const CACHE_NAME = "moronabus-shell-v64";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/script.js",
  "/js/services/api.js",
  "/js/services/geoportal.js",
  "/data/geoportal/barrios.geojson",
  "/data/geoportal/parroquias.geojson",
  "/js/app/i18n.js",
  "/js/app/service_status.js",
  "/js/app/tutorial.js",
  "/js/app/voice_assistant.js",
  "/assets/icons/favicon.svg",
  "/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname === "/data/firestore/manifest.json") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (url.pathname.startsWith("/data/firestore/") && url.pathname.endsWith(".json")) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }))
    );
    return;
  }

  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ ok: false, error: "Se requiere internet para consultar datos actualizados" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      ))
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
