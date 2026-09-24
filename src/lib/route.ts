import type { Station } from '../types'

/**
 * "Längs min väg": vägberäkning + urval av platser nära vägen.
 *
 * Vägen hämtas från OSRM:s öppna demoserver (ingen nyckel). Svarar den inte
 * faller vi tillbaka på fågelvägen mellan start och mål (flaggas med
 * `straight: true` så UI:t kan säga det). Platsurvalet räknas helt lokalt.
 */

export interface LatLon {
  lat: number
  lon: number
}

export interface RouteResult {
  /** Vägens punkter som [lat, lon] (Leaflet-ordning). */
  coords: [number, number][]
  distanceKm: number
  /** true = OSRM svarade inte, linjen är fågelvägen. */
  straight: boolean
}

export interface RouteHit {
  station: Station
  /** Km från startpunkten längs vägen (där man passerar platsen). */
  alongKm: number
  /** Km från vägen (fågelvägen till närmaste punkt på vägen). */
  sideKm: number
}

const OSRM = 'https://router.project-osrm.org/route/v1/driving/'

function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Bilväg mellan två punkter via OSRM, annars fågelvägen. */
export async function fetchRoute(from: LatLon, to: LatLon, signal?: AbortSignal): Promise<RouteResult> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(new Error('timeout')), 15_000)
  signal?.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true })
  try {
    const url = `${OSRM}${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`OSRM svarade ${res.status}`)
    const json = (await res.json()) as {
      routes?: Array<{ distance?: number; geometry?: { coordinates?: [number, number][] } }>
    }
    const r = json.routes?.[0]
    const line = r?.geometry?.coordinates
    if (!line || line.length < 2) throw new Error('ingen väg hittades')
    return {
      coords: line.map(([lon, lat]) => [lat, lon] as [number, number]),
      distanceKm: (r?.distance ?? 0) / 1000,
      straight: false,
    }
  } catch (err) {
    // Användaren avbröt → låt anroparen hantera det. Annars: fågelvägen.
    if (signal?.aborted) throw err
    return {
      coords: [
        [from.lat, from.lon],
        [to.lat, to.lon],
      ],
      distanceKm: haversineKm(from, to),
      straight: true,
    }
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Platser inom `maxKm` från vägen, sorterade i färdriktningen. Räknas i ett
 * lokalt plan (km) – tillräckligt exakt för Sverige och några km:s radie.
 * Vägen glesas ut till max ~600 punkter så 5 000 platser × väg går på
 * tiotals millisekunder även på mobil.
 */
export function stationsAlongRoute(
  stations: Station[],
  coords: [number, number][],
  maxKm: number,
): RouteHit[] {
  if (coords.length < 2) return []
  const step = Math.max(1, Math.ceil(coords.length / 600))
  const pts: [number, number][] = []
  for (let i = 0; i < coords.length; i += step) pts.push(coords[i])
  if (pts[pts.length - 1] !== coords[coords.length - 1]) pts.push(coords[coords.length - 1])

  const lat0 = (pts.reduce((s, p) => s + p[0], 0) / pts.length) * (Math.PI / 180)
  const kx = 111.32 * Math.cos(lat0)
  const ky = 110.57
  const xs = pts.map((p) => p[1] * kx)
  const ys = pts.map((p) => p[0] * ky)
  // Ackumulerat avstånd längs vägen per punkt
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]))
  }
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  for (const p of pts) {
    if (p[0] < minLat) minLat = p[0]
    if (p[0] > maxLat) maxLat = p[0]
    if (p[1] < minLon) minLon = p[1]
    if (p[1] > maxLon) maxLon = p[1]
  }
  const padLat = maxKm / ky
  const padLon = maxKm / kx
  const hits: RouteHit[] = []
  for (const s of stations) {
    if (s.lat < minLat - padLat || s.lat > maxLat + padLat || s.lon < minLon - padLon || s.lon > maxLon + padLon) continue
    const px = s.lon * kx
    const py = s.lat * ky
    let best = Infinity
    let bestAlong = 0
    for (let i = 1; i < pts.length; i++) {
      const ax = xs[i - 1], ay = ys[i - 1], bx = xs[i], by = ys[i]
      const dx = bx - ax, dy = by - ay
      const len2 = dx * dx + dy * dy
      let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
      if (t < 0) t = 0
      else if (t > 1) t = 1
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      if (d < best) {
        best = d
        bestAlong = cum[i - 1] + t * Math.sqrt(len2)
      }
    }
    if (best <= maxKm) hits.push({ station: s, alongKm: bestAlong, sideKm: best })
  }
  hits.sort((a, b) => a.alongKm - b.alongKm)
  return hits
}
