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
const borta = []
const tappat = []
for (const s of old.stations ?? old) {
  if (!core(s)) continue
  const n = nyaId.get(s.id)
  if (!n) borta.push(s)
  else {
    const lost = s.services.filter((x) => CORE.has(x) && !n.services.includes(x))
    if (lost.length) tappat.push({ s, lost })
  }
}
const rad = (s, extra = '') => `${s.id} | ${s.name} | ${s.services.join(',')}${extra}`
const lista = [
  ...borta.map((s) => '- borta: ' + rad(s)),
  ...tappat.map(({ s, lost }) => '- tappar ' + lost.join(',') + ': ' + rad(s)),
]
console.log(`Jämfört med förra seeden: ${borta.length} platser med tömning/vatten/gasol borta, ${tappat.length} har tappat sådana tjänster (gräns ${GRANS}).`)
if (process.env.SEED_DIFF) writeFileSync(process.env.SEED_DIFF, lista.join('\n'))
const antal = borta.length + tappat.length
if (antal > GRANS && process.env.TILLAT_BORTFALL !== 'true') {
  console.error(`\nFör stort bortfall (${antal} > ${GRANS}) – publicerar inte. Granska listan; är det avsiktligt: kör synken manuellt med "tillat_bortfall".`)
  for (const l of lista.slice(0, 60)) console.error(l)
  process.exit(1)
}
console.log('OK: bortfallet är inom gränsen')
