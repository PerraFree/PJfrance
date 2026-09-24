# Gasolpåfyllning av egen lös flaska – research (24 sep 2026)

Research-svep över platser i Sverige där man kan fylla på sin **egen, löstagbara**
gasolflaska i lösvikt (kr/kg eller fast pris per flaska, men flaskan behålls).
Byte tom-mot-full, fordonsgas vid pump och påfyllning av enbart fast monterad
tank räknas INTE som påfyllning – de är noterade separat.

Rådata: `gasolfyllning-research.json` (samma mapp). Denna fil ändrar INTE
`scripts/curated-places.json` – den är underlag för ett kommande import-steg.

## Metod

- 8 parallella agenter (branschlistor, påfyllningskedjor, forum/aggregatorer,
  samt regionerna Syd, Småland/Öland/Gotland/Östergötland, Svealand, Norrland,
  Västra Götaland). Sökbudget 55–60 WebSearch per agent.
- **Sökningar använda: ca 448 av kvoten 600** (59+59+55+55+55+55+55+55) plus 4
  egna testsökningar = **~452**.
- **WebFetch fungerade mot INGEN domän** (egress-blockad: energigas.se,
  mylpg.eu, gasolfyllarna.se, svenskagas.se, gasolkartan.se, web.archive.org,
  r.jina.ai m.fl.). Allt bygger på WebSearch-utdrag med `allowed_domains`.
  Koordinater finns bara där källan (myLPG.eu, Energigas Sverige) visade dem.
- Agenternas 215 rader slogs ihop till 109 unika platser (dedupe på
  gatuadress/ort, namn, befintligt namn, telefon + manuella alias). Vid
  motstridiga uppgifter vann högst confidence och därefter den adress flest
  källor angav; alternativa belägg ligger kvar i `altEvidence`.

## Sammanfattning

| | high | medium | low | totalt |
|---|---|---|---|---|
| Alla rader i JSON | 63 | 22 | 24 | 109 |
| Fyller egen lös flaska (`refillsLooseBottle: true`) | 53 | 12 | 6 | 71 |
| …varav **nya** (saknas i appen) | 18 | 6 | 5 | 29 |
| …varav befintliga som **saknar** `gasol_pafyllning` | | | | 3 |
| …varav befintliga påfyllningsposter som bekräftades | | | | 39 |
| Endast fast tank (ingen lös flaska) | | | | 6 |
| Kontrollerade: INTE påfyllning (byte/pump/nedlagd) | | | | 32 |

Appen hade före svepet 40 poster med `gasol_pafyllning`
(30 i registret + 10 OSM-overrides). Alla 40 återfanns i svepet.

## Nya påfyllningsplatser (saknas i appen) – 29 st

Rekommendation: lägg in **high** direkt (med `query` + `nearLat/nearLon`
eller exakt `lat/lon` där källan gav en), **medium** efter en extra koll,
**low** bara som `unverified: true` (grå).

