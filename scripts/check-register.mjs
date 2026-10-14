#!/usr/bin/env node
// Kvalitetskontroll av scripts/curated-places.json. Körs i deploy.yml före
// bygget och stoppar deployen vid fel (exit 1); varningar stoppar inte.
// Kör lokalt: node scripts/check-register.mjs
//
// FEL (stoppar): okänt tjänstekod, tom tjänstelista, varken lat/lon eller
// query, ogiltigt season/confidence, dubblettnamn, två poster
// med exakta koordinater inom 100 m (Pers regel 12 okt 2026: samma plats ska vara EN post – slå ihop, eller `distinct: true` i undantagsfall,
// se CLAUDE.md "Dedupa före skrivning"), website som inte är http(s).
// VARNING: två query-poster som geokodats till samma punkt i seeden (kolliderande
// geokodning – ge dem egna queries eller exakta koordinater).
import { readFileSync, existsSync } from 'node:fs'

const REG = new URL('./curated-places.json', import.meta.url)
const SEED = process.env.SEED_PATH ? new URL('file://' + process.env.SEED_PATH) : new URL('../public/data/stations-seed.json', import.meta.url)
const SERVICES = new Set(['gravatten', 'latrin', 'vatten', 'sopor', 'atervinning', 'stallplats', 'camping', 'gasol'])
const SEASONS = new Set(['seasonal', 'year-round'])
const CONF = new Set(['high', 'medium', 'low'])
const FIELDS = new Set(['id', 'name', 'lat', 'lon', 'query', 'nearLat', 'nearLon', 'maxKm', 'services', 'unverified',
  'unverifiedServices', 'confidence', 'fee', 'gasolPrice', 'openingHours', 'season', 'facilities', 'website', 'url',
  'description', 'source', 'phone', 'address', 'operator', 'payment', 'image', 'distinct'])

const reg = JSON.parse(readFileSync(REG, 'utf8'))
const errors = []
const warnings = []
const names = new Map()
const ids = new Map()

