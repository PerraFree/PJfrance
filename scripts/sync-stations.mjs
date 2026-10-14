#!/usr/bin/env node
/**
 * Hämtar hela Sveriges tömnings- och vattenstationer och skriver
 * public/data/stations-seed.json som appen läser vid start.
 *
 * Källor:
 *  - OpenStreetMap via Overpass (hela Sverige, exkl. dricksvattenkranar
 *    som skulle göra filen onödigt stor – de hämtas live per kartvy)
 *  - Trafikverkets Parking-API om miljövariabeln TRV_API_KEY är satt
 *  - Kurerat register i scripts/curated-places.json: kommunala platser,
 *    privata campingar, golfklubbar med ställplats m.m. som saknas eller är
 *    fel-taggade i OSM. Adressen (query) geokodas via Nominatim här i CI, eller
 *    ange lat/lon direkt. Rika fält (facilities, capacity, payment, website …)
 *    tas med om de anges. Lägg till nya platser genom att fylla på JSON-filen.
 *
 * Körs i CI före `vite build` (se .github/workflows/deploy.yml) och kan
 * köras lokalt: `node scripts/sync-stations.mjs`.
 *
 * OBS: tolkningslogiken speglar src/lib/overpass.ts och src/lib/trafikverket.ts.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises'

const OUT = new URL('../public/data/stations-seed.json', import.meta.url)
const CURATED = new URL('./curated-places.json', import.meta.url)

// OSM-element som bekräftats felaktiga/dubbletter av Per (fältkoll) men som
// vi inte kan rätta i själva OpenStreetMap härifrån. Format: "<type>/<id>".
// Ta bort raden här OM/när OSM-datan rättas uppströms.
const EXCLUDED_OSM_ELEMENTS = new Set([
  // Husbilsparkering i Kiviks hamn – Simrishamns kommuns taxa: "saknas ställplatser i
  // hamnområdet" (D-varv 2, 13 okt 2026). Latrintömningen ligger kvar i registret.
  'way/1290201470',
  // "Tömningsstation" (namnlös nod) ~106 m från Borås Camping Saltemad –
  // Per bekräftade aug 2026 att det bara finns EN tömning där (campingens
  // egen), inte två. https://www.openstreetmap.org/node/12907898116
  'node/12907898116',
  // Ställplats Fengersfors (Knarrbysjön): OSM-wayen är taggad med gråvatten- och
  // latrintömning, men ställplatsens egen sida (fengersfors.se/fengersfors-stallplats)
  // och Västsverige säger uttryckligen att man INTE kan tömma vare sig gråvatten
  // eller latrin där – bara färskvatten. Registerposten täcker platsen (okt 2026).
  'way/708866226',
  // Gasol-utredning sep 2026 (research-verifierat, se CLAUDE.md):
  // "E.ON Nobelv." – Industrigatan 5/Nobelvägen 66, Malmö. Adressen tillhör
  // E.ON:s huvudkontor/distributionsbolag, inte en publik gasolplats – ingen
  // källa nämner den som ett ställe att köpa/fylla gasol.
  // https://www.openstreetmap.org/node/253856437
  'node/253856437',
  // "FordonsGas Varberg" – fel bränsletyp helt: CNG/biogas (fordonsgas),
  // inte gasol/LPG. Inkompatibla system, kan inte användas av husbil/husvagn.
  // https://www.openstreetmap.org/node/1329458220
  'node/1329458220',
  // "Härnösand Fordonsgas CNG" – samma fel: HEMABs CNG/biogas-station, inte
  // gasol/LPG. https://www.openstreetmap.org/way/622172659
  'way/622172659',
  // Kullabergs tältplats (Höganäs): naturreservatet förbjuder övernattning i husbil/husvagn (nattparkeringsförbud 22–06), 8 tältplatser för vandrare, ingen tömning/vatten – ingen husbilsplats (kontroll okt 2026, kullabergsnatur.se/hoganas.se).
  'way/1052749987',
  // First Camp Torekov: OSM-polygonen ligger ~450 m från registerposten (curated-317) och visades som en andra plats utan tömning – registerposten täcker campingen (kontroll okt 2026).
  'way/494506962',
  // Samma camping, andra OSM-polygonen (kontroll okt 2026).
  'way/494506963',
  'way/324897315', // Saltsjö-Duvnäs Marina – sugtömning för fritidsbåtar, inte husbil (Nacka kommun, okt 2026)
  'node/8972631914', // Septiktömningsstation Härnösands marina – sugtömning för fritidsbåtar, inte husbil (harnosand.se, okt 2026)
])

// Gasol-utredning sep 2026: fuel:lpg=yes/service:vehicle:lpg=yes särskiljer
// INTE tillförlitligt "fyller lös flaska" (gasol_pafyllning) från ren
// bilautogas eller flaskbyte – research-verifierat per plats (se CLAUDE.md).
// Format: "<type>/<id>" → extra facilities-nycklar att lägga till. Speglar
// src/lib/overpass.ts – ändra ALLTID båda.
const OSM_FACILITY_OVERRIDES = new Map([
  // Bekräftat: fyller lös/halvfull flaska (citat + källa i CLAUDE.md)
  ['node/833279910', ['gasol_pafyllning']], // LPG Flygstadens Gasol (Gasolstationen, Halmstad)
  ['node/1376582241', ['gasol_pafyllning']], // Aniol Gasol AB
  ['node/1376625607', ['gasol_pafyllning']], // Gasol Depån i Svartvik
  ['node/1376659170', ['gasol_pafyllning', 'gasol_byte']], // Gasolfyllarna (Norrköping) – även 24/7-automat för byte (husbilskompisar.se)
  ['node/1376663049', ['gasol_pafyllning']], // Timmernabbens Karamellfabrik
  ['node/1376738365', ['gasol_pafyllning']], // Ahus Gas Ahus (GasolEsset)
  ['node/1784412478', ['gasol_pafyllning']], // Nöbbelövs Gasol & Entreprenad
  ['node/8746539042', ['gasol_pafyllning']], // GasolEsset Ljungby
  ['node/9275773995', ['gasol_pafyllning']], // Kem och Gas AB (Jönköping)
  ['node/9792176594', ['gasol_pafyllning']], // Örkelljunga Gasol (GasolEsset)
  // Bekräftat: rent bytessystem (citat + källa i CLAUDE.md)
  ['node/247135141', ['gasol_byte']], // Preem, Västra Frölunda
  ['way/821117027', ['gasol_byte']], // OKQ8, Västra Frölunda
  ['node/12258765678', ['gasol_byte']], // OKQ8, Stockholm
  ['way/222140864', ['gasol_byte']], // Circle K Bandhagen Högdalen
])

// Öppettider/säsong-svep sep 2026: OSM saknar opening_hours/seasonal-tagg för
// dessa, men research hittade ett konkret citat från kommunen/anläggningens
// egen sida (se docs/svep-logg.md). Format: "<type>/<id>" → { season,
// openingHours }. Fyller bara i det OSM SAKNAR – går aldrig före en riktig
// opening_hours/seasonal-tagg. Speglar src/lib/overpass.ts – ändra ALLTID båda.
const OSM_SEASON_OVERRIDES = new Map([
  ['way/1176936971', { season: 'seasonal', openingHours: '70 platser bokningsbara 15 maj–september; 10 platser bokningsbara året runt' }], // Småbåtshamnen i Limhamn AB – smabatshamnen.se
  ['way/296910983', { season: 'seasonal', openingHours: '28 mars–11 oktober (säsong 2026)' }], // Kiviks Familjecamping – kivikscamping.se
  ['way/127555305', { season: 'year-round', openingHours: 'Öppet året runt, begränsad service under lågsäsong' }], // Rigeleje Strand Camping – rigelejestrand.se
  ['node/10947329170', { season: 'year-round', openingHours: 'Öppen året runt' }], // Ställplats Nogersunds Hamn – nogersundshamn.se
  ['way/1043407790', { season: 'seasonal', openingHours: '1 april–30 september' }], // Tredenborgs camping – tredenborg.com
  ['node/12925322676', { season: 'year-round', openingHours: 'Öppet året runt (175 kr maj–september, 100 kr oktober–april)' }], // Sandhamn Ställplatser och Stugor – gasthamn.sandhamnmarine.se
  ['way/25687352', { season: 'year-round', openingHours: 'Öppet året runt; försäsong 1 april–13 juni, eftersäsong 22 augusti–12 oktober 2026' }], // Dragsö Camping – dragso.se
  ['way/77662837', { season: 'year-round', openingHours: 'Öppet året runt; fullservice midsommar–slutet av augusti (reception 08.00–21.00)' }], // Långasjönäs Camping och Stugby – langasjonas.com
  ['way/1463934565', { season: 'year-round', openingHours: 'Tillgänglig dygnet runt, året runt' }], // Persköps ställplats – perskopsstallplats.com
  ['way/205130559', { season: 'seasonal', openingHours: '1 maj–4 oktober (säsong 2026)' }], // Getnö Gård Lake Åsnen Resort – getnogard.se
  ['way/36742514', { season: 'seasonal', openingHours: 'Stängt 30 november–27 mars' }], // Evedals Camping – evedalscamping.com
  ['way/625832150', { season: 'seasonal', openingHours: 'April–oktober' }], // Rödlix Vandrarhem & Camping – rodlixvandrarhem.se
  ['way/702212347', { season: 'seasonal', openingHours: '29 april–30 september' }], // Espeviks Camping – espevikscamping.se
  ['node/850174475', { season: 'seasonal', openingHours: '8 maj–6 september 2026' }], // Bödagårdens Camping – bodagarden.nu
  ['node/6462134771', { season: 'seasonal', openingHours: 'Servicehus med gråvatten/latrintömning stängt mitten av oktober till mitten av mars; sommar dagligen 9-19' }], // Gästhamn Blankaholm – blankaholm.com
  ['node/431824851', { season: 'year-round', openingHours: 'Anläggningen öppen året runt; reception bemannad sommarsäsong, t.ex. 15 juni–23 augusti dagligen 8.30–18' }], // Lövhults Camping – nassjo.se
  ['way/114345736', { season: 'seasonal', openingHours: '24 maj–9 september' }], // Lovsjöbadens Camping – lovsjocamping.se
  ['way/1163078106', { season: 'seasonal', openingHours: '1 maj–30 september' }], // Strandskogens camping – sudersand.se
  ['relation/17689924', { season: 'seasonal', openingHours: '1 april–11 oktober' }], // Stocken Camping – stockencamping.se
  ['node/431825468', { season: 'seasonal', openingHours: '1 april–31 oktober' }], // Grästorps camping – grastorp.se
  ['way/39672366', { season: 'year-round', openingHours: 'Året runt' }], // KronoCamping Lidköping – kronocamping.com
  ['way/233909831', { season: 'seasonal', openingHours: '1 april–2 november' }], // Åråshults Camping & Stugby – arashultscamping.com
  ['node/2382863123', { season: 'seasonal', openingHours: '29 maj–21 juni 2026: mån-fre 11-19, lör-sön 10-18 (sommarsäsong, fortsätter med egna tider t.o.m. augusti)' }], // Sannabadet – sannabadet.se
  ['way/89615997', { season: 'seasonal', openingHours: '8 maj–27 september' }], // Bredäng Camping Stockholm – bredangcamping.se
  ['way/363803188', { season: 'seasonal', openingHours: 'Sommarsäsong 1 maj–30 september; vintersäsong 1 oktober–30 april (kontakt via telefon/mejl)' }], // Treens Natur & Fiskecamp – treenscamping.se
  ['relation/16027523', { season: 'seasonal', openingHours: '1 april–30 september (säsong 2026)' }], // Rullsands Havsbad och Camping – rullsand.se
  ['way/1449952833', { season: 'seasonal', openingHours: '1 maj–18 oktober' }], // Ljusdals hembygdsgård – ljusdalshembygdsforening.se
  ['way/1471697019', { season: 'year-round', openingHours: 'Öppen året om' }], // Sjöstugan – sjostugan.nu
  ['relation/21255848', { season: 'year-round', openingHours: 'Öppen året om' }], // Sjöstugan (Idre) – OSM ritade om platsen till en relation sep 2026, samma anläggning som way/1471697019
  ['way/303518816', { season: 'seasonal', openingHours: 'Campingen öppnar 7 maj 2026 (vandrarhemmet 1 april 2026)' }], // Vivstavarvstjärns Camping – vivstavarvscamping.se
  ['way/1450685675', { season: 'seasonal', openingHours: 'April–oktober' }], // Bräcke Strand Ställplats – brackestrand.se
  ['node/270492517', { season: 'seasonal', openingHours: 'Sommarsäsongen 2026 öppnar 23 maj' }], // Galå Fjällgård – gala-fjallgard.com
  ['way/1288977153', { season: 'seasonal', openingHours: '1 maj–30 september' }], // Ställplats Storsjöstrand – stellpy.se
  ['way/251360292', { season: 'year-round', openingHours: 'Öppet året runt' }], // Trehörningsjö Camping och Stugby – trehorningsjocamping.se
  ['way/205116215', { season: 'seasonal', openingHours: 'Ca 1 maj–slutet av september (2026: 3 maj–27 sep)' }], // Torne Camping – tornecamping.com (okt 2026)
  ['way/249858830', { season: 'seasonal', openingHours: '1 maj–30 september' }], // Mycklaflons Camping – mycklaflonscamping.com (okt 2026)
  ['node/431825150', { season: 'seasonal', openingHours: 'Ca 17 april–14 september (prislista 2025)' }], // Kristianopel Resort – kristianopelresort.se (okt 2026)
  ['way/1450714174', { season: 'seasonal', openingHours: '1 maj–30 september' }], // Ställplats Trångsviken – trangsviken.se (okt 2026)
  ['way/411671208', { season: 'seasonal', openingHours: '30 april–25 oktober (2026)' }], // Bolmens Camping – bolmen.com (okt 2026)
  ['way/566162722', { season: 'year-round', openingHours: 'Året runt (reception 09–17)' }], // Stocka Gästhamn – stockahamn.se (okt 2026)
  ['way/164031028', { season: 'year-round', openingHours: 'Året runt (reception lågsäsong mån–fre 09.30–16)' }], // Barken Lodge Camping – barkenlodge.se (okt 2026)
  ['node/431824740', { season: 'seasonal', openingHours: 'Maj–augusti (från 24 april och efter 1 sep: ring)' }], // Källbuktens Camping – sanktanna.se (okt 2026)
  ['relation/10258310', { season: 'seasonal', openingHours: '1 maj–mitten av september' }], // Skotteksgården – skottek.se (okt 2026)
  ['node/864717954', { season: 'seasonal', openingHours: '1 maj–20 sep (2026, receptionens säsong)' }], // Alcatraz – alcatraz.se (okt 2026)
  ['relation/11368088', { season: 'seasonal', openingHours: '2 april–14 september' }], // Nossebrobadets Camping – essunga.se (okt 2026)
  ['node/12916785295', { season: 'seasonal', openingHours: 'Sommaröppet ca 13 juni–9 augusti (2026)' }], // Ställplats Dellenbaden – dellenbaden.se (okt 2026)
  ['way/298812703', { season: 'year-round', openingHours: 'Året runt (reception vardagar 8–17 i lågsäsong)' }], // First Camp Skutberget-Karlstad – firstcamp.se (okt 2026)
  ['way/1293516364', { season: 'seasonal', openingHours: 'Vår, sommar och höst (inga datum angivna)' }], // Färila IF Camping – farilaif.se (okt 2026)
  ['way/834630956', { season: 'seasonal', openingHours: '29 maj–30 augusti (2026)' }], // Skeppsmyra Naturistcamping – naturism.se (okt 2026)
  ['way/1489575531', { season: 'seasonal', openingHours: '15 maj–30 september (2026)' }], // Norrmjöle Campingplats – norrmjole.com (okt 2026)
  ['way/125554618', { season: 'year-round', openingHours: 'Året runt (incheckning alla dagar)' }], // Lysingsbadet Västervik Resort – vastervikresort.se (okt 2026)
  ['way/92436534', { season: 'year-round', openingHours: 'Året runt; latrintömning bara april–september' }], // First Camp Lugnet Falun – firstcamp.se (okt 2026)
  ['way/437382779', { season: 'year-round', openingHours: 'Året runt (reception obemannad helger 21 sep–31 dec)' }], // Firstcamp Mölle – Höganäs – firstcamp.se (okt 2026)
  ['node/4340310123', { season: 'year-round', openingHours: 'Året runt; ingen el för husbil 15 nov–15 apr' }], // Camp Alta – campalta.se (okt 2026)
  ['way/324292724', { season: 'seasonal', openingHours: 'Ca 29 mars–31 okt (2026: stängt 3–18 okt); stängt 1 nov–1 mars' }], // Askeviksbadets Camping-Stugby – askevik.nu (okt 2026)
  ['way/233870113', { season: 'seasonal', openingHours: 'Början av april–30 september' }], // MOMOS Camping Orrefors – momos-camping-orrefors.com (okt 2026)
  ['node/3684658324', { season: 'seasonal', openingHours: '8 maj–27 sep (bemannat 18 juni–14 aug)' }], // Vikarbygården – vikarbygarden.se (okt 2026)
  ['way/296746219', { season: 'year-round', openingHours: 'Året runt (reception 9–17 okt–april)' }], // Fyrishov Stugby & Camping – fyrishov.se (okt 2026)
  ['node/8952173271', { season: 'seasonal', openingHours: '1 maj–30 september' }], // Stenshult Mellangård – stenshultmellangard.se (okt 2026)
  ['way/365339926', { season: 'year-round', openingHours: 'Året runt (begränsad service vintertid)' }], // Gustavsvik – gustavsvik.se (okt 2026)
  ['node/2979933748', { season: 'seasonal', openingHours: 'Campingen 1 maj–30 sep' }], // Camping vid Björkhaga Camping – bjorkhagastrandby.se (okt 2026)
  ['way/606501855', { season: 'year-round', openingHours: 'Året runt' }], // Kedumsvik ställplats – kedumsvik.se (okt 2026)
  ['way/436480247', { season: 'seasonal', openingHours: 'Öppnar 1 maj (slutdatum ej angivet)' }], // Dalbergså Camping och Gästhamn – dalbergsa.se (okt 2026)
  ['way/1272467807', { season: 'seasonal', openingHours: 'Latrintömning och vatten bara sommartid (inga datum)' }], // Raggsocka Logi – raggsockalogi.se (okt 2026)
  ['way/514456694', { season: 'seasonal', openingHours: '2026: 8 maj–15 aug; 2027: 30 apr–13 jun och 17 jul–8 aug' }], // Färnebofjärdens camping – schwedenpause.se (okt 2026)
  ['relation/5185724', { season: 'year-round', openingHours: 'Året runt' }], // City – Stockholm – firstcamp.se (okt 2026)
  ['node/459495015', { season: 'seasonal', openingHours: 'Vecka 17–37' }], // Dångeboortens samhällsförening – dangeboortenssamhallsforening.se (okt 2026)
  ['node/431824890', { season: 'seasonal', openingHours: '1 april–slutet av oktober (stugor året runt)' }], // Hoks Naturcamping – osterskog.se (okt 2026)
  ['way/99409175', { season: 'year-round', openingHours: 'Året runt; höst/vinter bara 8 elplatser' }], // Frösö Camping – firstcamp.se (okt 2026)
  ['way/516709257', { season: 'year-round', openingHours: 'Efter överenskommelse hela året; reception 17/6–18/8 kl 10–16' }], // Wetlandi – wetlandi.se (okt 2026)
  ['relation/11168707', { season: 'year-round', openingHours: 'Året runt (vintertid bemannat vardagar 08–17)' }], // Stensö Camping – firstcamp.se (okt 2026)
  ['node/431825761', { season: 'year-round', openingHours: 'Året runt; reception bemannad maj–september' }], // Uskavi Camping – uskavi.se (okt 2026)
  ['node/3649123872', { season: 'seasonal', openingHours: 'Stängd 2026; öppnar till påsk 2027' }], // Kaffetorpet Camping – kaffetorpetscamping.com (okt 2026)
  ['way/83560181', { season: 'seasonal', openingHours: '2 april–20 september (2026)' }], // Borrby strands camping – borrbystrandscamping.com (okt 2026)
  ['node/5196233941', { season: 'seasonal', openingHours: '1 maj–30 september' }], // Camping Nybostrand – nybostrand.se (okt 2026)
  ['way/54202019', { season: 'seasonal', openingHours: '6 mars–30 november (stugor året runt)' }], // Falsterbo Camping & Resort – falsterboresort.se (okt 2026)
  ['way/117503981', { season: 'year-round', openingHours: 'Grusplatser året runt; gräsplatser juni–september' }], // Storforsen camping – storforsen.se (okt 2026)
  ['way/298802293', { season: 'year-round', openingHours: 'Året runt, dygnet runt (reception lågsäsong lör–sön 10–12)' }], // Gröne Backe Camping – gbcamp.nu (okt 2026)
  ['way/1319802648', { season: 'year-round', openingHours: 'Året runt (reception vardagar 08–17 under höst/vinter)' }], // First Camp Mörudden – firstcamp.se (okt 2026)
  ['relation/10885369', { season: 'seasonal', openingHours: '1 maj–27 september (2026)' }], // Stenkällegårdens Camping Tiveden – stenkallegarden.se (okt 2026)
  ['way/363449504', { season: 'year-round', openingHours: 'Året runt (receptionen har begränsade tider vintertid)' }], // Kristinehamn Herrgårdscamping & Stugor – herrgardsliv.se (okt 2026)
  ['way/138265403', { season: 'year-round', openingHours: 'Året runt (21 sep–31 dec reception vardagar 08–17)' }], // First Camp Glyttinge – firstcamp.se (okt 2026)
  ['node/431824954', { season: 'seasonal', openingHours: '10 april–18 oktober (2026)' }], // Stenåsa Stugor & Camping – stenasa.com (okt 2026)
  ['way/1551408635', { season: 'year-round', openingHours: 'Året runt (ställplatser för husbil)' }], // Utby Sörgård – xn--utby-srgrd-85a5r.se (okt 2026)
])

// Gör angivna OSM-tjänster obekräftade (grå) på platser där anläggningens
// egen sajt eller kommunen inte nämner tjänsten (område D-kontroller). OSM-
// taggen kan vara riktig – därför grått, inte borttaget. Blir alla tjänster
// grå markeras hela platsen som obekräftad. Speglas i src/lib/overpass.ts – ändra ALLTID
// båda (check-mirrors.mjs stoppar deployen annars).
const OSM_UNVERIFIED_OVERRIDES = new Map([
  ['way/270924720', ['gravatten']], // Marina Dals Långed – Mustadfors källa (vastsverige.com) nämner bara kemtoalett, inte gråvatten (granskning 14 okt 2026)
  ['way/1290118511', ['vatten']], // Kulturhuset Öster Sallerup (Hörby) – ingen källa för vatten (kontroll okt 2026)
  ['way/294060302', ['gravatten', 'latrin', 'vatten']], // Immelns Camping – egen sajt tyst om tömning/vatten (kontroll okt 2026)
  ['node/12879399396', ['gravatten', 'latrin', 'vatten']], // Hälldala Ranch – egen sajt tyst (kontroll okt 2026)
  ['way/244261940', ['vatten']], // Solhejdans Naturistcamping – ingen källa (kontroll okt 2026)
  ['node/2543291323', ['vatten']], // Lådna tältplats – vatten ej belagt på platsen (bilfri ö) (kontroll okt 2026)
  ['way/1416109141', ['vatten']], // Norra tältplatsen Finnhamn – ej belagt (bilfri ö) (kontroll okt 2026)
  ['way/1416109773', ['vatten']], // Södra tältplatsen Finnhamn – ej belagt (bilfri ö) (kontroll okt 2026)
  ['way/694128677', ['vatten']], // Landsorts tältplats – ej belagt (bilfri ö) (kontroll okt 2026)
  ['way/92557500', ['gravatten', 'latrin']], // Klubbensborgs camping – egen sajt nämner ingen tömning (kontroll okt 2026)
  ['way/640649831', ['gravatten', 'latrin']], // Rörviks Camping Onsala – egen sajt nämner ingen tömning (kontroll okt 2026)
  ['way/120416495', ['gravatten', 'latrin', 'vatten']], // Havslätts Camping – egen sajt tyst (kontroll okt 2026)
  ['way/511217086', ['gravatten', 'latrin', 'vatten']], // Långsjön Camping – bara covid-notis 2020 (kontroll okt 2026)
  ['way/147163010', ['gravatten', 'latrin']], // Apelvikens Camping – ingen tömningsstation belagd (kontroll okt 2026)
  ['way/1547921689', ['vatten']], // Välenbadets Camping – sajten tyst (kontroll okt 2026)
  ['way/61274886', ['gravatten', 'latrin', 'vatten']], // Spilhammars Camping – egen sajt/Visit Eksjö tysta (kontroll okt 2026)
  ['node/431824851', ['gravatten', 'latrin', 'vatten']], // Lövhults Camping – nassjo.se nämner ingen tömning (kontroll okt 2026)
  ['way/404586033', ['gravatten', 'latrin', 'vatten']], // Habo Camping & Stugby – egen sajt/kommun tysta (kontroll okt 2026)
  ['node/431824885', ['gravatten', 'latrin', 'vatten']], // Sävsjö Camping – ny arrendator 2026, kommunen tyst (kontroll okt 2026)
  ['node/11080216650', ['gravatten', 'latrin', 'vatten']], // Camping Vreten (Nora) – egen sajt tyst (kontroll okt 2026)
  ['node/2382863123', ['gravatten', 'latrin']], // Sannabadet (Lekeberg) – egen sajt/kommun tysta (kontroll okt 2026)
  ['way/506105201', ['vatten']], // Grums Fish'n Camp – kranvatten ej garanterat som dricksvatten (kontroll okt 2026)
  ['way/1307453003', ['gravatten', 'latrin', 'vatten']], // Rogsta Hembygdsgård – ingen källa (kontroll okt 2026)
  ['way/164031028', ['gravatten']], // Barken Lodge – egen sajt nämner inte gråvatten (kontroll okt 2026)
  ['way/951573089', ['gravatten', 'latrin']], // Sanda båthamn Mora – latrinstation för båtar (kontroll okt 2026)
  ['way/990576270', ['gravatten', 'latrin', 'vatten']], // Fox & Elk Camping Idre – egen sajt tyst (kontroll okt 2026)
  ['node/5037674540', ['gravatten', 'latrin', 'vatten']], // Falkudden Camping – egen sajt tyst (kontroll okt 2026)
  ['node/3684658324', ['gravatten']], // Vikarbygården – gråvatten nämns inte (kontroll okt 2026)
  ['way/1020275645', ['gravatten', 'latrin']], // Söderhamns City Camping – tömningen finns vid Stugsundskajen (kontroll okt 2026)
  ['relation/21255848', ['gravatten', 'latrin']], // Sjöstugan Grövelsjön – tjänster okända (kontroll okt 2026)
  ['way/1301732272', ['gravatten', 'latrin']], // Ställplats Dalarna (Gagnef) – ingen källa alls (kontroll okt 2026)
  ['node/12077225309', ['vatten']], // Camping Torp (Hagfors) – ingen källa (kontroll okt 2026)
  ['way/1193085061', ['gravatten', 'latrin']], // Rengsjö camping – kommunen hänvisar latrin till Rastplats Bollnäs (kontroll okt 2026)
  ['way/298335948', ['gravatten', 'latrin']], // Kraja Fritidsanläggning – sajten nämner ingen tömning (kontroll okt 2026)
  ['way/1447023893', ['gravatten', 'latrin']], // Åkersjöstrand camping – sajten nämner ingen tömning (kontroll okt 2026)
  ['node/13980206457', ['vatten']], // naturgården Udden – ingen uppgift (kontroll okt 2026)
  ['node/431825882', ['gravatten', 'latrin', 'vatten']], // Kvarnsjö Camp – egen sajt tyst (kontroll okt 2026)
  ['way/783370464', ['gravatten', 'latrin']], // Ristafallet Camping – egen sajt tyst (kontroll okt 2026)
  ['node/11878507670', ['gravatten']], // Örebro Truckstop – besökare 13 okt 2026: "Gråvattentömning ej tillgänglig" (#36), ingen primärkälla
  ['way/972080616', ['gravatten', 'latrin', 'vatten']], // Seglora Camping – egen sajt tyst, bara kataloger (D-varv 2 VG, 13 okt 2026)
  ['way/1409547635', ['vatten']], // Skogsvallen i Ale – vatten nämns inte (D-varv 2 VG, 13 okt 2026)
  ['node/3662742329', ['gravatten', 'latrin']], // Hällevadsholm – klubbens sida nämner ingen tömning (D-varv 2 VG, 13 okt 2026)
  ['node/10968644837', ['gravatten', 'latrin', 'vatten']], // Hunnebergs Gård – egen sajt/turistråd tysta (D-varv 2 VG, 13 okt 2026)
  ['node/9878536454', ['gravatten', 'latrin', 'vatten']], // Brålands Gård – ingen källa nämner tömning/vatten (D-varv 2 VG, 13 okt 2026)
  ['relation/11653650', ['vatten']], // Vindöns Camping – bara septiktömning för båtar nämns (D-varv 2 VG, 13 okt 2026)
  ['node/5419591926', ['vatten']], // Flötemarkens Vildmarkscamp – ingen primärkälla (D-varv 2 VG, 13 okt 2026)
  ['way/37838885', ['gravatten', 'latrin', 'vatten']], // Camping Vammerviken – egen sajt/Västsverige tysta (D-varv 2 VG, 13 okt 2026)
  ['way/564017273', ['gravatten', 'latrin']], // Strömsnäs Naturcamping – bara vatten belagt (D-varv 2 VG, 13 okt 2026)
  ['way/27316975', ['gravatten', 'latrin']], // Lisebergsbyn Kärralund – tömning bara hos aggregator (D-varv 2 VG, 13 okt 2026)
  ['node/3649123872', ['vatten']], // Kaffetorpet Camping – stängd hela 2026, öppnar påsk 2027 (egen sajt, 13 okt 2026)
  ['way/198088418', ['gravatten', 'latrin', 'vatten']], // Gällivare Camping – ny sajt utan tömningsinfo (kontroll okt 2026)
  ['node/842323095', ['gravatten', 'latrin', 'vatten']], // Stenbräcka/Hägnans Camping – egen sajt tyst (kontroll okt 2026)
  ['node/3668991153', ['vatten']], // Måviken Camping – ingen källa (OSM-sajten är ett rehabcenter) (kontroll okt 2026)
  ['way/432760423', ['vatten']], // Avasund Fiske & Camp – ingen källa (kontroll okt 2026)
  ['way/808435179', ['gravatten', 'latrin']], // Stöde Camping – egen sajt nämner ingen tömning (kontroll okt 2026)
  ['way/175010595', ['gravatten']], // Hoverbergs Camping – uttömmande servicelista saknar gråvatten (kontroll okt 2026)
  ['way/245336774', ['gravatten']], // Hammarstrands Camping – gråvatten nämns inte, recension säger ej tillåtet (kontroll okt 2026)
])

function applyUnverifiedOverride(key, services) {
  const unv = OSM_UNVERIFIED_OVERRIDES.get(key)
  if (!unv) return { services }
  const hit = services.filter((s) => unv.includes(s))
  if (!hit.length) return { services }
  const rest = services.filter((s) => !unv.includes(s))
  if (!rest.length) return { services, unverified: true }
  return { services: rest, unverifiedServices: hit }
}

// ---------- OpenStreetMap ----------

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

// Overpass/OSM:s användningspolicy kräver en identifierande User-Agent
const USER_AGENT = 'Tomningskartan-sync/0.1 (+https://github.com/PerraFree/PJfrance)'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const OSM_QUERY = `
[out:json][timeout:600];
area["ISO3166-1"="SE"][admin_level=2]->.se;
(
  nwr["amenity"="sanitary_dump_station"](area.se);
  nwr["sanitary_dump_station"]["sanitary_dump_station"!="no"](area.se);
  nwr["amenity"="water_point"](area.se);
  nwr["tourism"="caravan_site"](area.se);
  nwr["tourism"="camp_site"](area.se);
  nwr["leisure"="golf_course"]["caravan"~"^(yes|designated)$"](area.se);
  nwr["leisure"="golf_course"]["motorhome"~"^(yes|designated)$"](area.se);
  nwr["amenity"="fuel"]["fuel:lpg"="yes"](area.se);
  nwr["shop"="gas"](area.se);
  nwr["amenity"="waste_disposal"](area.se);
  nwr["amenity"="recycling"]["recycling_type"="centre"](area.se);
  nwr["highway"="rest_area"](area.se);
  nwr["amenity"="parking"]["motorhome"~"^(yes|designated)$"](area.se);
  nwr["amenity"="parking"]["caravan"~"^(yes|designated)$"](area.se);
);
out center tags;
`

function isBoatStation(tags) {
  // motorhome=no exkluderas inte längre (husvagns-/kassettplats kan ändå vara relevant).
  return (
    tags.waterway === 'sanitary_dump_station' ||
    'seamark:type' in tags ||
    tags['sanitary_dump_station:suction'] === 'yes' ||
    tags.boat === 'yes'
  )
}

// ---------- Tolkningsregler för "rätt före fler" (granskning 12 okt 2026) ----------
// Allt i detta block speglas i src/lib/overpass.ts – ändra ALLTID båda.

const yesOrDesignated = (v) => v === 'yes' || v === 'designated'

// Livscykelprefix: "disused:amenity=sanitary_dump_station" = tömningen är nedlagd.
const LIFECYCLE_RE = /^(disused|abandoned|demolished|removed|razed|was):(.+)$/
const MAIN_KEYS = ['amenity', 'tourism', 'shop', 'leisure', 'highway']
// Namn som uttryckligen säger att platsen är nedlagd/privat.
const CLOSED_NAME_RE = /\b(abandoned|nedlagd|nedlagt|nedlagda)\b|\bprivate camping\b/i
// opening_hours som BARA säger stängt ("closed", "off", ev. med kommentar).
// "off; May-Sep 24/7" är säsongsöppet, inte nedlagt – därför hela värdet.
const CLOSED_HOURS_RE = /^\s*(closed|off)\s*("[^"]*")?\s*;?\s*$/i

/** Hela elementet ska bort: privat, bara för kunder, nedlagt eller stängt. */
function isClosedOrPrivate(tags) {
  const access = tags.access
  if (access === 'private' || access === 'no') return true
  // access=customers räknas INTE som privat (ändrat 12 okt 2026 efter första
  // synken): på campingar och återvinningscentraler betyder det gäster/
  // kommuninvånare – det tog bort ~200 riktiga tömningsstationer och ÅVC.
  if (tags.disused === 'yes' || tags.abandoned === 'yes') return true
  if (CLOSED_HOURS_RE.test(tags.opening_hours ?? '')) return true
  if (CLOSED_NAME_RE.test(tags.name ?? '')) return true
  // Huvudtaggen finns bara med livscykelprefix (t.ex. disused:tourism=camp_site
  // utan tourism) och ingen annan levande huvudtagg → hela platsen är nedlagd.
  const deadMain = Object.keys(tags).some((k) => {
    const m = LIFECYCLE_RE.exec(k)
    return m && MAIN_KEYS.includes(m[2]) && !(m[2] in tags)
  })
  if (deadMain && !MAIN_KEYS.some((k) => k in tags)) return true
  return false
}

