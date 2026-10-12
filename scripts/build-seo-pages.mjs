// Bygger statiska, sökbara sidor från seed-datan (SEO). Själva appen är en SPA
// utan crawlbar text – de här sidorna ger Google något att visa för sökningar
// som "latrintömning husbil Mora", "tömningsstation Hudiksvall" eller
// "gasol påfyllning Borås". Körs i deploy.yml före vite build (vite kopierar
// public/ som den är). Alla genererade kataloger är gitignorerade.
//
//   public/kommun/…   – en sida per kommun + index
//   public/plats/…    – en sida per plats med tömning/vatten/gasol (det som
//                        folk faktiskt söker på – namn + ort + tjänst)
//   public/lan/…      – en sida per län + index (kräver scripts/kommun-lan.json)
//   public/tjanst/…   – riksöversikt per tjänst (latrin, gråvatten, vatten, gasol)
//   public/fragor/    – vanliga frågor med FAQPage-data
//   public/sitemap.xml
//
// Utbyggt 12 okt 2026 (Per: "maxa SEO"). Regler: obekräftade platser får ingen
// egen sida (rätt före fler); obekräftade tjänster märks "obekräftad" och står
// aldrig i titel/beskrivning; all text escapas (JSON-LD med <).
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SITE = 'https://tomningskartan.se'
const SEED = process.env.SEED_PATH ? pathToFileURL(process.env.SEED_PATH) : new URL('../public/data/stations-seed.json', import.meta.url)
const PUB = new URL('../public/', import.meta.url)

const LABELS = {
  gravatten: 'Gråvattentömning',
  latrin: 'Latrintömning',
  vatten: 'Färskvatten',
  gasol: 'Gasol',
  stallplats: 'Ställplats',
  camping: 'Camping',
  sopor: 'Sopor',
  atervinning: 'Återvinningscentral',
}
const FACILITY = {
  gasol_byte: 'byt gasoltub',
  gasol_pafyllning: 'fyll på gasoltub/fast tank',
  dusch: 'dusch', wc: 'toalett', el: 'el', tvatt: 'tvätt', wifi: 'wifi', hund: 'hundar tillåtna',
  tillganglig: 'tillgänglighetsanpassad', butik: 'butik/kiosk', restaurang: 'restaurang',
}
const ORDER = ['latrin', 'gravatten', 'vatten', 'gasol', 'stallplats', 'camping']
const CORE = ['latrin', 'gravatten', 'vatten', 'gasol']

// Riksöversikter per tjänst – slug, rubrik och vilka platser som räknas.
const TJANSTER = [
  { slug: 'latrintomning', label: 'Latrintömning', short: 'latrintömning', match: (s) => s.services.includes('latrin'),
    intro: 'Latrintömning (kassettoalett/svartvatten) för husbil och husvagn' },
  { slug: 'gravattentomning', label: 'Gråvattentömning', short: 'gråvattentömning', match: (s) => s.services.includes('gravatten'),
    intro: 'Gråvattentömning för husbil – tömningsstationer med brunn eller ränna' },
  { slug: 'farskvatten', label: 'Färskvatten', short: 'färskvatten', match: (s) => s.services.includes('vatten'),
    intro: 'Påfyllning av färskvatten (dricksvatten) för husbil och husvagn' },
  { slug: 'gasol-byte', label: 'Byt gasoltub', short: 'gasolbyte', match: (s) => s.services.includes('gasol') && (s.facilities ?? []).includes('gasol_byte'),
    intro: 'Byte av gasolflaska (10/11 kg och kompositflaskor) i butik eller automat' },
  { slug: 'gasol-pafyllning', label: 'Gasolpåfyllning', short: 'gasolpåfyllning', match: (s) => s.services.includes('gasol') && (s.facilities ?? []).includes('gasol_pafyllning'),
    intro: 'Påfyllning av egen gasolflaska eller fast gasoltank i husbilen' },
]

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c')
export const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
// Kort, stabil hash av platsens id (id är permanent – se CLAUDE.md) så att
// sidans adress inte ändras när namnet ändras lite.
const hash = (s) => {
  let h = 2166136261
  for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0
  return h.toString(36).padStart(6, '0').slice(-6)
}
const distM = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371e3
}
const km = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`)
const listSv = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} och ${arr[arr.length - 1]}`)
const confirmed = (s) => s.services.filter((x) => !(s.unverifiedServices ?? []).includes(x))

