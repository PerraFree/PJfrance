/**
 * Väderprognos för en koordinat via SMHIs öppna prognos-API (gratis, ingen
 * nyckel, ingen egen backend behövs). Täcker Sverige och närområdet.
 * https://opendata.smhi.se/apidocs/metfcst/
 */
export interface DayForecast {
  date: string
  weekday: string
  tMin: number
  tMax: number
  symbol: number
  precipMm: number
}

const SMHI_URL = (lat: number, lon: number) =>
  `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon.toFixed(4)}/lat/${lat.toFixed(4)}/data.json`

// Väderikonkoder enligt SMHIs Wsymb2 (1–27). Grupperade till emoji-nivåer.
export const WEATHER_ICONS: Record<number, string> = {
  1: '☀️',
  2: '🌤️',
  3: '⛅',
  4: '🌥️',
  5: '☁️',
  6: '☁️',
  7: '🌫️',
  8: '🌦️',
  9: '🌧️',
  10: '🌧️',
  11: '⛈️',
  12: '🌨️',
  13: '🌨️',
  14: '🌨️',
  15: '🌨️',
  16: '🌨️',
  17: '🌨️',
  18: '🌧️',
  19: '🌧️',
  20: '🌧️',
  21: '⛈️',
  22: '🌨️',
  23: '🌨️',
  24: '🌨️',
  25: '🌨️',
  26: '🌨️',
  27: '🌨️',
}

// Grov "hur bra väder"-poäng: varmare och torrare är bättre. Används för att
// jämföra dagar/platser, inte för exakt värde.
export function weatherScore(day: Pick<DayForecast, 'tMax' | 'precipMm' | 'symbol'>): number {
  const sunBonus = day.symbol <= 2 ? 4 : day.symbol <= 4 ? 2 : 0
  return day.tMax - day.precipMm * 3 + sunBonus
}

const TTL_MS = 30 * 60 * 1000
const cache = new Map<string, { at: number; data: Promise<DayForecast[]> }>()

export function fetchWeather(lat: number, lon: number): Promise<DayForecast[]> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data
  const data = lookup(lat, lon)
  cache.set(key, { at: Date.now(), data })
  return data
}

async function lookup(lat: number, lon: number): Promise<DayForecast[]> {
  try {
    const res = await fetch(SMHI_URL(lat, lon))
    if (!res.ok) return []
    const json = (await res.json()) as {
      timeSeries?: Array<{
        validTime: string
        parameters: Array<{ name: string; values: number[] }>
      }>
    }
    const series = json.timeSeries ?? []
    const byDate = new Map<string, { temps: number[]; symbols: number[]; precip: number[] }>()
    for (const entry of series) {
      const dt = new Date(entry.validTime)
      const date = dt.toISOString().slice(0, 10)
      const get = (name: string) => entry.parameters.find((p) => p.name === name)?.values[0]
      const t = get('t')
      if (t === undefined) continue
      let bucket = byDate.get(date)
      if (!bucket) {
        bucket = { temps: [], symbols: [], precip: [] }
        byDate.set(date, bucket)
      }
      bucket.temps.push(t)
      const symbol = get('Wsymb2')
      if (symbol !== undefined) bucket.symbols.push(symbol)
      const pmean = get('pmean')
      if (pmean !== undefined) bucket.precip.push(pmean)
    }
    const weekdayFmt = new Intl.DateTimeFormat('sv-SE', { weekday: 'short' })
    return [...byDate.entries()].slice(0, 6).map(([date, b]) => ({
      date,
      weekday: weekdayFmt.format(new Date(`${date}T12:00:00`)),
      tMin: Math.round(Math.min(...b.temps)),
      tMax: Math.round(Math.max(...b.temps)),
      symbol: mode(b.symbols),
      // pmean är mm/h vid varje 1-3-timmarspunkt – summan är en grov
      // uppskattning av dygnsnederbörden, inte exakt.
      precipMm: Math.round(b.precip.reduce((sum, v) => sum + v, 0) * 10) / 10,
    }))
  } catch {
    return []
  }
}

function mode(nums: number[]): number {
  if (!nums.length) return 0
  const counts = new Map<number, number>()
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1)
  let best = nums[0]
  let bestCount = 0
  for (const [n, c] of counts) {
    if (c > bestCount) {
      best = n
      bestCount = c
    }
  }
  return best
}
