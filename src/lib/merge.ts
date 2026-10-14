// Sammanslagning av samma plats från flera källor (Pers 100 m-regel) och
// "Gratis"-regeln. EN delad källa: appen (App.tsx) och SEO-sidorna
// (scripts/build-seo-pages.mjs, via esbuild) använder exakt samma kod – förut
// hade generatorn en egen kopia som visade obekräftade tjänster som gröna
// (granskning 7, 12 okt 2026). Ändra bara här.
import type { ServiceType, Station } from '../types'
import { isGenericName } from './naming'

// "Gratis" = gratis för den som kör förbi. Förut räckte ordet "gratis" eller
// "ingår" var som helst i texten, så "Gratis för gäster; genomresande 60 kr"
// och "Ingår i campingavgiften" hamnade i filtret – 87 betalplatser
// (granskning 12 okt 2026). Nu krävs ett gratisord utan villkor och utan pris.
const FREE_RE = /gratis|kostnadsfri|utan avgift|avgiftsfri|\bfree\b/i
const FREE_QUALIFIED_RE =
  /(för|bara|endast)\s+(boende\s+|betalande\s+|egna\s+)?(camping|ställplats|båt|natt|hamn)?-?\s*(gäster|gäst|medlemmar|kunder|boende)|greenfee|för\s+gäs|med\s+(camping|övernatt)/i
const PAID_RE = /\d\s*(kr|sek|:-|€|eur)\b|betala|swish|kontant|kortbetal|motstridig|\d+:e natten|avgift i/i
export function isFreeFee(fee: string): boolean {
  return FREE_RE.test(fee) && !FREE_QUALIFIED_RE.test(fee) && !PAID_RE.test(fee)
}
/** Platser som fått tjänster från en granne vars avgift är okänd eller inte
 *  gratis (t.ex. en betald ställplats intill en Trafikverket-rastplats) –
 *  de räknas aldrig som gratis (granskning 12 okt 2026). */
export function isFree(s: Station): boolean {
  if (s.notFree) return false
  // Gasol är alltid ett köp – en plats som bara säljer gasol kan aldrig
  // räknas som gratis, oavsett vad avgiftsfältet råkar säga.
  if (!s.services.some((sv) => sv !== 'gasol')) return false
  return s.source === 'trafikverket' || (s.fee ? isFreeFee(s.fee) : false)
}

/** Platser som bara säljer gasol är butiker – de ska aldrig slås ihop med
 *  tömningsplatser/ställplatser intill, annars smittar tjänster och avgifter
 *  mellan olika verksamheter ("gratis gasol"-buggen). */
const isCurated = (s: Station) => s.id.startsWith('curated-')

/** Samma gasolbutik? Samma första ord i namnet (utan "Gasol –"), eller samma
 *  punkt (≤ 15 m) när den ena saknar riktigt namn. Två namngivna butiker i
 *  samma byggnad (Elgiganten + jem & fix) är olika ställen. */
const shopWord = (n: string) =>
  n.toLowerCase().replace(/^gasol\s*[–-]\s*/, '').replace(/[^a-zåäö0-9 ]/g, ' ').trim().split(/\s+/)[0] ?? ''
function sameGasolShop(a: Station, b: Station): boolean {
  if (shopWord(a.name) !== '' && shopWord(a.name) === shopWord(b.name)) return true
  // Registret + OSM inom 30 m = samma butik under olika namn (Gasol Depån /
  // Gasoldepån i Sundsvall) – registret ska vinna, inte bli två nålar.
  // Namnregeln ovan gäller bara mellan två registerposter (granskning 12 okt 2026).
  if ((isCurated(a) !== isCurated(b)) && distMeters(a, b) <= 30) return true
  return distMeters(a, b) <= 15 && (isGenericName(a.name) || isGenericName(b.name))
}

function gasolOnly(s: Station): boolean {
  return s.services.length > 0 && s.services.every((sv) => sv === 'gasol')
}

