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
-- Säkerhetsfynd 1 (Johans granskning, GHSA-72p3-7774-p8h3, okt 2026): `url`
-- får BARA peka på projektets egen bucket. Utan regeln kunde vem som helst
-- med den publika anon-nyckeln spara en länk till valfri server, och bilden
-- (eller en spårningspixel som loggar besökarnas IP) visades direkt för alla.
-- Projekt-referensen är medvetet hårdkodad: ett mönster med `%` räcker inte
-- (`https://ond.se/x.supabase.co/…` skulle matcha). Byter projektet ref:
-- uppdatera BÅDE denna regex och `isOwnPhotoUrl()` i src/lib/photos.ts.
drop policy if exists "anon kan lägga till foto" on photos;
create policy "anon kan lägga till foto" on photos
  for insert to anon with check (
    status = 'approved'
    and url ~ '^https://yssyebjkejqpoenbhlfq\.supabase\.co/storage/v1/object/public/place-photos/[A-Za-z0-9_-]+/[0-9]+\.jpg$'
  );
-- Städa bort rader som redan hunnit in med främmande URL (idempotent – körs
-- varje gång schemat körs, så en sådan rad kan aldrig ligga kvar publicerad).
update photos set status = 'rejected'
  where status = 'approved'
    and url !~ '^https://yssyebjkejqpoenbhlfq\.supabase\.co/storage/v1/object/public/place-photos/[A-Za-z0-9_-]+/[0-9]+\.jpg$';
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
-- ---------------------------------------------------------------------------
-- Spamskydd (säkerhetsfynd 4, GHSA-72p3-7774-p8h3, okt 2026).
-- Anon får bara ett begränsat antal inskick per IP-adress och timme, plus ett
-- tak för alla tillsammans per timme och dygn. Supabases API-gateway skickar
-- med besökarens IP till Postgres (request.headers → cf-connecting-ip /
-- x-forwarded-for, verifierat 11 okt 2026). IP:n lagras bara som saltad hash
-- (pseudonymiserad) och raderas efter ett dygn. Saknas header (t.ex. anrop
-- via Storage-API:t) gäller bara de gemensamma taken.
-- Felmeddelandet (raise exception) visas för användaren i appen.
-- ---------------------------------------------------------------------------
create table if not exists rate_limits (
  key text not null,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_bucket_key_idx on rate_limits (bucket, key, created_at);
alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;

create or replace function public.client_ip_hash() returns text
language plpgsql stable as $$
declare
  h json;
  ip text;
begin
  begin
    h := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if h is null then return null; end if;
  ip := coalesce(nullif(h->>'cf-connecting-ip', ''), split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1));
  ip := trim(ip);
  if ip is null or ip = '' then return null; end if;
  return md5('tomningskartan-ip-' || ip);
end $$;

