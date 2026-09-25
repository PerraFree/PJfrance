# Tömningsplatser från rastplatserna.se och husbilsplats.se – jämförelse mot kartan

Genererat 2026-09-25 av en fristående research-session. Rådata: `tomningsplatser-webb.json` (396 rader). Inget i `scripts/curated-places.json` eller koden är ändrat – detta är underlag.

**Frågan från Per:** finns platserna på (A) https://rastplatserna.se/rastplats-med-latrintomning och (B) https://husbilsplats.se/tomningsplatser/hitta-tomningsplatser-for-husbilar/ med på kartan?

**Kort svar:** rastplatserna.se: 62 rader hittade, 47 finns med tömning, 14 finns utan tömning, 1 saknas helt. husbilsplats.se: 334 rader hittade, 114 finns med tömning, 159 finns utan tömning, 61 saknas helt.

## Metod och begränsningar

- Båda domänerna är egress-blockade (WebFetch, curl, r.jina.ai, web.archive.org – allt blockerat). Listorna är därför rekonstruerade ur WebSearch-träffar (`allowed_domains`) – titlar + sammandrag – och är **inte kompletta**.
- rastplatserna.se säger själv att den listar 172 Trafikverket-rastplatser med latrintömning (284 rastplatser totalt); sökindexet gav bara ~60 av dem oavsett sökord. Sidan listar *enbart* Trafikverkets officiella rastplatser, dvs samma population som kartans 319 Trafikverket-poster (varav 210 med latrin), så den fullständiga listan täcks sannolikt redan av TRV-synken – stickprovet nedan visar hur väl.
- husbilsplats.se: regionlistan (Götaland/Svealand/Norrland → landskap) ligger bakom betalvägg ("Husbilsplatsguiden Premium"); kategoriarkiven (`/rest-area/categories/tomningsplatser/?pno=N`, ≥52 sidor) går inte att bläddra via sök. Det som hittades är de platssidor sökmotorn indexerat. Samma plats finns ofta under både `/rest-area/<slug>/` och `/locations/<slug>/`.
- Tjänster (latrin/gråvatten/vatten) sattes bara när titel eller sammandrag uttryckligen nämnde dem för just den platsen ("Tömma latrin från kassett", "Tömma gråvatten", "Färskvatten"). `null` = sidan sa inget. Många husbilsplats-rader dök upp i tömningssökningar bara p.g.a. sidofältet "tömningsplatser i närheten" och har därför null.
- Matchning mot senast publicerade `stations-seed.json` (gh-pages): koordinat inom 500 m om sidan gav koordinat, annars namnlikhet (generiska ord bortskalade, riktning N/S/V/Ö som avgörare, camping≠rastplats≠hamn) inom rimligt avstånd från ortens centrum. Matchningar märkta **OSÄKER** i `matchHow` (namnlikhet < 100 % eller > 15 km från gissat ortscentrum) bör kontrolleras manuellt innan de används.
- `nearLat`/`nearLon` är agenternas uppskattning av ortens centrum (för rimlighetskontroll vid import), inte platsens läge. `lat`/`lon` är satta bara när en sida gav koordinaten.
- Primärkälla söktes bara för rader som påstår tömning men saknar den i kartan (82 rader). rastplatserna.se/husbilsplats.se räknas INTE som primärkälla → `confidence: "low"` (grå/obekräftad vid ev. import). "high" kräver citat från Trafikverket, kommunen eller anläggningen själv; "medium" = turist-/branschsajt.

## Sökningar

| Steg | Sökningar |
|---|---|
| Extraktion rastplatserna.se (alla vägar/län) | 72 |
| Extraktion husbilsplats.se Götaland | 45 |
| Extraktion husbilsplats.se Svealand | 40 |
| Extraktion husbilsplats.se Norrland | 35 |
| Verifiering syd (Skåne–Mälardalen) | 20 |
| Verifiering mitt (Mälardalen–Dalarna) | 20 |
| Verifiering norr (Hälsingland–Norrbotten) | 20 |
| **Totalt** | **252** (+ 4 inledande sonderingar) |

## rastplatserna.se

Rader: 62, varav 32 med uttryckligt påstående om latrin/gråvatten på sidan.

| Status | Alla rader | Varav påstådd tömning på sidan |
|---|---|---|
| FINNS MED TÖMNING | 47 | 30 |
| FINNS UTAN TÖMNING | 14 | 2 |
| SAKNAS HELT | 1 | 0 |

Verifiering av rader med påstådd tömning som kartan saknar: low: 2.

### Finns i kartan men utan tömning – påstådd tömning (2)

- **Råda Rastplats** (Riksväg 62, Hagfors) → `tv-SE_STA_TRISSID_1_13658521` "Rastplats Råda" [sopor] – latrin – low – Ingen primärkälla nåbar. Trafikverkets rastplatsdata i kartan (tv-…13658521) anger bara sopor – kontrollera om TRV-API:t alls exponerar latrintömning för denna rastplats.
- **Tönnebro Rastplats** (E4, Ockelbo, Söderhamn kommun) → `tv-SE_STA_TRISSID_1_13653241` "Rastplats Tönnebro" [sopor] – latrin – low – Ingen primärkälla nåbar; kartans TRV-post (tv-…13653241) anger bara sopor.

### Saknas helt – ingen tjänst angiven på sidan (svaga kandidater) (1)

- Rastplats Gylle (Riksväg 70, Borlänge)

### Finns i kartan, sidan anger ingen tjänst (12)

- Rastplats Gräsmo (Riksväg 25, Nybro) → "Rastplats Gräsmo" [sopor]
- Rastplats Träffpunkt Gotland (Väg 140, Visby, Gotland kommun) → "Rastplats Träffpunkt Gotland" [sopor]
- Rastplats Dalstorp (Riksväg 32, Boxholm) → "Rastplats Dalstorp" [sopor]
- Rastplats Herrbeta S (E4, Linghem, Linköping kommun) → "Rastplats Herrbeta S" [sopor]
- Rastplats Nyköpings bro N (E4, Nyköping) → "Rastplats Nyköpingsbro N" [sopor] – OSÄKER
- Rastplats Koviken (Riksväg 50, Askersund) → "Rastplats Koviken" [sopor]
- Rastplats Femstenaberg (E6, Strömstad) → "Rastplats Femstenaberg" [sopor]
- Rastplats Eskiln (Riksväg 66/68, Fagersta) → "Rastplats Eskiln" [sopor]
- Rastplats Långsjön (Riksväg 50, Ludvika) → "Rastplats Långsjön" [sopor]
- Rastplats Hosjön (Riksväg 50, Falun) → "Rastplats Hosjön" [sopor]
- Rastplats Lomkällan (E45, Sveg, Härjedalen kommun) → "Rastplats Lomkällan" [sopor]
- Rastplats Svenstavik (E45, Svenstavik, Berg kommun) → "Rastplats Svenstavik" [sopor]

### Finns med tömning (47)

