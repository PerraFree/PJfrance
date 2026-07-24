/**
 * Slår upp ortsnamn/adress för en koordinat via OpenStreetMaps Nominatim.
 * Anropas först när en popup öppnas (aldrig i förväg) och cachas, så vi
 * håller oss inom Nominatims användningspolicy.
 */
const cache = new Map<string, string>()

// Serialiserad kö med ≥1 s mellan anrop – håller oss inom Nominatims policy
// även om användaren snabbt öppnar flera popups.
let queue: Promise<unknown> = Promise.resolve()
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn)
  queue = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  )
  return run
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`
  if (cache.has(key)) return cache.get(key) as string
  return throttled(() => lookup(lat, lon, key))
}

async function lookup(lat: number, lon: number, key: string): Promise<string> {
  if (cache.has(key)) return cache.get(key) as string
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1` +
      `&lat=${lat}&lon=${lon}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'sv' } })
    if (!res.ok) return ''
    const json = (await res.json()) as {
      display_name?: string
      address?: Record<string, string>
    }
    const a = json.address ?? {}
    const line1 = a.road ? `${a.road}${a.house_number ? ' ' + a.house_number : ''}` : ''
    const place = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? a.county
    const out =
      [line1, place].filter(Boolean).join(', ') ||
      (json.display_name ? json.display_name.split(',').slice(0, 2).join(',').trim() : '')
    cache.set(key, out)
    return out
  } catch {
    return ''
  }
}
