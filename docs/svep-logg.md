# Svep-logg – veckorutinen "Tömningskartan – veckosvep datakällor"

En schemalagd rutin (måndagar 05:00 UTC, fristående session) läser den här filen och kör
det fokusområde som har **äldst "senast kört"-datum**. Metoden per område står i `CLAUDE.md`.
Efter varje körning: uppdatera datumet i tabellen och lägg en rad i loggen längst ner.

## Rotation

| Fokusområde | Vad | Senast kört |
|---|---|---|
| A. Tömning latrin/gråvatten | Kommuner med 0–1 tömningsplatser: kommunsidor, turistråd, anläggningars egna sajter. Kompletteringar av befintliga camping-/ställplatsposter räknas. | 2026-09-24 |
| B. Gasol byte/påfyllning + priser | Kedjornas butikssidor (Byggmax/Granngården/Rusta/ÖoB per butik), Norbro-/Linde-/gasolautomat.se-listor, lokala påfyllningsbolag, priser. Bara 10/11 kg-flaskor (P11/PA11/PC10/PK10). | 2026-09-24 |
| C. Verifiera låg-evidens-listor | Gå igenom `docs/tomning-svep-sep-2026-lag-evidens.md` och `docs/kandidatplatser-husbilsplats-park4night.md`: sök primärkälla för de mest lovande, lägg in bara det som får konkret citat. | aldrig |
| D. Färskvatten + golfklubbar + tjänsteberikning | Golfklubbar med ställplats (golfamore.com m.fl.), campingar/ställplatser som visas utan tjänst men har det, vattenkiosker. | 2026-09-07 |

## Regler som alltid gäller

- Bara primärkällor med citat (kommun, anläggningens egen sajt, Trafikverket, kedjans butikssida).
  husbilsplats.se, park4night, stallplatskartan-boilerplate, Google-omdömen räcker inte.
- Dedupa mot publicerad seed (namn eller inom ~400 m) innan något skrivs till registret.
- Gissa aldrig koordinater. Exakt `lat`/`lon` från källa, annars `query` + `nearLat`/`nearLon` + lågt `maxKm`.
- Verifiera efter deploy att alla nya poster finns i seeden och ligger rimligt.

## Logg

- **2026-09-24, A (tömning):** 8 agenter × 22 sökningar. 19 nya + 21 kompletteringar. 42 låg-evidens
  sparade i `docs/tomning-svep-sep-2026-lag-evidens.md`. Kvar: inlandskommuner utan webbinformation
  (Eslöv, Sjöbo, Skurup, Staffanstorp, Lekeberg, Hallsberg, Kungsör, Fagersta/Norberg), Omberg-området,
  Öland/Gotlands mindre orter.
- **2026-09-24, B (gasol):** se CLAUDE.md "Bred gasolgranskning + prissvep". Registret 176 → 405
  gasolposter, 205 med pris. Kvar: Byggmax/Granngården/Rusta/ÖoB per butik, Skånegas Ängelholm,
  Levol Onsala, jem & fix Alvesta/Söderhamn (ogeokodbara gator), priser för ~10 påfyllningsplatser.
