-- Chez nous : schéma Supabase (à coller dans SQL Editor, puis « Run »)
-- 1) Remplace les deux adresses e-mail tout en bas par les vôtres.

create table if not exists public.members (
  email text primary key
);

create table if not exists public.docs (
  path text primary key,           -- ex. meals/2026-10-12 ou data/users/<uid>/income_2026-10
  col  text not null,              -- collection (tout avant le dernier « / »)
  id   text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists docs_col_idx on public.docs (col);
alter table public.docs replica identity full;   -- nécessaire pour le temps réel sur suppression

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs for each row execute function public.touch_updated_at();

create or replace function public.is_member() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

alter table public.members enable row level security;
alter table public.docs enable row level security;

drop policy if exists members_self on public.members;
create policy members_self on public.members for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Données partagées : tout membre lit/écrit. Données privées (data/users/<uid>/…) : uniquement leur propriétaire.
drop policy if exists docs_all on public.docs;
create policy docs_all on public.docs for all to authenticated
  using      (public.is_member() and (path not like 'data/users/%' or path like 'data/users/' || auth.uid()::text || '/%'))
  with check (public.is_member() and (path not like 'data/users/%' or path like 'data/users/' || auth.uid()::text || '/%'));

-- Temps réel
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 2) Les deux membres du foyer (À MODIFIER)
insert into public.members (email) values
  ('maxym.nelaupe@gmail.com'),
  ('jflaurelut@gmail.com')
on conflict do nothing;

-- ===== Tickets de caisse (photos compressées, stockage privé) =====
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false) on conflict do nothing;
drop policy if exists receipts_all on storage.objects;
create policy receipts_all on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and public.is_member())
  with check (bucket_id = 'receipts' and public.is_member());

-- ===== Notifications push : abonnements par appareil =====
create table if not exists public.push_subs (
  endpoint text primary key,
  uid uuid not null default auth.uid(),
  sub jsonb not null,
  prefs jsonb not null default '{"meals":true,"charges":true,"chores":true,"week":true}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists push_own on public.push_subs;
create policy push_own on public.push_subs for all to authenticated
  using (public.is_member() and uid = auth.uid()) with check (public.is_member() and uid = auth.uid());
