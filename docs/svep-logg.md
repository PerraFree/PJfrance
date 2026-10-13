# Svep-logg – veckorutinen "Tömningskartan – veckosvep datakällor"

En schemalagd rutin (måndagar 05:00 UTC, fristående session) läser den här filen och kör
det fokusområde som har **äldst "senast kört"-datum**. Metoden per område står i `CLAUDE.md`.
Efter varje körning: uppdatera datumet i tabellen och lägg en rad i loggen längst ner.

## Rotation

| Fokusområde | Vad | Senast kört |
|---|---|---|
| A. Tömning latrin/gråvatten | Kommuner med 0–1 tömningsplatser: kommunsidor, turistråd, anläggningars egna sajter. Kompletteringar av befintliga camping-/ställplatsposter räknas. | 2026-10-05 |
| B. Gasol byte/påfyllning + priser | Kedjornas butikssidor (Byggmax/Granngården/Rusta/ÖoB per butik), Norbro-/Linde-/gasolautomat.se-listor, lokala påfyllningsbolag, priser. Bara 10/11 kg-flaskor (P11/PA11/PC10/PK10). | 2026-09-28 |
| C. Obekräftade platser: verifiera + fyll på | (1) Sök primärkälla för de OBEKRÄFTADE posterna i registret (`unverified: true` / `unverifiedServices`) – får de citat: ta bort obekräftat-flaggan. (2) Gör om lovande rader i `docs/kandidatplatser-husbilsplats-park4night.md` (tydlig tjänst + ort) till obekräftade registerposter så de syns grått på kartan. | 2026-10-12 |
| D. Kontroll av befintliga platser | Per prioriterar RÄTT före FLER: välj ~40 befintliga platser med tömning/vatten i en region (gärna campingar/ställplatser med `website`), kontrollera mot källan att tjänsterna fortfarande finns, rätta fel (ta bort tjänst, uppdatera avgift/öppettider). Golfklubbar + vattenkiosker som upptäckt-del. Uppdrag + import: `scripts/import-tools/UPPDRAG-kontroll.md`, `apply-kontroll.mjs`. Körda regioner: Västra Götaland (11 okt), Skåne (12 okt), Stockholm/Uppsala/Södermanland (12 okt), Halland + Kalmar län (12 okt), Jönköping/Kronoberg (12 okt), Östergötland/Örebro/Västmanland (12 okt), Värmland/Dalarna/Gävleborg (12 okt), Norrland + Gotland/Blekinge (12 okt). Hela landet klart – nästa varv börjar om med VG, bara platser utan "Kontroll okt 2026". | 2026-10-12 |
| E. Öppettider + vinterstängt | Platser med tömning/vatten som saknar `openingHours`/`season`: hämta säsong ("1 maj–30 sep", "vinterstängt", "året runt") från kommun-/anläggningssida. Skriv `season: 'seasonal'`/`'year-round'` + `openingHours`. Prioritera kommunala tömningsstationer och Trafikverkets rastplatser med vattenavstängning. | 2026-10-12 |

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

