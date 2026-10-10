// Importerar golfsvepets resultat (golf-*.json) i scripts/curated-places.json.
// --dry = bara lista. high → bekräftade tjänster; medium → stallplats bekräftad + påstådda tjänster;
// low → grå (unverified). Dedupe mot publicerad seed (400 m) och registret (namn/existing_name).
import fs from 'fs'
const S = '/tmp/claude-0/-home-user-PJfrance/9b0981ce-396d-5ade-a574-c11dcb80a101/scratchpad'
const REG = '/home/user/PJfrance/scripts/curated-places.json'
const dry = process.argv.includes('--dry')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'))
const seed = JSON.parse(fs.readFileSync(`${S}/seed.json`, 'utf8')).stations
const CORE = ['vatten', 'gravatten', 'latrin']
const byKommun = {}
for (const s of seed) { if (s.kommun) (byKommun[s.kommun] = byKommun[s.kommun] || []).push(s) }
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] }
const ALIAS = { Falun: 'Falu' }
const ANCHORS = { Forshaga: { lat: 59.6, lon: 13.47 } }
// Kommuner utan platser i seeden får sitt ankare från kommunpolygonens mittpunkt (samma som import-discovery.mjs, okt 2026)
const KOMMUNER = JSON.parse(fs.readFileSync('/home/user/PJfrance/scripts/kommuner.json', 'utf8')).kommuner
const kNorm = (n) => (n || '').replace(/ Stad$/, '').replace(/s$/, '').toLowerCase()
const MAXKM = { Torsby: 60, Hagfors: 40, Arvika: 40, Årjäng: 40, Säffle: 35, Kristianstad: 40, Tanum: 35, Strömstad: 30, Hässleholm: 35, Ljusdal: 60, Härjedalen: 80 }
const kommunAnchor = (k) => { if (ANCHORS[k]) return ANCHORS[k]; k = ALIAS[k] || k; const arr = byKommun[k] || byKommun[k + 's'] || byKommun[(k || '').replace(/s$/, '')]; if (arr) return { lat: median(arr.map((s) => s.lat)), lon: median(arr.map((s) => s.lon)) }; const km = KOMMUNER.find((x) => kNorm(x.name) === kNorm(k)); return km ? { lat: km.center[1], lon: km.center[0] } : null }
const cleanClub = (n) => n.replace(/\s*\(.*?\)/g, '').replace(/\s*[–-]\s.*$/, '').replace(/\s+(ställplats(er)?|husbils-\/husvagnsparkering|husbilsparkering|husbilsplatser|uppställningsplats|camping\/ställplats|Golf Caravan Park)\s*$/i, '').replace(/\bGK\b/, 'Golfklubb').replace(/\bG&CC\b/, 'Golf & Country Club').trim()
const DELETE = ['Alfta-Edsbyns Golfklubb', 'Hudiksvalls Golfklubb']
const SKIP = /Idrefjällens|Sälenfjällens|Högbo|Alfta-Edsbyns/i
// Turistråd/kommun räknas som primärkälla (samma princip som tömningssvepet 24 sep)
const TURISTRAD = { 'Trelleborgs GK ställplats': ['vatten', 'gravatten', 'latrin'], 'Herrljunga Golfklubb ställplats': ['vatten', 'latrin'], 'Örnsköldsviks Golfklubb Puttom ställplats': ['vatten'] }
for (const n of DELETE) { const i = reg.findIndex((x) => x.name === n); if (i >= 0) { reg.splice(i, 1); console.log('BORT   ' + n) } }
const r5 = (x) => Math.round(x * 1e5) / 1e5
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const isGolf = (n) => /golf|\bgk\b|g&cc/i.test(n)
const files = fs.readdirSync(S).filter((f) => /^golf-\d\.json$/.test(f)).sort()
const log = { nya: 0, uppgr: 0, kompl: 0, gra: 0, hoppade: [] }