for (const [i, p] of reg.entries()) {
  const tag = `#${i} "${p.name ?? '?'}"`
  if (!p.name || typeof p.name !== 'string') errors.push(`${tag}: saknar namn`)
  // Stabilt id (fryst 12 okt 2026): foton, betyg, bekräftelser och favoriter hänger på det.
  // Nya poster utan id får curated-<namn> i synken; ändra ALDRIG ett befintligt id.
  if (p.id != null) {
    if (!/^curated-[a-z0-9][a-z0-9.,&()'\-åäöéü/:–]*$/i.test(p.id)) errors.push(`${tag}: ogiltigt id "${p.id}"`)
    if (ids.has(p.id)) errors.push(`${tag}: id "${p.id}" används redan av #${ids.get(p.id)}`)
    ids.set(p.id, i)
  } else warnings.push(`${tag}: saknar id – får curated-<namn> i synken; kör node scripts/assign-ids.mjs`)
  const key = (p.name ?? '').trim().toLowerCase()
  if (names.has(key)) errors.push(`${tag}: dubblettnamn (samma som #${names.get(key)}) – slå ihop eller särskilj med ort`)
  names.set(key, i)
  if (!Array.isArray(p.services) || p.services.length === 0) errors.push(`${tag}: tom eller saknad tjänstelista (grå plats? sätt unverified: true och behåll tjänsterna)`)
  for (const s of p.services ?? []) if (!SERVICES.has(s)) errors.push(`${tag}: okänd tjänst "${s}"`)
  for (const s of p.unverifiedServices ?? []) if (!SERVICES.has(s)) errors.push(`${tag}: okänd obekräftad tjänst "${s}"`)
  for (const s of p.unverifiedServices ?? []) if ((p.services ?? []).includes(s)) warnings.push(`${tag}: "${s}" både bekräftad och obekräftad`)
  const hasCoord = typeof p.lat === 'number' && typeof p.lon === 'number'
  const hasQuery = typeof p.query === 'string' && p.query.trim().length > 0
  if (!hasCoord && !hasQuery) errors.push(`${tag}: varken lat/lon eller query`)
  if (!hasCoord && hasQuery && (typeof p.nearLat !== 'number' || typeof p.nearLon !== 'number')) warnings.push(`${tag}: query utan nearLat/nearLon – geokodningen kan hamna var som helst`)
  if (hasCoord && (p.lat < 55 || p.lat > 69.5 || p.lon < 10.5 || p.lon > 24.5)) errors.push(`${tag}: koordinat utanför Sverige (${p.lat}, ${p.lon})`)
  if (p.season != null && !SEASONS.has(p.season)) errors.push(`${tag}: ogiltig season "${p.season}"`)
  if (p.confidence != null && !CONF.has(p.confidence)) errors.push(`${tag}: ogiltig confidence "${p.confidence}"`)
  for (const k of ['website', 'url']) if (p[k] != null && !/^https?:\/\//i.test(String(p[k]))) errors.push(`${tag}: ${k} är inte en http(s)-adress: ${p[k]}`)
  for (const k of Object.keys(p)) if (!FIELDS.has(k)) warnings.push(`${tag}: okänt fält "${k}"`)
  if ((p.openingHours ?? '').length > 120) warnings.push(`${tag}: openingHours är ${p.openingHours.length} tecken – korta (visas i popupen)`)
  if ((p.fee ?? '').length > 160) warnings.push(`${tag}: fee är ${p.fee.length} tecken – korta`)
}

// Närhetskontroll: exakta koordinater inom 10 m = fel; samma geokodade punkt = varning.
const dist = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371e3
}
const gasolOnly = (p) => p.services?.length === 1 && p.services[0] === 'gasol'
const exact = reg.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number')
// Cellstorlek: 0,001° lat ≈ 111 m, men 0,001° lon är bara ≈ 43 m vid lat 67 –
// därför 0,003° i lon (≥ 100 m upp till lat 72). Med lika stora celler i båda
// leder missades par inom 100 m i öst-västlig led i norr (granskning 12 okt 2026).
const cell = (p) => `${Math.round(p.lat / 0.001)},${Math.round(p.lon / 0.003)}`
const grid = new Map()
for (const p of exact) {
  const [cx, cy] = cell(p).split(',').map(Number)
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    for (const q of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
      if (gasolOnly(p) !== gasolOnly(q)) continue
      const m = dist(p, q)
      if (m <= 100 && !p.distinct && !q.distinct) errors.push(`"${p.name}" och "${q.name}" ligger ${Math.round(m)} m isär – samma plats (Pers regel: inom 100 m = en post), slå ihop eller sätt distinct: true`)
    }
  }
  const k = cell(p)
  grid.set(k, [...(grid.get(k) ?? []), p])
}
if (existsSync(SEED)) {
  const st = JSON.parse(readFileSync(SEED, 'utf8')).stations ?? []
  const byPos = new Map()
  const regIds = new Set(reg.map((p) => p.id))
  for (const s of st) {
    // Bara poster som fortfarande finns i registret (seeden kan vara äldre).
    if (!s.id.startsWith('curated-') || !regIds.has(s.id)) continue
    const k = `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`
    byPos.set(k, [...(byPos.get(k) ?? []), s])
  }
  for (const group of byPos.values()) {
    if (group.length < 2) continue
    const g = group.filter((s) => !(s.services.length === 1 && s.services[0] === 'gasol'))
    if (g.length < 2) continue
    warnings.push(`samma geokodade punkt i seeden: ${g.map((s) => `"${s.name}"`).join(' + ')} – ge egna queries eller exakta koordinater, eller slå ihop`)
  }
  // Pers 100 m-regel gäller även geokodade poster: två registerposter inom
  // 100 m i den publicerade seeden slås ihop i appen (tjänsterna unionas),
  // så två olika verksamheter kan smitta varandra. Varning – läget kommer
  // från geokodningen och kan ändras vid nästa synk (granskning 12 okt 2026).
  const byId = new Map(reg.map((p) => [p.id, p]))
  const cur = st.filter((s) => s.id.startsWith('curated-') && byId.has(s.id) && !(s.services.length === 1 && s.services[0] === 'gasol'))
  const g2 = new Map()
  for (const s of cur) {
    const cx = Math.round(s.lat / 0.001), cy = Math.round(s.lon / 0.003)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const q of g2.get(`${cx + dx},${cy + dy}`) ?? []) {
        const pa = byId.get(s.id), pb = byId.get(q.id)
        if (pa.distinct || pb.distinct) continue
        if (typeof pa.lat === 'number' && typeof pb.lat === 'number') continue // exakta par = fel ovan
        const m = dist(s, q)
        if (m <= 100) warnings.push(`"${s.name}" och "${q.name}" ligger ${Math.round(m)} m isär i seeden (geokodat) – slås ihop i appen; slå ihop i registret, ge exakta lägen eller sätt distinct: true`)
      }
    }
    const k = `${cx},${cy}`
    g2.set(k, [...(g2.get(k) ?? []), s])
  }
}

