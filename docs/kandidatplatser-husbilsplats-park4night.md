# Kandidatplatser från husbilsplats.se + park4night.com (aug 2026)

Rådata från ett nationellt discovery-svep (7 parallella agenter, en per landsdel)
som sökte husbilsplats.se och park4night.com/en efter ställplatser/campingar som
helt saknas i appens register. **Inget här är tillagt i appen** – det är en
research-logg att jobba vidare från, inte en to-do-lista att blint klistra in.

## Metod och begränsningar (viktigt att läsa innan ni jobbar vidare)

- WebFetch är blockerat mot båda domänerna i sandboxen som körde svepet, så all
  research skedde via WebSearch (`allowed_domains`) – dvs sökmotorträffar/AI-
  sammanfattningar av sidorna, inte de faktiska sidorna. Exakta koordinater och
  tjänstedetaljer saknas därför för många rader.
- **Sessionens delade WebSearch-budget (200 sökningar) tog slut mitt i svepet
  för flera agenter.** Följande är HELT eller DELVIS ogenomsökta och behöver en
  ny körning med färsk budget:
  - **Kronoberg, Örebro, Värmland** – noll sökningar gjorda, helt ogenomsökta.
  - Öland (Borgholm/Mörbylånga), Emmaboda/Torsås/Högsby, samt Gotlands mindre
    orter (Slite/Klintehamn/Hemse/Fårösund/Burgsvik) – delvis ogenomsökta.
  - Västra Götaland/Halland: ~35 kommuner helt osökta – Kungälv, Stenungsund,
    Lysekil, Orust, Tjörn, Mark, Ulricehamn, Vara, Skara, Dalsland
    (Åmål/Bengtsfors/Mellerud), Ale, Lerum, Partille, Mölndal, Härryda, Tibro,
    Tidaholm, Karlsborg, Hjo, Töreboda, Essunga, Grästorp, Götene, Herrljunga,
    Vårgårda, Svenljunga, Tranemo, Bollebygd, Munkedal, Sotenäs, Färgelanda,
    Dals-Ed, Gullspång, Lilla Edet, Hylte m.fl.
- **"Oberoende källa"-kolumnen nedan är INTE tillförlitlig som den står** – olika
  agenter tolkade uppdraget olika (en del räknade husbilsplats.se som
  tillräckligt, andra krävde en tredje källa). Regeln som faktiskt gäller för
  tillägg (bekräftad med Per aug 2026): **husbilsplats.se och park4night.com
  räknas INTE som oberoende källor ens tillsammans** – kräver en anläggnings
  egen webbplats, en kommunsida, eller liknande primärkälla innan tillägg.
  Bygg alltså inte vidare på kolumnen utan verifiera på nytt vid behov.