const SOURCE_PRIORITY: Record<Station['source'], number> = {
  egen: 0,
  kommun: 1,
  trafikverket: 2,
  community: 3,
  osm: 4,
}

/** Meter mellan två punkter (haversine). */
export function distMeters(a: Station, b: Station): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

const MERGE_FIELDS: (keyof Station)[] = [
  'image',
  'address',
  'fee',
  'gasolPrice',
  'openingHours',
  'operator',
  'phone',
  'website',
  'capacity',
  'maxstay',
  'description',
  'payment',
  'osmUrl',
  'season',
  'confidence',
]

/** Fyller på det som redan behållits (högre prioritet) med det som saknas från en dubblett.
 *  `fillOnly`: dubbletten (t.ex. en ren dricksvattennod från live-hämtningen)
 *  får bara fylla på – den kan aldrig bekräfta en tjänst målet själv
 *  markerat som obekräftad. */
/** Registerpostens EGNA obekräftade tjänster, låsta när kopian skapas i dedupe.
 *  Räknades förut om vid varje sammanslagning och tog då med tjänster som
 *  ärvts från tidigare grannar – ordningen avgjorde om en tjänst blev grå eller
 *  grön (granskning 12 okt 2026). */
const LOCKED_UNVERIFIED = new WeakMap<Station, ServiceType[]>()