/** Tjänster som en livscykelprefixad tagg säger är nedlagda på en annars levande plats. */
function lifecycleRemovedServices(tags) {
  const gone = new Set()
  for (const [k, v] of Object.entries(tags)) {
    const m = LIFECYCLE_RE.exec(k)
    if (!m || v === 'no') continue
    const key = m[2]
    const val = key === 'amenity' || key === 'shop' ? v : key
    if (val === 'sanitary_dump_station') { gone.add('gravatten'); gone.add('latrin') }
    if (val === 'water_point' || val === 'drinking_water') gone.add('vatten')
    if (val === 'waste_disposal') gone.add('sopor')
    if (val === 'recycling') gone.add('atervinning')
    if (val === 'gas' || val === 'fuel:lpg') gone.add('gasol')
  }
  return gone
}

// Båttömning: sugtömning/septik i en marina eller gästhamn är oanvändbar för
// husbil. Gäller bara tömningstjänsterna – platsens övriga tjänster står kvar.
const BOAT_NAME_RE = /båt|gästhamn|marina|sugtömning|septik|pump.?out/i
function isBoatDump(tags) {
  const dump =
    tags.amenity === 'sanitary_dump_station' ||
    (tags.sanitary_dump_station !== undefined && tags.sanitary_dump_station !== 'no')
  if (!dump) return false
  if (yesOrDesignated(tags.motorhome) || yesOrDesignated(tags.caravan)) return false
  if (
    tags.boat === 'designated' ||
    tags.leisure === 'marina' ||
    'mooring' in tags ||
    Object.keys(tags).some((k) => k.startsWith('seamark:'))
  )
    return true
  // Namnregeln gäller inte campingar/ställplatser: en ställplats i en gästhamn
  // med sanitary_dump_station=yes har oftast husbilstömning (t.ex. Blankaholm).
  if (tags.tourism === 'camp_site' || tags.tourism === 'caravan_site') return false
  return BOAT_NAME_RE.test(tags.name ?? '')
}

