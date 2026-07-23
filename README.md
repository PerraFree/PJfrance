# Tömningskartan

Webbapp (PWA) för husbils- och husvagnsägare i Sverige: hitta **ställplatser**,
**campingplatser**, platser för att **tömma gråvatten** och
**latrin/kassettoalett**, **fylla på färskvatten** och **gasol/LPG** – ~2 900
platser i hela landet.

## Funktioner

**Karta & data**
- Interaktiv karta över hela Sverige (Leaflet) med **markörkluster** som
  grupperar tusentals platser och delar upp sig vid inzoomning
- Sex kategorier med färgkodade filter och räknare: **gråvatten**,
  **latrin/toalett**, **färskvatten**, **ställplats** (`tourism=caravan_site`),
  **camping** (`tourism=camp_site`) och **gasol/LPG** (`fuel:lpg=yes`, `shop=gas`)
- **Baslager**: Karta (OSM), Satellit (Esri), Terräng (OpenTopoMap)
- Tre datakällor med dubblettrensning: OpenStreetMap (Overpass, live + seed),
  Trafikverkets rastplatser (öppna API:t) och ett kommunregister som geokodas
  automatiskt. Prioritet: eget register > kommun > Trafikverket > community > OSM

**Hitta rätt plats**
- Ortsökning (Nominatim) och **📍 Nära mig** (GPS) med "du är här"-markör
- **Närmast dig**-lista med de 12 närmaste platserna sorterade på avstånd
- Avstånd fågelvägen visas i varje popup
- **Endast gratis**-filter

**Rika detaljer i popupen**
- Facilitetsbadges: 🔌 el, 🚿 dusch, 🚻 wc, 📶 wifi, 🐕 hund
- Avgift, antal platser, operatör, **öppet nu**-status (opening_hours,
  lat-laddad), telefon- och webblänkar
- Vägbeskrivning (Google Maps), **Dela** (Web Share / länk), OSM-länk

**Crowdsourcing** (kräver Supabase, se `docs/SUPABASE.md`)
- **＋ Föreslå en plats** – geokodas och modereras innan den visas
- **⚠ Rapportera fel** i varje popup (nedlagd, fel plats, fel uppgifter)

**App-kvalitet**
- Installerbar PWA (manifest, maskable-ikoner, apple-touch) som fungerar
  **offline** (service worker cachar appskal + stationsdata)
- Delningslänkar (`?at=lat,lon,zoom`), sparat kartläge, Esc stänger dialoger,
  reduced-motion, Open Graph-taggar, första-besök-hint

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
