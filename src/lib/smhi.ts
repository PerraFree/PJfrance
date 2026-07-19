/** SMHI:s öppna punktprognos-API (pmp3g). Täcker Sverige/Norden, ingen nyckel krävs. */

const SMHI_BASE =
  'https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point'

export interface ForecastHour {
  time: Date
  /** Temperatur °C */
  temp: number
  /** Medelvind m/s */
  wind: number
  /** Byvind m/s */
  gust: number
  /** SMHI:s vädersymbol Wsymb2 (1 = klart … 27 = kraftigt snöfall) */
  symbol: number
}

export async function fetchForecast(lat: number, lon: number): Promise<ForecastHour[]> {
  // SMHI kräver max 6 decimaler i koordinaterna
  const la = lat.toFixed(6)
  const lo = lon.toFixed(6)
  const res = await fetch(`${SMHI_BASE}/lon/${lo}/lat/${la}/data.json`)
  if (!res.ok) throw new Error(`SMHI svarade ${res.status}`)
  const json = (await res.json()) as {
    timeSeries: { validTime: string; parameters: { name: string; values: number[] }[] }[]
  }
  return json.timeSeries.map((ts) => {
    const p = (name: string) =>
      ts.parameters.find((x) => x.name === name)?.values[0] ?? NaN
    return {
      time: new Date(ts.validTime),
      temp: p('t'),
      wind: p('ws'),
      gust: p('gust'),
      symbol: p('Wsymb2'),
    }
  })
}

/** Kraftigaste byvinden per dygn de närmaste dagarna. */
export function maxGustPerDay(
  forecast: ForecastHour[],
  days = 3,
): { date: Date; gust: number; wind: number }[] {
  const byDay = new Map<string, { date: Date; gust: number; wind: number }>()
  const limit = Date.now() + days * 24 * 3600 * 1000
  for (const h of forecast) {
    if (h.time.getTime() > limit) continue
    const key = h.time.toISOString().slice(0, 10)
    const cur = byDay.get(key)
    if (!cur || h.gust > cur.gust) {
      byDay.set(key, { date: h.time, gust: h.gust, wind: h.wind })
    }
  }
  return [...byDay.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Lägsta natt-temperatur (kl. 18–08) per natt de närmaste nätterna. */
export function minNightTemps(
  forecast: ForecastHour[],
  nights = 3,
): { date: Date; temp: number }[] {
  const byNight = new Map<string, { date: Date; temp: number }>()
  const limit = Date.now() + nights * 24 * 3600 * 1000
  for (const h of forecast) {
    if (h.time.getTime() > limit) continue
    const hour = h.time.getHours()
    if (hour >= 8 && hour < 18) continue
    // Natten 18:00–08:00 räknas till dagen den börjar
    const nightStart = new Date(h.time)
    if (hour < 8) nightStart.setDate(nightStart.getDate() - 1)
    const key = nightStart.toISOString().slice(0, 10)
    const cur = byNight.get(key)
    if (!cur || h.temp < cur.temp) byNight.set(key, { date: h.time, temp: h.temp })
  }
  return [...byNight.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Solpoäng 0–1 för dagtid (kl. 9–18) de närmaste 48 timmarna.
 * Wsymb2 1–2 = sol, 3–4 = halvklart, övrigt = 0 poäng.
 */
export function sunScore(forecast: ForecastHour[]): number {
  const limit = Date.now() + 48 * 3600 * 1000
  let score = 0
  let count = 0
  for (const h of forecast) {
    if (h.time.getTime() > limit) continue
    const hour = h.time.getHours()
    if (hour < 9 || hour >= 18) continue
    count++
    if (h.symbol <= 2) score += 1
    else if (h.symbol <= 4) score += 0.5
  }
  return count === 0 ? 0 : score / count
}
