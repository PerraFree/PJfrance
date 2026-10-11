# Uppdrag: kontrollera att befintliga platser i appen fortfarande stämmer (område D)

Appen Tömningskartan (tomningskartan.se) visar platser där husbilar/husvagnar kan tömma latrin
(kassettoalett), tömma gråvatten (disk-/duschvatten) och fylla färskvatten. Ägaren prioriterar
RÄTT före FLER: en plats som visar en tjänst som inte finns är värre än en som saknas.

Du får en lista med ~10 platser (JSON-fil, se nedan). För VARJE plats ska du kontrollera mot
platsens EGEN källa (fältet `website`, eller kommunens/turistrådets sida) om det vi visar
fortfarande stämmer.

## Indata
`<SCRATCH>/kontroll/grupp-<N>.json` – lista med objekt:
`id`, `name`, `kommun`, `lat`, `lon`, `services` (det vi visar i dag), `unverifiedServices`
(påstådda, grå), `website`, `fee`, `openingHours`, `season`, `description`, `source`
(`osm` = hämtad från OpenStreetMap, `egen`/`kommun` = vårt eget register), `inRegister`.

Tjänstekoder: `gravatten` = gråvattentömning, `latrin` = latrin-/kassettömning, `vatten` =
färskvattenpåfyllning, `sopor`, `stallplats` (ställplats för husbil), `camping`, `gasol`.
Du kontrollerar bara gravatten/latrin/vatten + avgift + säsong/öppettider + om platsen finns kvar.

## Metod
1. Prova **WebFetch** på `website` först. Den är ofta blockerad härifrån – ge då upp direkt och
   använd **WebSearch** med `allowed_domains: ["<platsens domän>"]` (och ev. kommunens/
   vastsverige.com) med sökord som `"<platsnamn>" tömning`, `"<platsnamn>" latrin gråvatten`,
   `"<platsnamn>" husbil ställplats pris`, `"<platsnamn>" öppet säsong`.
2. **Du har max 45 WebSearch-anrop** (kvoten är delad med tre andra agenter). Får du
   "quota/limit"-fel: sluta söka och skriv ut det du har.
3. Primärkälla = anläggningens egen sajt, kommunens sida, turistrådet (vastsverige.com räknas),
   Göta kanal-bolaget, en bokningsplattform anläggningen själv använder. husbilsplats.se,
   park4night, stallplatskartan, campingse.se, Google-omdömen räknas INTE → `confidence: "low"`.
4. Gissa aldrig. Hittar du inget om en tjänst: skriv den varken som bekräftad eller motsagd.
   `contradictedServices` kräver att källan uttryckligen säger att tjänsten INTE finns ("ingen
   gråvattentömning", "endast för gäster" räknas inte som nej – notera det i `notes`), eller att
   källan har en uttömmande servicelista där tjänsten tydligt saknas (då `confidence: "medium"`).
5. Säsong: citera datumen ("1 maj–30 sep", "året runt", "vinterstängt nov–mars"). Avgift: citera
   belopp och vad det gäller (per natt, per tömning, gratis för gäster).
6. Nedlagd/stängd plats, namnbyte, flytt: rapportera med citat och källa.

## Utdata
Skriv JSON till `<SCRATCH>/kontroll/kontroll-<N>.json`:
```json
{
  "group": 0, "searchesUsed": 0, "quotaHit": false,
  "places": [
    { "id": "osm-node-123", "name": "Xköpings Camping",
      "status": "ok",
      "confirmedServices": ["latrin", "vatten"],
      "contradictedServices": [],
      "addServices": ["gravatten"],
      "fee": "Tömning 50 kr för icke-gäster, gratis för campinggäster",
      "openingHours": "1 maj–30 sep",
      "season": "seasonal",
      "nameNow": null,
      "evidence": "ordagrant citat från källan",
      "source": "https://...",
      "confidence": "high",
      "notes": "" }
  ],
  "notes": "kort om vad som var svårt/oklart"
}
```
- `status`: `ok` (allt bekräftat), `andrad` (något avviker: tjänst motsagd, ny tjänst, avgift/
  säsong ändrad), `nedlagd` (platsen finns inte längre), `oklar` (hittade ingen användbar källa).
- `season`: `"seasonal"`, `"year-round"` eller `null`. `openingHours`: fritext med datum/tider,
  eller `null`. `fee`: fritext eller `null`. `nameNow`: nytt namn om platsen bytt namn, annars null.
- Lämna fält tomma hellre än att gissa. Skriv filen även om du bara hann med några platser.
  Avsluta med en kort sammanfattning: antal ok/ändrade/nedlagda/oklara och vilka du inte hann.
