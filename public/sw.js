/* Enkel service worker: cachar appskal + stationsdata så appen fungerar offline. */
const CACHE = 'tomningskartan-v11'
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './apple-touch-icon.png',
  './data/stations-seed.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Enskilda filer får saknas utan att hela installationen fallerar
    caches.open(CACHE).then((c) => Promise.allSettled(APP_SHELL.map((u) => c.add(u)))),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(event.request, copy))
        return res
      })
      .catch(() => caches.match(event.request).then((hit) => hit ?? caches.match('./'))),
  )
})