// Rastplatser (Trafikverkets och andras) tar i regel bara kassett ("endast
// avsedda för portabla toaletter", docs/DATAKALLOR.md). Gråvatten bara om OSM
// uttryckligen säger det.
function isRestArea(tags) {
  return tags.highway === 'rest_area' || tags.highway === 'services' || /rastplats/i.test(tags.name ?? '')
}

// Sopkärl som bara är till för en förening, ett koloniområde eller hundbajs.
const PRIVATE_WASTE_RE = /\bbrf\b|bostadsr[äa]ttsf[öo]rening|koloni|hundlatrin|hundbajs/i
function isPrivateWaste(tags) {
  if (tags.amenity !== 'waste_disposal' && tags.amenity !== 'waste_basket') return false
  if ('dog' in tags) return true
  if (tags.waste && tags.waste.split(';').every((w) => w.trim() === 'dog_excrement')) return true
  return PRIVATE_WASTE_RE.test(tags.name ?? '') || PRIVATE_WASTE_RE.test(tags.operator ?? '')
}

// Industrigas (svets-/specialgas) är inte gasol för husbil – bara en verifierad
// rad i OSM_FACILITY_OVERRIDES ger gasol där. AGA skiftlägeskänsligt så att
// t.ex. "Saga" inte träffas.
const INDUSTRIAL_GAS_RE = /hydraulic|industripartner|svets|welding|linde gas|air liquide|strandmøllen/i
const AGA_RE = /(^|[\s,(])AGA($|[\s,)])/
const INDUSTRIAL_GAS_TYPES = ['oxygen', 'acetylene', 'argon', 'nitrogen', 'carbon_dioxide', 'co2', 'helium', 'hydrogen', 'mixed_gas']
const LPG_GAS_KEYS = ['gas:lpg', 'gas:propane', 'gas:butane', 'gas:gasol', 'fuel:lpg']
function isIndustrialGas(tags) {
  const texts = [tags.name, tags.brand, tags.operator].filter(Boolean)
  // AGA och Linde säljer också gasol ("AGA Gasolautomat") – nämns gasol/propan/
  // LPG är det ALDRIG industrigas (granskning 12 okt 2026).
  if (texts.some((t) => /gasol|propan|\blpg\b/i.test(t))) return false
  if (texts.some((t) => INDUSTRIAL_GAS_RE.test(t) || AGA_RE.test(t))) return true
  if (tags.shop !== 'gas') return false
  const industrial = Object.keys(tags).some((k) => {
    const m = /^(gas|fuel):(.+)$/.exec(k)
    return m && INDUSTRIAL_GAS_TYPES.includes(m[2]) && yesOrDesignated(tags[k])
  })
  return industrial && !LPG_GAS_KEYS.some((k) => yesOrDesignated(tags[k]))
}

