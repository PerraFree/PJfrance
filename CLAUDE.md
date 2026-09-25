# Tömningskartan – projektöversikt för AI-assistenter

Läs denna fil först i varje ny session. Den sammanfattar allt som byggts,
hur det hänger ihop och vilka arbetsprinciper som gäller.

## Vad appen är

Webb-/mobilapp (PWA) för husbils- och husvagnsägare i Sverige: hitta platser
för gråvatten-/latrintömning, färskvatten, sopor och gasol. Ställplats och
camping är sekundär info. Ägare: Per (GitHub **PerraFree**, begränsad teknisk
vana – förklara "för dummies", håll UI:t rent och enkelt). Mejl för
granskningar: pej2727@gmail.com.

- **Live:** https://tomningskartan.se/ (adminsida: `?admin=1`)
  – egen domän (köpt hos Inleed, sep 2026) kopplad till GitHub Pages via
  4 A-poster (185.199.108–111.153) + CNAME `www` → `perrafree.github.io`.
  `BASE_PATH=/` i `deploy.yml` och `cname: tomningskartan.se` i
  gh-pages-publiceringssteget håller domänen aktiv vid varje deploy. Repot
  själva heter fortfarande `PerraFree/PJfrance` (ändras inte, bara den
  publika adressen) – gamla `perrafree.github.io/PJfrance/`-länken funkar
  inte längre.
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
| `scripts/curated-places.json` | Eget register (~530 platser). Föredra `lat`/`lon` framför `query` (adressuppslag har gett felplaceringar!). Nya fält: `nearLat`/`nearLon` (+ ev. `maxKm`, standard 30) – geokodningar som hamnar längre bort än så kasseras av synkskriptet |
| `src/lib/weather.ts` | **ARKIVERAD/AVSTÄNGD sep 2026** (Per: "för mycket info i popupen") – slå på igen med `SHOW_WEATHER = true` överst i `MapView.tsx`; koden, CSS:en (`.weather-*`) och SMHI-parsern ligger kvar orörda. Väderprognos (6 dagar) per plats via SMHIs öppna prognos-API, ingen nyckel/backend. Hämtas när popupen öppnas (samma mönster som öppet-nu/ortsnamn i MapView), cache 30 min. Länk till Windy för visuell vind/nederbörd finns i popupen bredvid. **OBS:** SMHI bytte API 2026-03-31 (pmp3g → snow1g, platt `data`-objekt i stället för `parameters`-array) – parsern hanterar båda formaten defensivt, men kan inte testas live härifrån (domänen är egress-blockad i sandboxen) – verifiera i webbläsaren efter deploy om vädret slutar visas igen |
| `src/components/AdminPanel.tsx` | Adminstatus + engångsfix-guide |
| `src/lib/photos.ts` + `src/components/PhotoForm.tsx` | Community-foton ("📷 Lägg till foto", på befintliga OCH nya platser). Skalas ner klientsidan (max 1280px, JPEG q0.72, gräns 3 MB på originalfilen) innan uppladdning till Supabase Storage (`place-photos`-bucket, samma 3 MB-gräns satt på bucketen). Den faktiska sparade filen är mycket mindre (~150–400 kB per foto) – originalgränsen stoppar bara orimligt stora källfiler tidigt, den styr inte lagringskostnaden. Hålls medvetet litet för att inte äta av Supabase gratisnivåns lagring. **Publiceras direkt, INGEN granskningskö** (beslut aug 2026 – Per hinner inte bevaka ännu en kö). Olämpligt innehåll flaggas i stället via befintliga "Rapportera fel" |
| `supabase/schema.sql` | Idempotent schema: submissions, reports, verifications, reviews, photos (RLS) + `place-photos`-storage-bucket |
| `supabase.env` | Publik Supabase-koppling (skrivs av installer-workflowen; anon-nyckeln är publik per design) |

## Workflows (.github/workflows/)

- `deploy.yml` – bygg + datasynk + publicera till gh-pages (push/dispatch/veckocron må 04). Läser `supabase.env`.
- `installera-databasen.yml` – engångsknapp: hittar Supabase-projektet, väcker pausat projekt, hämtar/skapar nyckel, skriver `supabase.env`, kör schema, dispatchar deploy. Kräver secret `SUPABASE_ACCESS_TOKEN`.
- `bevaka-platsforslag.yml` – var 3:e timme: nya förslag/kommentarer → GitHub-ärenden (mejl till Per). Markör `<!-- submission:UUID -->` på FÖRSTA raden; användartext saneras via `cell()`.
- `hantera-platsforslag.yml` – kommentar `godkänn`/`neka`/`avslå` i ärendet uppdaterar Supabase (ord-jämförelse, INTE `\b` – trasigt med å/ä/ö). Väcker pausad databas först.
- Secrets: `SUPABASE_ACCESS_TOKEN`, `TRV_API_KEY`.
- **Claude-rutin (inte en GitHub-workflow):** "Tömningskartan – veckosvep
  datakällor" (skapad 24 sep 2026, måndagar 05:00 UTC, fristående
  Claude-session i Pers miljö). Läser `docs/svep-logg.md`, kör det
  fokusområde som har äldst datum (tömning / gasol / låg-evidens-verifiering
  / vatten+golf+tjänsteberikning), committar, pushar, verifierar efter
  deploy och mejlar/pushar en rapport till Per. Hanteras i
  claude.ai → Rutiner (pausa/ändra/ta bort där). Uppdatera alltid
  `docs/svep-logg.md` när ett svep körs manuellt också, annars gör rutinen
  om samma område i onödan.
- **`SUPABASE_ACCESS_TOKEN` går ut och MÅSTE bytas manuellt** – Supabases nya
  scoped access-tokens (deras gamla "legacy" full-access-tokens gick aldrig
  ut, men de nya scoped-tokens är begränsade till max ~90 dagar även om man
  väljer "Custom"/längsta datum). Gick ut oväntat 2–7 sep 2026 → alla tre
  ovanstående jobb fick `401 Unauthorized` (`bevaka-platsforslag.yml` visade
  det tydligast, med "Databasen vaknade inte i tid" tills felsökningen
  förbättrades att visa HTTP-status/svarstext direkt i stället för att bara
  pollra blint i 10 minuter, se `getProj()` i `bevaka-platsforslag.yml`).
  Ny token skapad 7 sep 2026 (giltig ~90 dagar, dvs ca 6 dec 2026) – en
  påminnelse är schemalagd ~3 veckor innan, men om den missas: gå till
  https://supabase.com/dashboard/account/tokens → *Generate new token* →
  Resource access: **Project** → org **PerraFree's Org** → projekt
  **Greywater** → Permissions: preset **Full access** → Expires in: längsta
  tillåtna (just nu ~90 dagar) → *Review access* → *Create token* → kopiera
  `sbp_…`-strängen → uppdatera secreten på
  https://github.com/PerraFree/PJfrance/settings/secrets/actions.

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

## Läget just nu (2026-09-25)

- **~6 150 platser live** (efter deploy v64; kontrollera `git show
  origin/gh-pages:data/stations-seed.json`): OSM ~4 400–4 600 (varierar med
  Overpass-spegel), Trafikverket 319, eget register 1 280 poster varav ~310
  obekräftade (grå). Gasol: ~440 platser, 80 med påfyllning av egen flaska,
  källsäkerhet på alla gasolposter.