function mergeInto(target: Station, s: Station, fillOnly = false): void {
  // Trafikverkets rastplatser tar bara kassett. En OSM-tömningsnod vid en
  // rastplats får gråvatten av OSM:s standardtolkning – det stryks här om inte
  // noden UTTRYCKLIGEN säger gråvatten (facilities gravatten_tomning).
  // 56 av 298 rastplatser fick annars felaktigt gråvatten (granskning 12 okt 2026).
  const tvPair =
    (target.source === 'trafikverket' && s.source === 'osm') || (s.source === 'trafikverket' && target.source === 'osm')
  if (tvPair) {
    const explicit = (x: Station) => x.facilities?.includes('gravatten_tomning') ?? false
    // Bara rena tömningsnoder – en egen ställplats/camping intill rastplatsen
    // kan ha riktig gråvattentömning (Hammarsundet, Polarcirkeln).
    const overnightPlace = (x: Station) => x.services.some((v) => v === 'stallplats' || v === 'camping')
    if (s.source === 'osm' && !explicit(s) && !overnightPlace(s) && s.services.includes('gravatten')) {
      s = { ...s, services: s.services.filter((x) => x !== 'gravatten') }
    }
    if (target.source === 'osm' && !explicit(target) && !overnightPlace(target)) {
      target.services = target.services.filter((x) => x !== 'gravatten')
    }
  }
  // Registrets (egen/kommun, högst prioritet) egna obekräftade tjänster
  // förblir obekräftade – en lägre prioriterad källa får inte göra dem gröna.
  // En fyll-på-dubblett får dessutom aldrig bekräfta något som målet just nu
  // har som obekräftat.
  const ownUnverified = target.unverified
    ? []
    : [
        ...new Set([
          ...(LOCKED_UNVERIFIED.get(target) ?? []),
          ...(fillOnly ? (target.unverifiedServices ?? []).filter((x) => !target.services.includes(x)) : []),
        ]),
      ]
  // Avgiften ärvs bara när grannen är "samma sorts" plats: dess tjänster är
  // en delmängd av målets bekräftade, och är målet en övernattningsplats
  // (camping/ställplats) måste grannen också vara det. Annars får t.ex. en
  // camping utan avgiftsuppgift tömningsnodens "Gratis" intill och hamnar
  // fel i filtret "Gratis" (Lindesbergs citycamping m.fl.).
  const overnight = (x: Station) => x.services.some((sv) => sv === 'camping' || sv === 'stallplats')
  const inheritFee =
    s.services.every((x) => target.services.includes(x)) && (!overnight(target) || overnight(s))
  // Ett riktigt namn slår alltid ett generiskt ("Tömningsstation"): en
  // namnlös tömningsnod 70 m från "Ställplats Skeda Strand" ska heta Skeda
  // Strand, inte "Tömningsstation" (Pers fältrapport sep 2026).
  // Ett av synken härlett namn ("Sopstation vid Venjans Camping",
  // nameFrom 'nearby') slår inte grannens eget namn (granskning 8). Bara
  // synkens markering räknas – registrets egna "X vid Y"-namn vinner alltid.
  const weak = (x: Station) => isGenericName(x.name) || x.nameFrom === 'nearby'
  if (weak(target) && !weak(s)) {
    if (!target.description && isGenericName(target.name)) target.description = target.name
    target.name = s.name
    target.nameFrom = s.nameFrom
  }
  // Tjänster som grannen tillför målet. Är grannens avgift okänd eller inte
  // gratis blir målet aldrig "Gratis" (Polarcirkeln 180 kr + rastplats).
  const added = s.services.filter((x) => !target.services.includes(x))
  const paidNeighbour = s.fee ? !isFreeFee(s.fee) : added.some((x) => x === 'stallplats' || x === 'camping' || x === 'atervinning')
  // Rastplatsens egen husbilsparkering (OSM utan avgift) är inte en betald
  // granne – bara en uttrycklig avgift gör en rastplats "inte gratis".
  const tvOwnParking = target.source === 'trafikverket' && s.source === 'osm' && !s.fee && added.every((x) => x === 'stallplats')
  if (added.length && s.source !== 'trafikverket' && paidNeighbour && !tvOwnParking) target.notFree = true
  if (fillOnly && target.unverified) {
    // En ren dricksvattennod (live-hämtningen) får aldrig göra en obekräftad
    // plats grön – dess vatten blir bara påstått (granskning 12 okt 2026).
    target.unverifiedServices = [...new Set([...(target.unverifiedServices ?? []), ...s.services])]
  } else if (s.unverified && !target.unverified) {
    // En obekräftad dubblett får aldrig "smitta" en bekräftad post: dess
    // tjänster blir bara påstådda på den bekräftade platsen.
    target.unverifiedServices = [
      ...new Set([...(target.unverifiedServices ?? []), ...s.services, ...(s.unverifiedServices ?? [])]),
    ]
  } else if (target.unverified && !s.unverified) {
    // Den bekräftade dubbletten tar över: dess tjänster blir de bekräftade,
    // målets egna blir bara påstådda. Id/namn behålls så favoriter och
    // bekräftelser inte tappas.
    const claimed = [...target.services, ...(target.unverifiedServices ?? []), ...(s.unverifiedServices ?? [])]
    target.services = [...s.services]
    target.unverified = undefined
    target.unverifiedServices = [...new Set(claimed)]
  } else {
    target.services = [...new Set([...target.services, ...s.services])]
    if (s.unverifiedServices?.length) {
      target.unverifiedServices = [
        ...new Set([...(target.unverifiedServices ?? []), ...s.unverifiedServices]),
      ]
    }
  }
  if (ownUnverified.length) {
    // Registret vinner: dess obekräftade tjänster förblir grå.
    target.services = target.services.filter((x) => !ownUnverified.includes(x))
    target.unverifiedServices = [...new Set([...(target.unverifiedServices ?? []), ...ownUnverified])]
  }
  if (target.unverifiedServices) {
    // Påstådda tjänster som nu är bekräftade behövs inte i listan längre.
    const rest = target.unverifiedServices.filter((x) => !target.services.includes(x))
    target.unverifiedServices = rest.length ? rest : undefined
  }
  // Registrets gasoltyper vinner: anger registret byte/påfyllning får en
  // OSM-granne inte lägga till den andra (Storfors fick 'byt tub' från OSM:s
  // automatiska shop=gas-tolkning – granskning 12 okt 2026).
  const regGas = isCurated(target) && (target.facilities ?? []).some((f) => f.startsWith('gasol_'))
  const sFac = (s.facilities ?? []).filter((f) => !(regGas && f.startsWith('gasol_')))
  const fac = [...new Set([...(target.facilities ?? []), ...sFac])]
  target.facilities = fac.length ? fac : undefined
  for (const k of MERGE_FIELDS) {
    // Avgift, säsong och öppettider ärvs bara från samma sorts plats – annars
    // fick t.ex. Grännastrandens Camping tömningsnodens "24/7, året runt"
    // och hamnade fel i filtret "Året runt" (granskning 12 okt 2026).
    if ((k === 'fee' || k === 'season' || k === 'openingHours') && !inheritFee) continue
    if (target[k] == null && s[k] != null) (target[k] as unknown) = s[k]
  }
}