// Förpackningsinsamling (FTI-station/återvinningsstation) är ingen ÅVC.
const RECYCLING_STATION_NAME_RE = /återvinningsstation|\bFTI\b|förpackningsinsamling/i

// Gasolbutik vars namn säger att den fyller flaskor → påfyllning, inte byte.
const GAS_FILLER_RE = /fyll|gasolfyllarna/i

function servicesFromTags(tags) {
  if (isClosedOrPrivate(tags)) return []
  const services = new Set()
  if (tags.amenity === 'sanitary_dump_station') {
    services.add('gravatten')
    services.add('latrin')
  }
  const sds = tags.sanitary_dump_station
  if (sds && sds !== 'no') {
    services.add('gravatten')
    services.add('latrin')
  }
  if (tags['sanitary_dump_station:grey_water'] === 'no') services.delete('gravatten')
  if (tags['sanitary_dump_station:chemical_toilet'] === 'no') services.delete('latrin')
  if (isRestArea(tags) && !yes(tags['sanitary_dump_station:grey_water'])) services.delete('gravatten')
  if (isBoatDump(tags)) {
    services.delete('gravatten')
    services.delete('latrin')
  }
  if (tags.amenity === 'water_point' || tags.water_point === 'yes' || tags.drinking_water === 'yes') {
    services.add('vatten')
  }
  if (tags.tourism === 'caravan_site') services.add('stallplats')
  // Parkeringar där husbil/husvagn uttryckligen är tillåten = ställplats
  // (vanlig taggning för kommunala och föreningsdrivna ställplatser).
  if (
    tags.amenity === 'parking' &&
    (tags.motorhome === 'yes' ||
      tags.motorhome === 'designated' ||
      tags.caravan === 'yes' ||
      tags.caravan === 'designated') &&
    tags.access !== 'private' &&
    tags.access !== 'no'
  ) {
    services.add('stallplats')
  }
  // Camp_sites som HETER "Ställplats …" utan ordet "camping" i namnet är i
  // praktiken en ren uppställningsplats, inte en campinganläggning – trots
  // OSM-taggen tourism=camp_site. Sådana ska bara få 'stallplats', aldrig
  // 'camping' (annars visas fel/dubbla märken, t.ex. "Gekås Ställplats").
  // Speglas i src/lib/overpass.ts.
  const nameIsPureStallplats =
    tags.tourism === 'camp_site' &&
    /st[äa]llplats|stellplatz|husbilsplats/i.test(tags.name ?? '') &&
    !/camping|camp\b/i.test(tags.name ?? '')
  if (nameIsPureStallplats && tags.access !== 'private' && tags.access !== 'no') {
    services.add('stallplats')
  }
  if (tags.tourism === 'camp_site' && !nameIsPureStallplats) {
    const openToPublic = tags.access !== 'private' && tags.access !== 'no'
    const notTentOnly = tags.tents !== 'only'
    const husbilOk =
      tags.motorhome === 'yes' ||
      tags.motorhome === 'designated' ||
      tags.caravan === 'yes' ||
      tags.caravan === 'designated' ||
      tags.caravans === 'yes' ||
      'power_supply' in tags ||
      tags.sanitary_dump_station === 'yes' ||
      tags.amenity === 'sanitary_dump_station'
    if (notTentOnly && openToPublic) services.add('camping')
    if (husbilOk && notTentOnly && openToPublic) services.add('stallplats')
  }
  if (
    tags.leisure === 'golf_course' &&
    (tags.caravan === 'yes' ||
      tags.caravan === 'designated' ||
      tags.motorhome === 'yes' ||
      tags.motorhome === 'designated')
  ) {
    services.add('stallplats')
  }
  if (tags['fuel:lpg'] === 'yes' || tags.shop === 'gas' || tags['service:vehicle:lpg'] === 'yes') {
    services.add('gasol')
  }
  // Sopor: sopstationer, återvinningscentraler och rastplatser med sopkärl.
  // Glas-/pappersigloos (recycling_type=container) tas inte med.
  if (
    (tags.amenity === 'waste_disposal' ||
      tags.waste_disposal === 'yes' ||
      (tags.highway === 'rest_area' && (tags.waste_basket === 'yes' || tags.bin === 'yes'))) &&
    !isPrivateWaste(tags)
  ) {
    services.add('sopor')
  }
  // Återvinningscentraler (ÅVC) är en EGEN kategori sedan okt 2026 – de tar
  // sällan emot hushållssopor och ska inte blandas med sopstationerna.
  // Återvinningsstationer (recycling_type=container, FTI) räknas inte – inte
  // heller när de felaktigt taggats centre men heter "…återvinningsstation"/"FTI"
  // (29 sådana i seeden okt 2026).
  if (
    tags.amenity === 'recycling' &&
    tags.recycling_type === 'centre' &&
    !RECYCLING_STATION_NAME_RE.test(tags.name ?? '')
  ) {
    services.add('atervinning')
  }
  for (const s of lifecycleRemovedServices(tags)) services.delete(s)
  return [...services]
}

function placeKind(tags) {
  if (tags.highway === 'rest_area') return 'Rastplats'
  if (tags.highway === 'services') return 'Vägkrog/serviceområde'
  if (tags.tourism === 'caravan_site') return 'Ställplats för husbil'
  if (
    tags.tourism === 'camp_site' &&
    /st[äa]llplats|stellplatz|husbilsplats/i.test(tags.name ?? '') &&
    !/camping|camp\b/i.test(tags.name ?? '')
  )
    return 'Ställplats för husbil'
  if (tags.tourism === 'camp_site') return 'Camping'
  if (tags.leisure === 'golf_course') return 'Ställplats vid golfklubb'
  if (tags.amenity === 'parking') return 'Ställplats för husbil'
  if (tags.leisure === 'marina' || tags.mooring) return 'Gästhamn/marina'
  if (tags.shop === 'gas') return 'Gasolförsäljning'
  if (tags.amenity === 'fuel') return 'Drivmedelsstation'
  if (tags.amenity === 'sanitary_dump_station') return 'Tömningsstation'
  if (tags.amenity === 'water_point') return 'Vattenpåfyllning'
  if (tags.amenity === 'recycling' && tags.recycling_type === 'centre')
    return 'Återvinningscentral'
  if (tags.amenity === 'waste_disposal') return 'Sopstation'
  return undefined
}

/** Antal OSM-stationer i senast PUBLICERADE seeden (gh-pages) – den säkra
 *  sanningen om vad användarna ser (repots seed committas av sync-data.yml). 0 om okänt. */
async function previousOsmCount() {
  try {
    const res = await fetch(PREV_SEED_URL, { signal: AbortSignal.timeout(60_000) })
    if (res.ok) {
      const prev = await res.json()
      return (prev.stations ?? prev).filter((s) => s.source === 'osm').length
    }
  } catch {
    /* faller tillbaka på repots fil */
  }
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8'))
    return (prev.stations ?? prev).filter((s) => s.source === 'osm').length
  } catch {
    return 0
  }
}

async function fetchOsm() {
  // Speglarna släpar olika mycket efter OSM och kan dessutom hugga av svaret
  // vid timeout (24 sep 2026: 4 614 → 4 526 → 4 430 stationer på tre
  // körningar när huvudspegeln gav 504 och reservspeglarna fick svara).
  // Därför: acceptera bara ett svar som är ≥ 97 % av förra seedens antal,
  // annars prova nästa spegel och ta till sist det största svaret.
  const prevCount = await previousOsmCount()
  let lastError
  let best = null
  for (let attempt = 0; attempt < 2 && !(best && best.length); attempt++) {
    if (attempt > 0) {
      console.log('Nytt varv över speglarna om 30 s …')
      await sleep(30_000)
    }
    for (const url of OVERPASS_MIRRORS) {
      try {
        const stations = await fetchOsmFrom(url)
        console.log(`OSM via ${url}: ${stations.length} stationer (förra seeden: ${prevCount})`)
        if (!prevCount || stations.length >= prevCount * 0.97) return stations
        console.warn(
          `OSM via ${url} gav bara ${stations.length} av förra seedens ${prevCount} stationer – provar nästa spegel.`,
        )
        // Ett svar med 0 (eller nästan 0) stationer är i praktiken samma sak
        // som ett fel – räknas INTE som "best", annars avbryts försöksvarvet
        // i förtid (tom array är truthy i JS) och fetchOsm() returnerar tyst
        // 0 stationer i stället för att kasta, vilket hoppar över
        // reuse-säkringen i anropskoden nedan (hände 28 sep 2026: alla tre
        // speglar gav 504/504/0, "0" vann som "best", ingen återanvändning).
        if (stations.length > 0 && (!best || stations.length > best.length)) best = stations
      } catch (err) {
        lastError = err
        console.warn(`OSM-hämtning misslyckades via ${url}: ${err.message}`)
        await sleep(5_000)
      }
    }
  }
  if (best && best.length) {
    // Ett ofullständigt svar (13 okt 2026: 4 225 av 4 398) tappade ~80 riktiga
    // tömningsplatser och stoppades av check-seed-diff – då kom inte heller
    // registerändringarna ut. Återanvänd hellre förra seedens OSM-data (samma
    // väg som när Overpass är helt nere). Har OSM-datan redan återanvänts i
    // över 7 dagar godtas det största svaret, så en verklig minskning i OSM
    // inte låser synken för alltid.
    let staleDays = 0
    try {
      const prev = JSON.parse(await readFile(OUT, 'utf8'))
      const src = prev.sources?.osm
      if (src && src.fresh === false && src.at) staleDays = (Date.now() - Date.parse(src.at)) / 86_400_000
    } catch {
      /* ingen förra seed – godta svaret */
    }
    if (staleDays < 7 && prevCount) {
      throw new Error(`Ingen spegel nådde 97 % av förra antalet (bästa ${best.length} av ${prevCount}) – återanvänder förra seedens OSM-data`)
    }
    // Även efter 7 dagar: under 90 % är nästan säkert ett avbrutet svar, inte
    // en verklig minskning – det hade bara stoppats av seedkontrollen och låst
    // varje synk (granskning 14 okt 2026). Återanvänd hellre.
    if (prevCount && best.length < prevCount * 0.9) {
      throw new Error(`Bästa svaret ${best.length} av ${prevCount} (under 90 %) – återanvänder förra seedens OSM-data`)
    }
    console.warn(`Ingen spegel nådde 97 % av förra antalet – använder det största svaret (${best.length}).`)
    return best
  }
  throw lastError ?? new Error('Alla Overpass-speglar gav tomt eller inget svar')
}

