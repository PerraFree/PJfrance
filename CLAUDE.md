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
| `scripts/curated-places.json` | Eget register (~207 platser). Föredra `lat`/`lon` framför `query` (adressuppslag har gett felplaceringar!). Nya fält: `nearLat`/`nearLon` (+ ev. `maxKm`, standard 30) – geokodningar som hamnar längre bort än så kasseras av synkskriptet |
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

1. **Gasolsvep** – KLART (aug 2026): 148 gasolplatser i registret.
   86 från Lindes katalog (forsaljningsstallen.linde.se): gasolautomater
   (24/7) + AGA-återförsäljare. 62 från Primagaz/Norbro Energis katalog
   (primagaz.se, SEO-sidor med namn+postnr+ort+gata i URL:en – å/ä/ö är
   bortstrippade i slugarna, gatunamnen är rekonstruerade). Metod: WebSearch
   med `allowed_domains` mot katalogerna (direkthämtning är egress-blockad).
   Flogas har ingen offentlig återförsäljarlista; OKQ8:s stationssidor går
   inte att verifiera per station – väntar. VIKTIGT efter deploy: verifiera
   att geokodningen gick bra via `git show origin/gh-pages:data/stations-seed.json`
   (rimlighetskontrollen kasserar >30 km-missar, se synkloggen i Actions).
