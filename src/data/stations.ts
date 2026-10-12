import type { Station } from '../types'

/**
 * Hårdkodade platser i appen. Tom med flit: allt eget ligger i registret
 * (scripts/curated-places.json) med källa, id-regler och förlustvakter.
 * De två gamla posterna härifrån togs bort 12 okt 2026 (granskning 8):
 * "Ställplats Nynäshamns gästhamn" (registret har tagit bort gästhamnen –
 * båttömning, kommunen: olämplig för husbilar) och "Circle K Gnesta" (ingen
 * källa). Lägg inte till platser här – använd registret.
 */
export const OWN_STATIONS: Station[] = []
