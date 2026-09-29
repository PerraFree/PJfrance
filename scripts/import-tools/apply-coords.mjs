// Lägger in exakta koordinater från coords-*.json i scripts/curated-places.json.
// node apply-coords.mjs [--dry]
import fs from 'fs'
const DRY = process.argv.includes('--dry')
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const regPath = './scripts/curated-places.json'
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'))
const norm = (s) => (s || '').toLowerCase().replace(/[^a-zåäö0-9]/g, '')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
let applied = 0, skipped = []
for (const f of ['coords-1.json', 'coords-2.json', 'coords-3.json', 'coords-4.json']) {
  let j
  try { j = JSON.parse(fs.readFileSync(S + f, 'utf8')) } catch { console.log('saknas/trasig:', f); continue }
  for (const r of j.results ?? []) {
    const p = reg.find((x) => norm(x.name) === norm(r.name))
    if (!p) { skipped.push(`${r.name}: ej i registret`); continue }
    if (typeof r.lat !== 'number' || typeof r.lon !== 'number' || r.confidence === 'none') { skipped.push(`${r.name}: ingen koordinat (${r.confidence})`); continue }
    if (r.lat < 55 || r.lat > 69.1 || r.lon < 10.9 || r.lon > 24.2) { skipped.push(`${r.name}: utanför Sverige ${r.lat},${r.lon}`); continue }
    const town = typeof r.townLat === 'number' && typeof r.townLon === 'number' ? dist(r.lat, r.lon, r.townLat, r.townLon) : null
    if (town !== null && town > 30) { skipped.push(`${r.name}: ${town.toFixed(0)} km från ankaret ${r.townName}`); continue }
    const old = typeof p.nearLat === 'number' ? dist(r.lat, r.lon, p.nearLat, p.nearLon) : null
    p.lat = Math.round(r.lat * 1e5) / 1e5
    p.lon = Math.round(r.lon * 1e5) / 1e5
    delete p.query
    if (town !== null) { p.nearLat = r.townLat; p.nearLon = r.townLon; p.maxKm = 30 } else { delete p.nearLat; delete p.nearLon; delete p.maxKm }
    const src = String(r.source).split(/\s/)[0]; const note = `Koordinat från ${src}`
    if (!(p.description || '').includes(src)) p.description = [p.description, note].filter(Boolean).join(' ')
    applied++
    console.log(`✔ ${p.name} → ${p.lat},${p.lon} [${r.confidence}] ankare ${r.townName ?? '-'} ${town === null ? '' : town.toFixed(1) + ' km'} | gamla ankaret ${old === null ? '-' : old.toFixed(0) + ' km'} | ${r.source}`)
  }
}
console.log(`\napplicerade ${applied}, hoppade ${skipped.length}`)
for (const s of skipped) console.log('  -', s)
if (!DRY) fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + '\n')