- Rastplats Piraten (Riksväg 9/19, Tomelilla) → "Rastplats Piraten" [latrin,sopor]
- Rastplats Lars Dufva () → "Rastplats Lars Dufva" [latrin,sopor]
- Rastplats Mölletofta (Riksväg 21, Klippan) → "Rastplats Mölletofta" [latrin,sopor]
- Rastplats Snapparp V (E6/E20, Mellbystrand, Laholm kommun) → "Rastplats Snapparp V" [latrin,sopor]
- Rastplats Väntorp (E22, Kalmar) → "Rastplats Väntorp Ö" [latrin,sopor]
- Rastplats Skrea Backe (E6/E20, Falkenberg) → "Rastplats Skrea Backe" [latrin,sopor]
- Rastplats Lagan (E4, Lagan, Ljungby kommun) → "Rastplats Lagan" [latrin,sopor]
- Rastplats Vandalorum (E4/Riksväg 27, Värnamo) → "Rastplats Vandalorum" [latrin,sopor]
- Rastplats Ölmevallasjön (E6/E20, Fjärås, Kungsbacka kommun) → "Rastplats Ölmevallasjön" [latrin,sopor]
- Rastplats Grandalen (Riksväg 40, Bollebygd) → "Rastplats Grandalen" [latrin,sopor]
- Rastplats Stora Transåssjön V (Rv 40, Borås) → "Rastplats Stora Transåssjön V" [latrin,sopor]
- Rastplats Botorpström (E22, Västervik) → "Rastplats Botorpström" [latrin,sopor]
- Rastplats Vida Vättern (E4, Ödeshög) → "Rastplats Vida Vättern" [latrin,sopor]
- Rastplats Såten (Väg 160, Henån, Orust kommun) → "Rastplats Såten" [latrin,sopor]
- Rastplats Ljungskile (E6, Ljungskile, Uddevalla kommun) → "Rastplats Ljungskile" [latrin,sopor]
- Rastplats Östgötaporten (E4, Ödeshög) → "Rastplats Östgötaporten" [latrin,sopor]
- Rastplats Tegen () → "Rastplats Tegen" [latrin,sopor]
- Rastplats Albacken (E4, Mjölby) → "Rastplats Albacken" [latrin,sopor]
- Rastplats Bergs Kullar (E45 (sidan skriver 'Rv 40'), Mellerud) → "Rastplats Bergs Kullar" [latrin,sopor]
- Rastplats Hammarsundet N (Riksväg 50, Askersund) → "Rastplats Hammarsundet N" [latrin,sopor]
- Rastplats Sandbäcken (E18) → "Rastplats Sandbäcken N" [latrin,sopor]
- Rastplats Ristjärn (E18, Kristinehamn) → "Rastplats Ristjärn" [latrin,sopor]
- Rastplats Stolpen (E18, Kristinehamn) → "Rastplats Stolpen" [latrin,sopor]
- Rastplats Villinge (E18) → "Rastplats Villingen" [latrin,sopor]
- Rastplats Björnfallet (E18/E20, Hovsta, Örebro kommun) → "Rastplats Björnfallet" [latrin,sopor]
- Rastplats Högsjö (E18) → "Rastplats Högsjön" [latrin,sopor]
- Rastplats Nyänge (E18) → "Rastplats Nyängen" [latrin,sopor]
- Rastplats Skoftesta (E18) → "Rastplats Skoftesta Ö" [latrin,sopor]
- Rastplats Sörmo (E18) → "Rastplats Sörmon" [latrin,sopor]
- Rastplats Råby (E18) → "Rastplats Råby" [latrin,sopor]
- Rastplats Högsjön () → "Rastplats Högsjön" [latrin,sopor]
- Rastplats Dammtjärn (Riksväg 63, Filipstad) → "Rastplats Dammtjärn" [latrin,sopor]
- Rastplats Evelund (Riksväg 56/70, Sala) → "Rastplats Evelund" [latrin,sopor]
- Rastplats Tärnsjö (Riksväg 56, Tärnsjö, Heby kommun) → "Rastplats Tärnsjö" [latrin,sopor]
- Rastplats Arvidsbo (E4, Tierp) → "Rastplats Arvidsbo" [latrin,sopor]
- Rastplats Alebosjön (E4, Söderhamn) → "Rastplats Alebosjön" [latrin,sopor]
- Rastplats Armsjön Ö (E4, Kvissleby, Sundsvall kommun) → "Rastplats Armsjön Ö" [latrin,sopor]
- Rastplats Gimån (E14, Gimån, Bräcke kommun) → "Rastplats Gimån" [latrin,sopor]
- Rastplats Skule (E4, Docksta, Kramfors kommun) → "Rastplats Skuleberget" [latrin,sopor]
- Rastplats Storlien (E14, Storlien, Åre kommun) → "Rastplats Storlien" [latrin,sopor]
- Rastplats Tallbacken (E12, Vännäs) → "Rastplats Tallbacken" [latrin,sopor]
- Rastplats Meselefors (E45, Vilhelmina) → "Rastplats Meselefors" [latrin,sopor]
- Rastplats Marsjön (E4, Skellefteå) → "Rastplats Marsjön" [latrin,sopor]
- Rastplats Bastunäs (E4, Kåge, Skellefteå kommun) → "Rastplats Bastunäs" [latrin,sopor]
- Rastplats Jävre S (E4, Jävre, Piteå kommun) → "Rastplats Jävre S" [latrin,sopor]
- Rastplats Ljusselforsen (E45, Arvidsjaur) → "Rastplats Ljusselforsen" [latrin,sopor]
- Rastplats Bessesjohka (E10, Kiruna) → "Rastplats Bessesjohka" [latrin,sopor]

## husbilsplats.se

Rader: 334, varav 148 med uttryckligt påstående om latrin/gråvatten på sidan.

| Status | Alla rader | Varav påstådd tömning på sidan |
|---|---|---|
| FINNS MED TÖMNING | 114 | 68 |
| FINNS UTAN TÖMNING | 159 | 66 |
| SAKNAS HELT | 61 | 14 |

Verifiering av rader med påstådd tömning som kartan saknar: low: 44, high: 23, medium: 13.

### Saknas helt – påstådd tömning (14)

- **Norrviken Camping** (Båstad) – latrin+gravatten+vatten – high – Heter numera "Caravan Club Norrviken" (Caravan Club of Sweden). Ligger vid Kattvik väster om Båstad, inte inne i Båstad – geokoda på adressen. Sajten egress-blockad, citatet via WebSearch-sammandrag.
- **Trafikverkets rastplats Örby** (41, Örby, Mark kommun) – latrin – low – Ej verifierad. Rastplats Örby vid väg 41 (Marks kommun) finns sannolikt i TRV-datan – kontrollera seed.
- **Julared Ställplats** (Habo) – gravatten+vatten – high – Gårdsställplats (Julared Hagårds Lagård). Sajten egress-blockad, citat via WebSearch-sammandrag. Latrin lämnad null – egen sida nämner bara gråvatten.
- **Tömningsplats Skärhamns gästhamn** (Skärhamn, Tjörn kommun) – latrin+gravatten – low – Ingen primärkälla (tjorn.se / hamnens egen sida) nådd inom budgeten. Gästhamnens sugtömning är för båtar – oklart om husbil kan använda den.
- **Trafikverkets rastplats O5** () – latrin+vatten – low – Ej undersökt (ort okänd, trafikverket.se egress-blockad). "O5" är Trafikverkets interna beteckning – bör gå att slå upp i TRV-datan i seed.
- **Röks Lanthandel** (Rök, Ödeshög kommun) – gravatten – high – Bara gråvatten belagt – ingen latrintömning nämns. Ligger några hundra meter från Rökstenen.
- **Tömningsplats Grums** (Grums) – latrin+gravatten – medium – 59.340581,13.107507 – Ingen plats inom 2 km i kartan – genuint saknad. OBS motsägelse: söksammandraget säger 'endast tanktömning' medan husbilsplats säger 'latrin från kassett'. Verifiera på grums.se/visitvarmland i webbläsare.
- **Edanöbron** (Strängnäs (Tosterön), Strängnäs kommun) – latrin+gravatten – low – Ingen primärkälla. Strängnäs kommuns sida 'Camping och ställplatser' (strangnas.se) nämner kassettömning ENDAST vid hamnkontoret i Strängnäs, Mariefreds gästhamn (sommar) och Trafikverkets rastplats NO om Strängnäsbron (rv 55, 2 km N om Strängnäs) – Edanöbron nämns inte. Närmast i kartan: 'Ställplats Strängnäs gästhamn' (osm-node-1577488267) – troligen en annan anläggning. Läge okänt.
- **Tömningsplats Arboga** (Arboga) – latrin+gravatten – low – Ingen primärkälla hittad (arboga.se-träffar handlar om kommunalt vatten/avfallstaxa). MOTSÄGELSE: husbilskompisar säger uttryckligen INGET vatten (husbilsplats säger färskvatten) → vatten=false. Kartan har redan 'Tömningsstation, Ekbacken' (osm-node-13019580405, 59.39936/15.86721, gravatten+latrin) ca 2 km öster om centrum – kan vara samma anläggning (Industrigatan ligger i östra Arboga), kontrollera innan ny post läggs.
- **Samstorps Gård** (Gräddö, Norrtälje kommun) – latrin+gravatten+vatten – low – Genuint saknad (ingen post inom 4 km utom Björkö Örns Havscamping 2,5 km bort). Primärkälla samstorp.se/sv/stallplatser kunde inte läsas (blockad) och sammandraget bekräftade inte tömning → low. Tel 0708-871367.
- **First Camp Sunne** (Sunne) – latrin+gravatten+vatten – high – INTE saknad: samma anläggning finns redan som 'Sunne Camping Kolsnäs' (curated-309, 59.82420/13.13980, camping+stallplats+gravatten+latrin+vatten) och OSM 'Sunne Camping och sommarland' (osm-way-273773392). First Camp Sunne–Fryksdalen är nya namnet på Sunne Camping & Sommarland/Kolsnäs – byt namn på befintlig post i stället för att lägga till ny.
- **Storsjö camping och ställplats** (Storsjö, Berg kommun) – latrin+vatten – high – Gråvatten nämns inte på egen sajt (bara husbilsplats.se) – sätt gravatten som obekräftad. Ny plats, saknas i kartan; adress Storsjö 220, 845 98 Storsjö (Storsjö kapell, Bergs kommun). Geokoda med nearLat/nearLon 62.8/13.1.
- **Doro Camp Lapland** (E45, Dorotea) – gravatten – medium – Registret har redan "Doro Camping Lappland" (64.2574/16.3910, unverifiedServices latrin/gravatten) – status SAKNAS HELT är alltså fel (namnvariant). Läs doro.camp/en/facilities/ i webbläsare för att bekräfta latrintömning.
- **Malå Camping** (Malå) – latrin+vatten – low – Status SAKNAS HELT är fel: registret har redan "Tjamstan Camping" (65.1829/18.7547) = Malå Camping, med unverifiedServices latrin. Ingen åtgärd utöver ev. namnalias.

### Finns i kartan men utan tömning – påstådd tömning (66)

