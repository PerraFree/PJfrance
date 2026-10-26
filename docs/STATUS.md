# Läget just nu

Skrivs ÖVER vid varje överlämning (lägg inte äldre lägesbilder på hög – historik
finns i git-loggen, `docs/svep-logg.md` och `docs/HISTORIK.md`).

**Uppdaterad:** 2026-10-26, svep mot Pers källtips (Husbilskompisar, husbil.se, turistråd).

Senaste svep (26 okt, Pers tips + runda 3): Husbilskompisars hela karta
(5 211) och husbil.se (~1 060) jämförda med kartan; ~1 100 platsers egna sidor
lästa via runnern och granskade (ordagranna citat). Totalt idag: ~460
nya/kompletterade platser (runda 1–2: 233, runda 3: 232 – främst färskvatten
och kompletteringar av befintliga platser). Seeden: 6 823 platser. Kvar:
Göta kanals ställplatser utan tjänstetext (bokningssidorna), Gasolfyllarnas
återförsäljare (grå, flaskstorlek ej angiven), platser vars egen sida inte
nämner tjänsten (förblir grå/utelämnade). Se `docs/svep-logg.md`.

Förra svepet (26 okt, A): 66 glesa kommuner, 0 nya + 1 komplettering (Ställplats Kinnekulle +gråvatten/latrin); metoden uttömd. Rotation: äldst nu är C/D/E (12 okt).

Senaste händelse (21 okt): veckogranskning – 16 platser fick grå tjänster som
område C-skriptet felaktigt gjort gröna (ny uppgraderingsvakt i
check-register), dubbla härledda namn borta (vakt i check-seed), platsrutan vid
vridning, offline-skydd i service workern, automergen skärpt. Se
`docs/granskningslogg.md`; kvar i #42 (databas/deploy) och #43 (källor). sw.js v120.

Förra svepet (19 okt, B gasol): 8 nya gasolposter i tidigare tomma kommuner;
lägen kontrollerade i seeden. Rotation: äldst nu är A (5 okt).