console.log(`Register: ${reg.length} poster, ${errors.length} fel, ${warnings.length} varningar`)
// Bekräftad tömning/vatten/gasol utan en enda primärkälla (granskning 14 okt
// 2026: 91 poster, mest "Källa: sammanställd information om anläggningen").
// Varning tills de är genomgångna (ärende), sedan fel.
{
  const AGG = /husbilsplats\.se|park4night|campingkollen|stallplatskartan|stallplatserna\.se|husbil\.se|campercontact|hitta\.se|facebook\.com|\/\/(www\.)?camping\.se\b/i
  const KÄRNA2 = ['gravatten', 'latrin', 'vatten', 'gasol']
  const utanKälla = reg.filter((p) => !p.unverified && p.confidence !== 'low'
    && (p.services ?? []).some((x) => KÄRNA2.includes(x) && !(p.unverifiedServices ?? []).includes(x))
    && ![p.website, p.url, ...(String(p.description ?? '').match(/https?:\/\/[^\s)"]+/g) ?? [])].filter(Boolean).some((u) => !AGG.test(u)))
  if (utanKälla.length) warnings.push(`${utanKälla.length} poster har bekräftad tömning/vatten/gasol utan primärkälla (ingen länk utom aggregatorer), t.ex. ${utanKälla.slice(0, 3).map((p) => p.id).join(', ')}`)
}

// Alias (gamla id → nuvarande, public/data/id-aliases.json): varje mål måste
// finnas i registret och inget gammalt id får vara ett nuvarande id. Annars
// pekar sparade favoriter/betyg/foton på en plats som inte finns (en post som
// tas bort eller slås ihop måste peka om sina alias). Granskning 12 okt 2026.
const ALIASES = new URL('../public/data/id-aliases.json', import.meta.url)
if (existsSync(ALIASES)) {
  const ids = new Set(reg.map((p) => p.id))
  const al = JSON.parse(readFileSync(ALIASES, 'utf8'))
  const bad = Object.entries(al).filter(([, v]) => !ids.has(v))
  const chain = Object.keys(al).filter((k) => ids.has(k))
  if (bad.length) errors.push(`${bad.length} alias pekar på id som inte finns i registret (t.ex. ${bad[0][0]} → ${bad[0][1]}) – peka om till posten som tog över, eller ta bort aliaset`)
  if (chain.length) errors.push(`${chain.length} alias har ett nuvarande id som nyckel (t.ex. ${chain[0]})`)
}

// Pers egen fältkännedom (scripts/per-fakta.json) får aldrig tas bort eller
// göras grå av ett svep eller en granskning (Borås GK tappade sina tjänster
// sep 2026 trots att Per sagt att de finns – granskning 12 okt 2026).
const PER = new URL('./per-fakta.json', import.meta.url)
if (existsSync(PER)) {
  const per = JSON.parse(readFileSync(PER, 'utf8'))
  const byId = new Map(reg.map((p) => [p.id, p]))
  for (const [id, f] of Object.entries(per)) {
    if (id.startsWith('_')) continue
    const p = byId.get(id)
    if (!p) { errors.push(`Pers fakta: posten ${id} finns inte längre i registret`); continue }
    for (const t of f.tjanster ?? []) {
      if (!p.services?.includes(t) || p.unverified || (p.unverifiedServices ?? []).includes(t)) {
        errors.push(`Pers fakta: "${p.name}" ska ha ${t} bekräftat (${f.datum}: ${f.not ?? ''}) – ändra inte utan Pers besked`)
      }
    }
  }
}

// Förlustvakt (granskning 12 okt 2026: Engesberg blev helt grå vid en
// sammanslagning, Vilhelmina försvann i en koordinat-commit – ingen märkte det).
// Jämför med den publicerade seeden: en registerpost som tappar en BEKRÄFTAD
// tömning/vatten/gasol måste ha en daterad orsak i beskrivningen, och en
// borttagen post måste vara sammanslagen (alias till en post som behåller
// tjänsterna) eller stå i scripts/borttagna.json.
if (existsSync(SEED)) {
  const KÄRNA = ['gravatten', 'latrin', 'vatten', 'gasol']
  const seedSt = JSON.parse(readFileSync(SEED, 'utf8')).stations ?? []
  const byIdReg = new Map(reg.map((p) => [p.id, p]))
  const ALIASES2 = new URL('../public/data/id-aliases.json', import.meta.url)
  const al = existsSync(ALIASES2) ? JSON.parse(readFileSync(ALIASES2, 'utf8')) : {}
  const BORT = new URL('./borttagna.json', import.meta.url)
  const bort = existsSync(BORT) ? JSON.parse(readFileSync(BORT, 'utf8')) : {}
  const bekräftade = (p) => (p.unverified ? [] : (p.services ?? []).filter((x) => KÄRNA.includes(x) && !(p.unverifiedServices ?? []).includes(x)))
  const TJÄNSTORD = { gravatten: /gråvatten|−tömning|-tömning|ingen tömning|tömning[^.]{0,40}(borta|saknas|finns inte|stängd|grå)/i, latrin: /latrin|kassett|−tömning|-tömning|ingen tömning|tömning[^.]{0,40}(borta|saknas|finns inte|stängd|grå)/i, vatten: /(?<!grå)vatten/i, gasol: /gasol/i }
  const ORSAK = /(kontroll|granskning|rättat|pers|sammanslagen|källa|svep|research)[^.]{0,200}20\d\d|20\d\d[^.]{0,200}(kontroll|granskning|rättat|pers|källa)/i
  for (const s of seedSt) {
    if (!String(s.id).startsWith('curated-')) continue
    const had = bekräftade(s)
    if (!had.length) continue
    const p = byIdReg.get(s.id)
    if (!p) {
      const target = al[s.id] && byIdReg.get(al[s.id])
      if (bort[s.id]) continue
      if (!target) { errors.push(`"${s.name}" (${s.id}) med bekräftad ${had.join('/')} är borttagen utan sammanslagning – peka om i id-aliases.json eller ange orsak i scripts/borttagna.json`); continue }
      const lostT = had.filter((x) => !bekräftade(target).includes(x))
      if (lostT.length && !(target.name === s.name && ORSAK.test(target.description ?? ''))) errors.push(`"${s.name}" slogs ihop med "${target.name}" men bekräftad ${lostT.join('/')} gick förlorad (blev grå/borta) – behåll bekräftade tjänster vid sammanslagning`)
      continue
    }
    const lost = had.filter((x) => !bekräftade(p).includes(x))
    // Granskning 14 okt 2026: ORSAK ensam träffade 432 av 1 099 beskrivningar
    // ("Källa … 2026") – orsaken måste också nämna den tjänst som försvann.
    // … och vara NY: beskrivningen måste ha ändrats sedan den publicerade seeden
    // (ett gammalt citat som nämner latrin räknas inte som orsak till att den försvann).
    const ny = (p.description ?? '') !== (s.description ?? '')
    const utan = lost.filter((x) => !(ny && ORSAK.test(p.description ?? '') && TJÄNSTORD[x].test(p.description ?? '')))
    if (utan.length) {
      errors.push(`"${p.name}" har tappat bekräftad ${utan.join('/')} utan daterad orsak som nämner tjänsten i description (t.ex. "Kontroll okt 2026: ingen latrintömning enligt kommunen")`)
    }
  }
}

// Exakt lat/lon + kontrollpunkt (nearLat/nearLon) som ligger längre bort än
// maxKm = synken förkastar det RÄTTA läget (Voxnabruk 12 okt 2026).
for (const p of reg) {
  if (typeof p.lat === 'number' && typeof p.nearLat === 'number' && typeof p.nearLon === 'number') {
    const m = dist(p, { lat: p.nearLat, lon: p.nearLon })
    if (m / 1000 > (typeof p.maxKm === 'number' ? p.maxKm : 30)) errors.push(`"${p.name}": exakt läge ligger ${Math.round(m / 1000)} km från kontrollpunkten (nearLat/nearLon, max ${p.maxKm ?? 30}) – synken skulle förkasta det; ta bort query/nearLat/nearLon`)
  }
}

// Poster utan valbar tjänst (bara ställplats/camping) syns aldrig på kartan.
const VALBARA = ['gravatten', 'latrin', 'vatten', 'sopor', 'atervinning', 'gasol']
const osynliga = reg.filter((p) => !(p.services ?? []).some((x) => VALBARA.includes(x)) && !(p.unverifiedServices ?? []).some((x) => VALBARA.includes(x)))
if (osynliga.length) warnings.push(`${osynliga.length} poster har bara ställplats/camping och syns inte på kartan (t.ex. ${osynliga.slice(0, 3).map((p) => p.name).join(', ')})`)

// Alla varningar skrivs ut sist (förut tappades de som lades till efter utskriften).
for (const w of warnings) console.log('  varning: ' + w)
if (errors.length) {
  console.error('\nFEL i scripts/curated-places.json – rätta före push:')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log('OK: registret klarar kontrollen')
