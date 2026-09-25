// Importerar research-resultat från firstcamp.json, campingkollen.json och
// tomningsplatser-webb.json (samma grundfält) till scripts/curated-places.json.
// Regler: high → bekräftad tjänst; medium → bekräftad men confidence 'medium';
// low → obekräftad (grå plats / unverifiedServices). node <fil> [--dry]
import fs from 'fs'
const DRY = process.argv.includes('--dry')
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const regPath = './scripts/curated-places.json'
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'))
const seed = JSON.parse(fs.readFileSync(S + 'seed.json', 'utf8')).stations
const byId = new Map(seed.map((s) => [s.id, s]))
const norm = (s) => (s || '').toLowerCase().replace(/[^a-zåäö0-9]/g, '')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const CORE = ['latrin', 'gravatten', 'vatten']
const stats = { newVerified: 0, newUnverified: 0, enrichVerified: 0, enrichUnverified: 0, noteOnly: 0, skipped: 0 }
const log = []
const FC_FEE = 'Gratis för boende gäster; genomresande kan tömma och fylla för 60 kr/dag (från kl 12) enligt First Camp'

function servicesOf(r) { return CORE.filter((k) => r[k] === true) }
function regByName(n) { return reg.find((p) => norm(p.name) === norm(n)) }
function regNear(lat, lon, km = 0.15) { return reg.find((p) => typeof p.lat === 'number' && dist(p.lat, p.lon, lat, lon) < km) }

function enrich(existing, services, r, mode, srcLabel) {
  // existing = seed-post (OSM/TRV/curated). Hitta/skapa registerpost på samma koordinat.
  let p = existing.id.startsWith('curated-') ? regByName(existing.name) : null
  if (!p) p = regNear(existing.lat, existing.lon)
  if (!p) {
    p = { name: existing.name, lat: existing.lat, lon: existing.lon, services: [...existing.services], source: 'egen', description: '' }
    reg.push(p)
  }
  const add = services.filter((s) => !p.services.includes(s))
  if (mode === 'verified') {
    if (add.length) p.services.push(...add)
    if (p.unverifiedServices) p.unverifiedServices = p.unverifiedServices.filter((s) => !p.services.includes(s))
    if (r.confidence === 'medium' && !p.confidence) p.confidence = 'medium'
    stats.enrichVerified++
  } else {
    const u = new Set([...(p.unverifiedServices ?? []), ...add.filter((s) => !p.services.includes(s))])
    if (u.size) p.unverifiedServices = [...u]
    stats.enrichUnverified++
  }
  const note = `${srcLabel}${r.location_note ? ': ' + r.location_note : ''}. "${(r.evidence || '').slice(0, 220)}" (${r.source || ''})`
  if (!(p.description || '').includes((r.evidence || '').slice(0, 40))) p.description = [p.description, note].filter(Boolean).join(' ')
  if (r.fee && !p.fee) p.fee = r.fee
  for (const k of Object.keys(p)) if (p[k] === undefined || p[k] === '') delete p[k]
  log.push(`${mode === 'verified' ? '✔' : '?'} ${existing.name} +${add.join('+') || '(notering)'} [${r.confidence}]`)
}

function addNew(r, services, mode, srcLabel) {
  if (regByName(r.name)) { stats.skipped++; log.push(`  finns redan i registret: ${r.name}`); return }
  if (typeof r.lat === 'number' && typeof r.lon === 'number') {
    const near = seed.find((s) => dist(s.lat, s.lon, r.lat, r.lon) < 0.3)
    if (near) { enrich(near, services, r, mode, srcLabel); return }
  }
  const e = { name: r.name, services: services.length ? [...services] : [], source: 'egen',
    description: `${srcLabel}${r.location_note ? ': ' + r.location_note : ''}. "${(r.evidence || '').slice(0, 220)}" (${r.source || ''})` }
  if (r.type === 'camping' || /camping/i.test(r.name)) e.services.push('camping'); else e.services.push('stallplats')
  e.services = [...new Set(e.services)]
  if (typeof r.lat === 'number' && typeof r.lon === 'number') { e.lat = r.lat; e.lon = r.lon }
  else {
    const q = [r.address, r.city || r.kommun].filter(Boolean).join(', ')
    if (!q || typeof r.nearLat !== 'number') { stats.skipped++; log.push(`  hoppar (ingen plats-info): ${r.name}`); return }
    e.query = q; e.nearLat = r.nearLat; e.nearLon = r.nearLon; e.maxKm = 15
  }
  if (r.address) e.address = r.address
  if (r.fee) e.fee = r.fee
  if (mode === 'verified') { if (r.confidence === 'medium') e.confidence = 'medium'; stats.newVerified++ }
  else { e.unverified = true; e.confidence = 'low'; stats.newUnverified++ }
  if (r.source && /^https?:/.test(r.source)) e.website = r.source
  reg.push(e)
  log.push(`${mode === 'verified' ? '+' : '+?'} NY ${r.name} ${e.services.join('+')} [${r.confidence}]${e.query ? ' (geokodas)' : ''}`)
}

function run(file, srcLabel, opts = {}) {
  let rows
  try { rows = JSON.parse(fs.readFileSync(S + file, 'utf8')) } catch { console.log('saknas:', file); return }
  rows = Array.isArray(rows) ? rows : Object.values(rows).find(Array.isArray)
  console.log(`\n== ${file}: ${rows.length} rader`)
  for (const r of rows) {
    const status = r.status || ''
    const services = servicesOf(r)
    if (/MOTSÄG|EJ FIRST CAMP|contradict/i.test(status) || r.contradiction) { stats.skipped++; continue }
    if (/OSÄKER/i.test(r.matchHow || '')) { stats.skipped++; continue }
    const mode = r.confidence === 'high' || r.confidence === 'medium' ? 'verified' : 'unverified'
    if (/FINNS MED/.test(status)) {
      // Redan täckt – komplettera bara med avgift/notering (First Camp: genomresande 60 kr)
      if (!opts.noteExisting || r.confidence !== 'high') continue
      const ex = byId.get(r.existingId); if (!ex) continue
      let p = ex.id.startsWith('curated-') ? regByName(ex.name) : regNear(ex.lat, ex.lon)
      if (!p) { p = { name: ex.name, lat: ex.lat, lon: ex.lon, services: [...ex.services], source: 'egen' }; reg.push(p) }
      if (!p.fee && r.onlyGuests !== true) p.fee = FC_FEE
      if (r.location_note && !(p.description || '').includes(r.location_note.slice(0, 30))) p.description = [p.description, `First Camp: ${r.location_note}`].filter(Boolean).join(' ')
      stats.noteOnly++
      continue
    }
    if (/FINNS UTAN|FINNS MED VATTEN/.test(status)) {
      const ex = byId.get(r.existingId)
      if (!ex) { stats.skipped++; log.push(`  okänt id ${r.existingId} (${r.name})`); continue }
      if (!services.length) { stats.skipped++; continue }
      enrich(ex, services, r, mode, srcLabel)
      continue
    }
    if (/SAKNAS/.test(status)) { addNew(r, services, mode, srcLabel); continue }
    stats.skipped++
  }
}

run('firstcamp.json', 'First Camp (egen sida)', { noteExisting: true })
run('campingkollen.json', 'Campingkollen/primärkälla')
run('tomningsplatser.json', 'rastplatserna.se/husbilsplats.se')
for (const x of reg) for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k]
console.log(log.join('\n'))
console.log('\n', stats, '| register:', reg.length)
if (!DRY) fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + '\n')
