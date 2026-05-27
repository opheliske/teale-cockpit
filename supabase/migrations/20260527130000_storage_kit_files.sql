-- ─────────────────────────────────────────────────────────────────────────────
-- Storage — private bucket for kit assets (images / PDFs)
-- ─────────────────────────────────────────────────────────────────────────────
-- The CSM uploads kit visuals via the kits modal; clients download them via
-- short-lived signed URLs. Kits are the shared catalogue (read by every
-- authenticated user), so the read policy is wider than client-files.

insert into storage.buckets (id, name, public)
values ('kit-files', 'kit-files', false)
on conflict (id) do nothing;

-- CSM: full access to the bucket.
drop policy if exists "kit_files_csm_all" on storage.objects;
create policy "kit_files_csm_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'kit-files' and public.is_csm())
  with check (bucket_id = 'kit-files' and public.is_csm());

-- Any authenticated user (CSM or client) can READ — kits are catalogue assets
-- surfaced on both sides of the app.
drop policy if exists "kit_files_authenticated_read" on storage.objects;
create policy "kit_files_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'kit-files');
