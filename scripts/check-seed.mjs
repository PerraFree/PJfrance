#!/usr/bin/env node
// Kontroll av public/data/stations-seed.json före publicering (deploy.yml).
// Stoppar deployen (exit 1) om seeden ser trasig ut: för få platser per källa,
// registerposter som saknas i stor mängd, ogiltiga koordinater eller tjänster,
// dubbla id. Golven är medvetet låga – de ska fånga haverier, inte variation
// (OSM pendlar 4 400–4 600 beroende på vilken Overpass-spegel som svarade).
import { readFileSync } from 'node:fs'

const seed = JSON.parse(readFileSync(new URL('../public/data/stations-seed.json', import.meta.url), 'utf8'))
const reg = JSON.parse(readFileSync(new URL('./curated-places.json', import.meta.url), 'utf8'))
const st = seed.stations ?? seed
const SERVICES = new Set(['gravatten', 'latrin', 'vatten', 'sopor', 'atervinning', 'stallplats', 'camping', 'gasol'])
const errors = []
const warnings = []
const by = (src) => st.filter((s) => s.source === src).length
const curated = st.filter((s) => String(s.id).startsWith('curated-')).length

if (!Array.isArray(st)) errors.push('seeden saknar stations-lista')
if (by('osm') < 4000) errors.push(`för få OSM-platser: ${by('osm')} (golv 4 000)`)
if (by('trafikverket') < 280) errors.push(`för få Trafikverket-platser: ${by('trafikverket')} (golv 280)`)
if (curated < reg.length * 0.93) errors.push(`bara ${curated} av ${reg.length} registerposter finns i seeden (golv 93 %)`)

const ids = new Set()
let badCoord = 0
let badSvc = 0
for (const s of st) {
  if (ids.has(s.id)) errors.push(`dubbelt id i seeden: ${s.id}`)
  ids.add(s.id)
  if (!(s.lat >= 55 && s.lat <= 69.5 && s.lon >= 10.5 && s.lon <= 24.5)) badCoord++
  if (!Array.isArray(s.services) || !s.services.length || s.services.some((x) => !SERVICES.has(x))) badSvc++
}
// Kedjade härledda namn ("Sopstation vid Sopstation vid …") – synken lade
// till ett "vid" per körning med återanvänd OSM-data (granskning 14 okt 2026).
// Grundnamnen = GENERIC_NAME i sync-stations.mjs / GENERIC_NAME_RE i src/lib/naming.ts.
const GEN = '(Tömningsstation|Ställplats för husbil|Vattenpåfyllning|Sopstation|Återvinningscentral|Drivmedelsstation|Camping|Ställplats|Rastplats|Gasolförsäljning|Gästhamn/marina|Dricksvatten|Vägkrog/serviceområde)'
const CHAIN = new RegExp(`^${GEN} vid ${GEN} vid `)
const chained = (Array.isArray(st) ? st : []).filter((s) => s.nameFrom === 'nearby' && CHAIN.test(s.name))
if (chained.length) errors.push(`${chained.length} härledda namn med flera "vid" (t.ex. ${chained[0].name})`)
// "Återvinningscentral vid Brändkläppen Återvinningscentral": grannens namn
// upprepar det generiska ordet (vidName i synken tar bort det, granskning 21 okt 2026).
const first = (n) => n.split(/[\s,]/)[0].toLowerCase()
const redundant = (Array.isArray(st) ? st : []).filter((s) => {
  if (s.nameFrom !== 'nearby') return false
  const m = s.name.match(new RegExp(`^${GEN} vid (.+)$`))
  if (!m) return false
  const key = first(m[1])
  const last = m[2].split(/\s+/).pop().toLowerCase().replace(/[^\p{L}]/gu, '')
  return /\s/.test(m[2].trim()) && key.length >= 5 && last.startsWith(key) && last.length - key.length <= 3 && !/\p{L}s\s+\S+$/u.test(m[2])
})
if (redundant.length) warnings.push(`${redundant.length} härledda namn som upprepar det generiska ordet (t.ex. ${redundant[0].name})`)
if (badCoord) errors.push(`${badCoord} platser med koordinater utanför Sverige`)
if (badSvc) errors.push(`${badSvc} platser med saknade eller okända tjänster`)

console.log(`Seed: ${st.length} platser (OSM ${by('osm')}, Trafikverket ${by('trafikverket')}, register ${curated}/${reg.length})`)
for (const w of warnings) console.warn('Varning: ' + w)
if (errors.length) {
  console.error('\nSeeden ser trasig ut – publicerar inte:')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log('OK: seeden klarar kontrollen')
