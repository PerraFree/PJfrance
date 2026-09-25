import fs from 'fs'
import { execSync } from 'child_process'
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const j = JSON.parse(execSync('git show origin/gh-pages:data/stations-seed.json', { cwd: '/home/user/PJfrance', maxBuffer: 1 << 28 }).toString()); const st = j.stations ?? j
const reg = JSON.parse(fs.readFileSync('/home/user/PJfrance/scripts/curated-places.json', 'utf8'))
const names = fs.readFileSync(S + 'tomning-names.txt', 'utf8').split('\n').filter(Boolean)
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
console.log('updatedAt', j.updatedAt, '| totalt', st.length, '| latrin', st.filter(s => s.services.includes('latrin')).length, '| gravatten', st.filter(s => s.services.includes('gravatten')).length)
for (const n of names) {
  const p = reg.find(r => r.name === n); const s = st.find(x => norm(x.name) === norm(n))
  if (!s) { console.log('SAKNAS:', n, p?.query ? `(query "${p.query}")` : ''); continue }
  const km = p?.nearLat != null ? dist(s.lat, s.lon, p.nearLat, p.nearLon).toFixed(1) + ' km från ort' : 'exakt'
  console.log('ok ', n, '|', s.services.join('+'), '|', km)
}
