# Tömningskartan – regler för AI-assistenter

Läs denna fil först i varje session, sedan `docs/STATUS.md` (aktuellt läge och
nästa steg). Den här filen innehåller BARA det som gäller varje session: regler,
arkitektur, workflows och bestående lärdomar. Lägesbilder, sessionsloggar och
avklarat arbete skrivs i `docs/STATUS.md`, `docs/svep-logg.md` eller GitHub-
issues – aldrig här. Ny regel här bara om den gäller varje framtida session.

## Fler filer (länka, importera inte)

| Fil | När den läses |
|---|---|
| `docs/STATUS.md` | Vid sessionsstart: aktuellt läge + nästa steg. Skrivs ÖVER vid överlämning. |
| `docs/svep-logg.md` | Före ett datasvep: rotationen A–E, regler, logg över körda svep. |
| `docs/granskningslogg.md` | Före en systemgranskning: tidigare fynd, åtgärder och vilken vakt som täcker dem. |
| `docs/HISTORIK.md` | Vid behov: arkiv med tidigare lägesbilder, metoder, beslut och gasol-/svepdetaljer (t.o.m. 11 okt 2026). |
| `docs/KALLJAMFORELSER.md`, `docs/SEO.md`, `docs/LANSERING.md` | Vid behov: källjämförelser (First Camp m.fl.), SEO/spridning, lanseringstexter för crowdsourcing. |
| `docs/ADMIN.md`, `docs/SUPABASE.md`, `docs/DATAKALLOR.md`, `docs/BUILD-MOBILE.md` | Pers adminguide, databasen, datakällor, Android-bygge. |
| `scripts/import-tools/README.md` + `UPPDRAG-*.md` | Före ett svep: importskript och agentuppdrag. |
| GitHub-issues med etiketten `backlog` | Öppna punkter, prioritet via `prio-1`/`prio-2`/`prio-3`. |

## Vad appen är

PWA för husbils-/husvagnsägare i Sverige: platser för gråvatten-/latrintömning,
färskvatten, sopor, återvinningscentral och gasol (byte/påfyllning). Ställplats
och camping är sekundär info. Ägare: Per (GitHub **PerraFree**, begränsad teknisk
vana – förklara "för dummies", håll UI:t rent). Mejl: pej2727@gmail.com.
Pers prioritering: **rätt före fler** – en felaktig tjänst är värre än en saknad.
**Fråga inte Per vad som ska göras härnäst** (12 okt 2026): sessionen väljer
själv enligt prioriteringen i issues (`prio-1` först) och `docs/STATUS.md`,
kör, och rapporterar efteråt. Fråga bara när ett val kräver något av Per
(pengar, konton, hans fältkännedom) eller är oåterkalleligt.

- **Live:** https://tomningskartan.se/ (adminsida `?admin=1`). Egen domän (Inleed)
  → GitHub Pages via 4 A-poster + CNAME `www`. `BASE_PATH=/` i `deploy.yml` och
  `cname: tomningskartan.se` i publiceringssteget håller domänen aktiv. Repot
  heter fortfarande `PerraFree/PJfrance`.
- **Pages-inställningar (Enforce HTTPS, domänverifiering) sköts i webbläsaren** –
  API:t `repos/…/pages` är spärrat i sessionens proxy och sajten nätblockerad.
  TXT-posten `_github-pages-challenge-PerraFree` hos Inleed ska ligga kvar.
- **Default-branch = arbetsbranch:** `claude/gravatten-latrin-app-sverige-aed0qg`.
- Push → `deploy.yml` bygger från den COMMITTADE seeden (~1 min). Datasynken
  sköts av `sync-data.yml` (~3 min) som committar seeden `[skip ci]` och startar
  deployen själv. En push som ändrar registret ger alltså två deployer.

## Teknik

Vite 6 + React 18 + TypeScript + Leaflet + leaflet.markercluster. Ingen backend
utom Supabase (crowdsourcing). Kör `npm audit` då och då (0 critical/high;
3 moderate i `@capacitor/cli`:s dev-beroenden utan fix). Vite 7 valdes bort
(höjer webbläsarkravet). PWA med `public/sw.js` (nätverk först) – **bumpa
`CACHE`-versionen vid varje appändring** så telefoner hämtar nytt. Capacitor/
Android förberett (`docs/BUILD-MOBILE.md`).

