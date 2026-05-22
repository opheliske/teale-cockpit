-- ─────────────────────────────────────────────────────────────────────────────
-- Storage — private bucket for client documents & plan attachments
-- ─────────────────────────────────────────────────────────────────────────────
-- Files are uploaded by the CSM and stored under "<client_id>/..." so the
-- Storage RLS can scope them per company. Replaces the previous (broken)
-- blob-URL storage which did not survive a refresh.

insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

-- CSM: full access to the bucket.
drop policy if exists "client_files_csm_all" on storage.objects;
create policy "client_files_csm_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'client-files' and public.is_csm())
  with check (bucket_id = 'client-files' and public.is_csm());

-- Client: read files stored under their own company's folder (<client_id>/...).
drop policy if exists "client_files_client_read" on storage.objects;
create policy "client_files_client_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] = public.auth_client_id()
  );
