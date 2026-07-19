/** Sparad parkeringsposition för Frostvakten. */

export interface ParkedPosition {
  lat: number
  lon: number
  /** Unix-tid i ms när positionen sparades */
  time: number
  /** Frivilligt namn, t.ex. "Ställplats Mora" */
  label?: string
}

const KEY = 'tomningskartan:parked'

export function loadParked(): ParkedPosition | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ParkedPosition) : null
  } catch {
    return null
  }
}

export function saveParked(pos: ParkedPosition): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pos))
  } catch {
    // localStorage otillgänglig – positionen gäller bara sessionen
  }
}

export function clearParked(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // se ovan
  }
}