## Nyckelfiler

| Fil | Roll |
|---|---|
| `src/App.tsx` | Panel/bottenark, sök, filter, räknare, versionsrad |
| `src/lib/merge.ts` | Sammanslagning inom 100 m (`dedupe`/`mergeInto`: registret vinner, tjänster unionas, registrets grå tjänster låsta, rastplatsers gråvatten, gasolbutiker) + `isFree`. EN källa för både appen och SEO-sidorna (`build-seo-pages.mjs` laddar den via esbuild) – kopiera aldrig logiken |
| `src/components/MapView.tsx` | Karta: viewport-rendering (CAP 3000, jämnt urval över kartan), popup-persistens (stängs BARA av användaren), `centerPopup()`/`computeFreeRect()`, baskarta med säkerhetsnät (tileerror ≥6 eller inga tiles på 8 s → OSM-tiles; lyssnarna sätts FÖRE `addTo`) |
| `src/types.ts` | `ServiceType` (gravatten, latrin, vatten, sopor, atervinning, stallplats, camping, gasol), färger, ikoner, gasol byte/påfyllning-logik (`gasolFacilityStatus`, `serviceIsActive`), obekräftat-logik (`primaryActiveService`, `stationIsActive`) – EN delad källa, duplicera aldrig i komponenter |
| `src/lib/overpass.ts` | Live-hämtning per kartvy (zoom ≥ 12). Speglar synkskriptets taggtolkning, `EXCLUDED_OSM_ELEMENTS`, `OSM_FACILITY_OVERRIDES`, `OSM_SEASON_OVERRIDES`, `OSM_UNVERIFIED_OVERRIDES` (gör OSM-tjänster grå när egen sajt/kommun är tyst) – **ändra ALLTID båda filerna** (`check-mirrors.mjs`) |
| `scripts/sync-stations.mjs` | CI-synk: OSM (Overpass, med reserv från förra seeden vid avbrott) + Trafikverket + registret → `public/data/stations-seed.json`. Geokodningscache `scripts/geocode-cache.json` (nyckel = exakt `query`; tillfälliga Nominatim-fel cachas inte; vid miss behålls förra seedens läge). Namnsättning av namnlösa platser (`GENERIC_NAME` = `GENERIC_NAME_RE` i `src/lib/naming.ts`, ändra båda) |
| `scripts/curated-places.json` | Eget register (~1 700 poster). Fält: `lat`/`lon` (föredra!) eller `query` + `nearLat`/`nearLon` (+ `maxKm`, standard 30; stora kommuner 60–80), `services`, `unverified`, `unverifiedServices`, `confidence` (high/medium/low), `fee`, `gasolPrice`, `openingHours`, `season`, `facilities` (`gasol_byte`/`gasol_pafyllning`), `website`, `description` med citat + källa |
| `scripts/import-tools/` | Importskript, efterkontroller och agentuppdrag (`UPPDRAG-*.md`). `SCRATCH`-miljövariabeln pekar på arbetsmappen. Kör alltid `--dry` först |
| `scripts/build-seo-pages.mjs` | Plats-, kommun-, läns-, tjänste- och frågesidor + sitemap vid deploy (se `docs/SEO.md`); län från `scripts/kommun-lan.json` |
| `src/lib/photos.ts`, `restError.ts`, `community.ts`, `reviews.ts`, `verify.ts`, `http.ts` | Supabase-anrop (anon-nyckel), alla via `fetchWithTimeout` (20 s, svenska fel via `userMessage`). Formulär visar tack FÖRST efter lyckat svar och har synkront lås mot dubbelklick. Foton publiceras direkt utan kö (Pers beslut); bara egen bucket-URL visas (`isOwnPhotoUrl`). `restError` visar databasens svenska felmeddelanden |
| `src/lib/weather.ts` | ARKIVERAD (Per: för mycket info). `SHOW_WEATHER = true` i MapView slår på |
| `supabase/schema.sql` | Idempotent: tabeller + RLS, längdgränser (`*_len`), spamskydd (`rate_limits`, `rate_limit()`, triggers per tabell + storage-policy, per IP via `request.headers`), foto-URL-regex, storage-bucket. Ändrad fil tas i bruk med `installera-databasen.yml` |
| `supabase.env` | Publik Supabase-koppling (anon-nyckeln är publik per design) |

