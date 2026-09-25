// Importerar docs/import/gasolfyllning_sverige.json (Perplexity-lista, påfyllning av
// EGEN flaska i lösvikt) till scripts/curated-places.json med källsäkerhet per plats.
// node <fil> [--dry]   (från repo-roten)
import fs from 'fs'
const DRY = process.argv.includes('--dry')
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const regPath = './scripts/curated-places.json'
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'))
const file = JSON.parse(fs.readFileSync('./docs/import/gasolfyllning_sverige.json', 'utf8'))
const seed = JSON.parse(fs.readFileSync(S + 'seed.json', 'utf8')).stations
const norm = (s) => (s || '').toLowerCase().replace(/[^a-zåäö0-9]/g, '')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }

// Platser där vi tidigare verifierat mot företagets EGEN sida att lös flaska INTE fylls
// (eller att stället är nedlagt) – Energigas/Kosan-listan får inte skriva över det.
const KNOWN_CONFLICT = {
  'Norregårdsvägen 18': 'Skaraborgs Gasol Skövde: företagets egen sida anger ingen fyllning av lösa flaskor (verifierat sep 2026) – behåller byte, noterar listans uppgift.',
  'Sandvägen 17': 'Gasolbolaget Växjö: påfyllning bara belagd av myLPG-användare, ej av företaget – behåller byte, noterar listans uppgift. Ring 0470-480 90.',
  'Varbergsvägen 25': 'Husbilsprylen Ullared: fysisk butik nedlagd enligt husbilsklubben (sep 2026) – läggs inte in.',
}

const regGasol = reg.filter((p) => p.services?.includes('gasol'))
const seedGasol = seed.filter((s) => s.services.includes('gasol'))
const regByName = new Map(reg.map((p) => [norm(p.name), p]))
const stats = { new: 0, updated: 0, conflict: 0, skipped: 0 }
const report = []

