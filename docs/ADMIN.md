# Adminguide – Tömningskartan

Spara den här sidan. Allt du behöver som ägare finns här.

**Snabbaste vägen:** öppna adminsidan som kollar allt åt dig automatiskt:
**https://perrafree.github.io/PJfrance/?admin=1** (spara som bokmärke)

## Engångs-checklista

| # | Steg | Var | Klart? |
|---|---|---|---|
| 1 | Supabase-konto + projekt | supabase.com | ✅ (din vän gjorde detta) |
| 2 | `SUPABASE_URL` + `SUPABASE_ANON_KEY` som repo-variabler | GitHub → Settings → Secrets and variables → Actions → Variables | ✅ (gjort) |
| 3 | Kör SQL-texten som skapar tabellerna | Supabase → SQL Editor → New query → klistra in från `docs/SUPABASE.md` → Run | ⬜ |
| 4 | `service_role`-nyckeln som **secret** `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API (kopiera) → GitHub → Settings → Secrets and variables → Actions → **New repository secret** | ⬜ |
| 5 | Rätt mejladress för notiser | github.com/settings/notifications | ⬜ |

Adminsidan (?admin=1) visar grönt/rött för steg 1–3 automatiskt.
Steg 4 testar du genom att köra workflown **"Bevaka platsförslag"**
(GitHub → Actions → Bevaka platsförslag → Run workflow) – grön körning = rätt nyckel.

## Din vardagsrutin (allt sköts via mejl)

1. **Du får ett mejl från GitHub** när någon föreslagit en plats eller skrivit
   en kommentar (kollas var 3:e timme).
2. **Öppna länken i mejlet** – ärendet innehåller all info + kartlänkar.
3. **Skriv en kommentar:** `godkänn` (publiceras för alla direkt) eller `neka`.
   Ärendet stängs automatiskt.

Betyg utan text publiceras direkt – inget att göra.
"✓ Stämmer fortfarande"-bekräftelser publiceras direkt – inget att göra.

## Bra länkar

- Adminstatus: https://perrafree.github.io/PJfrance/?admin=1
- Väntande platsförslag: https://github.com/PerraFree/PJfrance/issues?q=is%3Aopen+label%3Aplatsf%C3%B6rslag
- Väntande kommentarer: https://github.com/PerraFree/PJfrance/issues?q=is%3Aopen+label%3Aomd%C3%B6me
- Databasen (titta i lådorna): https://supabase.com/dashboard → ditt projekt → Table Editor

## Lägga till platser själv (utan granskning)

Vill du lägga in en plats som ska synas för alla direkt: säg till Claude eller
redigera `scripts/curated-places.json` på GitHub (namn + adress + tjänster) –
den geokodas automatiskt vid nästa datasynk.
