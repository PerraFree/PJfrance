import type { LatLngBounds } from 'leaflet'
import type { ServiceType, Station } from '../types'

// OSM-element som bekräftats felaktiga/dubbletter av Per (fältkoll) men som
// vi inte kan rätta i själva OpenStreetMap härifrån. Speglar samma lista i
// scripts/sync-stations.mjs – ändra ALLTID båda.
const EXCLUDED_OSM_ELEMENTS = new Set([
  // "Tömningsstation" (namnlös nod) ~106 m från Borås Camping Saltemad –
  // Per bekräftade aug 2026 att det bara finns EN tömning där.
  // https://www.openstreetmap.org/node/12907898116
  'node/12907898116',
  // Ställplats Fengersfors (Knarrbysjön): OSM-wayen är taggad med gråvatten- och
  // latrintömning, men ställplatsens egen sida (fengersfors.se/fengersfors-stallplats)
  // och Västsverige säger uttryckligen att man INTE kan tömma vare sig gråvatten
  // eller latrin där – bara färskvatten. Registerposten täcker platsen (okt 2026).
  'way/708866226',
  // Gasol-utredning sep 2026 (research-verifierat, se CLAUDE.md):
  // "E.ON Nobelv." – tillhör E.ON:s huvudkontor, inte en publik gasolplats.
  // https://www.openstreetmap.org/node/253856437
  'node/253856437',
  // "FordonsGas Varberg" – fel bränsletyp: CNG/biogas, inte gasol/LPG.
  // https://www.openstreetmap.org/node/1329458220
  'node/1329458220',
  // "Härnösand Fordonsgas CNG" – samma fel, CNG/biogas.
  // https://www.openstreetmap.org/way/622172659
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
// Speglar scripts/sync-stations.mjs – ändra ALLTID båda.
const OSM_FACILITY_OVERRIDES = new Map<string, string[]>([
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
  ['node/247135141', ['gasol_byte']], // Preem, Västra Frölunda
  ['way/821117027', ['gasol_byte']], // OKQ8, Västra Frölunda
  ['node/12258765678', ['gasol_byte']], // OKQ8, Stockholm
  ['way/222140864', ['gasol_byte']], // Circle K Bandhagen Högdalen
])

// Öppettider/säsong-svep sep 2026: OSM saknar opening_hours/seasonal-tagg för
// dessa, men research hittade ett konkret citat från kommunen/anläggningens
// egen sida (se docs/svep-logg.md). Fyller bara i det OSM SAKNAR – går aldrig
// före en riktig opening_hours/seasonal-tagg. Speglar scripts/sync-stations.mjs
// – ändra ALLTID båda.
const OSM_SEASON_OVERRIDES = new Map<string, { season?: Station['season']; openingHours?: string }>([
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
])

// Gör angivna OSM-tjänster obekräftade (grå) på platser där anläggningens
// egen sajt eller kommunen inte nämner tjänsten (område D-kontroller). OSM-
// taggen kan vara riktig – därför grått, inte borttaget. Blir alla tjänster
// grå markeras hela platsen som obekräftad. Speglas i scripts/sync-stations.mjs – ändra ALLTID
// båda (check-mirrors.mjs stoppar deployen annars).
const OSM_UNVERIFIED_OVERRIDES = new Map<string, ServiceType[]>([
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
  ['way/198088418', ['gravatten', 'latrin', 'vatten']], // Gällivare Camping – ny sajt utan tömningsinfo (kontroll okt 2026)
  ['node/842323095', ['gravatten', 'latrin', 'vatten']], // Stenbräcka/Hägnans Camping – egen sajt tyst (kontroll okt 2026)
  ['node/3668991153', ['vatten']], // Måviken Camping – ingen källa (OSM-sajten är ett rehabcenter) (kontroll okt 2026)
  ['way/432760423', ['vatten']], // Avasund Fiske & Camp – ingen källa (kontroll okt 2026)
  ['way/808435179', ['gravatten', 'latrin']], // Stöde Camping – egen sajt nämner ingen tömning (kontroll okt 2026)
  ['way/175010595', ['gravatten']], // Hoverbergs Camping – uttömmande servicelista saknar gråvatten (kontroll okt 2026)
  ['way/245336774', ['gravatten']], // Hammarstrands Camping – gråvatten nämns inte, recension säger ej tillåtet (kontroll okt 2026)
])

function applyUnverifiedOverride(
  key: string,
  services: ServiceType[],
): { services: ServiceType[]; unverifiedServices?: ServiceType[]; unverified?: boolean } {
  const unv = OSM_UNVERIFIED_OVERRIDES.get(key)
  if (!unv) return { services }
  const hit = services.filter((s) => unv.includes(s))
  if (!hit.length) return { services }
  const rest = services.filter((s) => !unv.includes(s))
  if (!rest.length) return { services, unverified: true }
  return { services: rest, unverifiedServices: hit }
}

// Flera speglar – om en är överbelastad (429/504) provas nästa.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

// Se säkringen i fetchOsmStations: pausar live-hämtning när alla speglar felar.
let failedFetches = 0
let backoffUntil = 0
// Pågående hämtning – ett nytt anrop avbryter det förra (kartan har flyttats).
let currentFetch: AbortController | null = null

/** Sant för ett anrop som avbrutits av ett nyare – inget riktigt fel. */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

// Rena dricksvattennoder (amenity=drinking_water utan annan tjänst) hämtas
// bara live – synken tar inte med dem. I sammanslagningen (App.tsx dedupe)
// får de bara fylla på en befintlig plats, aldrig bli den som behålls.
const drinkingWaterOnlyIds = new Set<string>()
export function isDrinkingWaterOnly(s: Pick<Station, 'id' | 'source'>): boolean {
  return s.source === 'osm' && drinkingWaterOnlyIds.has(s.id)
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function servicesFromTags(tags: Record<string, string>): ServiceType[] {
  const services = new Set<ServiceType>()

  // Dedikerade tömningsstationer
  if (tags.amenity === 'sanitary_dump_station') {
    services.add('gravatten')
    services.add('latrin')
  }
  // Platser (rastplatser, campingar, gästhamnar, mackar …) som erbjuder tömning
  const sds = tags.sanitary_dump_station
  if (sds && sds !== 'no') {
    services.add('gravatten')
    services.add('latrin')
  }
  if (tags['sanitary_dump_station:grey_water'] === 'no') services.delete('gravatten')
  if (tags['sanitary_dump_station:chemical_toilet'] === 'no') services.delete('latrin')

  if (
    tags.amenity === 'water_point' ||
    tags.water_point === 'yes' ||
    tags.amenity === 'drinking_water' ||
    tags.drinking_water === 'yes'
  ) {
    services.add('vatten')
  }

  // Övernattning
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
  // Speglas i scripts/sync-stations.mjs.
  const nameIsPureStallplats =
    tags.tourism === 'camp_site' &&
    /st[äa]llplats|stellplatz|husbilsplats/i.test(tags.name ?? '') &&
    !/camping|camp\b/i.test(tags.name ?? '')
  if (nameIsPureStallplats && tags.access !== 'private' && tags.access !== 'no') {
    services.add('stallplats')
  }
  if (tags.tourism === 'camp_site' && !nameIsPureStallplats) {
    // En camping räknas som ställplats om den uttryckligen tar husbil/husvagn
    // eller har husbilsinfrastruktur (el, tömning). Rena tältplatser och
    // privata/stängda platser filtreras bort – för BÅDA tjänsterna.
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
  // Golfklubbar som uttryckligen tillåter husbil/husvagn
  if (
    tags.leisure === 'golf_course' &&
    (tags.caravan === 'yes' ||
      tags.caravan === 'designated' ||
      tags.motorhome === 'yes' ||
      tags.motorhome === 'designated')
  ) {
    services.add('stallplats')
  }

  // Gasol/LPG-påfyllning
  if (
    tags['fuel:lpg'] === 'yes' ||
    tags.shop === 'gas' ||
    tags['service:vehicle:lpg'] === 'yes'
  ) {
    services.add('gasol')
  }

  // Sopor: sopstationer, återvinningscentraler och platser (rastplatser,
  // ställplatser …) som uttryckligen har sopkärl/avfallshantering.
  // Glas-/pappersigloos (recycling_type=container) tas inte med – där får
  // man inte slänga hushållssopor.
  if (
    tags.amenity === 'waste_disposal' ||
    tags.waste_disposal === 'yes' ||
    (tags.highway === 'rest_area' && (tags.waste_basket === 'yes' || tags.bin === 'yes'))
  ) {
    services.add('sopor')
  }
  // Återvinningscentraler (ÅVC) är en EGEN kategori sedan okt 2026 – de tar
  // sällan emot hushållssopor och ska inte blandas med sopstationerna.
  if (tags.amenity === 'recycling' && tags.recycling_type === 'centre') {
    services.add('atervinning')
  }

  return [...services]
}

/** Beskriver vilken sorts plats stationen ligger på, för namn och popup. */
function placeKind(tags: Record<string, string>): string | undefined {
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
  if (tags.amenity === 'parking') return 'Ställplats (parkering för husbil)'
  if (tags.leisure === 'marina' || tags.mooring) return 'Gästhamn/marina'
  if (tags.shop === 'gas') return 'Gasolförsäljning'
  if (tags.amenity === 'fuel') return 'Drivmedelsstation'
  if (tags.amenity === 'sanitary_dump_station') return 'Tömningsstation'
  if (tags.amenity === 'water_point') return 'Vattenpåfyllning'
  if (tags.amenity === 'drinking_water') return 'Dricksvatten'
  if (tags.amenity === 'recycling' && tags.recycling_type === 'centre')
    return 'Återvinningscentral'
  if (tags.amenity === 'waste_disposal') return 'Sopstation'
  return undefined
}

/**
 * Många svenska sanitary_dump_station i OSM är sugtömningsstationer för
 * fritidsbåtar ute i vattnet – oanvändbara för husbil/husvagn.
 */
function isBoatStation(tags: Record<string, string>): boolean {
  // OBS: motorhome=no exkluderas inte längre – en husvagns-/kassettplats som
  // inte tar just husbil är fortfarande relevant för appens användare.
  return (
    tags.waterway === 'sanitary_dump_station' ||
    'seamark:type' in tags ||
    tags['sanitary_dump_station:suction'] === 'yes' ||
    tags.boat === 'yes'
  )
}

function seasonFromTags(tags: Record<string, string>): Station['season'] {
  if (tags.seasonal === 'no') return 'year-round'
  if (tags.seasonal === 'yes') return 'seasonal'
  if (tags.opening_hours === '24/7') return 'year-round'
  return undefined
}

/** Foto-URL från OSM-taggar: wikimedia_commons (File:…) eller image (https).
 *  Speglas i scripts/sync-stations.mjs – ändra alltid båda. */
function imageFromTags(tags: Record<string, string>): string | undefined {
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

function toStation(el: OverpassElement): Station | null {
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
  // Speglas i scripts/sync-stations.mjs – ändra ALLTID båda.
  const services = servicesFromTags(tags).filter(
    (s) => s !== 'gasol' || tags.shop === 'gas' || override,
  )
  if (services.length === 0) return null
  if (tags.amenity === 'drinking_water' && services.length === 1 && services[0] === 'vatten') {
    drinkingWaterOnlyIds.add(`osm-${el.type}-${el.id}`)
  }
  const kind = placeKind(tags)
  const amenity = amenityFields(tags)
  if (override) amenity.facilities = [...new Set([...(amenity.facilities ?? []), ...override])]
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
        ? tags.charge ?? 'Avgift'
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

/** Plockar ut allt som finns på platsen samt kontaktuppgifter ur OSM-taggar. */
function amenityFields(tags: Record<string, string>) {
  const facilities = facilitiesFromTags(tags)
  const payment = paymentFromTags(tags)
  return {
    facilities: facilities.length ? facilities : undefined,
    payment: payment.length ? payment : undefined,
    address: addressFromTags(tags),
    capacity:
      tags.capacity ?? tags['capacity:pitches'] ?? tags['capacity:caravans'] ?? tags['capacity:persons'],
    maxstay: tags.maxstay,
    operator: tags.operator,
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
  }
}

const yes = (v?: string) => v === 'yes' || v === 'designated' || v === 'customers'

/** Nycklar (matchar FACILITY_LABELS) för exakt vad som finns på platsen. */
export function facilitiesFromTags(tags: Record<string, string>): string[] {
  const f: string[] = []
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
  // shop=gas/fuel är LPG-/drivmedelskällan – inte en butik; shop=no är ingen butik.
  if (tags.shop && !['no', 'gas', 'fuel'].includes(tags.shop)) f.push('butik')
  // Gasol: shop=gas är tillförlitligt byte-tub (återförsäljare). fuel:lpg på
  // bensinstationer är INTE tillförlitligt för byte/påfyllning (research-
  // verifierat sep 2026, se OSM_FACILITY_OVERRIDES ovan + CLAUDE.md).
  // Speglas i scripts/sync-stations.mjs.
  if (tags.shop === 'gas') f.push('gasol_byte')
  if (yes(tags.lit)) f.push('belyst')
  if (yes(tags.wheelchair)) f.push('tillganglig')
  if (yes(tags.motorhome)) f.push('husbil')
  if (yes(tags.caravan) || yes(tags.caravans)) f.push('husvagn')
  if (yes(tags.tents)) f.push('talt')
  return f
}

export function paymentFromTags(tags: Record<string, string>): string[] {
  const p: string[] = []
  if (yes(tags['payment:cash']) || yes(tags['payment:coins'])) p.push('Kontant')
  if (
    yes(tags['payment:cards']) ||
    yes(tags['payment:credit_cards']) ||
    yes(tags['payment:debit_cards'])
  )
    p.push('Kort')
  if (yes(tags['payment:swish'])) p.push('Swish')
  if (yes(tags['payment:app'])) p.push('App')
  return p
}

/** Bygger en läsbar adress ur OSM:s addr-taggar (om de finns). */
function addressFromTags(tags: Record<string, string>): string | undefined {
  const street = tags['addr:street']
  const num = tags['addr:housenumber']
  const place =
    tags['addr:city'] ?? tags['addr:place'] ?? tags['addr:municipality'] ?? tags['addr:hamlet']
  const line1 = street ? `${street}${num ? ' ' + num : ''}` : ''
  const addr = [line1, place].filter(Boolean).join(', ')
  return addr || undefined
}

/** Hämtar stationer från OpenStreetMap inom kartvyns gränser. */
export async function fetchOsmStations(bounds: LatLngBounds): Promise<Station[]> {
  const bbox = [
    bounds.getSouth(),
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast(),
  ].join(',')
  const query = `
    [out:json][timeout:25];
    (
      nwr["amenity"="sanitary_dump_station"](${bbox});
      nwr["sanitary_dump_station"]["sanitary_dump_station"!="no"](${bbox});
      nwr["amenity"="water_point"](${bbox});
      node["amenity"="drinking_water"](${bbox});
      nwr["tourism"="caravan_site"](${bbox});
      nwr["tourism"="camp_site"](${bbox});
      nwr["leisure"="golf_course"]["caravan"~"^(yes|designated)$"](${bbox});
      nwr["leisure"="golf_course"]["motorhome"~"^(yes|designated)$"](${bbox});
      nwr["amenity"="fuel"]["fuel:lpg"="yes"](${bbox});
      nwr["shop"="gas"](${bbox});
      nwr["amenity"="waste_disposal"](${bbox});
      nwr["amenity"="recycling"]["recycling_type"="centre"](${bbox});
      nwr["highway"="rest_area"](${bbox});
      nwr["amenity"="parking"]["motorhome"~"^(yes|designated)$"](${bbox});
      nwr["amenity"="parking"]["caravan"~"^(yes|designated)$"](${bbox});
    );
    out center tags;
  `
  // Ett nytt anrop avbryter det föregående – svaret för en gammal kartvy
  // behövs inte och ska inte uppta nätet (eller räknas som fel nedan).
  currentFetch?.abort()
  const ctrl = new AbortController()
  currentFetch = ctrl
  const aborted = () => {
    const e = new Error('Overpass-hämtningen avbröts av en nyare')
    e.name = 'AbortError'
    return e
  }
  try {
    // Säkring: när Overpass är nere tuggade appen 3 speglar × 12 s vid VARJE
    // kartrörelse. Efter två helt misslyckade hämtningar pausas live-flödet i
    // fem minuter – seed-datan täcker hela Sverige under tiden.
    if (Date.now() < backoffUntil) throw new Error('Overpass pausad (backoff)')
    let lastError: unknown
    for (const url of OVERPASS_MIRRORS) {
      if (ctrl.signal.aborted) throw aborted()
      // Kort timeout per spegel så en trög spegel inte får appen att kännas
      // långsam; avbryts även när ett nyare anrop startar.
      const attempt = new AbortController()
      const onAbort = () => attempt.abort()
      ctrl.signal.addEventListener('abort', onAbort)
      const timer = setTimeout(() => attempt.abort(), 12_000)
      try {
        const res = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: attempt.signal,
        })
        if (!res.ok) throw new Error(`Overpass svarade ${res.status}`)
        const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string }
        // Overpass kan svara 200 med ett AVHUGGET resultat och en `remark`
        // ("Query timed out …") – räkna det som fel och prova nästa spegel,
        // precis som scripts/sync-stations.mjs gör. Ändra ALLTID båda.
        if (json.remark && /timed out|runtime error|out of memory|load too high/i.test(json.remark)) {
          throw new Error(`avhugget svar: ${json.remark}`)
        }
        failedFetches = 0
        return (json.elements ?? []).map(toStation).filter((s): s is Station => s !== null)
      } catch (err) {
        if (ctrl.signal.aborted) throw aborted()
        lastError = err
      } finally {
        clearTimeout(timer)
        ctrl.signal.removeEventListener('abort', onAbort)
      }
    }
    // Bara riktiga misslyckanden räknas – ett avbrutet anrop har kastat ovan.
    failedFetches++
    if (failedFetches >= 2) backoffUntil = Date.now() + 5 * 60_000
    throw lastError instanceof Error ? lastError : new Error('Overpass ej nåbar')
  } finally {
    if (currentFetch === ctrl) currentFetch = null
  }
}