- En bugg upptäcktes: park4night-sökningar för Västernorrland/Jämtland fick i
  flera fall en **identisk, återanvänd AI-sammanfattning** ("ny husbilsplats
  sedan sommaren 2022, utsikt över sjön Jättendal, X platser, servicehus") för
  helt orelaterade orter (Sundsvall, Härnösand, Sollefteå, Köpmanholmen) –
  dessa rader är trolig sökmotorbrus, inte faktiskt sidinnehåll. Flaggade
  nedan, lita inte på dem utan manuell koll av park4night-sidan.
- Redan dedupat mot registret (aug 2026): **Trosa Gästhamn, Kukkolaforsens
  camping, Kattisavans Camping, Meselefors Vandrarhem & Camping** fanns redan.
  **Galvens Bygdegård ställplats** och **Massarbäcksgårdens ställplatser**
  kompletterades med bekräftad färskvattenpåfyllning. **Ragvaldsträsk
  ställplats** lades till som ny post (stallplats+vatten). Se
  `scripts/curated-places.json`. Övriga ~465 rader nedan är overifierade.

## Nästa steg

1. Kör en ny svepomgång riktad specifikt mot de helt ogenomsökta länen ovan
   (Kronoberg/Örebro/Värmland) och de ~35 kommunerna i Västra
   Götaland/Halland/Bohuslän/Dalsland/Sjuhärad/Skaraborg.
2. För kandidater nedan som verkar lovande (tydligt citat om gråvatten/latrin/
   vatten): sök upp en oberoende primärkälla (anläggningens egen sajt,
   kommunsida, nyhetsartikel) innan tillägg – samma "verifiera innan du lägger
   till"-princip som resten av registret.
3. "Golfklubb med övernattning"-raderna är kandidater för ett separat
   golfklubbssvep (Per har redan efterfrågat detta, se CLAUDE.md-backloggen).
4. Rader märkta "mall-text"/misstänkt AI-brus ska kollas manuellt på
   ursprungssidan innan de tas på allvar.

---

## Norrbotten + Västerbotten

~58 unika platser. Endast Kukkolaforsen (redan i registret) och Ragvaldsträsk
(nu tillagd) hade oberoende bekräftelse.

| Namn | Ort | Koordinat | Tjänster (citat/sammanfattning) | Källa/URL | Oberoende källa? |
|---|---|---|---|---|---|
| Norra hamnen i Luleå | Luleå | – | ej specificerat | husbilsplats.se/locations/norra-hamnen-i-lulea/ | Nej |
| Ställplats Torget | Luleå | – | ej specificerat | husbilsplats.se/locations/stallplats-torget/ | Nej |
| Husvagnscenter i Luleå | Luleå | – | ej specificerat | husbilsplats.se/locations/husvagnscenter-i-lulea/ | Nej |
| Luleå Golfklubb | Luleå | – | husbilsparkering/övernattning vid golf | husbilsplats.se/rest-area/lulea-golfklubb/ | Nej |
| Brändö Konferens | Luleå | – | ej specificerat | husbilsplats.se/locations/brando-konferens/ | Nej |
| Luleå – Norrströmsvägen 92 | Luleå | – | vid bungalowområde | park4night.com/fr/place/325966 | Nej |
| Skellefteå Camping | Skellefteå | 64.76141, 20.975305 | camping | husbilsplats.se/locations/skelleftea-camping/ | Nej |
| Skellefteå Campus | Skellefteå | 64.7435, 20.9571 | ej specificerat | husbilsplats.se/rest-area/skelleftea-campus/ | Nej |
| Rastplats Tjärn | Skellefteå (E4) | 64.731727, 20.975189 | ej specificerat | husbilsplats.se/locations/rastplats-tjarn/ | Nej |
| Skellefteå – E4 | Skellefteå | – | "chemical toilet cleaning, no water draining" | park4night.com/en/place/38187 | Nej |
| Skellefteå – Gymnasievägen 30 | Skellefteå | – | "water and air available" | park4night.com/en/place/396986 | Nej |
| Skellefteå – Nöppelbergsvägen 1 | Skellefteå | – | bensinstation, vatten/luft | park4night.com/en/place/162444 | Nej |
| Skelleftehamn (privat aire) | Skelleftehamn | – | "180 SEK: el, tvätt, dusch, bastu" | park4night.com/lieu/124596/ | Nej |
| Umeå Golfklubb | Umeå (Holmsund) | – | el, dusch, övernattning vid golf | husbilsplats.se/rest-area/umea-golfklubb/ | Nej |
| Fritids Metropolen | Umeå (Degernäs) | – | ej specificerat | husbilsplats.se/rest-area/fritids-metropolen/ | Nej |
| Umeå – Järnvägsallén | Umeå | – | "XXL motorhome area" | park4night.com/en/place/131083 | Nej |
| Luossavaara Fritidsområde | Kiruna | – | café, toaletter, grillplats | husbilsplats.se/locations/kiruna-luossavaara-fritidsomrade/ | Nej |
| Nikkaluokta Sarri AB | Kiruna (Nikkaluokta) | – | el, färskvatten, toaletter, dusch, avfall | husbilsplats.se/rest-area/nikkaluokta-sarri-ab/ | Nej |
| Piteå Golfklubb | Piteå | 65.31883, 21.53133 | golfklubb | husbilsplats.se/locations/pitea-golfklubb/ | Nej |
| Pite Havsbad | Piteå | 65.233612, 21.534051 | ej specificerat | husbilsplats.se/locations/pite-havsbad/ | Nej |
| Renöhamn | Piteå | – | "el, tömningsstation, sopkärl, hund ok" | husbilsplats.se/husbilsplatser/stallplatser-i-norrbotten/ | Nej |
| Hemlunda Camping | Piteå | 65.318295, 21.387306 | ej specificerat | husbilsplats.se/rest-area/hemlunda-camping/ | Nej |
| Piteå – Oktanvägen 4 | Piteå | – | gasolpåfyllning | park4night.com/en/place/125422 | Nej |
| Bodele ställplats | Boden | – | "el, tömningsstation" | husbilsplats.se/locations/bodele-stallplats/ | Nej |
| Ställplats Wassara | Gällivare | 67.135963, 20.643392 | "el, avfall, hund ok" | husbilsplats.se/rest-area/stallplats-wassara/ | Nej |
| Lycksele Golfklubb | Lycksele | – | "el, dusch" | husbilsplats.se/rest-area/lycksele-golfklubb/ | Nej |
| Haparanda hamn | Haparanda | – | ej specificerat | husbilsplats.se/locations/haparanda-hamn/ | Nej |
| Haparanda Golfklubb | Haparanda | – | dusch | husbilsplats.se/rest-area/haparanda-golfklubb/ | Nej |
| Lilla Stigen Ställplatser (Haparanda) | Haparanda | – | "el, färskvatten, gråvatten/kassettömning" | husbilsplats.se/rest-area/lilla-stigen-stallplatser/ | Nej |
| Haparanda – Riekkola 7 | Haparanda | – | "34 platser, eget vatten/el, sanitetsbyggnad" | park4night.com/en/place/255895 | Nej |
| Kalix Camping | Kalix | – | ej specificerat | husbilsplats.se/locations/kalix-camping/ | Nej |
| Kalix Golfklubb | Kalix | – | golfklubb | husbilsplats.se/locations/kalix-golfklubb/ | Nej |
| Camp Frevisören Kalix Havsbad | Kalix | – | ej specificerat | husbilsplats.se/locations/camp-frevisoren-kalix-havsbad/ | Nej |
| Kamlunge Camping | Kalix | – | "el, färskvatten, wc, dusch, kassettömning" | husbilsplats.se/rest-area/kamlunge-camping/ | Nej |
| Arctic Camp Jokkmokk | Jokkmokk | 66.594361, 19.892316 | "el, färskvatten, wc, dusch, avfall" | husbilsplats.se/rest-area/arctic-camp-jokkmokk/ | Nej |
| Skabram Camping | Jokkmokk | 66.606186, 19.762415 | "el, färskvatten, wc, dusch, avfall, wifi" | husbilsplats.se/rest-area/skabram-camping/ | Nej |
| Polcirkeln (Fiskecamp) | Jokkmokk | 66.550294, 19.765168 | ej specificerat | husbilsplats.se/rest-area/polcirkeln/ | Nej |
| Laponia rastplats | Jokkmokk (E45) | 66.642335, 19.824492 | ej specificerat | husbilsplats.se/locations/laponia-rastplats/ | Nej |
| Lippi Stugby | Arjeplog | 66.0567767, 17.7906568 | "toaletter, dusch, avfall, hund ok, wifi" | husbilsplats.se/locations/lippi-stugby/ | Nej |
| Kraja Camping | Arjeplog | 66.050067, 17.862632 | ej specificerat | husbilsplats.se/rest-area/kraja-camping/ | Nej |
| Camp Gielas | Arvidsjaur | 65.582672, 19.190714 | ej specificerat | husbilsplats.se/rest-area/camp-gielas/ | Nej |
| Vittjåkk Camping | Arvidsjaur | 65.578627, 19.0517 | ej specificerat | husbilsplats.se/locations/vittjakk-camping/ | Nej |
| Gråträsk byagården | Arvidsjaur | 65.486106, 19.796164 | rastplats vid bygdegård | husbilsplats.se/rest-area/gratrask-byagarden/ | Nej |
| Arvidsjaurs Golfklubb | Arvidsjaur | – | golfklubb | husbilsplats.se/rest-area/arvidsjaurs-golfklubb/ | Nej |
| Storumans Bil & El | Storuman | – | ej specificerat | husbilsplats.se/locations/storumans-bil-el/ | Nej |
| Storumans camping | Storuman | – | "75 platser" | husbilsplats.se/rest-area/storumans-camping/ | Nej |
| Kolgårdens Stugby & Camping | Vilhelmina | 64.64954, 16.591256 | ej specificerat | husbilsplats.se/rest-area/kolgardens-stugby-camping/ | Nej |
| Vojmåns rastplats | Vilhelmina | – | avfallshantering | husbilsplats.se/rest-area/tags/rastplats/ | Nej |
| Trafikverkets rastplats AC12 | Vilhelmina (Meselefors) | – | "tömningsstation, avfall" | husbilsplats.se/rest-area/tags/rastplats/ | Nej |
| Saiva Camping & Stugby | Vilhelmina | – | "gråvattentömning + färskvatten, 80 SEK" | park4night.com/en/place/78291 | Nej |
| Sorsele Camping & Vandrarhem | Sorsele | 65.534201, 17.526112 | "el, färskvatten, wc, dusch, avfall, kassettömning" | husbilsplats.se/rest-area/sorsele-camping-vandrarhem/ | Nej |
| Åsele Nya Golfklubb | Åsele | 64.1587569, 17.280728 | golfklubb | husbilsplats.se/locations/asele-nya-golfklubb/ | Nej |
| Doro Camp Lapland | Dorotea | 64.257715, 16.389753 | "60 platser, el, färskvatten, wc, dusch, avfall, gråvatten/kassettömning" | husbilsplats.se/rest-area/doro-camp-lapland/ | Nej |
| Vindelns Camping | Vindeln | – | ej specificerat | husbilsplats.se/locations/vindelns-camping/ | Nej |
| Norsträsk Camping | Vindeln | – | ej specificerat | husbilsplats.se/husbilsplatser/stallplatser-i-vasterbotten/ | Nej |
| Robertsfors Golfklubb | Robertsfors | – | "el, dusch" | husbilsplats.se/rest-area/robertsfors-golfklubb/ | Nej |
| Ångsjöns Camping | Bjurholm | – | "el, tömningsstation, sopkärl, hund ok" | husbilsplats.se/husbilsplatser/stallplatser-i-vasterbotten/ | Nej |
| Nordmalings Camping | Nordmaling | – | "el, tömningsstation, sopkärl, hund ok" | husbilsplats.se/husbilsplatser/stallplatser-i-vasterbotten/ | Nej |
| Bränna Camping | Överkalix | 66.32938, 22.835396 | ej specificerat | husbilsplats.se/rest-area/branna-camping/ | Nej |
| Överkalix Camping | Överkalix | – | ej specificerat | husbilsplats.se/husbilsplatser/stallplatser-i-norrbotten/ | Nej |
| Pajala Camping och Vandrarhem | Pajala | – | "60 platser, el, färskvatten, wc, dusch, avfall, wifi, gråvatten, kassettömning" | husbilsplats.se/rest-area/pajala-camping-och-vandrarhem/ | Nej |
| Hotell Smedjan | Pajala | – | ej specificerat | husbilsplats.se/rest-area/tags/stallplats/ | Nej |
| Älvsby folkhögskola ställplats | Älvsbyn | – | "12 platser, el, färskvatten, wc, dusch, avfall" | husbilsplats.se/rest-area/alvsby-folkhogskola/ | Nej |
| Kvarkenfisk | Täfteå (Umeå kommun) | 63.734433, 20.536594 | ej specificerat | husbilsplats.se/locations/kvarkenfisk/ | Nej |
| Fällfors Camping | Fällfors (Skellefteå kommun) | 65.126128, 20.787668 | ej specificerat | husbilsplats.se/rest-area/fallfors-camping/ | Nej |
| Ljusvattnets Camping | Bureå | 64.5445445, 21.253058 | ej specificerat | husbilsplats.se/locations/ljusvattnets-camping/ | Nej |
| Bureå Båtsällskap | Bureå | – | ej specificerat | husbilsplats.se/locations/burea-batsallskap/ | Nej |

## Västernorrland + Jämtland

~66 unika platser. Ingen med säker oberoende källa. **Varning:** flera
park4night-rader i Sundsvall/Härnösand/Sollefteå/Köpmanholmen har misstänkt
återanvänd "Jättendal"-mall-text – kolla originalsidan innan ni litar på dem.

| Namn | Ort | Koordinat | Tjänster (citat) | Källa/URL | Oberoende |
|---|---|---|---|---|---|
| Gästhamnen i Sundsvall | Sundsvall | – | "toalett, sopkärl" | husbilsplats.se/rest-area/gasthamnen-i-sundsvall | Okänt |
| Ställplats Skojarbacken | Sundsvall | – | ej specificerat | husbilsplats.se/rest-area/stallplats-skojarbacken | Okänt |
| Lilla Stigen Ställplatser | Sundsvall | – | "6 platser, el, färskvatten, gråvatten-/latrintömning" | husbilsplats.se/rest-area/lilla-stigen-stallplatser | Okänt |
| Gasoldepån i Sundsvall | Sundsvall | – | gasol | husbilsplats.se + park4night.com/en/place/87321 | Delvis (2 kataloger) |
| Sundsvall – 24 Universitetsallén | Sundsvall | 852 34 | "18 platser, el, servicehus" ⚠️ mall-text | park4night.com/en/place/552002 | Nej |
| Sundsvall – 60 Mogatan | Sundsvall | 854 60 | "16 platser, el, servicehus" ⚠️ mall-text | park4night.com/en/place/513984 | Nej |
| Sundsvall – 3 Kemivägen | Sundsvall | 854 67 | "16 platser, el, servicehus" ⚠️ mall-text | park4night.com/en/place/414354 | Nej |
| Heffners Allé (camping) | Sundsvall | 856 33 | servicehus wc/dusch/kök/tvätt | park4night.com/en/place/321703 | Okänt |
| Timrå Golfklubb | Timrå | – | husbilsparkering vid golf | husbilsplats.se/locations/timra-golfklubb | Okänt |
| Ånge camping | Ånge | – | camping | husbilsplats.se/locations/ange-camping | Okänt |
| Stall Änga | Ånge kommun | – | "gård, 200/300 kr utan/med el" | husbilsplats.se/locations/stall-anga | Okänt |
| Vikbron | Fränsta (Ånge) | – | ej specificerat | husbilsplats.se (platslista) | Okänt |
| Camp Mid Adventure | Torpshammar (Ånge) | – | "el, gråvattentömning, sopor" | husbilsplats.se (platslista) | Okänt |
| Latrintömning Härnösand | Härnösand | Jaktstigen 3 | latrintömning | husbilsplats.se/locations/latrintomning-harnosand | Okänt |
| Gästhamn Nattviken | Härnösand | – | ej specificerat | husbilsplats.se/locations/gasthamn-nattviken | Okänt |
| Gussjönorets ställplats | Härnösand | – | ej specificerat | husbilsplats.se (platslista) | Okänt |
| Husbilslandet | Härnösand-trakten | – | ej specificerat | husbilsplats.se/rest-area/husbilslandet | Okänt |
| Härnösand – 11 Storgatan | Härnösand | 871 31 | "18 platser, el, servicehus" ⚠️ mall-text | park4night.com/en/place/425888 | Nej |
| Sälstens Camping | Härnösand | 18 Sälsten | "wc, dusch, tvättmaskin, latriner, kök" | park4night.com/lieu/74618 | Okänt |
| Sollefteå Camping Risön | Sollefteå | 63.172123, 17.275846 | camping | husbilsplats.se/locations/solleftea-camping-rison | Okänt |
| Sollefteå Golfklubb | Sollefteå | – | "husbilsparkering vid golf, el" | husbilsplats.se/rest-area/solleftea-golfklubb | Okänt |
| Mista Camping | Sollefteå-trakten | – | ej specificerat | husbilsplats.se (platslista) | Okänt |
| Sollefteå – 1 Hågestavägen | Sollefteå | 881 31 | "16 platser, el, servicehus" ⚠️ mall-text | park4night.com/en/place/432693 | Nej |
| Sollefteå – Djupövägen | Sollefteå | – | "18 platser, el, servicehus" ⚠️ mall-text | park4night.com/en/place/60464 | Nej |
| Snibbens Camping/Vandrarhem | Sollefteå/Näsåker | 870 16 | ej specificerat | park4night.com/en/place/137579 | Okänt |
| Ramsele Camping | Ramsele | – | "el, toalett, hc-toalett, dusch, sopor, turistinfo" | husbilsplats.se/rest-area/ramsele-camping | Okänt |
| Ramsele naturrastplats | Ramsele | – | toalett | husbilsplats.se/locations/ramsele-naturrastplats | Okänt |
| Näsåkers Camping & Stugby | Näsåker | – | ej specificerat | husbilsplats.se/locations/nasakers-camping-stugby | Okänt |
| Junsele Djurpark & Camping | Junsele | – | ej specificerat | husbilsplats.se/locations/junsele-djurpark-camping | Okänt |
| Näs ställplats | Ångermanland (oklar ort) | – | ej specificerat | husbilsplats.se/locations/nas-stallplats | Okänt |
| Flogsta Camping | Kramfors | 62.92551, 17.757286 | camping | husbilsplats.se/locations/flogsta-camping | Okänt |
| Kramfors – 21 Kajvägen | Kramfors | 872 36 | utsikt över Ångermanälven | park4night.com/en/place/188982 | Okänt |
| Ställplats Örnsköldsvik | Örnsköldsvik | – | "el, färskvatten, toalett, hc-toalett, sopor" | husbilsplats.se/locations/stallplats-ornskoldsvik | Okänt |
| Örnsköldsviks Gästhamn | Örnsköldsvik | 63.286667, 18.708201 | "20 platser, el, färskvatten, toalett, dusch, gråvatten-/latrintömning" | husbilsplats.se + park4night.com/en/place/51004 | Delvis (2 kataloger) |
| Ställplats Örbäcken | Örnsköldsvik | – | ej specificerat | husbilsplats.se/rest-area/orbacken | Okänt |
| Köpmanholmen husbilsplats | Örnsköldsvik | – | "20 platser, el, servicehus" ⚠️ mall-text | park4night.com/lieu/192228 | Nej |
| Åviken Fly Camp | Örnsköldsvik (Åviken) | 892 92 | camping nära stranden | park4night.com/en/place/263638 | Okänt |
| Björna Camping | Björna | 63.545164, 18.621352 | camping | husbilsplats.se/rest-area/bjorna-camping | Okänt |
| Näske Lax | Bjästa | Näske 201 | "14 platser, el, färskvatten, toalett, dusch, avlopps-/gråvattentömning, latrintömning" | husbilsplats.se/rest-area/naske-lax | Okänt |
| Docksta Vandrarhem & Camping | Docksta | – | "el, färskvatten, toalett, dusch, sopor" | husbilsplats.se/locations/docksta-vandrarhem-camping | Okänt |
| Östersunds Stugby & Camping | Östersund | – | "150 platser, bokningsbar" | husbilsplats.se + park4night.com/en/place/35823 | Delvis (2 kataloger) |
| Östersund-Frösö Golfklubb | Östersund | – | husbilsparkering vid golf | husbilsplats.se/rest-area/ostersund-froso-golfklubb | Okänt |
| Mariebergsviken | Östersund | – | ej specificerat | husbilsplats.se/rest-area/mariebergsviken | Okänt |
| Ställplats Storlien | Storlien (Åre) | – | "18 platser, vissa med el" | husbilsplats.se/rest-area/stallplats-storlien | Okänt |
| Åre Camping | Åre | Säå 392 | "el, färskvatten, toalett, dusch, gråvatten-/latrintömning" | husbilsplats.se/rest-area/are-camping | Okänt |
| Rastplats Krokom | Krokom | – | "toalett, sopor, kassettömning" | husbilsplats.se/rest-area/rastplats-krokom | Okänt |
| Furusjöns Camping | Krokoms kommun | – | ej specificerat | husbilsplats.se/rest-area/furusjons-camping | Okänt |
| Bräcke Strand | Bräcke | – | "18 platser, hundar tillåtna" | husbilsplats.se/rest-area/bracke-strand | Okänt |
| Hammarstrands Camping | Hammarstrand (Ragunda) | 63.120673, 16.344093 | camping | husbilsplats.se + park4night.com/en/place/56110 | Delvis (2 kataloger) |
| Ammeråns Fiskecamp | Nära Hammarstrand | – | "naturcamping, bastu, 250 kr +40 kr el" | park4night (sökträff) | Okänt |
| Klövsjö-Vemdalens Golfklubb | Klövsjö (Berg) | 62.484652, 14.220121 | husbilsparkering vid golf | husbilsplats.se/rest-area/klovsjo-vemdalens-golfklubb | Okänt |
| Åsarna Skicenter | Åsarna (Berg) | – | "el, färskvatten, toalett, dusch, kassettömning" | husbilsplats.se/rest-area/asarna-skicenter | Okänt |
| Åsarnas rastplats | Åsarna (Berg) | – | "toalett, sopor" | husbilsplats.se/rest-area/asarnas-rastplats | Okänt |
| Svenstavik (rastplats) | Svenstavik (Berg) | – | "el, färskvatten, toalett, gråvattentömning, kassett-/tanktömning" | husbilsplats.se/rest-area/svenstavik | Okänt |
| Vemdalens Camping | Vemdalen (Härjedalen) | 62.435191, 13.838314 | camping | husbilsplats.se/rest-area/vemdalens-camping | Okänt |
| Tömningsplats Funäsdalen | Funäsdalen (Härjedalen) | – | "färskvatten, gråvattentömning, kassettömning" | husbilsplats.se/locations/tomningsplats-funasdalen | Okänt |
| Lofsdalsfjällen/Lofsdalen camping | Lofsdalen (Härjedalen) | – | camping | husbilsplats.se + park4night.com/lieu/113594 | Delvis (2 kataloger) |
| Svegs Camping | Sveg | 62.032676, 14.364444 | "servicebyggnad, latrin-/gråvattentömning" | husbilsplats.se + park4night.com/de/place/127387 | Delvis (2 kataloger) |
| Svegs Golfklubb | Sveg | 62.025125, 14.465625 | "husbilsparkering vid golf, el" | husbilsplats.se/rest-area/svegs-golfklubb | Okänt |
| Mosättbron | Sveg (Härjedalen) | 62.112866, 14.060382 | rastplats/fiske | husbilsplats.se/locations/mosattbron | Okänt |
| Gäddede Camping och Stugby | Gäddede (Strömsund) | – | "el, färskvatten, toalett, dusch, kassettömning" | husbilsplats.se/rest-area/gaddede-camping-och-stugby | Okänt |
| Åkersjöstrand Camping | Föllinge (Krokom) | – | camping | husbilsplats.se (sökträff) | Okänt |
| Strömsunds camping | Strömsund | – | vid E45, Ströms Vattudal | park4night.com/en/place/78294 | Okänt |
| Flåsjöstrands Camping | Strömsund kommun | 833 95 | "8 platser, 300 kr inkl el" | park4night.com/en/place/203953 | Okänt |
| Allviken (rast-/fiskeplats) | Strömsund kommun | 833 95 | "2–3 skåpbilar, inga toa/vatten-tjänster" | park4night.com/en/place/250521 | Okänt |
| Hoting – Europaväg 45 | Hoting (Strömsund) | 830 80 | rastplats | park4night.com/en/place/82794 | Okänt |

## Dalarna + Gävleborg

~65 unika platser. 4 med genuint oberoende bekräftelse (kommun/egen webbplats):
Massarbäcksgårdens (nu kompletterad i registret), Karlsviks Herrgård, Söderala
Bygdegård, Galvens Bygdegård (nu kompletterad i registret).

| Namn | Ort | Koordinat | Tjänster (citat) | Källa/URL | Oberoende källa? |
|---|---|---|---|---|---|
| Falu Gruva | Falun | – | soptunna | husbilsplats.se/locations/falu-gruva/ | Nej |
| Lilla Stigen Ställplatser | Falun-trakten | – | ej specificerat | husbilsplats.se/rest-area/lilla-stigen-stallplatser/ | Nej |
| Hansagårds Camping | Dalarna | – | ej specificerat | husbilsplats.se/rest-area/hansagards-camping/ | Nej |
| First Camp Moraparken | Mora | Parkvägen 4B | "el, färskvatten, toalett, dusch, sopor, gråvatten/kassett" | husbilsplats.se + park4night.com/en/place/90039 | Ja (kedja, verifierbar oberoende) |
| Vildmarksfisket i Mora | Mora | – | lugnt läge, fiske | husbilsplats.se/rest-area/vildmarksfisket-i-mora/ | Nej |
| Mora Life Åmåsängsgården | Mora | – | husbilsplats vid camping | husbilsplats.se/locations/mora-life-amasangsgarden/ | Nej |
| Mora Golfklubb | Mora | – | husbilsparkering vid golf | husbilsplats.se/rest-area/mora-golfklubb/ | Nej |
| Mora – 13 Tingsnäsvägen | Mora | – | betalparkering | park4night.com/lieu/182569 | Nej |
| Mora – Siknäs fyrklöver | Mora | – | naturcamping | park4night | Nej |
| Rastplats Rastastugan | Borlänge | Gimsbärke 336 | ej specificerat | husbilsplats.se/rest-area/rastplats-rastastugan/ | Nej |
| Forsbergs Fritidscenter | Borlänge | – | husbilsservice | husbilsplats.se/rest-area/forsbergs-fritidscenter-i-borlange/ | Nej |
| Rastplats Långsjön | Borlänge | Långsjön 1 | ej specificerat | husbilsplats.se/rest-area/rastplats-langsjon/ | Nej |
| Borlänge – Trutenbo | Borlänge | – | "el, vatten, toalett, 20€/natt" | park4night.com/en/place/344152 | Nej |
| Vidablick ställplats | Rättvik | – | ej specificerat | husbilsplats.se/rest-area/vidablick-stallplats/ | Nej |
| Rättviksgården | Rättvik | Enåbadsvägen 1 | ej specificerat | husbilsplats.se/rest-area/rattviksgarden/ | Nej |
| Rättviksbacken | Rättvik | – | ej specificerat | husbilsplats.se/rest-area/rattviksbacken/ | Nej |
| Dalhalla | Rättvik | – | ej specificerat | husbilsplats.se/rest-area/dalhalla/ | Nej |
| First Camp Siljansbadet | Rättvik | Långbryggevägen 4 | camping, service | husbilsplats.se/rest-area/first-camp-siljansbadet/ | Ja (kedja) |
| Karlsviks Herrgård | Rättvik | Karlsviks väg 2 | ~20 platser, öppet maj–okt (inga bekräftade kärntjänster) | husbilsplats.se + karlsviksherrgard.com + Visit Dalarna | Ja (men svag tjänsteevidens) |
| Leksand Strand Camping & Resort | Leksand | Siljansvägen 61 | "el, vatten, toalett, dusch, sopor, gråvatten-/svartvattentömning" | husbilsplats.se/rest-area/leksand-strand-camping-resort/ | Ja (etablerad camping) |
| Leksands rastplats | Leksand | – | "vatten, toalett, sopor, svartvattentömning" | husbilsplats.se + park4night | Nej |
| Västanviksbadets Camping | Leksand | Siljansnäsvägen 130 | "el, vatten, toalett, dusch, sopor, wifi, tömning" | husbilsplats.se/rest-area/vastanviksbadets-camping/ | Nej |
| Leksand – Solvändan | Leksand | – | liten P vid Siljan | park4night.com/en/place/633728 | Nej |
| Tällberg Camping | Tällberg | – | camping | husbilsplats.se + park4night | Nej |
| Vikarbygården | Vikarbyn (Rättvik) | Öjavägen 5 | ej specificerat | husbilsplats.se/rest-area/vikarbygarden/ | Nej |
| Hedemora Folkets Park | Hedemora | – | dusch | husbilsplats.se/locations/hedemora-folkets-park/ | Nej |
| Avesta Golfklubb | Avesta | 60.15013, 16.20441 | husbilsparkering vid golf | husbilsplats.se/rest-area/avesta-golfklubb/ | Nej |
| Avesta – 2 Köpmangatan | Avesta | – | "2 gratis husbilsplatser, inga faciliteter" | park4night.com/en/place/226673 | Nej |
| Smedjebackens Båtklubb | Smedjebacken | – | "el, vatten, toalett, sopor, gråvatten-/kassettömning, 13 platser" | husbilsplats.se/rest-area/smedjebackens-hamn/ | Nej |
| Älvdalens camping | Älvdalen | 61.229552, 14.028017 | camping | husbilsplats.se/rest-area/alvdalens-camping/ | Nej |
| Älvdalen – 94 Dalgatan | Älvdalen | – | tvättstuga, kök | park4night.com/en/place/427789 | Nej |
| Orsa – 1 Brantvägen | Orsa | – | P vid sjön | park4night.com/en/place/94403 | Nej |
| Malungs Camping | Malung | 60.683195, 13.702331 | camping | husbilsplats.se/rest-area/malungs-camping/ | Nej |
| Malungs Golfklubb | Malung | 60.626279, 13.758705 | husbilsparkering vid golf | husbilsplats.se/rest-area/malungs-golfklubb/ | Nej |
| Vansbro Camping | Vansbro | – | husbilsplats vid camping | husbilsplats.se/locations/vansbro-camping/ | Nej |
| Rastplats söder Vansbro | Vansbro | – | soptunna, turistinfo | husbilsplats.se/locations/rastplats-soder-vansbro/ | Nej |
| Säters camping | Säter | – | camping | husbilsplats.se/rest-area/saters-camping/ | Nej |
| Säter – 32 Bergslagsgatan | Säter | – | "25 husbils-/husvagnsplatser, automatisk incheckning" | park4night.com/en/place/574523 | Nej |
| Gagnefs Golfklubb | Gagnef | – | husbilsparkering vid golf | husbilsplats.se/locations/gagnefs-golfklubb/ | Nej |
| Gagnef – Gråda | Gagnef | – | P vid slip, inga sanitetsfaciliteter | park4night | Nej |
| Ställplats Dalarna (785 60) | Dalarna | – | "el, vatten, sopor, toalett/latrintömning, 20 platser" | husbilsplats.se + park4night.com/en/place/317431 | Nej |
| Dalarna Älvcamping | Dalarna | – | "el, vatten, toalett, dusch, wifi, gråvatten-/latrintömning" | husbilsplats.se/rest-area/dalarna-alvcamping/ | Nej |
| Nås Camping Dalarna | Nås (Vansbro) | – | "toalett, dusch, wifi, gråvatten-/latrintömning" | husbilsplats.se + park4night.com/en/place/174695 | Nej |
| Ludvika – Harnäsgården/Gamla Skolan | Ludvika | – | "avfallstömning + el 200 SEK, inga toaletter/duschar" | park4night.com/en/place/409673 | Nej |
| Ludvika – 13 Kajvägen | Ludvika | – | liknande faciliteter | park4night.com/en/place/322546 | Nej |
| Tömningsplats Gävle | Gävle | – | tömningsplats | husbilsplats.se/rest-area/tomningsplats-gavle/ | Nej |
| Hemlingbystugan | Gävle | Hemlingbyvägen 93 | vatten, toalett, sopor | husbilsplats.se/rest-area/hemlingbystugan/ | Nej |
| Skeppsbron i Gävle | Gävle | Skeppsbron 26 | "sopor, 9 platser, 150 kr/dygn inkl el" | husbilsplats.se + park4night.com/en/place/46256 | Nej |
| Gävle Golfklubb | Gävle | Gröna vägen 10 | husbilsparkering, elstolpar | husbilsplats.se/rest-area/gavle-golfklubb/ | Nej |
| Gävle Camping Engesberg | Gävle | Solviksvägen 7 | "el, vatten, toalett, dusch, sopor, gråvatten-/kassettömning" | husbilsplats.se + park4night | Ja (etablerad camping) |
| Gasolfyllarna Gävle | Gävle | Utmarksvägen | gasol | husbilsplats.se + park4night.com/en/place/95851 | Nej |
| Gävle – Lantmäterigatan | Gävle | – | betal-P vid badhus | park4night.com/en/place/270537 | Nej |
| Ställplats Håckstaviken | Hudiksvall (Håcksta) | 61.747615, 17.284029 | el, hund välkommen | husbilsplats.se/locations/stallplats-hackstaviken/ | Nej |
| Hudiksvalls Golfklubb | Hudiksvall | – | husbilsparkering, el | husbilsplats.se/rest-area/hudiksvalls-golfklubb/ | Nej |
| Kättingens ställplats | Hälsingland | – | ej specificerat | husbilsplats.se/rest-area/kattingens-stallplats/ | Nej |
| Helgenäs ställplats | Hälsingland | – | ej specificerat | husbilsplats.se/rest-area/helgenas-stallplats/ | Nej |
| Dalskärs Camping | Hälsingland | – | camping | husbilsplats.se/rest-area/dalskars-camping/ | Nej |
| Rogsta hembygdsgård | Hudiksvall-trakten | – | "10 platser, el, latrintömning, vatten, sopor, toalett" | husbilsplats.se (sökträff) | Nej |
| Hudiksvall – 20 Ullsättersvägen | Hudiksvall | – | "18 platser med el, servicehus sedan 2022" | park4night.com/en/place/169259 | Nej |
| Hudiksvall – 17 Humlegatan | Hudiksvall | – | "betal-P centrum, 100 SEK/husbil" | park4night.com/en/lieu/253956 | Nej |
| Malnbadens Camping | Hudiksvall | 15 Linsänkevägen | camping | park4night.com/lieu/58062 | Nej |
| Stugsundskajen | Söderhamn | Strandgatan 16 | "el, toalett, dusch, sopor" | husbilsplats.se + park4night | Nej |
| Söderhamnsån | Söderhamn | Norra Hamngatan 6 | ej specificerat | husbilsplats.se/locations/soderhamnsan/ | Nej |
| Flygstaden | Söderhamn | Byggnad 6 | ej specificerat | husbilsplats.se/rest-area/flygstaden/ | Nej |
| Söderhamns Golfklubb | Söderhamn | – | husbilsparkering | husbilsplats.se/locations/soderhamns-golfklubb/ | Nej |
| Skärså Camping | Söderhamn (Skärså) | – | skärgårdsläge, 300 m till havet | park4night.com/lieu/77869 | Nej |
| Söderala Bygdegård | Söderhamn (Söderala) | – | "4+4 platser, toalett, dusch, disk, tvättmaskin" | husbilsplats.se + Visit Söderhamn + bygdegardarna.se | Ja (men svag tjänsteevidens) |
| Bollegården | Bollnäs | Bollevägen 185 | ej specificerat | husbilsplats.se/locations/bollegarden/ | Nej |
| Rastplats Bollnäs | Bollnäs | – | rastplats | husbilsplats.se + park4night | Nej |
| Vevlingestrands Camping | Bollnäs | – | "el, gråvatten-/toatömning, vatten, sopor, toalett, wifi" | husbilsplats.se + park4night.com/lieu/97266 | Nej |
| Ljusdal – Trafikverkets rastplats X10 | Ljusdal | – | "kassettömning, vatten, sopor, toalett" | husbilsplats.se (sökträff) | Nej |
| Ljusdal – Stavsätter Järvsövägen 5 | Ljusdal | – | ej specificerat | park4night.com/en/place/46215 | Nej |
| Hofors Golfklubb | Hofors | – | husbilsparkering | husbilsplats.se/rest-area/hofors-golfklubb/ | Nej |
| Gammelstilla Whisky | Hofors (Torsåker) | – | "20 platser el, servicehus" | park4night.com/lieu/54747 | Nej |
| Ockelbo camping (CC Ockelbo) | Ockelbo | – | "20 platser el, Caravan Club" | park4night.com/en/place/235882 | Nej |
| Camp Kungsgården | Sandviken (Kungsgården) | – | camping | husbilsplats.se + park4night.com/en/place/76144 | Nej |
| Edsbyn | Edsbyn (Ovanåker) | 61.3845, 15.8289 | ej specificerat | husbilsplats.se/rest-area/edsbyn/ | Nej |
| Edsbybacken | Edsbyn | – | "el, gråvattentömning, septitanktömning, sopor, toalett" | husbilsplats.se/rest-area/edsbybacken/ | Nej |
| Alfta Camping | Alfta | – | "20 platser el, servicehus" | park4night.com/en/place/180092 | Nej |
| Alfta-Edsbyns Golfklubb | Alfta/Edsbyn | – | husbilsparkering vid golf | husbilsplats.se (sökträff) | Nej |
| Delsbo Camping | Delsbo | – | camping | husbilsplats.se/locations/delsbo-camping/ | Nej |
| Järvsö Camping B&B Stugor | Järvsö | – | camping | husbilsplats.se/locations/jarvso-camping-b-b-stugor/ | Nej |
| Camp Järvsö | Järvsö | – | ej specificerat | husbilsplats.se/rest-area/camp-jarvso/ | Nej |
| Järvsöbadens Golfklubb | Järvsö | – | husbilsparkering vid golf | husbilsplats.se (sökträff) | Nej |
| Rastplats Näsbysjön norrgående | Storvik | 60.580218, 16.539323 | rastplats | husbilsplats.se/locations/rastplats-nasbysjon-norrgaende/ | Nej |

## Stockholm + Uppsala + Södermanland + Västmanland

74 unika platser. Ingen med genuint oberoende (tredjeparts) källa – Trosa
Gästhamn (redan i registret via OSM) var enda med en magasinsomnämning.

| Namn | Ort | Koordinat | Tjänster (citat) | Källa/URL | Oberoende |
|---|---|---|---|---|---|
| Citycamp Stockholm | Stockholm | – | "el, färskvatten, toalett, dusch, sopor, gråvatten/kassett" | husbilsplats.se/rest-area/stallplats-stockholm/ | Nej |
| Tantolunden | Stockholm | – | "el, tömningsstation, sopor" | husbilsplats.se (tag-arkiv) | Nej |
| Husbilsparkering västra Kungsholmen | Stockholm | – | husbilsparkering | husbilsplats.se/locations/husbilsparkering-vastra-kungsholmen/ | Nej |
| Ställplats Stockholm – Skutskepparvägen | Stockholm | – | el vid varje plats | park4night.com/en/place/31062 | Okänt |
| Ställplats Stockholm – vid Flaten | Stockholm | – | kodkort för sanitet | park4night.com/en/place/55501 | Okänt |
| Waxholms Camping | Vaxholm | – | "el, färskvatten, toalett, dusch, sopor, turistinfo" | husbilsplats.se/rest-area/waxholms-camping/ | Nej |
| Åkersberga – Båthamnsvägen | Åkersberga | – | "fri P 4 husbilar" | park4night.com/en/place/377290 | Okänt |
| Askrike Camping | Vaxholm/Djursholm | – | camping | husbilsplats.se/locations/askrike-camping/ | Nej |
| Farstanäs Havsbad & Familjecamping | Järna | – | "el, gråvatten, kassettömning, färskvatten, sopor, toalett, dusch" | husbilsplats.se/locations/farstanas-havsbad-familecamping/ | Nej |
| Södertälje Gästhamn | Södertälje | – | "el, färskvatten, toalett, hund ok" | husbilsplats.se/rest-area/sodertalje-gasthamn/ | Nej |
| Caravanhallen i Södertälje | Södertälje | – | husbilsservice | husbilsplats.se/rest-area/caravanhallen-i-sodertalje/ | Nej |
| First Camp Nickstabadet | Nynäshamn | – | camping vid strand | husbilsplats.se/rest-area/first-camp-nickstabadet/ | Trolig (kedja) |
| Nynäshamn – Centralgatan 93 | Nynäshamn | – | parkering | park4night.com/en/place/433358 | Okänt |
| Sigtuna – Stora Gatan | Sigtuna | – | "2 eluttag, wc 50 m" | park4night.com/en/place/474521 | Okänt |
| Sigtuna – ny RV-plats (9 platser) | Sigtuna | – | "9 sneda p-platser, ingen service" | park4night.com/en/place/361651 | Okänt |
| Bålsta – Grans Gårds väg | Bålsta | – | "12 platser, skogsbryn" | park4night.com/en/place/146759 | Okänt |
| Huvudstadens Golfklubb | Vallentuna | – | golfklubb med övernattning | husbilsplats.se/rest-area/huvudstadens-golfklubb/ | Nej |
| Bro-Bålsta Golfklubb | Bålsta | – | golfklubb med övernattning | husbilsplats.se/locations/bro-balsta-golfklubb/ | Nej |
| Norrtälje Camping | Norrtälje | – | "el, färskvatten, toalett, dusch, sopor, tömning" | husbilsplats.se/rest-area/norrtalje-camping/ | Nej |
| Norrtälje Sportcentrum | Norrtälje | – | "grusplan, el" | husbilsplats.se/locations/norrtalje-sportcentrum/ | Nej |
| Björkö Örns Camping | Norrtälje | 59.767438, 19.014979 | camping | husbilsplats.se/rest-area/bjorko-orns-camping/ | Nej |
| Mobolets Gård (bisonfarm) | Norrtälje | – | "20 platser, el, färskvatten, toalett, dusch, wifi, tömning" | husbilsplats.se/rest-area/mobolets-gard-bisonfarm/ | Nej |
| Östanå Havscamp | Roslagen (Norrtälje) | – | "el, färskvatten, gråvatten, kassettömning, dusch" | park4night (sökträff) | Okänt |
| Dahlgrens Auto Ställplats | Uppsala | – | "50 kr/dygn" | husbilsplats.se/locations/dahlgrens-auto-stallplats/ | Nej |
| Fyrishov Stugby och Camping | Uppsala | – | camping/stugby | husbilsplats.se/rest-area/fyrishov-stugby-och-camping/ | Nej |
| EW Fritid | Uppsala | – | husbilsservice | husbilsplats.se/rest-area/ew-fritid/ | Nej |
| Upplands Bil & Fritidscenter | Uppsala | – | husbilsservice | husbilsplats.se/rest-area/upplands-bil-fritidscenter/ | Nej |
| Gamla Uppsala parkering | Uppsala | – | "fri P, toalett, svarttömning" | park4night.com/en/place/90250 | Okänt |
| Uppsala – Kungsängsgatan 62 | Uppsala | – | "20 platser, EasyPark" | park4night.com/en/place/478076 | Okänt |
| Kallerö naturcamping | Östhammar | – | camping | husbilsplats.se/locations/kallero-naturcamping/ | Nej |
| Laxöporten | Älvkarleby | – | "el, färskvatten, toalett, sopor, wifi" | husbilsplats.se/locations/laxoporten/ | Nej |
| Älvkarleby Fiskecamping | Älvkarleby | – | camping | husbilsplats.se/rest-area/alvkarleby-fiskecamping/ | Nej |
| Habo Camping & Stugby | Håbo (Bålsta) | – | "el, toalett, dusch, sopor" | husbilsplats.se/rest-area/habo-camping-stugby/ | Nej |
| Tierp – husbilspark vid Jättendal | Tierp | – | "16 platser el, servicehus 2022" ⚠️ misstänkt mall-text | park4night.com/en/place/573565 | Okänt |
| Sundbyholms gästhamn | Eskilstuna | – | "8 platser, el, toalett, dusch, latrintömning" | husbilsplats.se/rest-area/sundbyholms-gasthamn/ | Nej |
| Vilsta Camping & Stugby | Eskilstuna | – | camping | husbilsplats.se/locations/vilsta-camping-stugby/ | Nej |
| Eskilstuna Golfklubb | Eskilstuna | – | golfklubb med övernattning | husbilsplats.se/rest-area/eskilstuna-golfklubb/ | Nej |
| Strömsholmen | Eskilstuna | – | husbilsplats | husbilsplats.se/rest-area/stromsholmen/ | Nej |
| Nyköpings hamn | Nyköping | – | gästhamn | husbilsplats.se/rest-area/nykopings-hamn/ | Nej |
| Sibrobadet ställplats | Nyköping | – | ställplats vid bad | husbilsplats.se/locations/sibrobadet-stallplats/ | Nej |
| Strandstuvikens Camping | Nyköping | – | camping | husbilsplats.se/locations/strandstuvikens-camping/ | Nej |
| Örstig Camping | Nyköping | – | camping | husbilsplats.se/locations/orstig-camping/ | Nej |
| Horns Skärgårdscamping | Nyköping | – | camping | husbilsplats.se/rest-area/horns-skargardscamping/ | Nej |
| Nyköping – Söra | Nyköping | 58.7888, 17.0032 | "grus, 8-10 husbilar, 48h, fri" | park4night.com/en/place/516967 | Okänt |
| Trosa Havsbad & Familjecamping | Trosa | – | camping | husbilsplats.se/locations/trosa-havsbad-familecamping/ | Nej |
| Trosa Golfklubb | Trosa | – | "el" | husbilsplats.se/rest-area/trosa-golfklubb/ | Nej |
| Katrineholm Centrum | Katrineholm | – | "max 24h, 2 platser" | husbilsplats.se/locations/stallplats-katrineholm-centrum/ | Nej |
| Katrineholms Golfklubb | Katrineholm | – | golfklubb med övernattning | husbilsplats.se/locations/katrineholms-golfklubb/ | Nej |
| Katrineholm – vid fotbollsplan | Katrineholm | – | avgiftsbelagd övernattning | park4night (sökträff) | Okänt |
| Löts Camping | Strängnäs | – | camping | husbilsplats.se/locations/lots-camping/ | Nej |
| Strängnäs Marina | Strängnäs | – | marina/gästhamn | husbilsplats.se/locations/strangnas-marina/ | Nej |
| Strängnäs Golfklubb | Strängnäs | – | golfklubb med övernattning | husbilsplats.se/locations/strangnas-golfklubb/ | Nej |
| Strängnäs – Östra Strandvägen/Mossnäs | Strängnäs | – | parkering | park4night.com/en/place/79479, /82423 | Okänt |
| Mariefreds Camping | Mariefred | – | camping | husbilsplats.se/rest-area/mariefreds-camping/ | Nej |
| Statoil Mariefred | Mariefred | – | bensinstation med övernattning | husbilsplats.se/rest-area/statoil-mariefred/ | Nej |
| Torshälla gästhamn | Torshälla (Eskilstuna) | – | "4 platser, el, toalett, tömning" | husbilsplats.se/rest-area/torshalla-gasthamn/ | Nej |
| Flens Golfklubb | Flen | – | "el, dusch" | husbilsplats.se/rest-area/flens-golfklubb/ | Nej |
| Vingåkersbadet | Vingåker | – | "4 platser" | husbilsplats.se/locations/vingakersbadet/ | Nej |
| Hjälmargården & Läppe Camping | Vingåker | – | bokningsbar husbilsplats | husbilsplats.se (kategorisida) | Nej |
| Jogersö Camping | Oxelösund | – | camping | husbilsplats.se/rest-area/jogerso-camping/ | Nej |
| Femöre fiskehamn | Oxelösund | – | fiskehamn/husbilsplats | husbilsplats.se/locations/femore-fiskehamn/ | Nej |
| Västerås gästhamn | Västerås | 59.60317, 16.546188 | gästhamn | husbilsplats.se/rest-area/vasteras-gasthamn/ | Nej |
| Västerås Camping Ängsö | Västerås | 59.569966, 16.856521 | "camping, båthamn, golfbana nära" | husbilsplats.se + park4night (dubbelbekräftad) | Nej men dubbelbekräftad |
| M & M Caravane | Västerås | – | husbilshandlare/ställplats | husbilsplats.se/locations/m-m-caravane-vasteras/ | Nej |
| Västerås – Framnäsvägen 15 | Västerås | – | låg avgift dagtid/helg | park4night.com/en/place/329599 | Okänt |
| Ställplats Museigatan i Sala | Sala | – | "4 platser, max 48h, centralt" | husbilsplats.se + park4night (dubbelbekräftad) | Nej men dubbelbekräftad |
| Silvköparens Camping | Sala | – | camping | husbilsplats.se/rest-area/silvkoparens-camping/ | Nej |
| Sala Silvergruva | Sala | – | husbilsplats vid besöksmål | husbilsplats.se/locations/sala-silvergruva/ | Nej |
| Sala-Heby Golfklubb | Sala | – | golfklubb med övernattning | husbilsplats.se/rest-area/sala-heby-golfklubb/ | Nej |
| Ställplats Köping | Köping | – | ställplats | husbilsplats.se/rest-area/stallplats-koping/ | Nej |
| Köpings Golfklubb | Köping | – | golfklubb med övernattning | husbilsplats.se/rest-area/kopings-golfklubb/ | Nej |
| Malmöns Camping | Köping | – | camping | husbilsplats.se/locations/malmons-camping/ | Nej |
| Hällarnas camping | Arboga | – | camping | husbilsplats.se (sökträff) | Nej |
| Fagersta Golfklubb | Fagersta | – | golfklubb med övernattning | husbilsplats.se/rest-area/fagersta-golfklubb/ | Nej |
| Norbergs Camping | Norberg | – | "el, färskvatten, toalett, dusch, tömning" | husbilsplats.se/rest-area/norbergs-camping/ | Nej |
| Surahammars Golfklubb | Surahammar | – | "el, dusch" | husbilsplats.se/locations/surahammars-golfklubb/ | Nej |
| Lerkulans Äventyr & Allfix | Skinnskatteberg | – | husbilsplats | husbilsplats.se (sökträff) | Nej |

## Västra Götaland + Halland

~60 unika platser (endast ~40% av länens kommuner hunnet sökas – se lista över
osökta kommuner högst upp).

| Namn | Ort | Koordinat | Tjänster (citat) | Källa/URL | Oberoende källa? |
|---|---|---|---|---|---|
| Ställplats Klippan | Göteborg | – | "6 platser, saknar service" | husbilsplats.se/rest-area/stallplats-klippan-goteborg/ | Nej |
| Lisebergs ställplats Skatås | Göteborg | Skatåsvägen 25 | "37 platser, el, färskvatten, avfall, gråvatten/tanktömning" | husbilsplats.se/rest-area/lisebergs-stallplats-skatas/ | Nej |
| Fästningsvägen (Volvo Museum) | Göteborg | – | gratis övernattning | park4night.com/en/place/89112 | Nej |
| Anders Carlssons gata 13-17 | Göteborg | – | "max 48h, 20 SEK/h" | park4night.com/en/place/255359 | Nej |
| Saltholmsgatan 19B (färjeparkering) | Göteborg | – | "50 SEK/24h" | park4night.com/en/place/347325 | Nej |
| Borås Camping | Borås | Campinggatan 25 | camping (fullservice) | husbilsplats.se + park4night.com/en/place/195961 | Delvis |
| Vegagatan | Borås | – | "60 SEK/dag" | park4night.com/en/place/458735 | Nej |
| Vindgatan 1 (gammal smedja) | Borås | – | avskild plats | park4night.com/en/place/583924 | Nej |
| Seglora Camping and Cottages | Borås (Seglora) | – | camping | park4night.com/en/place/83509 | Nej |
| Vänersborgs Gästhamn och Marina | Vänersborg | Vänerparken 12 | "el, färskvatten, toalett, servicehus dusch/wc/tvätt maj-sep" | husbilsplats.se + park4night.com/en/place/52684 | Delvis |
| Ursand Resort & Camping | Vänersborg | – | "30 platser, el, färskvatten, wc, dusch" | husbilsplats.se/rest-area/ursand-resort-camping/ | Nej |
| Onsjö Golfklubb | Vänersborg | – | husbilsdestination (golfsvep-kandidat) | husbilsplats.se/locations/onsjo-golfklubb/ | Nej |
| Privat ställplats, Gundlebo | Vänersborg | – | "50 SEK/natt, el+vatten" | park4night.com/lieu/120297/ | Nej |
| Trollhättans slussområde | Trollhättan | Åkerssjövägen 50 | "~19 platser, vattenpåfyllning, avfallshantering" | husbilsplats.se + park4night.com/en/place/75109 | Delvis |
| Trollhättans Camping City | Trollhättan | – | camping | husbilsplats.se/locations/trollhattans-camping-city/ | Nej |
| Stenrösets Camping | Trollhättan | Assarebo Stenröset 2 | camping | husbilsplats.se/locations/stenrosets-camping/ | Nej |
| Billingens Stugby och Camping | Skövde | Alphyddevägen | camping | husbilsplats.se + park4night.com/en/place/357532 | Delvis |
| Skövde Golfklubb | Skövde | Våmb Simsjövägen 11 | golfklubb (golfsvep-kandidat) | husbilsplats.se/rest-area/skovde-golfklubb/ | Nej |
| Knistad Golf & Country Club | Skövde | Knistad Herrgård | golfklubb (golfsvep-kandidat) | husbilsplats.se/rest-area/knistad-golf-country-club/ | Nej |
| Gästhamnen i Uddevalla | Uddevalla | Walkeskroken 1 | gästhamn | husbilsplats.se/rest-area/gasthamnen-i-uddevalla/ | Nej |
| Uddevalla husbilsparkering | Uddevalla | Museigatan | husbilsparkering | husbilsplats.se/locations/uddevalla-husbilsparkering/ | Nej |
| Unda Camping & Stugby | Uddevalla | – | camping | husbilsplats.se/rest-area/unda-camping-stugby/ | Nej |
| Kloster Marina | Uddevalla | – | marina/ställplats | husbilsplats.se/rest-area/kloster-marina/ | Nej |
| KronoCamping Lidköping | Lidköping | Läckögatan 22 | camping | husbilsplats.se/rest-area/kronocamping-lidkoping/ | Nej |
| Ställplats Naven | Lidköping | Navudden 1 | ställplats | husbilsplats.se/rest-area/stallplats-naven/ | Nej |
| Ställplats Kedumsvik | Lidköping | Norra Kedum Storegården 1 | ställplats | husbilsplats.se/rest-area/stallplats-kedumsvik/ | Nej |
| Spikens fiskeläge | Lidköping | – | ställplats/fiskeläge | husbilsplats.se/rest-area/spikens-fiskelage/ | Nej |
| Lövekulle Camping | Alingsås | Badplatsvägen 121 | camping | husbilsplats.se/rest-area/lovekulle-camping/ | Nej |
| Alingsås Golfklubb | Alingsås | Svanviksvägen 1 | golfklubb (golfsvep-kandidat) | husbilsplats.se/rest-area/alingsas-golfklubb/ | Nej |
| Yttre hamnen i Mariestad | Mariestad | Hamngatan 58 | hamn/ställplats | husbilsplats.se/locations/yttre-hamnen-i-mariestad/ | Nej |
| Sundsörn ställplats | Mariestad | Sundsören Gård 1 | ställplats | husbilsplats.se/locations/sundsorn-stallplats/ | Nej |
| Ställplats Cesarstugan | Falköping (Östra Tunhem) | – | ställplats | husbilsplats.se/locations/stallplats-cesarstugan/ | Nej |
| Hornborgasjön | Falköping | – | naturplats/ställplats | husbilsplats.se/rest-area/hornborgasjon/ | Nej |
| Mössebergs Camping | Falköping | – | camping | husbilsplats.se (nämnd i sökresultat) | Nej |
| Varbergs Fästning | Varberg | Strandgatan 17 | "10 platser / gratis 2h, upp till 6 m" | husbilsplats.se + park4night.com/en/place/78360 | Delvis |
| Gästhamnen i Varberg | Varberg | Otto Torells gata 24 | gästhamn | husbilsplats.se/locations/gasthamnen-i-varberg/ | Nej |
| Läjets Camping | Varberg | Nygård 3 | "el, färskvatten, wc, dusch" | husbilsplats.se/rest-area/lajets-camping/ | Nej |
| Tömningsplats Varberg | Varberg | Ålakullevägen 3 | tömningsstation | husbilsplats.se/rest-area/tomningsplats-varberg/ | Nej |
| Varbergs innerhamn | Varberg | – | bokning via QR | park4night.com/en/place/37359 | Nej |
| Änggärdevägen 2 | Varberg | – | "vatten/avfall dygnet runt, dusch/wc via PIN, 300 SEK" | park4night.com/de/place/30776 | Nej |
| Östra Hamnvägen 7 | Varberg | – | gratis 24h nära centrum | park4night.com/de/place/343221 | Nej |
| Kungsbacka Golfklubb | Kungsbacka | – | golfklubb (golfsvep-kandidat) | husbilsplats.se/locations/kungsbacka-golfklubb/ | Nej |
| Forsgårdens Golfklubb | Kungsbacka | Gamla Forsvägen 1 | golfklubb (golfsvep-kandidat) | husbilsplats.se/rest-area/forsgardens-golfklubb/ | Nej |
| Falkenbergs båtsällskap | Falkenberg | Gröningevägen 3 | båtsällskap/ställplats | husbilsplats.se + park4night.com/de/place/144297 (matchande adress) | Delvis |
| Hule Gård | Falkenberg (Glommen) | – | "5 platser, nära havet" | husbilsplats.se/rest-area/hule-gard/ | Nej |
| Ställplats Ginstavallen | Falkenberg | – | ställplats | husbilsplats.se/rest-area/stallplats-ginstavallen/ | Nej |
| Björnhults Golfklubb | Falkenberg | – | golfklubb (golfsvep-kandidat) | husbilsplats.se/rest-area/bjornhults-golfklubb/ | Nej |
| Lanthotell Lögnäs Gård | Laholm | Lögnäs 62 | "dusch, el, färskvatten, hc-wc, wifi, husbilsövernattning" | husbilsplats.se/rest-area/lanthotell-lognas-gard/ | Nej |
| Strömstad Camping | Strömstad | Uddevallavägen 45 | camping | husbilsplats.se/locations/stromstad-camping/ | Nej |
| Bojarparkeringen | Strömstad | Kebalvägen 4 | "färskvatten, toalett, gråvattentömning" | husbilsplats.se/rest-area/bojarparkeringen/ | Nej |
| Strömstads Golfklubb | Strömstad | – | golfklubb (golfsvep-kandidat) | husbilsplats.se/rest-area/stromstads-golfklubb/ | Nej |
| Lökholmens Camping | Strömstad | Lökholmsvägen 26 | camping | husbilsplats.se/rest-area/lokholmens-camping/ | Nej |

*(Tabellen förkortad – ytterligare ~15 mindre poster som gasolautomater,
bilhandlare och rena parkeringar utan tjänsteinfo finns i agentloggen men är
för lågvärdiga att lista här.)*

Kända kedjor som troligen redan finns i registret men bör dubbelkollas:
**Lisebergsbyn Camping, First Camp Tylösand, First Camp Hagön, First Camp
Kärradal, First Camp Björkäng, Daftö Resort.**

## Östergötland + Jönköping + Kalmar + Gotland

~82 unika platser, varav 9 park4night-fynd är i Visby-området (ingen
oberoende källa hittad för dem). Öland och Gotlands mindre orter delvis
osökta – se begränsningslistan högst upp.

| Namn | Ort | Koordinat | Tjänster (citat) | Källa/URL | Oberoende källa? |
|---|---|---|---|---|---|
| Stegeborgs ställplats | Stegeborg (Söderköping) | – | "55 platser, el, färskvatten, wc, dusch, wifi, tömning" | husbilsplats.se/rest-area/stegeborgs-stallplats/ | Okänt |
| Hovetorps ställplats | Linköping | – | ej specificerat | husbilsplats.se/rest-area/hovetorps-stallplats/ | Okänt |
| Norrköping Centrum (Stortorget) | Norrköping | – | "6 husbilsplatser, max 24h" | husbilsplats.se/locations/norrkoping-centrum/ | Okänt |
| Lindö Småbåtshamn | Norrköping | – | ej specificerat | husbilsplats.se/locations/lindo-smabatshamn/ | Okänt |
| Motala Södra Allén | Motala | 58.530561, 15.042422 | ej specificerat | husbilsplats.se/rest-area/motala-sodra-allen/ | Okänt |
| Z-Parkens Camping | Motala | – | "el, färskvatten, wc, dusch, avfall, gråvatten/kassettömning" | husbilsplats.se/rest-area/z-parkens-camping/ | Okänt |
| Vättersol Stugor & Ställplatser | Motala | 58.543827, 15.001906 | ej specificerat | husbilsplats.se/rest-area/vattersol-stugor-stallplatser/ | Okänt |
| Löfgrens Camping | Motala | – | ej specificerat | husbilsplats.se/rest-area/lofgrens-camping/ | Okänt |
| Vadstena Gästhamn & Ställplatser | Vadstena | 58.444923, 14.879331 | "el, färskvatten, wc, avfall, tömning gråvatten+kassett" | husbilsplats.se/locations/vadstena-gasthamn-stallplatser/ | Okänt |
| Tömningsplats Vadstena | Vadstena | 58.443927, 14.880512 | tömning | husbilsplats.se/locations/tomningsplats-vadstena/ | Okänt |
| Vadstena Camping | Vadstena | 58.465106, 14.934089 | ej specificerat | husbilsplats.se/locations/vadstena-camping/ | Okänt |
| Vadstena Golfklubb | Vadstena | 58.4246071, 14.8955049 | golfklubb (golfsvep-kandidat) | husbilsplats.se/locations/vadstena-golfklubb/ | Okänt |
| Göta kanal Söderköping | Söderköping | 58.481124, 16.332409 | ej specificerat | husbilsplats.se/rest-area/gota-kanal-soderkoping/ | Okänt |
| Korskullens Camping, Stugor & Café | Söderköping | 58.47704, 16.334454 | ej specificerat | husbilsplats.se/rest-area/korskullens-camping-stugor-cafe/ | Okänt |
| Trafikverkets rastplats Mjölby | Mjölby | – | "färskvatten, wc, avfall, kassettömning" | husbilsplats.se/locations/trafikverkets-rastplats-mjolby/ | Okänt |
| Tömningsplats Mjölby | Mjölby | – | "gråvatten+kassettömning" | husbilsplats.se/locations/tomningsplats-mjolby/ | Okänt |
| Mjölby Golfklubb | Mjölby | – | golfklubb (golfsvep-kandidat) | husbilsplats.se/locations/mjolby-golfklubb/ | Okänt |
| Finspångs Golfklubb | Finspång | – | "el, dusch" (golfsvep-kandidat) | husbilsplats.se/rest-area/finspangs-golfklubb/ | Okänt |
| Åtvidabergs Camping | Åtvidaberg | – | "el, wc, dusch, avfall, gråvatten+kassettömning" | husbilsplats.se/rest-area/atvidabergs-camping/ | Okänt |
| Ställplats City Jönköping | Jönköping | 57.764798, 14.169558 | kontakt dinhusbil.nu | husbilsplats.se/rest-area/stallplats-city-jonkoping/ | Okänt |
| Ställplats Elmia | Jönköping | 57.788337, 14.225189 | ej specificerat | husbilsplats.se/locations/stallplats-elmia/ | Okänt |
| Värnamo Camping | Värnamo | – | ej specificerat | husbilsplats.se/locations/varnamo-camping/ | Okänt |
| Centralt belägna husbilsplatser i Vetlanda | Vetlanda | – | "gratis, max 1 natt, 4 platser" | husbilsplats.se/rest-area/centralt-belagna-husbilsplatser-i-vetlanda/ | Okänt |
| Ställplats Gislaved | Gislaved | – | "wc, avfall" | husbilsplats.se/rest-area/stallplats-gislaved/ | Okänt |
| Eksjö Camping | Eksjö | Kråkebergsvägen 6 | ej specificerat | husbilsplats.se/locations/eksjo-camping/ | Okänt |
| Sävsjö Camping | Sävsjö | – | "el, färskvatten, wc, dusch, avfall, tömning" | husbilsplats.se/rest-area/savsjo-camping/ | Okänt |
| Habo Camping & Stugby | Habo | – | "el, wc, dusch, avfall, hund ok" (bokningsbar) | husbilsplats.se/rest-area/habo-camping-stugby/ | Okänt |
| Kalmar husbilsparkering | Kalmar | – | ej specificerat | husbilsplats.se/locations/kalmar-husbilsparkering/ | Okänt |
| Kalmar Camping | Kalmar | – | "el, färskvatten, wc, dusch, avfall" (bokningsbar) | husbilsplats.se/rest-area/kalmar-camping/ | Okänt |
| Örbäcken (IFK Västervik) | Västervik | – | "tömning vid Lysingsbadet, färskvatten vid Rundsvängen" | husbilsplats.se/rest-area/orbacken/ | Okänt |
| Tömningsplats Västervik | Västervik | – | tömning | husbilsplats.se/locations/tomningsplats-vastervik/ | Okänt |
| Västervik Resort | Västervik | – | "el, färskvatten, wc, dusch, avfall, wifi, gråvatten+kassettömning" (bokningsbar) | husbilsplats.se/rest-area/vastervik-resort/ | Okänt |
| Västerviks Golfklubb | Västervik | – | golfklubb (golfsvep-kandidat) | husbilsplats.se/rest-area/vasterviks-golfklubb/ | Okänt |
| Norra kajen i Oskarshamn | Oskarshamn | – | "färskvatten, wc, avfall, tömning" | husbilsplats.se/rest-area/norra-kajen-oskarshamn/ | Okänt |
| First Camp Gunnarsö | Oskarshamn | – | "el, tömning" | husbilsplats.se (sökträff) | Okänt |
| Vimmerby Golfklubb | Vimmerby | – | "el" (golfsvep-kandidat) | husbilsplats.se/rest-area/vimmerby-golfklubb/ | Okänt |
| Astrid Lindgrens Värld (ställplats) | Vimmerby | – | ej specificerat | husbilsplats.se/rest-area/astrid-lindgrens-varld/ | Okänt (känd anläggning) |
| Mönsterås hamn | Mönsterås | Hamngatan 4 | rastplats | husbilsplats.se/rest-area/monsteras-hamn/ | Okänt |
| Slite Camping | Slite (Gotland) | – | ej specificerat | husbilsplats.se/locations/slite-camping/ | Okänt |
| Follingbo Folkets Park | Follingbo (Visby) | – | "5 husbilsplatser" | husbilsplats.se/rest-area/follingbo-folkets-park/ | Okänt |
| Ljugarns Semesterby & Camping | Ljugarn (Gotland) | – | "el, färskvatten, wc, dusch, avfall" | husbilsplats.se/rest-area/ljugarns-semesterby-camping/ | Okänt |
| Camping Visby Strandby | Visby | – | "63 platser, alla el, servicehus" | park4night.com/en/place/210328 | Nej |
| Visby – 2 Färjeleden | Visby | – | "10 husbilar, ingen service" | park4night.com/en/place/377547 | Nej |
| Visby – 4 Södra Murgatan | Visby | – | "10 kr/h, ingen service" | park4night.com/en/place/105546 | Nej |
| Visby – 34 Västerhejde Langs väg | Visby | – | "gratis, ingen service" | park4night.com/en/place/138869 | Nej |
| Fleringe Ar | Fleringe (Gotland) | – | "nya toaletter utan vatten, sopor, 150 kr" | park4night.com/en/place/76782 | Nej |

*(Ytterligare ~30 mindre poster – golfklubbar, gästhamnar, campingar – i
agentloggen, tillgängliga vid behov.)*

## Skåne + Blekinge (+ Kronoberg/Örebro/Värmland OSÖKTA)

~68 unika platser för Skåne och Blekinge. **Kronoberg, Örebro och Värmland
har noll sökningar gjorda och behöver en helt egen körning.**

| Namn | Ort | Koordinat | Tjänster (citat/beskrivning) | Källa/URL | Oberoende källa? |
|---|---|---|---|---|---|
| Ålstorpsgården | Dösjebro | – | året-runt-öppen, ~2,5 km från E6 | husbilsplats.se/locations/alstorpsgarden/ | Nej |
| Scaniaparken | Malmö | Västra Varvsgatan 55 | "el, färskvatten, sophantering, övernattning" | husbilsplats.se/rest-area/scaniaparken/ | Nej |
| Parkeringsplats för husbil i Kristianstad | Kristianstad | 56.044511, 14.168364 | ej specificerat | husbilsplats.se/locations/parkeringsplats-for-husbil-i-kristianstad/ | Nej |
| Kättingens ställplats | Kristianstad | – | "24 platser, el, färskvatten, toalett, dusch, sopor, gråvatten/tank" | husbilsplats.se/rest-area/kattingens-stallplats/ | Nej |
| Ställplats Skojarbacken | Kristianstad | – | "färskvatten, toalett, gråvatten/tanktömning" | husbilsplats.se/rest-area/stallplats-skojarbacken/ | Nej |
| Husbilsparkering i Ystad | Ystad | – | "10 platser, 4h-parkering" | husbilsplats.se/rest-area/husbilsparkering-i-ystad/ | Nej |
| Godsmagasinet i Simrishamn | Simrishamn | – | "gratis parkering 7 dagar" | husbilsplats.se/locations/godsmagasinet-i-simrishamn/ | Nej |
| Småbåtshamnen i Simrishamn | Simrishamn | – | "7 platser, el" | husbilsplats.se/rest-area/smabatshamnen-i-simrishamn/ | Nej |
| Helsingborgs Bryggeri – Oxhallen | Helsingborg | – | bokas via Acamp | husbilsplats.se/locations/helsingborgs-bryggeri-oxhallen/ | Nej |
| Valhall gård (ställplats) | Ängelholmstrakten | – | "fullservice inkl. husbils-/husvagnsverkstad" | husbilsplats.se/locations/valhall-gard/ | Nej |
| Ställplats Föreningshamnen i Skälderviken | Ängelholm | – | "el, wc/dusch, tvätt, kök" | husbilsplats.se + park4night.com/en/place/356972 | Dubbelkälla – ej oberoende |
| Skånes Djurparks Camping & Grottby | Höör | – | "gråvatten och toatömning" | husbilsplats.se/rest-area/skanes-djurparks-camping-grottby/ | Nej |
| Stamhem AB | Kristianstad | 14 Snapphanevägen | "50 platser, el, wc/dusch, vatten, latrin ingår, 200 kr" | park4night.com/en/place/415462 | Nej |
| Sölvesborg – Östra Hamnvägen | Sölvesborg | – | "alla tjänster + wifi" | park4night.com/en/place/17041 | Nej |
| First Camp Åhus | Kristianstad/Åhus | – | campingkedja, fullservice | park4night (sökträff) | Okänt (kedja, ej verifierad) |
| Vattenriket Visitor Center | Kristianstad | 2 Härlövsängaleden | "gratis 4h, övernattning 100 kr" | park4night.com/en/place/41062 | Nej |
| First Camp Mölle | Höganäs | – | campingkedja, fullservice | park4night (sökträff) | Okänt (kedja, ej verifierad) |
| Karlskrona centrum (allmän parkering) | Karlskrona | Vallgatan 1 | "9–16 5 kr/h, fri övrig tid" | park4night.com/en/place/39693 | Nej |
| First Camp Skönstavik | Karlskrona | – | campingkedja, fullservice | park4night (sökträff) | Okänt (kedja, ej verifierad) |
| Rönninge husbilsplats | Ronneby | Reddvägen 8 | "el, färskvatten, gråvatten-/kassettömning" | husbilsplats.se/rest-area/ronninge-husbilsplats/ | Nej |
| Garpahamnen Hasslö | Hasslö (Karlskrona) | – | "el, färskvatten, toalett" | husbilsplats.se/locations/garpahamnen-hasslo/ | Nej |
| Brofästet Senoren | Ramdala (Karlskrona) | – | "färskvatten, toalett, sophantering" | husbilsplats.se/rest-area/brofastet-senoren/ | Nej |
| Tömningsplats Karlskrona | Karlskrona | – | "gråvatten-/kassettömning" | husbilsplats.se/rest-area/tomningsplats-karlskrona/ | Nej |
| Ronneby Marina | Ronneby | – | "38 platser, hundvänligt" | husbilsplats.se/rest-area/ronneby-marina/ | Nej |
| Väggaviken Karlshamn | Karlshamn | – | gästhamn | husbilsplats.se/locations/vaggaviken-karlshamn/ | Nej |

*(Ytterligare ~40 poster utan tjänsteinfo – gatuparkeringar, hamnar,
campingar utan citat – i agentloggen.)*