async function fetchOsmFrom(url) {
  const res = await fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(OSM_QUERY),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(360_000),
  })
  if (!res.ok) throw new Error(`${url} svarade ${res.status}`)
  const json = await res.json()
  // Overpass kan svara 200 med ett AVHUGGET resultat och förklara sig i
  // `remark` ("Query timed out …", "runtime error …"). Räkna det som fel så
  // nästa spegel provas i stället för att halva Sverige tyst försvinner.
  if (json.remark) {
    console.warn(`Overpass-remark från ${url}: ${json.remark}`)
    if (/timed out|runtime error|out of memory|load too high/i.test(json.remark)) {
      throw new Error(`avhugget svar: ${json.remark}`)
    }
  }
  const stations = []
  for (const el of json.elements ?? []) {
    const s = toStation(el)
    if (s) stations.push(s)
  }
  return stations
}

/** Ett Overpass-element → station (eller null). Speglar toStation i
 *  src/lib/overpass.ts – ändra ALLTID båda. */
function toStation(el) {
  if (EXCLUDED_OSM_ELEMENTS.has(`${el.type}/${el.id}`)) return null
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (lat === undefined || lon === undefined) return null
  const tags = el.tags ?? {}
  if (isBoatStation(tags)) return null
  const override = OSM_FACILITY_OVERRIDES.get(`${el.type}/${el.id}`)
  const seasonOverride = OSM_SEASON_OVERRIDES.get(`${el.type}/${el.id}`)
  // En mack som bara har fuel:lpg=yes (ingen shop=gas, ingen platsvis
  // verifierad override) är fordonsgas/autogas vid pump – inte flaskbyte.
  // Utan detta hade den visats som "byt tub" via okänt-fallbacken.
  // Industrigas (svets/AGA/Linde …) ger aldrig gasol utan override.
  // Speglas i src/lib/overpass.ts – ändra ALLTID båda.
  const industrialGas = isIndustrialGas(tags)
  const services = servicesFromTags(tags).filter(
    (s) => s !== 'gasol' || override || (tags.shop === 'gas' && !industrialGas),
  )
  if (services.length === 0) return null
  const kind = placeKind(tags)
  const amenity = amenityFields(tags)
  if (override) {
    amenity.facilities = [...new Set([...(amenity.facilities ?? []), ...override])]
  } else if (industrialGas) {
    amenity.facilities = amenity.facilities?.filter((f) => f !== 'gasol_byte')
    if (!amenity.facilities?.length) amenity.facilities = undefined
  } else if (tags.shop === 'gas' && GAS_FILLER_RE.test(tags.name ?? '')) {
    amenity.facilities = amenity.facilities?.map((f) => (f === 'gasol_byte' ? 'gasol_pafyllning' : f))
  }
  const unv = applyUnverifiedOverride(`${el.type}/${el.id}`, services)
  return {
    id: `osm-${el.type}-${el.id}`,
    name: tags.name ?? kind ?? 'Tömningsstation',
    lat,
    lon,
    services: unv.services,
    unverifiedServices: unv.unverifiedServices,
    unverified: unv.unverified,
    source: 'osm',
    description: tags.name && kind ? kind : undefined,
    // fee=no på en gasolbutik/mack betyder inte gratis gasol (gasol är alltid
    // ett köp) – sätt aldrig "Gratis" på platser som bara har gasol.
    fee:
      tags.fee === 'yes'
        ? (tags.charge ?? 'Avgift')
        : tags.fee === 'no' && !(services.length === 1 && services[0] === 'gasol')
          ? 'Gratis'
          : undefined,
    openingHours: tags.opening_hours ?? seasonOverride?.openingHours,
    season: seasonFromTags(tags) ?? seasonOverride?.season,
    image: imageFromTags(tags),
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    ...amenity,
  }
}

function seasonFromTags(tags) {
  if (tags.seasonal === 'no') return 'year-round'
  if (tags.seasonal === 'yes') return 'seasonal'
  if (tags.opening_hours === '24/7') return 'year-round'
  return undefined
}

const yes = (v) => v === 'yes' || v === 'designated' || v === 'customers'

/** Nycklar för exakt vad som finns på platsen (matchar FACILITY_LABELS i appen). */
function facilitiesFromTags(tags) {
  const f = []
  if (yes(tags['sanitary_dump_station:grey_water'])) f.push('gravatten_tomning')
  if (yes(tags['sanitary_dump_station:chemical_toilet'])) f.push('kassett_tomning')
  if (yes(tags['sanitary_dump_station:black_water'])) f.push('svartvatten_tomning')
  if (yes(tags.drinking_water) || tags.amenity === 'drinking_water') f.push('dricksvatten')
  if ('power_supply' in tags && tags.power_supply !== 'no') f.push('el')
  if (yes(tags.shower)) f.push('dusch')
  if (yes(tags.toilets) || yes(tags.toilet)) f.push('wc')
  if (yes(tags.laundry) || yes(tags.washing_machine)) f.push('tvatt')
  // ÅVC får inte "Sopor/avfall" i Finns här-listan – det är just det som är oklart där.
  if (yes(tags.waste_disposal) || 'waste_basket' in tags) f.push('avfall')
  if (['yes', 'wlan', 'terminal'].includes(tags.internet_access ?? '')) f.push('wifi')
  if (tags.dog === 'yes' || tags.dog === 'leashed') f.push('hund')
  if (yes(tags.bbq) || yes(tags.fireplace)) f.push('grill')
  if (yes(tags.playground) || tags.leisure === 'playground') f.push('lekplats')
  if (yes(tags.restaurant) || tags.amenity === 'restaurant') f.push('restaurang')
  if (tags.shop && !['no', 'gas', 'fuel'].includes(tags.shop)) f.push('butik')
  // Gasol: shop=gas är tillförlitligt byte-tubb (återförsäljare). fuel:lpg
  // på bensinstationer är INTE tillförlitligt för byte/påfyllning – har visat
  // sig vara allt från ren bilautogas till rent flaskbyte till faktisk
  // påfyllning av lös flaska beroende på plats (research-verifierat sep
  // 2026, se OSM_FACILITY_OVERRIDES ovan + CLAUDE.md). Gissa inte – lämna
  // sådana platser utan byte/påfyllning-kvalificering om de inte är
  // verifierade i OSM_FACILITY_OVERRIDES. Speglas i src/lib/overpass.ts.
  if (tags.shop === 'gas') f.push('gasol_byte')
  if (yes(tags.lit)) f.push('belyst')
  if (yes(tags.wheelchair)) f.push('tillganglig')
  if (yes(tags.motorhome)) f.push('husbil')
  if (yes(tags.caravan) || yes(tags.caravans)) f.push('husvagn')
  if (yes(tags.tents)) f.push('talt')
  return f
}

function paymentFromTags(tags) {
  const p = []
  if (yes(tags['payment:cash']) || yes(tags['payment:coins'])) p.push('Kontant')
  if (yes(tags['payment:cards']) || yes(tags['payment:credit_cards']) || yes(tags['payment:debit_cards'])) p.push('Kort')
  if (yes(tags['payment:swish'])) p.push('Swish')
  if (yes(tags['payment:app'])) p.push('App')
  return p
}

/** Plockar ut allt som finns på platsen samt kontaktuppgifter ur OSM-taggar. */
function amenityFields(tags) {
  const out = {}
  const facilities = facilitiesFromTags(tags)
  if (facilities.length) out.facilities = facilities
  const payment = paymentFromTags(tags)
  if (payment.length) out.payment = payment
  const street = tags['addr:street']
  const place = tags['addr:city'] || tags['addr:place'] || tags['addr:municipality'] || tags['addr:hamlet']
  const line1 = street ? `${street}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}` : ''
  const addr = [line1, place].filter(Boolean).join(', ')
  if (addr) out.address = addr
  const cap = tags.capacity || tags['capacity:pitches'] || tags['capacity:caravans'] || tags['capacity:persons']
  if (cap) out.capacity = cap
  if (tags.maxstay) out.maxstay = tags.maxstay
  if (tags.operator) out.operator = tags.operator
  if (tags.phone || tags['contact:phone']) out.phone = tags.phone ?? tags['contact:phone']
  if (tags.website || tags['contact:website'])
    out.website = tags.website ?? tags['contact:website']
  return out
}

// ---------- Trafikverket ----------

// Bredare mönster så att inga varianter av Trafikverkets utrustningsnamn
// missas ("Latrintömning", "Toalettömning", "Tömningsstation", "Sanitet" …).
const LATRIN_RE = /latrin|sanit|dump|töm/i
const WATER_RE = /f[äa]rskvatten|s[öo]tvatten|freshwater|drinking|dricksvatten|tappst[äa]lle|vattenp[åa]fyllning|vattentappning/i
const WASTE_RE = /sop|avfall|återvinning|waste|refuse/i

// Beskrivningstexten kan säga att tömningen/vattnet är stängt ("Latrintömningen
// är tillfälligt stängd", "Vattnet ur funktion"). Sådana tjänster blir grå
// (obekräftade), inte borttagna – texten kan vara gammal. Meningsvis, så att
// "stängd" bara räknas tillsammans med den tjänst den gäller.
const TV_CLOSED_RE = /stängd|stängt|ur funktion|ej i funktion|ur drift|ej i drift|ur bruk|fungerar (inte|ej)|trasig/i
const TV_LATRIN_TEXT_RE = /latrin|toalett|töm|kassett|sanit/i
const TV_WATER_TEXT_RE = /vatt(en|n)/i // vatten, vattnet, vattenposten
const TV_WHOLE_TEXT_RE = /rastplats|anläggning/i
function tvClosedServices(description, services) {
  const closed = new Set()
  for (const part of String(description ?? '').split(/[.!?;\n]+/)) {
    if (!TV_CLOSED_RE.test(part)) continue
    const latrin = TV_LATRIN_TEXT_RE.test(part)
    const water = TV_WATER_TEXT_RE.test(part)
    if (latrin) closed.add('latrin')
    if (water) closed.add('vatten')
    if (!latrin && !water && TV_WHOLE_TEXT_RE.test(part)) for (const s of services) closed.add(s)
  }
  return services.filter((s) => closed.has(s))
}

