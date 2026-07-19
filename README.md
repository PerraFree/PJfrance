# Tömningskartan

Webbapp (PWA) för husbils- och husvagnsägare i Sverige: hitta platser för att
**tömma gråvatten**, **tömma latrin/kassettoalett** och **fylla på färskvatten**.

## Funktioner (MVP)

- Interaktiv karta över Sverige (Leaflet + OpenStreetMap)
- Stationer hämtas live från OpenStreetMap via Overpass API
  (`amenity=sanitary_dump_station` och `amenity=water_point`) för den del av
  kartan du tittar på (zooma in för att ladda)
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
