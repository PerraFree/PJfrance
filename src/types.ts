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
  /** Pris för gasol (byte tom→full och/eller påfyllning kr/kg), t.ex.
   *  "Byte P11 449 kr, PC10 499 kr (sep 2026)". Eget fält – blandas inte
   *  ihop med `fee` som gäller tömning/ställplats. */
  gasolPrice?: string
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
  /**
   * Hela platsen är obekräftad: uppgiften kommer bara från användarsajter
   * (husbilsplats.se, park4night, aggregatorer) utan primärkälla. Visas med
   * grå nål och "Obekräftad"-märkning så användarna kan bekräfta på plats.
   * Beslut sep 2026: hellre visa grått än dölja helt (se CLAUDE.md).
   */
  unverified?: boolean
  /**
   * Tjänster som PÅSTÅS finnas (bara svaga källor) utöver de bekräftade i
   * `services`. Platsen hittas när man filtrerar på dem, men nålen blir grå
   * om det är enda anledningen till att den visas.
   */
  unverifiedServices?: ServiceType[]
  /**
   * Hur säker källan är (visas i popupen, viktigt för gasolpåfyllning):
   * 'high' = operatörens egen webbplats/kommunen säger det uttryckligen,
   * 'medium' = branschlista (t.ex. Energigas Sverige, Kosan) eller två
   * oberoende källor, 'low' = bara forum/aggregator/extern guide.
   */
  confidence?: 'high' | 'medium' | 'low'
  /** Kommun (närmaste kommuncentrum enligt OSM, sätts av synken) – används för SEO-sidorna. */
  kommun?: string
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

/** Grå nål/badge för obekräftade platser och tjänster (≥4.5:1 med vit text). */
export const UNVERIFIED_COLOR = '#616161'

/** Bara de påstådda tjänster som inte redan är bekräftade. */
export function unverifiedServicesOf(
  station: Pick<Station, 'services' | 'unverifiedServices'>,
): ServiceType[] {
  return (station.unverifiedServices ?? []).filter((s) => !station.services.includes(s))
}

/**
 * Vilken tjänst nålen ska visa med nuvarande filter, och om den är
 * obekräftad. Bekräftade tjänster vinner alltid; en obekräftad tjänst
 * används bara när det är ENDA skälet till att platsen visas. Delad mellan
 * MapView (nål), App (antal) och NearestList (listan).
 */
export function primaryActiveService(
  station: Pick<Station, 'services' | 'facilities' | 'unverified' | 'unverifiedServices'>,
  active: Set<ServiceType>,
  gasolFacilities: Set<GasolFacility>,
): { service: ServiceType; unverified: boolean } | null {
  const verified = station.services.find((s) => serviceIsActive(station, s, active, gasolFacilities))
  if (verified) return { service: verified, unverified: station.unverified === true }
  const claimed = unverifiedServicesOf(station).find((s) =>
    serviceIsActive(station, s, active, gasolFacilities),
  )
  return claimed ? { service: claimed, unverified: true } : null
}

/** Ska platsen visas alls med nuvarande filter? (bekräftade eller påstådda tjänster) */
export function stationIsActive(
  station: Pick<Station, 'services' | 'facilities' | 'unverified' | 'unverifiedServices'>,
  active: Set<ServiceType>,
  gasolFacilities: Set<GasolFacility>,
): boolean {
  return primaryActiveService(station, active, gasolFacilities) !== null
}
