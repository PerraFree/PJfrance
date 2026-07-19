import { fetchForecast, sunScore } from './smhi'

/** En provpunkt i solchans-sökningen. */
export interface SunSpot {
  lat: number
  lon: number
  /** 0–1: andel soltimmar dagtid närmaste 48 h */
  score: number
}

/**
 * Provar vädret i en ring av punkter runt en mittpunkt ("var blir det sol
 * inom körbart avstånd?"). SMHI:s prognos täcker Norden, så punkter utanför
 * täckningen svarar med fel och hoppas över.
 */
export async function findSun(lat: number, lon: number): Promise<SunSpot[]> {
  const points: { lat: number; lon: number }[] = [{ lat, lon }]
  // Ringar på ca 60 och 130 km – ungefär 1 respektive 2 timmars körning
  for (const radiusKm of [60, 130]) {
    const n = 8
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n
      const dLat = (radiusKm / 111) * Math.cos(angle)
      const dLon =
        (radiusKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle)
      points.push({ lat: lat + dLat, lon: lon + dLon })
    }
  }
  const results = await Promise.allSettled(
    points.map(async (p) => {
      const forecast = await fetchForecast(p.lat, p.lon)
      return { ...p, score: sunScore(forecast) }
    }),
  )
  return results
    .filter((r): r is PromiseFulfilledResult<SunSpot> => r.status === 'fulfilled')
    .map((r) => r.value)
}
