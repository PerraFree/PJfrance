// Importerar tömningssvepets resultat (bara confidence high) till curated-places.json.
// node import-tomning.mjs [--dry]   (körs från repo-roten)
import fs from 'fs'
const DRY = process.argv.includes('--dry')
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const path = './scripts/curated-places.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const seed = JSON.parse(fs.readFileSync(S + 'seed.json', 'utf8')); const st = seed.stations ?? seed
const byId = new Map(st.map((s) => [s.id, s]))
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[,.()]/g, '').trim()
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const CORE = new Set(['latrin', 'gravatten', 'vatten'])
const stats = { newAdded: 0, enrichAdded: 0, enrichNoop: 0, dupNear: 0, dupName: 0, low: 0, skipped: 0 }
const low = []
const files = fs.readdirSync(S + 'results').filter((f) => f.startsWith('tomning-') && f.endsWith('.json'))
for (const f of files) {
  let r; try { r = JSON.parse(fs.readFileSync(S + 'results/' + f, 'utf8')) } catch (e) { console.log('OGILTIG', f, e.message); continue }
  console.log(`\n== ${f}: new ${r.new?.length ?? 0}, enrich ${r.enrich?.length ?? 0}, sök ${r.searchesUsed}, quota ${r.quotaHit}`)
  for (const o of r.new ?? []) {
    let services = (o.services ?? []).filter((s) => CORE.has(s)); if (o.vatten && !services.includes('vatten')) services.push('vatten')
    if (o.confidence !== 'high') { stats.low++; low.push(`${r.region}: ${o.name} [${services}] – ${o.source}`); continue }
    if (!services.some((s) => s === 'latrin' || s === 'gravatten')) { stats.skipped++; console.log('  hoppar (ingen tömning):', o.name); continue }
    const hasLL = typeof o.lat === 'number' && typeof o.lon === 'number'
    const hasTown = typeof o.townLat === 'number' && typeof o.townLon === 'number'
    const refLat = hasLL ? o.lat : o.townLat, refLon = hasLL ? o.lon : o.townLon
    // dubblett mot seed (inom 400 m med exakt koordinat) eller namn
    if (hasLL) { const near = st.find((s) => dist(s.lat, s.lon, o.lat, o.lon) < 0.4); if (near) { stats.dupNear++; console.log(`  NÄRA befintlig (${near.id} ${near.name} [${near.services}]) – ${o.name}; lägger till som enrich om tjänster saknas`); const add = services.filter((x) => !near.services.includes(x)); if (add.length) enrich(near, add, o, r.region); continue } }
    if (data.some((p) => norm(p.name) === norm(o.name)) || st.some((s) => norm(s.name) === norm(o.name))) { stats.dupName++; console.log('  namn finns redan:', o.name); continue }
    if (!hasLL && !(o.address && hasTown)) { stats.skipped++; console.log('  ingen plats-info:', o.name); continue }
    const e = { name: o.name, services, source: 'egen', description: `${o.evidence ? 'Källa (' + (o.source || '') + '): "' + o.evidence + '"' : 'Källa: ' + o.source}` }
    if (hasLL) { e.lat = o.lat; e.lon = o.lon; if (o.address) e.address = o.address }
    else { e.query = o.address; e.nearLat = o.townLat; e.nearLon = o.townLon; e.maxKm = 10; e.address = o.address }
    if (o.openingHours) e.openingHours = o.openingHours
    if (o.fee) e.fee = o.fee
    if (o.operator) e.operator = o.operator
    if (o.source && /^https?:/.test(o.source)) e.website = o.source
    data.push(e); stats.newAdded++; console.log('  + NY', o.name, services.join('+'), hasLL ? 'lat/lon' : 'query')
  }
  for (const o of r.enrich ?? []) {
    if (o.confidence !== 'high') { stats.low++; low.push(`${r.region}: ENRICH ${o.existingName} +${o.addServices} – ${o.source}`); continue }
    const s = byId.get(o.existingId); if (!s) { console.log('  enrich: okänt id', o.existingId, o.existingName); stats.skipped++; continue }
    const add = (o.addServices ?? []).filter((x) => CORE.has(x) && !s.services.includes(x))
    if (!add.length) { stats.enrichNoop++; continue }
    enrich(s, add, o, r.region)
  }
}
function enrich(s, add, o, region) {
  // Registerpost på samma koordinat med tjänsterna → appens avstånds-dedupe slår ihop dem i runtime
  const existing = data.find((p) => norm(p.name) === norm(s.name) && (s.id.startsWith('curated-') || (typeof p.lat === 'number' && dist(p.lat, p.lon, s.lat, s.lon) < 0.15)))
  if (existing) { const before = existing.services.length; for (const x of add) if (!existing.services.includes(x)) existing.services.push(x); if (existing.services.length > before) { stats.enrichAdded++; console.log('  ~ komplettering (befintlig registerpost)', s.name, '+', add.join('+')) } return }
  const e = { name: s.name, lat: s.lat, lon: s.lon, services: [...new Set([...s.services.filter((x) => x !== 'camping' || true), ...add])], source: 'egen', description: `Komplettering ${region} sep 2026. Källa (${o.source || ''}): "${o.evidence || ''}"` }
  if (o.source && /^https?:/.test(o.source)) e.website = o.source
  data.push(e); stats.enrichAdded++; console.log('  ~ komplettering', s.name, '+', add.join('+'))
}
for (const x of data) for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k]
console.log('\n', stats, '| register totalt:', data.length)
fs.writeFileSync(S + 'tomning-low.txt', low.join('\n') + '\n')
if (!DRY) fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
