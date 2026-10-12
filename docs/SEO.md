# SEO & spridning (25 sep 2026, utbyggt 12 okt 2026)

## Läge 12 okt 2026 (Per: "maxa SEO")
`scripts/build-seo-pages.mjs` bygger vid varje deploy (allt gitignorerat):
- `/plats/<namn>-<kommun>-<id-hash>/` – en sida per BEKRÄFTAD plats med
  tömning/vatten/gasol (~1 800). Adressen bygger på platsens permanenta id,
  så den ändras inte när namnet ändras. Titel "Namn – tjänster i Kommun"
  (≤65 tecken), fakta, 8 närmaste platser, knapp in i kartan (`?at=…&id=…`),
  JSON-LD `Place` + `BreadcrumbList`. Dubbletter (flera källor inom 60 m,
  samma namn inom 1 km) får en sida. Obekräftade platser får ingen sida.
- `/kommun/<slug>/` – länkar varje plats + grannkommuner, `ItemList`.
- `/lan/<slug>/` – kräver `scripts/kommun-lan.json` (kommun → län).
- `/tjanst/latrintomning|gravattentomning|farskvatten|gasol-byte|gasol-pafyllning/`.
- `/fragor/` – vanliga frågor, `FAQPage` (svaren använder faktiska antal).
- `/seo.css` (gemensam stil), `sitemap.xml` med alla adresser + lastmod.
- deploy.yml stoppar om platssidor/tjänstesidor/FAQ saknas i bygget.
Search Console är verifierad och sitemapen inskickad av Per (25 sep) – Google
läser den nya sitemapen själv. Kontroll: Search Console → Sidor (indexerade)
och Sitemaps (antal upptäckta adresser ska vara ~2 100).


Flyttat från CLAUDE.md 11 okt 2026.

Per frågade hur sidan får maximal spridning. Appen är en SPA utan crawlbar
text, så det tekniska SEO-arbetet bygger på statiska sidor vid sidan av:
- `scripts/build-seo-pages.mjs` (körs i `deploy.yml` efter synken, före
  `vite build`) genererar `public/kommun/<slug>/index.html` för varje kommun
  (platser grupperade per tjänst, länk in i appen via `?at=lat,lon,15`),
  `public/kommun/index.html` och `public/sitemap.xml`. Genererade filer är
  gitignorerade. Obekräftade platser (`unverified`) tas inte med. Kräver
  fältet `kommun` på platserna: synken sätter det via `assignMunicipalities()`
  (Overpass `admin_level=7` med `out center`, närmaste kommuncentrum – grovt:
  Borås kommun fick bara 33 platser i första körningen eftersom kanterna
  hamnar hos grannkommunerna; riktiga kommungränser vore bättre men kräver
  polygon-data; reserv: förra seedens värde per id). Utfall 25 sep: 288
  kommunsidor, sitemap 291 URL:er, om/, robots.txt, og-image.png live.
  `previousOsmCount()` läser nu senast PUBLICERADE seeden (gh-pages raw) –
  repots egen seed-fil committades då inte av CI (numera gör sync-data.yml det,
  men gh-pages-kopian är fortfarande den säkra sanningen). Lokalt test:
  `SEED_PATH=<seed-med-kommun> MIN_KOMMUNER=5 node scripts/build-seo-pages.mjs`.
- `public/om/index.html` – statisk "Om"-sida med riktig text (vad, funktioner,
  källor, gratis/ingen reklam, kontakt) + JSON-LD `WebApplication`.
- `index.html`: canonical, absolut OG-bild (`public/og-image.png`, 1200×630,
  renderad med Playwright från en HTML-mall), `twitter:card
  summary_large_image`, JSON-LD, `<noscript>`-text med länkar.
- `public/robots.txt` med Sitemap-rad. Länkar "Om Tömningskartan" och
  "Platser per kommun" längst ner i panelen (`.foot-links`).
- **Per måste själv:** verifiera domänen i Google Search Console (DNS-TXT hos
  Inleed är enklast) och skicka in `https://tomningskartan.se/sitemap.xml`;
  samma i Bing Webmaster Tools. Utan det tar indexeringen veckor–månader.
- Marknadsföring utanför koden (Pers insats): Husbilsklubben-forumet,
  Facebook-grupper för husbil/husvagn, Husbil & Husvagn/Allt om Husvagn &
  Camping (tips till redaktion), campingar/kommuner som kan länka, QR-dekal
  vid tömningsstationer, Google Play via Capacitor.