create or replace function public.rate_limit(p_bucket text, p_per_ip_hour int, p_global_hour int, p_global_day int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  k text;
  n int;
begin
  delete from rate_limits where bucket = p_bucket and created_at < now() - interval '1 day';
  select count(*) into n from rate_limits where bucket = p_bucket;
  if n >= p_global_day then
    raise exception 'Tjänsten tar emot ovanligt många inskick just nu – försök igen i morgon.';
  end if;
  select count(*) into n from rate_limits where bucket = p_bucket and created_at > now() - interval '1 hour';
  if n >= p_global_hour then
    raise exception 'Tjänsten tar emot ovanligt många inskick just nu – försök igen om en timme.';
  end if;
  k := client_ip_hash();
  if k is not null then
    select count(*) into n from rate_limits
      where bucket = p_bucket and key = k and created_at > now() - interval '1 hour';
    if n >= p_per_ip_hour then
      raise exception 'Du har skickat in många gånger på kort tid – vänta en stund och försök igen.';
    end if;
  end if;
  insert into rate_limits (key, bucket) values (coalesce(k, 'okänd'), p_bucket);
  return true;
end $$;
revoke all on function public.rate_limit(text, int, int, int) from public;
grant execute on function public.rate_limit(text, int, int, int) to anon, authenticated;

-- Triggers: bara anon begränsas (service-nyckeln/Per i Table Editor inte).
create or replace function public.rate_limit_submissions() returns trigger language plpgsql as $$
begin if current_user = 'anon' then perform rate_limit('submissions', 5, 60, 300); end if; return new; end $$;
create or replace function public.rate_limit_reports() returns trigger language plpgsql as $$
begin if current_user = 'anon' then perform rate_limit('reports', 10, 100, 500); end if; return new; end $$;
create or replace function public.rate_limit_reviews() returns trigger language plpgsql as $$
begin if current_user = 'anon' then perform rate_limit('reviews', 10, 200, 1000); end if; return new; end $$;
create or replace function public.rate_limit_verifications() returns trigger language plpgsql as $$
begin if current_user = 'anon' then perform rate_limit('verifications', 20, 300, 1500); end if; return new; end $$;
create or replace function public.rate_limit_photos() returns trigger language plpgsql as $$
begin if current_user = 'anon' then perform rate_limit('photos', 10, 60, 300); end if; return new; end $$;
grant execute on function public.rate_limit_submissions(), public.rate_limit_reports(), public.rate_limit_reviews(),
  public.rate_limit_verifications(), public.rate_limit_photos(), public.client_ip_hash() to anon, authenticated;
drop trigger if exists rate_limit on submissions;
create trigger rate_limit before insert on submissions for each row execute function rate_limit_submissions();
drop trigger if exists rate_limit on reports;
create trigger rate_limit before insert on reports for each row execute function rate_limit_reports();
drop trigger if exists rate_limit on reviews;
create trigger rate_limit before insert on reviews for each row execute function rate_limit_reviews();
drop trigger if exists rate_limit on verifications;
create trigger rate_limit before insert on verifications for each row execute function rate_limit_verifications();
drop trigger if exists rate_limit on photos;
create trigger rate_limit before insert on photos for each row execute function rate_limit_photos();

-- Uppladdning till bucketen: samma tak (Storage-API:t skickar ingen IP-header
-- till Postgres, så här gäller i praktiken bara de gemensamma taken – det
-- räcker för att fylla lagringen inte ska gå: max 60 filer/timme, 300/dygn).
drop policy if exists "anon kan ladda upp foton" on storage.objects;
create policy "anon kan ladda upp foton" on storage.objects
  for insert to anon
  with check (bucket_id = 'place-photos' and public.rate_limit('storage', 10, 60, 300));

-- Säkerhetsfynd 3 (GHSA-72p3-7774-p8h3): längdgränser på all användartext.
-- Utan dem kunde ett enda förslag med t.ex. 300 tecken långt namn få
-- bevakningen att fallera på samma rad varje gång (GitHub vägrar skapa ett
-- ärende med >256 tecken i titeln) så att inga senare förslag nådde Per.
-- `not valid` = befintliga rader kontrolleras inte, bara nya/ändrade.
-- Gränserna speglas av `maxLength` i formulären (src/components/*Form.tsx).
alter table submissions drop constraint if exists submissions_len;
alter table submissions add constraint submissions_len check (
  char_length(name) <= 120 and char_length(address) <= 200
  and char_length(coalesce(fee, '')) <= 200 and char_length(coalesce(description, '')) <= 2000
  and cardinality(services) <= 12
) not valid;
alter table reports drop constraint if exists reports_len;
alter table reports add constraint reports_len check (
  char_length(station_id) <= 200 and char_length(station_name) <= 200
  and char_length(reason) <= 100 and char_length(coalesce(note, '')) <= 2000
) not valid;
alter table reviews drop constraint if exists reviews_len;
alter table reviews add constraint reviews_len check (
  char_length(station_id) <= 200 and char_length(coalesce(station_name, '')) <= 200
  and char_length(coalesce(comment, '')) <= 500
) not valid;
alter table verifications drop constraint if exists verifications_len;
alter table verifications add constraint verifications_len check (
  char_length(station_id) <= 200
) not valid;
alter table photos drop constraint if exists photos_len;
alter table photos add constraint photos_len check (
  char_length(station_id) <= 200 and char_length(coalesce(station_name, '')) <= 200
  and char_length(url) <= 400
) not valid;
