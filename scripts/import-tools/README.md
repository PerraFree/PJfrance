# Importverktyg från sessionerna 24–25 sep 2026

Skripten här är de som användes för att slå ihop research-resultat med
`scripts/curated-places.json`. De läser/skriver arbetsfiler i mappen som
miljövariabeln `SCRATCH` pekar på (standard `/tmp`) – sätt den till sessionens
scratchpad, t.ex. `SCRATCH=$SCRATCHPAD node scripts/import-tools/import-golf.mjs --dry`,
och lägg indatafilerna där innan körning. Kör alltid `--dry` först. Alla körs
från repo-roten. **Flytta bearbetade agentfiler till `<SCRATCH>/done/` efter
import** – annars importeras de igen vid nästa körning.

| Skript | Indata | Vad |
|---|---|---|
| `import-webb.mjs` | `docs/import/firstcamp-tomning.json`, `campingkollen.json`, `tomningsplatser-webb.json` (kopiera till `S` som `firstcamp.json`, `campingkollen.json`, `tomningsplatser.json`) + `seed.json` (senast publicerade seed) | high/medium → bekräftad tjänst, low → grå/obekräftad, "OSÄKER" hoppas över |
| `import-research.mjs` | `docs/import/gasolfyllning-research.json` (som `research.json`) | gasolpåfyllning: nya/uppgraderade/nedgraderade |
| `import-gasolfyllning.mjs` | `docs/import/gasolfyllning_sverige.json` | Perplexity-listan, matchning namn+ort |
| `import-kandidater.mjs` | `docs/kandidatplatser-husbilsplats-park4night.md` | kandidatrader → obekräftade poster |
| `import-unverified.mjs` / `import-tomning.mjs` | agenternas `results/tomning-*.json` (format i `UPPDRAG-tomning.md`) | tömningssvepets high/low-fynd |
| `compare.mjs` / `compare-tomning.mjs` | seed från gh-pages | deploy-verifiering: saknade poster + avstånd från `nearLat/nearLon` |

Seed hämtas med `git show origin/gh-pages:data/stations-seed.json > <S>/seed.json`.

## Koordinatsvep (25 sep 2026)

- `apply-coords.mjs` – läser `coords-*.json` från agenter (fält: name, lat, lon,
  source, evidence, townLat/townLon/townName, confidence) och sätter exakt
  `lat`/`lon` på registerposten, tar bort `query`, sätter orts-ankaret till
  agentens town-koordinat (maxKm 30) och lägger "Koordinat från <url>" i
  beskrivningen. Kör med `--dry` först. Sökvägen `S` måste anpassas.
- `verify-deploy-names.mjs` – kontroll efter deploy: listan `NAMES` matchas
  mot publicerad seed (`seed.json` från `git show origin/gh-pages:data/stations-seed.json`)
  och avståndet till `nearLat/nearLon` i registret jämförs med `maxKm`.
  Skriver "SAKNAS" / "FÖR LÅNGT BORT" / "nära gränsen". Byt ut namnlistan.
| `import-discovery.mjs` | `disc-<län>-<n>.json` från agenterna (format i `UPPDRAG-discovery.md`) + `seed.json` | discovery-svep per län: high → bekräftad tjänst, medium → plats bekräftad + påstådda tjänster, low → grå; dedupe 400 m mot seeden, koordinat läggs på närmaste OSM-nod; saknad koordinat → `query` (adress) + kommunens medianläge |
| `import-golf.mjs` | `golf-<n>.json` från agenterna (format i `UPPDRAG-golf.md`) + `seed.json` + `existing-golf.json` | golfklubbssvep: high → bekräftad tjänst, medium → ställplats + påstådda tjänster, low → grå; saknad koordinat → `query` + kommunens medianläge ur seeden (reserv `scripts/kommuner.json`) |

## Uppdragstexter till agenter (ge som prompt, 45 WebSearch var, WebFetch är blockad)

- `UPPDRAG-discovery.md` – discovery per län (nya platser). `UPPDRAG-tillagg-tomning.md` –
  tillägg för tömningsfokus (varv 2, kommuner med 0–1 tömningsplatser).
- `UPPDRAG-golf.md` – golfklubbar. `UPPDRAG-tomning.md` – tömningssvepet sep 2026.
- `UPPDRAG-koordinater.md` – hämta exakta koordinater till poster som Nominatim missar.
- `UPPDRAG-restposter.md` – restlistor (saker som tidigare krävde webbläsare).

## Efterkontroll efter deploy (okt 2026)

- `check-discovery.mjs` – jämför discovery-svepets registerposter mot publicerad seed
  (saknade + >6 km från ankaret). Anpassa rådatafilen i `docs/import/`.
- `check-golf3.mjs` – samma för golfsvep del 3. `check-rest.mjs` – namnlista (`NAMES`).
- `apply-final.mjs` – koordinatsvepet 25 sep: applicerar agenternas exakta koordinater,
  raderar dubbletter, uppgraderar poster (mönster att kopiera för nya svep).
- Alla hämtar seeden själva med `git show origin/gh-pages:data/stations-seed.json`.
