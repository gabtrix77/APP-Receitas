// Service worker — cache para funcionar offline
const CACHE = "rps-v7";
const ASSETS = [
  "./", "index.html",
  "styles.css?v=4", "app.js?v=4",
  "data/recipes.js?v=4", "data/bonus.js?v=4", "data/foods.js?v=4", "data/images.js?v=7",
  "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-180.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first para HTML (pega atualizações), cache-first para o resto
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  const isHTML = e.request.mode === "navigate";
  e.respondWith(
    isHTML
      ? fetch(e.request).then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./")))
      : caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); } return res; }))
  );
});
