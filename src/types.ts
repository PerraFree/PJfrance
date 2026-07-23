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
  fee?: string
  openingHours?: string
  osmUrl?: string
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
