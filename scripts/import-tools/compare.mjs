import fs from 'fs'
import { execSync } from 'child_process'
const seedRaw = execSync('git show origin/gh-pages:data/stations-seed.json', { cwd: '/home/user/PJfrance', maxBuffer: 1 << 28 }).toString()
const j = JSON.parse(seedRaw); const st = j.stations ?? j
const reg = JSON.parse(fs.readFileSync('/home/user/PJfrance/scripts/curated-places.json', 'utf8'))
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const byName = new Map(); for (const s of st) byName.set(norm(s.name), s)
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
console.log('updatedAt', j.updatedAt, '| totalt', st.length, '| gasol', st.filter(s => s.services.includes('gasol')).length, '| egen gasol', st.filter(s => s.services.includes('gasol') && s.source === 'egen').length, '| pris', st.filter(s => s.gasolPrice).length)
const missing = [], far = []
for (const p of reg.filter(r => r.services?.includes('gasol'))) {
  const s = byName.get(norm(p.name))
  if (!s) { missing.push(p.name); continue }
  if (p.nearLat != null) { const km = dist(s.lat, s.lon, p.nearLat, p.nearLon); if (km > 6) far.push(`${p.name} ${km.toFixed(1)} km (max ${p.maxKm ?? 30})`) }
}
console.log('SAKNAS (' + missing.length + '):', missing.join('; ') || '–')
console.log('>6 km (' + far.length + '):'); far.forEach(x => console.log('  ' + x))
for (const n of ['AGA Gasolautomat Gråbo', 'Gasol – jem & fix Alvesta', 'Gasol – jem & fix Söderhamn', 'Gasol – jem & fix Hässleholm']) { const s = byName.get(norm(n)); console.log(n, s ? `${s.lat},${s.lon}` : 'SAKNAS') }
