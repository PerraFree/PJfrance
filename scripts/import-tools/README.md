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
