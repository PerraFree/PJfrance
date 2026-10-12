# Granskningslogg

Logg över oberoende granskningar av hela systemet (kod, data, säkerhet,
drift, webbläsartest). Rutinen "Veckogranskning" (onsdagar) lägger till ett
avsnitt per körning, nyast överst. Varje fynd: vad, bevis, åtgärd, och vilken
**vakt** (automatisk kontroll) som nu hindrar att samma sorts fel kommer tillbaka.
Regler hör hemma i CLAUDE.md, läget i `docs/STATUS.md` – här bara loggen.

## 2026-10-12 – runda 7–10 (fynden krymper: runda 10 hittade inget allvarligt)

| Runda | Viktigaste fynd | Åtgärd | Vakt framåt |
|---|---|---|---|
| 7 | SEO-sidorna hade egen kopia av sammanslagningen: 54 rastplatser med gråvatten, 12 sidor med grå tjänster som gröna, Storfors "byt tub", olika gasolbutiker hopslagna, Håbo/Habo på samma sida, uppblåsta kommunantal | Sammanslagningen flyttad till `src/lib/merge.ts`; generatorn laddar den via esbuild | En källa – kopiera aldrig logiken (CLAUDE.md) |
| 7 | Appen hämtade inga liveplatser när första kategorin valdes utan att kartan flyttats | Hämtning efter 1,5 s om kartan står still | – |
| 8 | Två hårdkodade platser utan källa i appen (Nynäshamns gästhamn – borttagen ur registret, Circle K Gnesta) | `OWN_STATIONS` tom | Kommentar i `src/data/stations.ts`: använd registret |
| 8 | "Sopstation vid Venjans Camping" slog grannens riktiga namn | Synkens `nameFrom: 'nearby'` viker för eget namn (89 platser) | – |
| 9 | Sök: 16 av 290 kommunnamn hamnade i fel kommun ("Malmö" → Malmöns Camping i Köping) | Hela ord; kommunnamn → ortsökning | Kontrollerat 0/290 |
| 9 | Delad länk till plats med bara grå tjänster: "hittades inte" | Grå tjänster räknas | – |
| 10 | Gasolknappar vid väntande länk, liggande 667 px, dubbla "vid"-namn, SEO-källrad, /kommun/habo/ 404 | Rättade; esbuild uttryckligt beroende | – |

Kvar (medvetet): 119 platssidors adresser byttes när de fick registrets
namn (sajten är ny, ingen omdirigering); Gotland/Orust-frågan till Per.

## 2026-10-12 – runda 4–6 + försvunna platser + SEO

### Runda 4 (regressioner från runda 3)
- CSP-taggen hamnade efter skripten (gällde inte) → direkt efter `<meta charset>`;
  efterkontroll i deploy.yml. Android-bygget saknade databasen → `supabase.env`
  läses i alla byggen.
- Gränssnittet: felmeddelanden dolda bakom tangentbordet på mobil, popupen
  stängdes vid filterbyte, delade länkar (`?at=`) öppnade inte platsen,
  tillbakaknappen stängde appen, tillgänglighet (etiketter, fokus).

### Runda 5
- Storfors "byt tub" tolkades som gasol, bortfallsvakten såg inte tjänster som
  blivit grå/tappats på kvarvarande platser (74 av 831 ÅVC hade tappats tyst)
  → **vakt:** kategorigräns 5 % i `check-seed-diff.mjs`.
- Webbläsartest: mobilfoton, platsförslag på fel ställe, filterval, smal
  skärm, öppettider på svenska.

### Försvunna platser (Pers fråga om Borås GK)
- Borås GK: en septembersession körde över Pers fältkännedom → återställd
  (latrin, vatten, sopor). **Vakt:** `scripts/per-fakta.json` + förlustvakten i
  `check-register.mjs` (en bekräftad tjänst som försvinner kräver daterat skäl;
  borttagen post kräver alias eller rad i `scripts/borttagna.json`).
