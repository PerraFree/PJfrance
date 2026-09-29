# Uppdrag: discovery-svep – Tömningskartan (tomningskartan.se)

Kartan visar platser där husbilar/husvagnar kan tömma gråvatten och latrin, fylla färskvatten,
slänga sopor – och sekundärt ställplatser/campingar. Ditt län + dina kommuner står i uppgiften.
Filen `existing-<län>.json` (sökväg i uppgiften) innehåller ALLA platser vi redan har i länet
(namn, lat/lon, tjänster, `unverified`, kommun). Uppgiften är att hitta platser som SAKNAS HELT
eller saknar tjänster vi inte känner till.

## Vad du ska göra
1. **Kommun för kommun** (listan i uppgiften), sök efter ställplatser, tömningsstationer,
   latrintömning, gråvattentömning och färskvattenpåfyllning för husbil. Bra sökningar:
   - `ställplats husbil <kommun>` / `<kommun> husbil tömning latrin` / `latrintömning husbil <ort>`
   - `site:<kommun>.se husbil` (kommunernas VA-/avfalls-/turistsidor är bästa källan)
   - `husbilsplats.se <kommun>`, `park4night <ort>`, `husbil.se <ort>` (aggregatorer = LEDTRÅD +
     KOORDINAT, aldrig belägg för tjänster), campingars/gästhamnars/golfklubbars egna sidor,
     turistråd (visitvarmland, visitkronoberg/destinationsmåland, visitorebro m.fl.).
   - Prioritera kommuner med få befintliga platser (står i uppgiften).
2. **Jämför mot `existing-<län>.json`**: hoppa över platser som redan finns med samma tjänster
   (samma namn eller inom ~400 m). En befintlig plats som SAKNAR en tjänst du kan belägga
   (t.ex. camping som har latrintömning enligt egen sida) rapporteras med `existing_name`.
3. **Koordinat** från källan: kommunens karta, anläggningens "hitta hit"/Google-Maps-länk,
   hitta.se-URL, park4night-/husbilsplats-sidans GPS. Aggregatorer duger för KOORDINAT.
   Gissa ALDRIG en koordinat – saknas den, sätt `lat`/`lon` = null och ge `address` (gata + ort)
   så exakt som möjligt.

## Regler
- **Tjänster kräver citat från primärkälla** (anläggningens/kommunens/turistrådets egen sida).
  Skriv citatet ordagrant i `quote`. Bara aggregator/forum → `confidence: "low"` (platsen visas
  då grå/obekräftad) och lägg de påstådda tjänsterna i `services` ändå.
- Skilj på: färskvatten (`vatten`), gråvattentömning (`gravatten`), latrin-/toatömning (`latrin`),
  sopor (`sopor`), ställplats (`stallplats`), camping (`camping`). "Toalett/dusch i servicehus" är
  INTE tömning. "Tömning" utan precisering → skriv exakt vad som står, `services_unclear: true`.
- WebFetch är ofta egress-blockad – använd WebSearch (gärna `allowed_domains`) och läs
  sammandragen noga. Högst det antal sökningar som står i uppgiften, fördela över kommunerna.
- Notera även: avgift, säsong/öppettider, telefon, webbplats, om bara gäster får tömma.

## Leverans
JSON-array till angiven fil, ett objekt per plats (även låg säkerhet):
```json
{ "name": "Xstads ställplats", "existing_name": "<namn i existing-filen eller null>",
  "kommun": "…", "lat": 0, "lon": 0, "coord_source": "https://…", "address": "…",
  "services": ["vatten","gravatten","latrin","stallplats"], "services_unclear": false,
  "quote": "ordagrant citat om tjänsterna", "source": "https://primärkällans-sida/…",
  "confidence": "high|medium|low", "fee": "…", "season": "…", "openingHours": "…",
  "phone": "…", "website": "https://…", "note": "…" }
```
`confidence`: high = primärkälla med tydligt citat; medium = primärkälla nämner platsen men
tjänsterna är otydliga; low = bara aggregator/forum. Skriv filen även om den blir kort.
Svara till sist med max 12 rader: kommuner sökta, antal platser, antal high/medium/low, luckor.
