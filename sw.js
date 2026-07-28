// Service worker — cache básico para funcionar offline
const CACHE = "rps-v2";
const ASSETS = [
  "./", "index.html", "styles.css", "app.js",
  "data/recipes.js", "data/bonus.js", "data/foods.js",
  "manifest.webmanifest", "icon.svg",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first para HTML (pega atualizações), cache-first para o resto
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const isHTML = e.request.mode === "navigate";
  e.respondWith(
    isHTML
      ? fetch(e.request).then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./")))
      : caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return res; }))
  );
});