- Genomgång av alla registerposter som tappat tjänster sedan augusti:
  Gävle Camping Engesberg, Sandviken Strand Havssidan och Vilhelmina
  infocenter återställda. Voxnabruk och Visby GK (#33) rättade lägen.
  **Vakt:** exakt `lat`/`lon` som motsäger `nearLat`/`nearLon`/`maxKm` stoppar deployen.

### Runda 6 – SEO-sidorna
- Ärlig källa/säkerhet per plats (branschlista = "Medel – ring gärna innan",
  OSM = "inte kontrollerad av oss"), en sida per plats inom 100 m, titlar som
  bara lovar tjänster som finns, nofollow på kartlänkar, `safeHref`.
- Nytt: ~1 750 platssidor, 289 kommunsidor, 21 länssidor, 5 tjänstesidor,
  vanliga frågor (FAQPage), sitemap ~2 065 URL:er. 0 trasiga länkar, all
  JSON-LD giltig. Länstillhörigheten: `scripts/kommun-lan.json`.

## 2026-10-12 – tredje granskningen (5 granskare + 2 rättningsagenter)

Granskare: datakedjan synk→app, säkerhet runda 2, webbläsartest runda 2,
OSM-/Trafikverket-data, drift och tysta fel. Plus Pers önskan: exakta lägen
för gasolbutikerna och de nio registerparen inom 100 m.

### Allvarligast
| Fynd | Åtgärd | Vakt framåt |
|---|---|---|
| Appen blev en tom sida offline direkt efter varje uppdatering (sw.js raderade gamla JS innan nya hämtats) | JS/CSS cachas vid installation, föregående versions filer följer med, serverfel ger sparad kopia | Återskapat + verifierat i Chromium (granskarens test `swtest.cjs`) |
| En trasig seed committades och stoppade ALLA deployer i upp till en vecka | `check-seed.mjs` körs i synken före commit + ärende `<!-- synk-seedkontroll -->` | sync-data.yml |
| Ny taggregel (access=customers = privat) tog i första synken bort ~200 riktiga campingtömningar/ÅVC – upptäckt i efterkontrollen, rättad samma timme | Regeln borttagen | **Ny:** `check-seed-diff.mjs` stoppar synken om >25 OSM/TRV-platser med tömning/vatten/gasol försvinner (testad: hade stoppat, 52 > 25) |
| `distinct` följde aldrig med till appen – undantag från 100 m-regeln slogs ihop ändå | Fältet skrivs till seeden; appen följer samma regel som check-register | – |

### Säkerhet (35 PGlite-tester + test mot levande databas)
- Ett foto kunde kopplas till hundratals platser → URL:en måste ligga i platsens egen mapp.
- "Bekräftad av 20 användare" från en person → en bekräftelse/ett betyg per avsändare, plats och dygn (verifierat live: andra försöket nekas).
- /48-nät kringgick /64-spärren → även /48 (IPv4 /24) räknas, 4× tak.
- Spam kunde tränga undan riktiga bekräftelser/betyg (appen läste 5 000 senaste) → sammanställningsvyer.
- Platsförslag med NaN-koordinater, tomt namn, 2D-listor → nekas i databasen.
- Phishing via `www.` och osynliga styrtecken i Pers mejl → neutraliseras.
- Bucketgräns 3 → 1 MB. onerror-attribut (stoppat av CSP) ersatt; skydd mot inbäddning.

### Data
- Rastplatser visade gråvatten (56 av 298) – Trafikverkets tar bara kassett → 0.
- Nedlagda/privata platser, båttömning i marinor, industrigasbutiker, FTI-stationer som "ÅVC", BRF-/hundkärl som "sopor" → borta (båda tolkningsvägarna lika, 51 taggtester).
- Trafikverket "tillfälligt stängd" → tjänsten grå (Tollered, Ljusdal).
- Gratisfiltret: plats som fått en betald grannes ställplats räknas inte som gratis (−25).
- Säsong/öppettider smittade mellan olika verksamheter; dricksvattennod gjorde grå plats grön; olika gasolbutiker slogs ihop (ÖoB fick automatens pris) → rättat.
- Registerpar inom 100 m: Västanvik, Lökholmen, Malnbaden, Lögnäs, Ulricehamn ihop; Östersunds Stugby bort (fel läge); Borgholm Sunset/gästhamn distinct.
- Exakta lägen: GasolAutomat City Gross + Plantagen Borås, Elgiganten + jem & fix Karlshamn (samma byggnad, distinct), Sikargården, Hästskär.

### Drift
- Trafikverket-felsvar (200 + ERROR) gav tyst 0 platser → räknas som fel, reserven används.
- Gammal data såg färsk ut → `sources.osm/trafikverket {fresh, at, count, error}` i seeden; sajtvakten larmar efter 9 dagar.
- deploy-vakt: ett nytt försök vid tillfälligt fel; ärendet stängs när det fungerar.
- Ärendelistor pagineras; commons-felsvar cachas inte; namn-cachen kastade 28 riktiga ortnamn.

### Kvar
- Overpass svarade inte vid lägesuppslaget: Skurup och Eslöv (bara gatuläge),
  Visby reningsverk, Östhammar, Stenungsunds BK, Färgelanda RK, Malmö City GK,
  Strandstuviken, Stjärnfors (kaffestuga + golf), Klässbols gästhamn – står
  kvar som osäkra/grå. Görs om när Overpass svarar (veckogranskningen).
- Gotlandsregeln mot OSM: 10 OSM-tömningar på Gotland och 3 på Orust (bl.a.
  Rastplats Såten) krockar med regeln i CLAUDE.md – kräver Pers fältkännedom
  om regeln gäller campingarnas egna stationer.
- 813 "Sopstation"-noder utan husbilstjänst inom 500 m (troligen bostadskärl).

## 2026-10-12 – andra granskningen (5 oberoende granskare)

Granskare: ny kod (fientligt), datakvalitet i registret, leverantörskedja/
GitHub-inställningar, SEO/HTML, webbläsartest (desktop + mobil, hostila indata).

### Säkerhet
| Fynd | Åtgärd | Vakt framåt |
|---|---|---|
| Kommunnamn med `</script>` kunde köra skript i kommunsidornas JSON-LD | `<` escapas; slug via NFD; trasiga koordinater kraschar inte | Testat mot fientlig seed; `check-seed.mjs` |
| Bilder från valfri server via OSM-taggen `image` (IP-loggning) | Bara upload/commons.wikimedia.org (synk, live, popup) | CSP `img-src` |
| Ingen CSP/referrer-policy | CSP + referrer som meta i bygget, om- och kommunsidor | `check-csp.mjs` + efterkontroll i deploy.yml |
| Spamskyddet per IP gick att kringgå med IPv6 (`::` förkortning) och förfalskad `x-forwarded-for` | IP via `inet`, IPv6 per /64, ::ffff-IPv4 normaliseras, bara `cf-connecting-ip` | 22 PGlite-tester (scratchpad `pgtest/test.mjs`) |
| Skrivtoken låg i `.git/config` under bygget | `persist-credentials: false` i deploy + läsjobb | – |
| ADMIN.md lärde ut en token för hela Supabase-kontot | Instruktion för avgränsad token | – |
| `facilityChip` escapade inte | Escapas | – |

### Data (rätt före fler)
| Fynd | Åtgärd |
|---|---|
| ~53 poster visade tömning/vatten bekräftat med bara aggregatorkällor | Tjänsterna grå (6 hela poster grå); primärkälla hittad för 9 |
| Beskrivning motsäger tjänst (Nybostrand, Nossebro, Hökensås m.fl.) | Rättade mot källan |
| Nynäshamns gästhamn (båttömning) och "Tranemo" (kommunmittpunkt) | Borttagna |
| Visby reningsverk latrin, Ellös (Orust) latrin, Sandviken Gotland | Latrin borttagen (Gotland/Orust-regeln) |
| Brändö + Örnvik, First Camp Sunne + Kolsnäs: samma plats | Sammanslagna, alias ompekade |
| 10 poster `year-round` men vinterstängda | Säsong rättad |
| "Gratis"-filtret tog med 87 betalplatser ("gratis för gäster; 60 kr") | Kräver gratisord utan villkor och utan pris |
| Tågstallarna/Siljanbadet 99 m isär missades av 100 m-kontrollen | `distinct: true` (olika verksamheter) – kontrollen rättad |

### Kod och drift
| Fynd | Åtgärd | Vakt framåt |
|---|---|---|
| Tillfälligt geokodarfel cachades som "hittas inte" i 30 dagar | Fel cachas aldrig | – |
| Rättad `query` kunde behålla det gamla felaktiga läget tyst | Reserv bara vid samma query; alltid rapporterad i bortfallsärendet | Ärendet `register-bortfall` |
| 100 m-kontrollen missade par i öst-västlig led i norr | Cellstorlek per breddgrad | Test med par 96 m isär |
| `check-mirrors` släppte igenom ändrade blanksteg, text efter `//`, variabler | Listorna tolkas som riktiga värden | Fientliga tester |
| Grå/grön tjänst berodde på sammanslagningsordning | Registrets grå tjänster låses när kopian skapas | – |
| Overpass-timeout dolde felet | Eget felmeddelande | – |
| Favorit som lades till under aliasladdning skrevs över | Översätter aktuellt tillstånd | – |
| Seedkontrollen kördes före manuell synk | Körs efter | – |
| deploy-vakt startade om `timed_out` var 15:e min | Räknas som misslyckad → ärende | – |
| Sajtvakten mejlade var 30:e min under ett avbrott; `updatedAt` saknas = tyst | Ett larm; NaN larmar | – |
| Inget larm om Supabase pausas | Databasvakt i förslagsbevakningen (ärende, stängs själv) | `bevaka-platsforslag.yml` |
| SEO-steget fick misslyckas tyst; `main` utlöste deploy | Borttaget; efterkontroll av bygget | deploy.yml |
| Dependabot bara för actions | En samlad npm-PR/vecka (minor/patch) | Dependabot |

### Webbläsartest
| Fynd | Åtgärd |
|---|---|
| `/?at=59.3` kraschade hela appen; `?at=,,` sparade 0,0 som startläge | `src/lib/view.ts` validerar länk och sparat läge |
| "Stämmer fortfarande" och "Lägg till plats" visade tack även när databasen nekade | Tack först efter svar; databasens svenska fel visas; försök igen |
| Engelska "Failed to fetch", inga tidsgränser (evigt "Skickar …") | `src/lib/http.ts`: 20 s tidsgräns, svenska fel |
| Tre klick = tre inskick | Synkrona lås i formulären |
| Översikten ritade bara 600 platser närmast mitten (Skåne tomt) | Tak 3 000, jämnt urval över kartan (uppmätt med 4× strypt CPU) |
| Räknaren visade alltid totalen | "74 av 5 177 platser" med filter |
| Hopfällt bottenark täckte 60 % av mobilskärmen | Vägknapp, sidfot, version dolda i hopfällt läge |
| Sökning "Mora" hamnade på en gasolbutik | Stationsträff bara vid exakt/början/enda träff |

### Kvar (ej åtgärdat)
- Fyra gasolpar på samma geokodade punkt (Borås, Skurup, Karlshamn, Eslöv) –
  butikssidorna gick inte att nå; behöver exakta koordinater.
- Exakta koordinater saknas för nio markerat osäkra poster (Östhammar, Visby
  reningsverk, Stenungsunds båtklubb m.fl.).
- Nio geokodade registerpar inom 100 m i seeden (varning i `check-register.mjs`).
- Lagringens gemensamma tak (120/h) kan fyllas av en angripare och stänga
  fotouppladdning för alla en stund – accepterat (ingen data riskeras).
- 13 gamla `claude/*`-grenar – ofarliga, kan raderas av Per i webbläsaren.