## Workflows (.github/workflows/)

- `deploy.yml` – bygg + publicera till gh-pages (push/dispatch). Stoppar före
  bygget om `scripts/check-mirrors.mjs` (OSM-listorna lika i synk och app),
  `scripts/check-register.mjs` (registret: tjänstekoder, koordinater, dubbletter
  inom 100 m, URL:er, id, alias), `scripts/check-csp.mjs` (alla externa värdar i
  `src/` finns i CSP:n i `vite.config.ts`), `scripts/check-seed.mjs` (golv per
  källa, koordinater; körs efter ev. synk) eller `npm audit --omit=dev
  --audit-level=high` slår larm, och efter bygget om sitemap/kommunsidor/CSP
  saknas. Kör vakterna lokalt före push. Synkar bara om rutan "synk" bockas i.
- `sync-data.yml` – enda datasynken; vid push på synkskript/register + måndagar
  03 UTC. Kör `check-seed.mjs` + `check-seed-diff.mjs` FÖRE commit (trasig seed
  eller stort bortfall publiceras inte, ärende `<!-- synk-seedkontroll -->`).
  Committar seed + cacher `[skip ci]` och dispatchar deployen. Stoppar
  om registret är trasigt eller <95 % av posterna kommer med; registerposter
  som faller bort läggs i ett ärende (`<!-- register-bortfall -->`).
- `deploy-vakt.yml` – var 15:e minut: startar deployen om grenens topp (inkl.
  seeden) inte är publicerad; har deployen redan misslyckats för toppen öppnas
  ett ärende i stället för att försöka igen.
- `installera-databasen.yml` – manuell: hittar projektet, väcker det, kör
  `schema.sql`. Hoppar över nyckelhämtning när `supabase.env` finns. **Enda
  workflowen med `SUPABASE_ACCESS_TOKEN`.**
