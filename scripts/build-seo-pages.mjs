// Bygger statiska, sökbara landningssidor från seed-datan (SEO):
//   public/kommun/index.html            – alla kommuner med antal platser
//   public/kommun/<slug>/index.html     – platser i en kommun, länkade in i appen
//   public/sitemap.xml                  – för Google/Bing
// Körs i deploy.yml efter synken, före vite build (vite kopierar public/ som den är).
// Själva appen är en SPA utan crawlbar text – de här sidorna ger Google något
// att indexera för sökningar som "latrintömning husbil Borås".
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const SITE = 'https://tomningskartan.se'
// SEED_PATH kan pekas om för lokala tester (sandboxen har ingen kommun-tilldelad seed).
const SEED = process.env.SEED_PATH ? pathToFileURL(process.env.SEED_PATH) : new URL('../public/data/stations-seed.json', import.meta.url)
const OUT_DIR = new URL('../public/kommun/', import.meta.url)

const LABELS = {
  gravatten: 'Gråvattentömning',
  latrin: 'Latrintömning',
  vatten: 'Färskvatten',
  gasol: 'Gasol',
  stallplats: 'Ställplats',
  camping: 'Camping',
  sopor: 'Sopor',
}
const ORDER = ['gravatten', 'latrin', 'vatten', 'gasol', 'stallplats', 'camping']

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function page({ title, description, canonical, body, breadcrumb }) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tömningskartan">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
${breadcrumb ? `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>` : ''}
<style>
  :root{--g:#1b5e20;--g2:#2e7d32;--t:#1f2a1f;--d:#5a6b5a;--bg:#f4f7f4;--card:#fff;--b:#dbe4db}
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
  ul.places a{color:var(--g2)}
  ul.kommuner{columns:2;column-gap:24px;padding-left:18px}
  @media(min-width:640px){ul.kommuner{columns:3}}
  nav.bc{font-size:.85rem;color:var(--d);margin:4px 0 8px}
  nav.bc a{color:var(--g2)}
  footer{max-width:860px;margin:24px auto;padding:0 16px 32px;color:var(--d);font-size:.85rem}
  footer a{color:var(--g2)}
</style>
</head>
<body>
<header><a href="/"><img src="/icon.svg" alt="">Tömningskartan</a></header>
<main>
${body}
</main>
<footer>Tömningskartan är en gratis karta för husbil och husvagn: gråvatten- och latrintömning, färskvatten, gasol, ställplatser och campingar i hela Sverige. Data från OpenStreetMap, Trafikverket, kommuner och eget register. <a href="/om/">Om Tömningskartan</a> · <a href="/kommun/">Alla kommuner</a></footer>
</body>
</html>
`
}

const seed = JSON.parse(await readFile(SEED, 'utf8'))
const stations = (seed.stations ?? seed).filter((s) => s.kommun && !s.unverified)
const byKommun = new Map()
for (const s of stations) {
  if (!byKommun.has(s.kommun)) byKommun.set(s.kommun, [])
  byKommun.get(s.kommun).push(s)
}
if (byKommun.size < Number(process.env.MIN_KOMMUNER ?? 100)) {
  console.warn(`SEO-sidor: bara ${byKommun.size} kommuner i datan (fältet kommun saknas?) – bygger inte om sidorna.`)
  process.exit(0)
}

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })
const updated = (seed.updatedAt ?? new Date().toISOString()).slice(0, 10)
const urls = [`${SITE}/`, `${SITE}/om/`, `${SITE}/kommun/`]
const kommuner = [...byKommun.keys()].sort((a, b) => a.localeCompare(b, 'sv'))

for (const k of kommuner) {
  const list = byKommun.get(k)
  const core = list.filter((s) => s.services.some((x) => ORDER.includes(x)))
  const count = (sv) => list.filter((s) => s.services.includes(sv)).length
  const counts = ORDER.map((sv) => [sv, count(sv)]).filter(([, n]) => n > 0)
  const title = `Tömningsstationer för husbil i ${k} – gråvatten, latrin, färskvatten & gasol`
  const description = `${core.length} platser i ${k} kommun: ${counts.map(([sv, n]) => `${n} ${LABELS[sv].toLowerCase()}`).join(', ')}. Öppna Tömningskartan för vägbeskrivning, öppettider och avgifter.`
  const sections = ORDER.map((sv) => {
    const items = core
      .filter((s) => s.services.includes(sv))
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
    if (!items.length) return ''
    return `<h2>${esc(LABELS[sv])} (${items.length})</h2><ul class="places">${items
      .map((s) => {
        const svc = s.services.filter((x) => x !== 'sopor').map((x) => LABELS[x] ?? x).join(' · ')
        const extra = [s.address, s.fee, s.openingHours].filter(Boolean).map(esc).join(' · ')
        return `<li><span class="n">${esc(s.name)}</span><br><span class="s">${esc(svc)}${extra ? ' · ' + extra : ''}</span><br><a href="/?at=${s.lat.toFixed(5)},${s.lon.toFixed(5)},15">Visa på kartan →</a></li>`
      })
      .join('')}</ul>`
  }).join('')
  const canonical = `${SITE}/kommun/${slug(k)}/`
  const body = `<nav class="bc"><a href="/">Karta</a> › <a href="/kommun/">Kommuner</a> › ${esc(k)}</nav>
<h1>Tömning, vatten & gasol för husbil i ${esc(k)}</h1>
<p class="lead">${esc(description)}</p>
<a class="cta" href="/?at=${(core[0] ?? list[0]).lat.toFixed(4)},${(core[0] ?? list[0]).lon.toFixed(4)},11">Öppna kartan över ${esc(k)} →</a>
${sections}
<p class="lead">Saknas en plats eller stämmer något inte? Öppna kartan och använd "Lägg till en plats" eller "Rapportera fel" – uppgifterna granskas och kartan uppdateras varje vecka.</p>`
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Tömningskartan', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: 'Kommuner', item: `${SITE}/kommun/` },
    { '@type': 'ListItem', position: 3, name: k, item: canonical },
  ] }
  await mkdir(new URL(`${slug(k)}/`, OUT_DIR), { recursive: true })
  await writeFile(new URL(`${slug(k)}/index.html`, OUT_DIR), page({ title, description, canonical, body, breadcrumb }))
  urls.push(canonical)
}

// Index över kommuner
const indexBody = `<nav class="bc"><a href="/">Karta</a> › Kommuner</nav>
<h1>Tömningsstationer för husbil – kommun för kommun</h1>
<p class="lead">${stations.length.toLocaleString('sv-SE')} platser i ${kommuner.length} kommuner: gråvatten- och latrintömning, färskvatten, gasol, ställplatser och campingar. Välj kommun för listan, eller öppna kartan direkt.</p>
<a class="cta" href="/">Öppna kartan →</a>
<ul class="kommuner">${kommuner.map((k) => `<li><a href="/kommun/${slug(k)}/">${esc(k)}</a> (${byKommun.get(k).filter((s) => s.services.some((x) => ORDER.includes(x))).length})</li>`).join('')}</ul>`
await writeFile(
  new URL('index.html', OUT_DIR),
  page({
    title: 'Tömningsstationer för husbil per kommun – Tömningskartan',
    description: `Lista över gråvatten- och latrintömning, färskvatten, gasol och ställplatser för husbil i alla Sveriges kommuner. ${stations.length} platser.`,
    canonical: `${SITE}/kommun/`,
    body: indexBody,
  }),
)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${updated}</lastmod><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>
`
await writeFile(new URL('../public/sitemap.xml', import.meta.url), sitemap)
console.log(`SEO-sidor: ${kommuner.length} kommunsidor + index + sitemap (${urls.length} URL:er)`)