- **Tömningsplats Bokerasten** (Sjöbo) → `osm-node-6558178286` "Bokerastens Camping" [camping] – latrin+gravatten – low
- **Ekerödsrasten** (E22, Hörby) → `osm-node-2110806485` "Ekerödsrasten" [camping] – latrin+gravatten+vatten – low – Bara användarsajt (husbilsplats/husbilskompisar). Matchningen (OSM "Ekerödsrasten", camping) verkar rätt – rastanläggning/truckstop med ställplats vid E22.
- **Åhus - centrumnära** (Åhus, Kristianstad kommun) → `osm-node-14087775835` "Åhus Missionsgård" [camping] – latrin+gravatten – low – OSÄKER matchning
- **Osby Camping** (Osby) → `osm-node-9866224706` "Ställplats för husbil, Osby" [stallplats] – latrin+gravatten+vatten – low – OBS matchningen: OSM-posten "Ställplats för husbil, Osby" (1,4 km från ort) kan vara den kommunala ställplatsen Spegeldammen (Hässleholmsvägen, 7 platser, offentlig toalett + vattenkran, INGEN tömning) snarare än Osby Camping vid Osbysjön (Ebbarpsvägen 84). Kontrollera koordinaten innan tjänster läggs på existingId.
- **Lessebo Camping** (Lessebo) → `osm-way-1082670495` "Lessebo Camping" [camping] – gravatten – low
- **Borgholm Tömningsstation** (Borgholm) → `osm-relation-15414589` "Kapelludden Camping o Stugor" [camping] – latrin+gravatten – high – Primärkällan (oland.se) belägger latrintömning; gråvatten/färskvatten bara från husbilsplats. Matchningen är FEL: existingName "Kapelludden Camping o Stugor" (221 m bort) är en annan anläggning – tömningsstationen är en fristående kommunal station på Kapellvägen och bör läggas som egen post med koordinaten ovan, inte på campingens id.
- **Rastplats Vänga östra** (42, Vänga, Borås kommun) → `tv-SE_STA_TRISSID_1_13657461` "Rastplats Vänga Ö" [sopor] – latrin – low – Ej verifierad. Systerplatsen "Rastplats Vänga V" finns i seed från TRV med bara sopor – "Vänga Ö" finns troligen också där under det namnet (matchningen missade namnformen "östra"). [Omkörd matchning: SAKNAS HELT → FINNS UTAN TÖMNING]
- **Rastplats Vänga västra** (42, Vänga, Borås kommun) → `tv-SE_STA_TRISSID_1_13657441` "Rastplats Vänga V" [sopor] – latrin – low – Ej verifierad. Matchningen mot TRV-posten "Rastplats Vänga V" är rimlig.
- **Tömningsplats Lysekil** (Lysekil) → `osm-way-1228964389` "Lysekil Fiskhamnen" [stallplats] – latrin+gravatten+vatten – high – OSÄKER matchning – Primärsidan egress-blockad – bara titel/URL bekräftad, inte detaljcitat. Matchningen mot OSM "Lysekil Fiskhamnen" (ställplats, Bangårdsgatan 1) stämmer geografiskt – tömningen ligger vid fiskhamnens husbilsparkering.
- **Tömningsplats i Skara** (Skara) → `osm-node-4378814443` "Camping, Skara" [camping] – latrin – high – Matchningen är FEL: existingName "Camping, Skara" är en annan plats. Detta är en fristående kommunal toalettömningsstation vid Björkelundsgatan (industriområde) – lägg som egen post. Kommunen nämner bara toalett-/latrintömning; gråvatten (husbilsplats påstår) EJ bekräftat → null. "Vattenpost" intill kan vara färskvatten men oklart om publik → null. Vinterstängd 15 nov–vår.
- **Tömningsplats Vadstena** (Vadstena) → `curated-563-kungs-starby-801,-vadstena` "Vadstena Golfklubb" [vatten] – latrin+gravatten+vatten – high – Matchningen är FEL: existingName "Vadstena Golfklubb" är en annan anläggning. husbilsplats "Tömningsplats Vadstena" är med största sannolikhet samma station som raden "Vadstena gästhamn & ställplatser" (vid ställplatsens infart i gästhamnen) – slå ihop med osm-way-1327548899, skapa inte en egen post.
- **Vadstena gästhamn & ställplatser** (Vadstena) → `curated-563-kungs-starby-801,-vadstena` "Vadstena Golfklubb" [vatten] – latrin+gravatten+vatten – high – OSÄKER matchning – Matchningen mot OSM "Ställplats för husbil vid Vadstena ställplats (gästhamnen)" är rätt. Tömning året om; servicehus öppet apr–okt.
- **Karlsborg** (Karlsborg) → `osm-way-361196904` "Karlsborgs Camping" [camping,stallplats] – latrin+gravatten – low
- **Horns Skärgårdscamping** (Nyköping) → `osm-relation-10973596` "Horns Skärgårdscamping" [camping] – latrin – low
- **Nyköpings hamn** (Nyköping) → `curated-994-nyköpings-hamn,-nyköping` "Nyköpings hamn" [stallplats] – latrin+gravatten+vatten – medium – Branschsajt med konkret uppgift → medium. Tömningen ligger vid gästhamnens serviceanläggning ~100 m från ställplatsen. Matchningen mot registerposten "Nyköpings hamn" stämmer.
- **Örstig Camping** (Nyköping) → `curated-997-örstig-camping,-nyköping` "Örstig Camping" [camping] – latrin+gravatten – low
- **Camping Tiveden** (Tiveden, Laxå kommun) → `osm-way-209099520` "Camping Tiveden" [camping] – latrin+gravatten+vatten – medium – Motstridiga uppgifter: en källa säger bara gråvatten för husbil, andra (stallplatskartan – boilerplate-risk) säger full service. Egen sajt campingtiveden.se egress-blockad. Förväxla inte med "Camping vid Tiveden"/Harge Resort (hargeresort.se, Askersund) som har egen spolplatta för gråvatten + färskvatten och latrintömning i servicehuset. Verifiera latrin mot egen sajt innan tillägg.
- **Husabergsuddes Camping** (Askersund) → `osm-way-833560844` "Husabergsudde Camping" [camping] – latrin+vatten – low
- **Djulöbadets Camping & Stugby** (Katrineholm) → `osm-way-666718259` "Djulöbadets Camping & Stugby" [camping,stallplats] – latrin+gravatten – low
- **Djupadalsbadet bad och camping** (Kumla) → `osm-way-327569058` "Djupadalsbadets camping" [camping,stallplats] – latrin+gravatten+vatten – high – Säsong ca 20 apr–27 sep. Matchningen mot OSM "Djupadalsbadets camping" stämmer.
- **Gästhamnen i Kristinehamn** (Kristinehamn) → `osm-node-2951375523` "Ställplats för husbil vid Kristinehamns gästhamn – ställplats (Hamnvägen 9)" [stallplats] – latrin+gravatten+vatten – high – OSÄKER matchning – Matchningen mot OSM "Ställplats för husbil vid Kristinehamns gästhamn – ställplats (Hamnvägen 9)" stämmer (samma adress).
- **Hällarnas camping** (Arboga) → `osm-node-11576334936` "Hällarnas Camping" [vatten,camping,stallplats] – latrin – low
- **Malmöns Camping** (Köping) → `osm-way-513164948` "Malmöns Camping" [camping] – latrin+gravatten+vatten – high – Latrintömning belagd i operatörens egna sidtext (via sökträff – sajten blockad för direkt hämtning). Gråvatten bara från listningssajter.
- **Tömningsplats Västerås** (Västerås) → `osm-way-843425947` "Ställplats Västerås Gästhamn" [vatten,stallplats] – latrin+vatten – high – Kartan har REDAN 'Tömningsplats Lögarängen Västerås' (curated-118, 59.60217/16.54629, latrin+gravatten) 150 m från gästhamnsposten – matchningen mot 'Ställplats Västerås Gästhamn' är alltså inte helt fel men posten finns. MOTSÄGELSE: operatören säger uttryckligen INGEN gråvattentömning (curated-118 och husbilsplats påstår gråvatten). Säsong 15 apr–31 okt.
- **Arvika småbåtshamn** (Arvika) → `osm-node-12118347556` "Camping i Arvika kommun" [camping,stallplats] – latrin+gravatten+vatten – high – OSÄKER matchning – MATCHNINGEN ÄR FEL: existingName 'Camping i Arvika kommun' ligger 17 km bort. Kartan har 'Ställplats för husbil, Strand' (osm-way-1423820275, 59.65197/12.57893, gravatten+latrin+vatten+stallplats) ~1 km från hamnen – kan vara samma plats eller en granne; hamnen ligger vid Kyrkviken ca 400 m från centrum (~59.655, 12.59).
- **Kapellskärs Camping** (E18, Kapellskär, Norrtälje kommun) → `osm-way-216733131` "Kapellskärs Camping" [camping] – latrin+gravatten+vatten – high – Turistrådskälla (visitroslagen.se) – konkret citat. Tömning även för externa gäster mot avgift.
- **Eskilns Bad & Camping** (Fagersta) → `osm-node-431825744` "Eskilns Bad & Camping" [camping,stallplats] – latrin+gravatten+vatten – low – MATCHNINGEN ÄR FEL: platsen ligger i FAGERSTA (Västmanland), inte Eskilstuna – finns redan i kartan som osm-node-431825744 'Eskilns Bad & Camping' (59.97998, 15.79339, camping+stallplats). Egen sajt eskilnscamping.se nämner bara 'servicehus' i sökträffar – ingen konkret uppgift om latrin/gråvatten hittad. Ingen primärkälla. Telefon 0223-130 22. [Omkörd matchning: SAKNAS HELT → FINNS UTAN TÖMNING]
- **Torsby Camping** (Torsby) → `osm-way-440544860` "Torsby Camping" [camping] – latrin+gravatten – low
- **Trafikverkets rastplats W1** (Borlänge) → `osm-way-298751754` "Långsjöns rastplats" [vatten] – latrin+vatten – low – INTE saknad: koordinaten är Rastplats LÅNGSJÖN på rv 50 söder om Borlänge – finns redan som tv-SE_STA_TRISSID_1_13658181 'Rastplats Långsjön' (sopor) och osm-way-298751754 'Långsjöns rastplats' (vatten). 'W1' är husbilsplats egen kod, inte Trafikverkets namn. Ingen primärkälla för latrin nåbar. [Omkörd matchning: SAKNAS HELT → FINNS UTAN TÖMNING]
- **Säters camping** (Säter) → `osm-way-332521091` "Säters Camping" [vatten,camping,stallplats] – latrin+gravatten+vatten – high – Operatörens egen sida i sökträffen med konkret citat.
- **Dalarna Älvcamping** () → `osm-way-405404270` "Dalarna Älvcamping" [camping,stallplats] – latrin+gravatten+vatten – low
- **Malungs Camping** (Malung, Malung-Sälen kommun) → `curated-949-malungs-golfklubb` "Malungs Golfklubb" [stallplats] – latrin+gravatten – low – OSÄKER matchning
- **Smednäset camping** (Linghed, Falun kommun) → `osm-way-52395000` "Smednäsets Camping" [camping] – latrin+gravatten+vatten – medium – MATCHNINGEN ÄR FEL (nearLat/nearLon gissade Ludvika): platsen ligger vid Svärdsjön i Linghed, Falu kommun, och FINNS REDAN som 'Smednäsets Camping' (curated-495, 60.77822/15.89835, camping+gravatten+latrin+vatten) + OSM 'Caravan Club Smednäset'. Inget att lägga till. [Omkörd matchning: SAKNAS HELT → FINNS UTAN TÖMNING]
- **First Camp Siljansbadet** (Rättvik) → `curated-938-first-camp-siljansbadet,-rättvik` "First Camp Siljansbadet" [camping] – latrin+gravatten+vatten – high – Även genomresande kan tömma/fylla (60 kr, från kl 12).
- **Rättviksbacken** (Rättvik) → `curated-936-rättviksbacken,-rättvik` "Rättviksbacken" [stallplats] – latrin+vatten – low
- **Ockelbo Camping** (Ockelbo) → `curated-967-ockelbo-camping,-ockelbo` "Ockelbo camping (CC Ockelbo)" [camping] – latrin – low – OSÄKER matchning
- **First Camp Moraparken** (Mora) → `osm-relation-11918991` "First Camp Moraparken" [camping,stallplats] – latrin+gravatten – low
- **Mora Life Åmåsängsgården** (Mora) → `curated-927-mora-life-åmåsängsgården,-mora` "Mora Life Åmåsängsgården" [camping] – latrin+gravatten – low
- **Sälen Lindvallen** (Sälen, Malung-Sälen kommun) → `osm-way-587873232` "Sälens Husvans Camping" [camping] – latrin+gravatten – low – OSÄKER matchning
- **Furudals Vandrarhem & Camping** (Furudal, Rättvik kommun) → `osm-way-455768122` "Furudals Vandrarhem och Camping" [camping] – latrin+gravatten+vatten – low
- **Älvdalens camping** (Älvdalen) → `osm-way-308769960` "Älvdalens Camping" [camping] – latrin+gravatten+vatten – low – Egen sajt alvdalenscamping.se dök inte upp i sökträffarna (blockad för hämtning). OBS stallplatskartan.se använder ofta boilerplate-text ('modern latrintömningsautomat') – räknas inte som belägg.
- **Stenö Havsbad & Camping** (Sandarne, Söderhamn kommun) → `osm-way-184629907` "Stenö Havsbad & Camping" [camping] – latrin+vatten – low
- **Långnäs Camping** (Bollnäs) → `osm-node-431825851` "Långnäs Camping" [camping] – latrin+gravatten+vatten – low
- **Vevlingestrands Camping Bollnäs** (Bollnäs) → `osm-way-289887479` "Bollnäs Camping" [camping] – latrin+gravatten+vatten – low – OSÄKER matchning
- **Voxnabruks Kanot & Camping** (Voxnabruk, Ovanåker kommun) → `osm-node-431825852` "Voxnadalens Kanot o Camping" [camping] – latrin+vatten – low – OSÄKER matchning
- **Malnbadens Camping** (Hudiksvall) → `osm-node-333781943` "Malnbadens Camping & Vandrarhem" [camping] – latrin+vatten – medium – Matchningen missade registerposten "First Camp Malnbaden" (query-baserad, Hudiksvall) – OSM-posten osm-way-136578863 är samma anläggning och slås ihop i runtime om registerposten geokodats. Kontrollera efter deploy att registerposten faktiskt publiceras.
- **Järvsö Camping B & B Stugor** (Rv 83, Järvsö, Ljusdal kommun) → `osm-way-1297195242` "Järvsö Camping" [vatten,camping,stallplats] – latrin – low
- **Grövelsjön Sjöstugan** (Grövelsjön, Älvdalen kommun) → `osm-node-1774556070` "STF Grövelsjön" [stallplats] – latrin+gravatten+vatten – low – OSÄKER matchning
- **Vemdalens Camping** (Vemdalen, Härjedalen kommun) → `osm-relation-15920111` "Vemdalens Camping" [camping,stallplats] – latrin+gravatten+vatten – medium – Gråvatten+färskvatten belagt av destinationssajt (medium); latrin bara från listningssajter – lägg latrin som obekräftad (unverifiedServices) om den tas med. Nyligen ägarbyte.
- **Antjärns Camping** (E4, Antjärn, Härnösand kommun) → `osm-way-701583507` "Antjärns camping" [stallplats] – latrin+gravatten+vatten – high – OSÄKER matchning – Matchningen (19.9 km från ort) beror på att "Antjärn"-koordinaten i raden är fel – OSM-posten osm-way-701583507 "Antjärns camping" är rätt anläggning (8 km S om Härnösand vid E4). Säsong maj–sep.
- **Flogsta Camping** (Kramfors) → `osm-node-3259429469` "Ställplats för husbil vid Flogsta Camping" [stallplats] – latrin+gravatten – medium – Matchningen missade registerposten; OSM-posten "Ställplats för husbil vid Flogsta Camping" slås ihop med den i runtime. Ingen åtgärd.
- **Sandvikens Camping & Stugby** (Östersund) → `osm-way-108138872` "Sandvikens Camping & Stugby" [stallplats] – latrin+vatten – high – MATCHNINGEN ÄR FEL: detta är INTE Sandviken i Gästrikland utan Sandvikens Camping & Stugby vid Storsjön, Östersund (Jämtland). Finns redan som osm-way-108138872 'Sandvikens Camping & Stugby' (63.15211/14.58297, bara stallplats) – komplettera den med latrin+vatten. Citat ur söksammandrag av egen sajt. [Omkörd matchning: SAKNAS HELT → FINNS UTAN TÖMNING]
- **Sollefteå Camping Risön** (Sollefteå) → `osm-node-431825840` "Sollefteå Camping Risön" [camping] – latrin+gravatten – medium – Matchningen missade registerposten. Ingen åtgärd.
- **Örnsköldsviks Gästhamn** (E4, Örnsköldsvik) → `osm-way-360207206` "Örnsköldsviks gästhamn" [stallplats] – latrin+gravatten+vatten – high – Tömning ej vintertid (öppettidsnotis). OSM-posten osm-way-360207206 är rätt anläggning.
- **Björna Camping** (Björna, Örnsköldsvik kommun) → `osm-way-744099826` "Björna Camping & Restaurang" [camping,stallplats] – latrin+vatten – low
- **Nordmalings Camping** (E4, Nordmaling) → `osm-way-230271150` "Nordmalings Camping" [vatten,camping,stallplats] – latrin+gravatten+vatten – high – Registret har redan posten (63.5746/19.4567) men med latrin/gravatten som unverifiedServices – kan nu uppgraderas till bekräftade tjänster med citatet ovan.
- **Kallsedets Camping & Stugor** (Kallsedet, Åre kommun) → `osm-way-648806218` "Kallsedets Camping & Stugor" [camping,stallplats] – latrin+vatten – low
- **Hotings camping** (E45, Hoting, Strömsund kommun) → `osm-relation-10885743` "Hotings Camping" [camping,stallplats] – latrin+gravatten+vatten – low – Läs hotingscamping.se i webbläsare för citat. Registret har en separat post "Hoting – Europaväg 45" (annan plats).
- **Vindelns Camping** (Vindeln) → `osm-way-322963649` "Vindelns Camping" [camping,stallplats] – latrin+gravatten – high – NAMN: sajten heter "Vindelforsarnas Camping" – Vindelns enda camping, vid Vindelforsarna i Vindeln (samma läge som OSM-posten "Vindelns Camping"). Uppdatera gärna namnet i registret. Färskvatten nämns inte uttryckligen.
- **Lufta Camping** (E4, Ånäset, Robertsfors kommun) → `osm-node-431824505` "Lufta Camping" [camping,stallplats] – latrin+gravatten+vatten – low – Ingen primärkälla nådd – lägg som obekräftad eller kolla luftacamping.se i webbläsare.
- **Gäddede Camping och Stugby** (Gäddede, Strömsund kommun) → `osm-relation-10885559` "Gäddede Camping & Stugby" [camping,stallplats] – latrin – medium – Matchningen missade registerposten. Ta bort/slå ihop den obekräftade dubbletten i registret.
- **Bureå Camping** (E4, Bureå, Skellefteå kommun) → `osm-way-292413102` "Bureå Camping" [camping] – latrin+gravatten – medium – Matchningen missade registerposten. Ingen åtgärd.
- **Kattisavans Camping** (E12, Lycksele) → `osm-node-431824537` "Kattisavans Camping" [camping] – latrin+gravatten – medium – Matchningen missade registerposten. Ingen åtgärd.
- **Pite Havsbad** (Piteå) → `osm-node-431824650` "Pite Havsbad" [camping] – latrin+gravatten+vatten – medium – Matchningen missade registerposten (9.2 km från ort = Piteå centrum; Pite Havsbad ligger vid kusten). Kontrollera att registerposten publiceras/geokodas rätt.
- **Sorsele Camping & Vandrarhem** (E45, Sorsele) → `osm-way-204474774` "Sorsele Camping" [camping,stallplats] – latrin+vatten – low – Matchningen missade registerposten. Registerkällan är tredjepart (husbilhusvagn.se) → bör egentligen vara medium/low, men posten finns redan.
- **Camp Frevisören Kalix Havsbad** (Båtskärsnäs, Kalix kommun) → `osm-way-298136956` "Frevisören Camp & Resort" [camping] – latrin+gravatten+vatten – low – OSÄKER matchning – Registret har redan en obekräftad post "Camp Frevisören Kalix Havsbad" (unverified, inga tjänster). OSM-posten "Frevisören Camp & Resort" är samma anläggning. Läs frevisoren.se i webbläsare.

