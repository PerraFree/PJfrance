#!/usr/bin/env node
// Applicerar kontrollagenternas resultat (format i UPPDRAG-kontroll.md) på
// scripts/curated-places.json. Kör från repo-roten:
//   SCRATCH=<scratchpad> node scripts/import-tools/apply-kontroll.mjs --dry
// Läser <SCRATCH>/kontroll/kontroll-*.json + <SCRATCH>/kontroll/kandidater.json.
//
// Regler (område D, "rätt före fler"):
// - Bara confidence high/medium används. low → bara utskrift.
// - Registerpost (inRegister): contradictedServices high → tjänsten tas bort;
//   medium → flyttas till unverifiedServices (grå/påstådd). addServices high →
//   läggs till; medium → unverifiedServices. fee/openingHours/season skrivs
//   över när agenten gett värde. Citat + källa läggs sist i description.
// - OSM-post (source osm, ej i registret): en registerpost skapas ovanpå
//   (registret vinner i appens dedupe inom ~100 m, tjänster unionas). Vid
//   contradictedServices high utesluts dessutom OSM-elementet i BÅDA
//   EXCLUDED_OSM_ELEMENTS (sync-stations.mjs + overpass.ts) så den felaktiga
//   tjänsten inte unionas in igen.
// - status nedlagd och nameNow skrivs bara ut – avgörs manuellt.
import fs from 'node:fs'
import path from 'node:path'

const S = process.env.SCRATCH || '/tmp'
const DRY = process.argv.includes('--dry')
const DIR = path.join(S, 'kontroll')
const CUR = 'scripts/curated-places.json'
const SYNC = 'scripts/sync-stations.mjs'
const OVERPASS = 'src/lib/overpass.ts'
const DATUM = 'okt 2026'

const kand = JSON.parse(fs.readFileSync(path.join(DIR, 'kandidater.json'), 'utf8'))
const byId = new Map(kand.map((k) => [k.id, k]))
const curRaw = JSON.parse(fs.readFileSync(CUR, 'utf8'))
const reg = curRaw.places || curRaw
const files = fs.readdirSync(DIR).filter((f) => /^kontroll-\d+\.json$/.test(f))
const CORE = ['gravatten', 'latrin', 'vatten']
const stats = { ok: 0, andrad: 0, nedlagd: 0, oklar: 0, low: 0, regUpd: 0, regNew: 0, excluded: 0 }
const manual = []
const excludeLines = []

const uniq = (a) => [...new Set(a)]
const short = (s, n = 320) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '')

function applyToRegister(p, r, k) {
  const before = JSON.stringify(r)
  const high = r.confidence === 'high'
  let services = [...p.services]
  let unv = [...(p.unverifiedServices || [])]
  for (const s of r.contradictedServices || []) {
    if (!CORE.includes(s)) continue
    services = services.filter((x) => x !== s)
    if (!high) unv.push(s)
  }
  for (const s of r.addServices || []) {
    if (!CORE.includes(s)) continue
    if (high) services.push(s)
    else unv.push(s)
  }
  for (const s of r.confirmedServices || []) {
    // bekräftad med high: om den låg som påstådd blir den riktig
    if (high && unv.includes(s)) services.push(s)
  }
  p.services = uniq(services)
  unv = uniq(unv).filter((x) => !p.services.includes(x))
  if (unv.length) p.unverifiedServices = unv
  else delete p.unverifiedServices
  if (r.fee) p.fee = r.fee
  if (r.openingHours) p.openingHours = r.openingHours
  if (r.season === 'seasonal' || r.season === 'year-round') p.season = r.season
  if (r.confidence === 'high' && (p.confidence === 'medium' || p.confidence === 'low')) p.confidence = 'high'
  const note = `Kontroll ${DATUM} (${r.source}): "${short(r.evidence)}"`
  if (!(p.description || '').includes(`Kontroll ${DATUM}`)) p.description = `${p.description || ''} ${note}`.trim()
  if (JSON.stringify(r) !== before) throw new Error('resultat ändrat')
}

function newOverlay(k, r) {
  const high = r.confidence === 'high'
  let services = k.services.filter((s) => !(r.contradictedServices || []).includes(s))
  const unv = []
  for (const s of r.addServices || []) {
    if (!CORE.includes(s)) continue
    if (high) services.push(s)
    else unv.push(s)
  }
  for (const s of r.contradictedServices || []) if (!high && CORE.includes(s)) unv.push(s)
  const post = {
    name: r.nameNow || k.name,
    services: uniq(services),
    description:
      `Kontrollpost ${DATUM} ovanpå OSM-objektet (${k.osmUrl}). ` +
      `Kontroll ${DATUM} (${r.source}): "${short(r.evidence)}"`,
    source: 'egen',
    lat: k.lat,
    lon: k.lon,
    website: k.website,
    confidence: r.confidence,
  }
  if (unv.length) post.unverifiedServices = uniq(unv)
  if (r.fee) post.fee = r.fee
  if (r.openingHours) post.openingHours = r.openingHours
  if (r.season === 'seasonal' || r.season === 'year-round') post.season = r.season
  return post
}

