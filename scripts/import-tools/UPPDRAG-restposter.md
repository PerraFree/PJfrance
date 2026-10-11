# Uppdrag: restposter för Tömningskartan (tomningskartan.se)

Samma regler som alltid: **gissa aldrig**. Koordinater bara från källa (anläggningens egen sida
med kartlänk/GPS, hitta.se/eniro-URL med koordinat, husbil.se/husbilsplats.se/park4night/myLPG.eu
som anger GPS). Tjänster (latrin/gråvatten/vatten, gasolpåfyllning av lös flaska) kräver
PRIMÄRKÄLLA med citat: operatörens egen sida, Trafikverket, kommun. Aggregatorer räcker bara
för koordinat, inte tjänst. WebFetch är egress-blockad mot nästan allt – använd WebSearch
(gärna `allowed_domains`) och läs sammandragen noga. Max ~8 sökningar per plats.

Leverans: JSON-array till angiven fil, ett objekt per plats:
```json
{ "name": "...", "lat": 0, "lon": 0, "address": "...", "source": "https://...",
  "confidence": "high|medium|low", "services_note": "citat om tjänster", "note": "..." }
```
`lat`/`lon` = null om ingen koordinat hittas. Svara sedan med max 10 rader sammanfattning.
