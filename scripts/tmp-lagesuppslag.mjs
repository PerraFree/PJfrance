#!/usr/bin/env node
// TILLFÄLLIGT (tas bort direkt efter körning): slår upp exakta lägen för
// registerposter med osäker position – OSM-objekt via namn nära en punkt
// (Overpass) och exakta adresser (Nominatim). Skriver JSON till loggen.
const UA = 'Tomningskartan-lagesuppslag/1.0 (+https://tomningskartan.se/om/)'
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function overpass(q) {
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(25000) })
      if (res.ok) return (await res.json()).elements ?? []
    } catch {}
  }
  return null
}
async function nominatim(q) {
  await sleep(1200)
  try {
    const res = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&countrycodes=se&q=' + encodeURIComponent(q), { headers: { 'User-Agent': UA } })
    return res.ok ? (await res.json()).map((h) => ({ lat: +h.lat, lon: +h.lon, type: `${h.category}/${h.type}`, name: h.display_name.slice(0, 120) })) : null
  } catch { return null }
}
const pos = (e) => ({ lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon })

// [etikett, namnregex, lat, lon, radie m, adresser]
const T = [
  ['Borås City Gross/gasolautomat', 'City Gross|[Gg]asol', 57.721, 12.94, 2500, ['Göteborgsvägen 181, Borås']],
  ['Borås Plantagen', 'Plantagen', 57.721, 12.94, 3000, []],
  ['Skurup Linde-automat/jem&fix', 'jem|Jem|[Gg]asol|AGA|Linde', 55.477, 13.50, 2000, ['Korrehusgatan 3, Skurup', 'Korrehusgatan 5A, Skurup', 'Korrehusgatan 5, Skurup']],
  ['Karlshamn Elgiganten/jem&fix', 'Elgiganten|jem|Jem', 56.17, 14.86, 3000, ['Nyemöllevägen 3, Karlshamn']],
  ['Eslöv Elgiganten/jem&fix', 'Elgiganten|jem|Jem', 55.839, 13.304, 2500, ['Fallskärmsgatan 7B, Eslöv', 'Fallskärmsgatan 7F, Eslöv', 'Fallskärmsgatan 7, Eslöv']],
  ['Visby reningsverk', 'reningsverk|Reningsverk', 57.63, 18.28, 4000, ['Färjeleden 5, Visby']],
  ['Östhammar tömning', 'tömning|Tömning|reningsverk|Reningsverk|ställplats|Ställplats', 60.258, 18.37, 6000, []],
  ['Stenungsunds Båtklubb', 'Båtklubb|båtklubb|SBK', 58.07, 11.83, 4000, []],
  ['Färgelanda Ridklubb', 'Ridklubb|ridklubb|Ridhus|ridhus', 58.57, 12.0, 15000, []],
  ['Sikargården', 'Sikargården|Sikar', 58.86, 16.10, 15000, ['Sikargården, Simonstorp']],
  ['Hästskär', 'Hästskär', 59.6, 17.1, 25000, ['Hästskär, Enköping']],
  ['Malmö City GK', '[Gg]olf', 55.57, 13.08, 6000, ['Klågerupsvägen 469, Malmö']],
  ['Strandstuviken/Örstig', 'Strandstuvik|Örstig', 58.72, 17.05, 12000, []],
  ['Stjärnfors GK', '[Gg]olf|Stjärnfors|Stjernfors', 59.83, 15.0, 5000, []],
  ['Örebro Truckstop', '[Tt]ruck', 59.29, 15.2, 12000, []],
  ['Klässbol gästhamn/väveri', 'Klässbol|[Gg]ästhamn|[Hh]amn|[Bb]rygga|Linneväveri', 59.53, 12.745, 2500, ['Klässbols gästhamn, Arvika']],
]
const out = {}
for (const [label, re, lat, lon, r, addrs] of T) {
  const q = `[out:json][timeout:20];(nwr(around:${r},${lat},${lon})["name"~"${re}"];nwr(around:${r},${lat},${lon})["amenity"="sanitary_dump_station"];nwr(around:${r},${lat},${lon})["shop"="gas"];nwr(around:${r},${lat},${lon})["vending"~"gas"];);out center tags;`
  const els = await overpass(q)
  out[label] = {
    osm: els === null ? 'OVERPASS-FEL' : els.map((e) => ({ id: `${e.type}/${e.id}`, ...pos(e), name: e.tags?.name, tags: Object.fromEntries(Object.entries(e.tags ?? {}).filter(([k]) => /^(amenity|shop|leisure|man_made|vending|addr:street|addr:housenumber|brand|operator|tourism|sport)$/.test(k))) })),
    adresser: {},
  }
  for (const a of addrs) out[label].adresser[a] = await nominatim(a)
  console.log('RAD ' + JSON.stringify({ [label]: out[label] }))
  await sleep(1000)
}
console.log('RESULTAT-START')
console.log(JSON.stringify(out))
console.log('RESULTAT-SLUT')