| Plats | Adress | Conf. | Pris | Öppettider | Anmärkning |
|---|---|---|---|---|---|
| Tallheds Plantskola (Orsa Besparingsskog) | Flygfältsvägen 19, Orsa | high | Prislista finns på sidan men visades in… | Mån–tors 07–16, fre 07–13 | NY – saknas helt i appen. Enda belagda lösviktsfyllningen i norra Dalarna. Även Campingaz-flaskor fylls (ovanligt). |
| Gasolgubben | Lillegårdsvägen 1, Falkenberg | high | 38 kr/kg | Mån–fre 09:00–16:00, lör–sön stängt (gasolkartan.se) | NY. Drivs sedan hösten 2018 av bröderna Larsson. Finns på gasolkartan.se, myLPG och husbilsklubben ('Hurra för Gasolgubben i Falkenberg'). Prisuppgifterna är d… |
| Svenska gas & gasol AB – Fjärås | Fjärås industriväg 6 (flyttar hösten 2026 till Fjärås Lantmannaväg 11), Fjärås (Kungsbacka) | high | "Priserna justeras kontinuerligt utifrå… | Tis, tors, fre 12–17, lör 10–14; mån/ons/sön stängt (myLPG.eu – ändras vid flytten) | Ny plats – saknas helt i appen. OBS flytt hösten 2026 till Fjärås Lantmannaväg 11 – koordinaten ovan gäller gamla läget (industriväg 6); kontrollera efter flyt… |
| AB Svenska Gasolfabriken | Rågrindsvägen 58 A, Öjebyn (Piteå) | high | Pris ej publicerat i sökbara källor. | – | NY plats, saknas helt i appen. Adress: kontaktsidan/Facebook anger Rågrindsvägen 58 A, eniro anger Rågrindsvägen 46 (troligen post- vs besöksadress) – geokoda … |
| Gasip (Karlskoga) | Maskinvägen 22, Karlskoga | high | Kilopris för det som fylls på – belopp … | Mån–fre 08:00–17:00, lunchstängt 13:30–14:00 | Ny plats – saknas i appen. Kontrollera mot befintliga Karlskoga-poster 'Gasol – Peter Bergkvist Service, Karlskoga' och 'Gasolautomat Karlskoga' (kan vara samm… |
| Södra Hamnen i Motala (Motalas Sjömack) | Fabriksgatan 12H, Motala | high | 'gasol till konkurrenskraftiga priser' … | – | NY plats – sjömack + ställplats ('Ställplats City') i Motala hamn vid Vättern. Egen sajt + branschlista. Ingen koordinat i källorna (Fabriksgatan 12H i Motala … |
| Eslöv Gasol | Gustavslundsvägen 4, Eslöv | high | Betalning per kilo; pris ej i sökresult… | – | NY. Tidigare bortvald som 'misstänkt boilerplate' – texten är identisk med ystadgasol.se eftersom det är SAMMA bolag (Ystad Gasol AB) med två stationer. Adress… |
| Ekonex Hässleholm | Samlarvägen 1, Hässleholm | high | Färdigfylld P6 från 180 kr; lösviktspri… | Mån–fre 09:00–17:00, lör 09:00–13:00 | NY. Fyller även fordon/fast tank med LPG. Även listad på gasolkartan.se/station/ekonex/. Sidan går inte att hämta (egress-blockad) – ordagrant svenskt citat sa… |
| Gasol Malmö LPG – Limhamn (Småbåtshamnen) | Bryggövägen (Småbåtshamnen), Limhamn, Malmö | high | Betalning per kilo; pris ej publicerat … | Mån, tor, fre 09:00–17:00, lör 10:00–14:00 (lunch 12:30–13:00) | NY – andra stationen för Gasol Malmö LPG, saknas helt i appen. Gatunummer saknas (småbåtshamnen på Bryggövägen). Forum nämner även en äldre fyllstation vid Alm… |
| Gasolstationen Östra Karup | Tomtaholmsvägen 8, Östra Karup (Båstad) | high | 42 kr/kg | Vardagar 12.00–17.00 (ej röda dagar); lör 10.00–13.00 apr–sep (ej röda dagar) – kedjans gemensamma tider | Ny plats – saknas helt i appen. Öppettider för bemannad påfyllning ej fångade (finns på gasolstationen.se/oppettider – läs i webbläsare). \| NY. Inte i appen (… |
| Håkansson & Håkansson AB (gasol på Österlen) | Fabriksgatan 30, Simrishamn | high | 36 kr/kg | Mån–fre 10–17, lör 10–14 (myLPG.eu) | Kakel-/golvbutik som även har gasoldepå. Koordinat från myLPG. Ny plats – saknas helt i appen. \| NY. Golv-/kakelbutik som också fyller gasol i lösvikt – enda … |
| Ystad Gasol AB | Södra Zinkgatan 16, Ystad | high | Kilopris, ej synligt i sökresultaten (y… | Mån–fre 10.00–17.00 (lunch 12.30–13.00); stängt helgdagar samt trettondags-, påsk-, pingst-, midsommar-, jul- och nyårsafton | NY – inte i appen (Ystad har bara Linde-automat + jem & fix, byte). \| NY. Bolagets registrerade adress (Fulltoftavägen 44, 242 71 Ludvigsborg) är INTE station… |
| GASIP Kristinehamn | Hamnvägen 6, Kristinehamn | high | Kilopris, ej publicerat | Mån 09–17, tis 09–16, ons–fre 09–17, lör–sön stängt (Facebook/gasolkartan) | NY – appen har bara jem & fix Kristinehamn (byte) och Linde-automat. Öppnade ca 2024 (Facebook-sida skapad 2024). Egna sajtens URL är felstavad ('krisintehamn'… |
| NB Energi Västerås | Cisterngatan 3, Västerås | high | Pris ej publicerat i sökresultaten ('ak… | Lösviktsfyllning: onsdag och torsdag 12–16 (stängt röda dagar och 2 jan). Kundtjänst vardagar 07–16. Gasolautomat (byte) dygnet runt på Cisterngatan 1 | NY. Ingen NB Energi-post finns i appen (befintliga Västerås-poster är Linde-automat, Brantestigs, Air Liquide, Bauhaus, Motonet, Circle K). Lösvikt bara ons+to… |
| Nossans Gasol AB | Södergatan 4, Grästorp | high | Betalar per fylld vikt; pris ej publice… | mån–fre 10–18, lör 10–13 | NY plats – tre samstämmiga källor (egen sajt, Kosan Gas, Energigas Sverige). Startade maj 2021 (NLT). Fyller även fast tank (LPG-tankning husbil). \| NY – inte… |
| Svenska Gas & Gasol – Stenungsund | Verkstadsvägen 5, Stenungsund | high | Byte PC10/PA11: 299 kr exkl. gas (svens… | – | NY plats (befintliga Stenungsund-poster är Linde-automater på Sävgatan/Kullen och Circle K). Öppettider finns på sajten men kom inte med i sökutdragen. Ingen k… |
| Svenska Gas & Gasol, Uddevalla | Herrestads Torsberg 820, Uddevalla | high | Pris ej publicerat. | Enligt svenskagas.se: tis 11–16, tors 11–16, lör 10–14. Enligt myLPG.eu (bekräftad 2026-03-21): tis 12–16, tors 14–18, fre 12–16 – uppgifterna skiljer sig, kontrollera på sajten. | NY. Koordinat från myLPG.eu. Uddevalla har idag bara byte-platser i appen (Gasolautomat Uddevalla, Bauhaus, Renta, Lantmännen). \| NY – inte i appen (Uddevalla… |
| West Coast Gasol | Vänersborg (Vargön) | high | "mycket konkurrenskraftiga priser" – be… | Från vecka 13: tis 16–19, fre 16–19, lör 10–13; övriga dagar stängt men försäljning kan ordnas enligt överenskommelse | NY men GATUADRESS SAKNAS – sajten/Facebook nämner Vänersborg/Vargön; adressen måste hämtas från westcoastgasol.se i webbläsare (egress-blockad härifrån) innan … |
| Hudiksvalls Plåt & Gasol AB | Ullsättersvägen 22, Hudiksvall | medium | – | Mån–tors 07:00–16:00, fre 07:00–15:00, lunchstängt 11:00–12:00; dag före röd dag 07:00–12:00; semesterstängt v.29–30 (öppettider.org) | NY plats. Medium eftersom de två utdragen skiljer sig: den egna sajten (via sökutdrag) säger 'påfyllning av gasolflaskor', Gasolkartans text nämner bara byte +… |
| Gasolmacken i Varberg AB | Signalvägen 9, Varberg | medium | Kedjan Gasolmacken (Uppsala 52 kr/kg, N… | Mån 14–17, tors 10–17, fre 12–17, övriga dagar stängt (myLPG.eu, 14 bekräftelser, senast 29 apr 2026) | Tredje Gasolmacken-anläggningen (utöver Uppsala och Nyköping som redan finns). Lös flaska ej ordagrant belagd för Varberg – verifiera på gasolmacken.se/varberg… |
| Älmhultsgasol / Gasol Häradsbäck | Barkhult 4040, Häradsbäck (Älmhults kommun) | medium | 23 kr/kg | Enl. öppettider.nu: mån–fre 08–18, lör–sön 10–17 (ej verifierat mot egen sajt) | Egen Facebook-sida bekräftar påfyllning men adress/datum saknas; forumkoordinaten avser gamla Barkhult-läget (flytt 2020 till Häradsbäck). Bör verifieras i web… |
| TBM Byggmaskiner i Motala AB | Myntgatan 6, Motala | medium | myLPG: LPG-pris 20 kr/liter (22.10.2025… | mån 06:45–16:15; tis 06:45–16:45; ons–fre 06:45–16:15; lör–sön stängt (myLPG, okt 2025) | NY plats. Egen FB-sida + myLPG (två källor) → medium. FB-rubriken är avklippt ('flaskor och p…') – 'påfyllnad av gasol' bekräftas i profiltexten enligt sökträf… |
| NB Energi Sala | Norrängsgatan 20, Sala | medium | – | Kontor mån–tor 07.30–16.00, fre 07.30–14.00. Lösviktsfyllning ons+tors 12–16 enligt äldre nboljor.se-inlägg (oklart om det gäller båda orterna) | MOTSTRIDIGT: nbenergi.se säger "Vi fyller dina flaskor i Västerås och Sala året runt", men sajtens lösviktssida nämner bara Västerås (ons+tors 12–16) och Sala-… |
| Svenska Gas & Gasol, Orust (Henån) | Häröd 304, Henån | medium | Pris ej publicerat. | – | NY men medium: sökutdraget för Orust-sidan blandade in Uddevallas text ("2 km norr om IKEA" och samma öppettider), så öppettiderna är INTE tillförlitliga och a… |
| Handelsboden i Häradsbäck | Älmhultsvägen 3, Häradsbäck (Älmhult) | low | – | – | Troligen Älmhultsgasols nya försäljningsställe efter flytten till Häradsbäck 2020 – dedupa mot posten ovan. Lägg inte in som egen plats utan koll. |
| AGA Gas / f.d. Flaskgascentralen Svedala | Bäckgatan 2, Svedala | low | Gammal uppgift: tysk flaska 450 kr/11 kg | Vardagar 07–16 (gammal forumuppgift) | Mycket gammal forumuppgift – Linde/AGA:s industridepå i Svedala fyller sannolikt inte privatflaskor längre. Lägg INTE in utan färsk bekräftelse. |
| GasolToll, Strängnäs | Strängnäs | low | Historiskt 27,75 kr/kg (2011) och 29,25… | – | Troligen NEDLAGD eller okänd status – enbart forumtrådar 2011–2013, inga träffar 2020-talet, ingen adress/webb. Finns inte i Energigas/myLPG/gasolkartan-listor… |
| ABC-Gasol (Vallentuna) | Okvistavägen 11, Vallentuna | low | Forum: 250 kr för 10/11 kg oavsett flas… | Ring innan – ägaren är ofta ute och levererar till företagskunder | Redan känd från tidigare research och medvetet INTE inlagd (motstridiga källor: lösvikt vs fast pris per flaska). Forumet upprepar 'fyller din egen flaska' + f… |
| Bosses Gasol (Göteborg) | Göteborg | low | – | – | Troligen nedlagd/ersatt (GasolGöteborg Marieholmsgatan och Gasolfyllarna Backa täcker Göteborg idag). ÖP Energi Linköping, Gasoltjänst Åhus och Norsk Hydro Bol… |

## Befintliga poster som behöver `gasol_pafyllning` tillagt – 3 st

| Plats | Adress | Conf. | Pris | Öppettider | Anmärkning |
|---|---|---|---|---|---|
| Gasolbolaget Johnny Ygdevik AB | Sandvägen 17, Växjö | medium | – | 1 maj–31 aug: mån–fre 08–17; 1 sep–30 apr: mån–fre 08–16 | saknar gasol_pafyllning i registret \| saknar gasol_pafyllning. Uppgiften 'byta eller fylla din gasolflaska' + öppettider dök upp i en sökning där energigas.se… |
| Höllvikens Gasol | Långeväg 244, Höllviken | medium | – | mån–fre 18.30–20, lör–sön 10–15 | saknar gasol_pafyllning i registret \| saknar gasol_pafyllning – befintlig post är bara byte (automat). Branschlistan tar upp platsen som TANKSTATION med beman… |
| Levol – gasoldepå Landvetter (fyllning efter bokning) | Västra Björrödsvägen 1, Landvetter | medium | Pris ej publicerat. | Endast efter bokning (bokningsförfrågan via sajten) | saknar gasol_pafyllning i registret \| saknar gasol_pafyllning. Medium eftersom sidan riktar sig mot restaurang/företag och fyllning bara sker efter förbokning… |

## Befintliga påfyllningsposter – bekräftade, med rättelser/kompletteringar – 39 st

| Plats | Adress | Conf. | Pris | Öppettider | Anmärkning |
|---|---|---|---|---|---|
| Gasbolaget i Dalarna AB, Falun | Ragvaldsberg 4, Falun | high | Pris ej publicerat. Energigas: betalsät… | Mån–tors 07:00–16:30 (lunch 12:00–12:40), fre 07:00–13:00; helg stängt | Bekräftad (byte + fyllning). Lägg till öppettider + telefon. Forum placerar den 'i Staberg vid väg 266 Falun–Hedemora'; myLPG säger 'väg 69, 11 km från Falun' … |
| Gasolfyllarna Gävle | Utmarksvägen 21, Gävle | high | 29.9 kr/kg | Mån–fre 08.00–16.00 (apr–aug 08.00–17.00), lunchstängt 12.00–12.30; lör 10.00–14.00 (apr–sep) | Lägg till telefon + säsongsöppettider. Befintlig url pekar bara på startsidan – byt till stationssidan. \| Stämmer. Komplettera med öppettider och att LPG-tank… |
| Gasolstationen i Halmstad | Verkstadsgatan 4, Halmstad | high | 42 kr/kg | Mån–fre 12–17 (tors till 18), lör 10–13, sön/helg stängt (myLPG.eu, bekräftad senaste 3 mån) | Befintlig OSM-post 'LPG Flygstadens Gasol' (56.673, 12.803, Flygstaden) är ~6 km bort. Enligt gasolstationen.se finns vid Flygstaden (bredvid ÖoB) numera bara … |
| Gasolkungen Kalmar | Kalmar Dämme (Polisens trafikplats/kontrollplats vid E22), Kalmar | high | Pris ej publicerat på egen sajt. Forum … | mån–fre 09–17; lör–sön 10–15 (1 maj–31 aug) | Bekräftad aktiv (egen sajt + myLPG). Komplettera med telefon och öppettider. Oklart om helgöppet gäller bara sommar – myLPG: 'from May to end of August open Sa… |
| Timmernabbens Karamellfabrik | Timmernabbsvägen 4 (avfart Kronmunken, E22), Mönsterås | high | Betalar per kilo; minsta debitering 150… | mån–fre 09–16; lör 11–13 | Bekräftad aktiv (egen sajt). myLPG anger Timmernabbsvägen 2, bensinpriser.nu och egen sajt anger 4. Forum-GPS N57°01'25,5 E16°25'55 ≈ 57.0237/16.4319 stämmer m… |
| GasolEsset Ljungby | Nyponvägen 6, Ljungby | high | 39 kr/kg | mån–tors 10–15, fre 10–17, lör 10–13, sön stängt | Bekräftad fortfarande aktiv (egen sajt). Lägg till pris 39 kr/kg. Även LPG-tankning av fast tank ('Tanka LPG'-sida). Adress ej synlig i sökträffen – Nyponvägen… |
| Gasspecialisten Kiruna | Lastvägen 44, Kiruna | high | Pris ej publicerat i sökbara källor. | Mån–fre 07:00–16:00, lör–sön stängt (near-place.com/Facebook) | Stämmer. Komplettera med telefon, öppettider och att de även tankar LPG/fasta tankar. Byggmax Kiruna (Lastvägen 54, byte) ligger på samma gata – ingen dubblett. |
| Gasolfyllarna Örebro | Berglundavägen 12A, Örebro | high | 29.9 kr/kg | Mån–fre 07.30–17.30, lör 10.00–16.00 | Egna sajten anger 12A, appen/myLPG anger 12B – samma byggnad, välj 12A (egen källa). Lägg till telefon + öppettider. \| Bekräftad. Husnummer skiljer (12A Energ… |
| Gasolproffsen (Skydd & Verktyg i Örebro AB) | Handelsgatan 3, Örebro | high | 38 kr/kg | Mån–fre 08:00–17:30, lör 09:00–14:00, sön stängt | Bekräftad, 38 kr/kg stämmer. Lägg gärna till öppettider + telefon. Återförsäljarna Frövi Bilservice (Vannebodagatan 15, Frövi, 0581-305 34) och Frendo Mellring… |
| Gasolfyllarna Linköping | Idögatan 4, Linköping | high | 29.9 kr/kg | Mån–fre 07.30–17.30, lör 10.00–16.00, sön stängt (enligt gasolkartan.se) | Befintlig post saknar adress (addr null) – fyll i Idögatan 4, telefon och öppettider. \| Bekräftad aktiv. Befintlig post saknar adress – lägg till Idögatan 4 +… |
| Gasolfyllarna Norrköping | Moa Martinsons gata 14, Norrköping | high | 29.9 kr/kg | Mån–fre 07.30–17.30 (lunchstängt 12.00–12.30), lör 10.00–16.00, sön stängt | Befintlig OSM-post (osm-node-1376659170, 58.5804/16.1300) saknar adress och heter bara 'Gasolfyllarna' – komplettera med adress, telefon, öppettider och namnet… |
| GasolEsset Åhus | Flötövägen 233, Åhus | high | 34 kr/kg | Vardagar 08:00–17:00, lör 08:00–13:00, sön 10:00–13:00 | Bekräftad – befintlig OSM-post 'Ahus Gas Ahus' bör döpas om till 'GasolEsset Åhus' och få adress Flötövägen 233, pris 34 kr/kg, öppettider och telefon. Kontrol… |
| Gasoldepån Simmelsberga (Husvagnsdepån) | Simmelsberga (mellan Ekeby och Kågeröd), Bjuv | high | 30 kr/kg | – | Bekräftad, pris 30 kr/kg stämmer. Inga nya uppgifter om de begränsade tiderna (må 15–18/to 16–19) i sökresultaten. |
| Gasolstationen (Väla, Helsingborg) | Välamarknaden 5, Helsingborg | high | 42 kr/kg | Mån–fre 12–17, lör 10–13 (lör endast apr–sep), sön stängt (myLPG.eu) | Befintlig post saknar pris – sätt 42 kr/kg. Gamla adressen Hävertsgatan 33 (Stattena, bakom Flügger färg) är nedlagd/flyttad – ligger fortfarande kvar som egen… |
| Himlastallet i Slagtofta | Slagtofta 4010, Hörby | high | – | Mån–fre 08:00–17:00, lör–sön 10:00–14:00 | Bekräftad. Även i Energigas Sveriges lista (Slagtofta 4010, 242 94 Hörby, 070-2651880). Komplettera med öppettider och telefon. \| Bekräftad av branschlistan. … |
| Gasolkungen Kristianstad (Nöbbelöv) | Per Mattissonsväg 47, Kristianstad | high | Pris ej publicerat i sökresultat ('olik… | Mån–fre 08:00–17:00 (annan sida: 09:00–18:00), lör–sön 10:00–16:00 | Bekräftad – befintlig OSM-post bör döpas om till 'Gasolkungen Kristianstad', få adress Per Mattissonsväg 47, öppettider och telefon. Öppettiderna anges olika p… |
| Gasol Malmö LPG AB (Norra hamnen) | Bjurögatan 48, Malmö | high | Betalning per kilo; pris ej publicerat … | Mån–fre 10:00–17:00, lör 10:00–14:00 (lunch 12:30–13:00) | Bekräftad. Egen sajt anger Bjurögatan 48, medan myLPG/Energigas (och befintlig post) anger Bjurögatan 50 – samma kvarter, ändra ev. till 48. Komplettera med öp… |
| GasolEsset Örkelljunga (Skåneporten) | Skåneporten 1, Örkelljunga | high | 34 kr/kg | – | Bekräftad – befintlig OSM-post 'Örkelljunga Gasol' bör döpas om till 'GasolEsset Örkelljunga', få adress Skåneporten 1 och pris 34 kr/kg. Ligger vid Circle K S… |
| GasolEsset Trelleborg | Sjöviksvägen 11, Trelleborg | high | 37 kr/kg | Vardagar 09:00–17:00 (lunch 12:00–12:45), lör 09:00–14:00, sön stängt; LPG-pump för fordon/fast tank dygnet runt | Bekräftad. Lägg till öppettider/telefon. Prisuppgift osäker (28 eller 37 kr/kg). myLPG: 'allows all remote fill and Safefill bottles'. \| myLPG-användare rappo… |
| Gasolmacken Nyköping | Spelhagsvägen 6, Nyköping | high | 52 kr/kg | Mån–fre 09.00–17.00, lör 10.00–14.00 | Stämmer. Lägg till telefon + öppettider. \| Appens prisnotis säger 'kr/kg-pris ej bekräftat för Nyköping' – gasoltuben.se (ägarbolaget) anger nu 52 kr/kg för s… |
| Gasolfyllarna Stockholm/Järfälla | Nettovägen 5, Järfälla | high | 29.9 kr/kg | Högsäsong mån–fre 08–17, lör 10–14; lågsäsong mån–fre 08–17 (gasolfyllarna.se). Gasolkartan anger i stället mån–fre 07.30–17.30, lör 10–16 – motstridigt. | Befintlig adress är bara 'Veddesta företagspark' – komplettera med Nettovägen 5. Öppettider motstridiga mellan egen sajt och gasolkartan – använd egna sajtens.… |
| Gasolfyllarna Stockholm/Jordbro | Lillsjövägen 15, Jordbro | high | 29.9 kr/kg | Mån–fre 08.00–17.00; lör (apr–sep) 09.00–15.00, lör (okt–mar) 10.00–14.00; sön stängt | Stämmer. Lägg till postnummer, telefon och säsongsöppettider. \| Bekräftad; öppettider kan läggas till. \| Bekräftad. Lägg till telefon + öppettider. |
| Gasolfyllarna Norrtälje | Campus Roslagen (bakom Norrteljeporten), Norrtälje | high | 29.9 kr/kg | Mån–fre 08.00–17.00, lör 10.00– (sluttid ej synlig i källan) | Bekräftad, oförändrad. Har egen Facebook-sida. \| Gatuadress hittades inte i sökresultaten (bara 'Campus Roslagen'). Stämmer i övrigt. |
| Gasolfyllarna Nynäshamn | Teknikervägen 17B, Nynäshamn | high | 29.9 kr/kg | Mån–tor 08.00–17.00, fre 08.00–16.00, lör–sön stängt | Stämmer. Lägg till öppettider. \| Bekräftad (ej omläst i detalj – adress från appens tidigare koll). |
| Gasolfyllarna Stockholm/Tullinge | Hamringevägen 1, Tullinge | high | 29.9 kr/kg | Mån–fre 07.30–17.30, lör 10.00–16.00, sön stängt | Befintlig adress är bara 'Hamringe företagspark' – komplettera med Hamringevägen 1, telefon och öppettider. \| Bekräftad; gatuadress Hamringevägen 1 (myLPG) ka… |
| Gasolfyllarna Värmdö | Mörtnäsvägen 4, Värmdö | high | 29.9 kr/kg | – | Stämmer. Öppettider hittades inte. \| Bekräftad, oförändrad. |
| Gasolfyllarna Enköping | Romgatan 16, Enköping | high | 29.9 kr/kg | Mån–fre 08.00–17.00 (lunchstängt 12.00–12.30), lör–sön stängt | Stämmer. Lägg till telefon + öppettider. \| Bekräftad; telefon + öppettider kan läggas till. \| Bekräftad. Lägg till telefon + öppettider. |
| Gasolmacken Uppsala | Gamla Uppsala 17, Uppsala | high | 52 kr/kg | Sep–mar: mån–fre 10–17. Apr–aug: mån–fre 09–17, lör 10–14 (myLPG.eu) | Bekräftad. Prisuppgiften i appen (52 kr/kg) stämmer men bör kompletteras: tom flaska = fast pris 260 kr. Öppettider är säsongsberoende (ovan). Bara 'byte utgån… |
| Gasol Center Karlstad (f.d. Gasolfyllarna Karlstad) | Fjärrviksvägen 6, Karlstad (Skåre) | high | 40 kr/kg | Mån–fre 06.30–18.00, lör 10.00–14.00, sön 12.00–16.00 (apr–aug) | Bekräftat lösvikt. Lägg till pris 40 kr/kg, telefon och öppettider. Gasolkartan/husbilsplats listar fortfarande stället under gamla namnet 'Gasolfyllarna i Kar… |
| Gasolbutiken (Piscators Bil), Storfors | Industrigatan 3, Storfors | high | 41 kr/kg | mån–tors 07–17, fre 07–13 | Stämmer. Lägg till postnummer + telefon. Öppettider hittades inte. \| Bekräftad. Lägg till telefon 0550-622 83 och notisen om 200 kr fast pris för ≤2 kg. Öppet… |
| Gasoldepån i Sundsvall AB (Svartvik) | Hyvelvägen 8, Kvissleby | high | kr/kg-pris för flaskfyllning ej publice… | Mån–fre 08:00–16:00, lör 08:00–14:00, sön stängt (öppettider.nu/gasoldepan.se) | Uppgifterna stämmer: fortfarande aktiv (myLPG-prisrapport apr 2026). Befintlig OSM-post saknar telefon, webbplats och öppettider – komplettera. Fyller även for… |
| GasolGöteborg | Marieholmsgatan 60, Göteborg | high | 36 kr/kg | Mån 12–17, tis–ons stängt, tors 12–18, fre 12–15 ("för hjälp övriga tider ring") | Befintlig post stämmer (pris 36 kr/kg). Komplettera med öppettider och telefon. Kosan Gas partnerlista anger 'Gasolautomat.se, Marieholmsgatan 60' – samma plat… |
| Gasoldirekt / Svenska Gas & Gasol – Skepplanda | Knuts väg 40, Skepplanda industriområde, Skepplanda | high | Äldre forumuppgift 25 kr/kg (husbilsklu… | Mån 14.00–18.00, ons 14.00–18.00; övriga dagar stängt (säsongsvarierande – kolla hemsidan) | Bekräftad – koordinaten är identisk. Befintlig post saknar adress; lägg till Knuts väg 40 + telefon. Svenska Gas & Gasol AB marknadsför sig som 'Svenska gas/Sk… |
| Gasolfyllarna Göteborg/Hisings Backa | Transportgatan 5B, Hisings Backa, Göteborg | high | 29.9 kr/kg | Mån–fre 07.30–17.30, lör 10.00–16.00, sön stängt | Stämmer. Lägg till öppettider. \| Befintlig post stämmer. Komplettera med postnummer och telefon. Öppettider ej synliga i sökutdrag. Finns även på gasolkartan.… |
| Gasolfyllarna Trollhättan | Ljungvägen 5, Trollhättan | high | 29.9 kr/kg | Mån–fre 08.00–17.00 (lunchstängt 13.00–13.30), lör–sön stängt | Stämmer. Lägg till öppettider. \| Befintlig post stämmer. myLPG.eu listar 'CRM Caravan o Resemobil AB' på exakt samma adress (Ljungvägen 5) – troligen husbilsh… |
| GT Petroleum – Gasoli Karlshamn | Tenngränden 2, Karlshamn | medium | Befintlig post: 29 kr/kg (gasolikarlsha… | mån–tors 14–18, fre 13–17 | Bekräftad. Befintlig koordinat 56.17/14.86 är ~1,5 km fel – uppdatera till 56.16058/14.84300. Lägg till öppettider (OBS begränsade eftermiddagstider). \| Bekrä… |
| Kem och Gas AB (KemGas) | Barnhemsgatan 20, Jönköping | medium | – | mån–fre 07–16 (lunchstängt 12.30–13.30) | Egen sajt kem-gas.se är egress-blockad och gav inget innehåll via sökning; äldre egen sida privat.bahnhof.se/wb409702/KemGas/ finns också. Belägget kommer från… |
| Barkmans Industri AB, Eskilstuna | Hejargatan 9, Eskilstuna | medium | myLPG: 18,63 kr/liter (2025-09-17), dvs… | Fyllning: mån–fre 07:00–12:00, 12:45–16:00 (lunchstängt), helger stängt. Gasolautomat (byte) dygnet runt | Bekräftad (branschlista + myLPG). Barkmans egen sajt nämner bara automaterna/byte i sökutdragen – lösviktsbelägget kommer från Energigas + myLPG. Appens post s… |
| Aniol Gasol AB | Hagaslättsvägen 210, Ekeby (Bjuv) | low | Bara gamla forumpriser (P11 269–285 kr,… | Mån–fre 09:00–18:00, lör 08:00–13:00 (enligt bensinpriser.nu/forum) | Ligger mellan Ekeby och Billesholm (inte Munka-Ljungby/Ängelholm som uppdraget antog). Egen sajt aniolgasol.se dök inte upp i sökresultaten – ingen färsk egen … |

### Viktigaste rättelserna av befintliga poster

- **LPG Flygstadens Gasol** (OSM-nod, Halmstad): stationen heter nu
  **Gasolstationen Halmstad** och ligger på Verkstadsgatan 4 (42 kr/kg,
  vardagar 12–17, lör 10–13 apr–sep). Vid Flygstaden finns numera bara en
  byte-automat. Byt namn + flytta koordinat (myLPG-koordinaten i JSON).
- **Gasoldirekt i Väst AB** (Skepplanda): bolaget heter/marknadsförs nu
  **Svenska Gas & Gasol AB** (svenskagas.se), Knuts väg 40, mån/ons 14–18,
  tel 073-967 55 81. Forumpriset 25 kr/kg är ~10 år gammalt – ta bort.
- **Nöbbelövs Gasol & Entreprenad** → **Gasolkungen Kristianstad**, Per
  Mattissons väg 47, tel 073-448 48 11/42.
- **Ahus Gas Ahus** → **GasolEsset Åhus**, Flötövägen 233, 34 kr/kg, vard
  08–17/18, lör 08–13, sön 10–13.
- **Örkelljunga Gasol** → **GasolEsset Örkelljunga**, Skåneporten 1, 34 kr/kg.
- **Gasolfyllarna** (namnlös OSM-nod Norrköping) → Gasolfyllarna Norrköping,
  Moa Martinsons gata 14. **Gasolfyllarna Linköping** saknar adress → Idögatan 4.
  Örebro: egen sajt säger Berglundavägen 12**A** (appen 12B). Tullinge =
  Hamringevägen 1, Järfälla = Nettovägen 5.
- **GasolEsset Ljungby**: appens adress Nyponvägen 6 är Byggmax adress
  (norbro.se); Energigas anger Helsingborgsvägen 9. Pris 39 kr/kg.
- **Gasol Malmö LPG AB**: egen sajt säger Bjurögatan **48** (appen 50). Ny
  andra anläggning i **Limhamn** (Bryggövägen, småbåtshamnen).
- **Gasolmacken Uppsala/Nyköping**: prismodell tom flaska = fast 260 kr,
  delvis fylld = 52 kr/kg (gasoltuben.se). Säsongsöppettider i JSON.
- **Barkmans Eskilstuna**: ca 36 kr/kg (18,63 kr/l), minst 17 l annars 299 kr;
  fyllning mån–fre 07–12, 12:45–16.
- **Gasol Center Karlstad**: 40–45 kr/kg (två källor), tel 054-774 50 44.
- **GasolEsset Trelleborg**: myLPG-rapport "temporarily out of order"
  20 apr 2026; pris motstridigt (28 vs 37 kr/kg) på egen sajt.
- **Gasbolaget i Dalarna**: Energigas-listans koordinat 60.55789/15.77475
  ligger ~11 km från appens – verifiera på karta.
- Koordinatavvikelser 1,5–4 km mot Energigas-listan: Gasolkungen Kalmar,
  Gasolfyllarna Hisings Backa, Gasolmacken Uppsala, Himlastallet, Karlshamn,
  Storfors, Höllviken – listans koordinater finns i JSON.
- **Aniol Gasol AB**: ligger i Ekeby (Bjuv), Hagaslättsvägen 210 – endast
  forumbelägg 2011–2015. Bör verifieras att den är i drift.

## Endast fast monterad tank (INTE lös flaska) – 6 st

| Plats | Adress | Conf. | Pris | Öppettider | Anmärkning |
|---|---|---|---|---|---|
| Svetskompaniet Borås | Verkstadsgatan 5, Borås | high | Byte P11 365 kr inkl. moms; tankfyllnin… | Mån–fre 07–16.30; fyllning av fast tank fredagar 08–15.30 | Befintlig post stämmer: ENDAST fast monterad tank på fredagar, inga lösa flaskor. Ingen ny information hittad. |
| Skaraborgs Gasol & Oljor AB, Skövde | Norregårdsvägen 18, Skövde | medium | – | Mån–fre 07.30–16.30 (lunch 12.00/12.30–13.00), lör–sön stängt; automater dygnet runt | Befintlig post (bara gasol_byte) är KORREKT – 'påfyllning' på sajten avser bolagets egen fyllning av bytesflaskor, inte kundens lösa flaska. Även Lidköping/Fal… |
| Bilservice i Kylinge AB (Kylinge Bil) | Kylingevägen 20, Sölvesborg | low | Fordonsgas 15 SEK/l (myLPG 4 jun 2024) | Mån–ons 07:30–16:15, tors–fre 07:30–15:00, lör–sön stängt (myLPG); telefontid 09:15–14:00 | Husbilsverkstad som tankar fast monterade/Alugas-tankflaskor. Påfyllning av vanlig lös flaska (P11/PC10) EJ belagd – ring innan inläggning som gasol_pafyllning… |
| Lantz Järn & Metall Gotland AB (f.d. Visby Återvinning AB) | Smidesgatan 1, Visby | low | myLPG: LPG 19 kr/liter (bekräftat 27.03… | – | BÄSTA GOTLANDS-KANDIDATEN men OBEKRÄFTAD för lös flaska. Enda platsen på Gotland i myLPG (LPG-pump finns, dvs fast tank troligen OK). Egen sajt nämner bara köp… |
| Qstar Oil, Linköping | Norra Stånggatan 13, Linköping | low | – | 1/5–31/8 08.00–16.00; 1/9–30/4 08.00–16.30 | OKLART om lös flaska. Listan är 'tankstationer' och Qstar är oljebolagsdepå – troligen tankning av fordon/fast tank under kontorstid. stallplatserna.se listar … |
| Preem Nacka (Vattenverksvägen) – LPG-pump | Vattenverksvägen 2, Nacka | low | Forum: 8,15 kr/liter (≈16,30 kr/kg) vid… | – | Bekräftar appens tidigare beslut: autogaspump, ingen personalfyllning av vanliga lösa flaskor. Bara relevant för fast tank/Wynen-system. Lägg inte in som gasol… |

## Kontrollerade platser som INTE fyller lös flaska – 32 st

Byte/automat, fordonsgaspump, återförsäljare eller nedlagda. Flera saknas i
appen som *byte*-platser (t.ex. Allgas CMS Göteborg, Skoogs Bränsle
Kalix/Kiruna/Luleå, Skelleftebränslen, OKQ8 Piteå, Frendo Brålanda/Mellringe,
Frövi Bilservice) – utanför detta uppdrag men värda ett byte-svep.

| Plats | Adress | Conf. | Pris | Öppettider | Anmärkning |
|---|---|---|---|---|---|
| Gasolfyllarna – gasolautomat Kungsbacka | Kungsbacka | high | Automat – priset visas i automatens dis… | Dygnet runt (automat) | Bekräftat ENDAST byte (automat), ingen lösviktsdepå i Kungsbacka. Befintlig post korrekt som gasol_byte. |
| Frövi Bilservice AB | Vannebodagatan 15, Frövi (Lindesbergs kommun) | high | – | Mån–fre 07:00–18:00, lör–sön 10:00–13:00 | Bara BYTE (källan säger uttryckligen 'ej lösvikt'). Ny byte-kandidat för Lindesberg/Frövi som saknas i appen. |
| Frendo Mellringe | Nejlikegatan 2A, Örebro | high | – | – | Bara BYTE. Ny byte-kandidat (Örebro väst). |
| Gasolkompaniet i Syd – Lomma | Lomma | high | – | Automater dygnet runt | manuell fyllning STÄNGD \| Befintliga fyra Gasolkompaniet-poster (Lomma, Toftanäs, Staffanstorp, Trelleborg) är korrekt satta som enbart byte. Påfyllning av lö… |
| Skånegas / Gasol 24/7 – gasolautomater (Eslöv, Landskrona, Laholm, Karlshamn) | Eslöv / Landskrona / Laholm / Karlshamn | high | – | Dygnet runt | Enbart byte – befintliga Gasol 24/7-poster (Eslöv, Landskrona, Laholm, Karlshamn) är korrekta. Ingen lösviktsfyllning hittad hos Skånegas (Dalby/Landskrona). S… |
| Gasolfyllarna – gasolautomat Vasa Handelsplats, Södertälje | Vasa Handelsplats, Södertälje | high | Automat – priset visas i automatens dis… | Dygnet runt | Bara BYTE – appens post är korrekt. Närmaste lösvikt för Södertälje är Tullinge/Nyköping. \| Bekräftat ENDAST byte (automat). Befintlig post korrekt som gasol_… |
| Allgas CMS AB | Ringögatan 2, Göteborg | high | – | – | ENDAST byte (Primagaz), ingen lösviktsfyllning. Verkar saknas i appen som byte-plats – kan läggas till som gasol_byte. Kosan Gas listar den som 'partner' men d… |
| Melleruds Nya Järn AB / Ute & Inne | Nygatan 7, Mellerud | high | – | – | Befintlig byte-post korrekt; ingen lösviktsfyllning. Gatuadress Nygatan 7 kan kompletteras. |
| GGM Gas & Gasolmästarna, Västra Frölunda | August Barks gata 7, Västra Frölunda | high | Byte från 199 kr (automat) | Butik: mån 09–17, fre 09–16 (enligt sajt – övriga dagar ej angivna); automat dygnet runt | Befintlig post (bara byte) är korrekt – ingen påfyllning av lös flaska belagd. |
| AB Malungs Nya Vulk – gasol (AGA) | Grönlandsvägen 2A, Malung | medium | – | Mån–fre 07:00–16:15 (frukost 09:00–09:30, lunch 13:00–13:45) | Formuleringen 'fyll gasol' + 'byt din flaska ... färdigfylld' + AGA-återförsäljare = BYTESSYSTEM, inte lösvikt. Rapporteras som byte-kandidat (Malung saknas he… |
| Unax gasolautomat (Björkhamrevägen) | Björkhamrevägen 6, Ljusdal | medium | – | Dygnet runt (automat) | Endast byte (automat). Tas med för fullständighet – ny byte-plats som saknas i appen. \| Påfyllning av LÖS flaska är INTE belagd – sajten talar uttryckligen om… |
| Expressgasol – gasolautomat Tingsryd | Tingsryd | medium | – | dygnet runt (automat) | ENDAST BYTE (automat). Gatuadress saknas fortfarande – expressgasol.se har ingen egen Tingsryd-sida i sökträffarna (bara Alvesta/Oskarshamn/Växjö m.fl.). Kvar … |
| Skoogs Bränsle Kalix | Hangarvägen 6, Kalix | medium | – | Mån–fre 07:00–16:00 (skoogsbransle.se/butiker) | Endast byte/försäljning. Kalix saknar helt gasolplats i appen i dag. Skoogs har även butiker i Kiruna (Maskinvägen 7, 981 38) och Gällivare/Piteå (gatuadress e… |
| Skoogs Bränsle Kiruna | Maskinvägen 7, Kiruna | medium | – | – | Endast byte/försäljning. |
| Skoogs Bränsle Luleå (Storheden) | Besiktningsvägen 2, Luleå | medium | Forum (husbilsklubben, 2025): "Skoogs B… | Mån–fre 07:00–16:30 (skoogsbransle.se/butiker) | Endast byte belagt. Ny byte-plats som saknas i appen (Luleå har bara Byggmax + Circle K Gammelstad i dag). Att de byter tyska flaskor är ovanligt och värdefull… |
| OKQ8 Piteå (Oktanvägen) | Oktanvägen 4, Piteå | medium | Forum (husbilsklubben, 2025): "Q8 var d… | Vardagar 06:00–22:00, lör 07:00–22:00, sön 07:00–22:00 (varligger.se) | SVAR PÅ MISSTANKEN: platsen ligger i PITEÅ (Oktanvägen 4, 941 38), inte Luleå – riktnummer 0911 stämmer med Piteå. Den finns som 'OK-Q8 Piteå' på myLPG.eu och … |
| Skelleftebränslen AB | Metallvägen 9, Skellefteå | medium | Forum (äldre): "PK10 240 kr exkl. moms"… | – | SVAR PÅ SKELLEFTEÅ-FRÅGAN: ingen påfyllningsplats hittad. Forumbelägg säger tvärtom att man INTE kan fylla i Skellefteå, bara byta. Skelleftebränslen är ny byt… |
| Frendo Brålanda | Göteborgsvägen 1, Brålanda | medium | – | Mån–fre 07–21, lör 08–21, sön 09–21 | ENDAST byte – Kosan listar den under 'flaskfyllare och tankning' men Norbro-sidan beskriver bara byte. Ny byte-plats för Dalsland (saknas i appen). Ingen lösvi… |
| AB Harry Perssons Byggnadsvaror | Hosabyvägen 26, Sölvesborg (Mjällby) | low | – | – | EJ VERIFIERAD. Järn-/byggvaruhandel; ingen källa nämner gasol alls. Lägg inte in utan annan källa. |
| Bilcompaniet AB | Slitevägen 34, Visby | low | Forum (äldre): 'tar 350 kr för en P11' … | vardagar 08–17; lör 10–13; sön 11–14 | Troligen ENDAST BYTE (fast flaskpris). Inte i appen alls – kandidat för gasol_byte på Gotland (som är helt tomt utöver Byggmax/jem&fix/Järn AB Södertorg/Snicke… |
| Gasmontage i Göteborg AB – Kungsbacka (Freeport) | Arendalsvägen 27, Kungsbacka | low | Forum: '280 kr' (fast pris, oklart om b… | – | Bara gammal forumuppgift – ingen ändring föreslås (befintlig post = byte). Ingen lösviktsfyllning i Kungsbacka hittad; 'Gasolfyllarna – gasolautomat Kungsbacka… |
| Biofuel Express AB (v/Bergkvarabuss) | Gunnestorpsvägen 5, Varberg | low | – | – | Troligen fordonsgas-/biodrivmedelspump vid bussdepå – INTE flaskfyllning. Räknas inte. Nämns bara för att undvika att den plockas upp av misstag (befintlig 'Ga… |
| Luneco AB | Kaffekullevägen 2, Eksjö | low | 284 kr för byte PC10 (forum, äldre) | – | ENDAST BYTE, gammal forumuppgift. Ej verifierad. |
| GGM Gas & Gasolmästarna Värnamo | Fredsgatan 25, Värnamo | low | 290 kr för byte P11 (2011) | mån, tor, fre 10–17; lör 10–13 (forum 2011 – troligen inaktuellt) | ENDAST BYTE enligt forum, dessutom 15 år gammal uppgift. GGM (Gas & Gasolmästarna) finns i appen för V. Frölunda; Värnamo-filialen saknas. Verifiera existens i… |
| Husvagnscenter i Luleå AB | Betongvägen 7, Luleå | low | – | Mån–fre 10:00–17:00, lör 10:00–14:00 (eniro) | Endast återförsäljare av Alugas tankflaskor enligt källan; ingen belagd påfyllning. Tas med så att den INTE läggs in av misstag. Husbilsklubben-tråden 'Gasolpå… |
| Camp4you AB | Voltgatan 9, Piteå | low | Forum: "320 kr för en PA11" (per flaska… | – | Husbils-/husvagnshandlare. Endast forumbelägg, priset är per flaska → tolkas som byte. Ej påfyllning. |
| Koaro AB | Roxtorpsgatan 16, Linköping | low | – | mån–tor 06:30–16:00; fre 06:30–13:00 | ENDAST BYTE (Linde-depå, återförsäljare av AGA-gasol). Inget som helst belägg för påfyllning av lös flaska – bör inte få gasol_pafyllning. Kan läggas in som ga… |
| BG Gas & VVS Service AB | Kiselgatan 31, Norrköping | low | – | – | ENDAST BYTE (Linde-återförsäljare). Inget belägg för påfyllning. Gasolfyllarna Norrköping finns 3–4 km bort och är rätt plats för påfyllning. |
| Lööfs Gasol AB, Karlstad (butik + automat) | Kulinggatan 13, Karlstad (Örsholmen) | low | P11 byte 395 kr (appens tidigare uppgif… | Automat dygnet runt; butik dagtid | INGET belägg för lösviktsfyllning av kundens egen flaska – bara byte (butik + automat) och Lööfs egen industrifyllning. Appens byte-poster (Karlstad + Kil) är … |
| Husbilslandet Kristinehamn | Bäck, Kristinehamn | low | – | – | INTE bekräftat. Lägg inte in som påfyllning. GASIP Kristinehamn (Hamnvägen 6) är det belagda stället i Kristinehamn. \| Bara EN branschlista (Kosan) och egen s… |
| Expressgasol Tidaholm | Tidaholm | low | – | – | Bara byte-automat i bästa fall; adress fortfarande okänd (JS-karta). Ingen påfyllning. |
| Preem Järnbrottsmotet, Västra Frölunda | Axel Adlers gata 3, Västra Frölunda | low | – | – | Troligen Kosans fordonsgas-/autogaspump ("tankning"), inte lösviktsfyllning av flaska – inget citat om flaskfyllning. Befintlig byte-klassning behålls. Ej veri… |

## Svar på specifika frågor i uppdraget

- **OK/Q8 Luleå Oktanvägen**: ligger i **Piteå** (Oktanvägen 4, 941 38, tel
  0911-160 20). Bemannad mack med flaskbyte, ingen belagd påfyllning.
- **Ystad Gasol / Eslöv Gasol**: samma bolag (Ystad Gasol AB, tel
  073-345 96 48) med två riktiga stationer – Södra Zinkgatan 16 Ystad och
  Gustavslundsvägen 4 Eslöv. Den tidigare misstanken om "kopierad
  boilerplate" var alltså fel; texten är bolagets egen på båda sidorna.
- **ABC Gasol Vallentuna**: fyller kundens egen flaska men tar fast pris
  (250→280 kr). Belägg bara forum 2009–2015 + katalog → low/grå.
- **Skaraborgs Gasol Skövde**: fyller INTE lösa flaskor (myLPG: "filling of
  external gas bottles not permitted"); Lidköping bara byte.
- **Lööfs Karlstad/Kil**: bara byte. **Husbilslandet Kristinehamn**: bara
  Kosan-listan, egen sajt tiger → low. **GASIP Kristinehamn** (Hamnvägen 6)
  är däremot belagd lösvikt.
- **Unax Ljusdal**: LPG-pump för fast tank + automat (byte). Lös flaska ej
  belagd.
- **Svetskompaniet Borås**: bara fast tank fredagar – befintlig post korrekt.
- **Bilservice i Kylinge, Harry Perssons Sölvesborg**: inget belägg för
  lösvikt (Kylinge = Alugas-tankflaskor; Perssons nämner inte gasol alls).
- **Skånegas Ängelholm**: noll träffar.

## Luckor – inget hittat

- **Gotland**: ingen påfyllning belagd. Lantz Järn & Metall Visby är enda
  LPG-pumpen (fordon), okänt om flaskor. Bilcompaniet Slitevägen 34 tar fast
  pris 350 kr/P11 → troligen byte.
- **Öland**: ingen. Åhus Gasols filial i Borgholm nedlagd enligt forum.
- **Norrland**: bara Gävle, Hudiksvall (medium), Svartvik/Sundsvall, Öjebyn/
  Piteå och Kiruna. Umeå/Skellefteå/Östersund/Örnsköldsvik: forum säger
  uttryckligen "bara byte". En 2025-tråd på husbilsklubben nämner EN
  påfyllningsplats i Luleå utan namn (tråd 49208 – läs i webbläsare).
- **Dalarna**: Falun + Orsa (Tallheds Plantskola, ny). Borlänge/Mora/Ludvika/
  Avesta: inget.
- **Småland**: Jönköping, Ljungby, Växjö (medium), Kalmar, Timmernabben,
  Häradsbäck (medium). Västervik/Oskarshamn/Vimmerby/Nässjö/Värnamo: inget.
- Inga träffar heller för Strömstad, Lysekil, Tjörn, Kungälv, Alingsås,
  Mariestad, Skara, Falköping, Katrineholm, Köping, Arboga, Arvika, Torsby,
  Lund, Landskrona, Karlskrona, Ronneby, Sölvesborg, Osby, Tomelilla.

## Kunde inte verifieras (kräver webbläsare eller telefon)

- kr/kg-pris: NB Energi, GASIP, Svenska Gas (alla), Nossans, Ekonex, Ystad/
  Eslöv Gasol, Motala, Höllviken, Himlastallet, Gasolkungen Kalmar/
  Kristianstad, Gasoldepån Sundsvall, Gasspecialisten Kiruna, Gasolfabriken.
- Gatuadress: West Coast Gasol (Vänersborg/Vargön), Svenska Gas Orust
  (Häröd 304 – osäkert), Gasolfyllarna Norrtälje (bara "Campus Roslagen"),
  Älmhultsgasol/Häradsbäck.
- Hudiksvalls Plåt & Gasol: lös flaska vs bara fast tank.
- Höllvikens Gasol och Gasolbolaget Växjö: står som tankstationer i
  Energigas-listan men egna sajter nämner bara automat/byte.
- Södra Hamnen Motala: ställplatsen drivs av Park and Stay sedan 2022 –
  oklart om PLM Hammar fortfarande sköter gasoltappen.
- Fjärås: flytt hösten 2026 (Industriväg 6 → Lantmannaväg 11) – kolla vilket
  som gäller vid import.

## Källor värda att spara

- **gasolkartan.se** – aggregator som bara listar lösviktsstationer (adress,
  öppettider, LPG-flagga). Egress-blockad, men bra via WebSearch.
- **Energigas Sverige, "Tankstationer för gasol"** – ~30 poster med adress,
  koordinat, betalning, öppettider. Inaktuell för Helsingborg (gamla
  adressen) och saknar Kiruna/Umeå/Gotland.
- **Kosan Gas "Flaskfyllare och tankning"** – bara 4 partners synliga, alla i
  Västsverige.
- Norbro/Primagaz, Flogas, Nippon Gases: ingen lösviktsfyllning alls.
