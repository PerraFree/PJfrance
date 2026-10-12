# Läget just nu

Skrivs ÖVER vid varje överlämning (lägg inte äldre lägesbilder på hög – historik
finns i git-loggen, `docs/svep-logg.md` och `docs/HISTORIK.md`).

**Uppdaterad:** 2026-10-12, session "Gråvatten 5" (sessionslänk i senaste commit).

Senaste händelse (12 okt): sex regioner i område D körda på en dag (248
platser, 102 rättade), 27 registerdubbletter sammanslagna, synkens reservväg
filtrerar nu OSM-undantag, ny CI-kontroll `check-mirrors.mjs` i deployen, ny
rutin som bevakar GitHub-issues var 3:e timme. Veckorutinens C-körning pushade
till en sidogren (rutinens session var låst till den) – slogs ihop manuellt;
om det händer igen: `git fetch origin <gren>` + `git merge --no-ff` + verifiera seeden.

## Status

- **Live:** ~6 640 platser (OSM ~4 620, Trafikverket 318, registret 1 683 poster
  varav ~330 grå/obekräftade). Alla deployer gröna, inget ligger ocommittat.
- **Säkerhet:** Johans säkerhetsrådgivning GHSA-72p3-7774-p8h3 (4 fynd) är
  åtgärdad och verifierad mot den levande databasen 11 okt. Per har svarat Johan.
  `SUPABASE_SERVICE_KEY` finns som secret; kontotoken används bara av installationen.
- **Beroenden:** Dependabots första omgång (#16–#20) mergad; actions SHA-låsta.
- **Datasvep:** golfsvep, discovery varv 1 + 2 och restlistor är klara
  riksomfattande. Område D (kontroll av befintliga platser) körd 11 okt för
  Västra Götaland (40 platser), 12 okt för Skåne (36) och 12 okt för Stockholm/
  Uppsala/Södermanland (39: Åkersberga GK −tömning, Båsenberga-dubbletten isär,
  Saltsjö-Duvnäs båtstation utesluten) och Halland + Kalmar län (46: Stenhamra
  Västervik var en vanlig parkering, fyra f.d. First Camp-poster rättade, Bua
  hamn +gråvatten), Jönköping/Kronoberg (38: Askelövsgatan Växjö och
  Norraryd grå, Kyrkekvarn/Hok +tömning) och Östergötland/Örebro/Västmanland
  (49: Vadstena GK −tömning, Hällefors grå, Uskavi/Inre hamnen +tjänster).
  Område C kört av rutinen 12 okt.
  Webben är i stort sett uttömd för nya platser – nästa metod är crowdsourcing.
- **UI senast:** bottenarket följer fingret vid drag, strecket = bara kartan/
  tillbaka, baskartan byter till OSM om leverantören tiger. sw.js v86.
- **Registerhygien:** 23 dubblettpar (samma plats inom 60 m, grå kopia eller
  gammal query-post ovanpå exakt post) sammanslagna 12 okt; kvar att se över:
  Stjärnfors GK/Kaffestuga, Luleå Norra hamnen/Husvagnscenter (samma geokod),
  Varbergs GK Östra/Västra (samma geokod).
- **Synk:** när Overpass är nere återanvänds förra seedens OSM-stationer, numera
  filtrerade mot `EXCLUDED_OSM_ELEMENTS` (fix 12 okt, commit b921393).

## Öppna punkter (GitHub-issues med etiketten `backlog`)

Se https://github.com/PerraFree/PJfrance/issues?q=is%3Aopen+label%3Abacklog
– prioritet via `prio-1`/`prio-2`/`prio-3`:

1. #24 Crowdsourcing-lansering (prio-1). #25 Område D nästa regioner: Skåne,
   Stockholms län (prio-1).
2. #26 Område C: grå platser. #27 Område E: öppettider/säsong. #28 Restlista
   som kräver webbläsare (prio-2).
3. #29 Gasolluckor. #30 Tekniska tillval/underhåll. #31 SEO/spridning (prio-3).

## Väntar på Per

- Lanseringstexterna för crowdsourcing (#24) ligger i `docs/LANSERING.md`:
  forum, Facebook, redaktionstips, brev till anläggningar, QR-dekal. Per lägger
  ut; bevakningen mejlar var 3:e timme.
- Dependabot-PR:er mergas i webbläsaren när de kommer (måndagar).
- Rutinen "Veckosvep Tömnmingskartan" (skapad i webbgränssnittet) hänvisar till
  CLAUDE.md för metoderna, som nu ligger i `docs/svep-logg.md`/`docs/HISTORIK.md`
  – ny prompt levererad i chatten 11 okt att klistra in i claude.ai → Rutiner.
  "Veckorapport" och tokenpåminnelsen är återskapade kopplade till sessionen
  "Gråvatten 5"; de gamla kopiorna (pekade på arkiverade "Gråvatten 4") är
  pausade och kan raderas.
- Ny rutin 12 okt: "Bevaka GitHub-issues Tömningskartan" (trig_01JGzLszwk5ktSPNELVCg9ng,
  var 3:e timme kl :10 UTC in i Gråvatten 5): läser nya/ändrade ärenden,
  verifierar platsförslag mot primärkälla, kommenterar `godkänn`/`neka`,
  åtgärdar buggar, kommenterar alltid. Första körning 12 okt 09:10 UTC –
  kontrollera att den får GitHub-verktygen.
- Supabase-token byts före ~6 dec 2026 (rutinen påminner 27 nov).
- Ny rutin 11 okt: "Månatlig säkerhetsgenomgång Tömningskartan" (1:a i månaden
  07:27 svensk tid, rapport via push/mejl, pushar inget) – första körning 1 nov.

## Nästa steg (förslag)

Område D i Värmland/Dalarna/Gävleborg (samma metod: urvalsskript `valj.mjs` i
scratchpad – välj platser med egen webbplats, max 3 per kommun, hoppa över
"Kontroll okt 2026"; `UPPDRAG-kontroll.md` + `apply-kontroll.mjs`; korta
agenternas texter för hand), sedan Norrland, sedan område E (säsonger). Per vill inte bli tillfrågad – sessionen väljer själv enligt
prio-etiketterna och kör.
