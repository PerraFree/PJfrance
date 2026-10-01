# Svep-logg – veckorutinen "Tömningskartan – veckosvep datakällor"

En schemalagd rutin (måndagar 05:00 UTC, fristående session) läser den här filen och kör
det fokusområde som har **äldst "senast kört"-datum**. Metoden per område står i `CLAUDE.md`.
Efter varje körning: uppdatera datumet i tabellen och lägg en rad i loggen längst ner.

## Rotation

| Fokusområde | Vad | Senast kört |
|---|---|---|
| A. Tömning latrin/gråvatten | Kommuner med 0–1 tömningsplatser: kommunsidor, turistråd, anläggningars egna sajter. Kompletteringar av befintliga camping-/ställplatsposter räknas. | 2026-09-24 |
| B. Gasol byte/påfyllning + priser | Kedjornas butikssidor (Byggmax/Granngården/Rusta/ÖoB per butik), Norbro-/Linde-/gasolautomat.se-listor, lokala påfyllningsbolag, priser. Bara 10/11 kg-flaskor (P11/PA11/PC10/PK10). | 2026-09-28 |
| C. Obekräftade platser: verifiera + fyll på | (1) Sök primärkälla för de OBEKRÄFTADE posterna i registret (`unverified: true` / `unverifiedServices`) – får de citat: ta bort obekräftat-flaggan. (2) Gör om lovande rader i `docs/kandidatplatser-husbilsplats-park4night.md` (tydlig tjänst + ort) till obekräftade registerposter så de syns grått på kartan. | 2026-09-25 |
| D. Kontroll av befintliga platser | Per prioriterar RÄTT före FLER: välj ~40 befintliga platser med tömning/vatten i en region (gärna campingar/ställplatser med `website`), kontrollera mot källan att tjänsterna fortfarande finns, rätta fel (ta bort tjänst, uppdatera avgift/öppettider). Golfklubbar + vattenkiosker som upptäckt-del. | 2026-09-25 |
| E. Öppettider + vinterstängt | Platser med tömning/vatten som saknar `openingHours`/`season`: hämta säsong ("1 maj–30 sep", "vinterstängt", "året runt") från kommun-/anläggningssida. Skriv `season: 'seasonal'`/`'year-round'` + `openingHours`. Prioritera kommunala tömningsstationer och Trafikverkets rastplatser med vattenavstängning. | 2026-09-28 |

## Regler som alltid gäller

- Bara primärkällor med citat (kommun, anläggningens egen sajt, Trafikverket, kedjans butikssida).
  husbilsplats.se, park4night, stallplatskartan-boilerplate, Google-omdömen räcker inte.
- Dedupa mot publicerad seed (namn eller inom ~400 m) innan något skrivs till registret.
- Gissa aldrig koordinater. Exakt `lat`/`lon` från källa, annars `query` + `nearLat`/`nearLon` + lågt `maxKm`.
- Verifiera efter deploy att alla nya poster finns i seeden och ligger rimligt.
- Låg-evidens-fynd (bara husbilsplats.se/park4night/aggregatorer) läggs in som OBEKRÄFTADE
  poster (`unverified: true` för hel plats, `unverifiedServices: [...]` för påstådda tjänster på
  en befintlig plats) – de visas grått med "Obekräftad" i appen. Beslut av Per sep 2026.

## Logg

- **2026-09-28, buggfix i synkskriptet (upptäckt vid deploy-verifiering av B
  nedan):** Deployen efter B:s commit publicerade INTE de nya ändringarna –
  seeden på gh-pages var oförändrad. Orsak (se Actions-loggen för run 188):
  alla tre Overpass-speglar gav antingen 504 eller ett tomt svar (0
  stationer). `fetchOsm()`:s "prova nästa spegel, ta till sist det största
  svaret"-logik räknade det TOMMA svaret (0 stationer) som ett giltigt
  "best"-resultat i stället för att ignorera det – en tom array är `truthy`
  i JS, så loopen avbröts efter första varvet och `fetchOsm()` returnerade
  tyst 0 stationer i stället för att kasta ett fel. Det gjorde att
  "återanvänd förra seedens OSM-data"-säkringen (tillagd 24 sep, i
  `catch`-blocket runt `fetchOsm()`-anropet) aldrig utlöstes, eftersom inget
  fel kastades. Resultatet (0 OSM + 319 TRV + 1268 register = 1587) var
  under hälften av förra körningens 6202, så den ANDRA säkringen (50 %-
  spärren) triggade korrekt och avbröt skrivningen – appen visade alltså
  fortfarande gårdagens data, men mina nya gasolplatser/priser kom aldrig
  ut. Rättat i `scripts/sync-stations.mjs`: ett 0-stationssvar räknas inte
  längre som "best", och om inget mirror ger någon data alls kastas ett fel
  så att reuse-säkringen faktiskt aktiveras.
  **Verifierat efter deploy (run 189, 09:02 UTC):** fixen fungerade – OSM
  återanvändes korrekt (4 619 stationer, samma som innan Overpass-avbrottet)
  i stället för att falla till 0, och alla B-ändringar kom med: 4/4 nya
  gasolplatser geokodade rimligt nära sina ortankare (Ängelholm, Onsala,
  Linköping, Norrköping – alla inom någon km) och alla 4 prisuppdateringar
  syns i seeden (243 av 449 curated gasolplatser har nu `gasolPrice`).