- `bevaka-platsforslag.yml` – var 3:e timme: väntande förslag/kommentarer →
  GitHub-ärenden (mejl till Per). Läser via PostgREST med `SUPABASE_SERVICE_KEY`.
  Markör `<!-- submission:UUID -->` på FÖRSTA raden; användartext saneras i
  `cell()` (# före @); max 20 ärenden per körning; try/catch per rad.
- `hantera-platsforslag.yml` – kommentar `godkänn`/`neka`/`avslå` → PATCH via
  PostgREST med `SUPABASE_SERVICE_KEY` (ord-jämförelse, inte `\b` – trasigt med å/ä/ö).
- `sajtvakt.yml` – var 30:e minut: hämtar tomningskartan.se och seeden; öppnar
  ett ärende (`<!-- sajtvakt -->`) om sajten inte svarar, stänger det när den gör det.
- `verifiera-kallor.yml` – tisdagar 04:20 UTC + manuell: `scripts/verify-sources.mjs`
  hämtar registrets webbadresser från runnern (som har nät) och kontrollerar att
  länkar svarar och att sveparnas citat finns kvar på sidorna; rapport som
  ärende med markör `<!-- kallkontroll -->` (uppdateras). Inga secrets.
- `android.yml` – debug-APK + `starttest` i emulator; skärmdump force-pushas till
  grenen `emulator-skarmdump` (artefakter går inte att hämta från en session).
- Secrets: `SUPABASE_ACCESS_TOKEN` (bara installationen; scoped token, går ut
  ~var 90:e dag – byt på supabase.com/dashboard/account/tokens, Resource access
  Project → Greywater, bara nödvändiga rättigheter, längsta giltighet, uppdatera
  secreten; en Claude-rutin påminner), `SUPABASE_SERVICE_KEY` (projektets
  `sb_secret_…`, går inte ut), `TRV_API_KEY`.
- **Alla actions är låsta till commit-SHA** med versionen som kommentar. Ny
  action: `git ls-remote --tags https://github.com/<ägare>/<repo>` → peeled SHA.
  Dependabot (`.github/dependabot.yml`, måndagar) öppnar max fem PR:er – Per
  mergar dem i webbläsaren en i taget. Håll upload-/download-artifact i samma major.
- **Claude-rutiner** (claude.ai → Rutiner, inte i repot): "Veckosvep
  Tömnmingskartan" (måndagar 05:15 UTC), "Veckorapport – nya/borttagna platser"
  (måndagar), "Månatlig säkerhetsgenomgång Tömningskartan" (1:a i månaden,
  granskar och rapporterar, pushar inget), "Bevaka GitHub-issues" (var 3:e
  timme in i sessionen Gråvatten 5: hanterar nya ärenden/platsförslag och
  kommenterar), tokenpåminnelse. En rutin som ska pusha MÅSTE skapas i claude.ai/code → Rutiner
  → New routine med repot valt; rutiner skapade från en session får inget repo
  och kan inte pusha. Prompter skapade i webbgränssnittet kan inte ändras från en
  session – ge Per texten att klistra in.

## Dataflöde och principer

1. Seed-datan byggs i CI. Sandboxen saknar externnät (Overpass/Nominatim/TRV/
   Supabase/kartleverantörer/de flesta sajter är blockerade). Verifiera efter
   deploy via `git show origin/gh-pages:data/stations-seed.json`; testa
   databasen från en GitHub-runner med ett tillfälligt workflow (ta bort efteråt).
2. **Bara primärkällor med citat** (kommun, anläggningens egen sajt, turistråd,
   Trafikverket, kedjans butikssida). husbilsplats.se, park4night, campingkollen,
   stallplatskartan-boilerplate, Google-omdömen och branschlistor räcker inte →
   `unverified`/`unverifiedServices` (grått) eller `confidence: low`.
3. **Koordinater gissas aldrig.** Exakt `lat`/`lon` från källa; annars `query`
   + `nearLat`/`nearLon` + lågt `maxKm`. Kontrollera läget efter deploy.
4. **Dedupa före skrivning:** samma namn eller inom ~400 m i publicerad seed =
   komplettering, inte ny post. **Pers regel (12 okt 2026): två registerposter
   inom 100 m är samma plats** – slå ihop dem (`check-register.mjs` stoppar
   deployen annars; `distinct: true` bara i undantagsfall, t.ex. golfklubb
   intill camping). OSM-platser rättas med en registerpost ovanpå
   (registret vinner, tjänster unionas); en felaktig OSM-tjänst kräver dessutom
   `EXCLUDED_OSM_ELEMENTS` (hela platsen) eller `OSM_UNVERIFIED_OVERRIDES`
   (enskilda tjänster blir grå) i båda filerna.
5. Pers egen kännedom om en plats väger tyngre än att webbplatsen saknar uppgiften.
   Det han rapporterar skrivs in i `scripts/per-fakta.json` (id → tjänster);
   `check-register.mjs` stoppar deployen om de tjänsterna försvinner eller blir
   grå. Borås GK förlorade så sina tjänster sep 2026 – får inte upprepas.
   **Förlustvakt:** en registerpost som tappar en bekräftad tömning/vatten/gasol
   måste ha en daterad orsak i `description`; en borttagen post måste vara
   sammanslagen (alias till en post som BEHÅLLER tjänsterna) eller stå i
   `scripts/borttagna.json` med orsak (`check-register.mjs`).
6. Agenternas avgifts-/säsongstexter kortas för hand till läsbara uppgifter innan
   de skrivs – de visas i popupen. Resonemang läggs i `description`.
7. Två sessioner får aldrig arbeta mot samma öppna punkt samtidigt.
8. Svep körs systematiskt region för region mot hela listan, aldrig som
   "kända stora namn" – det ger en falsk känsla av heltäckning.

## Verifiering & test

- Bygg: `VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build` (kör `npm ci` först i en ny container).
- Playwright: Chromium på `/opt/pw-browsers/chromium`; testskript i projektmappen
  (`vite preview`), mocka externa hosts med `ctx.route`, sätt `localStorage
  tomningskartan.introSeen=1`, mobil 390×760 med CDP-touch för svep. **Radera
  testskript före commit.** Den publicerade byggversionen testas med
  `git archive origin/gh-pages`.
- Schemat testas lokalt med PGlite (`npm i @electric-sql/pglite` i scratchpad,
  kör schema.sql minus storage-satserna, `set role anon`, `set_config('request.headers', …)`).
- Deploy-kvitto: `git ls-remote origin gh-pages` byter hash OCH `pages-build-
  deployment` (workflow 317009082) lyckas. Kontrollera ALLTID efter push att en
  körning finns för din SHA; starta annars `workflow_dispatch` (deploy/android/
  sync-data). `concurrency: pages` avbryter pågående deploy vid ny push – pusha
  dokumentation med `[skip ci]`.
- Versionsraden i menyn ("Version <byggtid>") är kvittot på att telefonen kör senaste versionen.
- Webbplatser mäts aldrig härifrån: ett blankt kartområde hos Per betyder att
  tile-leverantören inte svarade, inte att appen är trasig – testa byggversionen.

## Granskning före push (Per kan inte granska kod – sessionen är granskaren)

Johans säkerhetsgenomgång 11 okt 2026 hittade fyra brister som funnits sedan
augusti (öppen foto-URL, för bred token, moderering som kunde stoppas, inget
spamskydd) plus en trasig installation och en uppsvälld CLAUDE.md. Alla hade
fångats av punkterna nedan. Gå igenom dem före varje push som rör något av
`supabase/`, `.github/workflows/`, formulären eller `src/lib/*.ts` som anropar
Supabase – och kör `/security-review` på diffen.

1. **Allt användaren kan skicka in** (fält, filer, URL:er) valideras i
   databasen, inte bara i appen: tillåtna värden, längd, mängd per tid.
   Anon-nyckeln är publik – allt som appen kan göra kan vem som helst göra.
2. **Varje hemlighet:** vilka jobb använder den, vad kan den göra, är det det
   minsta som behövs? Efter byte/rotation körs VARJE jobb som använder den.
3. **Varje ny konfiguration** (workflow, Dependabot, etikett, policy) verifieras
   med en riktig körning, inte bara genom att den ser rätt ut.
4. **Testa fientligt, inte bara glatt:** vad händer med 300 tecken, 1 000
   inskick, en främmande URL, ett `@användarnamn` i texten, en leverantör som
   inte svarar?
5. **Dokumentation:** regel i CLAUDE.md, läge i `docs/STATUS.md`, logg i
   `docs/svep-logg.md`. Aldrig tvärtom.

## Commit-regler

Svenska commit-meddelanden. Avsluta alltid med:
```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AMD92fRRy7TUSsKmSB1TFY
```
(byt sessionslänken till aktuell session). Aldrig modell-ID i kod/commits.
`git pull --rebase` före push. Inga PR utan uttrycklig begäran. Uppdatera
`docs/STATUS.md` (skriv över) vid överlämning och `docs/svep-logg.md` vid svep.

## Bestående lärdomar (regel + varför)

- **Registrets `id` är permanent** (fryst 12 okt 2026). Det byggdes tidigare av
  listpositionen, så varje borttagen post flyttade id:t för alla senare och
  foton/betyg/bekräftelser/favoriter hamnade fel. Ändra aldrig ett id; vid
  sammanslagning behålls den kvarvarande postens id. Nya poster utan id får
  `curated-<namn>` (`scripts/assign-ids.mjs`). Gamla id översätts via
  `public/data/id-aliases.json` (`scripts/build-id-aliases.mjs`, `src/lib/idAliases.ts`).

- Speglade listor i `sync-stations.mjs` och `overpass.ts` ändras alltid i båda,
  annars visar live-hämtningen något annat än seeden. `check-mirrors.mjs` i
  deployen fångar missen; kör den lokalt före push.
- Uppladdade foton får bara ha egen bucket-URL; längdgränser och spamskydd ligger
  i databasen – frontend-kontroller går att kringgå med anon-nyckeln.
- OSM-taggen `fuel:lpg=yes` betyder fordonsgas, inte flaskbyte/-påfyllning; bara
  `shop=gas` eller en verifierad override ger gasol. Bara 10/11 kg-flaskor räknas.
- Jula och Biltema säljer ingen 10/11 kg-gasol; Byggmax/Granngården/Rusta/ÖoB
  "varierar per butik" – lägg aldrig in kedjevis utan butiksbekräftelse.
- Golfklubbar = ställplats med el; tömning finns hos en handfull, vatten hos
  kanske en tredjedel – lägg aldrig till utan citat.
- Kandidatimportens ortsgissning (median av platser med kommunnamnet) är
  opålitlig – ta alltid källans egen koordinat.
- Region Gotland och Orust tar inte emot husbilslatrin; Gotlands vattenkiosker
  kräver nyckel – läggs inte in.
- En tom WebSearch-kvot (600/session, delad med agenter) ger kvotfel mitt i –
  ge varje agent en fast budget och be den sluta snyggt.
- `touch-action: none` på handtaget dödar klick i Chromium; React registrerar
  touchmove passivt – native lyssnare med `passive:false` behövs för preventDefault.
- Leaflets `circleMarker` skalas under flyTo – använd `divIcon` för "du är här".
- Tile-lyssnare (`tileloadstart`) måste sättas före `addTo`, annars missas de
  synkrona första händelserna.
- Supabases Management API kräver kontotoken; den avgränsade tokenen får inte
  läsa API-nycklar (403) – därför hoppar installationen över det steget.
- Anon-rollen ser besökarens IP via `request.headers` (`cf-connecting-ip`), vilket
  gör IP-spärrar i Postgres möjliga utan captcha.
- Tar man bort eller slår ihop en registerpost måste `public/data/id-aliases.json`
  pekas om till posten som tog över (annars hamnar favoriter/betyg/foton i
  tomma intet) – `check-register.mjs` stoppar deployen om ett alias pekar fel.
- CSP:n (meta-tagg, bara i produktionsbygget) blockerar tyst varje ny extern
  tjänst: lägg värden i `CSP_HOSTS` i `vite.config.ts` (`check-csp.mjs` vaktar).
- De speglade OSM-listorna får bara innehålla literaler – `check-mirrors.mjs`
  tolkar dem som riktiga värden och stoppar på variabler.
- IP-spärren använder BARA `cf-connecting-ip` (x-forwarded-for kan förfalskas)
  och räknar IPv6 per /64 via `inet` – strängdelning vid `:` gick att kringgå.
- Delade länkar (`?at=`) och sparat kartläge valideras i `src/lib/view.ts` –
  en trasig länk kraschade förut hela appen.
- **Varje ny taggregel i synken kontrolleras mot en riktig synk** (jämför
  borttagna/ändrade platser mot förra seeden). `access=customers` tog 12 okt
  bort ~200 riktiga campingtömningar och ÅVC – på campingar betyder det gäster.
  `check-seed-diff.mjs` stoppar nu synken vid >25 försvunna tömning/vatten/
  gasol; avsiktliga ändringar godkänns med `tillat_bortfall` vid manuell körning.
- Service workern måste cacha JS/CSS vid installation och låta föregående
  versions filer följa med – annars blir appen tom offline efter en uppdatering.
- Gasolbutiker med olika namn är olika platser även i samma byggnad (`distinct`
  i registret); Trafikverkets rastplatser tar bara kassett (inget gråvatten
  utan uttrycklig OSM-tagg).
- Bekräftelser och betyg: en per avsändare, plats och dygn i databasen; appen
  läser sammanställningsvyerna `verification_summary`/`review_summary`.
- **Agenter som ändrar filer:** ge varje agent egna filer, kör ALDRIG `git pull
  --autostash`/`git stash` medan en agent har ocommittade ändringar (12 okt
  hamnade en agents arbete i en stash mitt i), och committa bara egna filer
  (`git add <filer>`). Stoppa servrar med `kill <pid>` – `pkill -f` matchar
  det egna skalet och dödar kommandot.
- När Overpass inte svarar återanvänder synken förra veckans OSM-data
  (`sources.osm.fresh=false`) – en tolkningsrättning syns först vid en synk
  där Overpass svarar. Kontrollera `sources` i seeden efter synken. Samma
  reserv används när ingen spegel ger ≥ 97 % av förra antalet (ofullständigt
  svar, 13 okt 2026) – utom när OSM-datan redan återanvänts i över 7 dagar.
