# Uppdrag: golfklubbssvep del 2 – Tömningskartan (tomningskartan.se)

Bakgrund: många svenska golfklubbar har ställplats/husbilsuppställning, och enligt kartägarens
fälterfarenhet har majoriteten färskvattenpåfyllning, ofta även latrin-/gråvattentömning. Kartan
visar färskvatten, gråvatten- och latrintömning för husbilar. Din region står i uppgiften.

## Vad du ska göra
1. **Verifiera de GRÅ (obekräftade) golfklubbarna i din region** i `existing-golf.json` (fältet
   `unverified: true`, kommun anges). De kommer från aggregatorer. Hitta klubbens EGEN webbplats
   (sida "Ställplats"/"Husbil"/"Husbilsparkering"/"Golfcamping"/"Boende") och läs vad den säger.
2. **Upptäck fler klubbar** i regionen som har ställplats/husbilsuppställning: sök t.ex.
   `"golfklubb" ställplats husbil <län/ort>`, `site:golf.se ställplats`, golfamore.com
   ("husbilsplatser"), husbilsklubben.se-forumet, husbil.se/husbilsplats.se/park4night (bara som
   LEDTRÅD – tjänsten måste bekräftas på klubbens egen sida). Hoppa över klubbar som redan är
   BEKRÄFTADE i `existing-golf.json` (`unverified: false`).
3. För varje klubb: **koordinat** (klubbens "hitta hit"/Google-Maps-länk, hitta.se-URL med
   `lat:lon`, eniro, husbil.se/park4night-sidans GPS – aggregatorer duger för KOORDINAT).
   Koordinaten ska vara vid ställplatsen/parkeringen, annars klubbhuset.

## Regler
- **Tjänster kräver citat från klubbens egen sida** (eller kommun/turistråd). Skriv citatet ordagrant.
  Utan citat → `confidence: "low"` och tjänster tomma (platsen visas då grå).
- Skilj på: färskvatten (`vatten`), gråvattentömning (`gravatten`), latrin-/toatömning (`latrin`),
  och "toalett/dusch i klubbhuset" (= INTE tömning, INTE vatten). "Tömning" utan precisering →
  skriv exakt vad som står och sätt `services_unclear: true`.
- Gissa ALDRIG koordinater eller tjänster. WebFetch är ofta egress-blockad – använd WebSearch
  (gärna `allowed_domains: ["<klubbens domän>"]`) och läs sammandragen noga. Max ~6 sökningar per
  klubb, totalt högst det antal som står i uppgiften.
- Notera även: el, pris/natt, säsong/öppettider, telefon, om bara golfare/gäster får stå.

## Leverans
JSON-array till angiven fil, ett objekt per klubb (även de du INTE kunde bekräfta):
```json
{ "name": "Xstads Golfklubb ställplats", "existing_name": "<namn i existing-golf.json eller null>",
  "kommun": "…", "lat": 0, "lon": 0, "coord_source": "https://…",
  "services": ["vatten","gravatten","latrin","stallplats"], "services_unclear": false,
  "quote": "ordagrant citat om tjänsterna", "source": "https://klubbens-sida/…",
  "confidence": "high|medium|low", "fee": "…", "season": "…", "openingHours": "…",
  "phone": "…", "website": "https://…", "note": "…" }
```
`confidence`: high = klubbens egen sida med tydligt citat; medium = klubbens sida nämner
ställplats men tjänsterna är otydliga, eller turistråd/kommun; low = bara aggregator/forum.
Svara till sist med max 12 rader: antal klubbar granskade, antal high/medium/low, och avvikelser.
