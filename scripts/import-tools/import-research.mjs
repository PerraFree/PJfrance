// Slår ihop research-sessionens resultat (docs/import/gasolfyllning-research.json)
// med registret: nya belagda platser, nedgraderingar av felaktiga Perplexity-rader,
// kompletteringar av befintliga. node <fil> [--dry] (från repo-roten)
import fs from 'fs'
const DRY = process.argv.includes('--dry')
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const regPath = './scripts/curated-places.json'
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'))
const rows = JSON.parse(fs.readFileSync(S + 'research.json', 'utf8'))
const seed = JSON.parse(fs.readFileSync(S + 'seed.json', 'utf8')).stations
const norm = (s) => (s || '').toLowerCase().replace(/[^a-zåäö0-9]/g, '')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const STOP = new Set(['gasol', 'gasolen', 'gasolfyllning', 'energi', 'station', 'stationen', 'automat', 'gasolautomat', 'aktiebolag', 'petroleum', 'svenska'])
const tokens = (s, city) => (s || '').toLowerCase().replace(/[^a-zåäö0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w) && w !== (city || '').toLowerCase())
const cityKey = (r) => norm((r.city || '').split(/[ /(]/)[0])
const gasol = () => reg.filter((p) => p.services?.includes('gasol'))
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] }
const townCoord = (city) => {
  const base = cityKey({ city }); if (base.length < 3) return null
  const hits = seed.filter((s) => norm(s.address).includes(base) || norm(s.name).includes(base))
  if (hits.length < 2) return null
  const lat = median(hits.map((s) => s.lat)), lon = median(hits.map((s) => s.lon))
  return hits.filter((s) => dist(s.lat, s.lon, lat, lon) < 40).length / hits.length >= 0.5 ? { lat, lon } : null
}
function findReg(r) {
  if (r.existingName) { const p = reg.find((x) => norm(x.name) === norm(r.existingName)); if (p) return p }
  const ck = cityKey(r)
  const byName = gasol().find((p) => tokens(r.name, r.city).some((w) => norm(p.name).includes(norm(w))) && norm(p.name + (p.address || '') + (p.query || '')).includes(ck))
  if (byName) return byName
  if (r.street) { const sk = norm(r.street.split('(')[0]); if (sk.length > 5) { const p = gasol().find((x) => (norm(x.address || '').includes(sk) || norm(x.query || '').includes(sk)) && norm(x.name + (x.address || '') + (x.query || '')).includes(ck)); if (p) return p } }
  if (typeof r.lat === 'number') { const p = gasol().find((x) => typeof x.lat === 'number' && dist(x.lat, x.lon, r.lat, r.lon) < 0.15); if (p) return p }
  return null
}
const CONF_TEXT = { high: 'operatörens egen webbplats', medium: 'branschlista/flera källor', low: 'forum/extern guide' }
const log = []
const stats = { new: 0, upgraded: 0, complemented: 0, downgraded: 0, removed: 0, skipped: 0 }
const fill = (p, r) => {
  let n = 0
  if (!p.phone && r.phone) { p.phone = r.phone; n++ }
  if (!p.openingHours && r.openingHours) { p.openingHours = r.openingHours; n++ }
  if (!p.website && r.website) { p.website = r.website; n++ }
  if (!p.gasolPrice && (r.pricePerKg || r.priceNote)) { p.gasolPrice = `Påfyllning ${r.pricePerKg ? r.pricePerKg + ' kr/kg' : ''}${r.priceNote ? (r.pricePerKg ? ' – ' : '') + r.priceNote.slice(0, 120) : ''} (sep 2026)`; n++ }
  return n
}

// ---- 1) Forskningens "INTE lös flaska" mot poster som fick påfyllning från Perplexity-listan
const NOT = rows.filter((r) => r.refillsLooseBottle === false)
const DOWN = {
  'Allgas CMS AB, Göteborg': { fac: ['gasol_byte'], conf: 'medium', note: 'Research sep 2026: endast byte (Primagaz), ingen lösviktsfyllning.' },
  'Unax AB, Ljusdal': { fac: ['gasol_byte'], conf: 'medium', note: 'Research sep 2026: sajten beskriver bara byte i automat – lös flaska ej belagd.' },
  'OK/Q8, Piteå': { remove: true, note: 'fordonsgas/autogas vid pump, inte flaskpåfyllning' },
  'Bilisten AB (Frendo), Brålanda': { fac: ['gasol_byte'], conf: 'medium', note: 'Research sep 2026: Norbro-sidan beskriver bara byte; Kosan listar under "flaskfyllare och tankning" – lösvikt ej belagd.' },
  'Bilservice i Kylinge AB, Sölvesborg': { fac: ['gasol_pafyllning'], conf: 'low', unverified: true, note: 'Research sep 2026: husbilsverkstad som fyller FAST monterad tank/Alugas-tankflaska – vanlig lös flaska EJ belagd, ring innan.' },
  'Harry Perssons Byggnadsvaror, Sölvesborg': { remove: true, note: 'ingen källa nämner gasol alls' },
  'Qstar Oil, Linköping': { fac: ['gasol_pafyllning'], conf: 'low', unverified: true, note: 'Research sep 2026: oljebolagsdepå – troligen bara tankning av fordon/fast tank under kontorstid, lös flaska oklart. Ring innan.' },
  'Lööfs Gasol – gasolautomat Karlstad': { fac: ['gasol_byte'], conf: undefined, note: 'Research sep 2026: inget belägg för lösviktsfyllning av kundens flaska – bara byte (butik + automat). Branschlistan avser Lööfs egen industrifyllning.' },
  'Husbilslandet i Bäck, Kristinehamn': { fac: ['gasol_pafyllning'], conf: 'low', unverified: true, note: 'Research sep 2026: bara EN branschlista (Kosan) och egen sajt utan konkret citat – ej bekräftat. GASIP Kristinehamn (Hamnvägen 6) är det belagda stället.' },
}
for (const [name, d] of Object.entries(DOWN)) {
  const i = reg.findIndex((p) => p.name === name)
  if (i < 0) { log.push('  nedgradering: hittar inte ' + name); continue }
  if (d.remove) { reg.splice(i, 1); stats.removed++; log.push(`TAR BORT: ${name} – ${d.note}`); continue }
  const p = reg[i]
  p.facilities = d.fac; if (d.conf) p.confidence = d.conf; else delete p.confidence
  if (d.unverified) p.unverified = true
  p.description = (p.description || '') + ' ' + d.note
  stats.downgraded++; log.push(`NEDGRADERAD → ${d.fac.join('+')}${d.unverified ? ' (grå)' : ''}: ${name}`)
}

