// Efterkontroll restlistorna 11 okt: finns posterna i seeden och ligger de rimligt?
import fs from 'fs'
import { execSync } from 'child_process'
const S = process.env.SCRATCH ?? '/tmp'
execSync(`cd /home/user/PJfrance && git fetch -q origin gh-pages && git show origin/gh-pages:data/stations-seed.json > ${S}/seed-new.json`)
const seed = JSON.parse(fs.readFileSync(`${S}/seed-new.json`, 'utf8'))
const reg = JSON.parse(fs.readFileSync('/home/user/PJfrance/scripts/curated-places.json', 'utf8'))
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
console.log('Seed', seed.updatedAt, seed.stations.length, 'platser')
const NAMES = ['West Coast Gasol, Vänersborg', 'Expressgasol – gasolautomat Tingsryd', 'Expressgasol – gasolautomat Ronneby', 'Levol gasolautomat, Onsala', 'Gasol – jem & fix Alvesta', 'Riddares ställplats (Tingstäde träsk)', 'Kalvkätte ställplats (Kalvkätte trädgård)', 'Camping Gålö Havsbad', 'Östanå Havscamp', 'Gasspecialisten Kiruna', 'Ställplats Fengersfors (Knarrbysjön)']
for (const n of NAMES) {
  const p = reg.find((x) => x.name === n)
  const m = seed.stations.filter((s) => s.name === n)
  if (!m.length) { console.log('SAKNAS  ', n, p?.query ? '[query: ' + p.query + ']' : ''); continue }
  const s = m[0]
  const d = p?.nearLat != null ? dist(s.lat, s.lon, p.nearLat, p.nearLon).toFixed(1) + ' km från ankaret' : ''
  console.log('OK      ', n, '→', s.services.join(','), s.unverified ? 'GRÅ' : '', s.unverifiedServices ? 'påstått ' + s.unverifiedServices : '', `${s.lat.toFixed(4)},${s.lon.toFixed(4)}`, d)
}
const feng = seed.stations.filter((s) => /Fengersfors/.test(s.name))
console.log('Fengersfors i seeden:', feng.map((s) => s.id + ' [' + s.services + ']').join(' | '))
