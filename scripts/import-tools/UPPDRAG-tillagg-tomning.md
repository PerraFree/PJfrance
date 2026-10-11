# Tillägg för varv 2: kommuner med 0–1 bekräftade tömningsplatser

Detta varv gäller kommuner där kartan har HÖGST EN bekräftad plats för gråvatten-/latrintömning.
Alla kommuner har redan sökts en gång med de generella sökningarna i UPPDRAG-discovery.md
("ställplats husbil <kommun>" osv.) – upprepa INTE bara dem. Fokus nu är TÖMNING (latrin och
gråvatten) och färskvatten, med nya infallsvinklar:

1. **Kommunens egna sidor**: `site:<kommun>.se latrintömning`, `site:<kommun>.se husbil tömning`,
   "tömningsstation husbil", "reningsverk husbil tömning", "återvinningscentral latrin husbil",
   kommunens avfalls-/VA-bolag (t.ex. VA SYD, Sysav, Roslagsvatten, Käppala, Telge, SRV,
   Nodava, Vafab, Borab, Vakin). Många kommuner har en tömningsplats vid reningsverket eller
   ÅVC:n som inte syns någon annanstans.
2. **Befintliga platser i `existing-<grupp>.json` som bara är camping/ställplats** (fältet
   `services` saknar gravatten/latrin): sök upp anläggningens EGEN webbplats (fältet `website`
   om det finns, annars sök namnet) och leta efter latrintömning/gråvattentömning/
   färskvatten. Hittar du ett tydligt citat → rapportera med `existing_name` satt exakt som i
   filen och `confidence: "high"`. Detta är ofta den största källan till nya tömningsplatser.
3. **Gästhamnar** ("gästhamn husbil tömning <ort>") – många har latrintömning för husbil vid
   sidan av båtarnas sugtömning. OBS: båtars sugtömning räknas INTE, det måste stå husbil.
4. **Golfklubbar, bygdegårdar, hembygdsparker, badplatser, idrottsplatser, macker** (OKQ8/
   Circle K/Preem med "tömningsstation husbil"), stugbyar, vandrarhem, gårdsbutiker.
5. **Turistråd/destinationsbolag** för regionen (visitstockholm, destinationsörebro,
   visitskane, vastsverige, visitdalarna, visitvasterbotten, osv.) – räknas som primärkälla.

Rapportera även platser där kommunen/anläggningen uttryckligen säger att tömning INTE finns
(sätt `services` utan tömning och skriv citatet i `note`) – det sparar framtida sökningar.
Om en kommun verkligen inte har något efter 4–5 sökningar: skriv det i slutrapporten och gå
vidare. Sprid sökningarna: minst 3 per kommun, mer till kommuner med många befintliga
camping/ställplats-poster utan tömning.