const STOP = new Set(['gasol', 'gasolen', 'gasolfyllning', 'energi', 'station', 'stationen', 'automat', 'gasolautomat', 'aktiebolag', 'petroleum'])
const tokens = (s, city) => (s || '').toLowerCase().replace(/[^a-zåäö0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w) && w !== (city || '').toLowerCase())
const nameSimilar = (a, b, city) => { const ta = tokens(a, city); const tb = norm(b); return ta.some((w) => tb.includes(norm(w))) }
const cityOf = (st) => norm(st.city.split(/[ /(]/)[0])
const hasCity = (p, st) => norm(p.name + ' ' + (p.address || '') + ' ' + (p.query || '')).includes(cityOf(st))
function findExisting(st) {
  // 1) namn-likhet + ort i registret (fungerar även för poster utan koordinat)
  const byName = regGasol.find((p) => nameSimilar(st.operator, p.name, st.city) && hasCity(p, st))
  if (byName) return { p: byName, how: 'namn+ort' }
  // 2) registerpost med koordinat: <150 m, eller <600 m om namnet liknar / den redan har påfyllning (<250 m)
  let best = null, bestKm = Infinity
  for (const p of regGasol) {
    if (typeof p.lat !== 'number') continue
    const km = dist(p.lat, p.lon, st.lat, st.lon)
    if (km < bestKm) { best = p; bestKm = km }
  }
  if (best && (bestKm < 0.15 || (bestKm < 0.6 && nameSimilar(st.operator, best.name, st.city)) || (bestKm < 0.25 && best.facilities?.includes('gasol_pafyllning'))))
    return { p: best, how: `${(bestKm * 1000).toFixed(0)} m (register)` }
  // 3) publicerad (geokodad) registerpost inom 600 m med liknande namn → registerpost via namn
  let bs = null; bestKm = Infinity
  for (const s of seedGasol) { const km = dist(s.lat, s.lon, st.lat, st.lon); if (km < bestKm) { bs = s; bestKm = km } }
  if (bs && bestKm < 0.6) {
    const p = regByName.get(norm(bs.name))
    if (p && (bestKm < 0.15 || nameSimilar(st.operator, bs.name, st.city) || (bestKm < 0.25 && bs.facilities?.includes('gasol_pafyllning'))))
      return { p, how: `${(bestKm * 1000).toFixed(0)} m (seed ${bs.id})` }
    if (!p && bs.source === 'osm' && (nameSimilar(st.operator, bs.name, st.city) || (bestKm < 0.5 && bs.facilities?.includes('gasol_pafyllning'))))
      return { osm: bs, how: `${(bestKm * 1000).toFixed(0)} m (OSM ${bs.id})` }
  }
  // 4) gatuadress + ort
  const street = norm(st.address.split('(')[0].replace(/,.*$/, ''))
  if (street.length > 5) {
    const p = regGasol.find((x) => (norm(x.address || '').includes(street) || norm(x.query || '').includes(street)) && hasCity(x, st))
    if (p) return { p, how: 'gatuadress+ort' }
  }
  return null
}

const CONF_TEXT = { high: 'operatörens egen webbplats', medium: 'branschlista (Energigas Sverige/Kosan)', low: 'extern guide' }
for (const st of file.stations) {
  const streetKey = Object.keys(KNOWN_CONFLICT).find((k) => norm(st.address).includes(norm(k)))
  const addrFull = [st.address, [st.postal_code, st.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const desc = `Påfyllning av egen gasolflaska i lösvikt (inte byte). Källa: ${st.source || 'Perplexity-sammanställning'} (${CONF_TEXT[st.confidence]}, kontrollerad ${st.last_checked}).`
  const ex = findExisting(st)
  if (streetKey) {
    stats.conflict++
    report.push(`KONFLIKT: ${st.operator}, ${st.city} – ${KNOWN_CONFLICT[streetKey]}`)
    if (ex?.p && !/Husbilsprylen/.test(KNOWN_CONFLICT[streetKey])) {
      ex.p.description = (ex.p.description || '') + ` OBS: Energigas Sveriges/Kosans lista (sep 2026) anger lösviktspåfyllning här – motsäger företagets egen sida, ej ändrat.`
      if (!ex.p.phone && st.phone) ex.p.phone = st.phone
    }
    continue
  }
  if (ex?.osm) {
    // Bara OSM-post finns – gör en registerpost på samma koordinat (slås ihop i runtime)
    report.push(`NY (ovanpå OSM ${ex.osm.name}): ${st.operator}, ${st.city}`)
  }
  if (ex?.p) {
    const p = ex.p
    if (typeof p.lat !== 'number') { p.lat = st.lat; p.lon = st.lon; delete p.query; delete p.nearLat; delete p.nearLon; delete p.maxKm }
    const fac = new Set(p.facilities ?? [])
    const had = fac.has('gasol_pafyllning')
    fac.add('gasol_pafyllning')
    p.facilities = [...fac]
    if (!p.address && addrFull) p.address = addrFull
    if (!p.phone && st.phone) p.phone = st.phone
    if (!p.website && st.website) p.website = st.website
    if (!p.openingHours && st.opening_hours) p.openingHours = st.opening_hours
    if (!p.gasolPrice && st.price) p.gasolPrice = `Påfyllning ${st.price} (${st.last_checked})`
    // Säkerhet: höj aldrig till "high" på listans ord om vi inte redan hade belägg; sänk inte heller.
    if (!p.confidence) p.confidence = had ? 'high' : st.confidence
    if (!had) p.description = (p.description || '') + ` Påfyllning av egen flaska enligt ${CONF_TEXT[st.confidence]} (${st.source}, ${st.last_checked}).`
    stats.updated++
    report.push(`${had ? 'komplettering' : 'PÅFYLLNING TILLAGD'} (${ex.how}): ${p.name} ← ${st.operator}, ${st.city} [${st.confidence}]`)
    continue
  }
  const name = new RegExp(norm(st.city)).test(norm(st.operator)) ? st.operator : `${st.operator}, ${st.city}`
  const e = {
    name, lat: ex?.osm ? ex.osm.lat : st.lat, lon: ex?.osm ? ex.osm.lon : st.lon, services: ['gasol'], facilities: ['gasol_pafyllning'], source: 'egen',
    address: addrFull, description: desc, confidence: st.confidence,
  }
  if (st.phone) e.phone = st.phone
  if (st.website) e.website = st.website
  if (st.opening_hours) e.openingHours = st.opening_hours
  if (st.price) e.gasolPrice = `Påfyllning ${st.price} (${st.last_checked})`
  if (st.confidence === 'low') e.unverified = true
  reg.push(e); regGasol.push(e); stats.new++
  report.push(`NY: ${name} [${st.confidence}]${ex?.osm ? ' (ovanpå OSM)' : ''}`)
}
for (const x of reg) for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k]
console.log(report.join('\n'))
console.log(stats, '| register:', reg.length, '| gasol:', reg.filter((p) => p.services.includes('gasol')).length, '| påfyllning:', reg.filter((p) => p.facilities?.includes('gasol_pafyllning')).length)
if (!DRY) fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + '\n')
