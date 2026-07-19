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

## Verktygslådan 🧰

Knappen **Verktyg** öppnar en låda med praktiska husbilsverktyg:

- **Vattenpass** – telefonens lutningssensor visar hur bilen står och räknar ut
  hur många centimeter kil som behövs (utifrån fordonets axelavstånd/spårvidd).
  Fungerar helt offline. På iOS krävs ett tryck för att aktivera sensorn.
- **Frost & vind** – prognos från SMHI:s öppna data för platsen där bilen står
  (eller kartans mittpunkt): frostvarning för kommande nätter och byvind-varning
  per dag. Spara bilens position med ”Bilen står här” så visar **Frostvakten**
  en varningsbanner direkt när appen öppnas om det blir minusgrader.
- **Tankkoll** – logga när du fyller färskvatten och tömmer grå-/latrintank.
  Appen lär sig ert mönster och förutspår ungefär hur många dagar det är kvar.
- **Fordon** – höjd, vikt, axelavstånd och spårvidd. Sparas lokalt i webbläsaren.

## Kartfunktioner utöver stationerna

- **⚠️ Låga broar** – visar höjd-/viktbegränsningar från OSM som är lägre än
  ditt fordon (plus 20 cm marginal). Kontrollera alltid skyltning på plats.
- **☀️ Solchans** – provar SMHI-prognosen i en ring av punkter ca 60 och 130 km
  från kartans mittpunkt (≈1–2 timmars körning) och visar var solchansen är
  störst de närmaste två dagarna.
- **🗓️ Dölj säsongsstängt** – filtrerar bort stationer vars öppettider anger ett
  månadsintervall som inte täcker nuvarande månad (t.ex. ”May-Sep …”).

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
- `src/lib/smhi.ts` – SMHI:s punktprognos + vind-/frost-/solberäkningar
- `src/lib/lowbridges.ts` – höjd-/viktbegränsningar via Overpass
- `src/lib/sunfinder.ts` – solchans-sökning i ring runt kartvyn
- `src/lib/tanklog.ts`, `src/lib/vehicle.ts`, `src/lib/parking.ts`,
  `src/lib/season.ts` – lokal data (tömningslogg, fordonsprofil, parkering,
  säsongstolkning)
- `src/components/Toolbox.tsx` – verktygslådan (vattenpass, väder, tankkoll)
- `src/data/stations.ts` – eget register (flyttas till backend/databas i nästa steg)
- `src/components/MapView.tsx` – kartan (Leaflet)

Planerade nästa steg:

1. Backend (t.ex. Supabase/PostgREST) för det egna registret + admin-gränssnitt
2. Detaljsidor med foton och användarrapporter ("stängd", "trasig")
3. Mobilappar (React Native/Capacitor) mot samma backend
4. Offline-läge med nedladdad stationsdata per region

## Datakällor

Stationsdata och begränsningar © [OpenStreetMap](https://www.openstreetmap.org/copyright)-bidragsgivare (ODbL).
Väderprognoser från [SMHI:s öppna data](https://www.smhi.se/data) (CC BY 4.0).
Ortsökning via Nominatim (respektera deras användarvillkor vid drift – sätt upp
egen instans eller kommersiell geokodning vid större trafik).
