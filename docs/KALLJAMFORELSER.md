# Källjämförelser på Pers begäran (25 sep 2026)

Flyttat från CLAUDE.md 11 okt 2026.

Per skickade fyra sidor och frågade "har du dessa?". Tre fristående
research-sessioner (600-kvoten, ~120/252/197 sökningar, ~20–35 USD var)
jämförde mot publicerad seed och lade underlag i `docs/import/`
(`firstcamp-tomning.*`, `tomningsplatser-webb.*` för rastplatserna.se +
husbilsplats.se, `campingkollen.*`). Import med `import-webb.mjs`
(scratchpad): high/medium → bekräftad tjänst (medium får `confidence:
'medium'`), low/null → obekräftat (grå plats eller `unverifiedServices`),
"OSÄKER"-matchningar och motsägelser hoppas över. Utfall: 22 nya
bekräftade platser, 62 nya obekräftade, 39 bekräftade kompletteringar
(bl.a. First Camp Vadstena/Västerås/Nora/Strömstad/Haganäset/Boden/
Löttorp/Hökensås, Vadstena GK, BK Najaden), 32 obekräftade
kompletteringar, 40 First Camp-poster fick avgiftsnotis ("gratis för
gäster, 60 kr/dag för genomresande") + var på området tömningen finns.
Slutsatser: First Camp 41/51 destinationer hade redan tömning på kartan,
7 av listans namn har lämnat kedjan (Skånes Djurpark, Mellbystrand, Skrea,
Böda Sand, Tofta, Gustavsvik, Malnbaden – OSM-namnen kan vara gamla);
rastplatserna.se listar enbart Trafikverkets rastplatser = samma
population som TRV-synken (2 rastplatser, Råda och Tönnebro, påstås ha
latrin men TRV-API:t ger bara sopor – kontrollera); husbilsplats.se:s
tömningslista ligger delvis bakom betalvägg och campingkollen.se är
JS-driven – bara ~125 av uppskattningsvis 1 500–2 000 platser gick att
läsa via sökindex. **Fullständig avstämning kräver att sidorna läses i en
webbläsare** (egress-blockade härifrån).