- **2026-09-28, B (gasol priser + kvarvarande luckor):** A och B stod båda som
  "senast kört 2026-09-24" i tabellen (samma dag), men B:s sista commit den
  dagen (09:17) låg strax före A:s första (09:38) – valde därför B som den
  strikt äldsta av de två.
  **Metod:** 8 parallella agenter (general-purpose, 60 sökningar var i budget,
  ~223 av 600 använda totalt, inget kvotfel) mot de 77 lokala oberoende
  gasolåterförsäljarna i registret som saknade `gasolPrice` (kedjor som
  Byggmax/Granngården/Rusta/ÖoB/jem & fix/Motonet/Elgiganten uteslöts
  medvetet – redan känt att de inte publicerar butiksspecifikt pris, se
  CLAUDE.md). Sista gruppen fick även fyra kända luckor: Skånegas
  Ängelholm, Levol Onsala, Koaro Linköping, BG Gas Norrköping.
  **Resultat:** endast **4 av 77 fick ett citerbart pris** från egen sajt
  (Himlastallet i Slagtofta, Lindströms Svets & Verktyg, Skånegas Karlshamn,
  Ljungby Gasol → GasolEsset Ljungby 39 kr/kg) – mönstret håller: småskaliga
  lokala återförsäljare (bensinstationer, järnhandlar, svetsbutiker)
  publicerar nästan aldrig pris online, kräver telefon/butiksbesök. Alla 77
  bekräftades fortfarande aktiva (ingen nedläggning hittad, inget togs bort).
  **4 nya platser** hittade och tillagda (alla `gasol_byte`, `confidence`
  hög/medel, källa = operatörens/Lindes egen sajt): Skånegas gasolautomat
  Ängelholm (Verkstadsgatan 4), Levol gasolautomat Onsala (adress saknas –
  `query: 'Onsala'` med `nearLat/nearLon` på tätorten, maxKm 10), Koaro AB
  Linköping och BG:s Gas & VVS Service AB Norrköping (båda Linde-
  återförsäljare, ingen påfyllning belagd → byte). Ingen av de fyra kunde
  geokodas till exakt lat/lon inom sökbudgeten – **verifiera geokodningen
  extra noga efter deploy**, särskilt Onsala (bara ortsanker, inget
  gatunamn).
  **Kvar:** Byggmax/Granngården/Rusta/ÖoB per-butik-status (kräver
  lagerstatus i butik, inte webbsök), Expressgasol Tidaholm/Ronneby/
  Tingsryd + Norbros egen automatkarta (JS-kartor, kräver webbläsare),
  Levol Onsala gatuadress, priser för resten av de ~73 lokala
  återförsäljarna som gav null (kräver telefon – Per vill inte ringa, så
  detta är en permanent lucka om inte metoden ändras).
