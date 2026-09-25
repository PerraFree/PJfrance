# First Camp – latrin-/gråvattentömning och färskvatten (research 25 sep 2026)

Per frågade om First Camps tömningsplatser (https://firstcamp.se/campingtips/husbil/latrintomning) finns med på kartan.
Det här är ett **rent researchunderlag** – inget är ändrat i `scripts/curated-places.json` eller i koden.

## Metod och begränsningar

- firstcamp.se är egress-blockad från sandboxen (WebFetch och curl). Allt bygger på WebSearch med `allowed_domains: ["firstcamp.se","en.firstcamp.se"]`, dvs sökmotorns återgivning av First Camps egna sidor. Där sökmotorn gav ordagrann svensk text står den citerad; i flera fall är citatet en engelsk/omskriven sammanfattning av destinationssidan (markerat i `evidence`/`notes` i JSON-filen).
- **Sökningar:** 21 egna (destinationslista, Kärradal) + 5 agenter × 20 = **121 sökningar** totalt (budget ~120).
- `confidence: high` = konkret formulering om tömning på just den destinationens sida. `medium` = vag eller indirekt formulering. `null` = ingen First Camp-sida hittad.
- Regeln för genomresande, ordagrant från latrintömning-sidan: *"Bor du hos oss är det helt gratis! Har du vägarna förbi eller befinner dig mellan två destinationer kan du tömma och fylla på dina tankar för endast 60 kr, varje dag från kl. 12."* Den gäller kedjan generellt; `fee`-kolumnen anger om den återkom på destinationens egen sida.
- **Färskvatten** nämns nästan aldrig destinationsspecifikt på campingsidorna (bara på de dedikerade ställplatssidorna: Stockholm, Nora, Moraparken, Orsa, Torekov, Råå Vallar m.fl.). `vatten: –` betyder alltså "inte belagt av First Camp", inte "finns inte".
- Seed-jämförelsen räknar alla poster inom 500 m av den matchade posten som ett kluster (så gör appens avstånds-dedupe också). "Kluster bekräftat" = tjänster som redan finns på kartan (ej grå/obekräftade).
- Seed: `origin/gh-pages:data/stations-seed.json` hämtad 25 sep 2026 (6 048 platser).

## Sammanfattning

| Status | Antal |
|---|---|
| FINNS MED TÖMNING | 41 |
| FINNS MED TÖMNING (First Camp-sidan bekräftar inget) | 1 |
| FINNS MED VATTEN (tömning ej belagd) | 1 |
| FINNS UTAN TÖMNING | 8 |
| SAKNAS HELT | 0 |
| EJ FIRST CAMP LÄNGRE (ingen sida hittad) | 7 |
| **Totalt granskade** | **58** |

Belägg från First Camps egen sida: **46 high**, **4 medium**, 8 utan belägg/ej First Camp.

### Destinationslistan

Min utgångslista hade 56 svenska destinationer (framtagen via 20 sökningar mot firstcamp.se/en.firstcamp.se – sökmotorn återger inte hela `/destinationer`-sidan). Agenterna hittade **två till**: First Camp Karlstorp – Halmstad och First Camp Kärradal – Varberg. Sju på listan saknar helt sida på firstcamp.se (Skånes Djurpark, Mellbystrand, Skrea Strand, Böda Sand, Tofta, Gustavsvik, Malnbaden) och har troligen lämnat kedjan – vilket stämmer med First Camps egen siffra "nearly 50 destinations across Sweden" (58 − 7 = 51). **Öppna https://firstcamp.se/om-first-camp/first-camp-familjen i webbläsare för facit.**

## Tabell

Sorterad syd → nord. L = latrin (kassett), G = gråvatten/fast tank, V = färskvatten enligt First Camps sida. "Kluster" = tjänster som redan finns på kartan vid platsen.

| # | Destination | Ort | L | G | V | Conf. | Status | Seed-id (namn) | Kluster bekräftat | Saknas i seed | Var på området / notering |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | First Camp Sibbarp – Malmö | Malmö | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-296888614` (First Camp Malmö Sibbarp) | gravatten, latrin, vatten | – | Vid campingens husbilsområde (41 husbilsplatser längs huvudvägen med egen tömning); latrintömning lös tank även i servicehus 1 · Vissa tömningsstationer stängda vintertid p.g.a. frost; lågsäsong kan vattenposter/latrintömning vara begränsade |
| 2 | First Camp Åhus – Kristianstad | Åhus | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-128544589` (First Camp Åhus - Kristianstad) | gravatten, latrin, vatten | – | CamperClean-automat på husbilsområdet (mitt på campingen, nära receptionen); latrintömning lös tank vid servicehus 1, 3 och 4; tömning fast tank vid servicehus 4 samt vid strandstugebyn |
| 3 | First Camp Skånes Djurpark – Höör | Höör | – | – | – | – | EJ FIRST CAMP LÄNGRE (ingen sida hittad) | `curated-321-skånes-djurparks-camping,-höör` (Skånes Djurparks Camping) | gravatten, latrin, vatten | – |  |
| 4 | First Camp Råå Vallar – Helsingborg | Helsingborg (Råå) | – | ja | ja | high | FINNS MED TÖMNING | `osm-way-57975146` (Råå Vallar) | gravatten, latrin, vatten | – | Ställplatsen ligger vid campingens infart, utanför bommarna; tömningsstation för fasta tankar vid husbilstömningen inne på campingen · Toalett med handfat vid ställplatsen vår/sommar/höst (ej vinter) |
| 5 | First Camp Skönstavik – Karlskrona | Karlskrona | ja | – | – | high | FINNS MED TÖMNING | `osm-way-25622201` (First Camp Skönstavik – Karlskrona) | gravatten, latrin, vatten | – | Latrintömning strax till vänster om receptionen (enligt kartan) |
| 6 | First Camp Mölle – Höganäs | Mölle | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-437382779` (Firstcamp Mölle – Höganäs) | gravatten, latrin, vatten | – | Latrintömning i servicehus 1; station för fasta tankar bakom servicehus 1 · året runt ("First Camp Mölle – Höganäs is open year-round") |
| 7 | First Camp Torekov – Båstad | Torekov | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-494506962` (First Camp Torekov-Båstad) | vatten, gravatten, latrin | – | Latrintömning i samtliga servicehus; gråvatten och färskvattenpåfyllning vid receptionen; husbilsplatserna vid campingens infart, precis utanför bommarna |
| 8 | First Camp Mellbystrand – Halmstad | Mellbystrand | – | – | – | – | EJ FIRST CAMP LÄNGRE (ingen sida hittad) | `osm-way-976890775` (Mellbystrands Camping) | gravatten, latrin, vatten | – |  |
| 9 | First Camp Sjöstugan – Älmhult | Älmhult | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-363799969` (Sjöstugans Camping & Vandrarhem) | gravatten, latrin, vatten | – | Ställplatsen ligger vid IKEA/Älmhults handelsplats intill väg 23; på campingen finns tömningsstationen för latrin och lös tank vid servicehuset · Incheckning från 13:00 (öppet dygnet runt, incheckningsautomat + pinkod till bommen) |
| 10 | First Camp Hagön – Halmstad | Halmstad | ja | ja | – | high | FINNS MED TÖMNING | `osm-relation-10467020` (Hagöns Camping) | gravatten, latrin, vatten | – | Latrintömning lös tank vid respektive servicehus (4 st, bl.a. servicehus 4); latrinstation för fasta tankar vid svängen UTANFÖR campingen |
| 11 | First Camp Stensö – Kalmar | Kalmar | ja | – | – | high | FINNS MED TÖMNING | `osm-relation-11168707` (Stensö Camping) | gravatten, latrin, vatten | – | vid receptionen/butiken · Incheckning 13:00 |
| 12 | First Camp Tylösand – Halmstad | Halmstad (Tylösand) | ja | ja | – | high | FINNS MED TÖMNING | `osm-relation-10481167` (First Camp Tylösand) | gravatten, latrin, vatten | – | Latrintömning i samtliga servicehus; tömningsstation för fasta tankar vid nedre delen av aktivitetsbanan · "First Camp Tylösand – Halmstad har numera öppet året om för både camping och stugor." |
| 13 | First Camp Karlstorp – Halmstad | Halmstad | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-1185957108` (Citycamp Halmstad) | gravatten, latrin, vatten | – | Latrintömning i servicehus 1 och 2; husbilstömning (fast tank) vid platserna 242–243 på väg mot utfarten |
| 14 | First Camp Ekerum – Öland | Borgholm | ja | – | – | high | FINNS MED TÖMNING | `osm-way-128131340` (Ekerums Camping & Stugor) | gravatten, latrin, vatten | – | servicehus 2, 3, 4 och 6 |
| 15 | First Camp Skrea Strand – Falkenberg | Falkenberg | – | – | – | – | EJ FIRST CAMP LÄNGRE (ingen sida hittad) | `osm-relation-10212456` (Skrea camping och vandrarhem) | gravatten, latrin, vatten | – |  |
| 16 | First Camp Björkäng – Varberg | Varberg | ja | – | – | high | FINNS MED TÖMNING | `osm-relation-10228336` (Björkängs Camping) | latrin | – | Latrintömning (lös tank) i servicehus 3 och 4 |
| 17 | First Camp Löttorp – Öland | Löttorp | ja | – | – | medium | FINNS UTAN TÖMNING | `osm-way-296513627` (Löttorps Camping) | – | latrin | i båda servicehusen |
| 18 | First Camp Kärradal – Varberg | Kärradal, Varberg | ja | ja | – | high | FINNS MED TÖMNING | `osm-node-9907751694` (Tömningsstation, Kärradal) | gravatten, latrin, vatten | – | Latrintömning i alla servicehus (1, 2 och 3); gråvattentömning vid servicehus 1 · stugby året runt; campingdelen stängd vintertid, öppnar våren |
| 19 | First Camp Gunnarsö – Oskarshamn | Oskarshamn | ja | – | ja | high | FINNS MED TÖMNING | `osm-node-431824975` (Gunnarsö Camping) | gravatten, latrin, vatten | – | Ställplatsen ligger direkt vid infarten till campingen (48 platser) med eget servicehus och latrinplatta · Ställplats Gunnarsö är vinterstängd; incheckning 13:00, utcheckning 11:00; drop-in utanför receptionens öppettider bara under sommarsäsong |
| 20 | First Camp Böda Sand – Öland | Böda | – | – | – | – | EJ FIRST CAMP LÄNGRE (ingen sida hittad) | `osm-way-326746925` (Böda Sand Beach Resort) | gravatten, latrin, vatten | – |  |
| 21 | First Camp Tofta – Gotland | Tofta | – | – | – | – | EJ FIRST CAMP LÄNGRE (ingen sida hittad) | `osm-relation-6597540` (Tofta Camping) | gravatten, latrin, vatten | – |  |
| 22 | First Camp Lilleby – Göteborg | Göteborg (Torslanda) | – | – | – | low | FINNS MED TÖMNING (First Camp-sidan bekräftar inget) | `osm-relation-10921465` (Göteborgs Camping) | vatten, gravatten, latrin | – |  |
| 23 | First Camp Gränna – Vättern | Gränna | – | ja | – | medium | FINNS MED TÖMNING | `osm-way-297331049` (First Camp Gränna - Vättern) | gravatten, latrin, vatten | – | tre tömningsstationer på området · Öppet året runt |
| 24 | First Camp Hökensås – Tidaholm | Tidaholm | ja | ja | – | medium | FINNS UTAN TÖMNING | `osm-relation-17776418` (Tidaholm Hökensås Semesterby och Camping) | – | latrin, gravatten |  |
| 25 | First Camp Solvik – Kungshamn | Kungshamn | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-1315304781` (First Camp Solvik – Kungshamn) | gravatten, latrin, vatten | – | tömningsstation vid varje servicehus; fast tank: separat station i husbilsområdet och vid servicehus 1 |
| 26 | First Camp Skara Sommarland | Skara | ja | ja | ja | high | FINNS MED TÖMNING | `osm-relation-6413774` (Skara Sommarlands camping) | gravatten, latrin, vatten | – | latrin (lös tank) i servicehus 3; vattenposter i alla servicehus |
| 27 | First Camp Glyttinge – Linköping | Linköping | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-138265403` (First Camp Glyttinge) | gravatten, latrin, vatten | – | Latrintömning på baksidan av servicehuset; servicehus 1: gråvattentömning + vattenpost; servicehus 2: tömning lös tank |
| 28 | First Camp Vadstena – Vättern | Vadstena | ja | ja | – | high | FINNS UTAN TÖMNING | `osm-way-760268947` (Vadstena Camping) | – | latrin, gravatten | CamperClean (lös tank) vid servicehus 2; lös tank även servicehus 3 och 4; fast tank vid servicehus 1 och 4 |
| 29 | First Camp Kolmården – Norrköping | Kolmården | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-132041797` (First Camp Kolmården) | gravatten, latrin, vatten | – | Liten station vid receptionen (byggnaden bakom Skogslängorna) för latrinbehållare; större station vid verkstadsbyggnaden efter lekplatsen för både latrinbehållare och fast tank |
| 30 | First Camp Edsvik – Grebbestad | Grebbestad | ja | ja | ja | high | FINNS MED TÖMNING | `osm-relation-10921243` (First Camp Edsvik - Grebbestad) | gravatten, latrin, vatten | – | latrintömning i servicehusen och utanför receptionen; spolplatta för gråvatten på området; husbilsplatser högst upp längs vägen nära reception/butik · året runt |
| 31 | First Camp Ekudden – Mariestad | Mariestad | ja | – | – | high | FINNS MED TÖMNING | `osm-way-76632860` (Ekuddens Camping) | gravatten, latrin, vatten | – | servicehus 3 och servicehus 4 |
| 32 | First Camp Nickstabadet – Nynäshamn | Nynäshamn | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-823976379` (Nickstabadets Camping) | gravatten, latrin, vatten | – | Latrintömning i samma byggnad som vandrarhem och reception, samt bakom servicehus 2; gråvattenavlopp i servicehus 1 · året runt |
| 33 | First Camp City – Strömstad | Strömstad | ja | – | – | high | FINNS UTAN TÖMNING | `osm-relation-10609991` (Strömstads Camping) | – | latrin | servicehus 4 |
| 34 | First Camp Duse Udde – Säffle | Säffle | ja | – | ja | high | FINNS MED TÖMNING | `osm-way-1006196367` (Duse Udde Camping) | gravatten, latrin, vatten | – | latrin vid återvinningsstationen, servicehus 1 och lilla röda huset; vattenslang för husbilar vid servicehus 1 (året runt) · vattenslang vid servicehus 1 året runt |
| 35 | First Camp City – Stockholm | Stockholm | ja | ja | ja | high | FINNS MED TÖMNING | `osm-relation-5185724` (City – Stockholm) | gravatten, latrin, vatten | – | Ställplats Stockholm vid Flatens naturreservat och sjön Flaten; självincheckning dygnet runt · året runt |
| 36 | First Camp Gustavsvik – Örebro | Örebro | – | – | – | – | EJ FIRST CAMP LÄNGRE (ingen sida hittad) | `osm-way-365339926` (Gustavsvik) | gravatten, latrin, vatten | – |  |
| 37 | First Camp Herrgårdsliv – Kristinehamn | Kristinehamn | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-363449504` (Kristinehamn Herrgårdscamping & Stugor) | gravatten, latrin, vatten | – | lös tank i alla servicehus; fast tank vid Norra och Östra servicehuset |
| 38 | First Camp Mörudden – Hammarö | Hammarö | ja | – | – | high | FINNS MED TÖMNING | `osm-way-1319802648` (First Camp Mörudden) | vatten, gravatten, latrin | – | vid servicehuset/sopstationen · året runt |
| 39 | First Camp Ånnaboda – Örebro | Örebro | ja | – | – | high | FINNS MED TÖMNING | `osm-relation-15330391` (Ånnaboda Camping) | gravatten, latrin | – | servicehus 1 bredvid bommen, samt servicehus 3 och 4 · året runt ("year-round" enligt engelska sidan) |
| 40 | First Camp Sommarvik – Årjäng | Årjäng | ja | – | ja | high | FINNS MED TÖMNING | `osm-way-325696930` (Årjäng SweCamp Resort Sommarvik) | gravatten, latrin, vatten | – | servicehus 1 (Centrum) och servicehus 6 (Barbros hus) · året runt |
| 41 | First Camp Skutberget – Karlstad | Karlstad | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-298812703` (First Camp Skutberget-Karlstad) | gravatten, latrin, vatten | – | latrin i servicehus 1 och i separat byggnad vid 400-området; fast tank bakom servicehus 1 · året runt; vattnet avstängt på alla campingtomter under vintersäsongen |
| 42 | First Camp Nora – Bergslagen | Nora | ja | ja | ja | high | FINNS UTAN TÖMNING | `osm-way-196823753` (Nordic camping Nora) | – | latrin, gravatten, vatten | Ställplatsen ligger vid Skojarbacken, ett stenkast från Norasjön och trästaden Nora · Incheckning från kl 13 (öppet dygnet runt), utcheckning senast kl 12 |
| 43 | First Camp Västerås – Mälaren | Västerås | ja | ja | – | high | FINNS UTAN TÖMNING | `osm-way-247078005` (Västerås mälarcamping) | – | latrin, gravatten | egen byggnad intill miljöstationerna; lös tank inomhus, fast tank strax utanför · året runt |
| 44 | First Camp Bredsand – Enköping | Enköping | – | – | ja | medium | FINNS MED VATTEN (tömning ej belagd) | `osm-relation-9644309` (Bredsands Camping) | vatten | – | vatten på campingtomter med "el och vatten" |
| 45 | First Camp Haganäset – Charlottenberg | Charlottenberg | ja | ja | ja | high | FINNS UTAN TÖMNING | `osm-relation-11134834` (Haganäset - Charlottenberg Camping & Stugor) | – | latrin, gravatten, vatten | lös tank i båda servicehusen; fast tank vid ställplatsen; ställplatsen ligger vid infarten till området |
| 46 | First Camp Mellsta – Borlänge | Borlänge | ja | – | – | high | FINNS MED TÖMNING | `osm-way-47078082` (Mellstaparken Camping) | gravatten, latrin, vatten | – | latrintömning i servicehus 1 och 2 · Obemannat koncept – digital incheckning via mobil eller självbetjäningsautomat på plats |
| 47 | First Camp Lugnet – Falun | Falun | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-92436534` (First Camp Lugnet Falun) | gravatten, latrin, vatten | – | latrin (kassett) i servicehus 3; gråvatten på anvisad plats · Gråvattentömning endast öppen april–september |
| 48 | First Camp Siljansbadet – Rättvik | Rättvik | ja | – | – | high | FINNS MED TÖMNING | `osm-way-206306978` (Siljanbadets Camping) | gravatten, latrin, vatten | – | tömningsstation för latrin i samtliga servicehus; ställplatserna ligger avskilt nära badstranden vid Siljan, 1 km från centrala Rättvik · Ställplats: el + tillgång till servicehus under sommarsäsongen – servicehusen är stängda vintertid |
| 49 | First Camp Enåbadet – Rättvik | Rättvik | ja | – | – | high | FINNS MED TÖMNING | `osm-way-206319156` (Enåbadets Camping) | gravatten, latrin, vatten | – | latrintömning i samtliga servicehus · året runt |
| 50 | First Camp Moraparken – Dalarna | Mora | ja | ja | ja | high | FINNS MED TÖMNING | `osm-relation-11918991` (First Camp Moraparken) | gravatten, latrin, vatten | – | intill ställplatserna (10 st, 12 x 7 m); latrintömning i samtliga servicehus · året om (restaurang/butik säsongsvarierande öppettider) |
| 51 | First Camp Orsa – Dalarna | Orsa | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-36902843` (Orsa Camping) | latrin, gravatten, vatten | – | latrin vid servicehus 2, 3, 5, 6 och 7; tömningsstation för fast tank bakom receptionen; husbilsplatser på asfalt bakom bowlinghallen · året runt |
| 52 | First Camp Malnbaden – Hudiksvall | Hudiksvall | – | – | – | – | EJ FIRST CAMP LÄNGRE (ingen sida hittad) | `osm-node-333781943` (Malnbadens Camping & Vandrarhem) | gravatten, latrin, vatten | – |  |
| 53 | First Camp Fläsian – Sundsvall | Sundsvall | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-297511988` (First Camp Fläsian) | gravatten, latrin, vatten | – | Latrin: tre platser på vänster sida efter vägen ner på campingen från infarten. Tömningsränna för fast tank: nere vid havet (brant backe – kan vara otillgänglig vintertid utan fyrhjulsdrift). |
| 54 | First Camp Frösön – Östersund | Östersund | ja | – | – | high | FINNS MED TÖMNING | `osm-way-99409175` (Frösö Camping) | gravatten, latrin, vatten | – | Latrintömning vid servicehus 1 och 3. Husbilsplatser med hårdgjord yta och el nära reception/servicehus. · året runt ("the camping is open all year around" enligt en.firstcamp.se) |
| 55 | First Camp Nydala – Umeå | Umeå | ja | ja | ja | high | FINNS MED TÖMNING | `osm-way-88212612` (First Camp Nydala - Umeå) | gravatten, latrin, vatten | – | Latrintömning på tre ställen på området; tömningsstation/ränna för fast tank till höger efter receptionen. Färskvattenkranar och avlopp intill campingtomterna. · året runt ("open year-round" / "Camping all year round") |
| 56 | First Camp Ansia – Lycksele | Lycksele | ja | – | – | high | FINNS MED TÖMNING | `osm-node-431824496` (First Camp Ansia) | gravatten, latrin, vatten | – | Latrintömning vid miljöstation 1 och vid alla servicehus; vintertid endast vid servicehus 2. · året runt-drift antyds (vinterregel för latrintömning: endast servicehus 2) |
| 57 | First Camp Arcus – Luleå | Luleå | ja | ja | – | high | FINNS MED TÖMNING | `osm-way-253061846` (First Camp Luleå) | gravatten, latrin, vatten | – | Latrin (lös tank) i alla servicehus. Fast tank: ENDAST gråvatten kan tömmas på området (ej svartvatten från fast tank); tömning av fast tank gäller inte vintertid. · året runt ("open year-round"; fast-tank-tömning ej vintertid) |
| 58 | First Camp Björknäs – Boden | Boden | ja | ja | ja | high | FINNS UTAN TÖMNING | `osm-way-556861308` (Bodens camping) | – | latrin, gravatten, vatten | Latrintömning i eller vid samtliga servicehus + fem ytterligare ställen på området. · året runt |

## Att göra i registret (förslag – inget gjort ännu)

### A. Komplettera befintliga poster (FINNS UTAN TÖMNING – belägg high eller medium, se conf.)

- **First Camp Löttorp – Öland** → `osm-way-296513627` (Löttorps Camping, idag: camping, stallplats). Lägg till: latrin (conf. medium). i båda servicehusen Notering: Tömningsstation i servicehusen = latrin/kassettömning (inne i servicehus). Gråvatten för fast tank inte uttryckligen nämnt. Färskvatten nämns bara via VA-tomter (el+vatten+avlopp på området Havet) – ingen uttrycklig påfyllningsplats; rimligt men ej citerat. Ingen separat ställplats för genomresande funnen.
- **First Camp Hökensås – Tidaholm** → `osm-relation-17776418` (Tidaholm Hökensås Semesterby och Camping, idag: camping). Lägg till: latrin, gravatten (conf. medium).  Notering: Belägget är ett renoveringsmeddelande från hösten 2023 som indirekt bekräftar att tömningsstation för både kassett och fast tank finns (renoverad, klar nov 2023). Ingen aktuell facilitetstext med 'latrintömning'/'vattenpost' returnerades av sökningen. Sätt medium – lägg till som bekräftad först efter manuell koll av sidan.
- **First Camp Vadstena – Vättern** → `osm-way-760268947` (Vadstena Camping, idag: camping, stallplats). Lägg till: latrin, gravatten (conf. high). CamperClean (lös tank) vid servicehus 2; lös tank även servicehus 3 och 4; fast tank vid servicehus 1 och 4 Notering: Mycket tydlig: latrin (CamperClean + lös tank i tre servicehus) och gråvatten (fast tank vid servicehus 1 och 4). Färskvatten ej uttryckligen nämnt. Nära 400 platser, husbilsplatser med sjöutsikt inne på campingen.
- **First Camp City – Strömstad** → `osm-relation-10609991` (Strömstads Camping, idag: camping). Lägg till: latrin (conf. high). servicehus 4 Närliggande inom 1 km: curated-98-uddevallavägen-50,-strömstad (First Camp City Strömstad latrintömning: latrin,vatten). Notering: Latrin belagd ordagrant. Fast tank/gråvatten och vattenpost nämns inte i returnerad text (två sökningar). Sidan säger '3 servicehus' men latrintömning 'vid servicehus 4' – troligen numrering, inte fel. Kuperat bergsområde – ingen separat ställplats nämnd.
- **First Camp Nora – Bergslagen** → `osm-way-196823753` (Nordic camping Nora, idag: camping, stallplats). Lägg till: latrin, gravatten, vatten (conf. high). Ställplatsen ligger vid Skojarbacken, ett stenkast från Norasjön och trästaden Nora Närliggande inom 1 km: osm-node-6769450139 (Gustavsbergs naturistcamping: camping). Notering: Destinationsspecifik ställplatssida (URL:en är /stallplats, inte /stallplats-nora). Tömning av fast tank = svartvatten/dumpstation; gråvatten inte ordagrant nämnt men fast-tank-tömning finns. Formuleringarna kom via sökmotorns sammanfattning, inte som ordagrant citat.
- **First Camp Västerås – Mälaren** → `osm-way-247078005` (Västerås mälarcamping, idag: camping). Lägg till: latrin, gravatten (conf. high). egen byggnad intill miljöstationerna; lös tank inomhus, fast tank strax utanför Notering: Färskvatten nämns bara i First Camps generella text, inte på Västerås-sidan (två sökningar). Ingen separat ställplats-sida hittad.
- **First Camp Haganäset – Charlottenberg** → `osm-relation-11134834` (Haganäset - Charlottenberg Camping & Stugor, idag: camping). Lägg till: latrin, gravatten, vatten (conf. high). lös tank i båda servicehusen; fast tank vid ställplatsen; ställplatsen ligger vid infarten till området Notering: Alla tre tjänsterna belagda. Ställplats vid infarten avsedd för korta stopp (max 10 m, el ingår, grus). Servicehusen kräver nyckelkort från incheckning – dvs. tömning i servicehus bara för incheckade gäster; fast-tank-tömningen ligger däremot vid ställplatsen.
- **First Camp Björknäs – Boden** → `osm-way-556861308` (Bodens camping, idag: camping). Lägg till: latrin, gravatten, vatten (conf. high). Latrintömning i eller vid samtliga servicehus + fem ytterligare ställen på området. Notering: Meningen om färskvatten/gråvatten/svartvatten kan vara sökmotorns sammanfattning av First Camps generella husbilstext snarare än Björknäs egen sida – latrincitatet (fem ytterligare ställen) är dock otvetydigt platsspecifikt. Om ni vill vara strikta: latrin=high, gravatten/vatten=medium.

### B. Poster där kartan påstår MER än First Camp bekräftar

Inte fel i sig (kan komma från OSM eller tidigare svep), men värt att veta vid "rätt före fler"-kontroll. Färskvatten är den vanliga skillnaden – First Camp skriver sällan ut det.

- First Camp Åhus – Kristianstad: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Råå Vallar – Helsingborg: kartan har latrin utöver det First Camp-sidan bekräftar (gravatten, vatten).
- First Camp Skönstavik – Karlskrona: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Mölle – Höganäs: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Hagön – Halmstad: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Stensö – Kalmar: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Tylösand – Halmstad: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Karlstorp – Halmstad: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Ekerum – Öland: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Kärradal – Varberg: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Gunnarsö – Oskarshamn: kartan har gravatten utöver det First Camp-sidan bekräftar (latrin, vatten).
- First Camp Gränna – Vättern: kartan har latrin, vatten utöver det First Camp-sidan bekräftar (gravatten).
- First Camp Solvik – Kungshamn: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Ekudden – Mariestad: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Nickstabadet – Nynäshamn: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Duse Udde – Säffle: kartan har gravatten utöver det First Camp-sidan bekräftar (latrin, vatten).
- First Camp Herrgårdsliv – Kristinehamn: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Mörudden – Hammarö: kartan har vatten, gravatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Ånnaboda – Örebro: kartan har gravatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Sommarvik – Årjäng: kartan har gravatten utöver det First Camp-sidan bekräftar (latrin, vatten).
- First Camp Mellsta – Borlänge: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Lugnet – Falun: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Siljansbadet – Rättvik: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Enåbadet – Rättvik: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Fläsian – Sundsvall: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).
- First Camp Frösön – Östersund: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Ansia – Lycksele: kartan har gravatten, vatten utöver det First Camp-sidan bekräftar (latrin).
- First Camp Arcus – Luleå: kartan har vatten utöver det First Camp-sidan bekräftar (latrin, gravatten).