async function fetchTrafikverket(apiKey) {
  const body = `
    <REQUEST>
      <LOGIN authenticationkey="${apiKey}" />
      <QUERY objecttype="Parking" schemaversion="1.4">
        <FILTER><EQ name="Deleted" value="false" /></FILTER>
        <INCLUDE>Id</INCLUDE>
        <INCLUDE>Name</INCLUDE>
        <INCLUDE>Description</INCLUDE>
        <INCLUDE>Geometry.WGS84</INCLUDE>
        <INCLUDE>Equipment</INCLUDE>
      </QUERY>
    </REQUEST>`
  const res = await fetch('https://api.trafikinfo.trafikverket.se/v2/data.json', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`Trafikverket svarade ${res.status}`)
  const json = await res.json()
  // Trafikverket svarar 200 även vid fel (ogiltig nyckel, schemafel …) med
  // RESULT[0].ERROR – tidigare blev det tyst 0 rastplatser. Kasta i stället så
  // att reserven (förra seedens rastplatser) används.
  const result = json.RESPONSE?.RESULT?.[0]
  const apiError = result?.ERROR ?? json.RESPONSE?.ERROR
  if (apiError) throw new Error(`Trafikverket svarade 200 med ERROR: ${JSON.stringify(apiError).slice(0, 300)}`)
  if (!Array.isArray(result?.Parking)) throw new Error('Trafikverket-svaret saknar Parking-lista')
  const parkings = result.Parking
  if (parkings.length === 0) throw new Error('Trafikverket-svaret innehöll 0 parkeringar')
  const stations = []
  for (const p of parkings) {
    const m = p.Geometry?.WGS84?.match(/POINT\s*\(\s*([\d.,-]+)\s+([\d.,-]+)\s*\)/i)
    if (!m) continue
    const lon = parseFloat(m[1].replace(',', '.'))
    const lat = parseFloat(m[2].replace(',', '.'))
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue
    const types = (p.Equipment ?? []).map((e) => e.Type ?? '')
    const hasLatrin = types.some((t) => LATRIN_RE.test(t))
    const hasWater = types.some((t) => WATER_RE.test(t))
    const hasWaste = types.some((t) => WASTE_RE.test(t))
    if (!hasLatrin && !hasWater && !hasWaste) continue
    const services = []
    // Endast portabla toaletter enligt Trafikverket – inte gråvatten.
    if (hasLatrin) services.push('latrin')
    if (hasWater) services.push('vatten')
    if (hasWaste) services.push('sopor')
    const closed = tvClosedServices(p.Description, services)
    const open = services.filter((s) => !closed.includes(s))
    stations.push({
      id: `tv-${p.Id ?? `${lat},${lon}`}`,
      name: p.Name ? `Rastplats ${p.Name}` : 'Rastplats',
      lat,
      lon,
      // Samma form som applyUnverifiedOverride: alla stängda → hela platsen grå.
      services: open.length ? open : services,
      unverifiedServices: open.length && closed.length ? closed : undefined,
      unverified: open.length ? undefined : true,
      source: 'trafikverket',
      description: p.Description,
      fee: 'Gratis (Trafikverkets rastplats)',
    })
  }
  return stations
}

// ---------- Kommunala platser (geokodas via Nominatim) ----------

async function geocode(query) {
  // 1) Nominatim (exakta adresser)
  let nominatimAnswered = false
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=se&q=' +
      encodeURIComponent(query)
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'sv' },
      signal: AbortSignal.timeout(30_000),
    })
    if (res.ok) {
      const json = await res.json()
      nominatimAnswered = true
      if (json.length) return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) }
    }
  } catch {
    /* prova reserven */
  }
  // 2) Photon (Komoot) – bättre på namn som "Ginstavallen" utan gatuadress
  const purl =
    'https://photon.komoot.io/api/?limit=1&bbox=10.5,55.0,24.5,69.2&q=' + encodeURIComponent(query)
  const pres = await fetch(purl, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (!pres.ok) throw new Error(`Photon svarade ${pres.status}`)
  const pjson = await pres.json()
  const hit = (pjson.features ?? []).find(
    (f) => f.properties?.countrycode === 'SE' && f.geometry?.coordinates,
  )
  if (!hit) {
    // "Hittas inte" får bara sägas när Nominatim faktiskt svarade – ett 504
    // från Nominatim + tomt Photon-svar är ett FEL, inte en miss (annars
    // cachas det som miss i 30 dagar och platsen försvinner ur seeden).
    if (!nominatimAnswered) throw new Error('Nominatim svarade inte och Photon hittade inget')
    return null
  }
  const [lon, lat] = hit.geometry.coordinates
  return { lat, lon }
}

/** Foto-URL från OSM-taggar: wikimedia_commons (File:…) eller image (https).
 *  Speglas i src/lib/overpass.ts – ändra alltid båda. */
function imageFromTags(tags) {
  const wm = tags.wikimedia_commons
  if (wm && /^File:/i.test(wm)) {
    return (
      'https://commons.wikimedia.org/wiki/Special:FilePath/' +
      encodeURIComponent(wm.replace(/^File:/i, '')) +
      '?width=480'
    )
  }
  // Bara Wikimedia-bilder (granskning 12 okt 2026): tags.image kan peka på
  // valfri server – en OSM-redigerare kunde då logga besökarnas IP vid varje
  // popupvisning eller visa olämpligt innehåll. Speglas i båda filerna.
  const img = tags.image
  if (img && /^https?:\/\/(upload|commons)\.wikimedia\.org\//i.test(img)) return img.replace(/^http:\/\//i, 'https://')
  return undefined
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Geokodningscache: ~950 registerposter har bara `query` och slogs tidigare upp
// mot Nominatim/Photon vid VARJE synk (1,2 s per anrop ≈ 20 min, issue #15).
// Träffar och missar sparas i en committad fil, nyckel = exakt query-sträng.
// Missar prövas om efter 30 dagar (adresser dyker upp i OSM med tiden).
// Ändrar man `query` på en post får den automatiskt en ny nyckel.
/** Namn → id-del: gemener, utan diakritik, bara a–z/0–9 och bindestreck. */
function slugify(t) {
  return String(t).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

const GEOCODE_CACHE = new URL('./geocode-cache.json', import.meta.url)
const GEOCODE_MISS_RETRY_MS = 30 * 24 * 3600 * 1000

// Registerposter som inte kom med i seeden – skrivs till REGISTER_DROPPED (om
// satt) så att sync-data.yml kan lägga dem i ett GitHub-ärende.
const dropped = []

async function fetchCurated() {
  // Ett trasigt register får aldrig ge en seed utan registerposter
  // (granskning 12 okt 2026): kasta fel så att synken stoppar i stället.
  const entries = JSON.parse(await readFile(CURATED, 'utf8'))
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('registret är tomt eller inte en lista')
  let cache = {}
  try {
    cache = JSON.parse(await readFile(GEOCODE_CACHE, 'utf8'))
  } catch {
    /* första körningen – tom cache */
  }
  // Förra seedens lägen för registerposter (namn → lat/lon), reserv vid miss.
  const prevPos = new Map()
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8'))
    for (const s of prev.stations ?? prev) {
      if (typeof s.id === 'string' && s.id.startsWith('curated-')) {
        prevPos.set(s.id, { lat: s.lat, lon: s.lon, geoQuery: s.geoQuery })
        if (!prevPos.has('namn:' + s.name)) prevPos.set('namn:' + s.name, { lat: s.lat, lon: s.lon, geoQuery: s.geoQuery })
      }
    }
  } catch {
    /* ingen tidigare seed */
  }
  for (const [k, v] of Object.entries(cache)) if (v && v.from === 'prev-seed') delete cache[k]
  const stats = { cached: 0, looked: 0 }
  const stations = []
  for (const [i, e] of entries.entries()) {
    // Hoppa över trasiga poster så de aldrig kan krascha appens dedupe.
    if (!Array.isArray(e.services) || e.services.length === 0 || !e.name) {
      console.warn(`Register: hoppar över post utan namn/tjänster (#${i})`)
      dropped.push({ name: e.name ?? `#${i}`, id: e.id ?? null, reason: 'saknar namn eller tjänster' })
      continue
    }
    let networkCall = false
    try {
      // Ange lat/lon direkt i posten för att hoppa över geokodning.
      let pos
      if (typeof e.lat === 'number' && typeof e.lon === 'number') {
        pos = { lat: e.lat, lon: e.lon }
      } else {
        const hit = cache[e.query]
        const fresh =
          hit &&
          (hit.miss ? Date.now() - Date.parse(hit.at) < GEOCODE_MISS_RETRY_MS : true)
        if (fresh) {
          stats.cached++
          pos = hit.miss ? null : { lat: hit.lat, lon: hit.lon }
        } else {
          networkCall = true
          stats.looked++
          // Kastar geocode() är det ett TILLFÄLLIGT fel (nätet, 5xx) – det får
          // aldrig cachas som "hittas inte" i 30 dagar (granskning 12 okt 2026).
          let threw = false
          try {
            pos = await geocode(e.query)
          } catch (err) {
            console.warn(`Register: geokodning av "${e.query}" kastade fel: ${err.message}`)
            pos = null
            threw = true
          }
          const at = new Date().toISOString()
          const prevHit = prevPos.get(e.id) ?? prevPos.get('namn:' + e.name)
          // Reserven gäller bara om förra läget kom från SAMMA query. Har någon
          // rättat query (för att flytta en felplacerad nål) och den nya inte
          // hittas, ska det gamla, felaktiga läget inte leva vidare tyst.
          const sameQuery = prevHit && (prevHit.geoQuery === undefined || prevHit.geoQuery === e.query)
          if (!pos && prevHit && sameQuery) {
            // Geokodaren hittar inget NU men platsen låg i förra seeden –
            // behåll det läget för den här körningen (hände 11 okt 2026 med
            // Furusjöns Camping). Sparas INTE i cachen: då prövades det aldrig
            // om och en felplacering kunde bli permanent. Rapporteras i ärendet.
            pos = { lat: prevHit.lat, lon: prevHit.lon }
            console.warn(`Register: "${e.query}" (${e.name}) hittades inte nu – behåller läget från förra seeden`)
            dropped.push({ name: e.name, id: e.id ?? null, kept: true, reason: `"${e.query}" hittades inte${threw ? ' (geokodarfel)' : ''} – visas med förra synkens läge` })
          } else if (!threw) {
            cache[e.query] = pos ? { lat: pos.lat, lon: pos.lon, at } : { miss: true, at }
          }
        }
      }
      if (!pos) {
        console.warn(`Register: kunde inte geokoda "${e.query}" (${e.name})`)
        dropped.push({ name: e.name, id: e.id ?? null, reason: `kunde inte geokoda "${e.query}"` })
        continue
      }
      // Rimlighetskontroll: om posten anger nearLat/nearLon (ungefärligt läge för
      // rätt ort) kasseras platsen när geokodningen hamnar för långt bort.
      // Hellre bortfall än felplacering (jfr Åmål-i-Skåne-incidenten).
      if (typeof e.nearLat === 'number' && typeof e.nearLon === 'number') {
        const km = distanceKm(pos.lat, pos.lon, e.nearLat, e.nearLon)
        const maxKm = typeof e.maxKm === 'number' ? e.maxKm : 30
        if (km > maxKm) {
          console.warn(
            `Register: "${e.name}" geokodades ${km.toFixed(0)} km från förväntat läge (max ${maxKm}) – hoppar över`,
          )
          dropped.push({ name: e.name, id: e.id ?? null, reason: `geokodades ${km.toFixed(0)} km från förväntat läge (max ${maxKm})` })
          continue
        }
      }
      const station = {
        // Vilken query läget kom från (bara geokodade poster) – reserven ovan
        // jämför den så att en ändrad query inte ärver ett gammalt läge.
        ...(typeof e.lat === 'number' ? {} : { geoQuery: e.query }),
        // Stabilt id: fryst i registret (fältet id) sedan 12 okt 2026. Tidigare
        // byggdes id av listpositionen, så varje borttagen post flyttade id:t för
        // alla senare – foton, betyg, bekräftelser och favoriter hamnade fel.
        // Saknas id (ny post) används namnet; check-register.mjs kräver unika id.
        id: e.id ?? `curated-${slugify(e.name)}`,
        name: e.name,
        lat: pos.lat,
        lon: pos.lon,
        services: e.services,
        source: e.source ?? 'kommun',
        description: e.description,
        fee: e.fee,
        // Källänken visas som "Webbplats" (inte "OpenStreetMap").
        website: e.website ?? e.url,
      }
      // Valfria, rika fält – tas bara med om de anges i posten.
      for (const key of [
        'image',
        'facilities',
        'capacity',
        'maxstay',
        'payment',
        'address',
        'operator',
        'phone',
        'openingHours',
        'season',
        'gasolPrice',
        // Obekräftade platser/tjänster (grå nål) – se types.ts och CLAUDE.md
        'unverified',
        'unverifiedServices',
        'confidence',
        // Undantag från 100 m-regeln – måste följa med, annars slog appen ihop
        // ändå (granskning 12 okt 2026).
        'distinct',
      ]) {
        if (e[key] !== undefined) station[key] = e[key]
      }
      stations.push(station)
    } catch (err) {
      console.warn(`Register: hämtning misslyckades för "${e.query ?? e.name}": ${err.message}`)
    }
    // Nominatims policy: max 1 anrop/sekund (bara när ett riktigt anrop gjordes)
    if (networkCall) await sleep(1200)
  }
  // Rensa bort nycklar som inte längre finns i registret så filen inte växer för evigt.
  const live = new Set(entries.map((e) => e.query).filter(Boolean))
  for (const k of Object.keys(cache)) if (!live.has(k)) delete cache[k]
  const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]))
  await writeFile(GEOCODE_CACHE, JSON.stringify(sorted, null, 1) + '\n')
  console.log(
    `Register: ${stations.length} platser (${stats.cached} lägen från geokodningscachen, ${stats.looked} nya uppslag)`,
  )
  return stations
}

