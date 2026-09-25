# Svep-logg – veckorutinen "Tömningskartan – veckosvep datakällor"

En schemalagd rutin (måndagar 05:00 UTC, fristående session) läser den här filen och kör
det fokusområde som har **äldst "senast kört"-datum**. Metoden per område står i `CLAUDE.md`.
Efter varje körning: uppdatera datumet i tabellen och lägg en rad i loggen längst ner.

## Rotation

| Fokusområde | Vad | Senast kört |
|---|---|---|
| A. Tömning latrin/gråvatten | Kommuner med 0–1 tömningsplatser: kommunsidor, turistråd, anläggningars egna sajter. Kompletteringar av befintliga camping-/ställplatsposter räknas. | 2026-09-24 |
| B. Gasol byte/påfyllning + priser | Kedjornas butikssidor (Byggmax/Granngården/Rusta/ÖoB per butik), Norbro-/Linde-/gasolautomat.se-listor, lokala påfyllningsbolag, priser. Bara 10/11 kg-flaskor (P11/PA11/PC10/PK10). | 2026-09-24 |
| C. Obekräftade platser: verifiera + fyll på | (1) Sök primärkälla för de OBEKRÄFTADE posterna i registret (`unverified: true` / `unverifiedServices`) – får de citat: ta bort obekräftat-flaggan. (2) Gör om lovande rader i `docs/kandidatplatser-husbilsplats-park4night.md` (tydlig tjänst + ort) till obekräftade registerposter så de syns grått på kartan. | aldrig |
| D. Kontroll av befintliga platser | Per prioriterar RÄTT före FLER: välj ~40 befintliga platser med tömning/vatten i en region (gärna campingar/ställplatser med `website`), kontrollera mot källan att tjänsterna fortfarande finns, rätta fel (ta bort tjänst, uppdatera avgift/öppettider). Golfklubbar + vattenkiosker som upptäckt-del. | 2026-09-07 |
| E. Öppettider + vinterstängt | Platser med tömning/vatten som saknar `openingHours`/`season`: hämta säsong ("1 maj–30 sep", "vinterstängt", "året runt") från kommun-/anläggningssida. Skriv `season: 'seasonal'`/`'year-round'` + `openingHours`. Prioritera kommunala tömningsstationer och Trafikverkets rastplatser med vattenavstängning. | aldrig |

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
