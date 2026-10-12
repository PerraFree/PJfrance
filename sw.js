/* Enkel service worker: cachar appskal + stationsdata så appen fungerar offline. */
const CACHE = 'tomningskartan-v98'
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
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  const isNav = req.mode === 'navigate'
  // Navigeringar cachas utan query-sträng – annars blir det en cachepost per
  // delad ?at=-länk. Sidan är densamma oavsett query.
  const key = isNav ? url.origin + url.pathname : req
  // Stationsdatan ska hämtas färskt ("nätverk först" på riktigt): no-cache
  // tvingar webbläsaren att fråga servern i stället för att ta HTTP-cachen.
  const isData = /\/data\/[^/]+\.json$/.test(url.pathname)
  event.respondWith(
    (isData ? fetch(req, { cache: 'no-cache' }) : fetch(req))
      .then((res) => {
        // Bara lyckade svar cachas – en 404/500 får aldrig ersätta en bra kopia.
        if (res.ok) {
          const copy = res.clone()
          event.waitUntil(caches.open(CACHE).then((c) => c.put(key, copy)))
        }
        return res
      })
      .catch(() =>
        caches.match(key).then((hit) => {
          if (hit) return hit
          // Offline-reserven (startsidan) bara för sidnavigeringar – aldrig
          // som svar på en JS-/JSON-begäran.
          if (isNav) return caches.match('./').then((shell) => shell ?? Response.error())
          return Response.error()
        }),
      ),
  )
})
