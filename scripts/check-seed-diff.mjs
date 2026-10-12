#!/usr/bin/env node
// Vakt i sync-data.yml (före commit): jämför den nya seeden med den
// committade. Försvinner fler än GRANS platser med tömning, vatten eller
// gasol på en gång stoppas synken – en ändrad taggtolkning tog 12 okt 2026
// tyst bort ~200 riktiga campingtömningar och återvinningscentraler (totalen
// låg ändå över golvet i check-seed.mjs). Medvetna ändringar godkänns genom
// att köra "Synka stationsdata" manuellt med rutan "tillat_bortfall".
// Skriver listan till SEED_DIFF (om satt) för ärendet.
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const GRANS = Number(process.env.SEED_DIFF_LIMIT ?? 25)
const CORE = new Set(['gravatten', 'latrin', 'vatten', 'gasol'])
// Registerposter räknas inte: de ändras för hand och har egna vakter
// (check-register.mjs, bortfallsärendet). Här gäller OSM och Trafikverket.
const core = (s) => !String(s.id).startsWith('curated-') && (s.services ?? []).some((x) => CORE.has(x))

let old
try {
  old = JSON.parse(
    process.env.OLD_SEED
      ? readFileSync(process.env.OLD_SEED, 'utf8')
      : execSync('git show HEAD:public/data/stations-seed.json', { maxBuffer: 1 << 30 }).toString(),
  )
} catch {
  console.log('Ingen tidigare seed att jämföra med.')
  process.exit(0)
}
const nu = JSON.parse(readFileSync(new URL('../public/data/stations-seed.json', import.meta.url), 'utf8'))
const nyaId = new Map((nu.stations ?? nu).map((s) => [s.id, s]))
// En plats som bytt id (OSM-nod blev yta, registerpost ersatte OSM-noden)
// räknas inte som försvunnen om en plats med samma kärntjänster finns inom
// 150 m i den nya seeden (granskning 12 okt 2026: annars falsklarm).
const dist = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371e3
}
const grid = new Map()
const cellOf = (s) => `${Math.round(s.lat / 0.002)},${Math.round(s.lon / 0.004)}`
for (const s of nu.stations ?? nu) {
  const k = cellOf(s)
  grid.set(k, [...(grid.get(k) ?? []), s])
}
const ersatt = (s, need = s.services.filter((x) => CORE.has(x))) => {
  const [cx, cy] = cellOf(s).split(',').map(Number)
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    for (const n of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
      if (n.id !== s.id && dist(s, n) <= 150 && need.every((x) => n.services.includes(x) || (n.unverifiedServices ?? []).includes(x))) return true
    }
  }
  return false
}
const borta = []
const tappat = []
for (const s of old.stations ?? old) {
  if (!core(s)) continue
  const n = nyaId.get(s.id)
  if (!n) {
    if (!ersatt(s)) borta.push(s)
  }
  else {
    // Grå (obekräftad) räknas inte som tappad – det är det försiktiga hållet.
    const lost = s.services.filter((x) => CORE.has(x) && !n.services.includes(x) && !(n.unverifiedServices ?? []).includes(x))
    if (lost.length) tappat.push({ s, lost })
  }
}
// Per kategori (även sopor, återvinning, ställplats, camping): försvinner
// mer än 5 % (och minst 15) utan ersättare inom 150 m är något systematiskt
// fel – så tappade en taggregel 74 av 831 återvinningscentraler 12 okt 2026.
const KATEGORIER = ['gravatten', 'latrin', 'vatten', 'gasol', 'sopor', 'atervinning', 'stallplats', 'camping']
const oldList = (old.stations ?? old).filter((s) => !String(s.id).startsWith('curated-'))
const kategoriFel = []
for (const c of KATEGORIER) {
  const tot = oldList.filter((s) => s.services.includes(c))
  const gone = tot.filter((s) => !nyaId.has(s.id) && !ersatt(s, [c]))
  if (gone.length >= 15 && gone.length > tot.length * 0.05) kategoriFel.push(`${c}: ${gone.length} av ${tot.length} borta utan ersättare (${((100 * gone.length) / tot.length).toFixed(1)} %)`)
}
for (const k of kategoriFel) console.log('Kategori: ' + k)
const rad = (s, extra = '') => `${s.id} | ${s.name} | ${s.services.join(',')}${extra}`
const lista = [
  ...borta.map((s) => '- borta: ' + rad(s)),
  ...tappat.map(({ s, lost }) => '- tappar ' + lost.join(',') + ': ' + rad(s)),
]
console.log(`Jämfört med förra seeden: ${borta.length} platser med tömning/vatten/gasol borta, ${tappat.length} har tappat sådana tjänster (gräns ${GRANS}).`)

const antal = borta.length + tappat.length
if (process.env.SEED_DIFF) writeFileSync(process.env.SEED_DIFF, [...kategoriFel.map((k) => '- kategori ' + k), ...lista].join('\n'))
if ((antal > GRANS || kategoriFel.length) && process.env.TILLAT_BORTFALL !== 'true') {
  console.error(`\nFör stort bortfall (${antal} kärnplatser, gräns ${GRANS}${kategoriFel.length ? '; ' + kategoriFel.join('; ') : ''}) – publicerar inte. Granska listan; är det avsiktligt: kör synken manuellt med "tillat_bortfall".`)
  for (const l of lista.slice(0, 60)) console.error(l)
  process.exit(1)
}
console.log('OK: bortfallet är inom gränsen')
