// Kontrollerar att de 31 rättade registerplatserna finns i publicerad seed
// och ligger inom maxKm från nearLat/nearLon. node verify31.mjs
import fs from 'fs'
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const seed = JSON.parse(fs.readFileSync(S + 'seed.json', 'utf8'))
const st = seed.stations ?? seed
const reg = JSON.parse(fs.readFileSync('./scripts/curated-places.json', 'utf8'))
const NAMES = ['Friiberghs Golfklubb ställplats','Källinge Gård','Stall Torsbrogården','Lysernas Ställplats','Bergbetningen','Lauterhorn Fårö','Brännebacka Gård','Tiraholms ställplats','Forsvik ställplats – Göta kanal','Brunkulla Gård','Harsa Konferens & Fritid','Hovra STF Vandrarhem','Eckeruds Gård','Borenshults slussar','Nybrovallen Grönhögens Camping','Quickstop Ratan','Tågstallarnas ställplats','Ställplats Kurjoviken','Lögdö Wild naturcamping vid Skälsjön','Älvkarleby GK ställplats','Hyppelns gästhamn','Röks Lanthandel','Berkinge Bad & Fiskecamp','Naturfantastens ställplats','Trafikverkets rastplats Örby','Tömningsplats Arboga','Mangenbadens Camping','Storsjö camping och ställplats','Höga kusten - bron','Norråkers Camping & Fiskecenter','Kukkolaforsen Turist & Konferens','Norrsken Lodge']
const norm = (s) => (s || '').toLowerCase().replace(/[^a-zåäö0-9]/g, '')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
console.log('seed', seed.generatedAt ?? '', st.length)
let ok = 0, missing = [], far = []
for (const n of NAMES) {
  const r = reg.find((p) => norm(p.name) === norm(n))
  if (!r) { console.log('EJ I REGISTRET:', n); continue }
  const s = st.find((x) => norm(x.name) === norm(n)) || st.find((x) => norm(x.name).includes(norm(n)))
  if (!s) { missing.push(`${n} [${r.query ?? (r.lat + ',' + r.lon)}]`); continue }
  const refLat = r.nearLat ?? r.lat, refLon = r.nearLon ?? r.lon
  const d = dist(s.lat, s.lon, refLat, refLon)
  const lim = r.maxKm ?? 30
  if (d > lim) far.push(`${n} ${d.toFixed(1)} km (max ${lim})`)
  else if (d > lim * 0.7) console.log(`nära gränsen: ${n} ${d.toFixed(1)} km (max ${lim})`)
  ok++
}
console.log(`i seed: ${ok}/${NAMES.length}`)
console.log('SAKNAS:', missing.length ? '\n  ' + missing.join('\n  ') : 'inga')
console.log('FÖR LÅNGT BORT:', far.length ? '\n  ' + far.join('\n  ') : 'inga')
