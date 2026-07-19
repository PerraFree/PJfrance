export type ServiceType = 'gravatten' | 'latrin' | 'vatten'

export interface Station {
  id: string
  name: string
  lat: number
  lon: number
  services: ServiceType[]
  /** 'osm' = hämtad från OpenStreetMap, 'egen' = eget register */
  source: 'osm' | 'egen'
  description?: string
  fee?: string
  openingHours?: string
  osmUrl?: string
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  gravatten: 'Gråvatten',
  latrin: 'Latrin/toalett',
  vatten: 'Färskvatten',
}

export const SERVICE_COLORS: Record<ServiceType, string> = {
  gravatten: '#6d4c41',
  latrin: '#7b1fa2',
  vatten: '#0277bd',
}
