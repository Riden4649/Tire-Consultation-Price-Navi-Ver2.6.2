const CACHE_NAME = "consultation-price-navi-v264-size-tabs";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./css/styles.css?v=20260818-v262",
  "./css/vehicle-quick-spec.css",
  "./css/vehicle-quick-spec.css?v=20260901-v264-size-filter",
  "./css/ui-tabs-v263.css",
  "./css/ui-tabs-v263.css?v=20260901-v263-tabs",
  "./data/brand-config.js",
  "./data/brand-config.js?v=20260818-v262",
  "./js/workbook.js",
  "./js/workbook.js?v=20260818-v262",
  "./js/pricing.js",
  "./js/pricing.js?v=20260818-v262",
  "./js/app.js",
  "./js/app.js?v=20260818-v262",
  "./js/pwa.js",
  "./js/pwa.js?v=20260818-v262",
  "./js/vehicle-quick-spec.js",
  "./js/vehicle-quick-spec.js?v=20260901-v264-size-filter",
  "./js/ui-tabs-v263.js",
  "./js/ui-tabs-v263.js?v=20260901-v263-tabs",
  "./vendor/jszip.min.js",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => notifyClients({ type: "CACHE_READY", cacheName: CACHE_NAME }))
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(cacheFirstNavigate(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "CACHE_APP_SHELL") {
    event.waitUntil(
      cacheAppShell()
        .then(() => event.ports?.[0]?.postMessage({ ok: true, cacheName: CACHE_NAME }))
        .catch(error => event.ports?.[0]?.postMessage({ ok: false, error: error?.message || "cache failed" }))
    );
  }
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "reload" })));
  await notifyClients({ type: "CACHE_READY", cacheName: CACHE_NAME });
}

async function cacheFirstNavigate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedIndex = await cache.match("./index.html", { ignoreSearch: true }) || await caches.match("./index.html", { ignoreSearch: true });
  if (cachedIndex) {
    updateCachedRequest(request, "./index.html");
    return cachedIndex;
  }
  try {
    const response = await fetch(request);
    if (response.ok) cache.put("./index.html", response.clone());
    return response;
  } catch {
    return new Response("<!doctype html><title>オフライン</title><meta charset=\"utf-8\"><body><h1>オフライン準備が未完了です</h1><p>一度オンラインでアプリを開いてください。</p></body>", {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) {
    updateCachedRequest(request);
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

function updateCachedRequest(request, cacheKey = request) {
  fetch(request)
    .then(response => {
      if (!response.ok) return;
      caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, response));
    })
    .catch(() => {});
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}