- **2026-09-28, E (öppettider/säsong), rättelse av C/D:** Upptäckte att raden
  "2026-09-25, C+D (källjämförelser)" nedan aldrig uppdaterade rotationstabellens
  datum för C och D – de stod kvar som "aldrig"/"2026-09-07" trots att området
  redan kört. Rättat till 2026-09-25 för båda (annars körs samma område om i
  onödan, se regeln överst i filen). Med det var E (öppettider) den enda
  raden som ALDRIG körts, så den kördes denna gång.
  **Metod:** hämtade publicerad seed, filtrerade fram alla platser med
  gravatten/latrin/vatten som saknar BÅDE `openingHours` och `season` (1 530 st:
  781 OSM, 550 eget register, 210 Trafikverket, 7 kommunala med `source: 'kommun'`).
  Trafikverkets rastplatser har for närvarande INGEN med `vatten`-tjänst (bara
  latrin/sopor) – "vattenavstängning"-prioriteringen i tabellen gav alltså inga
  träffar i denna omgång. Av resten valdes de ~658 som redan har ett `website`-
  fält (sökbara mot en känd domän) ut, ett stickprov på 160 (alla 7 kommunala +
  153 geografiskt utspridda över landet, syd→nord) delades i 8 regionsgrupper
  à 20 och kördes som 8 parallella agenter (22 WebSearch var, 176 av kvoten,
  ingen kvotträff). Regel: bara citat från kommun-/anläggningens EGEN sida
  (eller en bokningsplattform anläggningen själv använder) räknas – husbil.se,
  husbilsplats.se, stallplatserna.se, hollistay.com, park4night uteslöts även
  när `website`-fältet pekade dit (agenterna sökte då fram den riktiga
  kommun-/anläggningssidan i stället, annars `found:false`).
  **Resultat: 76 av 160 fick belagd säsong/öppettid** (43 i det egna registret,
  inkl. 3 av de 7 kommunala – uppdaterade direkt i `curated-places.json`; 33
  OSM-platser – ny `OSM_SEASON_OVERRIDES`-mekanism i BÅDA `sync-stations.mjs`
  och `src/lib/overpass.ts`, samma mönster som `OSM_FACILITY_OVERRIDES`, fyller
  bara i det OSM saknar). 84 gav ingen tillräckligt säker primärkälla inom
  sökbudgeten (aggregator-only, motstridiga datum, eller inga träffar alls) –
  namnen är kvar i `result-0..7.json` i den körningens scratchpad (inte
  committat) om någon vill återuppta dem senare.
  **Kvar:** 4 av de 7 kommunala tömningsplatserna saknar fortfarande belagd
  säsong (Alvesta tömningsplats, Vetlanda – Östanå Camping, Åtvidaberg
  serviceställe för husbilar, Härnösand latrintömning – kommunsidorna beskriver
  tjänsten men inte öppettider/säsong specifikt); ~500 registerplatser och
  ~750 OSM-platser med tömning/vatten är fortfarande overifierade på detta
  fält (näst gång: samma metod, nästa geografiska/alfabetiska skiva av de
  ~500 platserna utan `website` eller som inte kom med i detta stickprov);
  Trafikverkets 210 rastplatser med latrin/sopor har ingen känd metod för
  säsong ännu (TRV-API:t saknar fältet, och rastplatserna har oftast ingen
  egen sida att citera – kräver antingen TRV:s allmänna villkor för rastplatser
  eller manuell koll).
- **2026-09-24, A (tömning):** 8 agenter × 22 sökningar. 19 nya + 21 kompletteringar. 42 låg-evidens
  sparade i `docs/tomning-svep-sep-2026-lag-evidens.md`. Kvar: inlandskommuner utan webbinformation
  (Eslöv, Sjöbo, Skurup, Staffanstorp, Lekeberg, Hallsberg, Kungsör, Fagersta/Norberg), Omberg-området,
  Öland/Gotlands mindre orter.
- **2026-09-24, B (gasol):** se CLAUDE.md "Bred gasolgranskning + prissvep". Registret 176 → 405
  gasolposter, 205 med pris. Kvar: Byggmax/Granngården/Rusta/ÖoB per butik, Skånegas Ängelholm,
  Levol Onsala, jem & fix Alvesta/Söderhamn (ogeokodbara gator), priser för ~10 påfyllningsplatser.
- **2026-09-25, C+D (källjämförelser):** First Camp, rastplatserna.se, husbilsplats.se,
  campingkollen.se jämförda mot kartan (3 research-sessioner). 22 nya bekräftade, 62
  nya obekräftade, 39 bekräftade + 32 obekräftade kompletteringar. Underlag i
  `docs/import/`. Kvar: husbilsplats.se-lista bakom betalvägg, campingkollen bara
  stickprov, Råda/Tönnebro rastplats (latrin påstådd, TRV säger nej).
- **2026-09-25, efterkontroll deploy v64:** 16 av de nya platserna kasserades av synken
  (Nominatim-miss eller fel orts-ankare). 11 fick exakta koordinater från källor, 2 dubbletter
  borttagna, 3 fick rättat ankare (Harsa, Hovra, Tågstallarna – kontrollera i v65). 27 äldre
  registerposter (mest obekräftade från kandidatimporten) publiceras fortfarande inte – se
  CLAUDE.md "Läget just nu".
