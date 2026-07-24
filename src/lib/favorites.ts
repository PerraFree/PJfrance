/**
 * Favoritplatser sparas lokalt i webbläsaren (localStorage). Ingen backend –
 * fungerar även offline och i native-appen.
 */
const KEY = 'tomningskartan.favorites'

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

export function saveFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...favorites]))
  } catch {
    /* privat läge m.m. */
  }
}