for (const f of files) {
  let arr
  try { arr = JSON.parse(fs.readFileSync(`${S}/${f}`, 'utf8')) } catch (e) { console.log(`${f}: oläsbar (${e.message})`); continue }
  for (const r of arr) {
    const name = (r.name || '').replace(/\s*\(UTANFÖR REGION[^)]*\)/, '').trim()
    if (!name || SKIP.test(name) || r.skip) continue // r.skip = agenten säger uttryckligen "lägg inte in" (del 3, okt 2026)
    let conf = r.confidence
    const claimed = [...new Set((r.services || []).filter((s) => CORE.includes(s)))]
    if (r.services_unclear) { /* citatet är otydligt → behandla som påstått */ }
    let confirmedCore = conf === 'high' && !r.services_unclear ? claimed : []
    let unverifiedCore = conf === 'high' && !r.services_unclear ? [] : claimed
    if (TURISTRAD[name]) { confirmedCore = TURISTRAD[name]; unverifiedCore = claimed.filter((x) => !confirmedCore.includes(x)); r.confidence = 'high'; conf = 'high' }
    let geo = null
    if (typeof r.lat !== 'number' || typeof r.lon !== 'number' || r.lat < 55 || r.lat > 69.1) {
      const anchor = kommunAnchor(r.kommun)
      if (!anchor) { log.hoppade.push(`${name}: ingen koordinat och okänd kommun "${r.kommun}" (${conf})`); continue }
      let q = (r.geocode_query || r.address || '').replace(/\s*\(.*?\)/g, '').replace(/,\s*(vid|norr|söder|väster|öster|nära|\d+\s*km)\b.*$/i, '').replace(/\s+/g, ' ').trim()
      if (!q || /\bkm\b|geokoda|klubbhuset|\//i.test(q)) q = `${cleanClub(name)}, ${r.kommun}`
      q = q.replace(/\bGK\b/, 'Golfklubb')
      geo = { query: q, nearLat: r5(anchor.lat), nearLon: r5(anchor.lon), maxKm: MAXKM[r.kommun] || 25 }
      r.lat = anchor.lat; r.lon = anchor.lon // bara för dubblettkoll nedan
    }
    if (r.note && /nedlagd|stängd permanent|ingen ställplats|erbjuder inte/i.test(r.note) && !claimed.length && conf !== 'high') { log.hoppade.push(`${name}: ${r.note.slice(0, 90)}`); continue }

    // Befintlig registerpost? (existing_name eller namnlikhet)
    let e = null
    if (r.existing_name) e = reg.find((x) => norm(x.name) === norm(r.existing_name))
    if (!e) e = reg.find((x) => norm(x.name) === norm(name))
    if (!e) e = reg.find((x) => isGolf(x.name) && x.lat != null && dist(x.lat, x.lon, r.lat, r.lon) < 0.4)
    // Befintlig seed-station (OSM/TRV/register) inom 400 m med golfnamn?
    const near = seed.filter((s) => isGolf(s.name) && dist(s.lat, s.lon, r.lat, r.lon) < 0.4).sort((a, b) => dist(a.lat, a.lon, r.lat, r.lon) - dist(b.lat, b.lon, r.lat, r.lon))
    const nearConfirmed = near.find((s) => !s.unverified && s.services.some((x) => CORE.includes(x)))
    if (!e && nearConfirmed && !confirmedCore.some((x) => !nearConfirmed.services.includes(x)) && !unverifiedCore.length) {
      log.hoppade.push(`${name}: finns redan bekräftad (${nearConfirmed.name}, ${nearConfirmed.services})`); continue
    }
    // Lägg koordinaten på befintlig OSM-station inom 100–400 m så de slås ihop i appen
    let lat = r5(r.lat), lon = r5(r.lon)
    if (geo) { lat = undefined; lon = undefined }
    if (!geo && !e && near.length && dist(near[0].lat, near[0].lon, r.lat, r.lon) > 0.1 && near[0].source === 'osm') { lat = r5(near[0].lat); lon = r5(near[0].lon) }

    const desc = []
    if (r.quote) desc.push(`Källa (${r.source || 'klubbens webbplats'}): "${r.quote.replace(/"/g, "'")}"`)
    if (conf !== 'high' || r.services_unclear) desc.push(conf === 'low' ? 'Obekräftad plats (aggregator/forum, ej primärkälla). Har du varit här? Bekräfta i appen.' : 'Ställplats bekräftad av klubben; tömning/vatten ej entydigt belagt. Har du varit här? Bekräfta i appen.')
    if (r.note) desc.push(r.note.replace(/"/g, "'"))

    const fields = {
      lat, lon, ...(geo || {}),
      services: [...new Set([...confirmedCore, 'stallplats'])],
      source: 'egen',
      description: desc.join(' '),
      website: r.website || r.source || undefined,
      fee: r.fee || undefined, openingHours: r.openingHours || undefined, phone: r.phone || undefined,
      season: r.season ? (/året runt|year/i.test(r.season) ? 'year-round' : 'seasonal') : undefined,
      confidence: conf === 'low' ? 'low' : conf === 'medium' || r.services_unclear ? 'medium' : 'high',
    }
    if (r.season && fields.season === 'seasonal') fields.openingHours = fields.openingHours ? `${fields.openingHours}; säsong ${r.season}` : `Säsong ${r.season}`
    if (conf === 'low') fields.unverified = true
    if (unverifiedCore.length) fields.unverifiedServices = unverifiedCore

    if (e) {
      const was = e.unverified ? 'grå' : e.services.join(',')
      const keepCore = e.unverified ? [] : e.services.filter((x) => CORE.includes(x))
      fields.services = [...new Set([...keepCore, ...fields.services])]
      // Behåll befintliga påstådda tjänster som den nya källan varken bekräftar eller motsäger (Stjärnfors-lärdom, okt 2026)
      fields.unverifiedServices = [...new Set([...(e.unverifiedServices || []), ...(fields.unverifiedServices || [])])].filter((x) => !fields.services.includes(x))
      if (fields.unverifiedServices && !fields.unverifiedServices.length) delete fields.unverifiedServices
      if (keepCore.length && !confirmedCore.length) fields.confidence = e.confidence || 'high'
      for (const k of Object.keys(fields)) if (fields[k] !== undefined) e[k] = fields[k]
      if (conf !== 'low') delete e.unverified
      if (!fields.unverifiedServices) delete e.unverifiedServices
      if (!geo) { delete e.query; delete e.nearLat; delete e.nearLon; delete e.maxKm }
      if (!/ställplats|golfcamp/i.test(e.name) && /ställplats|golfcamp/i.test(name)) e.name = name
      if (conf === 'high' && confirmedCore.length) log.uppgr++; else if (conf === 'low') log.gra++; else log.kompl++
      console.log(`${(conf === 'low' ? 'GRÅ  ' : conf === 'high' ? 'UPPGR' : 'KOMPL').padEnd(6)} ${e.name.padEnd(46)} ${was} → ${e.services.join(',')}${e.unverifiedServices ? ' (påstått: ' + e.unverifiedServices + ')' : ''}`)
    } else {
      const n = { name, ...fields }
      for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]
      reg.push(n); log.nya++
      console.log(`NY ${conf.padEnd(6)} ${name.padEnd(46)}${geo ? ' [geokod: ' + geo.query + '] ' : ' '} ${n.services.join(',')}${n.unverifiedServices ? ' (påstått: ' + n.unverifiedServices + ')' : ''}${near.length ? '  [nära: ' + near[0].name + ']' : ''}`)
    }
  }
}
console.log(`\nNya ${log.nya}, uppgraderade ${log.uppgr}, kompletterade ${log.kompl}, grå ${log.gra}. Hoppade (${log.hoppade.length}):`)
log.hoppade.forEach((h) => console.log('  ' + h))
console.log('Register:', reg.length)
if (!dry) { fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n'); console.log('Skrev', REG) }
