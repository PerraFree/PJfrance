export type ServiceType =
  | 'gravatten'
  | 'latrin'
  | 'vatten'
  | 'sopor'
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
  /** Foto av platsen (https-URL), t.ex. från OSM:s image/wikimedia_commons-taggar. */
  image?: string
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
  // Gasol: två olika sorters "tanka" – viktigt att skilja på för husbilsägare
  // (de flesta husbilar har löstagbara gasoltuber, inte en fast tank).
  gasol_byte: 'Byt gasoltub (automat/butik)',
  gasol_pafyllning: 'Fyll på gasoltub/fast tank',
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  gravatten: 'Gråvatten',
  latrin: 'Latrin',
  vatten: 'Färskvatten',
  sopor: 'Sopor',
  stallplats: 'Ställplats',
  camping: 'Camping',
  gasol: 'Gasol/LPG',
}

/**
 * En enda källa för kategorifärgerna (speglas i CSS-variablerna --gravatten
 * m.fl. i styles.css). Alla klarar WCAG AA (≥4.5:1) med vit text på badge/pin.
 */
/** Liten symbol per platstyp – visas i kartnålen och i popup-badgen så att
 *  platserna går att känna igen direkt på kartan. */
export const SERVICE_ICONS: Record<ServiceType, string> = {
  gravatten: '🚱',
  latrin: '🚽',
  vatten: '🚰',
  sopor: '🗑',
  stallplats: '🚐',
  camping: '⛺',
  gasol: '🔥',
}

export const SERVICE_COLORS: Record<ServiceType, string> = {
  gravatten: '#6d4c41',
  latrin: '#7b1fa2',
  vatten: '#01659b',
  sopor: '#455a64',
  stallplats: '#c14a00',
  camping: '#00695c',
  gasol: '#c62828',
}

/**
 * Gasol: byt tub vs. fyll på egen flaska – EN källa för ikon/färg/klassning
 * så att MapView (kartnål/badge) och App (filterknappar/antal) alltid är
 * överens. Se CLAUDE.md ("Gasol: byte vs. påfyllning").
 */
export type GasolFacility = 'gasol_byte' | 'gasol_pafyllning'
export const GASOL_BYTE_ICON = '🔥'
export const GASOL_PAFYLLNING_ICON = '⛽'
export const GASOL_BYTE_COLOR = SERVICE_COLORS.gasol // röd, som gasol i övrigt
// Mörkblått – maximalt åtskilt från rött (funkar även för röd-grön-färgblinda),
// till skillnad från det första försöket (vinrött #ad1457 som fortfarande lästes som rött.
export const GASOL_PAFYLLNING_COLOR = '#1a237e'

/** Byte/påfyllning för en plats, med "okänt räknas som byte"-fallback
 *  (de flesta gasolplatser är byte; bara ~1,5% saknar facilities-data). */
export function gasolFacilityStatus(station: Pick<Station, 'facilities'>): {
  byte: boolean
  pafyllning: boolean
} {
  const f = station.facilities ?? []
  const byte = f.includes('gasol_byte')
  const pafyllning = f.includes('gasol_pafyllning')
  if (!byte && !pafyllning) return { byte: true, pafyllning: false }
  return { byte, pafyllning }
}

/** Räknas tjänsten som "på" för den här platsen med nuvarande filter? Gasol
 *  är extra kräsen – 'gasol' måste vara valt OCH platsens byte/påfyllning
 *  måste matcha någon av de valda gasol-underkategorierna. Delad mellan
 *  App.tsx (antal/tomt-läge) och MapView.tsx (vilka nålar som ritas). */
export function serviceIsActive(
  station: Pick<Station, 'facilities'>,
  service: ServiceType,
  active: Set<ServiceType>,
  gasolFacilities: Set<GasolFacility>,
): boolean {
  if (service !== 'gasol') return active.has(service)
  if (!active.has('gasol')) return false
  const { byte, pafyllning } = gasolFacilityStatus(station)
  return (byte && gasolFacilities.has('gasol_byte')) || (pafyllning && gasolFacilities.has('gasol_pafyllning'))
}
