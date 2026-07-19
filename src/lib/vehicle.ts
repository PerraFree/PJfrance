/** Fordonsprofil – sparas lokalt i webbläsaren och används av verktygen. */

export interface VehicleProfile {
  /** Total höjd i meter (inkl. takbox/antenn). */
  height: number
  /** Totalvikt i ton. */
  weight: number
  /** Axelavstånd i meter (för vattenpassets kil-beräkning). */
  wheelbase: number
  /** Spårvidd i meter (för vattenpassets kil-beräkning). */
  track: number
}

const KEY = 'tomningskartan:vehicle'

export const DEFAULT_VEHICLE: VehicleProfile = {
  height: 3.0,
  weight: 3.5,
  wheelbase: 3.8,
  track: 1.9,
}

export function loadVehicle(): VehicleProfile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_VEHICLE
    return { ...DEFAULT_VEHICLE, ...(JSON.parse(raw) as Partial<VehicleProfile>) }
  } catch {
    return DEFAULT_VEHICLE
  }
}

export function saveVehicle(profile: VehicleProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // localStorage kan vara avstängd (privat läge) – profilen gäller då bara sessionen
  }
}
