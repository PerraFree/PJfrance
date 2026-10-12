# Granskningslogg

Logg över oberoende granskningar av hela systemet (kod, data, säkerhet,
drift, webbläsartest). Rutinen "Veckogranskning" (onsdagar) lägger till ett
avsnitt per körning, nyast överst. Varje fynd: vad, bevis, åtgärd, och vilken
**vakt** (automatisk kontroll) som nu hindrar att samma sorts fel kommer tillbaka.
Regler hör hemma i CLAUDE.md, läget i `docs/STATUS.md` – här bara loggen.

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