- **2026-09-25, koordinatsvep (session "Gråvatten 4", parallellt med raden ovan):** alla 16 +
  de 31 äldre gick igenom sex agenter. 43 poster har nu exakt lat/lon, 15 dubbletter borttagna,
  3 uppgraderade till bekräftade (Harnäsgården Ludvika, First Camp Ställplats Stockholm,
  Mariebergsviken Karlstad), First Camp Nora kompletterad. Kvar: jem & fix Alvesta.
- **2026-09-29, restposter + golfklubbssvep del 2 (session "Gråvatten 4"):** Råda/Tönnebro
  latrin EJ belagd (registerposter raderade), Häradsbäck gasol flyttad, Svenska Gas Orust ny.
  Golf: 8 agenter, 165 klubbar mot klubbarnas egna sidor → 124 nya, 5 uppgraderade, 23 grå →
  bekräftad ställplats, 2 raderade. Se CLAUDE.md "Golfklubbssvep, del 2". ~100 poster
  geokodas i synken – verifiera efter deploy. Räknas som upptäckt-delen av område D.
- **2026-09-29, discovery-svep Kronoberg/Örebro/Värmland (session "Gråvatten 4", område D upptäckt):**
  6 agenter × 45 sökningar (två per län, kommun för kommun mot kommun-/turistrådssidor,
  husbilsplats/park4night bara som ledtråd). 101 fynd (54 high, 32 medium, 15 low) →
  69 nya registerposter, 10 uppgraderade (Askersunds GK latrin+vatten, Husabergsudde
  gravatten+vatten, Lindesbergs GK gravatten+latrin, Laxå-tömningen grå → bekräftad via
  tiveden.se, Kvarntorpshögen m.fl.), 6 kompletterade med påstådda tjänster, 15 hoppade
  (fanns redan). Rådata `docs/import/discovery-kronoberg-orebro-varmland-sep-2026.json`,
  skript `scripts/import-tools/import-discovery.mjs`. ~45 poster geokodas i synken via
  adress + kommunmedian – verifiera efter deploy. Kvar: Markaryd/Älmhult/Kristinehamn gav
  inget nytt; Storfors saknar belagd tömning; Lekeberg har bara Sannabadet + Lanna Bokcafé;
  Vinön-posten motsägs (ingen service enligt gäst); Hallsbergs två namnlösa fricampingar.
- **2026-09-30, efterkontroll discovery-svepet:** 75 av 85 poster i seeden; 8 fick exakta
  koordinater, 3 bättre query (Loka Brunn, Laxtjärn – låg 14 km fel, Flakudden). Verifiera
  nästa deploy.
  **Utfall 30 sep 09:02:** 84 av 85 i seeden; Loka Brunn fick kurortens koordinat manuellt.
- **2026-09-30, discovery-svep Västra Götaland/Halland (session "Gråvatten 4", område D upptäckt):**
  de 37 osökta kommunerna (Bohuslän, Dalsland+Lilla Edet, Göteborgs kranskommuner, Sjuhärad+
  Hylte, Skaraborg väst/öst), 6 agenter × 45 sökningar. 98 fynd → 70 nya registerposter, 5
  uppgraderade (Skara Björkelundsgatan grå → latrin via skara.se, Kedumsvik grå → full tömning,
  Lokstallet Hjo vatten+latrin, Göta Holme), 5 kompletterade, 17 hoppade. Stenungsunds hamn-
  ställplatsen borttagen (nedlagd 2025 enl. ST-tidningen, hamnens sugtömning gäller båtar).
  Rådata `docs/import/discovery-vastra-gotaland-halland-sep-2026.json`. ~50 poster geokodas –
  verifiera efter deploy. Kvar: Lilla Edet är genuint tomt (närmaste tömning Backamo/Uddevalla),
  Tibro/Tidaholm/Tranemo saknar kommunal tömning, Mellerud/Bengtsfors/Grästorp/Vårgårda inget
  nytt, Fengersfors-konflikt (OSM säger tömning, Visit Väst säger bara vatten), Öijared GK bara
  aggregator, Sotenäs planerade ställplatser (Väjern/Bovallstrand/Malmön) ej byggda ännu.
  **Utfall 1 okt:** 75 av 82 i seeden; 7 ogeokodbara + Sturebadet (11 km fel) fick exakta
  koordinater. Verifiera nästa deploy.
