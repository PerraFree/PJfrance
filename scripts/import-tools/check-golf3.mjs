// Jämför golfsvep del 3:s registerposter mot publicerad seed: saknade + >6 km från ankare.
import fs from 'fs'
import { execSync } from 'child_process'
const S = process.env.SCRATCH ?? '/tmp'
execSync(`cd /home/user/PJfrance && git fetch -q origin gh-pages && git show origin/gh-pages:data/stations-seed.json > ${S}/seed-new.json`)
const seed = JSON.parse(fs.readFileSync(`${S}/seed-new.json`, 'utf8'))
const reg = JSON.parse(fs.readFileSync('/home/user/PJfrance/scripts/curated-places.json', 'utf8'))
const raw = JSON.parse(fs.readFileSync('/home/user/PJfrance/docs/import/golfklubbar-svep-del3-okt-2026.json', 'utf8'))
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const names = new Set(raw.filter((r) => !r.skip).flatMap((r) => [norm(r.name), norm(r.existing_name)]).filter(Boolean))
const posts = reg.filter((p) => names.has(norm(p.name)) || names.has(norm(p.name.replace(/ ställplats.*$/i, ''))))
console.log('Seed', seed.updatedAt, seed.stations.length, 'platser. Registerposter från svepet:', posts.length)
let ok = 0; const miss = [], far = []
for (const p of posts) {
  const m = seed.stations.find((s) => norm(s.name) === norm(p.name)) || (p.lat != null && seed.stations.find((s) => dist(s.lat, s.lon, p.lat, p.lon) < 0.05 && s.source === 'egen'))
  if (!m) { miss.push(`${p.name}${p.query ? ' [query: ' + p.query + ']' : ''}`); continue }
  ok++
  if (p.nearLat != null) { const d = dist(m.lat, m.lon, p.nearLat, p.nearLon); if (d > 6) far.push(`${p.name}: ${d.toFixed(1)} km från ankaret (${m.lat.toFixed(4)},${m.lon.toFixed(4)}) kommun ${m.kommun}`) }
}
console.log(`I seeden: ${ok}. Saknas (${miss.length}):`); miss.forEach((x) => console.log('  ' + x))
console.log(`>6 km från ankaret (${far.length}):`); far.forEach((x) => console.log('  ' + x))
