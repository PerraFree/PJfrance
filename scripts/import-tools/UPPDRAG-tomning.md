# Uppdrag: hitta tömningsstationer för husbil (latrin + gråvatten) som saknas i appen

Appen Tömningskartan (tomningskartan.se) visar platser i Sverige där husbilar/husvagnar kan tömma
latrin (kassettoalett) och gråvatten (disk-/duschvatten). Du ska hitta platser i DIN region som
saknas i den publicerade datan, eller befintliga platser som saknar tjänsten fast den finns.

## Filer
- `/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/existing-tomning.json`
  – alla 1 153 platser som REDAN har gråvatten/latrin (id, name, lat, lon, services). Läs in med node
  och filtrera på din regions lat/lon-box, så ser du vilka kommuner som redan är täckta och var
  luckorna är.
- `/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/existing-all.json`
  – ALLA 5 728 platser i appen (även camping/ställplats/vatten/gasol). Innan du rapporterar en plats
  som NY: grep/sök på namnet och kolla om det finns en post inom ~400 m – då är det en KOMPLETTERING
  av den posten (ange dess `id`) i stället för en ny plats.

## Metod (viktigt)
1. Lista kommunerna i din region. Prioritera kommuner som har 0–1 tömningsplatser i
   `existing-tomning.json`, men gå igenom alla du hinner.
2. Sök med WebSearch. Bra sökningar: `"tömningsstation" husbil <kommun>`, `latrintömning husbil <ort>`,
   `gråvattentömning <ort>`, `site:<kommun>.se husbil tömning`, `ställplats <ort> latrintömning`.
   Kommunernas egna sidor ("Tömning av husbil/latrin" under avfall/VA) är den bästa källan – många
   kommuner har gratis tömningsstationer vid reningsverk, återvinningscentraler, hamnar eller
   busstationer som ingen annan känner till. Även gästhamnar (om tömningen uttryckligen gäller husbil,
   inte bara båtar), bensinstationer (OKQ8/Circle K/Preem med "husbilstömning"), campingar, golfklubbar.
3. **WebFetch är oftast blockerat** mot kommun-/campingsajter härifrån – testa gärna en gång, men
   lita på WebSearch (använd `allowed_domains` mot t.ex. kommunens domän för att få sidinnehåll).
4. **Du har max 22 WebSearch-anrop** (kvoten är delad med sju andra agenter). Om du får
   "quota/limit"-fel: sluta söka och skriv ut det du har.
5. Krav för `confidence: "high"`: en konkret källa (kommunsida, anläggningens egen sajt,
   Trafikverket, nyhetsartikel) med ett citat som uttryckligen säger att det finns latrin-
   och/eller gråvattentömning för husbil på den platsen. husbilsplats.se, park4night, campingse.se,
   Google-omdömen räknas INTE som tillräckligt ensamma → `confidence: "low"`.
6. Koordinater: ange `lat`/`lon` bara om du fått dem från en källa (kommunkarta, OSM, hitta.se) –
   gissa aldrig. Annars ange `address` (gata + ort) och `townLat`/`townLon` för ORTENS centrum
   (dem får du gärna ta ur eget huvud, de används bara som rimlighetskontroll för geokodningen).

## Utdata
Skriv JSON till `/tmp/claude-0/-home-user-PJfrance/6140915e-86bc-5bdf-9a99-cd26fe969797/scratchpad/results/tomning-<REGION>.json`:
```json
{
  "region": "...",
  "searchesUsed": 0,
  "quotaHit": false,
  "new": [
    { "name": "Tömningsstation Xköpings reningsverk", "services": ["latrin","gravatten"], "vatten": true,
      "lat": 57.1, "lon": 12.3, "address": "Gatan 1, Xköping", "townLat": 57.1, "townLon": 12.3,
      "openingHours": "1 maj–30 sep", "fee": "gratis", "operator": "Xköpings kommun",
      "evidence": "ordagrant citat från källan", "source": "https://...", "confidence": "high" }
  ],
  "enrich": [
    { "existingId": "osm-node-123", "existingName": "...", "addServices": ["latrin"],
      "evidence": "citat", "source": "https://...", "confidence": "high" }
  ],
  "checkedNoHit": ["Kommun A", "Kommun B"],
  "notes": "kort om vad som var svårt/oklart"
}
```
`services` får bara innehålla `latrin`, `gravatten`, `vatten` (färskvattenpåfyllning) – bara det som
källan faktiskt belägger. Rapportera även `low`-fynd (de läggs inte in men sparas för manuell koll).
Skriv filen även om du hittar lite. Avsluta med en kort sammanfattning (antal high/low, vilka kommuner
du hann med).
