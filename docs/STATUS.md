# Läget just nu

Skrivs ÖVER vid varje överlämning (lägg inte äldre lägesbilder på hög – historik
finns i git-loggen, `docs/svep-logg.md` och `docs/HISTORIK.md`).

**Uppdaterad:** 2026-10-11, session "Gråvatten 5" (sessionslänk i senaste commit).

## Status

- **Live:** 6 632 platser (OSM ~4 600, Trafikverket 318, registret 1 690 poster
  varav ~330 grå/obekräftade). Alla deployer gröna, inget ligger ocommittat.
- **Säkerhet:** Johans säkerhetsrådgivning GHSA-72p3-7774-p8h3 (4 fynd) är
  åtgärdad och verifierad mot den levande databasen 11 okt. Per har svarat Johan.
  `SUPABASE_SERVICE_KEY` finns som secret; kontotoken används bara av installationen.
- **Beroenden:** Dependabots första omgång (#16–#20) mergad; actions SHA-låsta.
- **Datasvep:** golfsvep, discovery varv 1 + 2 och restlistor är klara
  riksomfattande. Område D (kontroll av befintliga platser) körd första gången
  11 okt för Västra Götaland (40 platser, 29 rättade/bekräftade, 0 nedlagda).
  Webben är i stort sett uttömd för nya platser – nästa metod är crowdsourcing.
- **UI senast:** bottenarket följer fingret vid drag, strecket = bara kartan/
  tillbaka, baskartan byter till OSM om leverantören tiger. sw.js v84.

## Öppna punkter (GitHub-issues med etiketten `backlog`)

Se https://github.com/PerraFree/PJfrance/issues?q=is%3Aopen+label%3Abacklog
– prioritet via `prio-1`/`prio-2`/`prio-3`:

1. #24 Crowdsourcing-lansering (prio-1). #25 Område D nästa regioner: Skåne,
   Stockholms län (prio-1).
2. #26 Område C: grå platser. #27 Område E: öppettider/säsong. #28 Restlista
   som kräver webbläsare (prio-2).
3. #29 Gasolluckor. #30 Tekniska tillval/underhåll. #31 SEO/spridning (prio-3).

## Väntar på Per

- Dependabot-PR:er mergas i webbläsaren när de kommer (måndagar).
- Rutinen "Veckosvep Tömnmingskartan" (skapad i webbgränssnittet) hänvisar till
  CLAUDE.md för metoderna, som nu ligger i `docs/svep-logg.md`/`docs/HISTORIK.md`
  – ny prompt levererad i chatten 11 okt att klistra in i claude.ai → Rutiner.
  "Veckorapport" och tokenpåminnelsen är återskapade kopplade till sessionen
  "Gråvatten 5"; de gamla kopiorna (pekade på arkiverade "Gråvatten 4") är
  pausade och kan raderas.
- Supabase-token byts före ~6 dec 2026 (rutinen påminner 27 nov).
- Ny rutin 11 okt: "Månatlig säkerhetsgenomgång Tömningskartan" (1:a i månaden
  07:27 svensk tid, rapport via push/mejl, pushar inget) – första körning 1 nov.

## Nästa steg (förslag)

Område D i Skåne (samma metod: `UPPDRAG-kontroll.md` + `apply-kontroll.mjs`),
eller område C (grå platser), eller förbereda crowdsourcing-texter.
