export type ServiceType =
  | 'gravatten'
  | 'latrin'
  | 'vatten'
  | 'stallplats'
  | 'camping'
  | 'gasol'

export interface Station {
  id: string
  name: string
  lat: number
  lon: number
  services: ServiceType[]
  /**
   * 'osm' = OpenStreetMap, 'egen' = eget register,
   * 'trafikverket' = Trafikverkets rastplatser, 'kommun' = kommunal webbsida,
   * 'community' = inskickad av användare (crowdsourcing)
   */
  source: 'osm' | 'egen' | 'trafikverket' | 'kommun' | 'community'
  description?: string
  address?: string
  fee?: string
  openingHours?: string
  osmUrl?: string
  /** Nycklar ur FACILITY_LABELS – exakt vad som finns på platsen. */
  facilities?: string[]
  capacity?: string
  maxstay?: string
  payment?: string[]
  operator?: string
  phone?: string
  website?: string
  /** 'year-round' = öppet året runt, 'seasonal' = säsongsöppet, annars okänt. */
  season?: 'year-round' | 'seasonal'
}

/** Allt appen kan visa "finns här" – nycklar matchar det synkskriptet plockar ur OSM. */
export const FACILITY_LABELS: Record<string, string> = {
  gravatten_tomning: 'Gråvattentömning',
  kassett_tomning: 'Kassett-/latrintömning',
  svartvatten_tomning: 'Svartvattentömning',
  dricksvatten: 'Dricksvatten',
  el: 'El/ström',
  dusch: 'Dusch',
  wc: 'Toalett',
  tvatt: 'Tvätt',
  avfall: 'Sopor/avfall',
  wifi: 'Wifi',
  hund: 'Hundar tillåtna',
  grill: 'Grill/eldplats',
  lekplats: 'Lekplats',
  restaurang: 'Restaurang',
  butik: 'Butik/kiosk',
  belyst: 'Belyst',
  tillganglig: 'Tillgänglig',
  husbil: 'Husbil',
  husvagn: 'Husvagn',
  talt: 'Tält',
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  gravatten: 'Gråvatten',
  latrin: 'Latrin/toalett',
  vatten: 'Färskvatten',
  stallplats: 'Ställplats',
  camping: 'Camping',
  gasol: 'Gasol/LPG',
}

/**
 * En enda källa för kategorifärgerna (speglas i CSS-variablerna --gravatten
 * m.fl. i styles.css). Alla klarar WCAG AA (≥4.5:1) med vit text på badge/pin.
 */
export const SERVICE_COLORS: Record<ServiceType, string> = {
  gravatten: '#6d4c41',
  latrin: '#7b1fa2',
  vatten: '#01659b',
  stallplats: '#c14a00',
  camping: '#00695c',
  gasol: '#c62828',
}
