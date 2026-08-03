import type { Station } from '../types'

/**
 * Egna platser som användaren själv lagt till. Sparas lokalt i webbläsaren
 * och visas direkt på kartan (source 'egen'). Ingen backend – funkar offline.
 */
const KEY = 'tomningskartan.myplaces'

export function loadMyPlaces(): Station[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (x) =>
        x &&
        typeof x.lat === 'number' &&
        typeof x.lon === 'number' &&
        Array.isArray(x.services) &&
        x.services.length > 0,
    )
  } catch {
    return []
  }
}

export function saveMyPlaces(list: Station[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* privat läge / fullt lager */
  }
}

/** Prefix som skiljer användarens egna, raderbara platser från andra 'egen'-poster. */
export const MY_PLACE_PREFIX = 'egen-local-'
