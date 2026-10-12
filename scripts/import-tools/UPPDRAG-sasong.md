# Uppdrag: säsong och öppettider för befintliga platser (område E)

Appen Tömningskartan (tomningskartan.se) visar platser där husbilar/husvagnar kan tömma latrin,
tömma gråvatten och fylla färskvatten. Filtret "Öppet året runt" bygger på fältet `season`, och
popupen visar `openingHours`. Många platser saknar båda. Din uppgift är att hitta säsong/öppettider
från platsens EGEN källa – inte att kontrollera tjänsterna (det gör område D).

## Indata
`<SCRATCH>/sasong/grupp-<N>.json` – lista med objekt: `id`, `name`, `kommun`, `lat`, `lon`,
`services`, `website`, `source` (`osm` = OpenStreetMap, `egen`/`kommun` = vårt register),
`osmUrl`, `description`.

## Metod
1. Prova **WebFetch** på `website` en gång. Den är oftast blockerad – ge då upp och använd
   **WebSearch** med `allowed_domains: ["<platsens domän>"]` (och kommunens/turistrådets domän)
   med sökord som `"<platsnamn>" öppet`, `"<platsnamn>" säsong`, `"<platsnamn>" öppettider`,
   `"<platsnamn>" vinter`.
2. **Du har max 25 WebSearch-anrop** (kvoten delas med sju andra agenter). Vid "quota/limit"-fel:
   sluta direkt och skriv ut det du har.
3. Primärkälla = anläggningens egen sajt, kommunens sida, turistrådet (visitxxx.se, kommunens
   turistsajt), en bokningsplattform anläggningen själv använder. husbil.se, husbilsplats.se,
   stallplatserna.se, park4night, campingkollen, campercontact, Google räknas INTE → `found: false`.
4. Citera datumen ordagrant i `evidence` ("Öppet 1 maj–30 september", "året runt", "vinterstängt
   november–mars", "servicehuset stängt oktober–april"). Gissa aldrig: om sidan bara säger
   "sommaröppet" utan datum, skriv `openingHours: "Sommaröppet (inga datum angivna)"`,
   `season: "seasonal"`, `confidence: "medium"`.
5. Skilj på anläggningens öppettid och tömningens: om servicehuset/tömningen har egen säsong,
   skriv tömningens ("Tömning 1 maj–30 sep; campingen året runt").
6. Kommunala tömningsstationer utan uttrycklig säsong: leta efter "vinteravstängd", "stängs vid
   frost", "öppen 1 maj–31 okt" på kommunens sida. Hittar du inget: `found: false`.
7. Noterar du på vägen att en tjänst uttryckligen INTE finns, eller att platsen lagts ned, skriv
   det i `notes` – men ändra inget annat.

## Utdata
Skriv JSON till `<SCRATCH>/sasong/sasong-<N>.json`:
```json
{
  "group": 0, "searchesUsed": 0, "quotaHit": false,
  "places": [
    { "id": "osm-way-123", "name": "Xköpings Camping",
      "found": true,
      "season": "seasonal",
      "openingHours": "1 maj–30 september",
      "evidence": "ordagrant citat från källan",
      "source": "https://...",
      "confidence": "high",
      "notes": "" }
  ],
  "notes": "kort om vad som var svårt/oklart"
}
```
- `season`: `"seasonal"`, `"year-round"` eller `null`. `openingHours`: kort fritext med datum
  (max ~80 tecken – den visas i popupen), eller `null`.
- `found: false` när ingen primärkälla ger säsong/öppettid. Lämna hellre tomt än gissa.
- Skriv filen även om du bara hann med några platser. Avsluta med en kort sammanfattning
  (antal hittade/ej hittade och vilka du inte hann).
