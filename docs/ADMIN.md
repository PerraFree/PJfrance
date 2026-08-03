# Adminguide – Tömningskartan

Spara den här sidan. Allt du behöver som ägare finns här.

**Snabbaste vägen:** öppna adminsidan som kollar allt åt dig automatiskt:
**https://perrafree.github.io/PJfrance/?admin=1** (spara som bokmärke)

## Engångsfix (3 steg, ca 3 minuter)

Ett enda "lösenord" (en nyckel) behövs för att GitHub ska sköta databasen åt
dig – skapa tabeller, läsa förslag och publicera det du godkänner. Du behöver
aldrig skriva SQL eller pilla i Supabase.

1. **Hämta nyckeln:** öppna https://supabase.com/dashboard/account/tokens
   → *Generate new token* → döp den till `tomningskartan` → kopiera texten.
2. **Ge den till GitHub:** öppna
   https://github.com/PerraFree/PJfrance/settings/secrets/actions/new
   → Name: `SUPABASE_ACCESS_TOKEN` → Secret: klistra in → *Add secret*.
3. **Starta:** öppna
   https://github.com/PerraFree/PJfrance/actions/workflows/installera-databasen.yml
   → *Run workflow*. Den hittar ditt Supabase-projekt, kopplar ihop allt
   (adress + besöksnyckel läggs in automatiskt), skapar tabellerna och bygger
   om appen. Vänta ett par minuter. Klart!

Kontrollera resultatet på adminsidan (?admin=1) – alla rader ska vara gröna.
Kolla även att rätt mejladress står på https://github.com/settings/notifications.

## Din vardagsrutin (allt sköts via mejl)

1. **Du får ett mejl från GitHub** när någon föreslagit en plats eller skrivit
   en kommentar (kollas var 3:e timme).
2. **Öppna länken i mejlet** – ärendet innehåller all info + kartlänkar.
3. **Skriv en kommentar:** `godkänn` (publiceras för alla direkt) eller `neka`.
   Ärendet stängs automatiskt.

Betyg utan text och ✓-bekräftelser publiceras direkt – inget att göra.

## Bra länkar

- Adminstatus: https://perrafree.github.io/PJfrance/?admin=1
- Väntande platsförslag: https://github.com/PerraFree/PJfrance/issues?q=is%3Aopen+label%3Aplatsf%C3%B6rslag
- Väntande kommentarer: https://github.com/PerraFree/PJfrance/issues?q=is%3Aopen+label%3Aomd%C3%B6me
- Databasen (titta i lådorna): https://supabase.com/dashboard → ditt projekt → Table Editor

## Lägga till platser själv (utan granskning)

Vill du lägga in en plats som ska synas för alla direkt: säg till Claude eller
redigera `scripts/curated-places.json` på GitHub (namn + adress + tjänster) –
den geokodas automatiskt vid nästa datasynk.