### C. Namn/koordinater att se över (troligen inte längre First Camp)

- **First Camp Skånes Djurpark – Höör** → kartan: `curated-321-skånes-djurparks-camping,-höör` (Skånes Djurparks Camping); poster med First Camp-namn/-länk i klustret: `curated-321-skånes-djurparks-camping,-höör`. Två sökningar (inkl. slug-riktad) gav INGEN träff alls på en firstcamp.se-sida för Skånes Djurpark/Höör – inte ens destinationens startsida dök upp. Antingen är slugen en annan eller så drivs anläggningen inte (längre) under First Camp-namnet. Lägg inte till något; kontrollera destinationslistan på firstcamp.se/destinationer manuellt.
- **First Camp Mellbystrand – Halmstad** → kartan: `osm-way-976890775` (Mellbystrands Camping); poster med First Camp-namn/-länk i klustret: `curated-317-first-camp-mellbystrand,-laholm`. Två sökningar gav ingen firstcamp.se-sida för Mellbystrand – sökresultaten returnerade i stället Halmstad-destinationerna Tylösand, Hagön och Karlstorp (Karlstorp – Halmstad var ej på min lista men fick citat: 'Latrintömning finns i servicehus 1 och 2, och husbilstömningen finns vid platserna 242-243 på väg mot utfarten'). Troligen ingår Mellbystrand inte i First Camp under det namnet – verifiera manuellt.
- **First Camp Skrea Strand – Falkenberg** → kartan: `osm-relation-10212456` (Skrea camping och vandrarhem); poster med First Camp-namn/-länk i klustret: `curated-278-skrea-camping-och-vandrarhem`. Två sökningar (varav en helt utan tjänsteord: 'First Camp Skrea Strand Falkenberg camping') gav INGEN firstcamp.se-sida för Skrea Strand. Sökverktyget pekade i stället på Björkäng – Varberg som 'nearby camping option between Varberg and Falkenberg'. Starkt tecken på att Skrea Strand INTE längre är en First Camp-destination – lägg inte in som First Camp; behandla ev. befintlig post som fristående camping och verifiera mot annan källa.
- **First Camp Böda Sand – Öland** → kartan: `osm-way-326746925` (Böda Sand Beach Resort). Ingen destinationssida finns på firstcamp.se för Böda Sand – tre sökningar (inkl. exakt slug och "Böda Sand" i citattecken) gav bara Löttorp och Ekerum som First Camps enda Öland-destinationer; Böda sand nämns endast som utflyktsmål/strand från Löttorp. Böda Sand är alltså troligen INTE en First Camp-anläggning (egen operatör, bodasand.se) – verifiera mot annan källa utanför detta uppdrag; lägg inte in som First Camp.
- **First Camp Tofta – Gotland** → kartan: `osm-relation-6597540` (Tofta Camping). INTE längre First Camp. Tre sökningar (inkl. exakt slug tofta-gotland) gav ingen destinationssida; firstcamp.se beskriver i stället Tofta strand som ett dagsutflyktsmål från Gunnarsö och rekommenderar färjan från Oskarshamn eftersom 'det kan vara svårt att hitta boende på Gotland' – dvs First Camp har ingen egen anläggning på Gotland just nu. Tofta Camping drivs av annan operatör (verifiera separat, ej First Camp-namn i appen).
- **First Camp Gustavsvik – Örebro** → kartan: `osm-way-365339926` (Gustavsvik); poster med First Camp-namn/-länk i klustret: `curated-273-gustavsvik`. Gustavsvik är INTE en First Camp-destination (två sökningar, inkl. exakt frassökning "First Camp Gustavsvik", gav bara Ånnaboda-träffar). Gustavsvik camping i Örebro drivs av annan operatör – ska inte läggas in som First Camp.
- **First Camp Malnbaden – Hudiksvall** → kartan: `osm-node-333781943` (Malnbadens Camping & Vandrarhem); poster med First Camp-namn/-länk i klustret: `curated-302-first-camp-malnbaden,-hudiksvall`. Tre sökningar (varav en med citattecken kring 'Malnbaden') mot firstcamp.se/en.firstcamp.se gav INGEN destinationssida alls – inte ens en träff på ordet Malnbaden. Alla andra norrlandsdestinationer i listan dök upp som firstcamp.se/destinationer/<slug>. Misstanke: Malnbaden är inte (längre) en First Camp-destination, eller heter något annat på firstcamp.se. Verifiera i webbläsare (firstcamp.se/destinationer) innan den läggs in som First Camp.
- Dessutom: `curated-271-first-camp-böda-sand` ligger på 57.257/17.05 (≈1,9 km från Böda Sand Beach Resort, närmare Bödagårdens Camping) och `curated-292-first-camp-tofta` på 57.525/18.105 (≈4,7 km från Tofta Camping) – båda ser ut som geokodningsmissar från det tidiga storcamping-svepet, oavsett kedjetillhörighet.
- `curated-419-first-camp-luleå` heter numera First Camp Arcus – Luleå på firstcamp.se.

