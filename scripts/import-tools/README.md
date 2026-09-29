# Importverktyg från sessionerna 24–25 sep 2026

Skripten här är de som användes för att slå ihop research-resultat med
`scripts/curated-places.json`. De skrevs för en sessions scratchpad och har
hårdkodade sökvägar (`/tmp/claude-0/.../scratchpad/`) – **byt `S`-konstanten
till en egen mapp** och lägg in indatafilerna där innan körning. Kör alltid
`--dry` först. Alla körs från repo-roten.

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
| `import-golf.mjs` | `golf-<n>.json` från agenterna (format i `UPPDRAG-golf.md`) + `seed.json` + `existing-golf.json` | golfklubbssvep: high → bekräftad tjänst, medium → ställplats + påstådda tjänster, low → grå; saknad koordinat → `query` + kommunens medianläge ur seeden |