- **2026-10-13, C – grå poster UTAN egen webbplats (session "Gråvatten 5", #26):** 144 grå registerposter
  med tömning/vatten men bara aggregatorlänk eller ingen sajt (Gotland/Orust undantagna i väntan på Pers svar);
  80 valda (max 2 per kommun), 8 agenter × 30 sökningar via kommun/turistråd (≈215 använda, inga kvotfel).
  **33 poster uppgraderade (18 hela platser bekräftade)** med citat från kommun/turistråd/egen sajt – bl.a.
  Bödagården, Camping Tiveden, Strandstuviken, Bureå, First Camp Siljansbadet, Långnäs, Rönninge (tömning bara
  högsäsong), Tömningsplats Arboga (kommunen: inget vatten), Nyköpings hamn (latrin kvar grå – gäller båtar),
  Albacken/Mjölby. Manuellt: **Kristianstads Ställplats −latrin** (kommunens sida: "saknar … möjlighet till
  latrintömning"); **Tömningsplats Karlskrona** flyttad ~400 m till kommunens GPS för pump-outstationen;
  **Räfsnäs Camping (Rådmansö)** och **Stamhem AB (Kristianstad)** borttagna – aggregatorposter geokodade till
  fel ort (borttagna.json); Hörsjöns Camping hölls grå (under överlåtelse) och Tömningsplats Mjölby hölls grå
  (citatet gällde Albacken 1,5 km bort). camping.se räknas fortsatt som branschlista (ej primärkälla) –
  Sjötorpet och Karlsborgs Camping ligger kvar grå. **Kvar:** ~64 grå poster utan sajt, kandidatlistans rester.
- **2026-10-13, D varv 2 – Västra Götaland + bifynd (session "Gråvatten 5", Per: "kör prio 1"):** 79 platser
  i VG med tömning/vatten och egen webbplats som INTE kontrollerats i varv 1 (max 3 per kommun, 40 kommuner, 63
  register + 16 OSM) + 6 bifynd från E-svepet. 9 agenter, 173 sökningar, inga kvotfel. **Utfall: 33 ok, 28
  ändrade, 0 nedlagda, 24 oklara.** 54 registerposter uppdaterade (avgift/säsong/citat), 3 nya kontrollposter
  (Grästorps camping, Henåns ställplats +vatten, KronoCamping Lidköping). Viktigast: **Öckerö Hamn**
  +gråvatten/vatten, latrin bekräftad (hamnföreningens sajt); **Sunnanå hamn** +gråvatten; **Yttre Hamnen
  Mariestad** och **Borås Camping & Vandrarhem** – nya exakta poster sammanslagna in i gamla grå
  aggregatorposter (id behålls); **Ställplats Kiviks hamn** −ställplats (kommunens taxa: inga ställplatser
  i hamnen), latrin kvar; **Hörsjöns Camping** tömning grå (under överlåtelse sedan 31 aug 2025);
  **Kolholmarna Lysekil** stänger 31 aug 2026 (markarbete); 10 OSM-platser till grå-listan (Seglora,
  Skogsvallen, Hällevadsholm, Hunnebergs Gård, Brålands Gård, Vindön, Flötemarken, Vammerviken, Strömsnäs,
  Lisebergsbyn); namnbyten First Camp City – Strömstad, Töreboda Camping & Bad, GateBison, Lagunen Camping &
  Stugor. Bifynd: Nabbelund (vattenbrist bekräftad, vi visar inte vatten), Grums (kommunsidan listar
  stationen – står kvar), Kartåsen (bara latrin – stämmer). **Kvar/oklart:** Vänersborgs gästhamn
  (husbilsplatserna kan vara stängda sedan ~2020 – ring marinan 0521-657 09), Ramsvik, Hofsnäs latrin,
  Lökholmen, Skara Stadscamping (citat ej återfunnet), Borås GK (Pers fakta gäller). Nästa D-region: Skåne.
- **2026-10-12, E (öppettider/säsong), andra skivan (session "Gråvatten 5", vald själv):** 314 platser med
  tömning/vatten, egen webbplats och utan `openingHours`/`season` (seed 08:32); 160 valda (18 kommunala +
  142 register, geografiskt spridda syd→nord i 8 grupper), 8 agenter × 25 sökningar (199 använda, inga
  kvotfel). Nytt uppdrag `UPPDRAG-sasong.md` + `apply-sasong.mjs` (register direkt, OSM →
  `OSM_SEASON_OVERRIDES` i båda filerna). **Resultat: 70 av 160 belagda, 49 registerposter uppdaterade**
  (15 hade redan fått säsong av dagens D-svep, 3 low utelämnade: Tostarp, Ransäter, SkiStar Sälen);
  87 utan primärkälla – golfklubbar och kommunala tömningsstationer anger nästan aldrig säsong. Texter
  kortade för hand. Bifynd att ta i nästa D-varv: Sunnanå hamn nämner gråvatten (vi visar bara
  latrin/vatten); Hörsjöns Camping överlåten till ny ägare, bokningsstopp från 31 aug 2025; Nabbelund utan
  vatten/dusch fr.o.m. v. 26 2026 (vattenbrist); Grums kommun säger i sin VA-FAQ att de inte tar emot
  husbilslatrin trots stationen vid Gruvön; Kivik saknar ställplats i hamnen enligt Simrishamns taxa;
  Lidköpings kommun listar bara latrin för Kartåsen. Nästa E-skiva: de ~150 OSM-platserna med egen
  webbplats (inga valda denna gång eftersom kommun- och registerposter prioriterades), sedan registerposter
  utan webbplats via kommunsök.
- **2026-10-12, D (kontroll av befintliga platser) – Norrland + Gotland + Blekinge (session "Gråvatten
  5", vald själv):** 316 platser med tömning/vatten, 121 med egen webbplats; 81 valda (max 3 per kommun,
  38 kommuner, 45 register + 36 OSM), 6 agenter, 158 sökningar, inga kvotfel. **Utfall: 33 ok, 33 ändrade,
  0 nedlagda, 14 oklara.** Viktigast: **Septiktömningsstation Härnösand** (OSM) är en sugtömning för
  fritidsbåtar → utesluten; **Forshagaforsens Camping** var geokodad till Timrå och driften nedlagd →
  borttagen; **Saxemara** (Ronneby) är kommunens säsongsuthyrda husvagnsplatser, ingen publik tömning →
  borttagen; **ÅVC Ljusnedal** – kommunen erbjuder inte latrintömning på ÅVC → borttagen (tömning "i
  Ljusnedal" utan känt läge); **Rastplats Blåviksjön** latrin grå (källan säger nej); **Sorsele Camping**
  alla tjänster grå; **Härnösand HEMAB** +gråvatten/vatten; **Bräcke Strand** +gråvatten/latrin och säsong
  apr–okt (OSM sa 24/7 året runt); **Rosvik**, **Norrfällsviken**, **Sandsjögården** +vatten; Skabram
  −gråvatten (sajten säger nej); fem namnbyten (First Camp Arcus – Luleå, First Camp Frösön – Östersund,
  Arctic Camp Jokkmokk, Caravan Club Norsträsk, Seskarö Havsbad); 12 OSM-platser till grå-listan
  (Kraja, Åkersjöstrand, Udden, Kvarnsjö, Ristafallet, Gällivare, Stenbräcka, Måviken, Avasund, Stöde,
  Hoverberg gråvatten, Hammarstrand gråvatten); ~50 nya avgifter/säsonger. **Kvar/oklart:** Gäddede
  Camping (registrets källa ej återfunnen), Österjörn, Gränssjöarna (egna sajter tysta), Aspan Ronneby
  (säsongsuppställning – oklart för genomresande), Norrmjöle (OSM-punkten camping eller ställplats?),
  Trångsviken (vatten bara vid Magasinet – kontrollera OSM-punkt), Ljusnedal (var ligger tömningen?).
  **D-rotationen är därmed klar för hela landet (12 okt): 402 platser kontrollerade, 163 ändrade,
  0 nedlagda.** Nästa varv börjar om från Västra Götaland – välj då platser som inte har "Kontroll okt
  2026" i beskrivningen.
- **2026-10-12, D (kontroll av befintliga platser) – Värmland + Dalarna + Gävleborg (session "Gråvatten
  5", vald själv):** 213 platser med tömning/vatten, 88 med egen webbplats; 73 valda (max 3 per kommun,
  37 kommuner, 48 register + 25 OSM), 6 agenter, 144 sökningar, inga kvotfel. **Utfall: 31 ok, 28
  ändrade, 0 nedlagda, 14 oklara.** Viktigast: **Ställplats Flå Säffle** – latrin/180 kr var Nysäters
  uppgifter på samma kommunsida → latrin borttagen; **Hedemora Folkets Park**, **ForshagaDeje GK** – källan
  säger uttryckligen ingen latrin → borttagen; **Orsa Grönklitt** gråvatten "finns ej" → borttaget, året
  runt; **Tömningsplats Grums** och **Munkåsen** utan ställplats (kommunen); **Stocka Gästhamn**
  +latrin/gråvatten, **First Camp Mörudden** +latrin, **Raggsocka** +vatten; **Västanviksbadet** hade fel
  webbplats (leksandresort.se → vbcl.se); fem First Camp-namn/länkar (Duse Udde, Sommarvik, Sunne,
  Herrgårdsliv Kristinehamn, Mörudden); ~45 nya avgifter/säsonger. **Strukturell lucka:** OSM-platser
  vars egen sajt är tyst om tömning (Rengsjö, Söderhamns City Camping, Barken Lodge gråvatten, Vikarbygården
  gråvatten, Rogsta, Björkebo, Frykenbaden, Falkudden, Dalarna Älvcamping, Ställplats Dalarna, Camping Torp,
  Fox & Elk) visas fortfarande gröna – registret kan inte göra OSM-tjänster grå. Löst samma dag: speglad lista
  `OSM_UNVERIFIED_OVERRIDES` (32 platser från alla D-regioner) i båda filerna, även i synkens reservväg. **Kvar/oklart:** First Camp Malnbaden (ingen
  destinationssida – kanske inte First Camp längre), Avesta gästhamn/OKQ8 Rättvik (bara dalarna.nu), Sanda
  båthamn (båtstation?), Harsa (citat ej återfunnet), First Camp Sunne-koordinat (avrundad?). Nästa D-region:
  Norrland (Västernorrland, Jämtland, Västerbotten, Norrbotten) + Gotland/Blekinge.
- **2026-10-12, D (kontroll av befintliga platser) – Östergötland + Örebro + Västmanland (session
  "Gråvatten 5", vald själv):** 139 platser med tömning/vatten, 52 med egen webbplats; 49 valda (max 3 per
  kommun, 27 kommuner, 42 register + 7 OSM), 4 agenter, 88 sökningar, inga kvotfel. **Utfall: 27 ok,
  19 ändrade, 0 nedlagda, 3 oklara.** Viktigast: **Vadstena Golfklubb** – klubben hänvisar latrintömning
  till en plats inne i Vadstena → latrin/gråvatten borttagna (bara vatten); **Hällefors** – bergslagen.se
  säger "utan service", tömningsposten slogs ihop med ställplatsposten och latrin/vatten är grå;
  **Uskavigården** +gråvatten/latrin, **Inre hamnen Norrköping** +vatten (tömning 400 m bort, stängd
  15 okt–15 apr), **Källbukten** +vatten, **KustCamp Ekön** +latrin, **Motala Verkstad/Göta kanal
  Söderköping** +vatten med säsong; DHR Camping heter Vättersol; Kolmården och Ånnaboda = First Camp
  (nya namn/länkar); Skantzö gråvatten obekräftat kvar; ~35 poster med nya avgifter/säsonger (Karlskoga,
  Westerqwarn, Kvarntorpshögen, Lindesbergs GK, Askersunds GK, Sala GK m.fl.). **Kvar/oklart:** Vreten
  (ligger i Nora, inte Lindesberg; sajten tyst), Sannabadet (OSM-tömning obelagd), Stationsområdet
  Finspång (kommunens mening gäller troligen Grosvad); Arena Grosvad bygger nytt servicehus från sep
  2026; Vadstena Parkstop (ny anläggning) bara i nyhetstext. Nästa D-region: Värmland/Dalarna/Gävleborg,
  sedan Norrland.
- **2026-10-12, registerhygien (session "Gråvatten 5"):** 23 par registerposter inom 60 m med gemensamt
  namnled sammanslagna (t.ex. First Camp Skutberget/−Karlstad, First Camp Umeå/Nydala, Löderup,
  Herrfallet, Kedumsvik, Doro Camp, 15 grå husbilsplats-kopior ovanpå bekräftade campingar). Appen
  slog redan ihop dem inom 100 m, men dubbletterna gav fel vid kontrollsvepen (Böda/Ekerum/Gunnarsö).
  Skript: `dedupe.mjs` i scratchpad (parlista för hand). Kvar: par >100 m med olika namn.
- **2026-10-12, D (kontroll av befintliga platser) – Jönköpings + Kronobergs län (session "Gråvatten 5",
  vald själv):** 148 platser med tömning/vatten, 52 med egen webbplats; 38 valda (max 3 per kommun, 19
  kommuner, 29 register + 9 OSM), 4 agenter, 86 sökningar. **Utfall: 14 ok, 18 ändrade, 0 nedlagda, 6
  oklara.** Viktigast: **Ställplats Askelövsgatan Växjö** – kommunen hänvisar husbilstömning till Evedal,
  vårt citat gällde Evedal → latrin/gråvatten grå; **Norraryds Camping** tar inte emot husbil 1 jun–30 sep
  (glamping) och tömning är borta från sajten → alla tjänster grå; **Kyrkekvarn** och **Hoks Naturcamping**
  +gråvatten/latrin (egen sajt resp. vaggeryd.se); **Mycklaflon** +latrin, **Skeda Strand** säsong 1 apr–
  31 okt (kontrollposter ovanpå OSM); Vetlanda Östanå 75 kr/tömning (inte gratis); Hägern säsong 1 jun–
  23 aug; Oset 200 kr; Götaström +ställplats; Sjöstugan Älmhult = First Camp (två registerposter → en);
  Brohagen Habo var geokodad till Upplands-Bro → query via Habo kyrka. Sidofynd Västervik (från
  Halland/Kalmar-körningen): Ställplats Järnet geokodas från Södra Varvsgatan 50, **Barlastudden** ny
  kommunal post (latrin + vatten, gråvatten grått). **Kvar/oklart:** Spilhammar, Skinnarebo, Lövhult,
  Habo Camping, Sävsjö Camping, Tingsryd Resort (sajterna tysta om tömning – OSM-tjänster står kvar);
  tips att kontrollera: Ställplats Nye och Guldvaskningen Ädelfors (vetlanda.se), Kosta Lodge ("ej fasta
  tankar"), Bondbacken Västervik (OSM säger vatten, kommunens tabell säger nej). Småland och Halland
  därmed klara – nästa D-region: Östergötland/Örebro/Västmanland, sedan Norrland.
- **2026-10-12, D (kontroll av befintliga platser) – Halland + Kalmar län (session "Gråvatten 5",
  vald själv):** 190 platser med tömning/vatten, 91 med egen webbplats; 46 valda (max 3 per kommun, 17
  kommuner, 35 register + 11 OSM), 4 agenter, 114 sökningar, inga kvotfel. **Utfall: 24 ok, 17
  ändrade, 0 nedlagda, 5 oklara.** Viktigast: **Ställplats Stenhamra Västervik** var en sammanblandning
  – Stenhamra är en vanlig parkering (max 24 h, ingen service), tjänsterna i texten gällde kommunens
  **Ställplats Järnet** (ny post, query-baserad); **Kungsbacka Marios gata**: vattenkiosken är för
  tankbilar med nyckel → färskvatten grått; **fyra "First Camp"-poster som lämnat kedjan** rättade (Böda
  Sand, Mellbystrands Camping, Skrea Camping – nya namn/länkar) och tre som ÄR First Camp döpta om
  (Ekerum, Gunnarsö, Stensö); **Bua hamn** +gråvatten/ställplats (hamnens egen sajt, tömning ingår);
  Lögnäs +vatten, Kaffetorpet +latrin (kontrollposter); Rörvik säsong 1 maj–31 aug (OSM sa året runt);
  Målilla säsong; ~25 poster med nya avgifter/säsonger. Dubbletter sammanslagna: Böda Sand/Böda Sand
  Beach Resort, Ekerum/Ekerums Camping & Stugor, Gunnarsö/First Camp Gunnarsö (grå), Broakulla (grå).
  **Kvar/oklart:** Havslätt, Långsjön, Välenbadet (OSM; sajterna tysta om tömning), Gullbrannagården,
  Apelviken (tomter med VA, ingen uttrycklig tömningsstation). Tips från kalmar.se: latrintömning +
  dricksvatten vid rastplatsen Kalmar Dämme (ej kontrollerat mot registret). Jönköping/Kronoberg (43
  platser med webbplats) återstår – körs nästa gång.
- **2026-10-12, D (kontroll av befintliga platser) – Stockholms, Uppsala och Södermanlands län
  (session "Gråvatten 5", vald själv):** 140 platser med tömning/vatten i de tre länen, 44 med egen
  webbplats (aggregatorer husbil.se/stallplatserna.se räknas bort); 39 valda (max 3 per kommun, 23
  kommuner, 28 register + 11 OSM), 4 agenter, 87 sökningar, inga kvotfel. **Utfall: 15 ok, 15
  ändrade, 0 nedlagda, 9 oklara.** Viktigast: **Åkersberga GK** visade gråvatten + latrin trots att
  klubben uttryckligen säger nej → borttagna; **Båsenberga (Vingåker)** – två registerposter låg på
  samma punkt fast kommunen skiljer på golfklubben (ingen tömning) och slalombacken
  (gråvatten/latrin): golfposten har nu bara ställplats, backen egen query + bslk.se, färskvatten grått;
  **Saltsjö-Duvnäs Marina** (OSM) är en sugtömningsstation för fritidsbåtar → `EXCLUDED_OSM_ELEMENTS`;
  **Rullsand** +latrin (egen sajt); **Farstanäs** drivs nu av Södertälje kommun (nytt namn/länk, 13 jun–
  31 aug); **Enköpings hamn** ingen service under lågsäsong; **NSS Nynäshamn** 300 kr; **Tumbo**
  färskvatten avstängt 1 okt–30 apr; **Gnesta** vattenkiosk/latrin på Ågatan stängd sedan maj 2025
  (husbilstömningen vid vändplanen öppen). Sex kontrollposter ovanpå OSM (Skeppsmyra, Fyrishov – OSM:s
  "Gratis" ersatt, Rullsand, Gällnö, Tumbo, Klubbensborg). Namnbyten: First Camp Nickstabadet –
  Nynäshamn, First Camp City – Stockholm, Caravan Club Östnora. Sidofynd: Pite Havsbad-dubblett
  sammanslagen. **Kvar/oklart:** Sunnanö (registrets "egen webbplats"-källa går inte att återfinna),
  Berkinge (kassettömning ej återfunnen), Rörholmsbadet (ny sajt, inget om tömning), Klubbensborg
  (tömning nämns inte på egen sajt), skärgårdens tältplatser (Landsort, Finnhamn N/S, Lådna: vatten ej
  bekräftat på själva platsen; bilfria öar – Finnhamn N har orimlig `stallplats` från OSM).
  Lärdom: välj kontrollplatser med osmUrl i kandidatfilen, annars skriver `apply-kontroll.mjs`
  "undefined" i kontrollposternas beskrivning. Nästa D-region: Halland + Småland (Kalmar/Kronoberg/
  Jönköping).
- **2026-10-12, D (kontroll av befintliga platser) – Skåne (session "Gråvatten 5", vald på eget
  initiativ enligt Pers önskan att inte bli tillfrågad):** 146 platser i Skåne har tömning/vatten,
  bara 44 en egen webbplats; 36 valda (max 3 per kommun, 19 kommuner, 21 register + 15 OSM), 4 agenter,
  84 sökningar. **Utfall: 11 ok, 18 ändrade, 0 nedlagda, 6 oklara.** Viktigast: **Kullabergs tältplats
  bortplockad** (OSM-way utesluten – reservatet förbjuder övernattning i husbil, bara tältplatser för
  vandrare, ingen tömning/vatten); **Falsterbo Resort** fick latrin + gråvatten (egen sajt, vi visade bara
  vatten); Småbåtshamnen i Limhamn, Skillinge hamn och Ängelholms Föreningshamn fick färskvatten; Källby
  (Lund) är sommarcamping, stängd för säsongen; Skånes Djurparks Camping är inte längre First Camp (nu
  "Grottbyn", ingen primärsida → låg säkerhet, säsong/website borttagna); Limhamns gästhamn latrintömning
  → obekräftad (bara forumkälla, hamnens septisug gäller båtar). First Camp: tre dubblettpar i registret
  (gammal query-post + exakt post från First Camp-jämförelsen) sammanslagna till en post var (Torekov,
  Mölle, Åhus), OSM-polygonen för Torekov utesluten (450 m från posten, visades som andra plats utan
  tömning), alla First Camp-länkar uppdaterade till `/destinationer/`. Tre föreslagna kontrollposter
  slopades för hand (Kullaberg, Torekov-wayen, Åboda = befintliga "Kävlinge GK ställplats (Åboda)").
  Nya avgifter/säsonger på ~20 poster. **Kvar/oklart:** Immelns Camping, Hälldala Ranch, Löderups
  Strandbad (egna sajter nämner inte tömning – ring 0411-52 62 60 för Löderup), Kulturhuset Öster
  Sallerup, Solhejdan; Skillinge hamn: masterplan 2025 föreslår att ställplatserna tas bort (bara förslag).
  Lärdom: Skåne har få platser med egen webbplats – nästa D-region bör vara större (Stockholms län).
  **Efterkontroll (commit b921393):** Overpass var nere under synken, så förra seedens OSM-stationer
  återanvändes ofiltrerade – Kullaberg och båda Torekov-ytorna (way/494506962 + 494506963) låg kvar.
  Reservvägen i `sync-stations.mjs` tillämpar nu `EXCLUDED_OSM_ELEMENTS`; den andra Torekov-ytan lades
  till i båda listorna och Grottby-dubbletten ("Skånes Djurparks Camping & Grottby") slogs ihop med
  "Grottbyn" (grå). Lärdom: kontrollera alltid seeden efter en uteslutning, inte bara deployen.
- **2026-10-12, C (obekräftade platser):** äldst datum (25 sep). 135 grå poster med egen/icke-aggregator-webbplats
  (av ~424 grå) delades på 8 agenter × 60 i budget (~190 sökningar använda, inget kvotfel; WebFetch blockad, citat från
  WebSearch-sammandrag). **Resultat: 37 poster uppgraderade, varav 12 hela platser grå → bekräftade** (bl.a. Kalvsvik, Kyrkviken
  Filipstad, Hudiksvalls GK, Målsånna, Fiskepuben, Lindesnäs, Uvaparken, Nysäter, Sunne Ski & Bike, Ransäter, Rixö, Gangvidefarm);
  regel: bara high, eller medium från annan källa än camping.se/campio/gästhamnsguiden (`apply-obekraftade.mjs`). 87 lämnades grå.
  Restlista, motsagda och nya kandidater: `docs/obekraftade-svep-okt-2026-lag-evidens.md`. Kvar: ~290 grå poster (234 med bara
  husbilsplats.se/park4night som webbplats) – nästa C-varv bör ta dem via kommun-/turistrådssidor eller crowdsourcing.
- **2026-10-11, D (kontroll av befintliga platser) – Västra Götaland, första riktiga körningen
  (session "Gråvatten 5"):** 275 platser i VG har tömning/vatten, 82 av dem en egen webbplats.
  40 valda (max 2 per kommun, 38 kommuner, 20 OSM + 20 register) i 4 grupper à 10; 4 agenter med
  uppdraget `scripts/import-tools/UPPDRAG-kontroll.md` (136 sökningar, WebFetch blockad mot ALLA
  40 domäner → bara WebSearch med `allowed_domains`). Import med `apply-kontroll.mjs`
  (registerposter uppdateras; OSM-platser får en "kontrollpost" i registret ovanpå, eftersom
  registret vinner i appens dedupe och fälten fylls på – tjänster unionas, så en motsagd
  OSM-tjänst kräver dessutom `EXCLUDED_OSM_ELEMENTS`). **Utfall: 16 ok, 13 ändrade, 0 nedlagda,
  11 oklara** (egen sida nämner varken tömning eller vatten – inte motsagt). Inga felaktiga
  tjänster hittades; ändringarna gäller säsong/avgift (21 registerposter uppdaterade, 8
  kontrollposter nya). Viktigast: Furusjön var stängd hela 2025 (öppen 2026, 1 maj–30 sep);
  Forsvik öppen året runt (vi sa 1 maj–30 sep), vatten bara maj–sep; Skotteksgården säsongsstängd
  1 maj–mitten sep (Västsverige säger fel "året runt"), ny domän skottek.se; Åråshult 1 april–31 okt;
  Nossebro 2 apr–14 sep, 285 kr; Nääs timtaxa i stället för "från 100 kr"; "Tjolmens ställplats"
  (OSM) heter Hälsö Hamn ställplats (halsohamn.se) och har färskvatten; Kedumsvik och Dalbergså
  fick färskvatten; nya belopp på Herrljunga GK (175/275), Vara-Bjertorp (250/300–325), Hajstorp
  (250 inkl. tömning). Herrljunga GK: färskvatten nämns inte på klubbens sida → flyttat till
  påstått (grått). Vara-Bjertorp GK fick samma behandling men Per vet att färskvatten finns →
  återställt som bekräftat (fältkännedom slår webbsaknad). Agenternas avgifts-/säsongstexter var för pratiga för
  popupen och kortades för hand efter importen (gör det alltid). **Kvar/manuellt:** Hamnservice
  Lysekil tömning – kommunens prissida 2026 lägger husbilstömningen vid husbilsparkeringarna
  (Kolholmarna/Valbodalen), Havsbadets "tömningsstationer" gäller båtar → pinnen kan sitta fel,
  läs hamn.lysekil.se i webbläsare; Stenungsögården – citatet om grå-/svartvattentömning finns
  inte längre på sajten (läs i webbläsare); Tidaholms Camping – "Camping Maplelake Adventure" på
  samma adress, ev. ny operatör; Lisebergsbyn heter inte Kärralund längre (OSM-namn); Lövekulle
  bygger om VA + nytt servicehus hösten 2026. Sidofynd att kolla: Åmåls kommun nämner
  husbilstömning "intill rastplatsen vid Åmåls västra infart"; Sjöstugetomten (Ed) har enligt
  Västsverige ingen latrintömning. Nästa D-region: Skåne eller Stockholms län.
- **2026-10-05, A (tömning latrin/gråvatten):** äldst datum i rotationen. 7 agenter × 65 i budget
  (~300 sökningar använda, inget kvotfel) mot de 69 kommuner som hade 0–1 tömningsplatser i
  seeden (Stockholms län, Skåne, VG, Mellansverige, Norr). Kommunerna publicerar nästan aldrig
  husbilsstationer (bara fastighetsslam; Järfälla/Sigtuna/Hammarö säger uttryckligen nej).
  **Resultat: 4 nya platser** (Västanfors Båtklubb Fagersta, Kungsörs gästhamn, Caravan Club
  Storsved Värmdö, Nyttorps Quickstop Falköping – alla via `query`+ankare, maxKm 10, verifiera
  efter deploy) och **8 kompletteringar** (Djulöbadet, Ånge Camping, Doro Camp, Caravan Club Mista,
  Femöre Marina, Ingarö havscamping, Nossebrobadet, Tidaholms Camping). 30 låg-/medelfynd i
  `docs/tomning-svep-okt-2026-lag-evidens.md` (inte inlagda). Kvar: Gnesta Ågatan 8 stängd (notis),
  E20-rastplatser Alingsås/Vårgårda, Maplelake Hökensås, Edsbybacken; metoden ger allt mindre –
  nästa steg är crowdsourcing eller webbläsarläsning.
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
  **Deploy 1 okt 13:03:** 82 av 82 i seeden – klart.
- **2026-10-05, discovery-svep Öland/Gotland/Emmaboda-Torsås-Högsby (session "Gråvatten 4", område D
  upptäckt – sista luckan i det nationella discovery-svepet):** 4 agenter × 45 sökningar. 90 fynd
  (38 high, 26 medium, 26 low) → 59 nya, 3 uppgraderade (Arontorp grå → full service, Böda +vatten,
  Petes EKOgård +vatten), 3 kompletterade, 14 hoppade, 9 medvetet utelämnade (Region Gotlands
  vattenkiosker kräver nyckel och var stängda 2026, macktappar/park4night-parkeringar utan läge).
  Bästa källa Öland: oland.se:s ställplatsserie med ja/nej per tjänst. Rådata
  `docs/import/discovery-oland-gotland-kalmar-okt-2026.json`. Koordinatfel rättade: Ställplats
  Ringvägen Högsby (låg 22 km fel), Sandkvie (delade punkt med Hoburgsgubben). Verifiera efter
  deploy. Kvar: Ljugarns GK (tre aggregatorer eniga om tömning, grå), Mörbylånga hamn (oklart om
  latrinstationen gäller husbil), Färjestadens hamn, Snäck/Vitviken/Kyllaj/Hangvar ej hunna,
  Valleviken och Slite Strand har avvecklat husbilsplatser (ej inlagda).
  **Utfall 5 okt 15:56:** 59 av 69 i seeden (Simrishamn-posten som skrivits över av misstag
  återställd); 9 fick exakta koordinater, Riddares bättre query. Verifiera nästa deploy.
  **Deploy 5 okt 17:57:** 68 av 69 i seeden – klart (Riddares saknar koordinat, grå, opublicerad).
- **2026-10-09, discovery varv 2 – kommuner med 0–1 bekräftade tömningsplatser (session "Gråvatten 4",
  område D upptäckt):** 67 kommuner (mätning mot seed 7 okt: 31 med noll bekräftad gråvatten/latrin, 36 med
  en) i 8 grupper (Stockholm nord/syd, Skåne väst/inland, Västra Götaland, Värmland–Örebro–Västmanland,
  Småland–Östergötland–Dalarna–Hälsingland, Norrland), 8 agenter × 45 sökningar med tömningsfokus
  (tillägg `UPPDRAG-tillagg-tomning.md`: kommunens VA/avfall, befintliga camping/ställplats-poster
  utan tömning, gästhamnar, golfklubbar). 110 fynd (39 high, 36 medium, 35 low) → 60 nya, 9 uppgraderade,
  12 kompletterade, 7 grå-kompletteringar, 22 hoppade. Ny belagd tömning: Östnora Camping (Haninge),
  Malexander Camping, Reningsverket Hultsfred (riktigt namn på OSM-posten, gratis), Jungnerholmarna
  Fliseryd, Caravan Club Timmernabben (CamperClean), Orsa Grönklitt (latrin, EJ gråvatten), Silverfallen/
  Karlsfors Skövde (latrin), Kungsörs gästhamn (sammanslagen med ogeokodad post från sep), Djulö
  bekräftad av egen sida, Nickstabadet avgift. Vatten nytt: Fagersta GK, Kävlinge GK, Ingelsby Gård,
  Hulta GK, Målilla Hembygdspark, Kvarnvik, Hedemora Folkets Park, NOK-stugan Norberg. Lilla Edet (0
  platser) fick två gasolposter (Linde) – ingen ställplats/tömning finns enligt kommun och Västsverige.
  Raderade: grå "Trafikverkets rastplats H3" (platshållare – TRV:s Rastplats Emån Ö/V har redan latrin)
  och "Mönsterås Gästhamn" (bara husbil.se, felgeokodad, kommunen säger uttryckligen ingen latrin i
  hamnen). Uttryckligt NEJ dokumenterat i beskrivningen: Åkersberga GK, Kävlinge GK, Abbekås GK, NSS
  Nynäshamn, Vara badhus, Hjälmared, Mönsterås hamn, Klippan Virserum. Rådata
  `docs/import/discovery-varv2-lagtackning-okt-2026.json`. ~42 poster geokodas via adress – verifiera
  efter deploy (`check-discovery.mjs`). **Slutsats:** webben är uttömd för Skåne inland (Eslöv, Skurup,
  Staffanstorp, Åstorp, Perstorp, Svalöv), Stockholms innerkommuner, Salem/Tyresö/Botkyrka, Malå,
  Skinnskatteberg, Lekeberg, Hallsberg – ingen kommun i varvet har en kommunal tömningsplats vid
  reningsverk/ÅVC på webben. Nästa metod där: crowdsourcing eller telefon. `site:`-sökningar ignoreras
  av sökmotorn – använd `allowed_domains`. Kvar att kolla i webbläsare: Vafabmiljös sida
  "Tömningsplatser för husbil", angecamping.com (tömning motsägs av Campercontact), galohavsbad.se,
  ostanahavscamp.se (ny ställplats 2026 vid Ljusteröfärjan, påstår full service), Kalvkätte Hultsfred.
  **Utfall 9 okt 07:11 (deploy e437508, 6 587 platser): 81 av 87 i seeden**; 13 poster >6 km från
  kommunankaret kontrollerade mot känt ortläge – alla rätt. 6 ogeokodade → 4 fick exakta koordinater
  (Mölnbacka via husbil.se, Sommargården Klippan via husbilskompisar + Visit Hultsfred, Jonstorp Stehag
  via husbil.se, Skansholmen Mörkö via park4night), Blåbärskullen Mörlunda fick ortens mittpunkt med
  notis (exakt läge saknas, <1 km fel), Nykvarnsparken RADERAD (ligger i Linköping vid Nykvarns sluss,
  inte i Nykvarns kommun – bara husbilsplats.se som källa). Verifiera nästa deploy.
  **Deploy 9 okt 08:01 (c027b67, 6 592 platser): 86 av 86 i seeden – klart.**
- **2026-10-10, golfklubbssvep del 3 (session "Gråvatten 4", område D):** de regioner som del 2 lämnade
  osökta – Bohuslän/Dalsland, Göteborgs kranskommuner + Halland + Sjuhärad, Skåne, Värmland/Bergslagen.
  4 agenter × 45 sökningar, 75 klubbar granskade (4 high, 20 medium, 51 low varav 22 "ingen ställplats
  belagd"/uttryckligt nej). Utfall: 22 nya registerposter, 7 kompletterade, 5 grå. **Enda nya tjänsterna:**
  Fullerö GK Västerås (vatten belagt, uttryckligen ingen tömning) och Degernäs Camping vid Degerfors GK
  (vatten via "vattenslang för påfyllning", tömning fanns redan från OSM). Lundsbergs GK (Storfors) fick
  påstått vatten (kommunsida). Nya bekräftade ställplatser utan service: Dagsholm, Lyckorna, Uddevalla GK,
  Falkenberg, Ullared Flädje, Gullbringa, Varberg Västra, Bedinge, Tomelilla, Söderåsen, Bjäre (påstått
  vatten), Uddeholm, Saxå, Kristinehamn, Nora. Uttryckligen NEJ till husbil: Torslanda, Vallda, Kristianstad
  Åhus, Ystad (hänvisar till Nybrostrand), Landskrona (Borstahusen). Lärdom bekräftad igen: golfklubbar =
  ställplats med el, nästan aldrig tömning. Rådata `docs/import/golfklubbar-svep-del3-okt-2026.json`;
  `import-golf.mjs` hoppar nu poster med `skip: true` och behåller befintliga påstådda tjänster vid
  komplettering. ~20 poster geokodas via klubbnamn + kommunankare – verifiera efter deploy. Kvar osökt:
  Rya/Helsingborg, Falsterbo/Ljunghusen, Barsebäck, Lomma/Staffanstorp, Hörby, Kinds GK Svenljunga.
  Sidofynd att kolla separat: Ställplats Lerum Seglarevägen 25 (Västsverige: el/vatten/gråvatten/latrin),
  Wapnö Gård Halmstad.
  **Utfall 10 okt 11:50 (deploy 85ee226, 6 613 platser): 33 av 34 i seeden**; 7 poster >6 km från
  kommunankaret kontrollerade – alla rätt (Dagsholm, Lyckorna, Himle, Beddingestrand, Rya, Frösåker;
  Uddevalla GK låg 550 m från klubbhuset, nu exakt koordinat Bången 310). Söderslätts GK (grå) hittades
  inte av Nominatim → exakt koordinat Elleboda/Grevievägen 260 från golfisverige.com. Verifiera nästa deploy.
  **Deploy 10 okt 12:45 (bc3791b, 6 614 platser): 34 av 34 i seeden – klart.**
- **2026-10-11, golfsvepets restlista Skåne + sidofynd (session "Gråvatten 4"):** Kinds GK Svenljunga
  (ny, klubbsida: 12 platser med el, 150 kr – bara ställplats), Rya GK och Flommens GK (grå, bara
  husbilsplats.se), Barsebäck G&CC säger uttryckligen NEJ till husbil, Helsingborgs GK/Falsterbo/
  Ljunghusen/Lomma GK/Elisefarm nämner inget – golfsvepet är därmed KLART riksomfattande. Sidofynd:
  Ställplats Lerum (OSM-post hade gråvatten+latrin) får färskvatten + sopor via Västsverige +
  stallplatslerum.se (57 platser, från 350 kr/natt, året runt); Wapnö Gård Halmstad NY (Destination
  Halmstad: 50 grusplatser året runt, gråvattentömning mot avgift; el/vatten bara aggregator → påstått).
  Rådata tillagd sist i `golfklubbar-svep-del3-okt-2026.json` resp. `discovery-varv2-lagtackning-okt-2026.json`.
  **Deploy 11 okt 11:52 (0497d5a): alla fem i seeden** (Wapnö, Lerum med vatten, Kinds, Rya, Flommen).
  Samma deploy: svep på bottenarket + ny kategori `atervinning` – 809 återvinningscentraler har nu den
  nya kategorin, ingen av dem har `sopor` kvar, sopor = 1 309.
- **2026-10-11, restlistorna (session "Gråvatten 4"):** två agenter mot det som tidigare krävt webbläsare.
  Platser: Gålö Havsbad grå → bekräftad latrin (fast tank + CamperClean) + vatten via galohavsbad.se;
  Kalvkätte ställplats Hultsfred NY (vatten+sopor, Visit Hultsfred); Riddares (Gotland) fick koordinat
  från hitta.se; Östanå Havscamp bekräftad av kommunen (tjänster fortfarande bara park4night → påstådda,
  koordinat flyttad 0,9 km); Ånge Camping stämmer (latrin+vatten på egen sida, gråvatten EJ belagt);
  Kolgården Vilhelmina latrin belagd på egen sida; Lygnareds fortfarande obelagt; Vilhelmina kommunal
  tömning finns inte (lämnad borttagen); Vafabmiljös lista går inte att nå. **Fengersfors avgjort:**
  ställplatsens egen sida säger uttryckligen ingen gråvatten/latrin → OSM way 708866226 utesluten i
  `EXCLUDED_OSM_ELEMENTS` (båda filerna), registerposten (vatten+ställplats) täcker platsen.
  Gasol: West Coast Gasol NY (Kilgatan 2, Vänersborg, egen sajt), Expressgasol Tingsryd (Strömgatan 2)
  + Ronneby (Sörbyvägen, medium) NYA, Levol Onsala adress Torpstigen 25 + priser, jem & fix Alvesta
  exakt koordinat (eniro), Gasspecialisten Kiruna 44 kr/kg + byte, Gasolbolaget Växjö → bara byte
  (egen sajt nämner inte lös flaska), Gasolkungen Kristianstad ca 35 kr/kg (gasolkartan, medium),
  Skånegas Ängelholm adress ifrågasatt (gasolautomat.com säger Valhall Park) → medium.
  Expressgasol Tidaholm finns inte längre i listan. Rådata `docs/import/gasol-restlista-okt-2026.json`
  + restlistan sist i `discovery-varv2-lagtackning-okt-2026.json`. Verifiera geokodning (West Coast,
  Tingsryd, Ronneby, Levol Onsala) efter deploy.
  **Deploy 11 okt 12:56 (40ad828, 6 622 platser): 10 av 11 i seeden**, Fengersfors visar nu bara
  registerposten (vatten+ställplats) + sopstationen. Levol Onsala hittades inte av Nominatim
  ("Torpstigen 25") → hitta.se-koordinaten 57.447/12.046 satt som lat/lon. Verifiera nästa deploy.
  **Deploy 11 okt 14:10 (3df6961, 6 624 platser): 11 av 11 i seeden**, Levol Onsala på hitta.se-läget.
  Samma deploy var den första med issue #15-flödet (sync-data committar seeden och startar deployen
  själv) – synk 3 min, deploy under en minut. Furusjöns Camping (Ånimskog) föll bort i den allra
  första cachade synken (tillfälligt Nominatim-fel cachades som miss) och är tillbaka efter rättning.
