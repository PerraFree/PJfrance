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

/** Ortsökning via Nominatim, med timeout så UI:t aldrig fastnar i "söker …". */
async function nominatim(query: string): Promise<GeocodeResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=se&limit=5&q=' +
    encodeURIComponent(query)
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'sv' },
    signal: timeoutSignal(9000),
  })
  if (!res.ok) throw new Error(`Nominatim svarade ${res.status}`)
  const json = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>
  return json.map((r) => ({
    name: r.display_name.split(',').slice(0, 2).join(',').trim(),
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }))
}

/** Reserv-geokodning via Photon (Komoot) om Nominatim är nere/blockerad. */
async function photon(query: string): Promise<GeocodeResult[]> {
  const url =
    'https://photon.komoot.io/api/?lang=sv&limit=5' +
    `&bbox=${SE_BBOX.west},${SE_BBOX.south},${SE_BBOX.east},${SE_BBOX.north}` +
    '&q=' +
    encodeURIComponent(query)
  const res = await fetch(url, { signal: timeoutSignal(9000) })
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
      return {
        name: [p.name, p.city, p.state].filter(Boolean).join(', ') || query,
        lat,
        lon,
      }
    })
}

/**
 * Ortsökning begränsad till Sverige. Provar Nominatim först och faller
 * tillbaka på Photon om Nominatim är långsam, blockerad eller tom.
 */
export async function searchPlace(query: string): Promise<GeocodeResult[]> {
  try {
    const results = await nominatim(query)
    if (results.length) return results
  } catch {
    /* faller tillbaka på Photon nedan */
  }
  return photon(query)
}
