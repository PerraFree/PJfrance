import type { LatLngBounds } from 'leaflet'

/** Vägavsnitt med höjd- eller viktbegränsning, hämtat från OpenStreetMap. */
export interface Restriction {
  id: string
  lat: number
  lon: number
  name?: string
  /** Maxhöjd i meter, om angiven */
  maxHeight?: number
  /** Maxvikt i ton, om angiven */
  maxWeight?: number
  osmUrl: string
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/** Tolkar OSM-värden som "3.4", "3,4 m" eller "3.4 t". Returnerar undefined för "default"/"none" m.m. */
function parseMetric(value: string | undefined): number | undefined {
  if (!value) return undefined
  const m = value.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  if (!m) return undefined
  const n = Number(m[1])
  // Värden i fot skrivs som 12'6" – hoppa över dem (ovanligt i Sverige)
  if (value.includes("'")) return undefined
  return Number.isFinite(n) ? n : undefined
}

/**
 * Hämtar höjd-/viktbegränsningar i kartvyn och filtrerar fram de som är
 * relevanta för fordonet (begränsning under fordonets höjd/vikt + marginal).
 */
export async function fetchRestrictions(
  bounds: LatLngBounds,
  vehicleHeight: number,
  vehicleWeight: number,
): Promise<Restriction[]> {
  const bbox = [
    bounds.getSouth(),
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast(),
  ].join(',')
  const query = `
    [out:json][timeout:25];
    (
      way["maxheight"](${bbox});
      way["maxheight:physical"](${bbox});
      way["maxweight"](${bbox});
      node["maxheight"](${bbox});
    );
    out center tags;
  `
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`Overpass svarade ${res.status}`)
  const json = (await res.json()) as { elements: OverpassElement[] }
  const result: Restriction[] = []
  for (const el of json.elements) {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat === undefined || lon === undefined) continue
    const tags = el.tags ?? {}
    const maxHeight = parseMetric(tags['maxheight:physical'] ?? tags.maxheight)
    const maxWeight = parseMetric(tags.maxweight)
    // 20 cm respektive 0 tons marginal – visa bara det som faktiskt kan stoppa fordonet
    const heightHit = maxHeight !== undefined && maxHeight < vehicleHeight + 0.2
    const weightHit = maxWeight !== undefined && maxWeight < vehicleWeight
    if (!heightHit && !weightHit) continue
    result.push({
      id: `osm-restr-${el.type}-${el.id}`,
      lat,
      lon,
      name: tags.name,
      maxHeight: heightHit ? maxHeight : undefined,
      maxWeight: weightHit ? maxWeight : undefined,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    })
  }
  return result
}
