-- Tömningskartans databas. Körs automatiskt av GitHub-workflown
-- "Installera databasen" (och av bevakningen). Helt idempotent: säker att
-- köra hur många gånger som helst – skapar bara det som saknas.

-- Platsförslag ("Lägg till en plats")
create table if not exists submissions (
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
alter table submissions enable row level security;
drop policy if exists "anon can insert pending" on submissions;
create policy "anon can insert pending"
  on submissions for insert to anon
  with check (status = 'pending');
drop policy if exists "anon can read approved" on submissions;
create policy "anon can read approved"
  on submissions for select to anon
  using (status = 'approved');

-- Felrapporter ("Rapportera fel")
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  station_id text not null,
  station_name text not null,
  reason text not null,
  note text,
  status text not null default 'open'
);
alter table reports enable row level security;
drop policy if exists "anon can insert reports" on reports;
create policy "anon can insert reports"
  on reports for insert to anon
  with check (status = 'open');

-- Bekräftelser ("✓ Stämmer fortfarande")
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  created_at timestamptz not null default now()
);
alter table verifications enable row level security;
drop policy if exists "anon kan verifiera" on verifications;
create policy "anon kan verifiera" on verifications
  for insert to anon with check (true);
drop policy if exists "anon kan läsa verifieringar" on verifications;
create policy "anon kan läsa verifieringar" on verifications
  for select to anon using (true);

-- Betyg & kommentarer ("★ Betygsätt")
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  station_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'approved',
  created_at timestamptz not null default now()
);
alter table reviews enable row level security;
drop policy if exists "anon kan lämna omdöme" on reviews;
create policy "anon kan lämna omdöme" on reviews
  for insert to anon with check (
    rating between 1 and 5 and (
      status = 'pending'
      or (status = 'approved' and coalesce(comment, '') = '')
    )
  );
drop policy if exists "anon läser godkända omdömen" on reviews;
create policy "anon läser godkända omdömen" on reviews
  for select to anon using (status = 'approved');

-- Foton ("📷 Lägg till foto") – publiceras direkt, ingen granskningskö
-- (beslut aug 2026: Per hinner inte bevaka ännu en kö). Olämpliga foton
-- flaggas i stället via befintliga "Rapportera fel".
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  station_id text not null,
  station_name text,
  url text not null,
  status text not null default 'approved'
);
alter table photos enable row level security;
drop policy if exists "anon kan lägga till foto" on photos;
create policy "anon kan lägga till foto" on photos
  for insert to anon with check (status = 'approved');
drop policy if exists "anon läser foton" on photos;
create policy "anon läser foton" on photos
  for select to anon using (status = 'approved');

-- Lagringsyta för uppladdade foton (publikt läsbar, max 3 MB, bara bilder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "anon kan ladda upp foton" on storage.objects;
create policy "anon kan ladda upp foton" on storage.objects
  for insert to anon
  with check (bucket_id = 'place-photos');
