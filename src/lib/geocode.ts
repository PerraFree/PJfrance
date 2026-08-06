export interface GeocodeResult {
  name: string
  lat: number
  lon: number
}

// Ungefärlig bounding box för Sverige (väst, syd, öst, nord) – biasar sökningen.
const SE_BBOX = { west: 10.5, south: 55.0, east: 24.5, north: 69.2 }

/** AbortSignal.timeout finns inte i äldre webbläsare – fall tillbaka utan signal. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(ms)
    : undefined
}

/** Kombinerar användarens avbryt-signal med en timeout. */
function combinedSignal(external: AbortSignal | undefined, ms: number): AbortSignal | undefined {
  const t = timeoutSignal(ms)
  const signals = [external, t].filter(Boolean) as AbortSignal[]
  if (signals.length === 0) return undefined
  if (signals.length === 1) return signals[0]
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) return AbortSignal.any(signals)
  // Äldre webbläsare utan AbortSignal.any: kombinera för hand så att BÅDE
  // avbryt-knappen och timeouten fungerar.
  const ctrl = new AbortController()
  for (const s of signals) {
    if (s.aborted) {
      ctrl.abort(s.reason)
      break
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true })
  }
  return ctrl.signal
}

/** Ortsökning via Nominatim. */
async function nominatim(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=se&limit=5&q=' +
    encodeURIComponent(query)
  const res = await fetch(url, { headers: { 'Accept-Language': 'sv' }, signal })
  if (!res.ok) throw new Error(`Nominatim svarade ${res.status}`)
  const json = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>
  return json.map((r) => ({
    name: r.display_name.split(',').slice(0, 2).join(',').trim(),
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }))
}

/** Reserv-geokodning via Photon (Komoot). */
async function photon(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const url =
    'https://photon.komoot.io/api/?lang=sv&limit=5' +
    `&bbox=${SE_BBOX.west},${SE_BBOX.south},${SE_BBOX.east},${SE_BBOX.north}` +
    '&q=' +
    encodeURIComponent(query)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Photon svarade ${res.status}`)
  const json = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] }
      properties?: Record<string, string>
    }>
  }
  return (json.features ?? [])
    .filter((f) => f.properties?.countrycode === 'SE' && f.geometry?.coordinates)
    .map((f) => {
      const p = f.properties ?? {}
      const [lon, lat] = f.geometry!.coordinates!
      return { name: [p.name, p.city, p.state].filter(Boolean).join(', ') || query, lat, lon }
    })
}

/**
 * Resolver på första löftet som ger en icke-tom lista; tom lista när alla är
 * klara och minst en tjänst svarade. Om ALLA misslyckades (nätet nere,
 * avbrutet) avvisas löftet så att anroparen kan skilja fel från "ingen träff".
 */
function firstNonEmpty<T>(promises: Promise<T[]>[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    let remaining = promises.length
    let anySucceeded = false
    let lastError: unknown
    if (remaining === 0) resolve([])
    const settle = () => {
      if (--remaining === 0) (anySucceeded ? resolve([]) : reject(lastError))
    }
    for (const p of promises)
      p.then(
        (r) => {
          anySucceeded = true
          if (r.length) resolve(r)
          else settle()
        },
        (e) => {
          lastError = e
          settle()
        },
      )
  })
}

/**
 * Ortsökning begränsad till Sverige. Kör Nominatim och Photon PARALLELLT och
 * tar det första svaret med träff – snabbt även om den ena tjänsten hänger.
 * Går att avbryta via `signal`.
 */
export async function searchPlace(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  return firstNonEmpty([
    nominatim(query, combinedSignal(signal, 8000)),
    photon(query, combinedSignal(signal, 8000)),
  ])
}
