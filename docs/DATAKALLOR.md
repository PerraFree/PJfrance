# Researchrapport: datakällor för Tömningskartan

*Sammanställd 2026-07-19 utifrån djupresearch med källverifiering. Verifierade
påståenden är markerade ✅ (bekräftade mot primärkälla av oberoende granskare).*

## Sammanfattning

Det finns bara **två lagligt fria källor** med bra täckning: **Trafikverkets
öppna API** (CC0) och **OpenStreetMap** (ODbL). De stora kommersiella apparna
(Park4Night, Campercontact, Ställplatsappen m.fl.) har uttryckligen stängda
databaser som inte får återanvändas. Kommunal öppen data om tömningsstationer
finns i praktiken inte som strukturerade dataset. Slutsatsen är att appens
strategi — OSM + Trafikverket + eget crowdsourcat register — är rätt väg och
samma grund som konkurrenterna själva står på.

## 1. Trafikverket (öppna API:t) — ⭐ bästa fria källan

- **Data:** Rastplatser längs statliga vägnätet, ca 270 st ✅, varav ca 205
  har latrintömning (gratis). Utrustning per plats i typade fält.
- **Viktigt:** Anläggningarna är **endast avsedda för portabla toaletter**
  (kassett) ✅ — inte gråvatten eller fast tank. Appen klassar dem därför som
  enbart "latrin".
