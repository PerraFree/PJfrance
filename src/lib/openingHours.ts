import OpeningHours from 'opening_hours'

export type OpenState = 'open' | 'closed' | 'unknown'

/**
 * Bästa-möjliga bedömning av om en plats är öppen just nu utifrån OSM:s
 * opening_hours-sträng. Returnerar 'unknown' om strängen saknas eller inte
 * går att tolka (t.ex. fritext), så vi aldrig påstår något felaktigt.
 */
export function openNow(value: string | undefined): OpenState {
  if (!value) return 'unknown'
  if (value === '24/7') return 'open'
  try {
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
