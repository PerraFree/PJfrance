export type ServiceType =
  | 'gravatten'
  | 'latrin'
  | 'vatten'
  | 'stallplats'
  | 'camping'
  | 'gasol'

/** Extra bekvämligheter, mest relevanta för ställplatser/campingar. */
export interface Amenities {
  el?: boolean
  dusch?: boolean
  wc?: boolean
  wifi?: boolean
  hund?: boolean
}

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
  amenities?: Amenities
  capacity?: string
  operator?: string
  phone?: string
  website?: string
}

export const AMENITY_LABELS: Record<keyof Amenities, string> = {
  el: '🔌 El',
  dusch: '🚿 Dusch',
  wc: '🚻 WC',
  wifi: '📶 Wifi',
  hund: '🐕 Hund ok',
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  gravatten: 'Gråvatten',
  latrin: 'Latrin/toalett',
  vatten: 'Färskvatten',
  stallplats: 'Ställplats',
  camping: 'Camping',
  gasol: 'Gasol/LPG',
}

export const SERVICE_COLORS: Record<ServiceType, string> = {
  gravatten: '#6d4c41',
  latrin: '#7b1fa2',
  vatten: '#0277bd',
  stallplats: '#e65100',
  camping: '#00695c',
  gasol: '#c62828',
}
