/**
 * Väderprognos för en koordinat via SMHIs öppna prognos-API (gratis, ingen
 * nyckel, ingen egen backend behövs). Täcker Sverige och närområdet.
 * https://opendata.smhi.se/apidocs/metfcst/ – OBS: SMHI lade ner det gamla
 * pmp3g-API:et 2026-03-31 till förmån för snow1g (platt "data"-objekt med
 * fältnamn som air_temperature/symbol_code i stället för en parameters-
 * array). Parsern nedan hanterar båda formaten defensivt.
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
  `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/${lon.toFixed(4)}/lat/${lat.toFixed(4)}/data.json`

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
    if (!res.ok) {
      console.warn(`SMHI-prognos: HTTP ${res.status} för ${lat},${lon}`)
      return []
    }
    const json = (await res.json()) as {
      timeSeries?: Array<{
        // Nya snow1g-formatet
        time?: string
        data?: Record<string, number>
        // Gamla pmp3g-formatet (utfasat 2026-03-31) – kvar som fallback
        validTime?: string
        parameters?: Array<{ name: string; values: number[] }>
      }>
    }
    const series = json.timeSeries ?? []
    const byDate = new Map<string, { temps: number[]; symbols: number[]; precip: number[] }>()
    for (const entry of series) {
      const timeStr = entry.time ?? entry.validTime
      if (!timeStr) continue
      const dt = new Date(timeStr)
      const date = dt.toISOString().slice(0, 10)
      const get = (newKey: string, oldKey: string): number | undefined => {
        const flat = entry.data?.[newKey]
        if (flat !== undefined) return flat
        return entry.parameters?.find((p) => p.name === oldKey)?.values[0]
      }
      const t = get('air_temperature', 't')
      if (t === undefined) continue
      let bucket = byDate.get(date)
      if (!bucket) {
        bucket = { temps: [], symbols: [], precip: [] }
        byDate.set(date, bucket)
      }
      bucket.temps.push(t)
      const symbol = get('symbol_code', 'Wsymb2')
      if (symbol !== undefined) bucket.symbols.push(symbol)
      const pmean = get('precipitation_amount_mean', 'pmean')
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
  } catch (err) {
    console.warn('SMHI-prognos: kunde inte hämta/tolka svaret', err)
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