function page({ title, description, canonical, body, jsonld = [] }) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tömningskartan">
<meta property="og:locale" content="sv_SE">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
${jsonld.map((o) => `<script type="application/ld+json">${json(o)}</script>`).join('\n')}
<link rel="stylesheet" href="/seo.css">
</head>
<body>
<header><a href="/"><img src="/icon.svg" alt="">Tömningskartan</a></header>
<main>
${body}
</main>
<footer>Tömningskartan är en gratis karta för husbil och husvagn: gråvatten- och latrintömning, färskvatten, gasol, ställplatser och campingar i hela Sverige. Data från OpenStreetMap, Trafikverket, kommuner och eget register – uppdateras varje vecka. <a href="/om/">Om Tömningskartan</a> · ${hasLan() ? '<a href="/lan/">Län</a> · ' : ''}<a href="/kommun/">Kommuner</a> · <a href="/tjanst/latrintomning/">Latrintömning</a> · <a href="/tjanst/gravattentomning/">Gråvattentömning</a> · <a href="/tjanst/farskvatten/">Färskvatten</a> · <a href="/tjanst/gasol-byte/">Gasol</a> · <a href="/fragor/">Vanliga frågor</a></footer>
</body>
</html>
`
}
// Gemensam stilmall (en fil i stället för inbäddad i ~2 000 sidor – snabbare sidor).
const SEO_CSS = `  :root{--g:#1b5e20;--g2:#2e7d32;--t:#1f2a1f;--d:#4f5f4f;--bg:#f4f7f4;--card:#fff;--b:#dbe4db}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--t);background:var(--bg);line-height:1.5}
  header{background:var(--g);color:#fff;padding:14px 16px}
  header a{color:#fff;text-decoration:none;font-weight:700;font-size:1.05rem;display:inline-flex;align-items:center;gap:8px}
  header img{width:28px;height:28px}
  main{max-width:860px;margin:0 auto;padding:16px}
  h1{font-size:1.5rem;margin:8px 0 6px;color:var(--g)}
  h2{font-size:1.1rem;margin:22px 0 8px;color:var(--g2)}
  p.lead{color:var(--d);margin:0 0 12px}
  .cta{display:inline-block;background:var(--g2);color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700;margin:6px 0 12px}
  ul.places{list-style:none;padding:0;margin:0;display:grid;gap:8px}
  ul.places li{background:var(--card);border:1px solid var(--b);border-radius:12px;padding:10px 12px}
  ul.places .n{font-weight:700}
  ul.places .s{color:var(--d);font-size:.9rem}
  a{color:var(--g2)}
  ul.cols{columns:2;column-gap:24px;padding-left:18px}
  @media(min-width:640px){ul.cols{columns:3}}
  dl.fakta{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;background:var(--card);border:1px solid var(--b);border-radius:12px;padding:12px 14px}
  dl.fakta dt{font-weight:700;color:var(--d)}
  dl.fakta dd{margin:0}
  .grå{color:var(--d);font-style:italic}
  nav.bc{font-size:.85rem;color:var(--d);margin:4px 0 8px}
  footer{max-width:860px;margin:24px auto;padding:0 16px 32px;color:var(--d);font-size:.85rem}
`
const hasLan = () => existsSync(new URL('./kommun-lan.json', import.meta.url))
const crumbs = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
})
const bcHtml = (items) => `<nav class="bc">${items.map(([name, url], i) => (i < items.length - 1 ? `<a href="${esc(url.replace(SITE, ''))}">${esc(name)}</a>` : esc(name))).join(' › ')}</nav>`

async function put(rel, html) {
  const u = new URL(rel, PUB)
  await mkdir(new URL('./', u), { recursive: true })
  await writeFile(u, html)
}

// ---------------------------------------------------------------------------
const seed = JSON.parse(await readFile(SEED, 'utf8'))
// Bara platser med giltiga talkoordinater och en kommun som ger en icke-tom slug
// (granskning 12 okt 2026: sträng-lat kraschade bygget mitt i, tom slug skrev
// över indexsidan, "Falun"/"FALUN" gav dubbla sidor).
const stations = (seed.stations ?? seed).filter(
  (s) => s.kommun && !s.unverified && Number.isFinite(s.lat) && Number.isFinite(s.lon) && slug(s.kommun) && Array.isArray(s.services),
)
const byKommun = new Map()
for (const s of stations) {
  const key = [...byKommun.keys()].find((k) => slug(k) === slug(s.kommun)) ?? s.kommun
  if (!byKommun.has(key)) byKommun.set(key, [])
  byKommun.get(key).push(s)
}
if (byKommun.size < Number(process.env.MIN_KOMMUNER ?? 100)) {
  console.warn(`SEO-sidor: bara ${byKommun.size} kommuner i datan (fältet kommun saknas?) – bygger inte om sidorna.`)
  process.exit(0)
}
for (const d of ['kommun/', 'plats/', 'lan/', 'tjanst/', 'fragor/']) await rm(new URL(d, PUB), { recursive: true, force: true })
const updated = (seed.updatedAt ?? new Date().toISOString()).slice(0, 10)
const urls = [`${SITE}/`, `${SITE}/om/`]
const kommuner = [...byKommun.keys()].sort((a, b) => a.localeCompare(b, 'sv'))
const kommunUrl = (k) => `${SITE}/kommun/${slug(k)}/`

// Län (valfritt): scripts/kommun-lan.json { "Ale": "Västra Götalands län", … }
const LAN_FILE = new URL('./kommun-lan.json', import.meta.url)
const lanOf = existsSync(LAN_FILE) ? JSON.parse(readFileSync(LAN_FILE, 'utf8')) : {}
const lanFor = (k) => lanOf[k] ?? Object.entries(lanOf).find(([n]) => slug(n) === slug(k))?.[1] ?? null
const lanUrl = (l) => `${SITE}/lan/${slug(l)}/`

// Kommuncentrum för "grannkommuner".
const KOMMUNER_FILE = new URL('./kommuner.json', import.meta.url)
const centers = new Map()
if (existsSync(KOMMUNER_FILE)) {
  for (const k of JSON.parse(readFileSync(KOMMUNER_FILE, 'utf8')).kommuner ?? []) centers.set(slug(k.name), { lat: k.center[1], lon: k.center[0] })
}

// ---------------------------------------------------------------------------
// Platssidor: en per plats med bekräftad tömning/vatten/gasol. Samma fysiska
// plats kan finnas i flera källor (appen slår ihop inom 100 m) – här får
// registret (eget/kommun) förtur, sedan Trafikverket, sist OSM, och en plats
// inom 60 m från en redan vald får ingen egen sida (undviker dubbelsidor).
const PRIO = (s) => (String(s.id).startsWith('curated-') ? 0 : s.source === 'trafikverket' ? 1 : 2)
const cand = stations.filter((s) => confirmed(s).some((x) => CORE.includes(x))).sort((a, b) => PRIO(a) - PRIO(b))
const grid = new Map()
const cellKey = (s) => `${Math.round(s.lat / 0.002)},${Math.round(s.lon / 0.004)}`
const places = []
for (const s of cand) {
  const [cx, cy] = cellKey(s).split(',').map(Number)
  let dup = false
  for (let dx = -1; dx <= 1 && !dup; dx++) for (let dy = -1; dy <= 1 && !dup; dy++) {
    for (const o of grid.get(`${cx + dx},${cy + dy}`) ?? []) if (distM(s, o) <= 60) { dup = true; break }
  }
  if (!dup) {
    // Samma namn i samma kommun inom 1 km (t.ex. flera tömningsnoder på en
    // camping) = en sida – annars dubbla titlar och tunt innehåll.
    const nm = s.name.toLowerCase()
    dup = places.some((o) => o.name.toLowerCase() === nm && slug(o.kommun) === slug(s.kommun) && distM(s, o) <= 1000)
  }
  if (dup) continue
  places.push(s)
  const k = cellKey(s)
  grid.set(k, [...(grid.get(k) ?? []), s])
}
const usedSlugs = new Set()
const placePath = new Map()
for (const s of places) {
  let p = `${slug(s.name).slice(0, 60).replace(/-+$/, '')}-${slug(s.kommun)}-${hash(s.id)}`
  while (usedSlugs.has(p)) p += 'x'
  usedSlugs.add(p)
  placePath.set(s.id, `/plats/${p}/`)
}
const placeLink = (s) => placePath.get(s.id)

function serviceText(s) {
  const c = confirmed(s).filter((x) => ORDER.includes(x)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  return c.map((x) => LABELS[x].toLowerCase())
}

for (const s of places) {
  const k = [...byKommun.keys()].find((x) => slug(x) === slug(s.kommun)) ?? s.kommun
  const lan = lanFor(k)
  const svc = serviceText(s)
  const coreSvc = confirmed(s).filter((x) => CORE.includes(x)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map((x) => LABELS[x].toLowerCase())
  const gasType = (s.facilities ?? []).filter((f) => f.startsWith('gasol_')).map((f) => FACILITY[f])
  const grey = (s.unverifiedServices ?? []).filter((x) => LABELS[x]).map((x) => LABELS[x].toLowerCase())
  const extra = (s.facilities ?? []).filter((f) => FACILITY[f] && !f.startsWith('gasol_')).map((f) => FACILITY[f])
  const canonical = `${SITE}${placeLink(s)}`
  // Titel ≤ 65 tecken: namn – tjänster i kommun; korta tjänstelistan stegvis.
  const SHORT = { latrintömning: 'latrin', gråvattentömning: 'gråvatten', färskvatten: 'vatten', gasol: 'gasol' }
  const tryT = (n, kort) => {
    const parts = coreSvc.slice(0, n).map((x) => (kort ? SHORT[x] ?? x : x))
    return `${s.name} – ${listSv(parts)}${s.name.toLowerCase().includes(k.toLowerCase()) ? '' : ` i ${k}`}`
  }
  const title = [tryT(3, false), tryT(3, true), tryT(2, true), tryT(1, true)].find((t) => t.length <= 65) ?? `${s.name} i ${k}`.slice(0, 70)
  const description0 = `${s.name} i ${k} kommun: ${listSv(svc)}${gasType.length ? ` (${listSv(gasType)})` : ''}.${s.fee ? ` Avgift: ${s.fee}.` : ''} Läge, ${s.openingHours ? 'öppettider, ' : ''}vägbeskrivning och närliggande platser på Tömningskartan.`
  const description = description0.length > 300 ? description0.slice(0, 297).replace(/\s+\S*$/, '') + '…' : description0
  const near = places
    .filter((o) => o !== s)
    .map((o) => ({ o, d: distM(s, o) }))
    .filter((x) => x.d <= 60000)
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
  const mapHref = `/?at=${s.lat.toFixed(5)},${s.lon.toFixed(5)},15&id=${encodeURIComponent(s.id)}`
  const rows = [
    ['Tjänster', esc(svc.map((x) => x[0].toUpperCase() + x.slice(1)).join(' · ')) + (grey.length ? ` <span class="grå">(obekräftat: ${esc(grey.join(', '))})</span>` : '')],
    gasType.length && ['Gasol', esc(listSv(gasType))],
    s.fee && ['Avgift', esc(s.fee)],
    s.openingHours && ['Öppettider', esc(s.openingHours)],
    s.season && ['Säsong', s.season === 'year-round' ? 'Öppet året runt' : 'Säsongsöppet'],
    s.gasolPrice && ['Pris', esc(s.gasolPrice)],
    extra.length && ['Även', esc(extra.join(' · '))],
    s.address && ['Adress', esc(s.address)],
    ['Kommun', `<a href="${esc(kommunUrl(k).replace(SITE, ''))}">${esc(k)}</a>${lan ? `, <a href="${esc(lanUrl(lan).replace(SITE, ''))}">${esc(lan)}</a>` : ''}`],
    ['Koordinater', `${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}`],
    s.website && /^https?:\/\//i.test(s.website) && ['Webbplats', `<a href="${esc(s.website.split(/\s*[;,]\s*|\s+/)[0])}" rel="nofollow noopener">${esc(s.website.split(/\s*[;,]\s*|\s+/)[0].replace(/^https?:\/\//, '').slice(0, 60))}</a>`],
    ['Källa', s.source === 'trafikverket' ? 'Trafikverket (rastplats)' : s.source === 'osm' ? `<a href="${esc(s.osmUrl ?? 'https://www.openstreetmap.org/')}" rel="nofollow noopener">OpenStreetMap</a>` : 'Tömningskartans register (kommun/anläggningens egen sajt)'],
  ].filter(Boolean)
  const trail = [['Tömningskartan', `${SITE}/`], ...(lan ? [[lan, lanUrl(lan)]] : []), [k, kommunUrl(k)], [s.name, canonical]]
  const body = `${bcHtml(trail)}
<h1>${esc(s.name)}</h1>
<p class="lead">${esc(listSv(svc).replace(/^./, (c) => c.toUpperCase()))} i ${esc(k)}${lan ? `, ${esc(lan)}` : ''}.</p>
<a class="cta" href="${esc(mapHref)}">Visa på kartan och få vägbeskrivning →</a>
<dl class="fakta">${rows.map(([t, v]) => `<dt>${t}</dt><dd>${v}</dd>`).join('')}</dl>
${near.length ? `<h2>I närheten</h2><ul class="places">${near.map(({ o, d }) => `<li><a class="n" href="${esc(placeLink(o))}">${esc(o.name)}</a> <span class="s">· ${km(d)} · ${esc(serviceText(o).join(', '))}</span></li>`).join('')}</ul>` : ''}
<p class="lead">Uppgifterna kommer från ${s.source === 'trafikverket' ? 'Trafikverket' : s.source === 'osm' ? 'OpenStreetMap' : 'kommunen eller anläggningens egen webbplats'} och kontrolleras löpande. Stämmer något inte? Öppna kartan och tryck "Rapportera fel" eller "Stämmer fortfarande".</p>`
  const ld = {
    '@context': 'https://schema.org', '@type': 'Place', name: s.name, url: canonical,
    geo: { '@type': 'GeoCoordinates', latitude: +s.lat.toFixed(6), longitude: +s.lon.toFixed(6) },
    address: { '@type': 'PostalAddress', ...(s.address ? { streetAddress: s.address } : {}), addressLocality: k, ...(lan ? { addressRegion: lan } : {}), addressCountry: 'SE' },
    amenityFeature: confirmed(s).filter((x) => LABELS[x]).map((x) => ({ '@type': 'LocationFeatureSpecification', name: LABELS[x], value: true })),
    ...(s.openingHours ? { openingHours: s.openingHours } : {}),
  }
  await put(`.${placeLink(s)}index.html`, page({ title, description, canonical, body, jsonld: [ld, crumbs(trail)] }))
  urls.push(canonical)
}

// ---------------------------------------------------------------------------
// Kommunsidor
const kommunStats = new Map()
for (const k of kommuner) {
  const list = byKommun.get(k)
  const core = list.filter((s) => s.services.some((x) => ORDER.includes(x)))
  const count = (sv) => list.filter((s) => confirmed(s).includes(sv)).length
  const counts = ORDER.map((sv) => [sv, count(sv)]).filter(([, n]) => n > 0)
  kommunStats.set(k, { core: core.length, counts: Object.fromEntries(counts) })
  const lan = lanFor(k)
  const title = `Tömning för husbil i ${k} – latrin, gråvatten, vatten & gasol`
  const description = `${core.length} platser i ${k} kommun: ${counts.map(([sv, n]) => `${n} ${LABELS[sv].toLowerCase()}`).join(', ')}. Karta, öppettider, avgifter och vägbeskrivning – gratis på Tömningskartan.`
  const sections = ORDER.map((sv) => {
    const items = core.filter((s) => confirmed(s).includes(sv)).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
    if (!items.length) return ''
    return `<h2 id="${sv}">${esc(LABELS[sv])} i ${esc(k)} (${items.length})</h2><ul class="places">${items
      .map((s) => {
        const svc = confirmed(s).filter((x) => x !== 'sopor' && x !== 'atervinning').map((x) => LABELS[x] ?? x).join(' · ')
        const extra = [s.address, s.fee, s.openingHours].filter(Boolean).map(esc).join(' · ')
        const link = placeLink(s)
        return `<li>${link ? `<a class="n" href="${esc(link)}">${esc(s.name)}</a>` : `<span class="n">${esc(s.name)}</span>`}<br><span class="s">${esc(svc)}${extra ? ' · ' + extra : ''}</span><br><a href="/?at=${s.lat.toFixed(5)},${s.lon.toFixed(5)},15&amp;id=${esc(encodeURIComponent(s.id))}">Visa på kartan →</a></li>`
      })
      .join('')}</ul>`
  }).join('')
  const c = centers.get(slug(k))
  const neighbours = c
    ? kommuner.filter((o) => o !== k && centers.get(slug(o))).map((o) => ({ o, d: distM(c, centers.get(slug(o))) })).sort((a, b) => a.d - b.d).slice(0, 6)
    : []
  const canonical = kommunUrl(k)
  const trail = [['Tömningskartan', `${SITE}/`], ...(lan ? [[lan, lanUrl(lan)]] : [['Kommuner', `${SITE}/kommun/`]]), [k, canonical]]
  const first = core[0] ?? list[0]
  const body = `${bcHtml(trail)}
<h1>Tömning, vatten & gasol för husbil i ${esc(k)}</h1>
<p class="lead">${esc(description)}</p>
<a class="cta" href="/?at=${first.lat.toFixed(4)},${first.lon.toFixed(4)},11">Öppna kartan över ${esc(k)} →</a>
${sections}
${neighbours.length ? `<h2>Grannkommuner</h2><ul class="cols">${neighbours.map(({ o }) => `<li><a href="${esc(kommunUrl(o).replace(SITE, ''))}">${esc(o)}</a> (${byKommun.get(o).filter((s) => s.services.some((x) => ORDER.includes(x))).length})</li>`).join('')}</ul>` : ''}
<p class="lead">Saknas en plats eller stämmer något inte? Öppna kartan och använd "Lägg till en plats" eller "Rapportera fel" – uppgifterna granskas och kartan uppdateras varje vecka.</p>`
  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `Tömning och vatten för husbil i ${k}`,
    itemListElement: core.filter((s) => placeLink(s)).slice(0, 100).map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${placeLink(s)}`, name: s.name })),
  }
  await put(`kommun/${slug(k)}/index.html`, page({ title, description, canonical, body, jsonld: [crumbs(trail), itemList] }))
  urls.push(canonical)
}
const total = places.length
await put('kommun/index.html', page({
  title: 'Tömning för husbil per kommun – alla Sveriges kommuner | Tömningskartan',
  description: `Gråvatten- och latrintömning, färskvatten, gasol och ställplatser för husbil i ${kommuner.length} kommuner – ${total} platser med tömning, vatten eller gasol.`,
  canonical: `${SITE}/kommun/`,
  body: `${bcHtml([['Tömningskartan', `${SITE}/`], ['Kommuner', `${SITE}/kommun/`]])}
<h1>Tömning för husbil – kommun för kommun</h1>
<p class="lead">${total.toLocaleString('sv-SE')} platser med tömning, vatten eller gasol i ${kommuner.length} kommuner. Välj kommun för listan${hasLan() ? ', eller <a href="/lan/">välj län</a>' : ''}.</p>
<a class="cta" href="/">Öppna kartan →</a>
<ul class="cols">${kommuner.map((k) => `<li><a href="/kommun/${slug(k)}/">${esc(k)}</a> (${kommunStats.get(k).core})</li>`).join('')}</ul>`,
}))
urls.push(`${SITE}/kommun/`)

// ---------------------------------------------------------------------------
// Länssidor
const lans = [...new Set(kommuner.map(lanFor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'))
for (const l of lans) {
  const ks = kommuner.filter((k) => lanFor(k) === l)
  const sum = (sv) => ks.reduce((n, k) => n + (kommunStats.get(k).counts[sv] ?? 0), 0)
  const nCore = ks.reduce((n, k) => n + kommunStats.get(k).core, 0)
  const counts = ORDER.map((sv) => [sv, sum(sv)]).filter(([, n]) => n > 0)
  const canonical = lanUrl(l)
  const trail = [['Tömningskartan', `${SITE}/`], ['Län', `${SITE}/lan/`], [l, canonical]]
  const description = `${nCore} platser för husbil i ${l}: ${counts.map(([sv, n]) => `${n} ${LABELS[sv].toLowerCase()}`).join(', ')}. Kommun för kommun med karta och vägbeskrivning.`
  await put(`lan/${slug(l)}/index.html`, page({
    title: `Tömning för husbil i ${l} – latrin, gråvatten, vatten & gasol`,
    description, canonical,
    body: `${bcHtml(trail)}
<h1>Tömning, vatten & gasol för husbil i ${esc(l)}</h1>
<p class="lead">${esc(description)}</p>
<a class="cta" href="/">Öppna kartan →</a>
<h2>Kommuner i ${esc(l)}</h2>
<ul class="places">${ks.map((k) => { const st = kommunStats.get(k); return `<li><a class="n" href="${esc(kommunUrl(k).replace(SITE, ''))}">${esc(k)}</a><br><span class="s">${ORDER.filter((sv) => st.counts[sv]).map((sv) => `${st.counts[sv]} ${LABELS[sv].toLowerCase()}`).join(' · ') || 'inga platser ännu'}</span></li>` }).join('')}</ul>`,
    jsonld: [crumbs(trail)],
  }))
  urls.push(canonical)
}
if (lans.length) {
  await put('lan/index.html', page({
    title: 'Tömning för husbil per län – Tömningskartan',
    description: `Gråvatten- och latrintömning, färskvatten och gasol för husbil i Sveriges ${lans.length} län, kommun för kommun.`,
    canonical: `${SITE}/lan/`,
    body: `${bcHtml([['Tömningskartan', `${SITE}/`], ['Län', `${SITE}/lan/`]])}
<h1>Tömning för husbil – län för län</h1>
<p class="lead">Välj län för att se kommunerna och platserna där.</p>
<ul class="cols">${lans.map((l) => `<li><a href="/lan/${slug(l)}/">${esc(l)}</a></li>`).join('')}</ul>`,
  }))
  urls.push(`${SITE}/lan/`)
}

// ---------------------------------------------------------------------------
// Riksöversikt per tjänst
for (const t of TJANSTER) {
  const all = places.filter((s) => t.match(s) && confirmed(s).some((x) => CORE.includes(x)))
  const canonical = `${SITE}/tjanst/${t.slug}/`
  const trail = [['Tömningskartan', `${SITE}/`], [t.label, canonical]]
  const groups = lans.length ? lans.map((l) => [l, all.filter((s) => lanFor(s.kommun) === l)]) : [['Sverige', all]]
  const rest = lans.length ? all.filter((s) => !lanFor(s.kommun)) : []
  if (rest.length) groups.push(['Övriga', rest])
  const description = `${t.intro}: ${all.length} platser i hela Sverige, län för län. Gratis karta med vägbeskrivning, öppettider och avgifter.`
  const body = `${bcHtml(trail)}
<h1>${esc(t.label)} för husbil – ${all.length} platser i Sverige</h1>
<p class="lead">${esc(description)}</p>
<a class="cta" href="/">Öppna kartan →</a>
${groups.filter(([, g]) => g.length).map(([l, g]) => {
  const byK = new Map()
  for (const s of g) byK.set(s.kommun, [...(byK.get(s.kommun) ?? []), s])
  return `<h2>${esc(l)} (${g.length})</h2><ul class="cols">${[...byK.keys()].sort((a, b) => a.localeCompare(b, 'sv')).map((k) => `<li><a href="${esc(kommunUrl(k).replace(SITE, ''))}">${esc(k)}</a>: ${byK.get(k).slice(0, 6).map((s) => `<a href="${esc(placeLink(s))}">${esc(s.name)}</a>`).join(', ')}${byK.get(k).length > 6 ? ` m.fl.` : ''}</li>`).join('')}</ul>`
}).join('')}`
  await put(`tjanst/${t.slug}/index.html`, page({ title: `${t.label} för husbil i Sverige – ${all.length} platser | Tömningskartan`, description, canonical, body, jsonld: [crumbs(trail)] }))
  urls.push(canonical)
}

// ---------------------------------------------------------------------------
// Vanliga frågor (FAQPage) – svaren bygger på faktisk data, inga påhittade siffror.
const nLatrin = places.filter((s) => confirmed(s).includes('latrin')).length
const nGra = places.filter((s) => confirmed(s).includes('gravatten')).length
const nVatten = places.filter((s) => confirmed(s).includes('vatten')).length
const nGasol = places.filter((s) => confirmed(s).includes('gasol')).length
const nRast = places.filter((s) => s.source === 'trafikverket').length
const faq = [
  ['Var kan jag tömma latrinen från husbilen?', `Tömningskartan visar ${nLatrin} platser med latrintömning (kassettoalett) i Sverige – på campingar, ställplatser, gästhamnar, reningsverk och ${nRast} av Trafikverkets rastplatser. Välj "Latrin" i kartan eller sök på din ort. <a href="/tjanst/latrintomning/">Alla platser med latrintömning</a>.`],
  ['Var kan jag tömma gråvatten?', `${nGra} platser har gråvattentömning. Gråvatten får inte släppas ut på marken eller i dagvattenbrunnar – töm i en tömningsstation. Trafikverkets rastplatser tar i regel bara emot kassettoaletter, inte gråvatten. <a href="/tjanst/gravattentomning/">Alla platser med gråvattentömning</a>.`],
  ['Var kan jag fylla på färskvatten till husbilen?', `${nVatten} platser har påfyllning av färskvatten. Ta gärna med en egen slang och adapter – kranarna ser olika ut. <a href="/tjanst/farskvatten/">Alla platser med färskvatten</a>.`],
  ['Var kan jag byta eller fylla gasol?', `${nGasol} platser säljer eller fyller gasol. Kartan skiljer på byte av tub (automat eller butik) och påfyllning av egen flaska eller fast tank. Ring gärna innan om du behöver en viss flasktyp. <a href="/tjanst/gasol-byte/">Byt gasoltub</a> · <a href="/tjanst/gasol-pafyllning/">Gasolpåfyllning</a>.`],
  ['Kostar det att tömma?', 'Många kommunala tömningsstationer och Trafikverkets rastplatser är gratis. På campingar ingår tömning ofta för gäster, medan förbipasserande kan betala en avgift. Kartans filter "Gratis" visar bara platser där tömningen uttryckligen är gratis för alla.'],
  ['Är Tömningskartan gratis?', 'Ja. Tömningskartan är gratis, utan reklam och utan konto. Den fungerar i mobilens webbläsare och kan läggas till på hemskärmen som en app; platserna finns kvar även utan nät.'],
  ['Varifrån kommer uppgifterna?', 'Från OpenStreetMap, Trafikverkets rastplatsdata, kommunernas och anläggningarnas egna webbplatser samt besökares förslag som granskas innan de publiceras. Uppgifter som bara kommer från osäkra källor visas grå som obekräftade. Kartan uppdateras varje vecka.'],
  ['En plats saknas eller är fel – vad gör jag?', 'Öppna platsen i kartan och tryck "Rapportera fel", eller använd "Lägg till en plats". Bekräfta gärna med "Stämmer fortfarande" när du har varit där – det hjälper andra.'],
]
const faqLd = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })),
}
await put('fragor/index.html', page({
  title: 'Vanliga frågor om tömning, vatten och gasol för husbil | Tömningskartan',
  description: 'Var tömmer man latrin och gråvatten från husbilen, var fyller man vatten och gasol, och vad kostar det? Svar och karta över alla platser i Sverige.',
  canonical: `${SITE}/fragor/`,
  body: `${bcHtml([['Tömningskartan', `${SITE}/`], ['Vanliga frågor', `${SITE}/fragor/`]])}
<h1>Vanliga frågor om tömning, vatten och gasol för husbil</h1>
${faq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${a}</p>`).join('\n')}
<a class="cta" href="/">Öppna kartan →</a>`,
  jsonld: [faqLd],
}))
urls.push(`${SITE}/fragor/`)

// ---------------------------------------------------------------------------
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(urls)].map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${updated}</lastmod></url>`).join('\n')}
</urlset>
`
await writeFile(new URL('sitemap.xml', PUB), sitemap)
await writeFile(new URL('seo.css', PUB), SEO_CSS)
console.log(`SEO-sidor: ${places.length} platssidor, ${kommuner.length} kommunsidor, ${lans.length} länssidor, ${TJANSTER.length} tjänstesidor, FAQ + sitemap (${new Set(urls).size} URL:er)`)