- **API:** `POST https://api.trafikinfo.trafikverket.se/v2/data.json` med
  XML-fråga ✅. Objekttyp `Parking`, `schemaversion="1.4"` ✅ (inte någon
  "RestArea"-typ). Gratis API-nyckel via [data.trafikverket.se](https://data.trafikverket.se).
- **Schema:** Utrustning i `Equipment[]`/`Facility[]` med `Type` ✅ — enum
  innehåller bl.a. `dumpingStation`, `freshWater`, `toilet`, `wasteDisposal`
  (via maskingenererade bindningar från officiella XSD:n). Position i
  `Geometry.WGS84` (WKT-punkt). Inkrementell synk möjlig via `ModifiedTime`
  och `Deleted`, länsfiltrering via `CountyNo`.
- **Licens:** CC0 — fri kommersiell återanvändning.
- **Referensimplementationer:** [victor-reyes/rest-camp-react-native](https://github.com/victor-reyes/rest-camp-react-native)
  (exakt vårt användningsfall), [daenney/trafikinfo](https://github.com/daenney/trafikinfo) (schematyper).
- **Status i appen:** integrerad (nyckel anges under ⚙).

## 2. OpenStreetMap / Overpass — ⭐ bredaste källan

- **Data:** `amenity=sanitary_dump_station` (tömningsstationer med undertaggar
  `sanitary_dump_station:chemical_toilet` och `:grey_water`),
  `sanitary_dump_station=*` som egenskap på rastplatser/campingar/ställplatser/
  mackar, `amenity=water_point` (färskvatten för husbil) och
  `amenity=drinking_water`. Sub-taggar för avgift, öppettider, access.
- **Fallgrop (viktigt fynd):** Sverige har ovanligt många
  `sanitary_dump_station` p.g.a. en dataimport, och **en stor andel är
  sugtömningsstationer för fritidsbåtar ute i vattnet** — oanvändbara för
  husbil. Kartan måste filtrera på båt-indikatorer (`waterway=…`,
  `seamark:*` osv.). *(Åtgärdat i appen.)*
- **Licens:** ODbL — fri kommersiell användning **med** synlig attribution
  ("© OpenStreetMap contributors" på kartvyn) och share-alike: blandar man
  in OSM-data i sin egen POI-databas måste den kombinerade databasen också
  delas under ODbL. Håll därför eget register och OSM-data åtskilda i
  datamodellen (så som appen redan gör med `source`-fältet).
- **Integrationsväg:** Overpass API per kartvy (implementerat). För produktion:
  egen Overpass-instans eller förberäknade extrakt (Geofabrik) för att slippa
  tredjeparts rate limits.

## 3. Kommersiella appar — stängda databaser

| Källa | Läge | Slutsats |
|---|---|---|
| **Park4Night** | Villkoren förbjuder återgivning av innehållet och åberopar EU:s databasskydd (direktiv 96/9). Det finns ett reverse-engineerat inofficiellt API på GitHub — tekniskt nåbart men utan rättslig grund. | Får **inte** användas. Enda vägen är licensavtal med bolaget. |
| **Campercontact** (NKC) | Alla IP-rättigheter reserverade; inget publikt API; även användarbidrag licensieras exklusivt till NKC. | Får **inte** användas utan partneravtal. |
| **Ställplatsappen / Husbilskompisar** (stallplats.se) | Sveriges största nischkälla för ställplatser med tömnings-/vatteninfo per plats. Community-drivet men inget API, ingen öppen licens. | Kontakta för ev. samarbete; inte en fri källa. |
| **Husbilsplats.se** (~2 600 platser), **Husbilskatalogen.se**, **Husbil.se** | Katalogsajter utan API; skyddade av svenskt katalog-/databasskydd. | Ej skrapbara för kommersiell app. Jämförelsematerial. |
| **Rastplatserna.se** | Bygger själv på Trafikverkets öppna data. | Bekräftar att man ska gå direkt på Trafikverket, inte skrapa mellanledet. |

## 4. Kommuner och övriga offentliga källor

- **Sveriges dataportal (dataportal.se):** tömningsstations-/ställplatsdata
  finns i praktiken **inte** som samlade öppna dataset — kommunernas info
  ligger som vanliga webbsidor (Norrköping, Varberg, Gnesta …). Negativt men
  viktigt fynd: kommundata får samlas in manuellt till det egna registret
  (fakta är inte upphovsrättsskyddade, men kopiera inte deras texter rakt av).
- **DATEX II / NAP (transportdata.se):** EU-standarden (CEN/TS 16157) för
  rastplatsdata med facilitetstyper som `toilets`, `freshWater`,
  `wasteDisposal`. Trafikverket är svensk NAP-nod och levererar samma
  rastplatsdata där — API:t ovan räcker; DATEX II blir relevant först vid
  EU-expansion.
- **Lastkajen (Trafikverket/NVDB):** nedladdningsbara geodataprodukter, bl.a.
  rastplatser — alternativ bulkväg till samma data.

## 5. Båtsidan (framtida utvidgning)

- **Gästhamnsguiden** (Riksföreningen Gästhamnar): 400+ gästhamnar med
  servicedata (septik-/latrintömning, färskvatten). Kuraterad kommersiell
  källa utan öppet API — partneravtal krävs.
- **Svenska Gästhamnar:** liknande katalog, ingen öppen data.
- **OSM:** de bortfiltrerade båttömningsstationerna är precis den datamängd
  som behövs om appen senare får ett "båtläge" — filtret bör alltså behålla
  dem i en egen kategori istället för att slänga dem.

## 6. Prioriterad integrationsplan

1. **Klart:** OSM via Overpass (bred fråga + båtfilter) och Trafikverkets
   Parking-API (endast latrin + vatten).
2. **Nästa:** Backend-synk istället för klientanrop — hämta Trafikverket
   (dygnsvis, `ModifiedTime`) och OSM-extrakt till egen databas; appen läser
   från egen backend. Ger snabbhet, offline och oberoende av tredjeparts
   drifttid.
3. **Crowdsourcing:** inloggning + "lägg till/rätta plats" med moderering —
   detta är enda lagliga vägen till Park4Night-klassens täckning av privata
   ställplatser. Håll bidragen i egen databas (separat från OSM p.g.a.
   share-alike; överväg att även bidra tillbaka till OSM).
4. **Manuell import av kommundata** till eget register (fakta, ej texter).
5. **Partnerskap:** kontakta Husbilskompisar/Ställplatsappen och
   Gästhamnsguiden om datasamarbete.
6. **Senare:** båtläge (OSM-båtstationer + gästhamnskällor), DATEX II vid
   expansion utanför Sverige.

## Huvudkällor

- https://www.trafikverket.se/resa-och-trafik/vag/rastplatser/
- https://www.trafikverket.se/e-tjanster/trafikverkets-oppna-api-for-trafikinformation/
- https://data.trafikverket.se/
- https://github.com/victor-reyes/rest-camp-react-native
- https://github.com/daenney/trafikinfo
- https://wiki.openstreetmap.org/wiki/Tag:amenity=sanitary_dump_station
- https://community.openstreetmap.org/t/import-of-sanitary-dump-station/80843
- https://www.openstreetmap.org/copyright samt OSMF:s attributions- och licens-FAQ
- https://park4night.com/en/cgu · https://www.campercontact.com/en/content/terms-and-conditions
- https://stallplatsappen.se/ · https://husbilsplats.se/ · https://rastplatserna.se/rastplats-med-latrintomning
- https://www.gasthamnsguiden.se/ · https://www.svenskagasthamnar.se/
- https://www.dataportal.se/ · https://docs.datex2.eu/levels/mastering/facilities/