// ---------- Foton från Wikimedia Commons (geosearch per koordinat) ----------
// Fritt att länka och kostar inget. Resultaten cachas i en committad fil så
// att varje plats bara slås upp en gång; tomma svar cachas också.
const IMAGE_CACHE = new URL('./commons-image-cache.json', import.meta.url)
// För icke-rastplatser krävs att filnamnet tyder på rätt sorts motiv – ett
// foto på grannhuset 80 m bort vore värre än ingen bild alls.
const IMAGE_KEYWORDS =
  /rastplats|st[äa]llplats|stellplatz|camping|campsite|husbil|motorhome|caravan|husvagn|marina|g[äa]sthamn|sm[åa]b[åa]tshamn|t[öo]mning|dump.?station|latrin/i

async function commonsImageFor(station) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&list=geosearch' +
    `&gscoord=${station.lat}%7C${station.lon}&gsradius=140&gsnamespace=6&gslimit=10&format=json`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Commons svarade ${res.status}`)
  const json = await res.json()
  // Commons svarar 200 med {"error": …} vid t.ex. maxlag/ratelimit. Det får
  // inte cachas som "ingen bild" för alltid – kasta så att platsen provas igen.
  if (json?.error) throw new Error(`Commons-fel: ${json.error.code ?? JSON.stringify(json.error).slice(0, 100)}`)
  if (!Array.isArray(json?.query?.geosearch)) throw new Error('Commons-svaret saknar geosearch')
  for (const hit of json.query.geosearch) {
    const title = hit.title ?? ''
    if (!/\.(jpe?g|png|webp)$/i.test(title)) continue
    // Trafikverkets rastplatser: närmsta foto duger (omgivningen ÄR platsen).
    // Övriga: bara foton vars filnamn tyder på rätt motiv.
    if (station.source !== 'trafikverket' && !IMAGE_KEYWORDS.test(title)) continue
    const name = title.replace(/^File:/i, '')
    return (
      'https://commons.wikimedia.org/wiki/Special:FilePath/' +
      encodeURIComponent(name) +
      '?width=480'
    )
  }
  return ''
}

async function enrichImagesFromCommons(stations) {
  let cache = {}
  try {
    cache = JSON.parse(await readFile(IMAGE_CACHE, 'utf8'))
  } catch {
    /* första körningen – tom cache */
  }
  // Sopor/gasol hoppas över: en bild på en soptunna eller butiksfasad
  // tillför inget. Övriga platstyper kan ha meningsfulla foton.
  const eligible = stations.filter(
    (s) =>
      !s.image &&
      (s.source === 'trafikverket' ||
        s.services.some((sv) =>
          ['stallplats', 'camping', 'gravatten', 'latrin', 'vatten'].includes(sv),
        )),
  )
  const MAX_LOOKUPS = 800 // håll körtiden nere – resten tas nästa körning
  let queried = 0
  let added = 0
  for (const s of eligible) {
    const key = `${s.lat.toFixed(4)},${s.lon.toFixed(4)}`
    if (!(key in cache)) {
      if (queried >= MAX_LOOKUPS) continue
      try {
        cache[key] = await commonsImageFor(s)
        queried++
        await sleep(120)
      } catch {
        continue // inte cachat – nytt försök nästa körning
      }
    }
    if (cache[key]) {
      s.image = cache[key]
      added++
    }
  }
  await writeFile(IMAGE_CACHE, JSON.stringify(cache, null, 1) + '\n')
  const kvar = eligible.length - Object.keys(cache).length
  console.log(
    `Commons-foton: ${added} platser har bild (${queried} nya uppslag${kvar > 0 ? `, ~${kvar} kvar till nästa körning` : ''})`,
  )
}

// ---------- Riktiga namn på namnlösa platser ----------

// Speglar GENERIC_NAME_RE i src/lib/naming.ts – ändra ALLTID båda.
const GENERIC_NAME =
  /^(Tömningsstation|Ställplats för husbil|Vattenpåfyllning|Sopstation|Återvinningscentral|Drivmedelsstation|Camping|Ställplats|Rastplats|Gasolförsäljning|Gästhamn\/marina|Dricksvatten|Vägkrog\/serviceområde)$/
const NAME_CORE = new Set(['gravatten', 'latrin', 'vatten', 'stallplats', 'camping'])
// Senast publicerade seed – används som cache för redan uppslagna ortsnamn.
const PREV_SEED_URL = 'https://raw.githubusercontent.com/PerraFree/PJfrance/gh-pages/data/stations-seed.json'
const MAX_REVERSE_LOOKUPS = 250 // ~5 min per körning; resten tas nästa gång

/** Ortsdel/ort för en koordinat via Nominatim reverse ("Skeda", "Furen", "Bor"). */
async function reverseLocality(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lon}&accept-language=sv`,
      { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) return null
    const j = await res.json()
    const a = j.address ?? {}
    const loc = a.hamlet ?? a.village ?? a.neighbourhood ?? a.suburb ?? a.town ?? a.city
    if (loc) return String(loc).trim()
    // Bara kommunen känd: "Linköpings kommun" är genitiv – "Camping,
    // Linköpings" blev fel i första körningen. Skriv "i Linköpings kommun".
    if (a.municipality) return `i ${String(a.municipality).trim()}`
    return null
  } catch {
    return null
  }
}

/**
 * Per (sep 2026): en plats får inte bara heta "Tömningsstation" när den
 * ligger på Skeda Strand. Tre steg, i ordning:
 *  1. Namngiven plats inom 250 m → "Tömningsstation vid Ställplats Skeda Strand"
 *     (samma logik körs även i appen, src/lib/naming.ts, för live-data).
 *  2. Namn som redan slagits upp i förra publicerade seeden återanvänds
 *     (så vi inte belastar Nominatim med samma platser varje vecka).
 *  3. Nominatim reverse → "Tömningsstation, Skeda" (bara platser med
 *     tömning/vatten/ställplats/camping; max MAX_REVERSE_LOOKUPS per körning).
 */
async function nameGenericStations(stations) {
  const CELL = 0.003
  const grid = new Map()
  const key = (lat, lon) => `${Math.round(lat / CELL)},${Math.round(lon / CELL)}`
  for (const s of stations) {
    if (GENERIC_NAME.test(s.name)) continue
    const k = key(s.lat, s.lon)
    if (grid.has(k)) grid.get(k).push(s)
    else grid.set(k, [s])
  }
  // Kommunnamn (grundform) för att känna igen genitivfelet "…, Linköpings":
  // "Linköping" är en kommun men "Linköpings" inte. Saknas filen kastas inget.
  const kommunNamn = new Set()
  try {
    const data = JSON.parse(await readFile(KOMMUNER, 'utf8'))
    for (const k of data.kommuner ?? data) if (k.name) kommunNamn.add(normalizeKommunName(k.name))
  } catch {
    /* utan kommunlista behålls alla namn */
  }
  const isGenitiveKommun = (name) => {
    const m = /, ([^,]+)s$/.exec(name)
    return !!m && kommunNamn.has(m[1]) && !kommunNamn.has(`${m[1]}s`)
  }
  let prevNames = new Map()
  try {
    const res = await fetch(PREV_SEED_URL, { signal: AbortSignal.timeout(60_000) })
    if (res.ok) {
      const prev = await res.json()
      for (const s of prev.stations ?? prev) {
        // Hoppa över första körningens genitivfel ("Camping, Linköpings") så
        // de slås upp på nytt med det nya formatet. Bara kommunnamn i genitiv
        // – riktiga ortsnamn på -s ("Näs", "Västerås", "Nusnäs") behålls.
        if (s.nameFrom === 'reverse' && !GENERIC_NAME.test(s.name) && !isGenitiveKommun(s.name))
          prevNames.set(s.id, s.name)
      }
    }
  } catch (err) {
    console.warn(`Kunde inte läsa förra seeden för namn-cache: ${err.message}`)
  }
  let nearby = 0, reused = 0, reverse = 0
  const todo = []
  for (const s of stations) {
    if (!GENERIC_NAME.test(s.name)) continue
    const cx = Math.round(s.lat / CELL)
    const cy = Math.round(s.lon / CELL)
    let best = null
    let bestKm = 0.25
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const n of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          const km = distanceKm(n.lat, n.lon, s.lat, s.lon)
          if (km < bestKm) { best = n; bestKm = km }
        }
      }
    }
    // Ett härlett grannamn lånar bara delen efter första " vid " (som naming.ts) –
    // annars kedjades namnen ("Sopstation vid Sopstation vid …", granskning 14 okt 2026).
    const bestName = best && best.nameFrom === 'nearby' && best.name.includes(' vid ') ? best.name.slice(best.name.indexOf(' vid ') + 5) : best?.name
    if (best) { s.name = `${s.name} vid ${bestName}`; s.nameFrom = 'nearby'; nearby++; continue }
    if (!s.services.some((x) => NAME_CORE.has(x))) continue
    if (prevNames.has(s.id)) { s.name = prevNames.get(s.id); s.nameFrom = 'reverse'; reused++; continue }
    todo.push(s)
  }
  for (const s of todo.slice(0, MAX_REVERSE_LOOKUPS)) {
    const loc = await reverseLocality(s.lat, s.lon)
    if (loc) { s.name = loc.startsWith('i ') ? `${s.name} ${loc}` : `${s.name}, ${loc}`; s.nameFrom = 'reverse'; reverse++ }
    await sleep(1100)
  }
  const left = Math.max(0, todo.length - MAX_REVERSE_LOOKUPS)
  console.log(
    `Namn: ${nearby} via närliggande plats, ${reused} återanvända från förra seeden, ${reverse} nya ortsuppslag${left ? `, ${left} kvar till nästa körning` : ''}`,
  )
}

// ---------- Kommun per plats (för SEO-sidorna, scripts/build-seo-pages.mjs) ----------

const MUNICIPALITY_QUERY = `
[out:json][timeout:180];
area["ISO3166-1"="SE"][admin_level=2]->.se;
relation["boundary"="administrative"]["admin_level"="7"](area.se);
out center tags;
`
const KOMMUNER = new URL('./kommuner.json', import.meta.url)

/**
 * OSM namnger kommunerna i genitiv ("Arjeplogs kommun", "Göteborgs Stad").
 * Ta bort "kommun"/"Stad" och genitiv-s, men behåll s:et där det hör till
 * namnet (Borås, Bollnäs, Kramfors, Grums …).
 */
function normalizeKommunName(raw) {
  let n = String(raw).replace(/\s+(kommun|stad)$/i, '').trim()
  if (/s$/.test(n) && !/(ås|äs|fors)$/i.test(n) && n !== 'Grums') n = n.slice(0, -1)
  return n
}

/** Punkt-i-polygon (ray casting), ring = [[lon, lat], …]. */
function pointInRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function pointInKommun(lon, lat, k) {
  if (!k.polygons || !k.bbox) return false
  const [minLon, minLat, maxLon, maxLat] = k.bbox
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return false
  for (const poly of k.polygons) {
    if (!pointInRing(lon, lat, poly[0])) continue
    // Hål (enklaver) räknas inte som kommunen
    if (poly.slice(1).some((hole) => pointInRing(lon, lat, hole))) continue
    return true
  }
  return false
}

/**
 * Kommun per plats. Först riktiga kommungränser (scripts/kommuner.json,
 * hämtas av workflowen hamta-kommungranser.yml), platser som hamnar utanför
 * alla polygoner (hav, sjöar, gränsavrundning) får närmaste kommuncentrum.
 * Saknas filen används enbart närmaste centrum från Overpass.
 */
