// Service worker minimal : rend l'appli installable et accélère le démarrage.
// Réseau d'abord pour les fichiers de l'appli (mises à jour immédiates), cache en secours.
// Les données (Supabase) et les images externes ne passent jamais par ce cache.
const CACHE = 'catalogue-v1';
const BASE = ['./', 'index.html', 'style.css?v=1', 'app.js?v=1', 'config.js?v=1', 'vendor/supabase.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { if (r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: false }).then((r) => r || caches.match('index.html')))
  );
});