### Saknas helt – ingen tjänst angiven på sidan (svaga kandidater) (47)

- Eslövs station (Eslöv)
- Skeppsbron (Landskrona)
- Orebackens Camping ()
- Bella Place (Bromölla)
- Lyckebyfjärden (Karlskrona)
- Trafikverkets rastplats K4 ()
- Ställplats - Arontorp (Arontorp, Mörbylånga kommun)
- Flatenbadets Stugor & Camping ()
- Trafikverkets rastplats H8 (31, Orrefors, Nybro kommun)
- Hoburgsgubben (Burgsvik, Gotland kommun)
- Sandkvie (Burgsvik, Gotland kommun)
- Trafikverkets rastplats H3 (E22, Mönsterås)
- First Camp Löttorp (Löttorp, Borgholm kommun)
- Frillesås Badförening (Frillesås, Kungsbacka kommun)
- Trafikverkets rastplats F12 (Vetlanda)
- Tranemo (Tranemo)
- Trafikverkets rastplats F4 ()
- Bönareds ställplats ()
- Fiskebäcks småbåtshamn Grefab (Göteborg)
- Trafikverkets rastplats F14 (Eksjö)
- Kongelfs Gästgifveri & Citycamping (Kungälv)
- Trafikverkets rastplats O29 ()
- Trafikverkets rastplats O51 ()
- Trafikverkets rastplats F15 (Tranås)
- Herrljunga Golfklubb (Herrljunga)
- Orust-Vasseröd (Vasseröd, Orust kommun)
- Fribergs Fritidscenter (Skövde)
- Billingehus (Skövde)
- Trafikverkets rastplats E12 ()
- Trafikverkets rastplats E6 (E22, Norrköping)
- Skötteruds Gård (Mellerud)
- Jonsboda Café o Camping (Töreboda)
- Dals Eds båtklubb (Dals-Ed)
- Flatenbadets Stugor & Camping (Stockholm)
- Trafikverkets rastplats S2 ()
- Rastplats Svedvi västergående (E18, Hallstahammar)
- Mangenbadens Camping (Gräsmark, Sunne kommun)
- Silvköparens Camping (Sala)
- Kyrksjön ()
- Sörälvens Fiske Camping (Idre, Älvdalen kommun)
- Hassela Camping (Hassela, Nordanstig kommun)
- Höga kusten - bron (E4, Kramfors)
- Norråkers Camping & Fiskecenter (Norråker, Strömsund kommun)
- Kolgårdens Stugby & Camping (Storuman)
- Örnviks Camping (Luleå)
- Kukkolaforsen Turist & Konferens (Haparanda)
- Norrsken Lodge (Övertorneå)

