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
| `src/lib/weather.ts` | Väderprognos (6 dagar) per plats via SMHIs öppna prognos-API, ingen nyckel/backend. Hämtas när popupen öppnas (samma mönster som öppet-nu/ortsnamn i MapView), cache 30 min. Länk till Windy för visuell vind/nederbörd finns i popupen bredvid. **OBS:** SMHI bytte API 2026-03-31 (pmp3g → snow1g, platt `data`-objekt i stället för `parameters`-array) – parsern hanterar båda formaten defensivt, men kan inte testas live härifrån (domänen är egress-blockad i sandboxen) – verifiera i webbläsaren efter deploy om vädret slutar visas igen |
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

   **Borås-komplettering (sep 2026):** Per efterlyste specifikt Verktygsboden
   och Svetskompaniet i Borås. Tillagda: Verktygsboden Borås (byte, PC10/
   komposit – bekräftat via återkommande prisomnämnanden på
   husbilsklubben.se-forumet över flera år) och Svetskompaniet Borås
   (Verkstadsgatan 5 – Air Liquide-återförsäljare, byte i butik SAMT
   fredagar 08–15.30 påfyllning av FAST monterad gasoltank, ej lös flaska –
   ovanlig kombination, taggad med båda facilities men beskrivningen
   förklarar Fredags-/fasttank-begränsningen).

## Dokumentation

`docs/ADMIN.md` (Pers guide), `docs/SUPABASE.md`, `docs/DATAKALLOR.md`,
`docs/BUILD-MOBILE.md`, `docs/kandidatplatser-husbilsplats-park4night.md`
(overifierad kandidatlista från discovery-svepet, aug 2026).
