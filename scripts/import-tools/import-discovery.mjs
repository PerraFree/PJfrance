// Importerar discovery-svepets resultat (disc-*.json i scratchpad) i scripts/curated-places.json.
// --dry = bara lista. high → bekräftade tjänster; medium → platsen bekräftad, kärntjänster påstådda;
// low → grå (unverified). Dedupe mot publicerad seed (400 m, samma tjänster) och registret (namn).
// Träffar utan koordinat geokodas av synken via `query` + kommunens medianläge (nearLat/nearLon).
import fs from 'fs'
const S = '/tmp/claude-0/-home-user-PJfrance/9b0981ce-396d-5ade-a574-c11dcb80a101/scratchpad'
const REG = '/home/user/PJfrance/scripts/curated-places.json'
const dry = process.argv.includes('--dry')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'))
const seed = JSON.parse(fs.readFileSync(`${S}/seed.json`, 'utf8')).stations
const CORE = ['vatten', 'gravatten', 'latrin']
const ALL = ['vatten', 'gravatten', 'latrin', 'sopor', 'stallplats', 'camping']
const byKommun = {}
for (const s of seed) { if (s.kommun) (byKommun[s.kommun] = byKommun[s.kommun] || []).push(s) }
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] }
const kommunAnchor = (k) => { const arr = byKommun[k] || byKommun[k + 's'] || byKommun[(k || '').replace(/s$/, '')]; if (!arr) return null; return { lat: median(arr.map((s) => s.lat)), lon: median(arr.map((s) => s.lon)) } }
const r5 = (x) => Math.round(x * 1e5) / 1e5
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
// Handjusterade geokodningsfrågor (Nominatim hittar inte beskrivande namn)
const QUERY_FIX = { 'Ställplatser för husbilar i gästhamnen i Klässbol': 'Klässbols gästhamn, Arvika', 'Ställplats Dammen (Östregårds ställplatser)': 'Östregård, Blädinge, Alvesta',
  'Svenljunga ställplats (Moga Fritid)': 'Moga Fritid, Svenljunga', 'Ställplats Lassalyckan, Ulricehamn': 'Lassalyckan, Ulricehamn',
  'Husbilsparkering Herrljunga Folkets Park': 'Herrljunga Folkets Park, Herrljunga', 'Husbilsparkering Haraberget (Herrljunga hembygdspark)': 'Haraberget, Herrljunga',
  'Backamo Lägerplats ställplats': 'Backamo, Ljungskile', 'Kolholmarnas husbilsparkering, Lysekil': 'Kolholmarna, Lysekil' }
const SKIP = /^Unden – naturnära|^Edet Värdshus|^Vattenkiosk |^Tömningsplats Smedmästarvägen|^Parkering vid badplats Söderåkra|^Vattenpåfyllning (Preem|bensinstation)/ // vattenkiosker = ej husbilsplatser (kräver nyckel, stängda 2026); macktappar/postnummer-parkering utan läge // "Unden" är en hel sjö – ingen punkt att geokoda
// Stora/avlånga kommuner: medianen ligger långt från kanterna (lärdom golfsvepet)
const MAXKM = { Gotland: 70, Borgholm: 60, 'Mörbylånga': 50, Kiruna: 80, Jokkmokk: 80, Gällivare: 80, Boden: 60, Arjeplog: 80, Sorsele: 60, Storuman: 70, Älvdalen: 70, Härjedalen: 80, Berg: 60, Strömsund: 80, Krokom: 70, Åre: 70, Pajala: 70, Överkalix: 60, Arvidsjaur: 60, Skellefteå: 60, Umeå: 50, Örnsköldsvik: 50, Piteå: 50, Luleå: 50 }
const GENERIC = /^(tömningsstation|ställplats|ställplats för husbil|camping|vattenpåfyllning|sopstation|latrintömning)\b/i
const files = fs.readdirSync(S).filter((f) => /^disc-[a-z]+-\d\.json$/.test(f)).sort()
const log = { nya: 0, uppgr: 0, kompl: 0, gra: 0, hoppade: [] }

