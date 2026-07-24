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
  return typeof AbortSignal !== 'undefined' && 'any' in AbortSignal
    ? AbortSignal.any(signals)
    : signals[0]
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

/** Resolver på första löftet som ger en icke-tom lista; annars tom när alla klara. */
function firstNonEmpty<T>(promises: Promise<T[]>[]): Promise<T[]> {
  return new Promise((resolve) => {
    let remaining = promises.length
    if (remaining === 0) resolve([])
    const done = (r: T[] | null) => {
      if (r && r.length) return resolve(r)
      if (--remaining === 0) resolve([])
    }
    for (const p of promises) p.then(done, () => done(null))
  })
}

/**
 * Ortsökning begränsad till Sverige. Kör Nominatim och Photon PARALLELLT och
 * tar det första svaret med träff – snabbt även om den ena tjänsten hänger.
 * Går att avbryta via `signal`.
 */
export async function searchPlace(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const nom = nominatim(query, combinedSignal(signal, 8000)).catch(() => [] as GeocodeResult[])
  const pho = photon(query, combinedSignal(signal, 8000)).catch(() => [] as GeocodeResult[])
  return firstNonEmpty([nom, pho])
}