Förra granskningen (14 okt): förlustvakten skärpt, namnkedjor, larm som kunde
kapas, fotoregler i databasen (ärende #38).

Därförinnan (13 okt): prio 1–2 körda – D varv 2 Västra Götaland (#25),
område C grå platser utan sajt (33 bekräftade, #26), område E skiva 3 (50 OSM-
platser fick säsong, #27), 15 gasolposters popuptext rättad mot byte/påfyllning
(#29). Läns-sidor i SEO. sw.js v115.

Tidigare (12 okt): elva granskningsrundor (runda 11 hittade inga riktiga fel) (se `docs/granskningslogg.md`),
försvunna registerplatser återställda (Borås GK, Engesberg, Sandviken Strand,
Vilhelmina) med förlustvakt + `scripts/per-fakta.json`, och SEO: ~1 750
platssidor, kommun-, läns- och tjänstesidor, vanliga frågor och sitemap
(`docs/SEO.md`). Schemat är installerat och testat mot den levande databasen.
Rutinen "Veckogranskning" (onsdagar) upprepar granskningen varje vecka.

## Status

- **Live:** ~6 640 platser (OSM ~4 620, Trafikverket 318, registret 1 701 poster
  varav ~330 grå/obekräftade). Alla deployer gröna, inget ligger ocommittat.
- **Säkerhet:** Johans säkerhetsrådgivning GHSA-72p3-7774-p8h3 (4 fynd) är
  åtgärdad och verifierad mot den levande databasen 11 okt. Per har svarat Johan.
  `SUPABASE_SERVICE_KEY` finns som secret; kontotoken används bara av installationen.
- **Beroenden:** Dependabots första omgång (#16–#20) mergad; actions SHA-låsta.
- **Datasvep:** golfsvep, discovery varv 1 + 2 och restlistor är klara
  riksomfattande. Område D (kontroll av befintliga platser) körd 11 okt för
  Västra Götaland (40 platser), 12 okt för Skåne (36) och 12 okt för Stockholm/
  Uppsala/Södermanland (39: Åkersberga GK −tömning, Båsenberga-dubbletten isär,
  Saltsjö-Duvnäs båtstation utesluten) och Halland + Kalmar län (46: Stenhamra
  Västervik var en vanlig parkering, fyra f.d. First Camp-poster rättade, Bua
  hamn +gråvatten), Jönköping/Kronoberg (38: Askelövsgatan Växjö och
  Norraryd grå, Kyrkekvarn/Hok +tömning) och Östergötland/Örebro/Västmanland
  (49: Vadstena GK −tömning, Hällefors grå, Uskavi/Inre hamnen +tjänster),
  Värmland/Dalarna/Gävleborg (73: Flå −latrin, Orsa Grönklitt −gråvatten,
  Stocka/Mörudden +tömning) och Norrland/Gotland/Blekinge (81: Härnösands
  båtstation utesluten, Forshaga/Saxemara/Ljusnedal borttagna, Bräcke Strand
  +tömning). **D klart för hela landet: 402 platser, 163 ändrade.** D varv 2
  körd för Västra Götaland 13 okt (79 platser, 28 ändrade) – nästa: Skåne.
  Område C (grå utan sajt) och E skiva 3 körda 13 okt.
  Webben är i stort sett uttömd för nya platser – nästa metod är crowdsourcing.
- **UI senast:** CSP, svenska fel + tidsgräns i alla formulär, tack först efter
  lyckat svar, jämnt markörurval (tak 3 000), räknare per filter, mindre
  hopfällt ark på mobil, ortsökning före stationsträff, delade länkar öppnar platsen, tillbakaknapp. sw.js v105.
- **Källkontroll (12 okt):** `verifiera-kallor.yml` kör tisdagar och lägger döda
  länkar + försvunna citat i ett ärende som ärenderutinen/område D tar vidare.
- **Kvalitetsvakter i deployen (12 okt):** `check-mirrors.mjs`, `check-register.mjs`
  (0 fel krävs; ~85 varningar om gamla query-poster utan nearLat/nearLon är
  kända) och `npm audit --audit-level=high` på produktionsberoenden.
- **Registerhygien:** 23 dubblettpar (samma plats inom 60 m, grå kopia eller
  gammal query-post ovanpå exakt post) sammanslagna 12 okt; kvar att se över:
  Stjärnfors GK/Kaffestuga, Luleå Norra hamnen/Husvagnscenter (samma geokod),
  Varbergs GK Östra/Västra (samma geokod).
- **Synk:** när Overpass är nere återanvänds förra seedens OSM-stationer, numera
  filtrerade mot `EXCLUDED_OSM_ELEMENTS` (fix 12 okt). Ny speglad lista
  `OSM_UNVERIFIED_OVERRIDES` (32 platser) gör OSM-tjänster grå där egen sajt/
  kommun är tyst; `check-mirrors.mjs` i deployen vaktar alla fyra listorna.

## Öppna punkter (GitHub-issues med etiketten `backlog`)

Se https://github.com/PerraFree/PJfrance/issues?q=is%3Aopen+label%3Abacklog
– prioritet via `prio-1`/`prio-2`/`prio-3`:

1. #24 Crowdsourcing-lansering (prio-1). #25 Område D nästa regioner: Skåne,
   Stockholms län (prio-1).
2. #26 Område C: grå platser. #27 Område E: öppettider/säsong. #28 Restlista
   som kräver webbläsare (prio-2).
3. #42 Databas: påhittade plats-id, oanvända fotofiler, deploy utan skrivrätt
   i byggsteget (prio-2). #43 Gasolcitat + kvarvarande datatvivel (prio-2).
4. #29 Gasolluckor. #30 Tekniska tillval/underhåll. #31 SEO/spridning (prio-3).

## Väntar på Per

- Lanseringstexterna för crowdsourcing (#24) ligger i `docs/LANSERING.md`:
  forum, Facebook, redaktionstips, brev till anläggningar, QR-dekal. Per lägger
  ut; bevakningen mejlar var 3:e timme.
- Dependabot: npm-patch/minor mergas automatiskt (`dependabot-automerge.yml`,
  aldrig körd skarpt – kontrolleras 26 okt). Actions-PR:er får en kommentar och
  mergas av en session (MCP `merge_pull_request`) när kontrollen är grön.
- Rutinen "Veckosvep Tömnmingskartan" (skapad i webbgränssnittet) hänvisar till
  CLAUDE.md för metoderna, som nu ligger i `docs/svep-logg.md`/`docs/HISTORIK.md`
  – ny prompt levererad i chatten 11 okt att klistra in i claude.ai → Rutiner.
  "Veckorapport" och tokenpåminnelsen är återskapade kopplade till sessionen
  "Gråvatten 5"; de gamla kopiorna (pekade på arkiverade "Gråvatten 4") är
  pausade och kan raderas.
- Ny rutin 12 okt: "Bevaka GitHub-issues Tömningskartan" (trig_01JGzLszwk5ktSPNELVCg9ng,
  var 3:e timme kl :10 UTC in i Gråvatten 5): läser nya/ändrade ärenden,
  verifierar platsförslag mot primärkälla, kommenterar `godkänn`/`neka`,
  åtgärdar buggar, kommenterar alltid. Första körning 12 okt 09:10 UTC –
  kontrollera att den får GitHub-verktygen.
- Supabase-token byts före ~6 dec 2026 (rutinen påminner 27 nov).
- Ny rutin 11 okt: "Månatlig säkerhetsgenomgång Tömningskartan" (1:a i månaden
  07:27 svensk tid, rapport via push/mejl, pushar inget) – första körning 1 nov.

## Nästa steg (förslag)

1. Område D varv 2 Skåne (`UPPDRAG-kontroll.md` + `apply-kontroll.mjs`) med
   bifynden från E skiva 3 (Stocka Gästhamn, Grönfjäll, Stenshult, Färila IF,
   Norråker; fel OSM-webbadress Torne Camping/Skotteksgården/Storforsen).
2. Område C: ~64 grå poster utan sajt kvar + kandidatlistans rester.
3. Fråga till Per (när han hör av sig): gäller Gotland/Orust-regeln även
   campingarnas egna latrinstationer? Vänersborgs gästhamn – ring marinan.

Per vill inte bli tillfrågad – sessionen väljer själv enligt prio-etiketterna och kör.