### Finns i kartan, sidan anger ingen tjänst (93)

- Ystads Reningsverk (Ystad) → "Husbilsparkering i Ystad" [stallplats]
- Godsmagasinet i Simrishamn (Simrishamn) → "Godsmagasinet i Simrishamn" [stallplats]
- Vattentornet i Kristianstad (Kristianstad) → "Parkeringsplats för husbil i Kristianstad" [stallplats] – OSÄKER
- Bromölla Camping & Vandrarhem (Bromölla) → "Camping, Bromölla" [camping]
- Väggaviken Karlshamn (Karlshamn) → "Väggaviken Karlshamn" [stallplats]
- Väggaviken (Karlshamn) → "Väggaviken Karlshamn" [stallplats] – OSÄKER
- Ronneby Marina (Ronneby) → "Ronneby Marina" [stallplats]
- Råbocka Familjecamping (Ängelholm) → "Råbocka Familjecamping" [camping,stallplats]
- Vittsjö Camping (Vittsjö, Hässleholm kommun) → "Vittsjö Camping" [camping]
- Dalskärs Camping (Bergkvara, Torsås kommun) → "Dalskärs Camping" [camping,stallplats]
- Allégården Kastlösa (Kastlösa, Mörbylånga kommun) → "Allégården Kastlösa" [camping]
- Näsets naturcamping (Tingsryd) → "Rotahults NaturCamping" [camping,stallplats] – OSÄKER
- Haga Park Camping (Mörbylånga) → "Haga Park Camping & stugor" [camping,stallplats]
- Eriksöre Camping (Färjestaden, Mörbylånga kommun) → "Eriksöre Camping & Stugor" [camping,stallplats]
- Emmaboda Camping (Emmaboda) → "Emmaboda Camping" [camping]
- Möllstorps Camping (Färjestaden, Mörbylånga kommun) → "Möllstorps Camping o Stugor" [camping,stallplats]
- Gästhamnen i Kalmar (Kalmar) → "Kalmar husbilsparkering" [stallplats] – OSÄKER
- Ställplats Halmstad - BK Najaden (Halmstad) → "Ställplats BK Najaden" [stallplats] – OSÄKER
- Olofsbo Camping (Olofsbo, Falkenberg kommun) → "Olofsbo Camping" [camping]
- Mönsterås hamn (Mönsterås) → "Mönsterås hamn" [stallplats]
- Braås Camping (Braås, Växjö kommun) → "Camping, Braås" [camping]
- Värnamo Camping (Värnamo) → "Värnamo Camping" [camping]
- Ställplats Gislaved (Gislaved) → "Ställplats Gislaved" [stallplats]
- Gnosjö (Gnosjö) → "Ställplats Gnosjö" [stallplats]
- Klintehamn (Klintehamn, Gotland kommun) → "ÅVC Klintehamn" [sopor]
- Kungsbacka Golfklubb (Kungsbacka) → "Kungsbacka Golfklubb" [stallplats]
- Vimmerby Camping (Vimmerby) → "Camping i Vimmerby kommun" [camping] – OSÄKER
- Eksjö Camping (Eksjö) → "Eksjö Camping" [camping]
- Ställplats Klippan - Göteborg (Göteborg) → "Ställplats Klippan" [stallplats] – OSÄKER
- Mobilen Borås (Borås) → "Borås Golfklubb – ställplats" [stallplats] – OSÄKER
- Slite Camping (Slite, Gotland kommun) → "Slite Camping" [camping]
- Borås Camping (Borås) → "Borås Camping" [camping]
- Mullsjö Camping (Mullsjö) → "Mullsjö camping" [camping,stallplats]
- Tånga Heds Camping (Vårgårda) → "Tånga Heds Camping" [camping]
- Stenungsunds Camping (Stenungsund) → "Camping i Stenungsunds kommun" [camping]
- Mössebergs camping (Falköping) → "Ställplats för husbil vid Mössebergs Camping" [stallplats]
- Tidaholm (Tidaholm) → "Tidaholms Camping" [camping,stallplats]
- Malö camping (Malö, Orust kommun) → "Malö Camping" [camping]
- Grännäs Camping och Stugby (Valdemarsvik) → "Grännäs Camping och Stugby" [vatten,camping,stallplats]
- Lysekils Marina (Lysekil) → "Lysekil Fiskhamnen" [stallplats] – OSÄKER
- Siviks Camping (Lysekil) → "Siviks camping" [camping]
- Hafsten Resort och Camping (Uddevalla) → "Hafsten Resort" [camping,stallplats]
- Uddevalla husbilsparkering (Uddevalla) → "Uddevalla husbilsparkering" [stallplats]
- Smögenbryggans Parkering (Smögen, Sotenäs kommun) → "Återvinningscentral vid Smögen" [sopor]
- Vadstena Camping (Vadstena) → "Vadstena Camping" [camping,stallplats]
- Göta kanal Söderköping (Söderköping) → "Ställplats för husbil vid Ställplats Göta kanal Söderköping" [stallplats]
- Karlsborgs Camping (Karlsborg) → "Karlsborgs Camping" [camping,stallplats]
- Z-Parkens Camping (Motala) → "Z-parkens Camping" [stallplats]
- Norrköping Centrum (Norrköping) → "Ställplats för husbil i Norrköpings kommun" [stallplats] – OSÄKER
- GrebbestadFjorden (Grebbestad, Tanum kommun) → "Grebbestad Fjorden" [camping] – OSÄKER
- Töreboda Camping & Bad (Töreboda) → "Töreboda Camping" [stallplats]
- Yttre hamnen i Mariestad (Mariestad) → "Yttre hamnen i Mariestad" [stallplats]
- Tanum Shoppingcenter (E6, Tanumshede, Tanum kommun) → "Ställplats för husbil vid GasolAutomat.se – Tanum Shoppingcenter, Tanumshede" [stallplats] – OSÄKER
- Sibrobadet ställplats (Sibro, Nyköping kommun) → "Sibrobadet ställplats" [stallplats] – OSÄKER
- First Camp Nickstabadet (Nynäshamn) → "First Camp Nickstabadet" [camping]
- Tömningsplats Örebro (Örebro) → "Vattenpåfyllning vid Örebro Truckstop tömningsstation" [vatten]
- First Camp Mörudden (Hammarö) → "Återvinningscentral vid First Camp Mörudden" [sopor]
- Tömningsplats Strängnäs reningsverk (Strängnäs) → "Ställplats Strängnäs gästhamn" [vatten,stallplats]
- Waxholms Camping (Vaxholm) → "Waxholms Camping" [camping,stallplats]
- Frykenbadens Camping (Kil) → "Frykenbadens Camping" [camping,stallplats]
- Ställplats Köping (Köping) → "Köpings Golfklubb" [stallplats]
- Nordic Camping Bredsand (Enköping) → "Vattenpåfyllning vid Bredsands Camping" [vatten] – OSÄKER
- Upplands Bil & Fritidscenter (Knivsta) → "Upplands Bil & Fritidscenter" [stallplats]
- Norrtälje Camping (Norrtälje) → "Norrtälje Sportcentrum ställplats" [stallplats] – OSÄKER
- Björkö Örns Camping (Björkö, Norrtälje kommun) → "Björkö Örns Havscamping" [camping] – OSÄKER
- Fyrishov Stugby och Camping (Uppsala) → "Fyrishov Stugby och Camping" [camping]
- Grisslehamns Marina & Camping (Grisslehamn, Norrtälje kommun) → "Grisslehamns Husvagnscamping" [camping] – OSÄKER
- Vansbro Camping (Vansbro) → "Vansbro Camping" [camping]
- Hemlingbystugan (Gävle) → "Camping, Hemlingby" [camping]
- Rastplats Bollnäs (Rv 83, Bollnäs) → "Rastplats Bollnäs" [stallplats]
- Nornäs Camping (Nornäs, Älvdalen kommun) → "Ställplats för husbil, Nornäs" [stallplats] – OSÄKER
- Orbadens Camping (Vallsta, Bollnäs kommun) → "Orbadens Camping" [camping]
- Ställplats Håckstaviken (Hudiksvall) → "Ställplats Håckstaviken" [stallplats]
- Idre Fjäll Camping (Idre, Älvdalen kommun) → "Camping, Idre Bergsby" [camping,stallplats] – OSÄKER
- Svegs Camping (E45, Sveg, Härjedalen kommun) → "Svegs Camping" [camping]
- Trafikverkets rastplats Ytterhogdal (Rv 84, Ytterhogdal, Härjedalen kommun) → "Rastplats Ytterhogdal" [sopor]
- Gästhamnen i Sundsvall (E4, Sundsvall) → "Gästhamnen i Sundsvall" [stallplats]
- Storsands Camping Östavall (E14, Östavall, Ånge kommun) → "Storsands Camping" [camping] – OSÄKER
- Sälstens Camping (Härnösand) → "Sälstens camping" [camping]
- Östersunds Stugby & Camping (E14, Östersund) → "Östersunds camping" [camping]
- Krokomsvikens Camping (E14, Krokom) → "Krokomsvikens camping" [camping,stallplats]
- Åre Camping (E14, Åre) → "Ställplats för husbil, Åre" [stallplats]
- Umeå Golfklubb (Umeå) → "Umeå Golfklubb" [stallplats]
- Lundaåkern i Umeå (Umeå) → "Umeå – Järnvägsallén" [stallplats] – OSÄKER
- Strömsunds Camping (E45, Strömsund) → "Strömsunds Camping" [camping]
- Meselefors Camping (E45, Vilhelmina) → "Meselefors Vandrarhem & Camping" [camping]
- Ragvaldsträsk ställplats (Ragvaldsträsk, Skellefteå kommun) → "Ragvaldsträsk ställplats" [stallplats,vatten]
- Skellefteå Campus (Skellefteå) → "Skellefteå Campus" [stallplats]
- Camp Gielas (Arvidsjaur) → "Camp Gielas" [camping]
- Norra hamnen i Luleå (Luleå) → "Norra hamnen i Luleå" [stallplats]
- Husvagnscenter i Luleå (Luleå) → "Husvagnscenter i Luleå" [stallplats]
- First Camp Arcus Luleå (E4, Luleå) → "First Camp Luleå" [camping,stallplats] – OSÄKER
- Kalix Camping (E4, Kalix) → "Kalix Camping" [stallplats]

