# Crowdsourcing med Supabase

"Föreslå plats"-funktionen låter användare skicka in saknade tömnings- och
vattenplatser. Förslagen granskas innan de visas på kartan. Backend är
[Supabase](https://supabase.com) (gratis, ingen kortuppgift).

## 1. Skapa projekt (engång, ~3 min)

1. Gå till [supabase.com](https://supabase.com) → **Start your project** → logga in
   med GitHub.
2. **New project**. Välj ett namn (t.ex. `tomningskartan`), sätt ett
   databaslösenord (spara det) och region **Europe (Stockholm/Frankfurt)**.
3. Vänta tills projektet är klart.

## 2. Skapa tabellen

Öppna **SQL Editor** i Supabase och kör:

```sql
create table submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  address text not null,
  services text[] not null default '{}',
  fee text,
  description text,
  lat double precision,
  lon double precision,
  status text not null default 'pending'
);

-- Row Level Security: skydda datan
alter table submissions enable row level security;

-- Vem som helst får skicka in ett förslag (tvingas till status 'pending')
create policy "anon can insert pending"
  on submissions for insert to anon
  with check (status = 'pending');

-- Vem som helst får läsa godkända platser
create policy "anon can read approved"
  on submissions for select to anon
  using (status = 'approved');

-- Felrapporter på befintliga platser ("Rapportera fel"-knappen)
create table reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  station_id text not null,
  station_name text not null,
  reason text not null,
  note text,
  status text not null default 'open'
);

alter table reports enable row level security;

-- Vem som helst får skicka in en felrapport
create policy "anon can insert reports"
  on reports for insert to anon
  with check (status = 'open');
```

## 3. Koppla nycklarna till appen

1. I Supabase: **Project Settings → API**. Kopiera **Project URL** och
   **anon public**-nyckeln.
2. I GitHub-repot: **Settings → Secrets and variables → Actions → Variables**
   → **New repository variable**, lägg till två:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = anon public-nyckeln

   (Anon-nyckeln är säker att exponera i frontend – dataskyddet sköts av
   RLS-reglerna ovan. Därför repo-*variabler*, inte secrets.)
3. Kör deploy-workflowen igen (eller pusha) så byggs appen med
   "Föreslå plats"-knappen aktiv.

## 4. Moderera förslag

Öppna **Table Editor → submissions** i Supabase. Varje förslag har redan
geokodats (lat/lon fylldes i när det skickades). För att publicera ett
förslag: ändra `status` från `pending` till `approved`. Då dyker det upp på
kartan för alla. Sätt `rejected` för att avvisa.

**Felrapporter** hamnar i **Table Editor → reports** (status `open`). Där ser
du vilken plats (`station_name`), vad som är fel (`reason`) och ev. kommentar.
Åtgärda platsen (t.ex. i kommunregistret eller genom att avpublicera ett
community-förslag) och sätt `status` till `resolved`.

> Tips: du kan få mejl vid nya förslag via Supabase **Database Webhooks**
> eller genom att titta i Table Editor då och då.
