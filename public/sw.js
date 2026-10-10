// Service worker : met en cache l'enveloppe de l'appli pour un démarrage instantané. Les données passent toujours par le réseau.
const V = 'chez-nous-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin && !/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.host)) return; // Supabase : jamais en cache
  if (r.mode === 'navigate' || u.pathname === '/config.js') { // réseau d'abord, cache en secours
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('/index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
});
