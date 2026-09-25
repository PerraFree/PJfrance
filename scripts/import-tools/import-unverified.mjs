// Lägger in tömningssvepets LÅG-evidens-fynd som OBEKRÄFTADE poster (grå nål).
// Körs från repo-roten. Handplockat urval – se kommentarer per post.
import fs from 'fs'
const S = '/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/'
const path = './scripts/curated-places.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const st = JSON.parse(fs.readFileSync(S + 'seed.json', 'utf8')).stations
const byId = new Map(st.map((s) => [s.id, s]))
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const CORE = new Set(['latrin', 'gravatten', 'vatten'])
const files = fs.readdirSync(S + 'results').filter((f) => f.startsWith('tomning-'))
const all = { new: [], enrich: [] }
for (const f of files) { const r = JSON.parse(fs.readFileSync(S + 'results/' + f, 'utf8')); for (const o of r.new ?? []) if (o.confidence !== 'high') all.new.push(o); for (const o of r.enrich ?? []) if (o.confidence !== 'high') all.enrich.push(o) }

// Hoppa över: ingen tjänst / uppenbart brus / oklart vilken plats / motstridigt
const SKIP = /Sala – Ställplats Museigatan|OKQ8 Strömsnäsbruk|Ställplats Vaggeryd \(oklart|Vännäs Bad och Camping|Örebro Golfklubb/
// Bättre geokodningsfrågor än agenternas beskrivande adresser
const QUERY = {
  'Ställplats Rällen (mellan Stjärnfors och Löa)': ['Rällen, Ljusnarsberg', 20],
  'Ställplats Stjärnfors Golfklubb': ['Stjärnfors, Ljusnarsberg', 12],
  'Ställplats Vinön (vid kanalen/gästhamnen)': ['Vinön, Örebro', 25],
  'Tömningsstation Skara (Björkelundsgatan)': ['Björkelundsgatan 12, Skara', 5],
  'Lokstallet ställplats, Hjo': ['Lokstallet, Hjo', 4],
  'Ålstorpsgården ställplats (Landskrona/Kävlinge-trakten)': ['Ålstorp, Kävlinge', 12],
  'Broakulla Ställplats & Camping': ['Broakulla, Emmaboda', 15],
  'Räfsnäs Camping (Rådmansö)': ['Räfsnäs, Norrtälje', 30],
  'NSS Ställplats Nynäshamn (Nynäshamns Segelsällskap)': ['Nynäshamns Segelsällskap, Nynäshamn', 6],
  'Tömningsstation Stora bryggan, Sandviken': ['Stora bryggan, Sandviken', 5],
  'Smedjebackens hamn – ställplats': ['Gästhamnen, Smedjebacken', 5],
  'Ställplats Biltema Borlänge': ['Biltema, Borlänge', 8],
  'Kalkeelboet ställplats': ['Holm, Halmstad', 15],
  'Fiskepuben ställplats, Bockalt': ['Bockalt, Halmstad', 20],
  'Lindesnäs ställplats, Uddevalla': ['Lindesnäs, Uddevalla', 8],
  'Stenungsunds hamn ställplats / Norra Hamnplan': ['Norra Hamnplan, Stenungsund', 4],
}
// Kommunsidor som faktiskt belägger färskvatten (men agenten satte "low" bara
// för att ingen TÖMNING nämndes) → vatten är bekräftat, inget obekräftat.
const VERIFIED_VATTEN = /Rällen|Stjärnfors Golfklubb|NSS Ställplats|Stenungsunds hamn/
let added = 0, enriched = 0
for (const o of all.new) {
  if (SKIP.test(o.name)) { console.log('  hoppar', o.name); continue }
  let services = (o.services ?? []).filter((s) => CORE.has(s)); if (o.vatten && !services.includes('vatten')) services.push('vatten')
  if (!services.length) { console.log('  hoppar (ingen tjänst)', o.name); continue }
  if (data.some((p) => norm(p.name) === norm(o.name))) { console.log('  finns', o.name); continue }
  const q = QUERY[o.name]; if (!q) { console.log('  SAKNAR QUERY', o.name); continue }
  const e = { name: o.name.replace(/ \(oklart.*\)$/, ''), source: 'egen', query: q[0], nearLat: o.townLat, nearLon: o.townLon, maxKm: q[1], address: o.address,
    description: `Källa (${o.source || 'användarsajt'}): "${o.evidence || ''}"` }
  if (typeof o.lat === 'number' && typeof o.lon === 'number') { e.lat = o.lat; e.lon = o.lon; delete e.query; delete e.nearLat; delete e.nearLon; delete e.maxKm }
  if (VERIFIED_VATTEN.test(o.name)) {
    e.services = ['stallplats', 'vatten']
    const rest = services.filter((s) => s !== 'vatten'); if (rest.length) e.unverifiedServices = rest
    if (/Stenungsund/.test(o.name)) e.unverifiedServices = ['latrin']
  } else {
    e.services = services; e.unverified = true
  }
  if (o.openingHours) e.openingHours = o.openingHours
  if (o.fee) e.fee = o.fee
  if (o.source && /^https?:/.test(o.source)) e.website = o.source
  data.push(e); added++; console.log('  + obekräftad ny', e.name, e.services.join('+'), e.unverifiedServices ? '?' + e.unverifiedServices.join('+') : '')
}
for (const o of all.enrich) {
  if (SKIP.test(o.existingName)) { console.log('  hoppar', o.existingName); continue }
  const s = byId.get(o.existingId); if (!s) { console.log('  okänt id', o.existingId, o.existingName); continue }
  const add = (o.addServices ?? []).filter((x) => CORE.has(x) && !s.services.includes(x))
  if (!add.length) continue
  // Befintlig registerpost (curated-*) → sätt unverifiedServices direkt på den
  if (s.id.startsWith('curated-')) {
    const p = data.find((x) => norm(x.name) === norm(s.name))
    if (p) { p.unverifiedServices = [...new Set([...(p.unverifiedServices ?? []), ...add])].filter((x) => !p.services.includes(x)); p.description = (p.description || '') + ` Obekräftat (${o.source || ''}): "${o.evidence || ''}"`; enriched++; console.log('  ~ obekräftad tjänst (registerpost)', p.name, '?' + add.join('+')); continue }
  }
  const e = { name: s.name, lat: s.lat, lon: s.lon, services: [...s.services], unverifiedServices: add, source: 'egen',
    description: `Obekräftat (${o.source || 'användarsajt'}): "${o.evidence || ''}"` }
  if (o.source && /^https?:/.test(o.source)) e.website = o.source
  data.push(e); enriched++; console.log('  ~ obekräftad tjänst', s.name, '?' + add.join('+'))
}
// Mjölkekilen (Marstrand): high-fynd som INTE lades in pga oklar anläggning → obekräftad
const mj = byId.get('osm-way-690152943')
if (mj && !data.some((p) => p.name === mj.name)) { data.push({ name: mj.name, lat: mj.lat, lon: mj.lon, services: [...mj.services], unverifiedServices: ['latrin', 'vatten'], source: 'egen', description: 'Obekräftat: Kungälvs kommun (kungalv.se/parkera-stora-fordon) anger färskvatten + latrintömning (ej gråvatten) 1 maj–30 sep, 180 kr/dygn, på Koön och Vrångholmen – oklart om Mjölkekilen är samma anläggning som Koön-posten 550 m bort.', website: 'https://www.kungalv.se' }); enriched++; console.log('  ~ obekräftad tjänst Mjölkekilen') }
for (const x of data) for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k]
console.log({ added, enriched, total: data.length })
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
