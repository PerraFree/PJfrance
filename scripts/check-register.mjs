#!/usr/bin/env node
// Kvalitetskontroll av scripts/curated-places.json. Körs i deploy.yml före
// bygget och stoppar deployen vid fel (exit 1); varningar stoppar inte.
// Kör lokalt: node scripts/check-register.mjs
//
// FEL (stoppar): okänt tjänstekod, tom tjänstelista, varken lat/lon eller
// query, ogiltigt season/confidence, dubblettnamn, två poster
// med exakta koordinater inom 100 m (Pers regel 12 okt 2026: samma plats ska vara EN post – slå ihop, eller `distinct: true` i undantagsfall,
// se CLAUDE.md "Dedupa före skrivning"), website som inte är http(s).
// VARNING: två query-poster som geokodats till samma punkt i seeden (kolliderande
// geokodning – ge dem egna queries eller exakta koordinater).
import { readFileSync, existsSync } from 'node:fs'

const REG = new URL('./curated-places.json', import.meta.url)
const SEED = new URL('../public/data/stations-seed.json', import.meta.url)
const SERVICES = new Set(['gravatten', 'latrin', 'vatten', 'sopor', 'atervinning', 'stallplats', 'camping', 'gasol'])
const SEASONS = new Set(['seasonal', 'year-round'])
const CONF = new Set(['high', 'medium', 'low'])
const FIELDS = new Set(['name', 'lat', 'lon', 'query', 'nearLat', 'nearLon', 'maxKm', 'services', 'unverified',
  'unverifiedServices', 'confidence', 'fee', 'gasolPrice', 'openingHours', 'season', 'facilities', 'website', 'url',
  'description', 'source', 'phone', 'address', 'operator', 'payment', 'image', 'distinct'])

const reg = JSON.parse(readFileSync(REG, 'utf8'))
const errors = []
const warnings = []
const names = new Map()

for (const [i, p] of reg.entries()) {
  const tag = `#${i} "${p.name ?? '?'}"`
  if (!p.name || typeof p.name !== 'string') errors.push(`${tag}: saknar namn`)
  const key = (p.name ?? '').trim().toLowerCase()
  if (names.has(key)) errors.push(`${tag}: dubblettnamn (samma som #${names.get(key)}) – slå ihop eller särskilj med ort`)
  names.set(key, i)
  if (!Array.isArray(p.services) || p.services.length === 0) errors.push(`${tag}: tom eller saknad tjänstelista (grå plats? sätt unverified: true och behåll tjänsterna)`)
  for (const s of p.services ?? []) if (!SERVICES.has(s)) errors.push(`${tag}: okänd tjänst "${s}"`)
  for (const s of p.unverifiedServices ?? []) if (!SERVICES.has(s)) errors.push(`${tag}: okänd obekräftad tjänst "${s}"`)
  for (const s of p.unverifiedServices ?? []) if ((p.services ?? []).includes(s)) warnings.push(`${tag}: "${s}" både bekräftad och obekräftad`)
  const hasCoord = typeof p.lat === 'number' && typeof p.lon === 'number'
  const hasQuery = typeof p.query === 'string' && p.query.trim().length > 0
  if (!hasCoord && !hasQuery) errors.push(`${tag}: varken lat/lon eller query`)
  if (!hasCoord && hasQuery && (typeof p.nearLat !== 'number' || typeof p.nearLon !== 'number')) warnings.push(`${tag}: query utan nearLat/nearLon – geokodningen kan hamna var som helst`)
  if (hasCoord && (p.lat < 55 || p.lat > 69.5 || p.lon < 10.5 || p.lon > 24.5)) errors.push(`${tag}: koordinat utanför Sverige (${p.lat}, ${p.lon})`)
  if (p.season != null && !SEASONS.has(p.season)) errors.push(`${tag}: ogiltig season "${p.season}"`)
  if (p.confidence != null && !CONF.has(p.confidence)) errors.push(`${tag}: ogiltig confidence "${p.confidence}"`)
  for (const k of ['website', 'url']) if (p[k] != null && !/^https?:\/\//i.test(String(p[k]))) errors.push(`${tag}: ${k} är inte en http(s)-adress: ${p[k]}`)
  for (const k of Object.keys(p)) if (!FIELDS.has(k)) warnings.push(`${tag}: okänt fält "${k}"`)
  if ((p.openingHours ?? '').length > 120) warnings.push(`${tag}: openingHours är ${p.openingHours.length} tecken – korta (visas i popupen)`)
  if ((p.fee ?? '').length > 160) warnings.push(`${tag}: fee är ${p.fee.length} tecken – korta`)
}

// Närhetskontroll: exakta koordinater inom 10 m = fel; samma geokodade punkt = varning.
const dist = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371e3
}
const gasolOnly = (p) => p.services?.length === 1 && p.services[0] === 'gasol'
const exact = reg.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number')
const cell = (p) => `${Math.round(p.lat / 0.001)},${Math.round(p.lon / 0.001)}`
const grid = new Map()
for (const p of exact) {
  const [cx, cy] = cell(p).split(',').map(Number)
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    for (const q of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
      if (gasolOnly(p) !== gasolOnly(q)) continue
      const m = dist(p, q)
      if (m <= 100 && !p.distinct && !q.distinct) errors.push(`"${p.name}" och "${q.name}" ligger ${Math.round(m)} m isär – samma plats (Pers regel: inom 100 m = en post), slå ihop eller sätt distinct: true`)
    }
  }
  const k = cell(p)
  grid.set(k, [...(grid.get(k) ?? []), p])
}
if (existsSync(SEED)) {
  const st = JSON.parse(readFileSync(SEED, 'utf8')).stations ?? []
  const byPos = new Map()
  for (const s of st) {
    if (!s.id.startsWith('curated-')) continue
    const k = `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`
    byPos.set(k, [...(byPos.get(k) ?? []), s])
  }
  for (const group of byPos.values()) {
    if (group.length < 2) continue
    const g = group.filter((s) => !(s.services.length === 1 && s.services[0] === 'gasol'))
    if (g.length < 2) continue
    warnings.push(`samma geokodade punkt i seeden: ${g.map((s) => `"${s.name}"`).join(' + ')} – ge egna queries eller exakta koordinater, eller slå ihop`)
  }
}

console.log(`Register: ${reg.length} poster, ${errors.length} fel, ${warnings.length} varningar`)
for (const w of warnings) console.log('  varning: ' + w)
if (errors.length) {
  console.error('\nFEL i scripts/curated-places.json – rätta före push:')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log('OK: registret klarar kontrollen')
