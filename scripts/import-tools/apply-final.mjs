// Slutlig tillämpning: koordinater från resultat-*.json + dubblettrensning + uppgraderingar.
import fs from 'fs'
const S = process.env.SCRATCH ?? '/tmp'
const REG = '/home/user/PJfrance/scripts/curated-places.json'
const dry = process.argv.includes('--dry')
const dist = (a, b, c, d) => { const p = Math.PI / 180; const h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'))
const byName = (n) => reg.find((x) => x.name === n)
const r5 = (x) => Math.round(x * 1e5) / 1e5

// 1. Dubbletter av redan publicerade (bekräftade eller likvärdiga) platser inom ~100–400 m: bort.
const DELETE = [
  'Mangenbadens Camping', // = Caravan Club Mangenbaden (egen, bekräftad, 44 m)
  'Höga kusten - bron', // = OSM ställplats vid norra brofästet (45 m), inget nytt
  'Överkalix Camping', // = Bränna Camping (OSM, full service, 66 m)
  'Pajala Camping och Vandrarhem', // = OSM Pajala Camping + tömning/vatten-noder (24 m)
  'Kolgårdens Stugby & Camping', // = OSM samma namn med tömning (46 m)
  'Bräcke Strand', // = OSM Bräcke Strand Ställplats med tömning (32 m)
  'Ställplats Skojarbacken', // = First Camp Ställplats Nora (32 m) – kompletteras nedan
  'Lilla Stigen Ställplatser', // = Lilla Stigen (egen, bekräftad, 26 m)
  'Latrintömning Härnösand', // = OSM tömningsstation + kommunpost (18/65 m)
  'Snibbens Camping/Vandrarhem', // = OSM Snibbens Camping & Stugby (26 m)
  'Mora – Siknäs fyrklöver', // = OSM Gåvunda / Siknäs (415 m), bara camping
  'Seglora Camping and Cottages', // = OSM Seglora Camping (5 m)
  'Bojarparkeringen', // = Bojarparkeringen Strömstad (egen, bekräftad, 340 m) – får exakt läge nedan
  'Norra kajen i Oskarshamn', // = Oskarshamns Gästhamn (egen, 367 m)
]
// 2. Ort var fel i registret: ny query + nytt förväntat läge.
const REQUERY = {
  'Kättingens ställplats': 'Kättingens ställplats, Orsa',
  'Mariebergsviken': 'Mariebergsviken, Karlstad',
  'Tågstallarnas ställplats': 'Långbryggevägen 5, Rättvik',
}

let log = []
for (const n of DELETE) {
  const i = reg.findIndex((x) => x.name === n)
  if (i < 0) { log.push(`FINNS EJ (delete): ${n}`); continue }
  reg.splice(i, 1); log.push(`BORT   ${n}`)
}

const files = fs.readdirSync(S).filter((f) => /^resultat-[A-F]\.json$/.test(f)).sort()
for (const f of files) {
  for (const r of JSON.parse(fs.readFileSync(`${S}/${f}`, 'utf8'))) {
    if (DELETE.includes(r.name)) continue
    const e = byName(r.name)
    if (!e) { log.push(`FINNS EJ: ${r.name}`); continue }
    if (typeof r.lat !== 'number' || typeof r.lon !== 'number') { log.push(`INGEN KOORD ${r.name}`); continue }
    if (r.confidence === 'low') { log.push(`LÅG (hoppas) ${r.name}`); continue }
    e.lat = r5(r.lat); e.lon = r5(r.lon)
    if (typeof e.nearLat === 'number') {
      const km = dist(e.lat, e.lon, e.nearLat, e.nearLon)
      if (km > (e.maxKm ?? 30)) { e.nearLat = e.lat; e.nearLon = e.lon; e.maxKm = 5 }
    }
    if (REQUERY[r.name]) e.query = REQUERY[r.name]
    if (r.address && !e.address) e.address = r.address
    log.push(`KOORD  ${r.name.padEnd(44)} ${e.lat},${e.lon} (${r.confidence})`)
  }
}

// 3. Uppgraderingar / kompletteringar med primärkälla.
{
  const e = byName('Ludvika – Harnäsgården/Gamla Skolan')
  e.name = 'Harnäsgården ställplats, Ludvika'
  e.services = ['latrin', 'gravatten', 'vatten', 'stallplats']
  delete e.unverified; delete e.confidence
  e.description = 'Högbergskyrkans ställplats vid Harnäsgården, Badstigen 10: 5 platser med el, säsong 8 maj–30 sep, bokning via Psidan. Källa (operatörens egen sida hogbergskyrkan.se/harnasgarden): "färskvatten hämtas vid kanten av fotbollsplanen, och det finns avloppsanslutningar för grå- och svartvatten".'
  e.website = 'https://hogbergskyrkan.se/harnasgarden/'
  e.query = 'Badstigen 10, Ludvika'
  e.season = 'seasonal'
  log.push('UPPGR  Harnäsgården → bekräftad latrin/gravatten/vatten')
}
{
  const e = byName('Ställplats Stockholm – vid Flaten')
  e.name = 'First Camp Ställplats Stockholm (Flaten)'
  e.services = ['gravatten', 'latrin', 'stallplats']
  delete e.unverified; delete e.confidence
  e.description = 'First Camps obemannade ställplats intill First Camp City – Stockholm, Flatens skogsväg 30 (Skarpnäck). Öppen 24/7 året runt, betalstation + kodkort. Källa (firstcamp.se): "servicehus med toalett, dusch, tvättstuga och disk" samt "tömningsstation för fasta tankar, både gråvatten och svartvatten".'
  e.website = 'https://firstcamp.se/destinationer/city-stockholm/stallplatsstockholm'
  e.query = 'Flatens skogsväg 30, Skarpnäck'
  e.season = 'year-round'
  log.push('UPPGR  Flaten → First Camp Ställplats Stockholm, bekräftad gravatten/latrin')
}
{
  const e = byName('Mariebergsviken')
  e.name = 'Husbilsparkering Mariebergsviken, Karlstad'
  delete e.unverified; delete e.confidence
  e.description = 'Kommunal husbilsparkering vid Mariebergsviken/Mariebergsskogen, Långövägen 9: fem platser, max 24 h, övernattning tillåten (ingen camping). Inga tjänster. Källa: Karlstads kommun (karlstad.se, husbilsparkering).'
  e.website = 'https://karlstad.se/trafik-och-gator/parkering/husbilsparkering'
  log.push('UPPGR  Mariebergsviken → Karlstad, bekräftad av kommunen (bara ställplats)')
}
{
  const e = byName('Kättingens ställplats')
  e.description = 'Obekräftad plats (husbilsplats.se/husbil.se, ej primärkälla): 24 platser, el och vatten vid varje plats, dusch, WC, gemensamhetsrum; 1 apr–31 okt, från 200 kr, bokning via Psidan. Gråvatten enligt husbilsplats.se, ej bekräftat av operatören. 3 km norr om Orsa kyrka vid E45. Har du varit här? Bekräfta i appen.'
  log.push('FIX    Kättingen → Orsa (var Kristianstad)')
}
{
  const e = byName('Ställplats Ginstavallen')
  e.unverifiedServices = ['latrin', 'vatten']
  e.description = 'Obekräftad plats (husbilsplats.se/husbil.se, ej primärkälla): 6 platser (4 med el), från 150 kr, året runt; husbil.se anger "latrintömning, toalett, dricksvatten, el". Hällarp vid väg 154. Har du varit här? Bekräfta i appen.'
  log.push('FIX    Ginstavallen → påstådd latrin/vatten')
}
{
  const e = byName('First Camp Ställplats Nora')
  e.services = ['stallplats', 'latrin', 'gravatten', 'vatten']
  delete e.unverifiedServices
  e.lat = 59.51578; e.lon = 15.03809
  e.description = 'Ställplats vid Skojarbacken, Norasjön, 5 min från centrum. Källa First Camp: latrintömning för fast och portabel tank, servicehus. Källa Visit Nora (visitnora.se): "servicehus med toaletter, duschar och färskvatten samt tömning av avloppstank för både fasta och lösa tankar". Vinterstängd, incheckning 12:00.'
  log.push('KOMPL  First Camp Ställplats Nora → gravatten+vatten bekräftade, exakt läge')
}
{
  const e = byName('Bojarparkeringen Strömstad')
  e.lat = 58.95167; e.lon = 11.17457
  e.address = 'Kebalvägen, Strömstad'
  log.push('KOORD  Bojarparkeringen Strömstad → exakt läge (husbil.se + svenskastallplatser, 10 m isär)')
}

log.forEach((l) => console.log(l))
console.log(`\nRegistret: ${reg.length} poster`)
if (!dry) { fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n'); console.log('Skrev', REG) }
