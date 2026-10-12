# Uppdrag: verifiera OBEKRÄFTADE (grå) platser mot primärkälla (område C)

Appen Tömningskartan (tomningskartan.se) visar platser för latrin-/gråvattentömning och
färskvatten för husbil. Ägaren prioriterar RÄTT före FLER. Poster som bara stöds av
aggregatorer visas grå ("Obekräftad"). Din uppgift: hitta en PRIMÄRKÄLLA med ordagrant citat
för varje post, så att den kan bli bekräftad – eller notera att den motsägs.

## Indata
`<SCRATCH>/c/grupp-<N>.json`: `id`, `name`, `services`, `unverified` (hela platsen grå),
`unverifiedServices` (påstådda tjänster), `website`, `description`, `lat`/`lon` (ungefärliga).
Tjänstekoder: `gravatten`, `latrin`, `vatten`, `stallplats`, `camping`.

## Metod
1. WebFetch är oftast blockerad – använd **WebSearch** med `allowed_domains: ["<domänen i website>"]`
   och sökord som `"<namn>" tömning`, `latrin gråvatten`, `färskvatten`, `ställplats pris`.
2. Primärkälla = anläggningens egen sajt, kommun, turistråd, bokningsplattform anläggningen själv
   använder. husbilsplats.se, park4night, stallplatskartan, campingkollen, bloggar och
   Google-omdömen räknas INTE (→ confidence "low").
3. **Max 60 WebSearch-anrop.** Vid kvotfel: sluta och skriv ut resultatet. Gissa aldrig.
4. För varje post: vilka av tjänsterna (gravatten/latrin/vatten, och för hel grå plats: att
   platsen finns och är ställplats/camping) styrker källan med ordagrant citat? Är den nedlagd/
   stängd? Avgift och säsong (korta, läsbara: "1 maj–30 sep", "50 kr per tömning").

## Utdata
Skriv `<SCRATCH>/c/res-<N>.json`:
```json
{ "group": 0, "searchesUsed": 0, "quotaHit": false,
  "places": [ { "id": "curated-…", "name": "…", "status": "bekraftad|delvis|ej_belagd|motsagd|nedlagd",
     "confirmedServices": ["latrin"], "contradictedServices": [],
     "fee": "kort text eller null", "openingHours": "kort eller null", "season": "seasonal|year-round|null",
     "evidence": "ORDAGRANT citat", "source": "https://...", "confidence": "high|medium|low", "notes": "" } ] }
```
`motsagd` kräver att källan uttryckligen säger att tjänsten saknas. Utelämna poster du inte hittade något om.
