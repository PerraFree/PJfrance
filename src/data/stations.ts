import type { Station } from '../types'

/**
 * Eget register: platser som inte finns (eller är dåligt taggade) i OpenStreetMap.
 * Lägg till nya platser här tills ett admin-gränssnitt/backend finns.
 */
export const OWN_STATIONS: Station[] = [
  {
    id: 'egen-1',
    name: 'Ställplats Nynäshamns gästhamn',
    lat: 58.9036,
    lon: 17.9481,
    services: ['gravatten', 'latrin', 'vatten'],
    source: 'egen',
    description: 'Ställplats med servicehus, latrintömning och färskvatten.',
    fee: 'Avgift ingår i ställplatsavgiften',
  },
  {
    id: 'egen-2',
    name: 'Circle K Gnesta – husbilsservice',
    lat: 59.048,
    lon: 17.3078,
    services: ['gravatten', 'latrin', 'vatten'],
    source: 'egen',
    description: 'Tömningsstation för husbil vid drivmedelsstation.',
  },
]