/**
 * Slår ihop stationer som ligger inom ~100 m av varandra – oavsett om de
 * hamnar i samma rutnätscell – så att samma fysiska plats bara får en pin.
 * Mer tillförlitliga källor vinner och kompletteras med detaljer från övriga.
 */
export function dedupe(
  stations: Station[],
  /** Ordning INOM samma källprioritet (lägre först). Sorteringen är stabil,
   *  så lika rang behåller indatans ordning. */
  rank: (s: Station) => number = () => 0,
  /** Dubbletter som bara får fylla på (se mergeInto). */
  isFillOnly: (s: Station) => boolean = () => false,
  /** Anropas efter varje sammanslagning (SEO-sidorna samlar källorna). */
  onMerge?: (kept: Station, merged: Station) => void,
): Station[] {
  const sorted = [...stations].sort(
    (a, b) =>
      (SOURCE_PRIORITY[a.source] ?? 9) - (SOURCE_PRIORITY[b.source] ?? 9) || rank(a) - rank(b),
  )
  const CELL = 0.003 // ~200–330 m; grannceller täcker 100 m-radien
  const grid = new Map<string, Station[]>()
  const kept: Station[] = []
  for (const s of sorted) {
    const cx = Math.round(s.lat / CELL)
    const cy = Math.round(s.lon / CELL)
    let merged = false
    for (let dx = -1; dx <= 1 && !merged; dx++) {
      for (let dy = -1; dy <= 1 && !merged; dy++) {
        const bucket = grid.get(`${cx + dx},${cy + dy}`)
        if (!bucket) continue
        for (const ex of bucket) {
          // distinct = registrets uttryckliga undantag från 100 m-regeln: två
          // REGISTERposter där någon har distinct slås inte ihop (samma regel
          // som check-register.mjs). OSM-kopior av platsen slås ihop som vanligt.
          if (
            distMeters(ex, s) <= 100 &&
            gasolOnly(ex) === gasolOnly(s) &&
            !(isCurated(ex) && isCurated(s) && (ex.distinct || s.distinct)) &&
            // Två olika gasolbutiker i samma handelsområde är inte samma plats
            // (ÖoB fick automatens pris och öppettider) – bara samma butik
            // eller samma punkt slås ihop (granskning 12 okt 2026).
            !(gasolOnly(ex) && !sameGasolShop(ex, s))
          ) {
            mergeInto(ex, s, isFillOnly(s))
            onMerge?.(ex, s)
            merged = true
            break
          }
        }
      }
    }
    if (!merged) {
      const copy: Station = {
        ...s,
        services: [...s.services],
        facilities: s.facilities ? [...s.facilities] : undefined,
      }
      if (!copy.unverified && (copy.source === 'egen' || copy.source === 'kommun')) {
        const own = (copy.unverifiedServices ?? []).filter((x) => !copy.services.includes(x))
        if (own.length) LOCKED_UNVERIFIED.set(copy, own)
      }
      const key = `${cx},${cy}`
      const bucket = grid.get(key)
      if (bucket) bucket.push(copy)
      else grid.set(key, [copy])
      kept.push(copy)
    }
  }
  return kept
}