### Finns med tömning (114)

- Trelleborg - centralstationen (Trelleborg) → "Trelleborg Ställplats" [gravatten,latrin,vatten,stallplats] – OSÄKER
- Ställplats Skillinge (Skillinge, Simrishamn kommun) → "Tömningsstation, Skillinge" [gravatten,latrin]
- Småbåtshamnen i Simrishamn (Simrishamn) → "Småbåtshamnen Simrishamn ställplats" [latrin,stallplats]
- Borstahusens camping (Landskrona) → "Borstahusens Camping" [camping,stallplats,gravatten,latrin,vatten]
- Skånes Djurparks Camping & Grottby (Höör) → "Skånes Djurparks Camping & Grottby" [latrin,gravatten,vatten,camping]
- Sandhamn Marine (Torhamn, Karlskrona kommun) → "Sandhamn Ställplatser och Stugor" [gravatten,latrin,stallplats] – OSÄKER
- Tömningsplats Klippan (Klippan) → "Tömningsstation, Klippan" [gravatten,latrin]
- Persköps Ställplats (Perstorp kommun) → "Persköps ställplats" [gravatten,latrin,vatten,stallplats] – OSÄKER
- Tömningsplats Karlskrona (Karlskrona) → "Tömningsstation, Pantarholmen" [gravatten,latrin,vatten]
- Dragsö Camping & Stugby (Karlskrona) → "Dragsö Camping" [gravatten,latrin,vatten,camping,stallplats]
- Hamnen i Höganäs (Höganäs) → "Höganäs Båtsällskap ställplats" [stallplats,latrin,vatten] – OSÄKER
- Ställplats Bananpannkakan Höganäs (Höganäs) → "Höganäs Båtsällskap ställplats" [stallplats,latrin,vatten] – OSÄKER
- Ronneby hamn (Ronneby) → "Tömningsstation vid Ronneby Hamn" [gravatten,latrin]
- Tömningsplats Sjöboda (Traryd, Markaryd kommun) → "Rastplats Sjöboda N" [latrin,sopor]
- Tömningsplats Svinö (Kalmar) → "Svinö tömningsstation" [latrin,gravatten,vatten]
- Citycamp Halmstad (Halmstad) → "Citycamp Halmstad" [gravatten,latrin,vatten,stallplats]
- Borgholms reningsverk (Borgholm) → "Borgholms tömningsstation" [latrin,gravatten,vatten]
- Falkenbergs båtsällskap (Falkenberg) → "Falkenbergs Båtsällskap ställplats" [latrin,gravatten,stallplats]
- Bolmens Camping (Ljungby) → "Tömningsstation vid Bolmens Camping" [gravatten,latrin]
- Alvesta Golfklubb (Alvesta) → "Alvesta tömningsplats" [gravatten,latrin]
- Evedals camping (Växjö) → "Evedals Camping" [gravatten,latrin,vatten,camping,stallplats]
- Burgsviks camping (Burgsvik, Gotland kommun) → "Burgsvik" [gravatten,latrin]
- Tömningsplats Varberg (Varberg) → "Tömningsplats Varberg" [latrin,gravatten,stallplats]
- Gekåsbyn Ullared Stugby & Camping (Ullared, Falkenberg kommun) → "Gekås Camping (Gekåsbyn)" [camping,gravatten,latrin,vatten] – OSÄKER
- Sandbybadets Camping (Löttorp, Borgholm kommun) → "Sandbybadets Camping" [gravatten,latrin,vatten,camping,stallplats]
- Kärradal Camping CC (Kärradal, Varberg kommun) → "Tömningsstation, Kärradal" [gravatten,latrin,vatten]
- Trafikverkets rastplats Hörle södergående (E4, Värnamo) → "Rastplats Hörle V" [latrin,sopor]
- Trafikverkets rastplats Hörle norrgående (E4, Värnamo) → "Rastplats Hörle V" [latrin,sopor]
- First Camp Gunnarsö (Oskarshamn) → "First Camp Gunnarsö" [latrin,gravatten,stallplats]
- Norra kajen i Oskarshamn (Oskarshamn) → "Oskarshamns Gästhamn" [latrin,stallplats] – OSÄKER
- Byxelkrok (Byxelkrok, Borgholm kommun) → "Ställplats Byxelkrok" [gravatten,latrin,stallplats]
- Trafikverkets rastplats N7 vid Torpasjön (E6/E20, Åsa, Kungsbacka kommun) → "Rastplats Torpasjön " [latrin,sopor]
- Sävsjö Camping (Sävsjö) → "Sävsjö Camping & Vandrarhem" [gravatten,latrin,vatten,camping,stallplats]
- Blankaholms gästhamn (Blankaholm, Västervik kommun) → "Gästhamn Blankaholm" [gravatten,latrin,stallplats]
- Visby reningsverk (Visby, Gotland kommun) → "Visby avloppsreningsverk tömningsstation" [latrin,gravatten,vatten]
- Trafikverkets Rastplats Nässjöbyn (40, Nässjö) → "Rastplats Nässjöbyn" [latrin,sopor]
- Snäck Camping (Visby, Gotland kommun) → "Snäckan" [gravatten,latrin,camping,stallplats] – OSÄKER
- Trafikverkets rastplats Transåssjön västra (40, Borås) → "Rastplats Stora Transåssjön V" [latrin,sopor] – OSÄKER
- Trafikverkets rastplats Transåssjön östra (40, Borås) → "Rastplats Stora Transåssjön Ö" [latrin,sopor] – OSÄKER
- Rastplats Partille västergående (E20, Partille) → "Rastplats Partille" [latrin,sopor]
- Partille ställplats (Partille) → "Rastplats Partille" [latrin,sopor]
- Västervik Resort (Västervik) → "Västervik Resort" [latrin,gravatten,vatten,stallplats]
- Tömningsplats Västervik (Västervik) → "Tömningsplats Västervik" [latrin,gravatten,stallplats]
- IFK Västervik (latrintömning vid Lysingsbadet) (Västervik) → "Lysingsbadet Västervik Resort" [gravatten,latrin,camping,stallplats] – OSÄKER
- Tömningsplats Ulricehamn (Ulricehamn) → "Tömningsstation vid Tömningsplats Ulricehamn" [gravatten,latrin]
- Rastplats Tollered (E20, Tollered, Lerum kommun) → "Rastplats Tollered" [latrin,sopor]
- Mossholmen Marina (Mossholmen, Tjörn kommun) → "Ställplats Mossholmen Tjörn" [latrin,stallplats] – OSÄKER
- Åtvidabergs Camping (Åtvidaberg) → "Åtvidaberg serviceställe för husbilar" [gravatten,latrin,vatten] – OSÄKER
- Tömningsplats Valdemarsvik (Valdemarsvik) → "Valdemarsviks gästhamn ställplats" [latrin,stallplats]
- Trollhättans slussområde (Trollhättan) → "Ställplats Slussområdet Trollhättan" [latrin,gravatten,vatten,stallplats]
- Fritidscenter i Trollhättan (Trollhättan) → "Trollhättans Camping Hjulkvarnelund" [gravatten,latrin,camping,stallplats] – OSÄKER
- Tömningsplats Mjölby (Mjölby) → "Trafikverkets rastplats Mjölby" [latrin,gravatten,vatten,stallplats]
- Trafikverkets rastplats - Mjölby (E4, Mjölby) → "Trafikverkets rastplats Mjölby" [latrin,gravatten,vatten,stallplats]
- Skara Stadscamping & Stugby (Skara) → "Tömningsstation Skara (Björkelundsgatan)" [latrin,gravatten,vatten] – OSÄKER
- Rastplats Saltkällan (E6, Munkedal) → "Tömningsstation vid Rastplats Saltkällan" [gravatten,latrin]
- Tömningsplats Hunnebostrand (Hunnebostrand, Sotenäs kommun) → "Tömningsstation vid Hunnebostrands Camping & Stugor" [gravatten,latrin]
- Hunnebostrand (Hunnebostrand, Sotenäs kommun) → "Tömningsstation vid Hunnebostrands Camping & Stugor" [gravatten,latrin]
- Ställplats Kedumsvik (Kedumsvik) → "Kedumsvik ställplats" [gravatten,latrin,stallplats]
- KronoCamping Lidköping (Lidköping) → "KronoCamping Lidköping" [gravatten,latrin,vatten,stallplats]
- Motala Södra Allén (Motala) → "Ställplats Södra Allén Motala" [latrin,gravatten,vatten,stallplats]
- Jogersö Camping (Oxelösund) → "Jogersö Camping" [gravatten,latrin,vatten,camping,stallplats]
- Rastplats Bergs kullar (E45, Mellerud) → "Rastplats Bergs Kullar" [latrin,sopor]
- Trosa Gästhamn (Trosa) → "Ställplats för husbil vid Trosa Gästhamn" [gravatten,latrin,stallplats]
- Bojarparkeringen (Strömstad) → "Bojarparkeringen Strömstad" [latrin,vatten,stallplats] – OSÄKER
- Ställplats i Bengtsfors (Bengtsfors) → "Ställplats Bengtsfors" [latrin,vatten,stallplats]
- Ställplats Åmål (Åmål) → "Rastplats Åmål" [latrin,sopor]
- Rastplats Åmål (E45, Åmål) → "Rastplats Åmål" [latrin,sopor]
- Malmköpings Bad & Camping (Malmköping, Flen kommun) → "Malmköpings Bad & Camping" [gravatten,latrin,vatten,camping,stallplats]
- Tömningsplats Säffle (Säffle) → "Tömningsstation Säffle" [latrin]
- Mariefreds Camping (Mariefred, Strängnäs kommun) → "Mariefreds camping" [gravatten,latrin,vatten,camping,stallplats]
- Gustavsvik Stugby & Camping (Örebro) → "Gustavsvik" [gravatten,latrin,stallplats]
- Ställplats Lungers hamn (Södra Lunger, Arboga kommun) → "Lungers hamn" [gravatten,latrin,stallplats]
- Tömningsplats Stockholm (Stockholm) → "Citycamp Stockholm" [latrin,gravatten,vatten,stallplats] – OSÄKER
- Citycamp Stockholm (Stockholm) → "Citycamp Stockholm" [latrin,gravatten,vatten,stallplats]
- Rastplats Strängnäsbron (E20, Strängnäs) → "Rastplats Strängnäsbron" [latrin,sopor]
- First Camp Skutberget (Karlstad) → "First Camp Skutberget-Karlstad" [gravatten,latrin,vatten,camping,stallplats]
- Årjäng Camping & Stugor Sommarvik (Årjäng) → "Tömningsstation vid Årjäng SweCamp Resort Sommarvik" [gravatten,latrin] – OSÄKER
- Rastplats Skoftesta skans västergående (E18, Kungsör) → "Rastplats Skoftesta V" [latrin,sopor]
- Sundbyholms gästhamn (Sundbyholm, Eskilstuna kommun) → "Sundbyholms gästhamn" [latrin,gravatten,stallplats]
- Lindesberg citycamping (Lindesberg) → "Tömningsstation vid Lindesbergs Citycamping" [gravatten,latrin,vatten]
- Räfsnäs Camping (Räfsnäs (Rådmansö), Norrtälje kommun) → "Räfsnäs Camping (Rådmansö)" [latrin,gravatten,vatten] – OSÄKER
- Sörälgens Camping (Hällefors) → "Sörälgens Camping" [gravatten,latrin,vatten,camping,stallplats]
- Folkets Park Hagfors (Hagfors) → "Ställplats Hagforsparken" [gravatten,latrin,vatten,stallplats] – OSÄKER
- Norbergs Camping (Norberg) → "Norbergs Camping" [latrin,gravatten,vatten,camping]
- Östa Camping (Tärnsjö, Heby kommun) → "Östa Camping" [gravatten,latrin,camping,stallplats]
- Tömningsplats Östhammar (Östhammar) → "Tömningsplats Östhammar" [latrin,gravatten]
- Älvkarleby Fiskecamping (Älvkarleby) → "Älvkarleby Fiskecamping" [gravatten,latrin,vatten,camping,stallplats]
- Ställplats Dalarna () → "Ställplats Dalarna" [gravatten,latrin,stallplats] – OSÄKER
- Tömningsplats Gävle (Gävle) → "Gävle gästhamn" [gravatten,latrin]
- Leksand Strand Camping & Resort (Leksand) → "Leksand Strand Camping & Resort" [latrin,gravatten,vatten,camping]
- Gävle Camping Engesberg (Gävle) → "Gävle Camping Engesberg" [latrin,gravatten,vatten,camping]
- Rastplats Johannisholm (E45, Johannisholm, Mora kommun) → "Rastplats Johannisholm" [latrin,sopor]
- First Camp Orsa (Orsa) → "First Camp Orsa tömningsstation" [latrin,gravatten,vatten,stallplats]
- Stugsundskajen (Söderhamn) → "Stugsunds ställplats" [gravatten,latrin,vatten,stallplats]
- Tömningsplats Hudiksvall (Hudiksvall) → "Hudiksvalls GK ställplats" [latrin,stallplats]
- Trafikverkets rastplats X10 (Rv 83/84, Ljusdal) → "Rastplats Ljusdal" [latrin,sopor]
- Ljusdals Camping (Ljusdal) → "Tömningsstation vid Ljusdals Camping" [gravatten,latrin]
- Lofsdalsfjällen Camping (Lofsdalen, Härjedalen kommun) → "Lofsdalsfjällen Camping" [gravatten,latrin,camping,stallplats]
- Tömningsplats Funäsdalen (Funäsdalen, Härjedalen kommun) → "Tömningsstation vid ÅVC Ljusnedal latrintömning" [gravatten,latrin]
- Latrintömning Härnösand (Härnösand) → "Tömningsstation vid Härnösand latrintömning" [gravatten,latrin,vatten]
- Rastplats Hänsjön () → "Rastplats Hänsjön" [latrin,sopor] – OSÄKER
- Hammarstrands Camping (Hammarstrand, Ragunda kommun) → "Hammarstrand Camping" [gravatten,latrin,vatten,camping,stallplats]
- Rastplats Krokom (E14, Krokom) → "Tömningsstation vid Rastplats Krokom" [gravatten,latrin]
- First Camp Umeå (E4, Umeå) → "Tömningsstation vid First Camp Umeå" [gravatten,latrin]
- Burträsk Camping (Burträsk, Skellefteå kommun) → "Burträsk Camping" [gravatten,latrin,vatten,camping,stallplats]
- Skellefteå Camping (E4, Skellefteå) → "Skellefteå – E4" [latrin,stallplats]
- Rastplats Tjärn (E4, Skellefteå) → "Rastplats Tjärn" [latrin,sopor]
- Haparanda hamn (E4, Haparanda) → "Ställplats Haparandahamn" [latrin,vatten,stallplats]
- Kamlunge Camping (Kamlunge, Kalix kommun) → "Tömningsstation vid Kamlunge Camping" [gravatten,latrin]
- Bränna Camping (Överkalix) → "Bränna Camping" [gravatten,latrin,vatten,camping,stallplats]
- Polcirkeln (E45, Jokkmokk) → "Rastplats Polcirkeln Jokkmokk" [latrin,sopor] – OSÄKER
- Arctic Camp Jokkmokk (Jokkmokk) → "Arctic Camp Jokkmokk" [gravatten,latrin,vatten,camping,stallplats]
- Gällivare Camping (E45, Gällivare) → "Gällivare Camping" [gravatten,latrin,vatten,camping,stallplats]
- Pajala Camping och Vandrarhem (Pajala) → "Tömningsstation vid Pajala Camping" [gravatten,latrin]