for (const f of files) {
  let arr
  try { arr = JSON.parse(fs.readFileSync(`${S}/${f}`, 'utf8')) } catch (e) { console.log(`${f}: oläsbar (${e.message})`); continue }
  for (const r of arr) {
    const name = (r.name || '').trim()
    if (!name || /^Alvesta Golfklubb/i.test(name) || SKIP.test(name)) continue // Alvesta GK raderad 29 sep (bara aggregator)
    let conf = r.confidence === 'high' || r.confidence === 'medium' ? r.confidence : 'low'
    const svc = [...new Set((r.services || []).filter((s) => ALL.includes(s)))]
    const claimedCore = svc.filter((s) => CORE.includes(s))
    const other = svc.filter((s) => !CORE.includes(s))
    const solid = conf === 'high' && !r.services_unclear
    let confirmedCore = solid ? claimedCore : []
    let unverifiedCore = solid ? [] : claimedCore
    if (r.note && /nedlagd|stängd permanent|finns inte längre|upphört/i.test(r.note) && conf !== 'high') { log.hoppade.push(`${name}: ${r.note.slice(0, 90)}`); continue }

    let geo = null
    if (typeof r.lat !== 'number' || typeof r.lon !== 'number' || r.lat < 55 || r.lat > 69.1) {
      const anchor = kommunAnchor(r.kommun)
      if (!anchor) { log.hoppade.push(`${name}: ingen koordinat och okänd kommun "${r.kommun}" (${conf})`); continue }
      let q = (r.address || '').replace(/\s*\(.*?\)/g, '').replace(/\s+[–-]\s+.*$/, '').replace(/^(vid|korsningen|centrumparkeringen vid|bakom|parkeringen)\s+/i, '').replace(/,\s*(bakom|öster om|söder om|norr om|väster om|infart|väg\s*\d+|ca\s)\b[^,]*/gi, '').replace(/,\s*(vid|strax|nära|intill|norra delen|södra delen|vägen)\b[^,]*/gi, '').replace(/\s+(vid|intill)\s+[^,]*/gi, '').replace(/\s*\/\s*[^,]*/g, '').replace(/\s+/g, ' ').replace(/^,\s*|,\s*$/g, '').trim()
      if (!q || /\bkm\b|okänd|saknas/i.test(q)) q = `${name.replace(/\s*\(.*?\)/g, '')}, ${r.kommun}`
      if (QUERY_FIX[name]) q = QUERY_FIX[name]
      geo = { query: q, nearLat: r5(anchor.lat), nearLon: r5(anchor.lon), maxKm: MAXKM[r.kommun] || 30 }
      r.lat = anchor.lat; r.lon = anchor.lon // bara för dubblettkoll nedan
    }

    // Befintlig registerpost? (existing_name eller exakt namn)
    let e = null
    // Generiska namn ("Ställplats (parkering för husbil)") finns på flera orter – kräv närhet (<5 km)
    // till agentens koordinat/kommunankare, annars matchas fel post (hände 5 okt: Visby skrev över Simrishamn)
    if (r.existing_name) e = reg.find((x) => norm(x.name) === norm(r.existing_name) && (!GENERIC.test(x.name) || (x.lat != null && dist(x.lat, x.lon, r.lat, r.lon) < 5)))
    if (!e) e = reg.find((x) => norm(x.name) === norm(name))
    if (!e && !geo) e = reg.find((x) => x.lat != null && dist(x.lat, x.lon, r.lat, r.lon) < 0.15)
    // Seed-stationer (OSM/TRV/register) inom 400 m
    const near = geo ? [] : seed.filter((s) => dist(s.lat, s.lon, r.lat, r.lon) < 0.4).sort((a, b) => dist(a.lat, a.lon, r.lat, r.lon) - dist(b.lat, b.lon, r.lat, r.lon))
    if (r.existing_name && !e) { const m = seed.find((s) => norm(s.name) === norm(r.existing_name)); if (m && dist(m.lat, m.lon, r.lat, r.lon) < 2) { near.unshift(m); if (geo) { geo = null; r.lat = m.lat; r.lon = m.lon } } }
    const nearConfirmed = near.find((s) => !s.unverified && s.services.some((x) => CORE.includes(x)))
    const newCore = confirmedCore.filter((x) => !nearConfirmed?.services.includes(x))
    if (!e && nearConfirmed && !newCore.length && (!unverifiedCore.length || unverifiedCore.every((x) => nearConfirmed.services.includes(x)))) {
      log.hoppade.push(`${name}: finns redan bekräftad (${nearConfirmed.name}, ${nearConfirmed.services})`); continue
    }
    if (!e && conf === 'low' && near.length) { log.hoppade.push(`${name}: grå kandidat men ${near[0].name} finns redan inom ${Math.round(dist(near[0].lat, near[0].lon, r.lat, r.lon) * 1000)} m`); continue }
    if (!e && !claimedCore.length && near.some((s) => s.services.some((x) => other.includes(x)))) { log.hoppade.push(`${name}: bara ${other} och ${near[0].name} finns redan`); continue }

    // Lägg koordinaten på närmaste OSM-station inom 400 m så de slås ihop i appen
    let lat = geo ? undefined : r5(r.lat), lon = geo ? undefined : r5(r.lon)
    let finalName = name
    if (!geo && !e && near.length && near[0].source === 'osm') { lat = r5(near[0].lat); lon = r5(near[0].lon); if (GENERIC.test(near[0].name) && !GENERIC.test(name)) { /* vårt namn vinner */ } else if (!GENERIC.test(near[0].name) && GENERIC.test(name)) finalName = near[0].name }

    const desc = []
    if (r.quote) desc.push(`Källa (${r.source || 'webb'}): "${r.quote.replace(/"/g, "'")}"`)
    if (conf === 'low') desc.push('Obekräftad plats (aggregator/forum, ej primärkälla). Har du varit här? Bekräfta i appen.')
    else if (!solid && claimedCore.length) desc.push('Platsen bekräftad av primärkälla; tömning/vatten ej entydigt belagt. Har du varit här? Bekräfta i appen.')
    if (r.note) desc.push(r.note.replace(/"/g, "'"))

    const fields = {
      lat, lon, ...(geo || {}),
      services: [...new Set([...confirmedCore, ...other])],
      source: 'egen',
      description: desc.join(' '),
      website: r.website || (r.source && !/husbilsplats|park4night|campingkollen|stallplatskartan/i.test(r.source) ? r.source : undefined),
      fee: r.fee || undefined, openingHours: r.openingHours || undefined, phone: r.phone || undefined,
      address: r.address || undefined,
      season: r.season ? (/året runt|year|helår/i.test(r.season) ? 'year-round' : 'seasonal') : undefined,
      confidence: conf === 'low' ? 'low' : solid ? 'high' : 'medium',
    }
    if (!fields.services.length) fields.services = ['stallplats']
    if (r.season && fields.season === 'seasonal') fields.openingHours = fields.openingHours ? `${fields.openingHours}; säsong ${r.season}` : `Säsong ${r.season}`
    if (conf === 'low') fields.unverified = true
    if (unverifiedCore.length) fields.unverifiedServices = unverifiedCore

    if (e) {
      const was = e.unverified ? 'grå' : e.services.join(',')
      const keep = e.unverified ? [] : e.services
      fields.services = [...new Set([...keep, ...fields.services])]
      if (fields.unverifiedServices) fields.unverifiedServices = fields.unverifiedServices.filter((x) => !fields.services.includes(x))
      if (fields.unverifiedServices && !fields.unverifiedServices.length) delete fields.unverifiedServices
      if (e.unverified && conf === 'low') { log.hoppade.push(`${name}: redan grå (${e.name})`); continue }
      if (keep.some((x) => CORE.includes(x)) && !confirmedCore.length) fields.confidence = e.confidence || 'high'
      if (e.description && !e.description.includes(fields.description)) fields.description = `${fields.description} ${e.description}`.trim()
      for (const k of Object.keys(fields)) if (fields[k] !== undefined) e[k] = fields[k]
      if (conf !== 'low') delete e.unverified
      if (!fields.unverifiedServices) delete e.unverifiedServices
      if (!geo) { delete e.query; delete e.nearLat; delete e.nearLon; delete e.maxKm }
      if (GENERIC.test(e.name) && !GENERIC.test(name)) { console.log(`  namn: ${e.name} → ${name}`); e.name = name }
      if (conf === 'high' && confirmedCore.length) log.uppgr++; else if (conf === 'low') log.gra++; else log.kompl++
      console.log(`${(conf === 'low' ? 'GRÅ  ' : conf === 'high' ? 'UPPGR' : 'KOMPL').padEnd(6)} ${e.name.padEnd(46)} ${was} → ${e.services.join(',')}${e.unverifiedServices ? ' (påstått: ' + e.unverifiedServices + ')' : ''}`)
    } else {
      const n = { name: finalName, ...fields }
      for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]
      reg.push(n); log.nya++
      console.log(`NY ${conf.padEnd(6)} ${finalName.padEnd(46)}${geo ? ' [geokod: ' + geo.query + '] ' : ' '} ${n.services.join(',')}${n.unverifiedServices ? ' (påstått: ' + n.unverifiedServices + ')' : ''}${near.length ? '  [nära: ' + near[0].name + ' ' + Math.round(dist(near[0].lat, near[0].lon, r.lat, r.lon) * 1000) + ' m]' : ''}`)
    }
  }
}
console.log(`\nNya ${log.nya}, uppgraderade ${log.uppgr}, kompletterade ${log.kompl}, grå-kompl ${log.gra}. Hoppade (${log.hoppade.length}):`)
log.hoppade.forEach((h) => console.log('  ' + h))
console.log('Register:', reg.length)
if (!dry) { fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n'); console.log('Skrev', REG) }
