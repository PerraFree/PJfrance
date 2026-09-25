# Campingkollen.se mot Tömningskartan – research (25 sep 2026)

Per frågade om platserna på https://campingkollen.se/karta/ finns med på kartan.
Rådata: `campingkollen.json` (samma mapp). Denna fil ändrar INTE
`scripts/curated-places.json` eller någon kod – den är underlag för ett kommande
import-steg (bekräftade rader som vanliga poster, låg-evidens som grå/`unverified`).

## Hur sajten kunde läsas

- **Direktläsning gick inte.** `campingkollen.se` är egress-blockad i sandboxen för
  både curl och WebFetch (kartan, sitemap.xml, robots.txt, länssidor, platssidor).
  Wayback Machine (`web.archive.org`) och läsproxyn `r.jina.ai` är också blockade.
  Kartans JSON-endpoint kunde därför aldrig identifieras.
- **Allt bygger på WebSearch med `allowed_domains: ["campingkollen.se"]`**, dvs.
  sökmotorns index av sajten – inte sajten själv. Sajten har länssidor
  (`/stallplatser/<län>/`, 21 län) och en sida per plats (`/stallplats/<slug>/`) med
  namn, kommun och typ i sidtiteln ("Partille ställplats – Ställplats | Campingkollen").
- **Sökindexet täcker bara en liten del av sajten.** Samma ~10–15 slugs per län
  återkom oavsett kommun- eller tjänsteord. Bara Halland, Gävleborg, Uppsala och
  Gotland hade indexerade länssidor (Halland anger 64 platser, Gävleborg 126 – vi fick
  fram 10 respektive 22). Skåne gav 5 platser, Västmanland 0, Västernorrland 2,
  Jämtland 2. **Listan är alltså ett stickprov (~125 av uppskattningsvis 1 500–2 000
  platser), inte en fullständig avstämning.** För en komplett lista krävs att sajten
  läses i en webbläsare (kartans dataanrop syns i nätverksfliken) eller att
  egress-blockaden hävs för domänen.
- Tjänsteuppgifter (latrin/gråvatten/färskvatten) kommer från sökutdragen av
  platssidorna. Ospecificerat "tömning" registrerades som latrin+gråvatten.

## Antal

| | Antal |
|---|---|
| Rader från campingkollen (unika platser) | 125 |
| FINNS MED TÖMNING (matchad seed-post har latrin/gråvatten/vatten) | 44 |
| FINNS UTAN TÖMNING (matchad seed-post saknar kärntjänst) | 46 |
| SAKNAS HELT | 35 |
| …varav nya med tjänst, primärkälla **high** | 10 |
| …varav nya med tjänst, **medium** | 4 |
| …varav nya med tjänst, bara campingkollen (**low**) | 7 |
| …varav nya utan påstådd tjänst (ställplats/camping-only) | 14 |
| Kompletteringar av befintliga poster (ny tjänst belagd), high/medium | 12 |
| Kompletteringar bara enligt campingkollen (low) | 2 |
| Motsägelser (primärkälla säger NEJ där campingkollen säger ja) | 1 |

Sökningar: **197 av kvoten** (3 egna + 140 extraktion i 7 agenter + 54 verifiering i 3
agenter). Verifiering gjordes för 41 av de 50 rader som saknades eller hade en
tjänst seeden inte har; 10 rader utan påstådd tjänst söktes aldrig (budget).

Matchning mot `stations-seed.json` (gh-pages, 6 048 platser): kärnnamn utan
generiska ord + kommun/avstånd till kommunens mittpunkt. Alla 125 automatmatcher
granskades manuellt; 14 rättades för hand (t.ex. Ystads Marina → registerposten
"Ystads småbåtshamn – latrintömning", Haparanda Hamn → "Ställplats Haparandahamn"
i Nikkala, inte Haparanda Camping 15 km bort; golfklubbar som matchat mot campingar
sattes till SAKNAS). Campingkollen ger inga koordinater i sökutdragen, så `lat`/`lon`
är seedens koordinat vid matchning och `null` för nya rader; `nearLat`/`nearLon` är
medianen av seedens platser i kommunen (för rimlighetskontroll vid geokodning).

## Nya platser med tjänst och primärkälla (redo att läggas in)

| Plats | Kommun | Tjänst | Källa |
|---|---|---|---|
| Lysernas Ställplats (Lyserna 2, Rolfstorp) | Varberg (ej Falkenberg som campingkollen anger) | latrin, gråvatten, vatten | akulla.eu |
| Brännebacka Gård | Grästorp | latrin, gråvatten, vatten | vastsverige.com (Turistrådet Västsverige) |
| Harsa Konferens & Fritid | Ljusdal | latrin, gråvatten, vatten | harsa.se |
| Tiraholms ställplats | Hylte | latrin, vatten | tiraholm.se |
| Ställplats Kurjoviken (Ursvikens SS) | Skellefteå | latrin, vatten | urss.se |
| Berkinge Bad & Fiskecamp | Östhammar | latrin | berkinge.se |
| Quickstop Ratan | Robertsfors | latrin | ratan.se – kan vara samma ställplats som befintlig "Ratans bygdegårdsförening" (vatten), kolla läge |
| Röks Lanthandel | Ödeshög | gråvatten | rokslanthandel.com |
| Forsvik ställplats (Göta kanal) | Karlsborg | vatten | gotakanal.se |
| Naturfantastens ställplats | Östhammar | vatten | naturfantasten.se |
| Lauterhorn, Fårö (medium) | Gotland | latrin, gråvatten, vatten | gotland.com (officiell turistsida) |
| Nybrovallen Grönhögens Camping (medium) | Mörbylånga | latrin, gråvatten, vatten | oland.se (officiell) |
| Forsgårdens ställplats (medium) | Gävle | vatten | forsgardengavle.info |
| Borenshults slussar (medium) | Motala | vatten | gotakanal.se |