### D. First Camps ställplatser (firstcamp.se/campingtips/stallplatser)

Sökmotorn återgav inte själva listan. Belagda ställplatser med egen sida eller tydlig text: City – Stockholm (`/stallplatsstockholm`, dumpstation grå/svart + kassett + färskvatten, året runt, självincheckning), Råå Vallar (`/stallplats`, 12 platser utanför bommarna, gråvatten + vatten gratis, ingen el), Torekov (vid infarten utanför bommarna, alla tre tjänster, 60 kr genomresande), Gunnarsö (`/stallplats-gunnarso`, 48 platser vid infarten, latrinplatta, vinterstängd), Nora (`/stallplats`, vid Skojarbacken, 260 kr/natt inkl. el/tömning – **finns redan som `curated-91-skojarbacken,-nora` men bara med latrin**), Sjöstugan/Älmhult (vid IKEA, finns redan som `curated-822`), Siljansbadet (ställplats, servicehus stängda vintertid), Moraparken (10 ställplatser 12×7 m med tömning + färskvatten intill), Orsa (asfalt bakom bowlinghallen), Haganäset (vid infarten, fast tank vid ställplatsen), Herrgårdsliv Kristinehamn, Ekudden, Solvik, Edsvik, Skutberget, Duse Udde, Björknäs (el). Se `stallplats`-kolumnen i JSON.