for (const f of files.sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  console.log(`\n== ${f}: ${data.places?.length ?? 0} platser, ${data.searchesUsed} sökningar${data.quotaHit ? ' (KVOT SLUT)' : ''}`)
  for (const r of data.places || []) {
    const k = byId.get(r.id)
    if (!k) {
      console.log(`  ? okänt id ${r.id} (${r.name})`)
      continue
    }
    const tag = `${r.status.padEnd(7)} ${r.confidence.padEnd(6)} ${k.name}`
    if (r.status === 'oklar' || !['high', 'medium'].includes(r.confidence)) {
      stats[r.status === 'oklar' ? 'oklar' : 'low']++
      console.log(`  - ${tag} – ingen ändring${r.notes ? ' (' + short(r.notes, 120) + ')' : ''}`)
      continue
    }
    if (r.status === 'nedlagd') {
      stats.nedlagd++
      manual.push(`NEDLAGD? ${k.name} [${k.id}] – ${short(r.evidence, 200)} (${r.source})`)
      console.log(`  ! ${tag} – MANUELLT`)
      continue
    }
    if (r.nameNow && r.nameNow !== k.name) manual.push(`NAMNBYTE? ${k.name} → ${r.nameNow} [${k.id}] (${r.source})`)
    const changes = []
    if (r.contradictedServices?.length) changes.push(`−${r.contradictedServices.join(',')}`)
    if (r.addServices?.length) changes.push(`+${r.addServices.join(',')}`)
    if (r.fee) changes.push('avgift')
    if (r.openingHours || r.season) changes.push('säsong')
    stats[r.status === 'ok' ? 'ok' : 'andrad']++

    if (k.inRegister) {
      const matches = reg.filter((p) => p.name.toLowerCase() === k.name.toLowerCase())
      if (matches.length !== 1) {
        manual.push(`${matches.length} registerposter heter "${k.name}" – rätta för hand`)
        console.log(`  ! ${tag} – ${matches.length} träffar i registret, hoppar`)
        continue
      }
      applyToRegister(matches[0], r, k)
      stats.regUpd++
      console.log(`  ✓ ${tag} → register uppdaterat ${changes.join(' ') || '(citat/källa)'}`)
    } else {
      const needsOverlay = changes.length > 0
      if (!needsOverlay) {
        console.log(`  ✓ ${tag} – OSM-post stämmer, ingen ändring`)
        continue
      }
      if (reg.some((p) => p.name.toLowerCase() === (r.nameNow || k.name).toLowerCase())) {
        manual.push(`Registerpost med namnet "${k.name}" finns redan men id ${k.id} är OSM – kolla för hand`)
        console.log(`  ! ${tag} – namnkrock i registret, hoppar`)
        continue
      }
      reg.push(newOverlay(k, r))
      stats.regNew++
      console.log(`  ✓ ${tag} → ny kontrollpost ${changes.join(' ')}`)
      if (r.confidence === 'high' && (r.contradictedServices || []).some((s) => CORE.includes(s))) {
        const el = k.osmUrl.replace('https://www.openstreetmap.org/', '')
        excludeLines.push(
          `  // ${k.name}: kontroll ${DATUM} – ${r.contradictedServices.join('/')} motsagd av ${r.source}; registerposten täcker platsen.\n  '${el}',`,
        )
        stats.excluded++
      }
    }
  }
}

function insertExclusions(file) {
  let src = fs.readFileSync(file, 'utf8')
  const start = src.indexOf('EXCLUDED_OSM_ELEMENTS = new Set([')
  const end = src.indexOf('\n])', start)
  if (start < 0 || end < 0) throw new Error('hittar inte EXCLUDED_OSM_ELEMENTS i ' + file)
  const block = src.slice(start, end)
  const add = excludeLines.filter((l) => !block.includes(l.match(/'([^']+)'/)[1]))
  if (!add.length) return 0
  src = src.slice(0, end) + '\n' + add.join('\n') + src.slice(end)
  if (!DRY) fs.writeFileSync(file, src)
  return add.length
}

console.log('\n== Sammanfattning', stats)
if (manual.length) console.log('\n== Manuellt:\n  ' + manual.join('\n  '))
if (excludeLines.length) {
  const n1 = insertExclusions(SYNC)
  const n2 = insertExclusions(OVERPASS)
  console.log(`\n== EXCLUDED_OSM_ELEMENTS: +${n1} i sync, +${n2} i overpass.ts`)
}
if (DRY) console.log('\n(--dry: inget skrivet)')
else {
  if (curRaw.places) curRaw.places = reg
  fs.writeFileSync(CUR, JSON.stringify(curRaw.places ? curRaw : reg, null, 2) + '\n')
  console.log(`\nSkrev ${CUR} (${reg.length} poster)`)
}
