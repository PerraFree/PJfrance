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
-- Granskning 12 okt 2026: mappen i URL:en måste vara PLATSENS mapp (samma
-- tvätt av id som appen gör i src/lib/photos.ts). Annars kunde en enda
-- uppladdad bild kopplas till hundratals platser och ersätta deras foton.
drop policy if exists "anon kan lägga till foto" on photos;
create policy "anon kan lägga till foto" on photos
  for insert to anon with check (
    status = 'approved'
    and url ~ '^https://yssyebjkejqpoenbhlfq\.supabase\.co/storage/v1/object/public/place-photos/[A-Za-z0-9_-]+/[0-9]+\.jpg$'
    and url ~ ('^https://yssyebjkejqpoenbhlfq\.supabase\.co/storage/v1/object/public/place-photos/'
               || regexp_replace(station_id, '[^a-zA-Z0-9_-]', '_', 'g') || '/[0-9]+\.jpg$')
  );
-- Städa bort rader som redan hunnit in med främmande URL (idempotent – körs
-- varje gång schemat körs, så en sådan rad kan aldrig ligga kvar publicerad).
update photos set status = 'rejected'
  where status = 'approved'
    and url !~ '^https://yssyebjkejqpoenbhlfq\.supabase\.co/storage/v1/object/public/place-photos/[A-Za-z0-9_-]+/[0-9]+\.jpg$';
drop policy if exists "anon läser foton" on photos;
create policy "anon läser foton" on photos
  for select to anon using (status = 'approved');

