# Tömningskartan – projektöversikt för AI-assistenter

Läs denna fil först i varje ny session. Den sammanfattar allt som byggts,
hur det hänger ihop och vilka arbetsprinciper som gäller.

## Vad appen är

Webb-/mobilapp (PWA) för husbils- och husvagnsägare i Sverige: hitta platser
för gråvatten-/latrintömning, färskvatten, sopor och gasol. Ställplats och
camping är sekundär info. Ägare: Per (GitHub **PerraFree**, begränsad teknisk
vana – förklara "för dummies", håll UI:t rent och enkelt). Mejl för
granskningar: pej2727@gmail.com.

- **Live:** https://perrafree.github.io/PJfrance/ (adminsida: `?admin=1`)
- **Default-branch = arbetsbranch:** `claude/gravatten-latrin-app-sverige-aed0qg`
- Push till branchen → `deploy.yml` bygger och publicerar till `gh-pages` automatiskt.

## Teknik

Vite + React 18 + TypeScript + Leaflet + leaflet.markercluster. Ingen backend
utom Supabase (crowdsourcing). PWA med egen `public/sw.js` (nätverk först;
bumpa `CACHE`-versionen vid behov). Capacitor/Android finns förberett
(`docs/BUILD-MOBILE.md`).

## Nyckelfiler

| Fil | Roll |
|---|---|
| `src/App.tsx` | Nav/panel, sök (parallell geokodning + Avbryt), filter, räknare, versionsrad |
| `src/components/MapView.tsx` | Karta. Viktigt: viewport-rendering (CAP 600), popup-persistens (`popupOpenRef`/`rebuildPendingRef`/`focusingRef`), popupen stängs BARA av användaren |
| `src/types.ts` | `ServiceType` (gravatten, latrin, vatten, **sopor**, stallplats, camping, gasol), färger, etiketter |
| `src/lib/overpass.ts` | Live-hämtning per kartvy (zoom ≥ 12). Speglar synkskriptets taggtolkning – ändra ALLTID båda |
| `scripts/sync-stations.mjs` | CI-synk: OSM (Overpass) + Trafikverket + `scripts/curated-places.json` → `public/data/stations-seed.json` |
| `scripts/curated-places.json` | Eget register (~120 platser). Föredra `lat`/`lon` framför `query` (adressuppslag har gett felplaceringar!) |
| `src/components/AdminPanel.tsx` | Adminstatus + engångsfix-guide |
| `supabase/schema.sql` | Idempotent schema: submissions, reports, verifications, reviews (RLS) |
| `supabase.env` | Publik Supabase-koppling (skrivs av installer-workflowen; anon-nyckeln är publik per design) |

## Workflows (.github/workflows/)

- `deploy.yml` – bygg + datasynk + publicera till gh-pages (push/dispatch/veckocron må 04). Läser `supabase.env`.
- `installera-databasen.yml` – engångsknapp: hittar Supabase-projektet, väcker pausat projekt, hämtar/skapar nyckel, skriver `supabase.env`, kör schema, dispatchar deploy. Kräver secret `SUPABASE_ACCESS_TOKEN`.
- `bevaka-platsforslag.yml` – var 3:e timme: nya förslag/kommentarer → GitHub-ärenden (mejl till Per). Markör `<!-- submission:UUID -->` på FÖRSTA raden; användartext saneras via `cell()`.
- `hantera-platsforslag.yml` – kommentar `godkänn`/`neka`/`avslå` i ärendet uppdaterar Supabase (ord-jämförelse, INTE `\b` – trasigt med å/ä/ö). Väcker pausad databas först.
- Secrets: `SUPABASE_ACCESS_TOKEN`, `TRV_API_KEY`.

## Dataflöde och principer

1. Seed-datan byggs i CI (sandboxen saknar externnät – Overpass/Nominatim/TRV går INTE att nå lokalt; verifiera i stället efter deploy via `git show origin/gh-pages:data/stations-seed.json`).
2. **Alla 290 kommuner är systematiskt genomsökta** (aug 2026). Miss-mönstret var: kommun-/förenings-/klubbplatser finns bara på webben, inte i OSM/TRV.
3. **Koordinatprincip:** lita aldrig blint på geokodning – Åmål hamnade i Skåne en gång. Nya registerplatser får källkoordinater, och lägen rimlighetskontrolleras mot rätt ort efter deploy.
4. Dubblettkontroll mot befintlig data görs med kärnnamn (generiska ord bortskalade); appen har dessutom avstånds-dedupe + fältfyllnad i runtime.

## Verifiering & test

- Bygg community-läge: `VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build`
- Playwright: Chromium på `/opt/pw-browsers/chromium`; testskript måste ligga i projektmappen (playwright-core-resolution), mocka externa hosts med `ctx.route`, sätt `localStorage tomningskartan.introSeen=1`. Radera testskript före commit.
- Deploy-kvitto: bevaka `git ls-remote origin gh-pages` (byt hash) OCH GitHubs interna `pages-build-deployment` (workflow-id 317009082) – den kan fastna/kraschas separat; en tom commit på gh-pages knuffar igång en färsk publicering.
- Versionsrad i menyn ("Version <byggtid>") är kvittot på att mobilen kör senaste versionen.

## Commit-regler

Svenska commit-meddelanden. Avsluta alltid med:
```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AMD92fRRy7TUSsKmSB1TFY
```
(byt sessionslänken till aktuell session). Aldrig modell-ID i kod/commits.
`git pull --rebase` före push. Inga PR utan uttrycklig begäran.

## Läget just nu (2026-08-09)

- **5 020 platser live**, varav sopor 2 164, ställplats 1 405, latrin 846,
  gråvatten 590, vatten 587, gasol 42. ~120 platser i egna registret.
- Menyknapp: grön rundad ruta med stor pil bredvid appnamnet (fäll ut/ihop).
- Popup-persistens, mobil bottensheet, versionsrad – allt utrullat och verifierat.

## Backlog (nästa att göra, i prioritetsordning)

1. **Gasolsvep** – bara 42 platser; OSM taggar sällan gasolförsäljning.
   Websvep mot återförsäljarlistor (OKQ8, Gasolbutiken m.fl.) skulle ge 100+.
2. **Tjänsteberikning** – många campingar på kartan HAR tömning utan att det
   syns (visas bara som "camping"). Kräver berikning per plats.
3. **Öppettider/vinterstängt** saknas för många platser.
4. Vilhelmina-tömningsstationen togs bort i väntan på bekräftat läge.
5. AdminPanel: 'na'-läget och tabellkontroller är fixade; håll texterna i
   synk med installer-flödet vid ändringar.

## Dokumentation

`docs/ADMIN.md` (Pers guide), `docs/SUPABASE.md`, `docs/DATAKALLOR.md`,
`docs/BUILD-MOBILE.md`.