// ---- 2) Nya/uppgraderade påfyllningsplatser från research (high + medium)
const SKIP_NEW = new Set(['West Coast Gasol', 'Handelsboden i Häradsbäck', 'AGA Gas / f.d. Flaskgascentralen Svedala', 'GasolToll, Strängnäs', 'ABC-Gasol (Vallentuna)', 'Bosses Gasol (Göteborg)'])
for (const r of rows.filter((x) => x.refillsLooseBottle === true)) {
  if (SKIP_NEW.has(r.name)) { stats.skipped++; log.push(`hoppar (${r.confidence}, ${r.note?.slice(0, 80) || 'saknar adress'}): ${r.name}`); continue }
  const p = findReg(r)
  if (p) {
    const fac = new Set(p.facilities ?? []); const had = fac.has('gasol_pafyllning')
    if (r.confidence === 'low' && !had) { stats.skipped++; continue }
    fac.add('gasol_pafyllning'); if (r.alsoExchange) fac.add('gasol_byte'); p.facilities = [...fac]
    const n = fill(p, r)
    const rank = { high: 3, medium: 2, low: 1 }
    if (r.confidence === 'high' && (rank[p.confidence] ?? 0) < 3) { p.confidence = 'high'; delete p.unverified; stats.upgraded++; log.push(`UPPGRADERAD till hög: ${p.name} (${r.source})`) }
    else if (!p.confidence && r.confidence !== 'low') { p.confidence = r.confidence }
    if (!had) { p.description = (p.description || '') + ` Påfyllning av egen flaska enligt ${CONF_TEXT[r.confidence]} (research sep 2026): "${(r.evidence || '').slice(0, 200)}"`; log.push(`PÅFYLLNING TILLAGD (${r.confidence}): ${p.name}`) }
    if (n || !had) stats.complemented++
    if (typeof p.lat !== 'number' && typeof r.lat === 'number') { p.lat = r.lat; p.lon = r.lon; delete p.query; delete p.nearLat; delete p.nearLon; delete p.maxKm }
    continue
  }
  if (r.confidence === 'low') { stats.skipped++; log.push(`hoppar (low): ${r.name}`); continue }
  const e = { name: r.name, services: ['gasol'], facilities: r.alsoExchange ? ['gasol_byte', 'gasol_pafyllning'] : ['gasol_pafyllning'], source: 'egen', confidence: r.confidence,
    description: `Påfyllning av egen gasolflaska i lösvikt${r.alsoExchange ? ' samt byte' : ''}${r.fillsFixedTank ? ', även fast tank' : ''}. Källa (${CONF_TEXT[r.confidence]}, research sep 2026): "${(r.evidence || '').slice(0, 220)}"` }
  // Finns bara som OSM-nod (override) → lägg registerposten exakt på noden så de slås ihop i appen
  const osmTwin = r.existingName ? seed.find((s) => s.source === 'osm' && norm(s.name) === norm(r.existingName)) : null
  if (osmTwin) { e.lat = osmTwin.lat; e.lon = osmTwin.lon }
  else if (typeof r.lat === 'number') { e.lat = r.lat; e.lon = r.lon }
  else {
    const tc = townCoord(r.city); if (!tc || !r.street) { stats.skipped++; log.push(`hoppar (ingen koordinat/ort): ${r.name}, ${r.city}`); continue }
    e.query = `${r.street.split('(')[0].trim()}, ${(r.city || '').split(/[ /(]/)[0]}`; e.nearLat = +tc.lat.toFixed(4); e.nearLon = +tc.lon.toFixed(4); e.maxKm = 15
  }
  e.address = [r.street, [r.postcode, r.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  fill(e, r)
  reg.push(e); stats.new++; log.push(`NY (${r.confidence}${e.query ? ', geokodas' : ''}): ${r.name}, ${r.city}`)
}
for (const x of reg) for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k]
console.log(log.join('\n'))
console.log(stats, '| register:', reg.length, '| påfyllning:', reg.filter((p) => p.facilities?.includes('gasol_pafyllning')).length, '| confidence:', JSON.stringify(reg.reduce((a, p) => (p.confidence && (a[p.confidence] = (a[p.confidence] || 0) + 1), a), {})))
if (!DRY) fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + '\n')
