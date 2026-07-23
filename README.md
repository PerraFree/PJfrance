# Tömningskartan

Webbapp (PWA) för husbils- och husvagnsägare i Sverige: hitta platser för att
**tömma gråvatten**, **tömma latrin/kassettoalett** och **fylla på färskvatten**.

## Funktioner (MVP)

- Interaktiv karta över Sverige (Leaflet + OpenStreetMap) med markörkluster
- Sex kategorier med filter: **gråvatten**, **latrin/toalett**,
  **färskvatten**, **ställplats** (`tourism=caravan_site`), **camping**
  (`tourism=camp_site`) och **gasol/LPG** (`fuel:lpg=yes`, `shop=gas`)
- Stationer hämtas live från OpenStreetMap via Overpass API för den del av
  kartan du tittar på (zooma in för att ladda). Frågan täcker dedikerade
  tömningsstationer (`amenity=sanitary_dump_station`), alla platser taggade
  med `sanitary_dump_station=*` (rastplatser, campingar, ställplatser,
  gästhamnar, drivmedelsstationer), vattenpåfyllning (`amenity=water_point`),
  dricksvatten (`amenity=drinking_water`) samt ställplatser, campingar och
  gasol enligt ovan
- Trafikverkets ~205 rastplatser med gratis latrintömning kan hämtas via
  Trafikverkets öppna API — skaffa en kostnadsfri nyckel på
  [data.trafikverket.se](https://data.trafikverket.se) och klistra in den
  under kugghjulet ⚙ i appen (sparas i webbläsarens localStorage)
- Dubblettrensning när samma plats finns i flera källor
  (eget register > Trafikverket > OSM)
- Eget register med platser som saknas i OSM (`src/data/stations.ts`)
- Filter: gråvatten / latrin / färskvatten
- Ortsökning (Nominatim) och "Nära mig" via GPS
- Detalj-popup med avgift, öppettider, vägbeskrivning och OSM-länk
- Installerbar som app (webbmanifest + service worker som cachar appskalet)

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge till dist/
npm run preview  # förhandsgranska bygget
```

## Datasynk (grunddata för hela Sverige)

`scripts/sync-stations.mjs` hämtar alla Sveriges stationer från OSM (Overpass)
och Trafikverket och skriver `public/data/stations-seed.json`, som appen läser
vid start — kartan är därmed fylld direkt utan att man behöver zooma.
Skriptet körs automatiskt i deploy-workflowen före bygget (lägg repo-secreten
`TRV_API_KEY` för att få med Trafikverkets rastplatser) och veckovis via
schemat i workflowen. Kör lokalt med `node scripts/sync-stations.mjs`
(kräver internetåtkomst till overpass-api.de).

## Arkitektur & vidareutveckling

- `src/lib/overpass.ts` – hämtning och tolkning av OSM-data
- `src/lib/geocode.ts` – ortsökning via Nominatim
- `src/data/stations.ts` – eget register (flyttas till backend/databas i nästa steg)
- `src/components/MapView.tsx` – kartan (Leaflet)

Planerade nästa steg:

1. Backend (t.ex. Supabase/PostgREST) för det egna registret + admin-gränssnitt
2. Detaljsidor med foton och användarrapporter ("stängd", "trasig")
3. Mobilappar (React Native/Capacitor) mot samma backend
4. Offline-läge med nedladdad stationsdata per region

## Datakällor

Stationsdata © [OpenStreetMap](https://www.openstreetmap.org/copyright)-bidragsgivare (ODbL).
Ortsökning via Nominatim (respektera deras användarvillkor vid drift – sätt upp
egen instans eller kommersiell geokodning vid större trafik).
