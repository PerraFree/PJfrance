// Gör om kandidatlistan (docs/kandidatplatser-husbilsplats-park4night.md) till
// OBEKRÄFTADE registerposter (grå nål). Körs från repo-roten: node <fil> [--dry]
import fs from 'fs'
const DRY = process.argv.includes('--dry')
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const doc = fs.readFileSync('./docs/kandidatplatser-husbilsplats-park4night.md', 'utf8')
const regPath = './scripts/curated-places.json'
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'))
const st = JSON.parse(fs.readFileSync(S + 'seed.json', 'utf8')).stations
const norm = (s) => (s || '').toLowerCase().replace(/[–\-–]/g, ' ').replace(/[^a-zåäöé0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }

// Ort → ungefärlig koordinat: median av befintliga platser vars ADRESS eller
// NAMN innehåller ortnamnet som eget ord (seeden saknar ofta ort i adressen).
const townCoord = (ort) => {
  const base = norm(ort.replace(/\(.*?\)/g, '').split(/[,/]/)[0])
  if (!base || base.length < 3) return null
  const re = new RegExp('(^|[^a-zåäö])' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zåäö]|$)')
  const hits = st.filter((s) => re.test(norm(s.address)) || re.test(norm(s.name)))
  if (hits.length < 2) return null
  const lat = median(hits.map((s) => s.lat)), lon = median(hits.map((s) => s.lon))
  const close = hits.filter((s) => dist(s.lat, s.lon, lat, lon) < 40).length / hits.length
  return close >= 0.5 ? { lat, lon } : null
}
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] }

const existingNames = new Set([...st.map((s) => norm(s.name)), ...reg.map((p) => norm(p.name))])
const stats = { rows: 0, added: 0, coords: 0, geocode: 0, dupName: 0, dupNear: 0, noTown: 0, skip: 0, gasol: 0, brus: 0 }
const skipped = []
function servicesFrom(text, name) {
  const t = (text + ' ' + name).toLowerCase()
  const sv = new Set()
  const neg = /ingen tömning|no dump|no draining|no water draining|ej tömning|inte tömning/.test(t)
  if (/latrin|kassett|toatöm|toalettöm|chemical toilet|svartvatten|black ?water|wc-tömning|toilet (disposal|cleaning|emptying)/.test(t)) sv.add('latrin')
  if (/gråvatten|grey ?water|gray ?water|avloppstömning|water draining/.test(t) && !/no water draining|no grey/.test(t)) sv.add('gravatten')
  if (/tömningsstation|tömning\b|tömning,|dump ?station|sanitary/.test(t) && !neg) { sv.add('latrin'); sv.add('gravatten') }
  if (/färskvatten|fresh ?water|vattenpåfyllning|dricksvatten|\bvatten\b|\bwater\b/.test(t) && !/no water\b|inget vatten|utan vatten/.test(t)) sv.add('vatten')
  if (/camping|stugby|campground/.test(t)) sv.add('camping')
  if (sv.size === 0 || !sv.has('camping')) sv.add('stallplats')
  return [...sv]
}
let region = ''
for (const line of doc.split('\n')) {
  const h = line.match(/^## (.+)/); if (h) { region = h[1]; continue }
  if (!line.startsWith('| ') || /^\| Namn|^\|---/.test(line)) continue
  const cells = line.split('|').slice(1, -1).map((c) => c.trim())
  if (cells.length < 5) continue
  stats.rows++
  let [name, ort, koord, tj, src] = cells
  if (/mall-text|brus|återanvänd|misstänkt/i.test(line)) { stats.brus++; skipped.push('brus: ' + name); continue }
  if (/gasol/i.test(tj) && !/tömning|vatten/i.test(tj)) { stats.gasol++; continue }
  if (/redan i registret|finns redan|nu tillagd/i.test(line)) { stats.dupName++; continue }
  const nk = norm(name)
  if (existingNames.has(nk)) { stats.dupName++; continue }
  const cm = koord.match(/(-?\d{2}\.\d+),\s*(-?\d{2}\.\d+)/)
  const e = { name, services: servicesFrom(tj, name), source: 'egen', unverified: true,
    description: `Obekräftad plats (${src.replace(/^https?:\/\//, '').split('/')[0]}, ej primärkälla): ${tj && !/^ej specificerat/.test(tj) ? tj : 'inga tjänster angivna'}. Har du varit här? Bekräfta i appen.`,
    website: /^https?:/.test(src) ? src : 'https://' + src }
  if (cm) {
    const lat = +cm[1], lon = +cm[2]
    if (lat < 55 || lat > 69.1 || lon < 10.5 || lon > 24.3) { stats.skip++; skipped.push('koord utanför Sverige: ' + name); continue }
    const near = st.find((s) => dist(s.lat, s.lon, lat, lon) < 0.3)
    if (near) { stats.dupNear++; skipped.push(`nära befintlig (${near.name}): ${name}`); continue }
    e.lat = lat; e.lon = lon; stats.coords++
  } else {
    const tc = townCoord(ort)
    if (!tc) { stats.noTown++; skipped.push(`ort okänd (${ort}): ${name}`); continue }
    const am = name.match(/^(.+?) [–-] (.+)$/)
    if (am && /\d|väg|gatan|allé|plan|torg/i.test(am[2])) e.query = `${am[2]}, ${am[1]}`
    else if (/^(ställplats|husbilsparkering|rastplats)$/i.test(nk)) { stats.skip++; skipped.push('för generiskt namn: ' + name + ' ' + ort); continue }
    else e.query = `${name.replace(/\(.*?\)/g, '').trim()}, ${ort.replace(/\(.*?\)/g, '').split(/[,/]/)[0].trim()}`
    e.nearLat = +tc.lat.toFixed(4); e.nearLon = +tc.lon.toFixed(4); e.maxKm = 25; stats.geocode++
  }
  e.address = e.address ?? undefined
  reg.push(e); existingNames.add(nk); stats.added++
}
for (const x of reg) for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k]
console.log(stats, '| register totalt:', reg.length)
fs.writeFileSync(S + 'kandidater-hoppade.txt', skipped.join('\n') + '\n')
if (!DRY) fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + '\n')