## Vad som inte gick att verifiera

- Fullständiga destinations- och ställplatslistorna (JS-renderade sidor som sökmotorn bara delvis återger) – läs i webbläsare.
- Gatuadresser: bara Råå Vallar (Kustgatan 95), Gunnarsö (Östersjövägen 103) och Siljansbadet (Långbryggevägen 4) syntes i sökresultaten. Koordinaterna i JSON kommer från seed-matchningen, inte från First Camp.
- Lilleby – Göteborg: bara dusch/toalett i texten (low). Matchningen mot OSM-posten "Göteborgs Camping" (som har tömningsstation) bygger på läget vid Lilleby havsbad – bekräfta att det är samma anläggning.
- Karlstorp – Halmstad: citatet kom som bifångst i en Mellbystrand-sökning; matchningen mot "Citycamp Halmstad" är ett antagande utifrån läget.
- Hökensås – Tidaholm (bara indirekt via ett renoveringsmeddelande 2023) och Löttorp – Öland ("tömningsstationen finns i båda servicehusen", oklart om kassett eller ränna) är medium – lägg inte in som bekräftade utan ny koll.
- Arcus – Luleå: sidan säger uttryckligen att det INTE går att tömma svartvatten från fast tank (bara gråvatten), och ingen fast-tank-tömning alls vintertid. Lugnet – Falun: gråvattentömning bara april–september. Bör in i `description`/öppettider när posterna kompletteras.
- Böda Sand, Tofta, Mellbystrand, Skånes Djurpark, Skrea Strand, Gustavsvik, Malnbaden: "ingen sida hittad" är ett negativt resultat från 2–3 sökningar var, inte ett bevis. Verifiera i webbläsare innan namn ändras.

Fullständig rådata med citat och käll-URL per destination: `docs/import/firstcamp-tomning.json`.
