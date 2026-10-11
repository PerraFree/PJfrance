# Uppdrag: exakta koordinater för registerplatser som inte gick att geokoda

Du hjälper Tömningskartan (tomningskartan.se), en karta för husbilsägare i Sverige.
Ett antal platser i vårt register kunde inte placeras automatiskt (adressen finns inte i
OpenStreetMap, eller geokodningen hamnade tiotals mil fel). Din uppgift: hitta en
**exakt koordinat (lat/lon, WGS84, decimalgrader)** för varje plats i din grupp.

## Regler
- **Gissa ALDRIG.** En koordinat måste komma från en källa som anger den, t.ex.:
  1. Anläggningens egen webbplats ("Hitta hit", Google Maps-länk med `@lat,lon` eller `q=lat,lon`, "GPS: …").
  2. Kommunens/turistrådets sida (vastsverige.com, gotland.com, visitdalarna m.fl.) med kartkoordinat.
  3. Ställplatssajter som campingkollen.se, husbilsplats.se, park4night.com, stallplats.se – deras sidor
     brukar visa "GPS"/"Koordinater". De duger för KOORDINAT (inte för tjänster).
  4. hitta.se / eniro.se-träff på exakt adress (URL:en eller sidan innehåller ofta koordinater).
- Använd WebSearch (gärna med `allowed_domains` mot en specifik sajt) och WebFetch. WebFetch är ofta
  blockerad mot små sajter – då är WebSearch-sammandrag din källa. Max ~8 sökningar per plats.
- Rimlighetskontrollera mot `nearLat`/`nearLon` (ungefärligt läge i närheten) och `maxKm`.
  Om koordinaten du hittar ligger längre bort än så – förklara varför den ändå är rätt (t.ex. att
  `nearLat` var kommuncentrum) eller markera som osäker.
- Om du bara hittar en adress men ingen koordinat: ange adressen så exakt som möjligt i `address`
  och sätt `lat`/`lon` till null. Om du hittar att en plats är NEDLAGD, skriv det i `note`.
- Ange alltid `source` (URL) och `confidence`: "high" (koordinat från källa 1–2 eller
  entydig 3/4), "medium" (koordinat från källa 3/4 med viss osäkerhet), "low" (bara ungefärlig).
- Passa på: om källan säger något tydligt om tjänster (gråvatten/latrin/färskvatten) som
  strider mot eller kompletterar `services`, notera det i `note` med citat. Ändra inget själv.

## Leverans
Skriv resultatet som JSON-array till filen som anges i din uppgift, ett objekt per plats:
```json
{ "name": "<exakt namn från indata>", "lat": 57.1234, "lon": 12.3456,
  "address": "…", "source": "https://…", "confidence": "high|medium|low", "note": "…" }
```
Svara sedan kort (max 10 rader) med en sammanfattning per plats.
