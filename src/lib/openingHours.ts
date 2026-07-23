export type OpenState = 'open' | 'closed' | 'unknown'

/**
 * Bästa-möjliga bedömning av om en plats är öppen just nu utifrån OSM:s
 * opening_hours-sträng. opening_hours-biblioteket (~110 kB gzippat) lat-laddas
 * dynamiskt först när en popup med öppettider faktiskt öppnas – aldrig vid
 * appstart. Returnerar 'unknown' om strängen saknas/inte går att tolka.
 */
export async function openNow(value: string | undefined): Promise<OpenState> {
  if (!value) return 'unknown'
  if (value === '24/7') return 'open'
  try {
    const { default: OpeningHours } = await import('opening_hours')
    const oh = new OpeningHours(value, {
      lat: 62,
      lon: 15,
      address: { country_code: 'se', state: '' },
    })
    return oh.getState() ? 'open' : 'closed'
  } catch {
    return 'unknown'
  }
}