2. **Tjänsteberikning – PÅGÅENDE, STOR OMFATTNING (viktigast just nu).**
   Många campingar/ställplatser på kartan HAR tömning/vatten utan att det
   syns (visas bara som "camping"/"stallplats" – OSM saknar taggen, men
   anläggningen har servicen i verkligheten). Upptäckt aug 2026 när Per
   stack in fingret på flera slumpvalda platser (Gekås, Alingsås,
   Vårgårda) och alla visade sig sakna service.

   **Faktisk omfattning** (mät alltid om på nytt mot senaste seed – detta
   är ett ögonblicksfoto från aug 2026):
   ```
   git show origin/gh-pages:data/stations-seed.json > /tmp/seed.json
   node -e "const j=require('/tmp/seed.json'); const st=j.stations??j;
     console.log('camping utan tömning/vatten:',
       st.filter(s=>s.services.includes('camping')&&!s.services.some(x=>['gravatten','latrin','vatten'].includes(x))).length);
     console.log('stallplats utan tömning/vatten:',
       st.filter(s=>s.services.includes('stallplats')&&!s.services.some(x=>['gravatten','latrin','vatten'].includes(x))).length);"
   ```
   Läget aug 2026: ~1250 campingar + ~900 ställplatser saknar service.
   Ett svep av "kända stora namn" (storcamping-sweep, ~70 platser) räcker
   INTE och gav en falsk känsla av heltäckning – varje ny stickprovskoll
   hittade nya hål. **Gör aldrig om det misstaget:** kör i stället
   systematiskt, region för region, mot den fulla listan ovan.

   **Metod som fungerar** (körd för Västra Götaland aug 2026, 14 av 55
   platser fick verifierad service tillagd):
   1. Filtrera fram camping/stallplats-only-poster i seed som HAR
      `website` i datan (regionalt, t.ex. bbox) – de går att verifiera
      mot källan i stället för att gissas fram.
   2. Kör flera Agent-anrop parallellt (Agent-tool, general-purpose),
      ~9 platser per agent, som var och en hämtar webbplatsen (WebFetch,
      med WebSearch+allowed_domains som fallback – WebFetch är ofta
      egress-blockad mot enskilda campingdomäner i den här miljön) och
      kräver konkret belägg/citat för gravatten/latrin/vatten.
   3. Lägg BARA till poster med confidence "high" (tydligt citat). "low"/
      "unclear" ska INTE läggas till – spara namnen och kolla manuellt
      senare i stället för att gissa.
   4. Dedupe mot befintliga curated-poster (samma tjänster inom ~400 m)
      innan de skrivs – annars dubbelpinnar man samma fysiska camping.

   **FAS 1 KLAR (aug 2026): alla campingar med `website` i data granskade,
   riksomfattande.** Västra Götaland (55 platser) + fyra nationella vågor
   (405 platser i 41 grupper à ~10, geografiskt sorterat syd→nord, Skåne
   till Norrbotten) = 460 platser granskade totalt. 89 fick verifierad
   service tillagd (14 VG + 26+20+16+13 nationellt), resten gav bara
   osäkra/svaga träffar och lades INTE till (sparade inte namn per plats,
   men mönstret: sajter med "servicehus/dusch/toalett" men inget konkret
   om tömning för HUSBIL ger nästan alltid "unclear" – riktig service
   nämns nästan alltid explicit ("gråvattentömning", "latrintömning",
   "CamperClean" etc.). Två dubbletter upptäcktes och slogs ihop under
   vägen (samma camping hade fått både en tidig query-baserad post och en
   ny exakt-koordinat-post – kolla ALLTID efter "First Camp X"/kedjenamn
   som kan redan finnas under annat namn innan de läggs till).

   **FAS 2 – PÅGÅENDE, PAUSAD VID SÖKBUDGETENS GRÄNS (aug 2026).**
   De ~802 campingarna utan `website` i seed-datan delades i 420 med ett
   sökbart namn ("Väla Camping" etc.) och 382 som bara heter "Camping"
   (eller är OSM-genererade platshållartexter som "good place for
   camping", "(may be wet)", "Möglichkeit zu zelten") – de senare går
   INTE att söka fram och är en egen, öppen lucka (kräver annan metod,
   t.ex. crowdsourcing eller manuell koll).

   De 420 namngivna delades i 42 grupper à ~10, samma agent-mönster som
   FAS 1 men med namnbaserad WebSearch (ort behöver ofta identifieras
   från koordinaten först) i stället för direkt URL → lägre träffsäkerhet,
   fler "unclear". **24 av 42 grupper klara (3 av ~5 planerade vågor)**:
   86 fick verifierad service. Våg 4 (grupp 36–41, ~60 platser, mest
   övre Norrland/fjällen) kunde INTE granskas – sessionens WebSearch-kvot
   (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`, delas av alla agenter i
   samma session) tog slut mitt i vågen (grupp 41 testad separat efter
   pausen som kontroll – samma resultat: 0/200 kvar, alla "unclear").
   Flera av de sista platserna visade sig dessutom vara OSM-genererade
   platshållarnamn utan verkligt innehåll att söka på ("good place for
   camping", "Possible Camping" osv.), så förlusten är sannolikt liten.
   Inga nya fynd från grupp 36–41 är tillagda i registret. **Fortsätt
   från nw-group-36.json i en ny session** (grupp 00–35-filerna och
   resultaten finns redan, ingen anledning att göra om dem) när kvoten
   återställts – en ny session ger en fräsch kvot.

   Per fältrapport (aug 2026): Lygnareds Camping (campingalingsas.com,
   Alingsås) saknas fortfarande – granskad två gånger, webbplatsen går
   inte att läsa härifrån (egress-blockad) och inga tredjekällor
   bekräftar specifika tjänster. Kräver antingen höjd sökbudget eller att
   någon läser sidan manuellt och rapporterar vad den säger.

   Pers fälttips (aug 2026): majoriteten av golfklubbar har färskvatten-
   påfyllning – ett golfklubbssvep vore värdefullt (Götaström tillagd
   efter besök på plats). Samma "verifiera innan du lägger till"-metod
   gäller där.
3. **Öppettider/vinterstängt** saknas för många platser.
4. Vilhelmina-tömningsstationen togs bort i väntan på bekräftat läge.
5. AdminPanel: 'na'-läget och tabellkontroller är fixade; håll texterna i
   synk med installer-flödet vid ändringar.

## Dokumentation

`docs/ADMIN.md` (Pers guide), `docs/SUPABASE.md`, `docs/DATAKALLOR.md`,
`docs/BUILD-MOBILE.md`.