async function assignMunicipalities(stations) {
  try {
    const data = JSON.parse(await readFile(KOMMUNER, 'utf8'))
    const kommuner = (data.kommuner ?? data).map((k) => ({ ...k, name: normalizeKommunName(k.name) }))
    const withPoly = kommuner.filter((k) => k.polygons)
    if (withPoly.length < 250) throw new Error(`bara ${withPoly.length} kommuner med polygon i kommuner.json`)
    let inside = 0, nearest = 0
    for (const s of stations) {
      const hit = withPoly.find((k) => pointInKommun(s.lon, s.lat, k))
      if (hit) { s.kommun = hit.name; inside++; continue }
      let best = null, bestKm = Infinity
      for (const k of kommuner) {
        if (!k.center) continue
        const km = distanceKm(k.center[1], k.center[0], s.lat, s.lon)
        if (km < bestKm) { bestKm = km; best = k }
      }
      if (best) { s.kommun = best.name; nearest++ }
    }
    console.log(`Kommuner: ${withPoly.length} polygoner (${data.fetchedAt?.slice(0, 10) ?? '?'}); ${inside} platser inom gräns, ${nearest} via närmaste centrum`)
    return
  } catch (err) {
    console.warn(`kommuner.json saknas/ogiltig (${err.message}) – använder närmaste kommuncentrum från Overpass`)
  }
  let lastError
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(MUNICIPALITY_QUERY),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(180_000),
      })
      if (!res.ok) throw new Error(`${url} svarade ${res.status}`)
      const json = await res.json()
      const m = (json.elements ?? [])
        .filter((e) => e.center && e.tags?.name)
        .map((e) => ({ name: normalizeKommunName(e.tags.name), lat: e.center.lat, lon: e.center.lon }))
      if (m.length < 250) throw new Error(`bara ${m.length} kommuner i svaret`)
      for (const s of stations) {
        let best = null, bestKm = Infinity
        for (const k of m) {
          const km = distanceKm(k.lat, k.lon, s.lat, s.lon)
          if (km < bestKm) { bestKm = km; best = k }
        }
        if (best) s.kommun = best.name
      }
      console.log(`Kommuner: ${m.length} från OSM, alla platser tilldelade närmaste kommuncentrum`)
      return
    } catch (err) {
      lastError = err
      console.warn(`Kommunhämtning misslyckades via ${url}: ${err.message}`)
    }
  }
  // Reserv: behåll kommun från förra publicerade seeden per id
  try {
    const res = await fetch(PREV_SEED_URL, { signal: AbortSignal.timeout(60_000) })
    if (res.ok) {
      const prev = await res.json()
      const byId = new Map((prev.stations ?? prev).filter((s) => s.kommun).map((s) => [s.id, s.kommun]))
      let n = 0
      for (const s of stations) if (byId.has(s.id)) { s.kommun = byId.get(s.id); n++ }
      console.warn(`Kommuner: återanvände ${n} från förra seeden (${lastError?.message})`)
    }
  } catch { /* inget att göra */ }
}

// ---------- Kör ----------

const stations = []
const runAt = new Date().toISOString()
// Källstatus i seeden: fresh=false när förra seedens data återanvändes.
// `at` = när datan senast hämtades färskt (bevaras från förra seeden vid reserv).
let prevSeed = null
try {
  prevSeed = JSON.parse(await readFile(OUT, 'utf8'))
} catch {
  /* ingen tidigare seed */
}
const prevSourceAt = (name) => prevSeed?.sources?.[name]?.at ?? prevSeed?.updatedAt ?? null
const sources = {
  osm: { fresh: true, at: runAt, count: 0 },
  trafikverket: { fresh: true, at: runAt, count: 0 },
}

try {
  const osm = await fetchOsm()
  console.log(`OSM: ${osm.length} stationer`)
  stations.push(...osm)
  sources.osm.count = osm.length
} catch (err) {
  sources.osm = { fresh: false, at: prevSourceAt('osm'), count: 0, error: String(err.message).slice(0, 200) }
  console.error(`OSM-hämtning misslyckades helt: ${err.message}`)
  // Overpass är nere i timmar ibland (alla speglar 504 samtidigt, t.ex.
  // 24 sep 2026). Utan detta stoppade säkerhetsspärren nedan HELA
  // skrivningen, så att register-ändringar (nya curated-platser, rättade
  // koordinater) inte kom ut förrän Overpass svarade igen. Återanvänd i
  // stället OSM-stationerna från förra körningens seed – de är på sin
  // höjd några dagar gamla – och låt Trafikverket + registret vara färska.
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8'))
    const reused = (prev.stations ?? prev)
      .filter((s) => s.source === 'osm')
      // Nya undantag i EXCLUDED_OSM_ELEMENTS ska slå igenom även när Overpass
      // är nere (12 okt 2026: Kullaberg och Torekov låg kvar i seeden för att
      // förra körningens OSM-stationer återanvändes ofiltrerade).
      .filter((s) => {
        const m = /^osm-(node|way|relation)-(\d+)$/.exec(s.id ?? '')
        return !(m && EXCLUDED_OSM_ELEMENTS.has(`${m[1]}/${m[2]}`))
      })
      // Härledda namn ("Sopstation vid Skeppsbron") återställs till grundnamnet
      // så att namnsättningen nedan gör om dem – annars lades ett nytt "vid"
      // till för varje synk med återanvänd data (granskning 14 okt 2026).
      .map((s) => (s.nameFrom === 'nearby' && s.name.includes(' vid ')
        ? { ...s, name: s.name.slice(0, s.name.indexOf(' vid ')), nameFrom: undefined }
        : s))
      // Nya rader i OSM_FACILITY_OVERRIDES ska också slå igenom (granskning
      // 14 okt 2026). Läggs på före gasolfiltret nedan, som i fetchOsmFrom.
      .map((s) => {
        const m = /^osm-(node|way|relation)-(\d+)$/.exec(s.id ?? '')
        const override = m && OSM_FACILITY_OVERRIDES.get(`${m[1]}/${m[2]}`)
        if (!override || !s.services.includes('gasol')) return s
        return { ...s, facilities: [...new Set([...(s.facilities ?? []), ...override])] }
      })
      // Samma regel som i fetchOsmFrom: gasol utan verifierad byte/påfyllning
      // (ren fuel:lpg-mack) ska inte hänga kvar från en äldre seed.
      .map((s) => {
        if (!s.services.includes('gasol')) return s
        const verified = (s.facilities ?? []).some((f) => f === 'gasol_byte' || f === 'gasol_pafyllning')
        if (verified) return s
        const services = s.services.filter((x) => x !== 'gasol')
        return services.length ? { ...s, services } : null
      })
      .filter(Boolean)
      // Grå-listan ska gälla även återanvända stationer från förra seeden.
      // Idempotent: förra körningen kan redan ha flyttat tjänster till
      // unverifiedServices (eller satt unverified) – återställ först
      // originaltjänsterna (services ∪ unverifiedServices; för OSM-platser
      // kommer unverifiedServices bara från grå-listan) och tillämpa sedan
      // listan på nytt. Annars tappades t.ex. vatten när listan utökades.
      .map((s) => {
        const m = /^osm-(node|way|relation)-(\d+)$/.exec(s.id ?? '')
        if (!m) return s
        const original = [...new Set([...s.services, ...(s.unverifiedServices ?? [])])]
        const { unverifiedServices: _u, unverified: _v, ...rest } = s
        const unv = applyUnverifiedOverride(`${m[1]}/${m[2]}`, original)
        // Säsongslistan likaså (13 okt 2026: 50 nya rader slog inte igenom när
        // Overpass svarade 502). Som i fetchOsmFrom fyller den bara tomma fält.
        const so = OSM_SEASON_OVERRIDES.get(`${m[1]}/${m[2]}`)
        const seasonFields = so
          ? { openingHours: rest.openingHours ?? so.openingHours, season: rest.season ?? so.season }
          : {}
        return { ...rest, ...unv, ...seasonFields }
      })
    if (reused.length) {
      console.warn(`Återanvänder ${reused.length} OSM-stationer från förra seeden (${prev.updatedAt ?? 'okänt datum'}).`)
      stations.push(...reused)
      sources.osm.count = reused.length
    }
  } catch (e) {
    console.error(`Kunde inte återanvända förra seeden: ${e.message}`)
  }
}

const trvKey = process.env.TRV_API_KEY
if (trvKey) {
  try {
    const tv = await fetchTrafikverket(trvKey)
    console.log(`Trafikverket: ${tv.length} rastplatser`)
    stations.push(...tv)
    sources.trafikverket.count = tv.length
  } catch (err) {
    console.error(`FEL: Trafikverket-hämtning misslyckades – reserven används: ${err.message}`)
    sources.trafikverket = { fresh: false, at: prevSourceAt('trafikverket'), count: 0, error: String(err.message).slice(0, 200) }
    // Samma reserv som för OSM: återanvänd förra seedens rastplatser hellre
    // än att 300+ platser försvinner för att API:t svarade fel en gång.
    try {
      const prev = JSON.parse(await readFile(OUT, 'utf8'))
      const reused = (prev.stations ?? prev).filter((s) => s.source === 'trafikverket')
      if (reused.length) {
        console.warn(`Återanvänder ${reused.length} Trafikverket-platser från förra seeden.`)
        stations.push(...reused)
        sources.trafikverket.count = reused.length
      }
    } catch {
      /* ingen tidigare seed */
    }
  }
} else {
  console.log('TRV_API_KEY ej satt – hoppar över Trafikverket.')
  // Ingen nyckel = inga rastplatser alls i seeden; ingen gissad ålder.
  sources.trafikverket = { fresh: false, at: prevSeed?.sources?.trafikverket?.at ?? null, count: 0, error: 'TRV_API_KEY saknas' }
}

let curatedCount = 0
let curatedTotal = 0
try {
  curatedTotal = JSON.parse(await readFile(CURATED, 'utf8')).length
  const curated = await fetchCurated()
  curatedCount = curated.length
  console.log(`Register: ${curated.length} av ${curatedTotal} poster kom med`)
  stations.push(...curated)
} catch (err) {
  console.error(`Avbryter: registret kunde inte läsas/geokodas (${err.message}) – behåller befintlig seed-fil.`)
  process.exit(1)
}
if (process.env.REGISTER_DROPPED) {
  await writeFile(process.env.REGISTER_DROPPED, JSON.stringify(dropped, null, 1))
}
// Golv för registret: tappas mer än 5 % av posterna är något fel (t.ex. alla
// geokodare nere och tom cache) – skriv då inte över seeden.
if (curatedTotal > 0 && curatedCount < curatedTotal * 0.95) {
  console.error(`Avbryter: bara ${curatedCount} av ${curatedTotal} registerposter kom med (golv 95 %). Behåller befintlig seed-fil.`)
  process.exit(1)
}

// Skydd mot att en tillfällig störning hos en källa (t.ex. att alla tre
// Overpass-speglar är nere samtidigt) skriver över en bra seed-fil med en
// kraftigt ofullständig – hände 31 aug 2026 (5414 → 846 platser, alla
// OSM-speglar svarade 5xx samtidigt). Jämför mot den redan committade filen
// och avbryter (utan att skriva) om resultatet ser trasigt ut.
let previousCount = 0
try {
  const prev = JSON.parse(await readFile(OUT, 'utf8'))
  previousCount = (prev.stations ?? prev).length
} catch {
  /* ingen tidigare fil (första körningen) – inget att jämföra mot */
}

if (stations.length === 0) {
  console.error('Ingen data hämtad – behåller befintlig seed-fil.')
  process.exit(1)
}
if (previousCount > 0 && stations.length < previousCount * 0.5) {
  console.error(
    `Avbryter: resultatet (${stations.length} platser) är mer än hälften mindre än förra körningen (${previousCount}). ` +
      'Troligen ett tillfälligt fel hos en datakälla (t.ex. alla Overpass-speglar nere samtidigt) snarare än en ' +
      'verklig minskning. Behåller befintlig seed-fil i stället för att skriva över med ofullständig data.',
  )
  process.exit(1)
}

try {
  await nameGenericStations(stations)
} catch (err) {
  console.warn(`Namngivning av namnlösa platser misslyckades: ${err.message}`)
}

try {
  await assignMunicipalities(stations)
} catch (err) {
  console.warn(`Kommuntilldelning misslyckades: ${err.message}`)
}

try {
  await enrichImagesFromCommons(stations)
} catch (err) {
  console.warn(`Commons-bildberikning misslyckades: ${err.message}`)
}

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
await writeFile(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), sources, stations }),
)
console.log(`Skrev ${stations.length} stationer till public/data/stations-seed.json`)