- Funktioner utrullade denna vecka: grå obekräftade platser, källsäkerhet
  hög/medel/låg, "Längs min väg", bekräftelser med antal, centrerat
  platskort, väder avstängt (`SHOW_WEATHER`), närmaste-listan = 5, riktiga
  namn på namnlösa platser, riktiga kommungränser (`scripts/kommuner.json`),
  SEO-sidor per kommun + sitemap + Om-sida + OG-bild, Search Console
  verifierad och sitemap inskickad av Per (25 sep).
- Veckorutin "Tömningskartan – veckosvep datakällor" (må 05:00 UTC, 600
  sökningar) roterar enligt `docs/svep-logg.md`.
- Återanvändbara importskript ligger i `scripts/import-tools/` (läs README
  där – sökvägarna måste anpassas).
- **Deploy v64 (25 sep) verifierad + koordinatsvep (v65/v66):** 15 av de
  31 rättade platserna från källjämförelserna kom med i v64; 16 saknades
  (9 ogeokodbara adresser, 7 kasserade av rimlighetskontrollen – ofta för
  att `nearLat/nearLon` pekade på fel ort: Tågstallarna låg 31 km norr om
  Rättvik, Ratan 31 km fel, Älvkarleby ute i havet). Synkloggen visade
  dessutom 31 ÄLDRE poster (mest grå kandidatimporter) som tyst saknats i
  seeden. **OBS: två sessioner ("Gråvatten 3" och "Gråvatten 4") rättade
  samma lista parallellt 25 sep** – commit 19deba6 (11 platser, session 3)
  och nästa commit (session 4, 43 platser inkl. samma 11 med identiska
  koordinater) slogs ihop postvis; kör aldrig två sessioner mot samma
  öppna punkt. Metod: sex parallella agenter (WebSearch, ~130 sökningar)
  hämtade exakta koordinater från husbil.se/husbilsplats.se/park4night/
  hitta.se/operatörssajter (bara som KOORDINAT-källa; tjänster kräver
  fortfarande primärkälla; WebFetch är blockerat mot i stort sett alla
  dessa sajter). Utfall: 43 poster fick exakt `lat`/`lon`, 15 grå poster
  raderades som dubbletter av redan publicerade platser inom 100–400 m
  (Mangenbaden = Caravan Club Mangenbaden i Molkom, Lögdö Wild = OSM
  Skälsjön Camping, Överkalix, Pajala, Snibbens, Seglora, Bräcke Strand,
  Lilla Stigen, Härnösand-tömningen m.fl. fanns redan med full service
  från OSM/register), 3 uppgraderades till bekräftade med citat från
  operatör/kommun (Harnäsgården Ludvika, First Camp Ställplats
  Stockholm/Flaten, Mariebergsviken Karlstad), First Camp Nora fick
  gravatten+vatten (Visit Nora), Röks Lanthandel flyttad 6 km (låg fel),
  Kättingens ställplats flyttad från Kristianstad till Orsa. Fyra
  kandidatposter hade helt fel ort i `query` (Skojarbacken=Nora, Lilla
  Stigen=Dalsland, Snibbens=Ramvik, Mariebergsviken=Karlstad) – lärdom:
  kandidatimportens ortsgissning (median av platser med kommunnamnet i
  namnet) är opålitlig, kolla alltid källsidans egen koordinat. Skript:
  `apply-final.mjs` (scratchpad, samma mönster som import-tools).
  **Kvar:** jem & fix Alvesta (ingen källa ger koordinat – läs av
  hitta.se/eniro i webbläsare), Ljusdal X10 (husbilsplats-post på TRV-
  rastplats, gråvatten/vatten påstått), West Coast Gasol, Svenska Gas
  Orust, Råda/Tönnebro rastplats (latrin påstådd, TRV säger nej),
  husbilsplats.se-listan bakom betalvägg, campingkollen bara stickprov.
  Verifiera efter deploy att alla 43 finns i seeden.

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
   fler "unclear". **FAS 2 KLAR (aug 2026), alla 42 grupper granskade.**
   Grupp 00–35 (36010fc–48cc4b6): 86 fick verifierad service. Grupp 36–41
   (~60 platser, mest övre Norrland/fjällen) blockerades två gånger av
   sessionens delade WebSearch-kvot; **granskades klart i en tredje,
   fristående session (aug 2026)** eftersom föregående sessions
   gruppfiler (nw-group-*.json) inte överlevde till den nya containern –
   listan rekonstruerades i stället genom att filtrera om aktuell
   seed-data mot samma kriterier (camping/stallplats utan kärntjänst,
   utan `website`, namn som inte är en OSM-genererad platshållartext) och
   ta de ~70 nordligaste träffarna, vilket gav samma population som den
   ursprungliga grupp 36–41. 13 fick verifierad service (Fredrika
   Camping, Norets Camping, Kärleksuddens camping, Meselefors Vandrarhem
   & Camping, Bureå Camping, Kattisavans Camping, Skellefteå Camping,
   Bovikens Havsbad, Rännuddens camping, Trollforsen Camping vid
   Moskosel, Udden Fritidsområde/Pajala Camping och Vandrarhem,
   Karesuando Camping, Sandlövs camping). Resten gav bara låg/oklar
   evidens – många är fjällvandringsleders tältplatser (Kungsleden,
   Padjelanta, Sarek) helt utan operatör, som väntat.

   **Kvarstående öppen lucka:** de ~382 campingarna vars namn bara är
   "Camping" eller en OSM-genererad platshållartext ("good place for
   camping", "(may be wet)", "Möglichkeit zu zelten") går inte att söka
   fram alls – kräver crowdsourcing eller manuell koll, inte samma metod.

   Per fältrapport (aug 2026): Lygnareds Camping (campingalingsas.com,
   Alingsås) saknas fortfarande – granskad två gånger, webbplatsen går
   inte att läsa härifrån (egress-blockad) och inga tredjekällor
   bekräftar specifika tjänster. Kräver antingen höjd sökbudget eller att
   någon läser sidan manuellt och rapporterar vad den säger.

   Pers fälttips (aug 2026): majoriteten av golfklubbar har färskvatten-
   påfyllning – ett golfklubbssvep vore värdefullt (Götaström tillagd
   efter besök på plats). Samma "verifiera innan du lägger till"-metod
   gäller där.

   **Golfklubbssvep, del 1 (sep 2026):** Per flaggade att Borås Golfklubb
   (befintlig post, bara `stallplats`) borde ha vatten/latrin. Kollat mot
   git-historiken: posten har ALDRIG haft de tjänsterna – ingen regression,
   bara en lucka. Verifierat på nytt mot klubbens egen sida + park4night:
   Borås GK har uttryckligen INGEN gråvatten-/latrintömning (bara
   dusch/toalett i klubbhuset) – posten är alltså korrekt som den är.
   Djupdykning mot golfamore.com + klubbarnas egna sidor gav 9 nya poster
   med konkret citat (`query`+`nearLat`/`nearLon`, ej exakt lat/lon – ingen
   geokodning möjlig i sandboxen, verifiera läge efter deploy): Läckö GK
   (gravatten+latrin), Eskilstuna GK (gravatten+latrin+vatten), Vara-Bjertorp
   GK (gravatten+latrin+vatten), Ronneby GK (gravatten+latrin+vatten, OBS
   säsongsbegränsat), Skinnarebo G&CC (gravatten+latrin), Strängnäs GK
   (latrin+vatten), Vadstena GK (endast vatten), Norrfällsvikens GK (endast
   vatten), Åkersberga GK (endast vatten). ~10 klubbar till gav bara svag/
   oklar evidens (t.ex. Emmaboda, Jönåkers, Romeleåsens, Bosjökloster,
   Lunds Akademiska, Torreby, Eksjö, Lerjedalens GK) och lades INTE till –
   kräver oberoende källa utöver husbilsplats.se/park4night. Fyra klubbar
   bekräftat UTAN service (Sjögärde, Mälarbadens, Ölands, Ängsö GK – den
   sista uttryckligen förbjuder toatömning). Detta var ett första svep, inte
   heltäckande – fler golfklubbar återstår att kontrollera.
3. **Helt saknade platser (nya, ej bara "tjänsteberikning")** – upptäckt
   aug 2026 efter att Hofsnäs Herrgård (fullservice-ställplats) visade sig
   saknas helt (varken OSM, TRV eller vårt register hade den – bara
   nischade "hitta ställplats"-sajter som husbilsplats.se/park4night.com
   kände till). Ett nationellt discovery-svep kördes (7 parallella agenter,
   ett per landsdel) mot husbilsplats.se + park4night.com/en, se
   `docs/kandidatplatser-husbilsplats-park4night.md` för full rådata och
   metod/begränsningar. Resultat: ~470 kandidatplatser hittade, men nästan
   alla saknar en oberoende källa (husbilsplats.se/park4night räknas INTE
   som oberoende, inte ens tillsammans) – bara 3 höll måttet direkt:
   Ragvaldsträsk ställplats (ny post) samt komplettering av
   Massarbäcksgårdens ställplatser och Galvens Bygdegård ställplats med
   bekräftad färskvattenpåfyllning. Resten ligger kvar overifierat i
   kandidatfilen. **Kronoberg, Örebro och Värmland är helt osökta** (0
   sökningar, sessionens delade WebSearch-budget tog slut) – liksom ~35
   kommuner i Västra Götaland/Halland och delar av Öland/Gotland. Nästa
   session bör täcka dessa luckor och sedan verifiera de mest lovande
   kandidaterna (tydligt citat om gråvatten/latrin/vatten) mot en
   oberoende primärkälla innan tillägg.
4. **Öppettider/vinterstängt** saknas för många platser.
5. Vilhelmina-tömningsstationen togs bort i väntan på bekräftat läge.
6. AdminPanel: 'na'-läget och tabellkontroller är fixade; håll texterna i
   synk med installer-flödet vid ändringar.
7. **Baskartlager (sep 2026):** CARTO stängde av gratis, nyckelfri åtkomst
   till `basemaps.cartocdn.com` (Voyager-stilen som var default-kartan
   "Ljus") – visade "API KEY REQUIRED"-vattenstämplar i stället för kartan
   för ALLA användare. Bytt till Esris nyckelfria `World_Street_Map`
   (samma ArcGIS-tjänst som Satellit-lagret redan använde utan problem).
   Lade också till ett generellt säkerhetsnät i `MapView.tsx`: om det
   aktiva baskartlagret ger ≥6 tile-fel byts det automatiskt till
   OpenStreetMaps egna tiles (`tile.openstreetmap.org`, aldrig kräver
   nyckel) i stället för att kartan tyst förblir trasig tills någon
   session rättar koden. Kolla `console.warn`/statistik om det slår till.
8. **OSM-uteslutningslista** (aug 2026): `EXCLUDED_OSM_ELEMENTS` i
   `scripts/sync-stations.mjs` OCH `src/lib/overpass.ts` (speglar
   varandra, ändra ALLTID båda) – för OSM-element som Per bekräftat är
   fel/dubbletter men som vi inte kan rätta i själva OpenStreetMap
   härifrån. Första posten: `node/12907898116` ("Tömningsstation",
   namnlös nod ~106 m från Borås Camping Saltemad – bara en tömning
   finns där enligt fältkoll). Ta bort raden om/när OSM rättas uppströms.
9. **Gasol: byte vs. påfyllning av EGEN flaska** (sep 2026) – Per påpekade
   att "Gasol/LPG" ensamt inte säger om man kan byta tom tub mot full
   (automat/butik) eller fylla på sin EGEN löstagbara flaska (även halvfull)
   utan att byta den. De flesta husbilar/husvagnar har löstagbara
   komposit-/stålflaskor, inte en fast monterad tank. Nya `facilities`-nycklar
   `gasol_byte` och `gasol_pafyllning` i BÅDE `scripts/sync-stations.mjs` och
   `src/lib/overpass.ts` (speglar varandra, ändra ALLTID båda). Visas direkt i
   platsbadgen i popupen ("Gasol/LPG – byt tub" / "– fyll på"), inte gömt i
   "Finns här". **Sep 2026:** även egen kartnåls-/badge-symbol per typ –
   `serviceGlyph()` i `MapView.tsx` väljer 🔥 (byte/okänt) eller ⛽
   (renodlad påfyllning) i stället för samma 🔥 för alla gasolplatser.

   **Viktig lärdom (första försöket var fel):** `shop=gas` är tillförlitligt
   för byte (återförsäljare), men OSM-taggen `fuel:lpg=yes` (bensinstationer)
   är INTE tillförlitlig för byte/påfyllning – ett första försök att
   automatiskt tolka den som "påfyllning" visade sig fel vid djupare koll
   (se nedan). Borttagen från den automatiska tolkningen; hanteras i stället
   plats-för-plats via `OSM_FACILITY_OVERRIDES` (samma "type/id"-mönster som
   `EXCLUDED_OSM_ELEMENTS`, i BÅDA filerna).

   **Research-genomgång sep 2026** (3 parallella agenter, regionvis Syd/
   Väst+Öst/Stockholm+Norrland, WebSearch eftersom WebFetch är blockerat mot
   nästan alla gasolsajter härifrån) av de 18 OSM-platser som tidigare
   automatiskt fick "påfyllning":
   - **3 borttagna helt** (`EXCLUDED_OSM_ELEMENTS`, fel data i OSM): "E.ON
     Nobelv." Malmö (är E.ON:s huvudkontor, ingen publik gasolplats),
     "FordonsGas Varberg" och "Härnösand Fordonsgas CNG" (båda är CNG/
     biogas-stationer, helt annan gastyp än gasol/LPG – farligt att blanda
     ihop, irrelevant för husbil/husvagn).
   - **4 bekräftade BYTE** (`OSM_FACILITY_OVERRIDES` → `gasol_byte`): Preem
     Västra Frölunda, OKQ8 Västra Frölunda, OKQ8 Stockholm, Circle K
     Bandhagen Högdalen – citat från egna sajter/prisnamn ("Fyllning AGA…"
     är bytessystemets namn, inte lösviktspåfyllning).
   - **10 bekräftade PÅFYLLNING** (`OSM_FACILITY_OVERRIDES` → `gasol_pafyllning`):
     Aniol Gasol AB, Gasol Depån i Svartvik, Gasolfyllarna (Norrköping),
     Timmernabbens Karamellfabrik, Ahus Gas/GasolEsset Åhus, Nöbbelövs Gasol
     & Entreprenad (ev. nu "Gasol Kungen" Kristianstad – verifiera vid
     fältkoll), GasolEsset Ljungby, Kem och Gas AB (Jönköping), Örkelljunga
     Gasol/GasolEsset, LPG Flygstadens Gasol (ev. flyttad/nu "Gasolstationen"
     Verkstadsgatan 4 Halmstad enligt en källa – koordinat ej ändrad, kräver
     OSM-rättning uppströms).
   - **1 kvarstående oklar:** Preem, Nacka (Vattenverksvägen 2) – en
     husbilsklubben-tråd antyder påfyllning men utan exakt citat (WebFetch
     blockerad). Ingen override satt – visas som vanlig "Gasol/LPG" tills
     vidare. Ring och verifiera om någon har möjlighet.

   **20 nya påfyllningsplatser tillagda** i `curated-places.json`
   (`gasol_pafyllning`, alla med källcitat) från samma research, spridda
   över landet – bl.a. hela kedjan Gasolfyllarna (Göteborg, Trollhättan,
   Tullinge, Järfälla, Jordbro, Norrtälje, Enköping, Gävle), GasolEsset
   Trelleborg, Gasol Malmö LPG, Gasoldirekt Skepplanda, Gasolmacken Uppsala,
   Gasspecialisten Kiruna m.fl. Se git-historiken för fullständig lista med
   citat/källor.

   **Medvetet INTE tillagda** (för osäkra/motstridiga källor – gissa inte):
   Eslöv Gasol (misstänkt kopierad boilerplate-text, flera bolag hade
   identisk formulering), ABC Gasol Vallentuna (motstridiga källor: en säger
   lösviktspåfyllning, en säger fast pris per flaska = byte).

   **Kvarstående luckor:** Skellefteå (en forumpost antyder påfyllning men
   inget företagsnamn hittades), stora delar av Norrbotten/Västerbotten
   utanför Kiruna, samt generellt inga garantier för fullständig
   riksomfattande täckning – detta var ett första djupdyk, inte en
   heltäckande kartläggning.

   **myLPG.eu-svep (sep 2026):** kompletterande svep mot myLPG.eu (europeisk
   LPG-stationsdatabas som uttryckligen skiljer på lösviktspåfyllning/
   utomhusmonterad påfyllning/Safefill-Gasbank-flaskor kontra vanlig
   fordonsgasautogas). 6 genuint nya platser tillagda som `gasol_pafyllning`
   med citat: Gasolfyllarna Linköping, Gasolfyllarna Örebro, Barkmans
   (Eskilstuna), Gasbolaget (Falun), Gasolbolaget (Växjö), Gasolstationen
   (flyttad dec 2025 till Väla/Helsingborg). 2 träffar var dubbletter av
   redan tillagda platser (Kalmar, Norrköping) och hoppades över.

   **Egen ikon per typ (sep 2026):** utöver badgetexten ("– byt tub"/
   "– fyll på") syns skillnaden nu direkt på kartnålen och i badgen som
   symboler i stället för samma 🔥-glyf (`SERVICE_ICONS.gasol`) för alla
   gasolplatser. Första versionen visade bara 🔥 även på platser som hade
   BÅDA tjänsterna (dolde påfyllningsmöjligheten) – rättat: `serviceGlyph()`
   i `MapView.tsx` visar nu 🔥 (byte), ⛽ (renodlad påfyllning) eller båda
   ihop `🔥⛽` (har man både byte och påfyllning). Okänt/ingen facilities-data
   faller tillbaka på 🔥 (de flesta platser är byte). `pinIcon()` krymper
   fontstorleken när glyfen är två tecken så båda ryms i kartnålens cirkel.

   **Egen FÄRG, inte bara symbol (sep 2026):** Per påpekade att skillnaden
   fortfarande inte syntes tydligt nog – alla gasolnålar var röda oavsett
   byte/påfyllning, bara den lilla glyfen skilde. `serviceFill()` i
   `MapView.tsx` ger nu byte-platser röd nål (`SERVICE_COLORS.gasol`,
   oförändrad) och renodlade påfyllningsplatser en egen vinröd/magenta färg
   (`#ad1457`, kontrollerad ≥4.5:1 kontrast med vit text). Platser med BÅDA
   tjänsterna får en tvåfärgad (delad vänster/höger) kartnål i stället för
   att bara visas som röd byte-nål – `pinIcon()` klipper en andra kopia av
   nål-formen till höger halva via SVG `clipPath`. Samma logik driver
   badgefärgen i popupen (`linear-gradient` 50/50 för platser med båda).

   Första färgvalet (`#ad1457`, vinrött) lästes fortfarande som "rött" på en
   liten kartnål – för nära byte-röd (`#c62828`) för att synas som en tydlig
   skillnad utan att klicka in sig, vilket var exakt vad Per bad om att
   slippa. Bytt till mörkblått `#1a237e` – rött/blått är det mest åtskilda
   färgparet som finns, och funkar även för röd-grön-färgblinda (till
   skillnad från t.ex. rött/grönt eller rött/vinrött).

   **Separata filterknappar (sep 2026):** även EGEN FÄRG på kartnålen räckte
   inte enligt Per – man skulle kunna se/söka fram bara byte eller bara
   påfyllning UTAN att öppna varje plats för sig. Den gemensamma
   "Gasol/LPG"-filterknappen i huvudpanelen är nu delad i två separata
   knappar med varsin ikon (flamma återanvänd för byte, ny pumpsymbol för
   påfyllning i `src/lib/icons.ts`) och eget antal: "Gasol – byt tub" och
   "Gasol – fyll på". Tom mängd (`gasolFacilities` i App.tsx) = ingen
   gasolplats visas alls, oavsett om 'gasol' råkar finnas i den vanliga
   `activeFilters`-mängden – de två hålls i synk automatiskt
   (`toggleGasolFacility`/`ensureGasolFacilities` i App.tsx).

   All klassificeringslogik (byte/påfyllning-status, färg, ikon, "räknas
   platsen som aktiv med nuvarande filter?") flyttades till EN delad källa i
   `src/types.ts` (`gasolFacilityStatus`, `serviceIsActive`,
   `GASOL_BYTE_COLOR`/`GASOL_PAFYLLNING_COLOR`/-`ICON`) i stället för att
   varje ställe (kartnål i MapView, filterknappar i App, "Sök där jag
   är"-listan i NearestList) gissade var för sig – annars är risken stor att
   de glider isär över tid (samma "ändra ALLTID båda"-problem som
   `EXCLUDED_OSM_ELEMENTS`/`OSM_FACILITY_OVERRIDES`, fast för fler filer).
   Verifierat med ett tillfälligt Playwright-skript (raderat efter test,
   enligt projektregeln): byt-bara 173 platser, påfyllning-bara 36, båda
   202, ingen gasol-kategori vald → 0 nålar, precis som filterknapparnas
   siffror visar.

   **Buggfixar vid extra granskning (sep 2026, på Pers begäran "kolla igenom
   allt noggrant"):**
   - `toggleGasolFacility` anropade `setActiveFilters` INUTI
     `setGasolFacilities`-uppdateraren – en sidoeffekt i en uppdaterarfunktion
     som React StrictMode (används i `main.tsx`) medvetet dubbelkör i dev för
     att just avslöja såna buggar. Rättat: `next`-mängden beräknas synkront
     från aktuellt state FÖRE de två (nu oberoende, icke-nästlade)
     `setState`-anropen.
   - `ensureCategories()` och `handleLocate()` anropade `ensureGasolFacilities()`
     OKONDITIONERAT, trots att motsvarande `setActiveFilters`-anrop bara
     faktiskt slår på 'gasol' när `activeFilters` var helt TOM sedan innan.
     Om användaren redan hade valt t.ex. "Färskvatten" och sedan tryckte
     "Sök där jag är", tändes gasol-knapparna i UI:t felaktigt (utan att
     'gasol' någonsin lades till i `activeFilters`) – nästa klick på en
     gasol-knapp stängde då AV den i stället för att slå PÅ, eftersom
     `gasolFacilities` redan tyst blivit ifylld i bakgrunden. Rättat genom
     att gate:a `ensureGasolFacilities()` med exakt samma villkor som
     `setActiveFilters`-anropet (synkront: läs `activeFilters` direkt;
     `handleLocate` är async och läser i stället `activeFiltersRef.current`,
     eftersom en `await` kan hinna göra en closure-läst variabel inaktuell).
   - Verifierat med Playwright: valde "Färskvatten" → tryckte "Sök där jag
     är" → bekräftade att gasol-knapparna förblev INAKTIVA (innan fixen hade
     de tänts felaktigt).

   **Tredje granskningsrundan (sep 2026, Per bad om ännu en koll) hittade
   ytterligare en bugg av samma familj:** namnsökning och "Lägg till en
   plats" (`addMyPlace`) anropade också bara `ensureGasolFacilities()`
   ("slå på båda OM inget alls är valt sedan innan"). Det räcker inte när
   en SPECIFIK plats hittas – om man redan valt t.ex. bara "byt tub" och
   sökte fram en renodlad påfyllningsplats gjorde `ensureGasolFacilities()`
   INGENTING (gasolFacilities var redan icke-tom), så kartan flög dit men
   nålen visades aldrig. Ny funktion `ensureGasolFacilityFor(station)`
   lägger i stället till EXAKT den hittade platsens egen facilitet
   (byte/påfyllning/båda) till den redan valda mängden, oavsett vad som var
   valt innan – används av namnträffen i `handleSearch` och `addMyPlace`.
   `ensureGasolFacilities()` (bred "båda om inget valt") används fortfarande
   av `ensureCategories`/`handleLocate`, där ingen specifik plats är målet.
   Verifierat med Playwright: valde "byt tub" → sökte fram en känd renodlad
   påfyllningsplats ("Aniol Gasol AB") → bekräftade att "fyll på"-knappen
   nu tänds (innan fixen förblev den släckt).

   **Bred gasolgranskning + prissvep (24 sep 2026)** – Per bad om en
   djupgranskning av allt gasol (byte/påfyllning), pris för byte, och fler
   platser (Google Maps-sök kring Borås + norbro.se/hitta-gasolautomat).
   Kriterium från Per: **bara byte av 10/11 kg-flaskor räknas** (P11 stål,
   PA11 alu, PC10/PK10 komposit) – platser som bara byter PK5/P6 ska bort.
   Fyra parallella agenter (Norbro-automater, Sjuhärad-svep, kedjor+priser,
   granskning av befintliga). **Sessionens delade WebSearch-kvot (200)
   tog slut mitt i** – allt nedan är gjort, resten ligger i "Kvar".
   - **Nytt fält `gasolPrice`** (Station/types.ts, sync-skriptet, dedupens
     MERGE_FIELDS, egen ruta "Gasolpris" i popupen) – blandas inte med `fee`.
   - **Autogas-macker bortfiltrerade:** OSM-element med bara `fuel:lpg=yes`
     (ingen `shop=gas`, ingen `OSM_FACILITY_OVERRIDES`) får inte längre
     'gasol' – de är fordonsgas vid pump och visades som "byt tub" via
     okänt-fallbacken. I BÅDA filerna (sync + overpass.ts). Tog bort Preem
     Nacka (oklar) + två namnlösa Malmö-macker (en av dem = Gasol Malmö LPG:s
     egen pump, som redan finns som registerpost).
   - **Registerfel rättade:** 5 platser saknades helt i publicerad data
     (Sälen, Bjärred, Falkenberg, Mora, Simmelsberga – felstavade gator /
     Nominatim-missar → exakta koordinater eller rättad adress); Billesholm
     var en hopblandning av butiken (byte, Glasgatan 10) och påfyllnings-
     stationen i Simmelsberga (30 kr/kg, endast må 15–18/to 16–19) → två
     poster; Husbilsprylen Ullared borttagen (fysisk butik nedlagd enligt
     husbilsklubben); Gasolbolaget Växjö-dubblett hopslagen (påfyllning bara
     belagd av myLPG-användare, ej av företaget → bara byte + ring-notis);
     Gasbolaget Falun omskriven (myLPG beskriver personalstyrd fordons-/
     fasttankning, lös flaska EJ belagd); Barkmans Eskilstuna fick även byte
     (automaten byter PK5/PK10/P11); Gasolstationen Väla: flytt jan 2025
     (inte dec), adress Välamarknaden 5; Gasolfyllarna Norrköping fick
     `gasol_byte` i overriden (24/7-automat).
   - **Priser (132 av 242 gasolposter har nu `gasolPrice`)**, kedjepris från
     kedjornas egna sajter sep 2026: Hornbach P11 519/PK10 389 kr; Bauhaus
     P11 519/PC10 389; Circle K PK10 379 (rek.); Rusta PC10 449/PC5 299
     (bara komposit); Linde/AGA-automater "ca PC10 379/PC5 249 – varierar";
     GasolAutomat.se PC10 349/PC5 229; Svetskompaniet P11 365; Höllvikens
     Gasol PC10 349/P11 399; Lööfs P11 395; Gasolfyllarna påfyllning från
     29,90 kr/kg; GasolEsset Trelleborg 37 kr/kg; Gasoli Karlshamn 29 kr/kg;
     Simmelsberga 30 kr/kg; GasolGöteborg byte PC10 340. **Byggmax,
     Granngården, jem & fix, ÖoB, Motonet, Preem, OKQ8 (P11) publicerar
     inget pris** ("varierar per butik") – lämnat tomt hellre än gissat.
   - **Nya platser (+66):** Sjuhärad/Göteborg öst 37 st (Borås, Ulricehamn,
     Tranemo, Kinna/Skene, Bollebygd, Herrljunga, Vårgårda, Alingsås, Lerum,
     Mölnlycke, Landvetter, Partille, Sävedalen – Norbro-/Linde-listor,
     GasolAutomat.se, kedjesajter); 6 Linde-automater som saknades (Mörrum,
     Skärblacka, Västerhaninge, Malmslätt, Gävle Gröna vägen, Växjö
     Norremark – den sista har motstridig sidtitel, verifiera); lokala
     bolags 24/7-automater (Hallarna Halmstad/Norbro, Höllvikens Gasol,
     Lööfs Karlstad, Gasolkompaniet Lomma+Toftanäs, Skånegas Eslöv+
     Landskrona, Skaraborgs Gasol Lidköping+Skövde, GasolAutomat.se Örebro+
     Gekås); Gasolfyllarna Värmdö; 14 Norbro-återförsäljare (Circle K ×6,
     Byggmax ×2, ÖoB ×2, Bauhaus Backa, Elgiganten Eslöv, Melleruds Järn).
     Alla med `query`+`nearLat/nearLon` (maxKm 6–12) – **verifiera
     geokodningen efter deploy** (`git show origin/gh-pages:data/stations-seed.json`).
   - **Kedjor – slutsats för framtida butik-för-butik-inläggning:** Hornbach
     (alla varuhus, fast pris), Bauhaus (alla), Byggmax (~110, sortiment
     säkert men pris varierar), Granngården (~110), jem & fix (~50), Rusta
     (~110, bara komposit), Motonet (~10), ÖoB (~60). **Jula och Biltema
     säljer INGEN 10/11 kg-gasol** (bara patroner) – läggs aldrig in.
     OKQ8/Circle K/Preem: "tillgänglighet varierar per station", ingen
     lista → bara de stationer som står i Linde-/Norbro-listorna.
     Dollarstore: bara PK5/PK10 i utvalda butiker. PA11 (alu) kan enligt
     gasolautomat.se INTE bytas i automat (fastnar) – bara i butik.
   **Omgång 2 samma dag ("gör klart allt, inga genvägar")** – WebSearch-
   kvoten (200 per session, delad med alla agenter, verkar återställas
   ungefär per timme) användes i två vågor om 6 + 3 agenter som skrev
   JSON till scratchpad och importerades med skript. Registret gick från
   176 → **405 gasolposter, 205 med pris**. Gjort:
   - **Kedjor butik-för-butik** (bara källverifierade adresser från
     kedjornas egna butikssidor, aldrig "ur minnet"): Hornbach 8/8,
     Bauhaus 24/24, Motonet 8/8, jem & fix 81/82 (Lindesberg öppnar hösten
     2026, adress saknas). Byggmax/Granngården/Rusta/ÖoB: kedjorna säger
     "de flesta"/"varierar per varuhus" → INTE inlagda kedjevis; bara de
     butiker som står i Norbros lista eller har egen bekräftelse.
   - **GasolAutomat.se-nätverket:** listan är ~37 automater (inte ~80 som
     först antogs), i praktiken komplett – alla med gatuadress inlagda.
     Dubbletter identifierade: City Gross A6 Jönköping = Linde Batterigatan
     2; Expressgasol = portal för regionala Linde-handlare (Levol, Skaraborgs
     Gasol m.fl.), inte egna maskiner.
   - **Lokala bolags automater/påfyllning:** Lööfs Kil, Gasolkompaniet
     Staffanstorp/Trelleborg, Gasol 24/7 Laholm/Karlshamn, Gasolfyllarna
     Nynäshamn/Kungsbacka/Södertälje, Gasol Center Karlstad (**Gasolfyllarna
     Karlstad upphörde 31 mars 2025**), Gasolmacken Nyköping, Gasolproffsen
     Örebro (38 kr/kg), Gasolbutiken Storfors (41 kr/kg), ICA Grytan =
     Moheda, GGM Gas & Gasolmästarna V. Frölunda (automat P11/PA11/PK10),
     Plantagen Borås, Linde-automater Gråbo/Floda/Hällingsjö.
   - **Verifierat:** Gasbolaget Falun byter OCH fyller lös flaska
     (gasbolaget.se) → båda; Skövde-depån fyller INTE lösa flaskor → byte;
     Gasolmacken Uppsala 52 kr/kg stämmer; Hornbach = enbart byte;
     Norremark Växjö korrekt; Verktygsboden har aktiva PK10/P11-sidor 2026.
     Stickprov 8 Linde + 6 Primagaz: inga nedlagda. Koordinatfel rättade:
     Tranemo ICA, Cramo Landvetter (8,5 km fel), Levol = V. Björrödsvägen 1
     (samma automat som Expressgasol Landvetter), Rusta Borås Ålgårdsvägen.
   - **Sjuhärads småorter** (Fristad, Dalsjöfors, Sandared, Viskafors,
     Svenljunga kommun, Sjövik, Hindås, Rävlanda, Kortedala/Angered):
     systematiskt sökta mot Norbro/Linde/gasolautomat.se/eniro – **inget
     hittat** (bara Hällingsjö). Kandidater att ringa: Fristad Byggvaror
     033-444 888, Viskafors Bensin 033-29 11 30.
   - **Kvar (litet):** Skånegas Ängelholm och Levol Onsala saknar
     gatuadress ("Torpstiggen 25" i en källa – troligen felstavat);
     Expressgasol Tidaholm/Ronneby/Tingsryd (JS-karta); Norbros egen
     automatkarta (JS, måste läsas i webbläsare – bara Hallarna Halmstad
     belagd); Byggmax/Granngården/Rusta/ÖoB per-butik-status (kräver
     lagerstatus-koll i webbläsare eller telefon); Lindes icke-automat-
     återförsäljare Koaro Linköping/BG Gas Norrköping (kanske privat – ring);
     Gasolbolaget Växjö påfyllning (0470-480 90); priser för ~10
     påfyllningsplatser (Gasolkungen, Gasoldirekt, Kiruna, Väla, Aniol,
     Svartvik, Timmernabben, Åhus, Nöbbelöv, Ljungby, Kem&Gas, Örkelljunga).
   - **Tips om sökkvoten:** felmeddelandet nämner miljövariabeln
     `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` – kan sättas i miljö-
     konfigurationen för Claude Code på webben om fler sökningar behövs.

   **Borås-komplettering (sep 2026):** Per efterlyste specifikt Verktygsboden
   och Svetskompaniet i Borås. Tillagda: Verktygsboden Borås (byte, PC10/
   komposit – bekräftat via återkommande prisomnämnanden på
   husbilsklubben.se-forumet över flera år) och Svetskompaniet Borås
   (Verkstadsgatan 5 – Air Liquide-återförsäljare, byte i butik SAMT
   fredagar 08–15.30 påfyllning av FAST monterad gasoltank, ej lös flaska –
   ovanlig kombination, taggad med båda facilities men beskrivningen
   förklarar Fredags-/fasttank-begränsningen).

   **Deploy-verifiering efter prissvepet (24 sep 2026):**
   - **Overpass-fallback i `sync-stations.mjs`:** deploy 153 fick 504 från
     ALLA Overpass-speglar → 50 %-spärren behöll den gamla seeden och inga
     nya registerplatser publicerades alls. Nu: om `fetchOsm()` misslyckas
     helt återanvänds förra seedens OSM-stationer (från `OUT`, samma
     gasol-filtrering) med en `console.warn` ("Återanvänder N OSM-stationer
     från förra seeden") så att register + Trafikverket ändå publiceras.
   - Live efter deploy: **5 728 platser, 438 gasol (402 från registret),
     204 med `gasolPrice`.** Jämför alltid register mot seed efter deploy
     (skript: läs `origin/gh-pages:data/stations-seed.json`, matcha på namn,
     lista saknade + poster >6 km från `nearLat/nearLon`).
   - Geokodningsmissar rättade: Gråbo (exakt koordinat 57.8253/12.2462,
     Nominatim klarade inte "Olstorpsvägen 166"), jem & fix Hässleholm
     (hitta.se anger Spångatan 1, inte Stjärneholmsgatan 12 – nu rätt).
     **jem & fix Alvesta (Skördevägen) och Söderhamn (Stenängsvägen) går
     fortfarande INTE att geokoda** – gatorna saknas helt i OSM, även utan
     husnummer. Ligger kvar i registret men publiceras inte förrän någon
     sätter exakt `lat`/`lon` (kolla butikssidan/hitta.se i webbläsare).
     Lärdom: kedjebutiker på industrigator saknar ofta husnummer i OSM –
     använd gatunamn utan nummer eller exakt koordinat, aldrig
     postnummer-dubbletter i `query`.

   **Tömningssvep latrin/gråvatten (24 sep 2026):** Per bad om ett nytt
   omfattande svep. 8 parallella agenter (en per landsdel, 22 WebSearch
   var = 176 av kvoten 200), uppdragstext + JSON-format i sessionens
   scratchpad (`UPPDRAG-tomning.md`, importskript `import-tomning.mjs`).
   Agenterna fick hela publicerade datan (`existing-all.json`) för
   dubblettkoll och prioriterade kommuner med 0–1 tömningsplatser.
   Bästa källor: kommunernas egna VA-/avfallssidor (Askersund, Högsby,
   Uppvidinge, Smedjebacken, Kristinehamn, Enköping, Bollnäs, Finspång,
   Ljusnarsberg, Kungälv…), turistråd (vastsverige.se, visitblekinge.se,
   destinationhalmstad.se), anläggningarnas egna sajter. Resultat: **19 nya
   platser + 21 kompletteringar** av befintliga (OSM-)poster (alla med
   citat i `description`), t.ex. Askersunds reningsverk, Kumla GolfCamp,
   Kopparberg/Ställdalen, Enköpings hamn, Marholmen, Getinge, Töretorp,
   Ystads småbåtshamn, Nya Åhusparken, Aspan Ronneby, Björkåkrabadet Åseda,
   First Camp Älmhult/IKEA, Vadstena ställplats, Skistar Sälen, Säters
   Camping, Hajstorp, Hällekis, Båstad/Råbocka/Tostarpsgården, Camp Gielas,
   Sorsele Camping, Edskens Camping, Dalskärs Camping, Hoks Naturcamping.
   Namnlösa OSM-objekt som kompletterades fick riktiga namn i registret
   (t.ex. "Vadstena ställplats (gästhamnen)", "Saxemara camping/ställplats")
   – appens avstånds-dedupe slår ihop dem med OSM-posten i runtime.
   42 låg-evidens-fynd sparade i `docs/tomning-svep-sep-2026-lag-evidens.md`
   (INTE inlagda). Lärdomar: stallplatskartan.se återanvänder samma
   boilerplate ("modern latrintömningsautomat") på många campingar – aldrig
   belägg; generiska kommunsökningar ger mest slamtömning för fastigheter –
   sök på namngivna anläggningar/ställplatser i stället; Region Gotland och
   Orust tar inte emot husbilslatrin alls. Kommuner som fortfarande har 0
   tömningsplatser efter svepet är mest inlandskommuner utan egen
   webbinformation (t.ex. Eslöv, Sjöbo, Skurup, Staffanstorp, Lekeberg,
   Hallsberg, Kungsör, Fagersta/Norberg) – nästa metod är telefon eller
   crowdsourcing, inte fler webbsökningar.

   **Pers beslut samma dag ("Sveriges bästa i alla kategorier"):**
   1. **Obekräftade platser VISAS grått i stället för att döljas.** Nya
      fält på `Station`: `unverified: true` (hela platsen bygger bara på
      användarsajter) och `unverifiedServices: ['latrin', …]` (påstådda
      tjänster på en bekräftad plats). Delad logik i `src/types.ts`:
      `primaryActiveService()` (bekräftad tjänst vinner; obekräftad bara om
      det är enda skälet att platsen visas → grå nål `UNVERIFIED_COLOR`),
      `stationIsActive()`, `unverifiedServicesOf()`. Används av MapView
      (nål/badges/"Obekräftad"-ruta i popupen), App (antal, tomt-läge) och
      NearestList. `mergeInto()` i App.tsx låter aldrig en obekräftad
      dubblett "smitta" en bekräftad post (tjänsterna blir bara påstådda),
      och tvärtom tar den bekräftade över om registerposten var obekräftad.
      Synkskriptet skickar fälten vidare från `curated-places.json`.
      Tömningssvepets 37 låg-evidens-fynd + Mjölkekilen ligger nu inne så
      (skript `import-unverified.mjs` i sessionens scratchpad).
      Knappen i popupen heter "Stämmer – jag har varit här" på sådana
      platser (annars "Stämmer fortfarande").
   2. **Ingen ringlista** – Per vill inte ringa.
   3. **Sökkvoten:** Per höjer `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`
      till 600 i miljöinställningarna (Claude Code på webben → miljön →
      Edit → miljövariabler). Nedsida: bara kostnad/tid per svep.
   4. **Rätt före fler, men missa inte luckor:** veckorutinens område D
      är nu "kontroll av befintliga platser" (se `docs/svep-logg.md`).
   5. **Bekräftelseraden** visar nu antal: "Bekräftad av 3 användare,
      senast för 5 dagar sedan" (`VerificationInfo` i `src/lib/verify.ts`,
      `fetchVerifications` räknar rader per plats).
   6. **Öppettider/vinterstängt** = nytt område E i veckorutinen.

   **Samma dag, efter Pers "kör punkt 1 och sedan punkt 2":**
   - **Kandidatlistan → grå:** 233 av de ~470 raderna i
     `docs/kandidatplatser-husbilsplats-park4night.md` inlagda som
     `unverified: true` (skript `import-kandidater.mjs` i scratchpad; metod
     och bortfall dokumenterade överst i kandidatfilen). Ortens läge för
     rimlighetskontrollen togs som median av befintliga platser vars namn/
     adress innehåller ortnamnet – 81 rader saknade sådan ort och hoppades.
   - **"Längs min väg" (ny funktion):** knapp under "Sök där jag är" →
     formulär Från/Till + max avstånd från vägen (2/5/10/20 km). Start + mål
     geokodas parallellt (`searchPlace`), bilvägen hämtas från OSRM:s öppna
     demoserver (`src/lib/route.ts`, `router.project-osrm.org`, ingen nyckel,
     15 s timeout) – svarar den inte används fågelvägen och statusraden säger
     det. `stationsAlongRoute()` räknar avstånd punkt→polylinje i ett lokalt
     km-plan (vägen glesas till ≤600 punkter) och sorterar träffarna i
     färdriktningen. När en rutt är aktiv filtreras `shownStations` till
     träffarna (karta, antal, lista), `MapView` ritar vägen (`routeLine`-prop,
     blå polyline, `fitBounds` med panelmarginal) och `RouteList.tsx` (samma
     stil som närmaste-listan) visar "km från start" + "km från vägen".
     "Rensa"/× tar bort allt. Verifierat med Playwright (mockade Nominatim/
     OSRM): Borås→Ulricehamn gav 21 platser inom 5 km, linje ritad, rensning
     tömde kartan. OBS: tomt Från-fält + känd position = start från "Sök där
     jag är"-positionen.
   - **Popupen kapades i nederkant (Pers skärmbild, samma dag):** orsaken var
     att `computePopupPadding()` i `MapView.tsx` använde panelens UNDERKANT
     som toppmarginal även på desktop, där panelen ligger till vänster – så
     popupen trycktes ner under ~530 px och fick inte plats. Nu: ny
     `computeFreeRect()` (fri yta = höger om panelen på desktop, under
     panelen på mobil utfälld, ovanför bottensheeten på mobil), Leaflets
     `autoPan` är AV för platspopuper och `centerPopup()` panorerar kartan
     så att hela kortet hamnar mitt i den fria ytan 120 ms efter
     `popupopen` (panelen hinner minimeras på mobil). Innehållets max-höjd
     är `min(100dvh − 150px, 560px)` med rullning. Verifierat med
     Playwright på 1280×800 (kortet 101–699 px, mitt = 400) och 390×760
     mobil (38–636 px, mitt i den fria ytan ovanför arket).
   - **Gasolpåfyllning av EGEN flaska – Pers Perplexity-lista (samma dag):**
     Per lät Perplexity sammanställa 60 platser med lösviktspåfyllning från
     Energigas Sveriges förteckning + Kosans flaskfyllarlista + operatörernas
     sidor (`docs/import/gasolfyllning_sverige.json`, uppladdad via GitHub).
     Ungefär hälften fanns redan, men jag hade missat hela Svenska Gas-kedjan
     (Skepplanda/Stenungsund/Fjärås/Uddevalla), NB Energi, Sweonor, Unax,
     PLM Motala, Ekonex, Ystad Gasol m.fl. – orsak: jag sökte företag för
     företag och nådde aldrig branschlistorna innan kvoten tog slut.
     Importskript `import-gasolfyllning.mjs` (scratchpad) matchar på namn+ort
     först (registerposter saknar ofta koordinat), sedan avstånd med
     namnlikhet, och lägger poster ovanpå OSM-noder som redan har
     påfyllnings-override så de slås ihop i appen. Resultat: 32 nya, 25
     kompletterade (exakta koordinater ersatte geokodning, telefon,
     öppettider, pris), 3 KONFLIKTER lämnade som de var: Skaraborgs Gasol
     Skövde och Gasolbolaget Växjö (företagens egna sidor säger inte lös
     flaska – listan säger det; notering i description, ring och avgör),
     Husbilsprylen Ullared (nedlagd). **Nytt fält `confidence`
     ('high'/'medium'/'low')** på Station → färgkodad rad i popupen ("Hög
     säkerhet – operatörens egen sida" / "Medelhög – branschlista, ring
     innan" / "Låg – forum/guide"); 'low' ger dessutom grå obekräftad-nål.
     Perplexity-listans misstänkta rader: OK/Q8 Oktanvägen Piteå (kallas
     Luleå i texten men koordinat/telefon är Piteå) – inlagd som medium.
     En separat research-session (600 sökningar, ~452 använda, 8 agenter)
     körde parallellt mot samma källor; resultatet (109 platser granskade)
     ligger i `docs/import/gasolfyllning-research.json/.md` (hämtade från
     grenen `claude/gasolfyllning-research`) och slogs ihop med skriptet
     `import-research.mjs` (scratchpad): **11 nya** (Gasolgubben Falkenberg,
     Gasip Karlskoga, GASIP Kristinehamn, Eslöv Gasol = Ystad Gasols andra
     station, Gasol Malmö LPG Limhamn, GasolEsset Ljungby/Örkelljunga som
     registerposter ovanpå OSM-noderna, Hudiksvalls Plåt & Gasol, Gasolmacken
     Varberg, TBM Motala, NB Energi Sala – de fyra sista medium), **20
     uppgraderade till hög** med citat från egen sajt, **7 nedgraderade** där
     research motsade Perplexity-listan (Allgas, Unax, Frendo Brålanda,
     Lööfs Karlstad → bara byte; Kylinge, Qstar, Husbilslandet → grå/låg),
     **2 borttagna** (OK/Q8 Piteå = autogaspump; Harry Perssons = ingen
     källa nämner gasol). Kvar ogjort: West Coast Gasol Vänersborg/Vargön
     (gatuadress saknas), Svenska Gas Orust/Henån (osäker adress), luckor
     Gotland/Öland/Umeå/Skellefteå/Östersund/Ö-vik (forum säger "bara
     byte"), kr/kg-priser för ~15 platser (kräver webbläsare/telefon).
     Lärdom: **branschlistorna (Energigas Sverige "tankstationer", Kosans
     partnerlista) blandar lösviktsfyllning, fast-tank-tankning och rena
     byte-ställen** – "tankstation" i listan betyder inte lös flaska; kräv
     alltid operatörens egen formulering för 'high'.
   - **Riktiga namn på namnlösa platser (25 sep 2026, Pers fältrapport):**
     tömningen vid Skeda Strand (Värnamo) visades som "Tömningsstation" –
     OSM-noden saknar `name`, och i appens dedupe vann den namnlösa noden
     över "Ställplats Skeda Strand" 70 m bort bara för att den låg först.
     Publicerad data hade 2 599 generiska namn (Sopstation 1 007, ÅVC 494,
     Camping 403, Ställplats för husbil 290, Tömningsstation 241,
     Vattenpåfyllning 160). Tre lager, alla speglar samma lista
     (`GENERIC_NAME_RE` i `src/lib/naming.ts` = `GENERIC_NAME` i
     `sync-stations.mjs`, ändra ALLTID båda):
     1. `mergeInto()` i App.tsx: ett riktigt namn slår alltid ett generiskt
        vid hopslagning (det generiska sparas som description).
     2. `nameGenericByNearby()` (`src/lib/naming.ts`) körs på den
        sammanslagna listan i App OCH i synken (`nameGenericStations`):
        "Tömningsstation vid Ställplats Skeda Strand" om en namngiven plats
        finns inom 250 m (617 platser vid simulering mot seeden).
     3. Synken slår upp ortsnamn via Nominatim reverse (zoom 16, hamlet/
        village/suburb/town/city) för resten med tömning/vatten/ställplats/
        camping → "Tömningsstation, Skeda" (bara kommunen känd: "Camping i
        Linköpings kommun" – första körningen skrev genitivfelet "Camping,
        Linköpings" för 34 platser, de slås upp om). Max 250 per körning (~5 min);
        redan uppslagna namn återanvänds från senast publicerade seed
        (`PREV_SEED_URL`, gh-pages raw) via fältet `nameFrom: 'reverse'`,
        så ~685 platser är klara efter ~3 deployer. Utfall deploy 1 (25 sep):
        616 via närliggande, 250 via ortsuppslag, 440 kvar med kärntjänst. Live-hämtade OSM-objekt
        får seedens namn per id i App innan dedupen. Sopstationer/ÅVC får
        bara steg 1–2 (ingen reverse) för att hålla körtiden nere.
   - **Kvar efter svepet:** Skånegas Ängelholm + Levol Onsala (gatuadress
     saknas), Expressgasol Tidaholm/Ronneby/Tingsryd och Norbros egen
     automatkarta (JS-kartor, läs i webbläsare), Byggmax/Granngården/Rusta/
     ÖoB per-butik-status, priser för ~10 påfyllningsplatser (se listan i
     "Omgång 2" ovan).

## Källjämförelser på Pers begäran (25 sep 2026)

Per skickade fyra sidor och frågade "har du dessa?". Tre fristående
research-sessioner (600-kvoten, ~120/252/197 sökningar, ~20–35 USD var)
jämförde mot publicerad seed och lade underlag i `docs/import/`
(`firstcamp-tomning.*`, `tomningsplatser-webb.*` för rastplatserna.se +
husbilsplats.se, `campingkollen.*`). Import med `import-webb.mjs`
(scratchpad): high/medium → bekräftad tjänst (medium får `confidence:
'medium'`), low/null → obekräftat (grå plats eller `unverifiedServices`),
"OSÄKER"-matchningar och motsägelser hoppas över. Utfall: 22 nya
bekräftade platser, 62 nya obekräftade, 39 bekräftade kompletteringar
(bl.a. First Camp Vadstena/Västerås/Nora/Strömstad/Haganäset/Boden/
Löttorp/Hökensås, Vadstena GK, BK Najaden), 32 obekräftade
kompletteringar, 40 First Camp-poster fick avgiftsnotis ("gratis för
gäster, 60 kr/dag för genomresande") + var på området tömningen finns.
Slutsatser: First Camp 41/51 destinationer hade redan tömning på kartan,
7 av listans namn har lämnat kedjan (Skånes Djurpark, Mellbystrand, Skrea,
Böda Sand, Tofta, Gustavsvik, Malnbaden – OSM-namnen kan vara gamla);
rastplatserna.se listar enbart Trafikverkets rastplatser = samma
population som TRV-synken (2 rastplatser, Råda och Tönnebro, påstås ha
latrin men TRV-API:t ger bara sopor – kontrollera); husbilsplats.se:s
tömningslista ligger delvis bakom betalvägg och campingkollen.se är
JS-driven – bara ~125 av uppskattningsvis 1 500–2 000 platser gick att
läsa via sökindex. **Fullständig avstämning kräver att sidorna läses i en
webbläsare** (egress-blockade härifrån).

## SEO & spridning (25 sep 2026)

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
  repots egen seed-fil committas inte av CI och var inaktuell. Lokalt test:
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

## Dokumentation

`docs/ADMIN.md` (Pers guide), `docs/SUPABASE.md`, `docs/DATAKALLOR.md`,
`docs/BUILD-MOBILE.md`, `docs/kandidatplatser-husbilsplats-park4night.md`
(overifierad kandidatlista från discovery-svepet, aug 2026).