## Viktiga fynd från verifieringen

**Primärkälla bekräftar tömning (high) för platser som kartan saknar eller visar utan tömning:**
- Norrviken Camping, Båstad (caravanclub.se + Visit Båstad): latrin+gråvatten+vatten, CamperClean – ny post.
- Julared Ställplats, Habo (julared.se): gråvatten+vatten – ny post.
- Röks Lanthandel, Ödeshög (rokslanthandel.com): gråvatten – ny post.
- Storsjö camping och ställplats, Berg (egen sajt): latrin (tank+kassett) + vatten – ny post.
- Tömningsplats i Skara (skara.se): kommunal toatömning väster om Björkelundsgatan 12, vinterstängd 15 nov – kartans träff "Camping, Skara" är fel anläggning; kartan har dock "Tömningsstation Skara (Björkelundsgatan)" med tömning, så platsen finns troligen redan.
- Borgholm Tömningsstation (oland.se): 56.882723/16.653983, Kapellvägen – kartans koordinatträff "Kapelludden Camping" är fel; kartan har "Borgholms tömningsstation" 500 m bort med tömning → dubblettkoll, ev. flytta koordinaten.
- Tömningsplats Vadstena / Vadstena gästhamn & ställplatser (upplevvadstena.se): tömning året om vid ställplatsens infart – matchningen mot Vadstena Golfklubb är fel; samma station som registrets "Vadstena ställplats (gästhamnen)".
- Djupadalsbadet, Kumla (djupadalsbadet.se): latrin+gråvatten+vatten, säsong 20 apr–27 sep – komplettera befintlig camping-post.
- Gästhamnen i Kristinehamn (visitvarmland.com): latrin+gråvatten+vatten – komplettera.
- Tömningsplats Lysekil (hamn.lysekil.se): latrin+gråvatten+vatten vid Bangårdsgatan – komplettera "Lysekil Fiskhamnen".
- Tömningsplats Västerås (vasterasgasthamn.se): latrin+vatten, **uttryckligen INGEN gråvatten** – finns redan som "Tömningsplats Lögarängen Västerås" (curated-118).
- Arvika småbåtshamn (visitvarmland.com): kartan har "Ställplats för husbil, Strand" ~1 km bort med tömning – troligen samma.
- Kapellskärs Camping (visitroslagen.se), First Camp Sunne (= curated-309 "Sunne Camping Kolsnäs", redan komplett), Säters camping, First Camp Siljansbadet (60 kr även för genomresande), Sandvikens Camping & Stugby (**vid Storsjön/Östersund, inte Sandviken** – kartans osm-way-108138872 bara ställplats → komplettera), Malmöns Camping (Köping), Antjärns Camping, Örnsköldsviks Gästhamn (ej vintertid), Nordmalings Camping (registret har tjänsterna som obekräftade → kan uppgraderas), Vindelns Camping (heter nu Vindelforsarnas Camping).

