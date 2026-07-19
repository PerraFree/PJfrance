export interface GeocodeResult {
  name: string
  lat: number
  lon: number
}

/** Ortsökning via OpenStreetMaps Nominatim, begränsad till Sverige. */
export async function searchPlace(query: string): Promise<GeocodeResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=se&limit=5&q=' +
    encodeURIComponent(query)
  const res = await fetch(url, { headers: { 'Accept-Language': 'sv' } })
  if (!res.ok) throw new Error(`Nominatim svarade ${res.status}`)
  const json = (await res.json()) as Array<{
    display_name: string
    lat: string
    lon: string
  }>
  return json.map((r) => ({
    name: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }))
}
