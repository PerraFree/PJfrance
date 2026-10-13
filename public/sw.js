/* Enkel service worker: cachar appskal + stationsdata så appen fungerar offline. */
const CACHE = 'tomningskartan-v112'
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './apple-touch-icon.png',
  './data/stations-seed.json',
]

// Granskning 12 okt 2026: förut cachades bara startsidan vid installationen,
// inte JS/CSS. När den nya versionen aktiverades raderades den gamla cachen
// (med de gamla JS-filerna) – och den nya startsidan pekade på filer som
// aldrig hämtats. Offline direkt efter en uppdatering = tom sida.
// Nu: (1) JS/CSS som startsidan pekar på hämtas vid installationen,
// (2) gamla /assets/-filer (innehållsnamngivna, ändras aldrig) flyttas över
// till den nya cachen innan den gamla raderas.
async function cacheShellAndAssets() {
  const c = await caches.open(CACHE)
  await Promise.allSettled(APP_SHELL.map((u) => c.add(u)))
  const shell = await c.match('./')
  if (!shell) return
  const html = await shell.text()
  const assets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1])
  await Promise.allSettled(assets.map((u) => c.add(u)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheShellAndAssets())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = await caches.open(CACHE)
      for (const k of await caches.keys()) {
        if (k === CACHE) continue
        // Bara filerna som den GAMLA startsidan pekar på (en generation bakåt) –
        // annars skulle gamla filer samlas på telefonen för varje version.
        const old = await caches.open(k)
        const oldShell = await old.match('./')
        const oldHtml = oldShell ? await oldShell.text() : ''
        const wanted = new Set([...oldHtml.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => new URL(m[1], self.location.href).pathname))
        for (const req of await old.keys()) {
          if (wanted.has(new URL(req.url).pathname) && !(await keep.match(req))) {
            const res = await old.match(req)
            if (res) await keep.put(req, res)
          }
        }
        await caches.delete(k)
      }
    })(),
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
  const fromCache = () =>
    caches.match(key).then((hit) => {
      if (hit) return hit
      // Offline-reserven (startsidan) bara för sidnavigeringar – aldrig
      // som svar på en JS-/JSON-begäran.
      if (isNav) return caches.match('./')
      return undefined
    })
  event.respondWith(
    (isData ? fetch(req, { cache: 'no-cache' }) : fetch(req))
      .then(async (res) => {
        // Bara lyckade svar cachas – en 404/500 får aldrig ersätta en bra kopia.
        if (res.ok) {
          const copy = res.clone()
          event.waitUntil(caches.open(CACHE).then((c) => c.put(key, copy)))
          return res
        }
        // Serverfel (t.ex. störning hos GitHub Pages): hellre den sparade
        // kopian än en tom karta. Finns ingen kopia skickas felet vidare.
        if (res.status >= 500 || isData) return (await fromCache()) ?? res
        return res
      })
      .catch(() => fromCache().then((hit) => hit ?? Response.error())),
  )
})
