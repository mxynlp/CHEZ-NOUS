-- Chez nous : stockage des photos et vidéos (à coller dans Supabase > SQL Editor > Run)
-- Crée un espace privé « media » (50 Mo max par fichier) réservé aux membres du foyer.
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do update set file_size_limit = 52428800, public = false;

drop policy if exists media_all on storage.objects;
create policy media_all on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.is_member())
  with check (bucket_id = 'media' and public.is_member());