-- Lagringsyta för uppladdade foton (publikt läsbar, max 1 MB, bara bilder).
-- Appen skalar ner till 1280 px JPEG (normalt 150–500 kB) före uppladdning;
-- 1 MB håller nere hur mycket lagring en angripare kan fylla (förut 3 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
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

-- Säkerhetsgranskning 12 okt 2026: spamskyddets funktioner ligger i schemat
-- `private`, som PostgREST INTE exponerar. Tidigare låg rate_limit() i public
-- med execute för anon – vem som helst kunde anropa /rest/v1/rpc/rate_limit
-- med egna bucket-namn och tak, fylla dygnstaket (alla inskick stoppade) eller
-- fylla databasen med rader. Nu: inga parametrar från anon, tak hårdkodade i
-- triggrarna, och triggrarna körs som ägaren (security definer).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Hemligt salt för IP-hashen (slumpas en gång i databasen, kan inte läsas av
-- anon). Tidigare stod saltet i det publika repot, så hashen gick att räkna
-- baklänges för alla IPv4-adresser.
create table if not exists private.app_secrets (name text primary key, value text not null);
alter table private.app_secrets enable row level security;
revoke all on private.app_secrets from public, anon, authenticated;
insert into private.app_secrets (name, value)
  values ('ip_salt', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (name) do nothing;

-- Gamla public-versioner bort (de var anropbara via API:t).
drop policy if exists "anon kan ladda upp foton" on storage.objects;
drop function if exists public.rate_limit(text, int, int, int) cascade;
drop function if exists public.client_ip_hash() cascade;

drop function if exists private.client_ip_hash();
create or replace function private.client_ip_hash(p_wide boolean default false) returns text
language plpgsql stable security definer set search_path = private, public as $$
declare
  h json;
  ip text;
  v inet;
  salt text;
begin
  begin
    h := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if h is null then return null; end if;
  -- Bara cf-connecting-ip (sätts av Cloudflare framför Supabase och går inte
  -- att förfalska). x-forwarded-for:s första värde väljer klienten själv –
  -- som reserv gav det en ny nyckel per inskick. Saknas cf-headern delar
  -- alla sådana anrop EN nyckel (granskning 12 okt 2026).
  ip := lower(trim(coalesce(h->>'cf-connecting-ip', '')));
  if ip = '' then return 'okänd-ip'; end if;
  begin
    v := ip::inet;
  exception when others then
    return 'ogiltig-ip';
  end;
  -- IPv4 inbäddad i IPv6 (::ffff:1.2.3.4) = samma avsändare som 1.2.3.4.
  if family(v) = 6 and v << '::ffff:0:0/96'::inet then
    v := split_part(host(v), ':', 4)::inet;
  end if;
  -- IPv6: räkna per /64 (en vanlig abonnent har en hel /64 och kan annars
  -- byta adress obegränsat). Via inet så att förkortningen :: byggs ut rätt –
  -- strängdelning vid ':' gav en ny nyckel per adress (granskning 12 okt 2026).
  if family(v) = 6 then
    ip := network(set_masklen(v, case when p_wide then 48 else 64 end))::text;
  elsif p_wide then
    ip := network(set_masklen(v, 24))::text;
  else
    ip := host(v);
  end if;
  -- p_wide: grannadresser (IPv6 /48, IPv4 /24) räknas ihop med ett högre tak –
  -- en /48 rymmer 65 536 /64-nät, så per-/64-taket ensamt gick att kringgå.
  select value into salt from private.app_secrets where name = 'ip_salt';
  return md5(coalesce(salt, '') || ip);
end $$;

create or replace function private.rate_limit(p_bucket text, p_per_ip_hour int, p_global_hour int, p_global_day int)
returns boolean
language plpgsql security definer set search_path = private, public as $$
declare
  k text;
  kw text;
  n int;
begin
  delete from public.rate_limits where bucket in (p_bucket, p_bucket || ':nät', p_bucket || ':plats')
    and created_at < now() - interval '1 day';
  select count(*) into n from public.rate_limits where bucket = p_bucket;
  if n >= p_global_day then
    raise exception 'Tjänsten tar emot ovanligt många inskick just nu – försök igen i morgon.';
  end if;
  select count(*) into n from public.rate_limits where bucket = p_bucket and created_at > now() - interval '1 hour';
  if n >= p_global_hour then
    raise exception 'Tjänsten tar emot ovanligt många inskick just nu – försök igen om en timme.';
  end if;
  k := private.client_ip_hash();
  kw := private.client_ip_hash(true);
  if k is not null then
    select count(*) into n from public.rate_limits
      where bucket = p_bucket and key = k and created_at > now() - interval '1 hour';
    if n >= p_per_ip_hour then
      raise exception 'Du har skickat in många gånger på kort tid – vänta en stund och försök igen.';
    end if;
  end if;
  if kw is not null and kw not in ('okänd-ip', 'ogiltig-ip') then
    select count(*) into n from public.rate_limits
      where bucket = p_bucket || ':nät' and key = kw and created_at > now() - interval '1 hour';
    if n >= p_per_ip_hour * 4 then
      raise exception 'Du har skickat in många gånger på kort tid – vänta en stund och försök igen.';
    end if;
    insert into public.rate_limits (key, bucket) values (kw, p_bucket || ':nät');
  end if;
  insert into public.rate_limits (key, bucket) values (coalesce(k, 'okänd'), p_bucket);
  return true;
end $$;
revoke all on function private.rate_limit(text, int, int, int) from public, anon, authenticated;
revoke all on function private.client_ip_hash(boolean) from public, anon, authenticated;

-- Är anroparen anon? I en security definer-funktion är current_user ägaren,
-- så rollen läses ur PostgREST:s JWT-claims (och SET ROLE som reserv).
create or replace function private.is_anon() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role',
                  nullif(current_setting('role', true), 'none'), '') = 'anon'
$$;
revoke all on function private.is_anon() from public, anon, authenticated;

create or replace function private.once_per_station(p_bucket text, p_station text) returns void
language plpgsql security definer set search_path = private, public as $$
declare
  k text;
  kp text;
begin
  k := private.client_ip_hash();
  if k is null or k in ('okänd-ip', 'ogiltig-ip') then return; end if;
  kp := md5(k || '|' || coalesce(p_station, ''));
  -- Högst 3 per IP-adress, plats och dygn: flera personer på samma camping-
  -- wifi eller mobiloperatörs-IP ska kunna bekräfta/betygsätta samma plats.
  if (select count(*) from public.rate_limits where bucket = p_bucket || ':plats' and key = kp
             and created_at > now() - interval '1 day') >= 3 then
    if p_bucket = 'verifications' then
      raise exception 'Du har redan bekräftat den här platsen i dag – tack!';
    end if;
    raise exception 'Du har redan betygsatt den här platsen i dag.';
  end if;
  insert into public.rate_limits (key, bucket) values (kp, p_bucket || ':plats');
end $$;
revoke all on function private.once_per_station(text, text) from public, anon, authenticated;

-- Gemensam trigger: spamskydd + databasen sätter själv tid och id för anon
-- (fynd 12 okt: anon kunde skicka created_at 2099 och ligga överst för alltid).
create or replace function private.guard_insert() returns trigger
language plpgsql security definer set search_path = private, public as $$
begin
  if private.is_anon() then
    perform private.rate_limit(
      tg_argv[0], tg_argv[1]::int, tg_argv[2]::int, tg_argv[3]::int);
    -- Betyg och bekräftelser: högst EN per avsändare och plats och dygn
    -- (granskning 12 okt 2026: annars kunde en grå plats visa "Bekräftad av
    -- 20 användare" från en och samma person).
    if tg_nargs > 4 and tg_argv[4] = 'per_plats' then
      perform private.once_per_station(tg_argv[0], new.station_id);
    end if;
    new.created_at := now();
    new.id := gen_random_uuid();
  end if;
  return new;
end $$;
revoke all on function private.guard_insert() from public, anon, authenticated;

drop function if exists public.rate_limit_submissions() cascade;
drop function if exists public.rate_limit_reports() cascade;
drop function if exists public.rate_limit_reviews() cascade;
drop function if exists public.rate_limit_verifications() cascade;
drop function if exists public.rate_limit_photos() cascade;
drop trigger if exists rate_limit on submissions;
create trigger rate_limit before insert on submissions for each row execute function private.guard_insert('submissions', '5', '60', '300');
drop trigger if exists rate_limit on reports;
create trigger rate_limit before insert on reports for each row execute function private.guard_insert('reports', '10', '100', '500');
drop trigger if exists rate_limit on reviews;
create trigger rate_limit before insert on reviews for each row execute function private.guard_insert('reviews', '10', '200', '1000', 'per_plats');
drop trigger if exists rate_limit on verifications;
create trigger rate_limit before insert on verifications for each row execute function private.guard_insert('verifications', '20', '300', '1500', 'per_plats');
drop trigger if exists rate_limit on photos;
create trigger rate_limit before insert on photos for each row execute function private.guard_insert('photos', '10', '60', '300');

-- Uppladdning till bucketen: parameterlös wrapper i private (inte nåbar via
-- API:t). Storage-API:t skickar ingen IP-header, så här gäller de gemensamma
-- taken – nu i en egen bucket med högre tak än foto-raderna, så att en
-- angripare inte kan stänga av fotoraderna genom att fylla uppladdningstaket.
create or replace function private.rate_limit_storage() returns boolean
language plpgsql security definer set search_path = private, public as $$
begin
  return private.rate_limit('storage', 20, 120, 600);
end $$;
revoke all on function private.rate_limit_storage() from public;
grant execute on function private.rate_limit_storage() to anon;
create policy "anon kan ladda upp foton" on storage.objects
  for insert to anon
  with check (bucket_id = 'place-photos' and private.rate_limit_storage());

-- Platsförslag måste vara rimliga (granskning 12 okt 2026: NaN/Infinity-
-- koordinater, tomt namn, tom eller 2D-tjänstelista gick igenom och hamnade
-- i Pers ärenden). Koordinater får saknas (geokodning kan misslyckas) men
-- annars ligga i Sverige med marginal.
alter table submissions drop constraint if exists submissions_sane;
alter table submissions add constraint submissions_sane check (
  btrim(name) <> '' and btrim(address) <> ''
  and array_ndims(services) = 1 and cardinality(services) > 0
  and (lat is null or lat between 54 and 70.5)
  and (lon is null or lon between 9 and 25.5)
) not valid;

-- Platsförslagens tjänster får bara vara kända koder (annars "undefined" i appen).
alter table submissions drop constraint if exists submissions_services;
alter table submissions add constraint submissions_services check (
  services <@ array['gravatten','latrin','vatten','sopor','atervinning','stallplats','camping','gasol']::text[]
) not valid;

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

-- Sammanställningar per plats (granskning 12 okt 2026). Appen läste förut de
-- 5 000 senaste raderna, så spam kunde tränga undan alla riktiga bekräftelser
-- och betyg på några dagar. Vyerna räknar ALLA rader. Data är publik ändå.
create or replace view public.verification_summary as
  select station_id, count(*)::int as n, max(created_at) as latest
  from public.verifications group by station_id;
create or replace view public.review_summary as
  select station_id, sum(rating)::int as sum, count(*)::int as n
  from public.reviews where status = 'approved' group by station_id;
grant select on public.verification_summary, public.review_summary to anon, authenticated;