## Kompletteringar av befintliga poster (primärkälla)

| Befintlig post (seed-id) | Ny tjänst | Källa |
|---|---|---|
| Ställplats BK Najaden, Halmstad (`curated-15-…`) | latrin, gråvatten, vatten | bknajaden.se |
| Lessebo Camping (`osm-way-1082670495`) | latrin, gråvatten, vatten | lessebocamping.com |
| First Camp Malmö Sibbarp (`osm-way-296888614`) | latrin, gråvatten, vatten | firstcamp.se |
| Johannesvik Camping & Stugby, Kungshamn (`osm-relation-10616119`) | latrin, gråvatten, vatten | johannesvik.nu |
| Vimmerby Camping Nossenbaden (`osm-relation-9695351`) | latrin, gråvatten, vatten | vimmerbycamping.se |
| Hargshamns Camping (`osm-way-841972317`) | latrin, gråvatten, vatten | hargshamnscamping.se |
| Malungs Camping, Bullsjön (`osm-way-562057953`) | latrin, gråvatten | malungscamping.se |
| Dals-Eds Båtklubb (`osm-way-705665275`) | vatten | vastsverige.com |
| Fiskepuben ställplats, Bockalt (`curated-849-…`) | vatten | fiskepuben.com |
| Ställplats CSS Karlsborg (`osm-way-1327509253`) | vatten | vastsverige.com |
| Ystads småbåtshamn (`curated-812-…`) | vatten | ystad.se |
| Lysingsbadet Västervik Resort (`osm-way-125554618`, medium) | vatten | vastervik.com |

## Motsägelse – lägg INTE till

- **Ställplats Ronneby Marina / Östra Piren:** campingkollen påstår tömning, men
  Visit Blekinge (officiell) säger uttryckligen att grå-/svartvattentömning INTE
  finns på piren utan hänvisar till annan plats i kommunen. Bara färskvatten
  (finns redan på "Ronneby Hamn"). Seeden har dessutom en separat OSM-nod
  "Tömningsstation vid Ronneby Hamn" – den bör kontrolleras mot samma källa.

## Låg evidens (bara campingkollen – kandidater till grå/`unverified`)

Nya med tjänst: Källinge Gård (Enköping, vatten), Stall Torsbrogården (Uppsala,
vatten), Hovra STF Vandrarhem (Ljusdal, vatten), RiverWild Fishing & Lodging
(Ljusdal, vatten), Eckeruds Gård (Mellerud, gråvatten+vatten), Tågstallarnas
ställplats (Rättvik, vatten), Caravan Club Granfjärden (Östhammar, latrin).
Kompletteringar: Ställplats Mines camping Järvsö (latrin+gråvatten – seeden har
"Mines Camping" med bara vatten), Gafsele bygdegård (vatten).

Nya utan påstådd tjänst (bara ställplats/camping): Fricamping vid Hästskär,
Friiberghs GK, Falun-Borlänge GK Aspeboda, Bergbetningen (Gotland), Brunkulla Gård
(Frösön, Östersund), Ställplats Lagavägen/Rökeriet (Laholm), Fricamping Sollerön,
Sikargården (Norrköping), Voxnabruks Kanot & Camping, Ställplats Rosenberg
(Strängnäs), Lögdö Wild (Timrå), Älvkarleby GK. Två bekräftade UTAN tömning på
plats: Hagaparken Hofors (kommunen hänvisar till Edskens Camping 4 km bort) och
Hyppelns gästhamn (Öckerö).

## Begränsningar och nästa steg

1. Listan är ett stickprov styrt av sökindexet, inte campingkollens fulla karta.
   Det säkraste sättet att få hela listan är att öppna kartan i en webbläsare och
   spara det JSON-svar kartan laddar (nätverksfliken), eller tillåta domänen i
   miljöns nätverkspolicy och köra om med WebFetch.
2. `lat`/`lon` saknas för alla nya rader – de behöver `query` + `nearLat`/`nearLon`
   (finns i JSON) eller exakt koordinat från primärkällan vid import.
3. Campingkollens kommunuppgift var fel för tre rader (rättade i JSON: Lysernas →
   Varberg, Torsbrogården → Uppsala, Brunkulla → Östersund) – kontrollera kommun
   mot adressen även för övriga rader vid import.
4. Rastplatser (Anilla, Brösarps Backar, Dalstorp, Skrea Backe, Ljungskile) finns
   redan via Trafikverket och behöver inget.