**Primärkälla säger NEJ (motsäger webbsidan):**
- Åre Camping: Åre kommun säger "toalett men inte dusch eller toatömning" → latrin=false.
- Västerås gästhamn: ingen gråvattentömning (Mälarcampingen har det).
- Tömningsplats Arboga: inget vatten på plats (låg evidens).
- Hassela Camping och Örnviks Camping: husbilhusvagn.se säger ingen tömning alls (tredjepart mot tredjepart – oavgjort, låg).

**Fel i indata från webbsidorna, rättade i JSON:**
- Sandhamn Marine ligger i Torhamn, Karlskrona kommun – inte Värmdö.
- Tömningsplats Sjöboda ligger vid E4 söder om Traryd, Markaryds kommun (56.616486/13.760925).
- Smednäset camping ligger i Linghed/Falun = curated-495 "Smednäsets Camping" (redan komplett).
- Eskilns Bad & Camping ligger i Fagersta = osm-node-431825744.
- Trafikverkets rastplats W1 = Rastplats Långsjön, rv 50.
- rastplatserna.se-sammandraget blandade ihop Gimån (E14, Bräcke) och Stora Transåssjön (rv 27/40, Borås) – delade i två rader.

**Matchningsfel som agenterna upptäckte (poster finns i registret trots status SAKNAS/UTAN):** Doro Camp Lapland = "Doro Camping Lappland", Malå Camping = "Tjamstan Camping", Malnbaden = "First Camp Malnbaden", Idre Fjäll Camping = registrets obekräftade "Camping Renen" (inte "Camping, Idre Bergsby"), Tömningsplats Mjölby = troligen station vid E4-avfart Mjölby södra (inte golfklubben; kartan har "Trafikverkets rastplats Mjölby" med tömning). Gäddede och Pajala har obekräftade query-dubbletter i registret som bör slås ihop.

**Trafikverkets rastplatser:** trafikverket.se är egress-blockad och har ingen textlista – latrintömning syns bara i deras vägkarta. Kartans TRV-poster (via TRV-API:t i synken) är därför den bästa primärkällan; för rastplatserna.se-raderna som FINNS UTAN TÖMNING (Råda, Tönnebro, Långsjön, Svenstavik, Koviken, Gräsmo, Nyköpingsbro N, Lomkällan, Hosjön, Dalstorp, Eskiln, Herrbeta S, Femstenaberg, Vänga V/Ö, Örby, Träffpunkt Gotland) säger rastplatserna.se antingen inget om latrin (null) eller påstår latrin utan att TRV-datan har den (Råda, Tönnebro) – kontrollera i Trafikverkets rastplatskarta i webbläsare innan något ändras.

## Rekommenderad hantering

1. **Importera high-raderna** ovan (ny post eller komplettering) i `scripts/curated-places.json` med citat i `description`, efter dubblettkoll mot de befintliga id:n som anges per rad.
2. **Låg-evidensrader med påstådd tömning** (confidence low, status SAKNAS HELT eller FINNS UTAN TÖMNING) kan läggas in som obekräftade (`unverified: true` / `unverifiedServices`) enligt Pers beslut sep 2026 – använd `nearLat`/`nearLon` + `city` som rimlighetskontroll, men OBS att `nearLat`/`nearLon` är agenternas gissning av ortscentrum, inte koordinater från sidan.
3. **Rader med `latrin/gravatten = null`** (sidan sa inget) ska INTE importeras – de är bara bevis på att platsen finns på husbilsplats.se.
4. **Kompletta listor** kräver att någon läser sidorna i webbläsare: `rastplatserna.se/rastplats-med-latrintomning` (172 platser, en lång sida) och husbilsplats.se:s regionlista (bakom Premium-inloggning) eller kategoriarkivet `?pno=1…52`. Sökindexet gav ~20 % av rastplatserna.se och en okänd andel av husbilsplats.se.
5. **Öppna WebFetch-blockeringar** som stoppade verifiering: trafikverket.se, kommunsajter (grums.se, arboga.se, hudiksvall.se, ornskoldsvik.se …), firstcamp.se och nästan alla campingdomäner. Om egress-listan kan utökas i miljöinställningarna ger det mycket bättre verifiering per sökning.
