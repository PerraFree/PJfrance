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
if (badCoord) errors.push(`${badCoord} platser med koordinater utanför Sverige`)
if (badSvc) errors.push(`${badSvc} platser med saknade eller okända tjänster`)

console.log(`Seed: ${st.length} platser (OSM ${by('osm')}, Trafikverket ${by('trafikverket')}, register ${curated}/${reg.length})`)
if (errors.length) {
  console.error('\nSeeden ser trasig ut – publicerar inte:')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log('OK: seeden klarar kontrollen')
