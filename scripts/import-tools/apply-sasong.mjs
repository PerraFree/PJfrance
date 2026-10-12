#!/usr/bin/env node
// Applicerar säsongsagenternas resultat (format i UPPDRAG-sasong.md). Kör från repo-roten:
//   SCRATCH=<scratchpad> node scripts/import-tools/apply-sasong.mjs --dry
// Läser <SCRATCH>/sasong/sasong-*.json + <SCRATCH>/sasong/kandidater.json.
//
// Regler (område E):
// - Bara found:true med confidence high/medium används; low → bara utskrift.
// - Registerpost: openingHours/season skrivs in om fälten saknas (fyller på,
//   skriver inte över befintliga uppgifter). Citat + källa läggs sist i description.
// - OSM-post: rad i OSM_SEASON_OVERRIDES i BÅDA scripts/sync-stations.mjs och
//   src/lib/overpass.ts (hoppar över id som redan finns). check-mirrors.mjs
//   vaktar att listorna är identiska.
// - Korta agenternas openingHours för hand efteråt (visas i popupen).
import fs from 'node:fs'
import path from 'node:path'

const S = process.env.SCRATCH || '/tmp'
const DRY = process.argv.includes('--dry')
const DIR = path.join(S, 'sasong')
const CUR = 'scripts/curated-places.json'
const SYNC = 'scripts/sync-stations.mjs'
const OVERPASS = 'src/lib/overpass.ts'
const DATUM = 'okt 2026'

const kand = JSON.parse(fs.readFileSync(path.join(DIR, 'kandidater.json'), 'utf8'))
const byId = new Map(kand.map((k) => [k.id, k]))
const curRaw = fs.readFileSync(CUR, 'utf8')
const reg = JSON.parse(curRaw)
const files = fs.readdirSync(DIR).filter((f) => /^sasong-\d+\.json$/.test(f)).sort()
const stats = { found: 0, notFound: 0, low: 0, regUpd: 0, regSkip: 0, osmNew: 0, osmSkip: 0 }
const osmLines = []
const notes = []

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const syncSrc = fs.readFileSync(SYNC, 'utf8')
const existing = new Set([...syncSrc.matchAll(/\['((?:node|way|relation)\/\d+)', \{ season/g)].map((m) => m[1]))

for (const f of files) {
  const r = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  console.log(`== ${f}: ${r.places.length} platser, ${r.searchesUsed ?? '?'} sökningar${r.quotaHit ? ' (KVOT SLUT)' : ''}`)
  for (const p of r.places) {
    const k = byId.get(p.id)
    if (!k) { console.log(`  ? okänt id ${p.id}`); continue }
    if (!p.found || (!p.season && !p.openingHours)) { stats.notFound++; continue }
    if (p.confidence === 'low') { stats.low++; console.log(`  - low    ${k.name} – ${p.openingHours} (${p.source})`); continue }
    stats.found++
    if (p.notes) notes.push(`${k.name}: ${p.notes}`)
    if (k.source === 'osm') {
      const key = k.id.replace(/^osm-/, '').replace(/-(\d+)$/, '/$1')
      if (existing.has(key)) { stats.osmSkip++; console.log(`  = osm    ${k.name} – finns redan i OSM_SEASON_OVERRIDES`); continue }
      const dom = (() => { try { return new URL(p.source).hostname.replace(/^www\./, '') } catch { return p.source } })()
      const obj = `{ season: ${p.season ? `'${p.season}'` : 'undefined'}${p.openingHours ? `, openingHours: '${esc(p.openingHours)}'` : ''} }`
      osmLines.push(`  ['${key}', ${obj}], // ${k.name} – ${dom} (${DATUM})`)
      existing.add(key)
      stats.osmNew++
      console.log(`  ✓ osm    ${k.name} → ${p.season ?? ''} ${p.openingHours ?? ''}`)
    } else {
      const e = reg.find((x) => x.name === k.name)
      if (!e) { console.log(`  ? registerpost saknas: ${k.name}`); continue }
      if (e.openingHours || e.season) { stats.regSkip++; console.log(`  = reg    ${k.name} – har redan säsong`); continue }
      if (p.openingHours) e.openingHours = p.openingHours
      if (p.season) e.season = p.season
      e.description = `${e.description ?? ''} Säsong ${DATUM} (${p.source}): "${p.evidence ?? ''}"`.trim()
      stats.regUpd++
      console.log(`  ✓ reg    ${k.name} → ${p.season ?? ''} ${p.openingHours ?? ''}`)
    }
  }
}
console.log('\n== Sammanfattning', stats)
if (notes.length) { console.log('\n== Noteringar från agenterna:'); for (const n of notes) console.log('  - ' + n) }
if (DRY) { console.log('\n(--dry: inget skrivet)'); process.exit(0) }

fs.writeFileSync(CUR, JSON.stringify(reg, null, 2) + (curRaw.endsWith('\n') ? '\n' : ''))
if (osmLines.length) {
  for (const file of [SYNC, OVERPASS]) {
    let src = fs.readFileSync(file, 'utf8')
    const i = src.indexOf('const OSM_SEASON_OVERRIDES')
    const j = src.indexOf('\n])\n', i) + 1
    src = src.slice(0, j) + osmLines.join('\n') + '\n' + src.slice(j)
    fs.writeFileSync(file, src)
  }
}
console.log(`Skrivet: ${stats.regUpd} registerposter, ${stats.osmNew} OSM-rader i båda filerna. Kör node scripts/check-mirrors.mjs.`)
